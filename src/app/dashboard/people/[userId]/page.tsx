'use client';

import React, { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc } from '@/firebase';
import { 
  Loader2, ArrowLeft, Edit, Users, ShieldCheck, Network, Map, 
  Footprints, User as UserIcon, Heart, HandHelping, Bot, GraduationCap, CheckCircle2, Camera
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

// Sub-componentes do Perfil
import { MemberDetails } from '@/components/users/member-details';
import { DiscipleshipNotes } from '@/components/users/discipleship-notes';
import { DiscipleshipTrail } from '@/components/users/discipleship-trail';
import { MemberCourseProgress } from '@/components/users/member-course-progress';
import { FamilyManagement } from '@/components/users/family-management';
import { VolunteerServiceForm } from '@/components/volunteering/volunteer-service-form';
import { AIProfileAnalysis } from '@/components/users/ai-profile-analysis';
import { EditUserDialog } from '@/components/users/edit-user-dialog';

function PersonProfilePageContent() {
    const params = useParams();
    const router = useRouter();
    const userId = params.userId as string;
    const { toast } = useToast();
    const { users, cells, areas, redes, courses, isLoading: isContextLoading } = useVolunteering();
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isSyncingPhoto, setIsSyncingPhoto] = useState(false);
    const [livePhotoUrl, setLivePhotoUrl] = useState<string | null>(null);

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
                                {person?.phone && (
                                    <button
                                        onClick={handleSyncWhatsAppPhoto}
                                        disabled={isSyncingPhoto}
                                        title="Sincronizar foto do WhatsApp"
                                        className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                    >
                                        {isSyncingPhoto
                                            ? <Loader2 className="size-6 text-white animate-spin" />
                                            : <Camera className="size-6 text-white" />
                                        }
                                    </button>
                                )}
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
                    <Tabs defaultValue="trilha" className="w-full">
                        <div className="px-6 pt-2 border-b bg-muted/30">
                            <TabsList className="h-12 bg-transparent gap-6 overflow-x-auto no-scrollbar flex-nowrap">
                                <TabsTrigger value="trilha" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none font-bold text-xs uppercase whitespace-nowrap"><Footprints size={14} className="mr-2" /> Trilha</TabsTrigger>
                                <TabsTrigger value="discipulado" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none font-bold text-xs uppercase whitespace-nowrap"><ShieldCheck size={14} className="mr-2" /> Discipulado</TabsTrigger>
                                <TabsTrigger value="detalhes" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none font-bold text-xs uppercase whitespace-nowrap"><UserIcon size={14} className="mr-2" /> Detalhes</TabsTrigger>
                                <TabsTrigger value="familia" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none font-bold text-xs uppercase whitespace-nowrap"><Heart size={14} className="mr-2" /> Família</TabsTrigger>
                                <TabsTrigger value="servico" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none font-bold text-xs uppercase whitespace-nowrap"><HandHelping size={14} className="mr-2" /> Serviço</TabsTrigger>
                                <TabsTrigger value="ai" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none font-bold text-xs uppercase whitespace-nowrap"><Bot size={14} className="mr-2" /> Análise IA</TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="p-6">
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