
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useFirebase, useVolunteering, VolunteeringProvider } from '@/firebase';
import { collection, query, where, getDocs, limit, Timestamp, addDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { 
    Loader2, Send, CheckCircle, Mail, User, Phone, 
    ArrowLeft, Search, BookOpen, Music, HandHelping, 
    Lightbulb, ChevronRight, GraduationCap, Calendar, 
    Clock, MapPin, Layers, Info, Filter, Star
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons';
import { cn } from '@/lib/utils';

function EnrollmentPortal() {
    const { firestore } = useFirebase();
    const { courses, classes, addUser, enrollStudent, isLoading: isContextLoading } = useVolunteering();
    const { toast } = useToast();
    
    const [step, setStep] = useState<'email' | 'details'>('email');
    const [emailInput, setEmailInput] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    const [studentId, setStudentId] = useState('');
    const [mode, setMode] = useState<'existing' | 'new'>('new');
    const [newName, setNewName] = useState('');
    const [newPhone, setNewPhone] = useState('');
    
    const [mainTab, setMainTab] = useState('ensino');
    const [teachingSubTab, setTeachingSubTab] = useState('lumine');
    const [lumineTrackFilter, setLumineTrackFilter] = useState('all');
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
    const [selectedClassId, setSelectedClassId] = useState<string>('');

    // --- LOGICA DE IDENTIFICAÇÃO POR EMAIL ---
    const handleVerifyEmail = async () => {
        if (!emailInput.trim() || !firestore) return;
        
        setIsVerifying(true);
        try {
            const usersRef = collection(firestore, 'users');
            const q = query(usersRef, where('email', '==', emailInput.toLowerCase()), limit(1));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                const data = doc.data();
                setStudentId(doc.id);
                setMode('existing');
                setNewName(data.name || '');
                setNewPhone(data.phone || '');
                toast({ 
                    title: "Bem-vindo(a) de volta!", 
                    description: `Reconhecemos o cadastro de ${data.name}.` 
                });
            } else {
                setStudentId('');
                setMode('new');
                setNewName('');
                setNewPhone('');
                toast({ 
                    title: "Novo Cadastro", 
                    description: "E-mail não encontrado. Por favor, preencha seus dados para continuar." 
                });
            }
            setStep('details');
        } catch (error) {
            console.error("Erro ao verificar e-mail:", error);
            toast({ 
                variant: 'destructive', 
                title: "Erro na verificação", 
                description: "Não foi possível consultar seu e-mail agora. Verifique sua conexão." 
            });
        } finally {
            setIsVerifying(false);
        }
    };

    // --- FILTROS DE CONTEÚDO ---
    const filteredCourses = useMemo(() => {
        if (!courses) return [];
        let filtered = courses;

        if (mainTab === 'ensino') {
            if (teachingSubTab === 'lumine') {
                filtered = filtered.filter(c => c.ministryName?.toLowerCase().includes('lumine') || c.ministryName?.toLowerCase().includes('ebd'));
                if (lumineTrackFilter !== 'all') {
                    filtered = filtered.filter(c => c.ebdTrack === lumineTrackFilter);
                }
            } else if (teachingSubTab === 'escolas') {
                filtered = filtered.filter(c => c.ministryName?.toLowerCase().includes('wave') || c.ministryName?.toLowerCase().includes('dis'));
            } else if (teachingSubTab === 'ministerios') {
                filtered = filtered.filter(c => 
                    !c.ministryName?.toLowerCase().includes('lumine') && 
                    !c.ministryName?.toLowerCase().includes('ebd') &&
                    !c.ministryName?.toLowerCase().includes('wave') &&
                    !c.ministryName?.toLowerCase().includes('dis')
                );
            }
        } else {
            // Em breve: Eventos específicos
            return [];
        }

        return filtered;
    }, [courses, mainTab, teachingSubTab, lumineTrackFilter]);

    const selectedCourse = useMemo(() => courses.find(c => c.id === selectedCourseId), [courses, selectedCourseId]);
    
    const availableClasses = useMemo(() => {
        if (!selectedCourseId) return [];
        return classes.filter(cls => cls.courseId === selectedCourseId);
    }, [classes, selectedCourseId]);

    const isMemberCourse = useMemo(() => 
        selectedCourse?.name?.toLowerCase().includes('membro') || 
        selectedCourse?.name?.toLowerCase().includes('pertencer') ||
        selectedCourse?.name?.toLowerCase().includes('integração'),
    [selectedCourse]);

    const handleEnroll = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCourseId) return;
        if (!isMemberCourse && !selectedClassId) {
            toast({ variant: 'destructive', title: 'Selecione uma turma' });
            return;
        }

        setIsSaving(true);
        try {
            let finalStudentId = studentId;
            if (mode === 'new') {
                finalStudentId = await addUser({
                    name: newName,
                    email: emailInput,
                    phone: newPhone,
                    integrationStatus: isMemberCourse ? 'novo_convertido' : 'nao_alcancado',
                });
            }

            // Registrar solicitação de inscrição (Workflow administrativo)
            await addDoc(collection(firestore!, 'enrollment_requests'), {
                courseId: selectedCourseId,
                classId: selectedClassId || '',
                name: newName,
                email: emailInput,
                phone: newPhone,
                status: 'pending',
                createdAt: Timestamp.now()
            });

            setSuccess(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao processar', description: 'Tente novamente em instantes.' });
        } finally {
            setIsSaving(false);
        }
    };

    if (success) {
        return (
            <main className="min-h-screen bg-[#F8F9FA] py-12 md:py-20 px-4 flex items-center justify-center">
                <Card className="max-w-md w-full text-center p-8 animate-in zoom-in-95 duration-500 rounded-[2.5rem] shadow-2xl border-none">
                    <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner mb-6">
                        <CheckCircle size={40} />
                    </div>
                    <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 mb-4 leading-none">Protocolo Recebido!</h2>
                    <p className="text-muted-foreground mb-8 text-sm font-medium">
                        Sua solicitação para <strong>{selectedCourse?.name}</strong> foi enviada. Nossa equipe entrará em contato em breve para confirmar sua vaga.
                    </p>
                    <Button onClick={() => window.location.reload()} className="w-full h-12 font-black uppercase tracking-widest rounded-2xl">Voltar ao Início</Button>
                </Card>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#F8F9FA] py-12 md:py-20 px-4">
            <div className="max-w-6xl mx-auto space-y-12">
                <div className="text-center space-y-4">
                    <Logo className="size-12 text-primary mx-auto mb-4" />
                    <h1 className="text-5xl md:text-8xl font-black italic tracking-tighter uppercase text-slate-900 leading-[0.85]">Portal de <br/><span className="text-primary">Inscrições</span></h1>
                    <p className="text-muted-foreground text-sm md:text-lg max-w-2xl mx-auto font-medium">Capacitação, Comunhão e Propósito. Garanta sua vaga nos próximos trilhos e eventos estratégicos da IBM.</p>
                </div>

                <div className="max-w-2xl mx-auto">
                    <Card className="shadow-2xl border-none overflow-hidden rounded-[2.5rem] bg-white">
                        <CardHeader className="bg-primary/5 p-8 border-b">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-white rounded-2xl shadow-sm text-primary">
                                    {step === 'email' ? <Mail size={24} /> : <BookOpen size={24} />}
                                </div>
                                <div>
                                    <CardTitle className="text-xl font-black uppercase italic tracking-tighter">Inscrição Rápida</CardTitle>
                                    <CardDescription className="text-xs font-bold uppercase tracking-widest">
                                        {step === 'email' ? 'Identificação do Membro' : 'Detalhes do Protocolo'}
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        
                        <CardContent className="p-8">
                            {step === 'email' ? (
                                <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-500">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Seu melhor E-mail</Label>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <Mail className="absolute left-3 top-3.5 size-5 text-muted-foreground opacity-50" />
                                                <Input 
                                                    type="email" 
                                                    placeholder="exemplo@email.com" 
                                                    className="h-12 pl-10 bg-slate-50 border-none focus-visible:ring-primary/20 text-lg font-medium"
                                                    value={emailInput}
                                                    onChange={e => setEmailInput(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && handleVerifyEmail()}
                                                />
                                            </div>
                                            <Button 
                                                onClick={handleVerifyEmail} 
                                                className="h-12 px-8 font-black uppercase tracking-widest"
                                                disabled={!emailInput.trim() || isVerifying}
                                            >
                                                {isVerifying ? <Loader2 className="animate-spin size-5" /> : 'Verificar'}
                                            </Button>
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground text-center italic">Não se preocupe, seus dados estão seguros conosco.</p>
                                </div>
                            ) : (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="p-5 bg-primary/5 rounded-[1.5rem] border-2 border-dashed border-primary/20">
                                        {mode === 'existing' ? (
                                            <div className="flex items-center gap-4">
                                                <div className="size-12 bg-white rounded-full flex items-center justify-center text-primary shadow-sm">
                                                    <User size={24} />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Membro Identificado</p>
                                                    <p className="text-xl font-black text-slate-900 leading-tight">{newName}</p>
                                                    <p className="text-xs font-medium text-muted-foreground">{emailInput}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Badge className="bg-primary text-white font-black text-[10px] tracking-widest">NOVO CADASTRO</Badge>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[10px] uppercase font-black text-muted-foreground">Nome Completo</Label>
                                                        <Input value={newName} onChange={e => setNewName(e.target.value)} className="bg-white h-11" placeholder="Como deseja ser chamado" />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[10px] uppercase font-black text-muted-foreground">Telefone/WhatsApp</Label>
                                                        <Input value={newPhone} onChange={e => setNewPhone(e.target.value)} className="bg-white h-11" placeholder="(21) 9..." />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-6">
                                        <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
                                            <div className="flex justify-center mb-8">
                                                <TabsList className="bg-slate-100 p-1.5 h-auto rounded-full border-2">
                                                    <TabsTrigger value="ensino" className="rounded-full px-8 py-2.5 font-black uppercase text-xs data-[state=active]:bg-primary data-[state=active]:text-white shadow-xl">
                                                        Ensino & Trilhos
                                                    </TabsTrigger>
                                                    <TabsTrigger value="eventos" className="rounded-full px-8 py-2.5 font-black uppercase text-xs data-[state=active]:bg-primary data-[state=active]:text-white shadow-xl">
                                                        Eventos
                                                    </TabsTrigger>
                                                </TabsList>
                                            </div>

                                            <TabsContent value="ensino" className="space-y-8 mt-0">
                                                <div className="flex flex-col items-center gap-4">
                                                    <Tabs value={teachingSubTab} onValueChange={setTeachingSubTab} className="w-full">
                                                        <div className="flex justify-center mb-6">
                                                            <TabsList className="bg-transparent gap-2 h-auto">
                                                                <TabsTrigger value="lumine" className="rounded-xl px-6 py-2 font-black uppercase text-[10px] border-2 data-[state=active]:bg-white data-[state=active]:border-primary data-[state=active]:text-primary tracking-widest transition-all">Lumine</TabsTrigger>
                                                                <TabsTrigger value="escolas" className="rounded-xl px-6 py-2 font-black uppercase text-[10px] border-2 data-[state=active]:bg-white data-[state=active]:border-primary data-[state=active]:text-primary tracking-widest transition-all">Escolas</TabsTrigger>
                                                                <TabsTrigger value="ministerios" className="rounded-xl px-6 py-2 font-black uppercase text-[10px] border-2 data-[state=active]:bg-white data-[state=active]:border-primary data-[state=active]:text-primary tracking-widest transition-all">Ministérios</TabsTrigger>
                                                            </TabsList>
                                                        </div>

                                                        {teachingSubTab === 'lumine' && (
                                                            <div className="flex justify-center gap-2 mb-8 animate-in slide-in-from-top-1">
                                                                {['all', 'teologico', 'biblico', 'discipulado'].map(track => (
                                                                    <button 
                                                                        key={track}
                                                                        onClick={() => setLumineTrackFilter(track)}
                                                                        className={cn(
                                                                            "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all border",
                                                                            lumineTrackFilter === track ? "bg-slate-900 text-white border-slate-900 shadow-md" : "bg-white text-muted-foreground hover:bg-slate-50"
                                                                        )}
                                                                    >
                                                                        {track === 'all' ? 'Todos os Trilhos' : `Trilho ${track}`}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </Tabs>
                                                </div>

                                                <div className="grid gap-3">
                                                    <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Escolha seu Curso/Vaga</Label>
                                                    <div className="grid grid-cols-1 gap-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                                                        {filteredCourses.map(course => (
                                                            <button
                                                                key={course.id}
                                                                onClick={() => { setSelectedCourseId(course.id); setSelectedClassId(''); }}
                                                                className={cn(
                                                                    "p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between group",
                                                                    selectedCourseId === course.id ? "bg-primary/10 border-primary shadow-sm" : "bg-slate-50 border-transparent hover:border-primary/30"
                                                                )}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className={cn("p-2 rounded-xl group-hover:bg-white transition-colors", selectedCourseId === course.id ? "bg-white text-primary" : "bg-white/50 text-muted-foreground")}>
                                                                        <BookOpen size={18} />
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-black uppercase text-xs tracking-tighter text-slate-900 leading-none mb-1">{course.name}</p>
                                                                        <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">{course.ministryName}</p>
                                                                    </div>
                                                                </div>
                                                                {selectedCourseId === course.id && <div className="size-5 bg-primary text-white rounded-full flex items-center justify-center"><CheckCircle size={14} /></div>}
                                                            </button>
                                                        ))}
                                                        {filteredCourses.length === 0 && <p className="text-center py-8 text-xs text-muted-foreground italic">Nenhum curso disponível nesta categoria no momento.</p>}
                                                    </div>
                                                </div>

                                                {selectedCourseId && (
                                                    <div className="space-y-4 pt-4 border-t animate-in fade-in duration-500">
                                                        {isMemberCourse ? (
                                                            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-start gap-3">
                                                                <Layers className="size-5 text-indigo-600 shrink-0 mt-0.5" />
                                                                <div className="space-y-1">
                                                                    <p className="text-xs font-black uppercase text-indigo-700">Ciclo Modular Dinâmico</p>
                                                                    <p className="text-[11px] text-indigo-900/70 font-medium leading-relaxed">
                                                                        Este curso permite reposição de módulos. Ao se inscrever, você receberá a agenda completa das aulas dominicais.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-2">
                                                                <Label className="text-[10px] uppercase font-black text-muted-foreground">Turmas Disponíveis</Label>
                                                                <div className="grid grid-cols-1 gap-2">
                                                                    {availableClasses.map(cls => (
                                                                        <button
                                                                            key={cls.id}
                                                                            type="button"
                                                                            onClick={() => setSelectedClassId(cls.id)}
                                                                            className={cn(
                                                                                "p-3 rounded-xl border-2 text-left transition-all flex items-center justify-between",
                                                                                selectedClassId === cls.id ? "bg-emerald-50 border-emerald-500" : "bg-white border-slate-100 hover:border-emerald-200"
                                                                            )}
                                                                        >
                                                                            <div className="flex items-center gap-3">
                                                                                <Clock size={16} className="text-muted-foreground" />
                                                                                <div>
                                                                                    <p className="text-sm font-bold text-slate-900">{cls.name}</p>
                                                                                    <p className="text-[10px] font-medium text-muted-foreground uppercase">{cls.dayOfWeek} • {cls.startTime}</p>
                                                                                </div>
                                                                            </div>
                                                                            {selectedClassId === cls.id && <CheckCircle size={16} className="text-emerald-600" />}
                                                                        </button>
                                                                    ))}
                                                                    {availableClasses.length === 0 && <p className="text-[10px] text-amber-600 font-bold uppercase p-3 bg-amber-50 rounded-xl border border-amber-100 text-center">Aguardando definição de agenda para este curso.</p>}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </TabsContent>

                                            <TabsContent value="eventos" className="mt-0">
                                                <div className="py-12 text-center border-2 border-dashed rounded-[2.5rem] bg-slate-50">
                                                    <Calendar className="size-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                                                    <h4 className="text-lg font-black uppercase italic tracking-tighter text-slate-400">Nenhum Evento Aberto</h4>
                                                    <p className="text-xs font-bold text-muted-foreground uppercase mt-2">Fique atento às nossas celebrações!</p>
                                                </div>
                                            </TabsContent>
                                        </Tabs>
                                    </div>

                                    <div className="flex gap-3 pt-4 border-t">
                                        <Button variant="outline" className="h-14 px-8 rounded-2xl font-bold border-slate-200" onClick={() => setStep('email')}>
                                            <ArrowLeft className="mr-2 size-4" /> Voltar
                                        </Button>
                                        <Button 
                                            onClick={handleEnroll} 
                                            disabled={isSaving || !selectedCourseId || (!isMemberCourse && !selectedClassId)}
                                            className="flex-1 h-14 rounded-2xl font-black text-base uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95"
                                        >
                                            {isSaving ? <Loader2 className="animate-spin size-5 mr-2" /> : <Send className="mr-2 size-5" />}
                                            Protocolar Inscrição
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="p-8 bg-muted/20 flex flex-col gap-4">
                            <p className="text-[10px] text-center text-muted-foreground uppercase font-black tracking-widest opacity-50">Igreja Batista da Manhã • Onde a Organização Serve ao Organismo</p>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </main>
    );
}

export default function EnrollmentPage() {
    return (
        <VolunteeringProvider>
            <EnrollmentPortal />
        </VolunteeringProvider>
    );
}
