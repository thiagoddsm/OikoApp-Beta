'use client';

import React, { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  Loader2, ArrowLeft, Edit, Users, ShieldCheck, Network, Map, 
  Footprints, User as UserIcon, Heart, HandHelping, Bot, GraduationCap, CheckCircle2, Camera, RefreshCw, History,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { VolunteeringProvider, useVolunteering } from '@/contexts/volunteering-context';
import { journeyColumns } from '@/components/users/journey-status-config';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Sub-componentes do Perfil
import { MemberDetails } from '@/components/users/member-details';
import { DiscipleshipNotes } from '@/components/users/discipleship-notes';
import { DiscipleshipTrail } from '@/components/users/discipleship-trail';
import { MemberCourseProgress } from '@/components/users/member-course-progress';
import { FamilyManagement } from '@/components/users/family-management';
import { VolunteerServiceForm } from '@/components/volunteering/volunteer-service-form';
import { AIProfileAnalysis } from '@/components/users/ai-profile-analysis';
import { EditUserDialog } from '@/components/users/edit-user-dialog';
import { InviteUserButton } from '@/components/users/invite-user-button';
import { PersonProcessesList } from '@/components/users/person-processes-list';
import { RelationshipTimeline } from '@/components/users/relationship-timeline';
import { useMembersData, useCoursesData, useGCData } from "@/hooks/useDomainData";

function PersonProfilePageContent() {
    const params = useParams();
    const router = useRouter();
    const userId = params.userId as string;
    const { toast } = useToast();
    const { users } = useMembersData();
    const { courses, classes, enrollmentRequests, pedagogicalLogs, theoflixCourses } = useCoursesData();
    const { cells, areas, redes } = useGCData();

    const { isLoading: isContextLoading } = useVolunteering();
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isSyncingPhoto, setIsSyncingPhoto] = useState(false);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [livePhotoUrl, setLivePhotoUrl] = useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const tabsNavRef = React.useRef<HTMLDivElement>(null);
    const { firestore, storage } = useFirebase();

    const compressImage = (file: File, maxWidth = 500, maxHeight = 500): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxWidth) {
                            height = Math.round((height * maxWidth) / width);
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width = Math.round((width * maxHeight) / height);
                            height = maxHeight;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error("Erro ao converter canvas em blob"));
                        }
                    }, 'image/jpeg', 0.85);
                };
                img.onerror = (err) => reject(err);
            };
            reader.onerror = (err) => reject(err);
        });
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !firestore || !storage) return;

        setIsUploadingPhoto(true);
        try {
            // Compress the image client-side to maximum 500x500px at 0.85 quality
            const compressedBlob = await compressImage(file, 500, 500);
            
            // Upload to a fixed path to overwrite the old picture and avoid storage bloat
            const filePath = `profile-pictures/${userId}.jpg`;
            const fileRef = ref(storage, filePath);
            
            await uploadBytes(fileRef, compressedBlob);
            const downloadUrl = await getDownloadURL(fileRef);
            
            const userDocRef = doc(firestore, 'users', userId);
            await updateDocumentNonBlocking(userDocRef, {
                photoURL: downloadUrl,
                profilePicture: downloadUrl
            });
            
            setLivePhotoUrl(downloadUrl);
            toast({
                title: "Sucesso!",
                description: "Foto de perfil atualizada com sucesso.",
            });
        } catch (error: any) {
            console.error("Erro ao fazer upload da foto:", error);
            toast({
                variant: "destructive",
                title: "Erro no upload",
                description: error.message || "Não foi possível carregar a imagem.",
            });
        } finally {
            setIsUploadingPhoto(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const triggerFileUpload = () => {
        fileInputRef.current?.click();
    };

    // Limpa a foto temporária ao trocar de usuário
    React.useEffect(() => {
        setLivePhotoUrl(null);
    }, [userId]);

    const normalizePhone = (p: string | number) => {
        let phone = String(p || '').replace(/\D/g, '');
        if (phone.length === 10 || phone.length === 11) return '55' + phone;
        return phone;
    };

    // Busca os dados da pessoa em tempo real
    const { data: person, isLoading: isPersonLoading } = useDoc<any>(userId ? `users/${userId}` : null);

    const isLoading = isPersonLoading || isContextLoading;

    // Cálculos de Progresso para a Jornada do Membro (Níveis 1 a 11)
    const journeyIndex = useMemo(() => {
        if (!person?.integrationStatus) return 0;
        const idx = journeyColumns.findIndex(col => col.id === person.integrationStatus);
        return idx === -1 ? 0 : idx;
    }, [person]);

    const progressValue = useMemo(() => {
        return ((journeyIndex + 1) / journeyColumns.length) * 100;
    }, [journeyIndex]);

    const statusLabel = useMemo(() => {
        return journeyColumns[journeyIndex]?.title || 'Não definido';
    }, [journeyIndex]);

    const handleSyncWhatsAppPhoto = async () => {
        if (!person?.phone || isSyncingPhoto) return;
        setIsSyncingPhoto(true);
        try {
            const phone = normalizePhone(person.phone);

            // Verificar se existe foto via endpoint JSON
            const res = await fetch(`/api/contacts/profile-picture?phone=${phone}&userId=${userId}&save=true`);
            const data = await res.json();
            
            if (data.imageUrl) {
                // Usar URL proxiada — pps.whatsapp.net bloqueia hotlink direto do browser
                setLivePhotoUrl(`/api/contacts/profile-picture?phone=${phone}&proxy=true`);
                toast({ title: "Foto Sincronizada", description: "A foto de perfil foi atualizada via WhatsApp." });
            } else {
                toast({ variant: "destructive", title: "Foto não encontrada", description: "Este contato não possui uma foto de perfil pública no WhatsApp." });
            }
        } catch (e) {
            console.error('Erro ao buscar foto do WhatsApp:', e);
            toast({ variant: "destructive", title: "Erro na Sincronização", description: "Não foi possível buscar a foto agora." });
        } finally {
            setIsSyncingPhoto(false);
        }
    };

    // Dados Relacionais para os Cards de KPI - Integração com GCs e Liderança
    const userCell = useMemo(() => {
        if (!cells || !person || !person.hierarchy || !person.hierarchy.celulaId) return null;
        return cells.find(c => c.id === person.hierarchy.celulaId);
    }, [cells, person]);

    const userSupervisor = useMemo(() => {
        if (!users || !person || !person.hierarchy || !person.hierarchy.supervisorId) return null;
        return users.find(u => u.id === person.hierarchy.supervisorId);
    }, [users, person]);

    const userArea = useMemo(() => {
        if (!areas || !userCell || !userCell.areaId) return null;
        return areas.find(a => a.id === userCell.areaId);
    }, [areas, userCell]);

    const userRede = useMemo(() => {
        if (!redes || !userArea || !userArea.redeId) return null;
        return redes.find(r => r.id === userArea.redeId);
    }, [redes, userArea]);

    if (isLoading) {
        return <div className="flex justify-center p-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
    }

    if (!person) {
        return (
            <Card>
                <CardHeader><CardTitle>Pessoa não encontrada</CardTitle></CardHeader>
                <CardContent>
                    <p>O perfil que você está procurando não existe ou foi removido.</p>
                    <Button onClick={() => router.back()} className="mt-4"><ArrowLeft className="mr-2"/>Voltar</Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header: Identidade e Progresso na Jornada */}
            <Card className="border-none shadow-sm overflow-hidden bg-white">
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-6">
                            <div className="relative group">
                                <Avatar className="h-24 w-24 ring-4 ring-primary/10">
                                    <AvatarImage src={
                                        livePhotoUrl || 
                                        (person.profilePicture?.includes('pps.whatsapp.net') && person.phone 
                                            ? `/api/contacts/profile-picture?phone=${normalizePhone(person.phone)}&proxy=true` 
                                            : person.profilePicture || person.photoURL)
                                    } />
                                    <AvatarFallback className="text-2xl font-bold">{person.name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="absolute -bottom-2 -right-2 size-8 bg-primary rounded-full border-4 border-white flex items-center justify-center text-white text-xs font-bold shadow-lg">
                                    {journeyIndex + 1}
                                </div>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept="image/*" 
                                    onChange={handlePhotoUpload}
                                />
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            disabled={isSyncingPhoto || isUploadingPhoto}
                                            title="Opções de foto de perfil"
                                            className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                                        >
                                            {isSyncingPhoto || isUploadingPhoto ? (
                                                <Loader2 className="size-6 text-white animate-spin" />
                                            ) : (
                                                <Camera className="size-6 text-white" />
                                            )}
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="center" className="w-56 rounded-xl border border-slate-100 shadow-xl bg-white p-1">
                                        <DropdownMenuItem
                                            onClick={triggerFileUpload}
                                            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer rounded-lg"
                                        >
                                            <Camera className="size-4 text-primary" />
                                            Upload Manual
                                        </DropdownMenuItem>
                                        {person?.phone && (
                                            <DropdownMenuItem
                                                onClick={handleSyncWhatsAppPhoto}
                                                disabled={isSyncingPhoto}
                                                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer rounded-lg"
                                            >
                                                <svg className="size-4 text-emerald-600" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M12.004 2C6.51 2 2.014 6.5 2 12c0 2.13.67 4.1 1.81 5.72l-1.19 4.35 4.45-1.16C8.61 21.65 10.28 22 12.004 22 17.5 22 22 17.5 22 12S17.5 2 12.004 2zM17.47 15.34c-.22-.11-1.3-.64-1.5-.72-.2-.07-.35-.11-.5.11-.15.22-.59.72-.73.88-.14.15-.27.18-.5.07-.88-.44-1.51-.76-2.07-1.72-.22-.38-.07-.6-.18-.71-.1-.1-.22-.26-.33-.39-.11-.13-.15-.22-.22-.37-.08-.15-.04-.28.02-.39.06-.11.5-.59.56-.71.07-.12.11-.2.17-.33.06-.13.03-.24-.01-.35-.04-.11-.5-1.2-.68-1.65-.18-.44-.36-.38-.5-.39-.13 0-.28-.01-.43-.01-.15 0-.39.06-.6.28-.21.22-.8.78-.8 1.9s.82 2.2 1.04 2.49c.22.29 1.62 2.48 3.93 3.48.55.24.98.38 1.31.49.55.17 1.05.15 1.45.09.44-.06 1.3-.53 1.48-1.04.18-.51.18-.95.13-1.04-.05-.09-.2-.14-.42-.25z" />
                                                </svg>
                                                Sincronizar WhatsApp
                                            </DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            <div className="space-y-1 text-center md:text-left">
                                <h1 className="text-2xl font-black text-slate-900 tracking-tight">{person.name}</h1>
                                <div className="flex items-center justify-center md:justify-start gap-2 text-muted-foreground text-sm font-medium">
                                    <Footprints size={14} className="text-primary" />
                                    {statusLabel}
                                </div>
                                <div className="pt-2 w-64 mx-auto md:mx-0">
                                    <div className="flex justify-between text-[10px] uppercase font-black text-muted-foreground mb-1">
                                        <span>Progresso na Trilha</span>
                                        <span>Nível {journeyIndex + 1} de {journeyColumns.length}</span>
                                    </div>
                                    <Progress value={progressValue} className="h-2" />
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <InviteUserButton user={person} />
                            <Button className="font-bold h-10 px-6 rounded-xl shadow-lg shadow-primary/20" onClick={() => setIsEditOpen(true)}>
                                <Edit className="size-4 mr-2" /> Editar Perfil
                            </Button>
                            <Button variant="outline" size="sm" className="h-10 px-6 rounded-xl border-slate-200" onClick={() => router.back()}>
                                <ArrowLeft className="size-4 mr-2" /> Voltar
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Cards de KPI: Contexto Ministerial */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Célula (GC)", value: userCell?.nome, desc: "Grupo Pequeno do membro.", icon: Users },
                    { label: "Discipulador", value: userSupervisor?.name, desc: "Líder que acompanha este membro.", icon: ShieldCheck },
                    { label: "Área", value: userArea?.nome, desc: "Área de supervisão do GC.", icon: Map },
                    { label: "Rede", value: userRede?.nome, desc: "Rede de supervisão da Área.", icon: Network },
                ].map((kpi, i) => (
                    <Card key={i} className="border-none shadow-sm bg-white">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] uppercase font-black text-muted-foreground flex items-center gap-2">
                                <kpi.icon size={12} className="text-primary" />
                                {kpi.label}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-lg font-black text-slate-900 truncate">{kpi.value || 'N/A'}</div>
                            <p className="text-[10px] text-muted-foreground mt-1">{kpi.desc}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Abas Principais: Gestão Integrada */}
            <Card className="border-none shadow-sm">
                <CardContent className="p-0">
                    <Tabs defaultValue="timeline" className="w-full">
                        <div className="px-4 py-2 border-b bg-muted/30 flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => {
                                  if (tabsNavRef.current) {
                                    tabsNavRef.current.scrollBy({ left: -250, behavior: 'smooth' });
                                  }
                                }}
                                className="size-8 rounded-full shrink-0 bg-white hover:bg-primary/10 hover:text-primary border-slate-200 shadow-sm"
                                title="Rolar para esquerda"
                            >
                                <ChevronLeft className="size-4" />
                            </Button>

                            <div ref={tabsNavRef} className="overflow-x-auto no-scrollbar scroll-smooth flex-1">
                                <TabsList className="h-12 bg-transparent gap-4 flex-nowrap w-max">
                                    <TabsTrigger value="timeline" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none font-bold text-xs uppercase whitespace-nowrap"><History size={14} className="mr-2" /> Timeline</TabsTrigger>
                                    <TabsTrigger value="processos" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none font-bold text-xs uppercase whitespace-nowrap"><RefreshCw size={14} className="mr-2" /> Processos Ativos</TabsTrigger>
                                    <TabsTrigger value="trilha" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none font-bold text-xs uppercase whitespace-nowrap"><Footprints size={14} className="mr-2" /> Trilha</TabsTrigger>
                                    <TabsTrigger value="discipulado" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none font-bold text-xs uppercase whitespace-nowrap"><ShieldCheck size={14} className="mr-2" /> Discipulado</TabsTrigger>
                                    <TabsTrigger value="detalhes" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none font-bold text-xs uppercase whitespace-nowrap"><UserIcon size={14} className="mr-2" /> Detalhes</TabsTrigger>
                                    <TabsTrigger value="familia" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none font-bold text-xs uppercase whitespace-nowrap"><Heart size={14} className="mr-2" /> Família</TabsTrigger>
                                    <TabsTrigger value="servico" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none font-bold text-xs uppercase whitespace-nowrap"><HandHelping size={14} className="mr-2" /> Serviço</TabsTrigger>
                                    <TabsTrigger value="ai" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none font-bold text-xs uppercase whitespace-nowrap"><Bot size={14} className="mr-2" /> Análise IA</TabsTrigger>
                                </TabsList>
                            </div>

                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => {
                                  if (tabsNavRef.current) {
                                    tabsNavRef.current.scrollBy({ left: 250, behavior: 'smooth' });
                                  }
                                }}
                                className="size-8 rounded-full shrink-0 bg-white hover:bg-primary/10 hover:text-primary border-slate-200 shadow-sm"
                                title="Rolar para direita"
                            >
                                <ChevronRight className="size-4" />
                            </Button>
                        </div>

                        <div className="p-6">
                            <TabsContent value="timeline" className="mt-0 animate-in fade-in-50">
                                <RelationshipTimeline userId={person.id} personName={person.name} />
                            </TabsContent>
                            <TabsContent value="processos" className="mt-0 animate-in fade-in-50">
                                <PersonProcessesList userId={person.id} />
                            </TabsContent>
                            <TabsContent value="trilha" className="mt-0 space-y-8 animate-in fade-in-50">
                                <MemberCourseProgress user={person} />
                                
                                <div className="pt-6 border-t">
                                    <h3 className="text-lg font-bold flex items-center gap-2 mb-6 text-slate-900">
                                        <CheckCircle2 className="text-emerald-600" />
                                        Cursos Concluídos (Certificados)
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {person.journey?.courseStatus && Object.entries(person.journey.courseStatus).some(([_, s]) => s === 'approved') ? (
                                            Object.entries(person.journey.courseStatus)
                                                .filter(([_, status]) => status === 'approved')
                                                .map(([courseId]) => {
                                                    const c = courses.find(course => course.id === courseId);
                                                    if (!c) return null;
                                                    return (
                                                        <div key={courseId} className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between group hover:shadow-md transition-all">
                                                            <div className="min-w-0">
                                                                <p className="font-black text-emerald-900 truncate uppercase text-sm tracking-tight">{c.name}</p>
                                                                <p className="text-[9px] uppercase font-black text-emerald-600 mt-1">{c.ministryName}</p>
                                                            </div>
                                                            <Badge className="bg-emerald-600 text-[10px] font-black uppercase">Concluído</Badge>
                                                        </div>
                                                    );
                                                })
                                        ) : (
                                            <div className="col-span-full py-8 text-center border-2 border-dashed rounded-xl bg-muted/20">
                                                <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Nenhuma certificação ativa no momento.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-6 border-t">
                                    <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
                                        <GraduationCap className="text-primary" />
                                        Trilha de Discipulado Visual
                                    </h3>
                                    <DiscipleshipTrail currentStatusId={person.integrationStatus} />
                                </div>
                            </TabsContent>

                            <TabsContent value="discipulado" className="mt-0 animate-in fade-in-50">
                                <DiscipleshipNotes memberId={person.id} memberName={person.name} currentStatusId={person.integrationStatus} />
                            </TabsContent>

                            <TabsContent value="detalhes" className="mt-0 animate-in fade-in-50">
                                <MemberDetails user={person} />
                            </TabsContent>

                            <TabsContent value="familia" className="mt-0 animate-in fade-in-50">
                                <FamilyManagement user={person} />
                            </TabsContent>

                            <TabsContent value="servico" className="mt-0 animate-in fade-in-50">
                                <VolunteerServiceForm user={person} />
                            </TabsContent>

                            <TabsContent value="ai" className="mt-0 animate-in fade-in-50">
                                <AIProfileAnalysis userProfile={person} />
                            </TabsContent>
                        </div>
                    </Tabs>
                </CardContent>
            </Card>

            <EditUserDialog 
                open={isEditOpen}
                onOpenChange={setIsEditOpen}
                user={person}
            />
        </div>
    );
}

export default function PersonProfilePage() {
    return (
        <VolunteeringProvider>
            <PersonProfilePageContent />
        </VolunteeringProvider>
    )
}