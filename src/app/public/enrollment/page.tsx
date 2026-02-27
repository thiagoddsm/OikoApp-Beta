
'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useVolunteering, VolunteeringProvider } from '@/contexts/volunteering-context';
import { useFirebase } from '@/firebase';
import { collection, query, where, getDocs, Timestamp, addDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
    Loader2, CheckCircle2, Search, ArrowRight, UserPlus, Mail, 
    Smartphone, IdCard, GraduationCap, BookOpen, Waves, HandHelping, School
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons';
import { cn } from '@/lib/utils';

/**
 * Componente interno que consome SearchParams
 */
function EnrollmentForm() {
    const searchParams = useSearchParams();
    const { courses, classes, isLoading: isLoadingContext } = useVolunteering();
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [existingUser, setExistingUser] = useState<any>(null);
    
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        cpf: '',
        sexo: '',
        dataNascimento: '',
    });

    const [selectedCourseId, setSelectedCourseId] = useState(searchParams.get('courseId') || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleCheckEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !firestore) return;

        setIsSearching(true);
        try {
            const q = query(collection(firestore, 'users'), where('email', '==', email.trim().toLowerCase()));
            const snap = await getDocs(q);
            
            if (!snap.empty) {
                const u = snap.docs[0].data();
                setExistingUser({ id: snap.docs[0].id, ...u });
                toast({ title: `Bem-vindo de volta, ${u.name.split(' ')[0]}!` });
                setStep(3); // Pula para curso
            } else {
                setExistingUser(null);
                setStep(2); // Vai para cadastro
            }
        } catch (e) {
            toast({ variant: 'destructive', title: "Erro na busca" });
        } finally {
            setIsSearching(false);
        }
    };

    const handleCreateProfile = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.phone) return;
        setStep(3);
    };

    const handleEnroll = async (courseId: string) => {
        setIsSubmitting(true);
        try {
            let userId = existingUser?.id;

            if (!userId && firestore) {
                const newDoc = await addDoc(collection(firestore, 'users'), {
                    ...formData,
                    email: email.toLowerCase(),
                    createdAt: Timestamp.now(),
                    integrationStatus: 'nao_alcancado'
                });
                userId = newDoc.id;
            }

            await addDoc(collection(firestore, 'enrollment_requests'), {
                userId,
                name: existingUser?.name || formData.name,
                phone: existingUser?.phone || formData.phone,
                courseId,
                status: 'pending',
                createdAt: Timestamp.now()
            });

            setSuccess(true);
            toast({ title: "Solicitação Enviada!", description: "Aguarde o contato da coordenação." });
        } catch (e) {
            toast({ variant: 'destructive', title: "Erro ao processar matrícula" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const groupedCourses = useMemo(() => {
        const groups: Record<string, any[]> = { 
            discipulado: [], teologico: [], biblico: [], escolas: [], outros: [] 
        };
        courses.forEach(c => {
            const m = c.ministryName.toLowerCase();
            if (c.ebdTrack === 'discipulado' || c.name.toLowerCase().includes('pertencer')) groups.discipulado.push(c);
            else if (c.ebdTrack === 'teologico') groups.teologico.push(c);
            else if (c.ebdTrack === 'biblico') groups.biblico.push(c);
            else if (m.includes('wave') || m === 'dis') groups.escolas.push(c);
            else groups.outros.push(c);
        });
        return groups;
    }, [courses]);

    if (success) {
        return (
            <div className="text-center py-20 space-y-6 animate-in zoom-in-95">
                <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg">
                    <CheckCircle2 size={40} />
                </div>
                <h2 className="text-3xl font-black text-slate-900">Tudo pronto!</h2>
                <p className="text-slate-600 max-w-md mx-auto">Sua solicitação foi enviada. Em breve o coordenador do curso entrará em contato para confirmar sua vaga.</p>
                <Button onClick={() => window.location.reload()} variant="outline">Fazer outra inscrição</Button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Step 1: Identidade */}
            {step === 1 && (
                <Card className="shadow-2xl border-none overflow-hidden">
                    <CardHeader className="bg-primary text-white p-8 text-center">
                        <div className="size-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                            <Mail size={32} />
                        </div>
                        <CardTitle className="text-2xl font-black">Vamos começar?</CardTitle>
                        <CardDescription className="text-primary-foreground/80">Digite seu e-mail para identificarmos seu cadastro.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8">
                        <form onSubmit={handleCheckEmail} className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase font-black text-muted-foreground ml-1">E-mail Principal</Label>
                                <Input 
                                    type="email" 
                                    placeholder="seu@email.com" 
                                    className="h-14 text-lg" 
                                    value={email} 
                                    onChange={e => setEmail(e.target.value)} 
                                    required 
                                />
                            </div>
                            <Button type="submit" className="w-full h-14 text-lg font-black" disabled={isSearching}>
                                {isSearching ? <Loader2 className="animate-spin" /> : "Continuar"}
                                <ArrowRight className="ml-2 size-5" />
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Step 2: Cadastro (Se novo) */}
            {step === 2 && (
                <Card className="shadow-2xl border-none animate-in slide-in-from-right-4">
                    <CardHeader className="p-8 text-center border-b">
                        <div className="size-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <UserPlus size={32} />
                        </div>
                        <CardTitle className="text-2xl font-black">Novo por aqui?</CardTitle>
                        <CardDescription>Preencha seus dados básicos para criarmos seu perfil IBM.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Nome Completo</Label>
                                <Input value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} placeholder="Como quer ser chamado?" />
                            </div>
                            <div className="space-y-2">
                                <Label>WhatsApp</Label>
                                <Input value={formData.phone} onChange={e => setFormData(p => ({...p, phone: e.target.value}))} placeholder="(21) 9..." />
                            </div>
                        </div>
                        <Button onClick={() => setStep(3)} className="w-full h-14 font-black text-lg">Criar Perfil e Ver Cursos</Button>
                    </CardContent>
                </Card>
            )}

            {/* Step 3: Seleção de Cursos */}
            {step === 3 && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-black text-slate-900">Olá, {existingUser?.name || formData.name.split(' ')[0]}!</h2>
                            <p className="text-sm text-muted-foreground">Escolha o curso ou trilha que deseja iniciar.</p>
                        </div>
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">Identificado via {email}</Badge>
                    </div>

                    <Tabs defaultValue="discipulado" className="w-full">
                        <div className="overflow-x-auto no-scrollbar pb-2">
                            <TabsList className="bg-muted/50 p-1 h-auto min-w-max">
                                <TabsTrigger value="discipulado" className="data-[state=active]:bg-white h-10 px-6 font-bold"><HandHelping className="size-4 mr-2"/>Discipulado</TabsTrigger>
                                <TabsTrigger value="teologico" className="data-[state=active]:bg-white h-10 px-6 font-bold"><GraduationCap className="size-4 mr-2"/>Teológico</TabsTrigger>
                                <TabsTrigger value="biblico" className="data-[state=active]:bg-white h-10 px-6 font-bold"><BookOpen className="size-4 mr-2"/>Bíblico</TabsTrigger>
                                <TabsTrigger value="escolas" className="data-[state=active]:bg-white h-10 px-6 font-bold"><Waves className="size-4 mr-2"/>Escolas</TabsTrigger>
                                <TabsTrigger value="outros" className="data-[state=active]:bg-white h-10 px-6 font-bold">Outros</TabsTrigger>
                            </TabsList>
                        </div>

                        {Object.entries(groupedCourses).map(([key, list]) => (
                            <TabsContent key={key} value={key} className="mt-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {list.map(course => (
                                        <Card key={course.id} className="group hover:border-primary/50 transition-all cursor-pointer shadow-sm">
                                            <CardContent className="p-6">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="p-2 bg-primary/5 rounded-lg text-primary">
                                                        {key === 'escolas' ? <School size={20}/> : <BookOpen size={20}/>}
                                                    </div>
                                                    {course.ebdTrack === 'teologico' ? (
                                                        <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-[9px] uppercase font-black">Fase Buscar</Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="text-[9px] uppercase font-black">{course.ministryName}</Badge>
                                                    )}
                                                </div>
                                                <h3 className="font-black text-slate-900 uppercase tracking-tight">{course.name}</h3>
                                                
                                                <div className="mt-3 space-y-2">
                                                    {(course.ebdTrack === 'biblico' || course.ebdTrack === 'discipulado' || course.name.toLowerCase().includes('pertencer')) && (
                                                        <p className="text-[10px] font-bold text-emerald-600 flex items-center gap-1.5">
                                                            <CheckCircle2 size={12}/> Todo domingo às 09h00
                                                        </p>
                                                    )}
                                                    {course.ebdTrack === 'teologico' && (
                                                        <p className="text-[10px] font-bold text-purple-600 flex items-center gap-1.5">
                                                            <CheckCircle2 size={12}/> 12/03 a 16/04 às 09h00
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-muted-foreground line-clamp-2">{course.description || "Inicie sua jornada de aprendizado na IBM."}</p>
                                                </div>

                                                <Button 
                                                    className="w-full mt-6 h-11 font-bold group-hover:bg-primary"
                                                    onClick={() => handleEnroll(course.id)}
                                                    disabled={isSubmitting}
                                                >
                                                    {isSubmitting ? <Loader2 className="animate-spin" /> : "Quero me inscrever"}
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    ))}
                                    {list.length === 0 && (
                                        <div className="col-span-full py-12 text-center border-2 border-dashed rounded-xl opacity-50 italic text-sm">
                                            Nenhum curso disponível neste trilho no momento.
                                        </div>
                                    )}
                                </div>
                            </TabsContent>
                        ))}
                    </Tabs>
                </div>
            )}
        </div>
    );
}

/**
 * Página Principal com Suspense Boundary para Build estável
 */
export default function PublicEnrollmentPage() {
    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4">
            <div className="container mx-auto">
                <div className="flex flex-col items-center mb-12">
                    <Logo className="size-12 text-primary mb-4" />
                    <h1 className="text-4xl font-black text-slate-950 italic tracking-tighter uppercase">Portal de Inscrições</h1>
                    <p className="text-slate-500 font-medium">Igreja Batista da Manhã</p>
                </div>

                <VolunteeringProvider>
                    <Suspense fallback={
                        <div className="flex items-center justify-center h-64">
                            <Loader2 className="size-8 animate-spin text-primary" />
                        </div>
                    }>
                        <EnrollmentForm />
                    </Suspense>
                </VolunteeringProvider>
            </div>
        </div>
    );
}
