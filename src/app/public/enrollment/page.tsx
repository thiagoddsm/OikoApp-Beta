
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useFirebase, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, getDocs, limit, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    Loader2, 
    Send, 
    CheckCircle, 
    BookOpen, 
    Users, 
    GraduationCap, 
    Search,
    Mail,
    Phone,
    User,
    Calendar,
    ChevronRight,
    School,
    Waves,
    HandHelping,
    Lightbulb
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons';
import { VolunteeringProvider, useVolunteering } from '@/contexts/volunteering-context';
import { cn } from '@/lib/utils';

function EnrollmentPortal() {
    const { firestore } = useFirebase();
    const { courses, classes, isLoading: isContextLoading } = useVolunteering();
    const { toast } = useToast();
    
    const [isSaving, setIsSaving] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [success, setSuccess] = useState(false);
    const [step, setStep] = useState<'email' | 'form'>('email');
    const [searchTerm, setSearchTerm] = useState('');
    const [activeMainTab, setActiveMainTab] = useState('ensino');
    const [activeEnsinoTab, setActiveEnsinoTab] = useState('lumine');
    const [activeTrackFilter, setActiveTrackFilter] = useState('all');

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        courseId: '',
        courseName: '',
    });

    const handleVerifyEmail = async () => {
        if (!formData.email || !firestore) return;
        
        setIsVerifying(true);
        try {
            // Consulta pontual e direta para verificar se o e-mail existe
            const usersRef = collection(firestore, 'users');
            const q = query(usersRef, where('email', '==', formData.email.toLowerCase()), limit(1));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const userData = querySnapshot.docs[0].data();
                setFormData(prev => ({
                    ...prev,
                    name: userData.name || '',
                    phone: userData.phone || '',
                }));
                toast({
                    title: `Olá, ${userData.name.split(' ')[0]}!`,
                    description: "Reconhecemos seu cadastro. Confirme seus dados abaixo.",
                });
            } else {
                toast({
                    title: "Novo por aqui?",
                    description: "Não encontramos seu e-mail. Preencha os dados para criar seu protocolo.",
                });
            }
            setStep('form');
        } catch (e) {
            console.error("Erro na verificação:", e);
            // Em caso de erro de permissão ou rede, permitimos seguir com o formulário manual
            setStep('form');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.email || !formData.courseId || !firestore) {
            toast({ variant: 'destructive', title: "Campos Obrigatórios", description: "Certifique-se de escolher um curso ou evento." });
            return;
        }

        setIsSaving(true);
        try {
            await addDocumentNonBlocking(collection(firestore, 'enrollment_requests'), {
                ...formData,
                status: 'pending',
                createdAt: Timestamp.now(),
            });
            setSuccess(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (e) {
            toast({ variant: 'destructive', title: "Erro ao enviar", description: "Falha técnica. Tente novamente." });
        } finally {
            setIsSaving(false);
        }
    };

    const selectCourse = (id: string, name: string) => {
        setFormData(prev => ({ ...prev, courseId: id, courseName: name }));
        toast({ title: "Selecionado!", description: `Você escolheu: ${name}` });
    };

    // --- FILTRAGEM ---
    const filteredCourses = useMemo(() => {
        return courses.filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
            const ministry = c.ministryName?.toLowerCase() || '';
            
            if (activeEnsinoTab === 'lumine') {
                const isLumine = ministry.includes('lumine') || ministry.includes('ebd');
                if (!isLumine) return false;
                if (activeTrackFilter !== 'all' && c.ebdTrack !== activeTrackFilter) return false;
            } else if (activeEnsinoTab === 'escolas') {
                const isEscola = ministry.includes('wave') || ministry === 'dis';
                if (!isEscola) return false;
            } else if (activeEnsinoTab === 'ministerios') {
                const isLumine = ministry.includes('lumine') || ministry.includes('ebd');
                const isEscola = ministry.includes('wave') || ministry === 'dis';
                if (isLumine || isEscola) return false;
            }

            return matchesSearch;
        });
    }, [courses, searchTerm, activeEnsinoTab, activeTrackFilter]);

    if (success) {
        return (
            <main className="min-h-screen bg-slate-50 py-20 px-4 flex items-center justify-center">
                <Card className="max-w-md w-full text-center p-8 animate-in zoom-in-95 duration-500 border-none shadow-2xl rounded-[2.5rem]">
                    <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={40} />
                    </div>
                    <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 mb-4">Solicitação Enviada!</h2>
                    <p className="text-muted-foreground mb-8">
                        Seu protocolo para <strong>{formData.courseName}</strong> foi registrado. A coordenação entrará em contato em breve.
                    </p>
                    <Button onClick={() => window.location.reload()} variant="outline" className="w-full font-bold h-12 rounded-xl">Fazer Outra Inscrição</Button>
                </Card>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50 py-12 md:py-20 px-4">
            <div className="max-w-6xl mx-auto space-y-12">
                <div className="text-center space-y-4">
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 py-1 px-4 text-xs font-black uppercase tracking-[0.2em]">Inscrições Abertas</Badge>
                    <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase text-slate-900 leading-[0.9]">Portal de Inscrições</h1>
                    <p className="text-muted-foreground text-sm md:text-lg max-w-2xl mx-auto font-medium">Garanta sua vaga nos próximos eventos estratégicos e cursos de capacitação da IBM.</p>
                </div>

                <div className="flex flex-col lg:flex-row gap-12 items-start">
                    {/* --- LISTAGEM --- */}
                    <div className="flex-1 space-y-8 w-full">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                            <Input 
                                placeholder="O que você está procurando?" 
                                className="h-14 pl-12 rounded-2xl bg-white border-none shadow-sm text-lg focus-visible:ring-2 focus-visible:ring-primary/20"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="w-full">
                            <div className="flex justify-center mb-8">
                                <TabsList className="bg-white p-1 rounded-2xl shadow-sm border h-14">
                                    <TabsTrigger value="ensino" className="rounded-xl px-8 font-black uppercase italic tracking-tighter data-[state=active]:bg-primary data-[state=active]:text-white">Ensino</TabsTrigger>
                                    <TabsTrigger value="evento" className="rounded-xl px-8 font-black uppercase italic tracking-tighter data-[state=active]:bg-primary data-[state=active]:text-white">Eventos</TabsTrigger>
                                </TabsList>
                            </div>

                            <TabsContent value="ensino" className="space-y-8 animate-in fade-in-50 duration-500">
                                <div className="flex justify-center">
                                    <TabsList className="bg-slate-200/50 p-1 rounded-xl h-10">
                                        <TabsTrigger value="lumine" onClick={() => setActiveEnsinoTab('lumine')} className="rounded-lg px-4 text-[10px] font-black uppercase tracking-widest">Escola Lumine</TabsTrigger>
                                        <TabsTrigger value="escolas" onClick={() => setActiveEnsinoTab('escolas')} className="rounded-lg px-4 text-[10px] font-black uppercase tracking-widest">Escolas (Wave/DIS)</TabsTrigger>
                                        <TabsTrigger value="ministerios" onClick={() => setActiveEnsinoTab('ministerios')} className="rounded-lg px-4 text-[10px] font-black uppercase tracking-widest">Ministérios</TabsTrigger>
                                    </TabsList>
                                </div>

                                {activeEnsinoTab === 'lumine' && (
                                    <div className="flex flex-wrap justify-center gap-2">
                                        {['all', 'teologico', 'biblico', 'discipulado'].map(t => (
                                            <button 
                                                key={t}
                                                onClick={() => setActiveTrackFilter(t)}
                                                className={cn(
                                                    "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-tighter border transition-all",
                                                    activeTrackFilter === t ? "bg-indigo-600 border-indigo-600 text-white shadow-md scale-105" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                                                )}
                                            >
                                                {t === 'all' ? 'Ver Todos' : `Trilho ${t}`}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {filteredCourses.map(course => (
                                        <Card 
                                            key={course.id} 
                                            className={cn(
                                                "group cursor-pointer transition-all border-none shadow-sm hover:shadow-xl hover:-translate-y-1 rounded-3xl overflow-hidden",
                                                formData.courseId === course.id ? "ring-2 ring-primary" : "bg-white"
                                            )}
                                            onClick={() => selectCourse(course.id, course.name)}
                                        >
                                            <CardContent className="p-6">
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="p-3 bg-primary/5 rounded-2xl text-primary group-hover:scale-110 transition-transform">
                                                        {course.ministryName?.toLowerCase().includes('wave') ? <Waves size={24}/> : 
                                                         course.ministryName?.toLowerCase().includes('dis') ? <HandHelping size={24}/> :
                                                         <Lightbulb size={24}/>}
                                                    </div>
                                                    <Badge variant="outline" className="text-[10px] font-black uppercase tracking-tighter opacity-60">{course.ministryName}</Badge>
                                                </div>
                                                <h3 className="text-xl font-black text-slate-900 leading-tight mb-2 uppercase italic tracking-tighter">{course.name}</h3>
                                                <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed">{course.description}</p>
                                                <div className="flex items-center justify-between pt-4 border-t border-dashed">
                                                    <span className="text-[10px] font-bold text-primary uppercase flex items-center gap-1.5"><Calendar size={12}/> Próxima Turma: Março</span>
                                                    <ChevronRight size={16} className="text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                    {filteredCourses.length === 0 && (
                                        <div className="col-span-full py-20 text-center border-2 border-dashed rounded-[2rem] bg-white/50">
                                            <BookOpen className="size-12 mx-auto mb-4 text-slate-300" />
                                            <p className="text-slate-500 font-medium">Nenhum curso encontrado nestes critérios.</p>
                                        </div>
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="evento" className="space-y-6 animate-in fade-in-50 duration-500">
                                <div className="grid grid-cols-1 gap-6">
                                    <Card className="bg-rose-600 text-white rounded-[2.5rem] border-none shadow-2xl overflow-hidden group">
                                        <div className="flex flex-col md:flex-row h-full">
                                            <div className="flex-1 p-8 md:p-12 space-y-6">
                                                <Badge className="bg-white/20 text-white border-white/20 font-black tracking-widest text-[10px]">EVENTO ESTRATÉGICO</Badge>
                                                <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter leading-none">Jantar dos <br/><span className="text-rose-200">Namorados 2026</span></h2>
                                                <p className="text-rose-50 text-lg leading-relaxed max-w-xl">O Riso que Restaura - Uma experiência gastronômica e show de stand-up com Welson Nunes.</p>
                                                <div className="pt-4">
                                                    <Button className="bg-white text-rose-600 hover:bg-rose-50 font-black uppercase tracking-widest h-14 px-10 rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95" asChild>
                                                        <a href="/eventos/jantar-dos-namorados" target="_blank">Conhecer Evento</a>
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="w-full md:w-1/3 bg-rose-700 p-8 flex flex-col justify-center items-center text-center space-y-4">
                                                <div className="size-16 bg-white/10 rounded-full flex items-center justify-center border border-white/20"><Calendar size={32}/></div>
                                                <div>
                                                    <p className="text-2xl font-black italic tracking-tighter">12 JUNHO</p>
                                                    <p className="text-[10px] font-bold uppercase opacity-70">Sexta-feira às 19h</p>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* --- FORMULÁRIO --- */}
                    <div className="w-full lg:w-[400px] shrink-0 sticky top-24">
                        <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white">
                            <CardHeader className="bg-slate-900 text-white p-8 text-center">
                                <CardTitle className="text-2xl font-black uppercase italic tracking-tighter">Protocolar Interesse</CardTitle>
                                <CardDescription className="text-slate-400 text-xs uppercase font-bold tracking-widest mt-2">Escolha uma opção ao lado</CardDescription>
                            </CardHeader>
                            <form onSubmit={handleSave}>
                                <CardContent className="p-8 space-y-6">
                                    {step === 'email' ? (
                                        <div className="space-y-4 animate-in slide-in-from-top-2">
                                            <div className="space-y-2 text-center mb-6">
                                                <div className="size-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto text-primary mb-2">
                                                    <Mail size={24}/>
                                                </div>
                                                <p className="text-sm font-medium text-slate-600">Para começar, informe seu e-mail para identificarmos seu cadastro.</p>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] uppercase font-black text-muted-foreground ml-1">E-mail Principal</Label>
                                                <Input 
                                                    required 
                                                    type="email" 
                                                    placeholder="seu@email.com" 
                                                    className="h-12 rounded-xl"
                                                    value={formData.email}
                                                    onChange={e => setFormData(p => ({...p, email: e.target.value}))}
                                                />
                                            </div>
                                            <Button 
                                                type="button" 
                                                className="w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl"
                                                disabled={!formData.email || isVerifying}
                                                onClick={handleVerifyEmail}
                                            >
                                                {isVerifying ? <Loader2 className="animate-spin size-5" /> : 'Verificar Cadastro'}
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-5 animate-in slide-in-from-bottom-2">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Opção Selecionada</Label>
                                                <div className="p-3 bg-slate-50 rounded-xl border-2 border-dashed flex items-center justify-between">
                                                    <span className="text-xs font-black text-slate-900 truncate max-w-[200px] uppercase">{formData.courseName || 'Nenhuma selecionada'}</span>
                                                    {formData.courseId && <CheckCircle className="size-4 text-emerald-500 shrink-0" />}
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Nome Completo</Label>
                                                <Input 
                                                    required 
                                                    placeholder="Como prefere ser chamado?" 
                                                    className="h-12 rounded-xl"
                                                    value={formData.name}
                                                    onChange={e => setFormData(p => ({...p, name: e.target.value}))}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Celular / WhatsApp</Label>
                                                <Input 
                                                    required 
                                                    placeholder="(21) 9..." 
                                                    className="h-12 rounded-xl"
                                                    value={formData.phone}
                                                    onChange={e => setFormData(p => ({...p, phone: e.target.value}))}
                                                />
                                            </div>
                                            <Button 
                                                type="submit" 
                                                disabled={isSaving || !formData.courseId} 
                                                className="w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl mt-4"
                                            >
                                                {isSaving ? <Loader2 className="animate-spin size-5" /> : <><Send className="size-4 mr-2" /> Protocolar Agora</>}
                                            </Button>
                                            <button 
                                                type="button" 
                                                onClick={() => setStep('email')}
                                                className="w-full text-[10px] uppercase font-black text-slate-400 hover:text-primary transition-colors tracking-widest"
                                            >
                                                Voltar e trocar e-mail
                                            </button>
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter className="p-8 pt-0 flex flex-col gap-4">
                                    <p className="text-[9px] text-center text-muted-foreground uppercase font-bold tracking-tighter">Igreja Batista da Manhã • Ano da Visão</p>
                                </CardFooter>
                            </form>
                        </Card>
                    </div>
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
