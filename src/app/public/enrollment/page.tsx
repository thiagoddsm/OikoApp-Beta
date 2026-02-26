
'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
    Loader2, 
    CheckCircle2, 
    ChevronRight, 
    Mail, 
    User, 
    Phone, 
    IdCard, 
    BookOpen, 
    Search,
    GraduationCap,
    School,
    Waves,
    HandHelping,
    Sparkles,
    ArrowLeft,
    Users
} from 'lucide-react';
import { useFirebase, addDocumentNonBlocking, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, Timestamp, limit } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons';
import { cn } from '@/lib/utils';

type Course = {
    id: string;
    name: string;
    ministryName: string;
    description?: string;
    ebdTrack?: 'teologico' | 'biblico' | 'discipulado';
};

function EnrollmentContent() {
    const searchParams = useSearchParams();
    const initialCourseId = searchParams.get('courseId');
    const { firestore } = useFirebase();
    const { toast } = useToast();

    // Data Fetching
    const coursesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'courses')) : null, [firestore]);
    const { data: allCourses, isLoading: isLoadingCourses } = useCollection<Course>(coursesQuery);

    // Flow State
    const [step, setStep] = useState(1); // 1: Email, 2: Personal Data, 3: Course Selection, 4: Success
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [existingMember, setExistingMember] = useState<any>(null);

    // Form Data
    const [formData, setFormData] = useState({
        email: '',
        name: '',
        phone: '',
        cpf: '',
        sexo: '',
        dataNascimento: '',
        selectedCourseId: initialCourseId || '',
    });

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.email.trim()) return;

        setIsCheckingEmail(true);
        try {
            const q = query(collection(firestore!, 'users'), where('email', '==', formData.email.trim().toLowerCase()), limit(1));
            const snap = await getDocs(q);
            
            if (!snap.empty) {
                const userData = snap.docs[0].data();
                setExistingMember({ id: snap.docs[0].id, ...userData });
                setFormData(p => ({ ...p, name: userData.name, phone: userData.phone || '' }));
                setStep(3); // Skip directly to course selection
                toast({ title: `Olá, ${userData.name.split(' ')[0]}!`, description: "Reconhecemos seu cadastro. Escolha seu próximo passo." });
            } else {
                setExistingMember(null);
                setStep(2); // Go to detailed registration
            }
        } catch (e) {
            toast({ variant: 'destructive', title: "Erro de conexão", description: "Tente novamente em instantes." });
        } finally {
            setIsCheckingEmail(false);
        }
    };

    const handleFinalSubmit = async () => {
        if (!formData.selectedCourseId) {
            toast({ variant: 'destructive', title: "Selecione um curso para continuar." });
            return;
        }

        setIsSubmitting(true);
        try {
            let userId = existingMember?.id;

            // 1. Create user if not exists
            if (!userId) {
                const userRef = await addDocumentNonBlocking(collection(firestore!, 'users'), {
                    name: formData.name,
                    email: formData.email.toLowerCase(),
                    phone: formData.phone,
                    cpf: formData.cpf,
                    sexo: formData.sexo,
                    dataNascimento: formData.dataNascimento,
                    integrationStatus: 'nao_alcancado',
                    createdAt: Timestamp.now()
                });
                userId = userRef.id;
            }

            // 2. Register Enrollment Request
            await addDocumentNonBlocking(collection(firestore!, 'enrollment_requests'), {
                userId,
                name: formData.name,
                email: formData.email.toLowerCase(),
                phone: formData.phone,
                courseId: formData.selectedCourseId,
                status: 'pending',
                createdAt: Timestamp.now()
            });

            setStep(4);
            toast({ title: "Inscrição Realizada!", description: "Sua solicitação foi enviada para a coordenação." });
        } catch (e) {
            toast({ variant: 'destructive', title: "Falha na inscrição", description: "Ocorreu um erro ao processar seus dados." });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Grouping logic for courses
    const groupedCourses = useMemo(() => {
        if (!allCourses) return { discipulado: [], teologico: [], biblico: [], escolas: [], outros: [] };
        
        const groups = {
            discipulado: [] as Course[],
            teologico: [] as Course[],
            biblico: [] as Course[],
            escolas: [] as Course[],
            outros: [] as Course[]
        };

        allCourses.forEach(c => {
            const m = c.ministryName?.toLowerCase() || '';
            if (c.ebdTrack === 'discipulado') groups.discipulado.push(c);
            else if (c.ebdTrack === 'teologico') groups.teologico.push(c);
            else if (c.ebdTrack === 'biblico') groups.biblico.push(c);
            else if (m.includes('wave') || m.includes('dis')) groups.escolas.push(c);
            else groups.outros.push(c);
        });

        return groups;
    }, [allCourses]);

    const getTrackBadge = (course: Course) => {
        if (course.ebdTrack === 'teologico') {
            return (
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[9px] font-black h-5 uppercase">
                    Fase Buscar | 12/03 a 16/04 às 09h00
                </Badge>
            );
        }
        const isStandardTrack = course.ebdTrack === 'biblico' || course.ebdTrack === 'discipulado' || course.name.toLowerCase().includes('crescer') || course.name.toLowerCase().includes('pertencer');
        if (isStandardTrack) {
            return (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[9px] font-black h-5 uppercase">
                    Todo domingo às 09h00
                </Badge>
            );
        }
        return null;
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center py-12 px-4">
            <div className="w-full max-w-2xl space-y-8">
                <div className="flex flex-col items-center text-center gap-4">
                    <div className="size-16 bg-white rounded-full flex items-center justify-center shadow-md border border-primary/10">
                        <Logo className="size-10 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900">OikoApp</h1>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Portal de Inscrições IBM</p>
                    </div>
                </div>

                {step === 1 && (
                    <Card className="shadow-2xl border-none rounded-[2rem] overflow-hidden">
                        <CardHeader className="bg-white border-b pb-8 pt-10 text-center">
                            <CardTitle className="text-xl">Identificação</CardTitle>
                            <CardDescription>Para começar, informe seu e-mail para localizarmos seu cadastro.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8">
                            <form onSubmit={handleEmailSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-xs font-black uppercase text-muted-foreground tracking-widest">E-mail de Cadastro *</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-primary/40" />
                                        <Input 
                                            id="email" 
                                            type="email" 
                                            required 
                                            placeholder="exemplo@gmail.com" 
                                            className="h-14 pl-12 rounded-2xl bg-muted/30 border-none focus-visible:ring-primary text-lg"
                                            value={formData.email}
                                            onChange={e => setFormData(p => ({...p, email: e.target.value}))}
                                        />
                                    </div>
                                </div>
                                <Button className="w-full h-14 rounded-2xl font-black text-base shadow-xl shadow-primary/20" disabled={isCheckingEmail}>
                                    {isCheckingEmail ? <Loader2 className="animate-spin mr-2" /> : <ChevronRight className="mr-2" />}
                                    Continuar para Inscrição
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {step === 2 && (
                    <Card className="shadow-2xl border-none rounded-[2rem]">
                        <CardHeader className="text-center pt-10">
                            <CardTitle>Quase lá!</CardTitle>
                            <CardDescription>Não encontramos seu cadastro. Preencha seus dados para criar seu perfil IBM.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Nome Completo</Label>
                                    <Input value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} placeholder="Seu nome" className="h-12 rounded-xl" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-[10px] font-black uppercase text-muted-foreground">Telefone/WhatsApp</Label>
                                        <Input value={formData.phone} onChange={e => setFormData(p => ({...p, phone: e.target.value}))} placeholder="(21) 99999-9999" className="h-12 rounded-xl" />
                                    </div>
                                    <div>
                                        <Label className="text-[10px] font-black uppercase text-muted-foreground">CPF</Label>
                                        <Input value={formData.cpf} onChange={e => setFormData(p => ({...p, cpf: e.target.value}))} placeholder="000.000.000-00" className="h-12 rounded-xl" />
                                    </div>
                                </div>
                            </div>
                            <Button className="w-full h-14 rounded-2xl font-black" onClick={() => setStep(3)}>
                                Próximo Passo: Escolher Curso
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {step === 3 && (
                    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                        {existingMember && (
                            <div className="bg-primary/5 border border-primary/10 p-6 rounded-[2rem] flex items-center justify-between shadow-inner">
                                <div className="flex items-center gap-4">
                                    <div className="size-12 rounded-full bg-primary text-white flex items-center justify-center font-black text-xl">
                                        {existingMember.name.charAt(0).toLowerCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-primary">Olá, {existingMember.name.toLowerCase()}!</p>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Cadastro Identificado</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="text-[10px] font-black uppercase h-8 px-3 rounded-full hover:bg-white">Não é você?</Button>
                            </div>
                        )}

                        <div className="text-left">
                            <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Selecione o curso desejado</h2>
                        </div>

                        <Tabs defaultValue="discipulado" className="w-full">
                            <div className="overflow-x-auto no-scrollbar pb-4">
                                <TabsList className="bg-slate-200/50 p-1 rounded-2xl h-auto flex flex-nowrap min-w-max">
                                    <TabsTrigger value="discipulado" className="rounded-xl px-6 py-2.5 font-bold data-[state=active]:shadow-lg">Discipulado</TabsTrigger>
                                    <TabsTrigger value="teologico" className="rounded-xl px-6 py-2.5 font-bold data-[state=active]:shadow-lg">Teológico</TabsTrigger>
                                    <TabsTrigger value="biblico" className="rounded-xl px-6 py-2.5 font-bold data-[state=active]:shadow-lg">Bíblico</TabsTrigger>
                                    <TabsTrigger value="escolas" className="rounded-xl px-6 py-2.5 font-bold data-[state=active]:shadow-lg">Escolas (Wave/DIS)</TabsTrigger>
                                    <TabsTrigger value="outros" className="rounded-xl px-6 py-2.5 font-bold data-[state=active]:shadow-lg">Outros</TabsTrigger>
                                </TabsList>
                            </div>

                            {Object.entries(groupedCourses).map(([key, courses]) => (
                                <TabsContent key={key} value={key} className="space-y-3 mt-2 outline-none">
                                    {courses.length === 0 ? (
                                        <div className="py-12 text-center text-muted-foreground italic border-2 border-dashed rounded-[2rem]">
                                            Nenhum curso disponível neste trilho no momento.
                                        </div>
                                    ) : (
                                        courses.map(course => (
                                            <label 
                                                key={course.id} 
                                                htmlFor={`c-${course.id}`}
                                                className={cn(
                                                    "flex items-center gap-4 p-5 bg-white rounded-3xl border-2 transition-all cursor-pointer group shadow-sm hover:shadow-md",
                                                    formData.selectedCourseId === course.id ? "border-primary ring-2 ring-primary/10" : "border-transparent hover:border-slate-200"
                                                )}
                                            >
                                                <div className={cn(
                                                    "size-12 rounded-2xl flex items-center justify-center transition-colors shrink-0",
                                                    formData.selectedCourseId === course.id ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-slate-50 text-slate-400 group-hover:bg-slate-100"
                                                )}>
                                                    <BookOpen className="size-6" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="font-black text-slate-900 uppercase text-sm tracking-tight">{course.name}</span>
                                                        {getTrackBadge(course)}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-0.5 font-medium">{course.ministryName}</p>
                                                </div>
                                                <RadioGroup value={formData.selectedCourseId} onValueChange={v => setFormData(p => ({...p, selectedCourseId: v}))}>
                                                    <RadioGroupItem value={course.id} id={`c-${course.id}`} className="size-6 border-slate-300" />
                                                </RadioGroup>
                                            </label>
                                        ))
                                    )}
                                </TabsContent>
                            ))}
                        </Tabs>

                        <div className="pt-6">
                            <Button 
                                className="w-full h-16 rounded-[2rem] font-black text-lg shadow-2xl shadow-primary/30" 
                                onClick={handleFinalSubmit}
                                disabled={isSubmitting || !formData.selectedCourseId}
                            >
                                {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2 fill-current" />}
                                Finalizar Minha Inscrição
                            </Button>
                            <p className="text-center text-[10px] text-slate-400 uppercase font-black tracking-widest mt-4">
                                Ambiente seguro • IBM Governança
                            </p>
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div className="text-center space-y-8 py-12 animate-in zoom-in-95 duration-500">
                        <div className="size-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xl">
                            <CheckCircle2 size={48} className="animate-in fade-in slide-in-from-bottom-2 duration-700" />
                        </div>
                        <div className="space-y-3">
                            <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic">Tudo certo!</h2>
                            <p className="text-slate-600 max-w-sm mx-auto leading-relaxed font-medium">
                                Recebemos sua solicitação de inscrição. Em breve nossa equipe entrará em contato via WhatsApp para confirmar sua turma.
                            </p>
                        </div>
                        <Button variant="outline" className="h-14 px-10 rounded-2xl font-black border-slate-300" onClick={() => window.location.reload()}>
                            Voltar ao Início
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function PublicEnrollmentPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>}>
            <EnrollmentContent />
        </Suspense>
    );
}
