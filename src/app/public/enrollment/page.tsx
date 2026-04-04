
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { useVolunteering, VolunteeringProvider } from '@/contexts/volunteering-context';
import { collection, Timestamp, addDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
    Loader2, 
    CheckCircle, 
    ArrowRight, 
    Search, 
    BookOpen, 
    Layers, 
    Users, 
    ShieldCheck, 
    GraduationCap,
    Clock,
    X,
    Filter,
    ArrowLeft,
    Mail
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { verifyMemberEmail } from './actions';

type Step = 'identification' | 'catalog' | 'success';

function EnrollmentForm() {
    const { firestore } = useFirebase();
    const { courses, classes, isLoading: isDataLoading } = useVolunteering();
    const { toast } = useToast();

    const [step, setStep] = useState<Step>('identification');
    const [email, setEmail] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [memberData, setMemberData] = useState<{ id?: string; name: string; phone: string; isExisting: boolean } | null>(null);
    
    // Novo Estado para Busca e Filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTrack, setSelectedTrack] = useState<'all' | 'teologico' | 'biblico' | 'discipulado'>('all');
    const [selectedTab, setSelectedTab] = useState<'ensino' | 'eventos'>('ensino');
    const [selectedMinistryFilter, setSelectedMinistryFilter] = useState<'all' | 'lumine' | 'escolas' | 'outros'>('all');

    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Lógica de Filtro de Cursos
    const filteredCourses = useMemo(() => {
        return courses.filter(course => {
            const matchesSearch = course.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 course.description.toLowerCase().includes(searchTerm.toLowerCase());
            
            const ministry = course.ministryName?.toLowerCase() || '';
            const isLumine = ministry.includes('lumine') || ministry.includes('ebd');
            const isEscola = ministry.includes('wave') || ministry.includes('dis');

            let matchesMinistry = true;
            if (selectedMinistryFilter === 'lumine') matchesMinistry = isLumine;
            else if (selectedMinistryFilter === 'escolas') matchesMinistry = isEscola;
            else if (selectedMinistryFilter === 'outros') matchesMinistry = !isLumine && !isEscola;

            let matchesTrack = true;
            if (selectedMinistryFilter === 'lumine' && selectedTrack !== 'all') {
                matchesTrack = course.ebdTrack === selectedTrack;
            }

            return matchesSearch && matchesMinistry && matchesTrack;
        });
    }, [courses, searchTerm, selectedMinistryFilter, selectedTrack]);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;

        setIsVerifying(true);
        try {
            const result = await verifyMemberEmail(email.toLowerCase().trim());
            setMemberData(result);
            setStep('catalog');
        } catch (error) {
            toast({ variant: 'destructive', title: "Erro na verificação", description: "Tente novamente em instantes." });
        } finally {
            setIsVerifying(false);
        }
    };

    const handleEnroll = async () => {
        if (!selectedCourseId || !firestore || !memberData) return;

        setIsSubmitting(true);
        try {
            await addDoc(collection(firestore, 'enrollment_requests'), {
                courseId: selectedCourseId,
                classId: selectedClassId || '',
                name: memberData.name,
                email: email.toLowerCase().trim(),
                phone: memberData.phone,
                status: 'pending',
                createdAt: Timestamp.now(),
            });
            setStep('success');
        } catch (error) {
            toast({ variant: 'destructive', title: "Erro ao solicitar", description: "Ocorreu uma falha técnica." });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (step === 'success') {
        return (
            <div className="max-w-md mx-auto py-20 text-center space-y-6 animate-in zoom-in-95 duration-500">
                <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle size={40} />
                </div>
                <h2 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">Solicitação <br/><span className="text-primary">Protocolada!</span></h2>
                <p className="text-muted-foreground text-sm font-medium">
                    Recebemos seu interesse. O responsável pelo curso entrará em contato em breve para confirmar sua vaga e detalhes de início.
                </p>
                <Button onClick={() => window.location.reload()} variant="outline" className="w-full font-bold h-12 rounded-xl">Voltar ao Início</Button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-4">
                <Logo className="size-12 text-primary mx-auto mb-2" />
                <h1 className="text-5xl md:text-6xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">Portal de <br/><span className="text-primary">Inscrições</span></h1>
                <p className="text-muted-foreground text-sm md:text-lg max-w-lg mx-auto font-medium italic">Onde a organização serve ao organismo. Escolha sua jornada de crescimento.</p>
            </div>

            {step === 'identification' ? (
                <Card className="shadow-2xl border-none overflow-hidden rounded-[2.5rem] bg-white">
                    <CardHeader className="bg-primary/5 p-8 md:p-12 text-center border-b border-dashed">
                        <CardTitle className="text-2xl font-black uppercase tracking-tighter">Identificação</CardTitle>
                        <CardDescription className="text-xs uppercase font-bold tracking-widest text-primary/60">Para começarmos, informe seu e-mail</CardDescription>
                    </CardHeader>
                    <form onSubmit={handleVerify}>
                        <CardContent className="p-8 md:p-12 space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-[10px] uppercase font-black text-muted-foreground ml-1">E-mail de Cadastro</Label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-4 size-5 text-muted-foreground" />
                                    <Input 
                                        required 
                                        type="email" 
                                        id="email"
                                        placeholder="seu@email.com" 
                                        value={email} 
                                        onChange={e => setEmail(e.target.value)}
                                        className="h-14 pl-12 rounded-2xl border-2 focus-visible:ring-primary/20 text-lg font-medium"
                                    />
                                </div>
                            </div>
                            <Button 
                                type="submit" 
                                disabled={isVerifying || !email} 
                                className="w-full h-14 rounded-2xl font-black text-base uppercase tracking-widest shadow-xl"
                            >
                                {isVerifying ? <Loader2 className="animate-spin mr-2" /> : <ArrowRight className="mr-2" />}
                                Continuar
                            </Button>
                        </CardContent>
                    </form>
                </Card>
            ) : (
                <div className="space-y-8 animate-in fade-in duration-500">
                    {/* Header do Aluno */}
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-6 bg-white rounded-[2rem] shadow-lg border-2 border-primary/10">
                        <div className="flex items-center gap-4">
                            <div className="size-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                                <Users size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-primary/60 tracking-widest leading-none">Bem-vindo(a)</p>
                                <h3 className="text-xl font-black text-slate-900">{memberData?.name || 'Novo Aluno'}</h3>
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setStep('identification')} className="text-xs font-bold uppercase text-muted-foreground hover:text-primary">
                            Alterar E-mail
                        </Button>
                    </div>

                    {/* Navegação Principal */}
                    <div className="flex gap-2 p-1 bg-white rounded-full border-2 shadow-sm w-fit mx-auto">
                        <button 
                            onClick={() => setSelectedTab('ensino')}
                            className={cn(
                                "px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all",
                                selectedTab === 'ensino' ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:bg-slate-100"
                            )}
                        >
                            Ensino
                        </button>
                        <button 
                            onClick={() => setSelectedTab('eventos')}
                            className={cn(
                                "px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all",
                                selectedTab === 'eventos' ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:bg-slate-100"
                            )}
                        >
                            Eventos
                        </button>
                    </div>

                    {selectedTab === 'ensino' ? (
                        <div className="space-y-6">
                            {/* Filtros de Ensino */}
                            <div className="bg-white p-6 rounded-[2rem] shadow-md border space-y-6">
                                <div className="flex flex-wrap items-center justify-center gap-2">
                                    <Button 
                                        variant={selectedMinistryFilter === 'all' ? 'default' : 'outline'} 
                                        onClick={() => {setSelectedMinistryFilter('all'); setSelectedTrack('all');}}
                                        className="h-10 rounded-full text-[10px] font-black uppercase"
                                    >
                                        Todos
                                    </Button>
                                    <Button 
                                        variant={selectedMinistryFilter === 'lumine' ? 'default' : 'outline'} 
                                        onClick={() => setSelectedMinistryFilter('lumine')}
                                        className="h-10 rounded-full text-[10px] font-black uppercase"
                                    >
                                        Lumine
                                    </Button>
                                    <Button 
                                        variant={selectedMinistryFilter === 'escolas' ? 'default' : 'outline'} 
                                        onClick={() => {setSelectedMinistryFilter('escolas'); setSelectedTrack('all');}}
                                        className="h-10 rounded-full text-[10px] font-black uppercase"
                                    >
                                        Escolas (Wave/DIS)
                                    </Button>
                                    <Button 
                                        variant={selectedMinistryFilter === 'outros' ? 'default' : 'outline'} 
                                        onClick={() => {setSelectedMinistryFilter('outros'); setSelectedTrack('all');}}
                                        className="h-10 rounded-full text-[10px] font-black uppercase"
                                    >
                                        Ministérios
                                    </Button>
                                </div>

                                {/* Sub-filtros para Lumine */}
                                {selectedMinistryFilter === 'lumine' && (
                                    <div className="flex flex-wrap items-center justify-center gap-2 pt-4 border-t animate-in slide-in-from-top-2">
                                        <Badge variant="outline" className="mr-2 text-[10px] font-black bg-slate-50">TRILHOS EBD:</Badge>
                                        <button 
                                            onClick={() => setSelectedTrack('all')}
                                            className={cn("px-4 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all", selectedTrack === 'all' ? "bg-primary/10 text-primary border-2 border-primary/20" : "text-muted-foreground border-2 border-transparent hover:bg-slate-50")}
                                        >
                                            Todos
                                        </button>
                                        <button 
                                            onClick={() => setSelectedTrack('biblico')}
                                            className={cn("px-4 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all", selectedTrack === 'biblico' ? "bg-primary/10 text-primary border-2 border-primary/20" : "text-muted-foreground border-2 border-transparent hover:bg-slate-50")}
                                        >
                                            Bíblico
                                        </button>
                                        <button 
                                            onClick={() => setSelectedTrack('teologico')}
                                            className={cn("px-4 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all", selectedTrack === 'teologico' ? "bg-primary/10 text-primary border-2 border-primary/20" : "text-muted-foreground border-2 border-transparent hover:bg-slate-50")}
                                        >
                                            Teológico
                                        </button>
                                        <button 
                                            onClick={() => setSelectedTrack('discipulado')}
                                            className={cn("px-4 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all", selectedTrack === 'discipulado' ? "bg-primary/10 text-primary border-2 border-primary/20" : "text-muted-foreground border-2 border-transparent hover:bg-slate-50")}
                                        >
                                            Discipulado
                                        </button>
                                    </div>
                                )}

                                {/* Barra de Pesquisa */}
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
                                    <Input 
                                        placeholder="Pesquisar curso por nome ou tema..." 
                                        className="h-12 pl-12 rounded-2xl bg-slate-50 border-none font-medium"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                    {searchTerm && (
                                        <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary">
                                            <X size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Catálogo de Cursos */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {filteredCourses.map((course) => {
                                    const isSelected = selectedCourseId === course.id;
                                    const courseClasses = classes.filter(c => c.courseId === course.id);
                                    const isLumine = course.ministryName?.toLowerCase().includes('lumine');

                                    return (
                                        <Card 
                                            key={course.id} 
                                            className={cn(
                                                "overflow-hidden cursor-pointer transition-all duration-300 rounded-[2rem] border-2",
                                                isSelected ? "border-primary ring-4 ring-primary/10 shadow-2xl scale-[1.02]" : "border-transparent hover:border-primary/20 bg-white shadow-md"
                                            )}
                                            onClick={() => { setSelectedCourseId(course.id); setSelectedClassId(null); }}
                                        >
                                            <CardHeader className={cn("p-6 pb-4", isLumine ? "bg-primary/5" : "bg-slate-900 text-white")}>
                                                <div className="flex justify-between items-start">
                                                    <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-widest px-2 h-5 border-none", isLumine ? "bg-primary/10 text-primary" : "bg-white/10 text-white")}>
                                                        {course.ministryName}
                                                    </Badge>
                                                    {isSelected && <CheckCircle className="size-5 text-emerald-500" />}
                                                </div>
                                                <CardTitle className="text-xl font-black uppercase italic tracking-tighter mt-3 leading-none">
                                                    {course.name}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-6 space-y-4">
                                                <p className="text-sm text-muted-foreground line-clamp-3 font-medium leading-relaxed italic">
                                                    "{course.description}"
                                                </p>
                                                
                                                {isSelected && (
                                                    <div className="space-y-4 animate-in slide-in-from-top-2">
                                                        <Label className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
                                                            <Clock className="size-3" /> Selecione a Turma
                                                        </Label>
                                                        {courseClasses.length > 0 ? (
                                                            <div className="grid gap-2">
                                                                {courseClasses.map(cls => (
                                                                    <div 
                                                                        key={cls.id}
                                                                        onClick={(e) => { e.stopPropagation(); setSelectedClassId(cls.id); }}
                                                                        className={cn(
                                                                            "p-3 rounded-xl border-2 transition-all flex items-center justify-between",
                                                                            selectedClassId === cls.id ? "border-primary bg-primary/5" : "border-slate-100 hover:border-primary/20"
                                                                        )}
                                                                    >
                                                                        <div className="min-w-0">
                                                                            <p className="text-xs font-black uppercase truncate">{cls.name}</p>
                                                                            <p className="text-[10px] text-muted-foreground font-bold">{cls.dayOfWeek} às {cls.startTime}</p>
                                                                        </div>
                                                                        <div className={cn("size-4 rounded-full border-2", selectedClassId === cls.id ? "bg-primary border-primary shadow-[0_0_8px_rgba(103,80,164,0.4)]" : "border-slate-200")} />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="p-4 bg-amber-50 text-amber-700 rounded-xl border border-amber-100 text-xs font-bold uppercase text-center">
                                                                Não há turmas abertas para este curso.
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </CardContent>
                                            {isSelected && (
                                                <CardFooter className="p-6 pt-0">
                                                    <Button 
                                                        disabled={isSubmitting || (!selectedClassId && !isLumine)} 
                                                        className="w-full h-12 rounded-xl font-black uppercase tracking-widest shadow-xl"
                                                        onClick={handleEnroll}
                                                    >
                                                        {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Users size={18} className="mr-2" />}
                                                        Garantir minha vaga
                                                    </Button>
                                                </CardFooter>
                                            )}
                                        </Card>
                                    );
                                })}
                            </div>
                            
                            {filteredCourses.length === 0 && (
                                <div className="py-20 text-center space-y-4 bg-slate-50 rounded-[2rem] border-2 border-dashed">
                                    <BookOpen className="size-12 text-muted-foreground/30 mx-auto" />
                                    <p className="text-muted-foreground font-bold italic">Nenhum curso encontrado para este filtro.</p>
                                    <Button variant="ghost" onClick={clearFilters} className="text-xs font-black uppercase text-primary">Limpar Filtros</Button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="py-20 text-center space-y-4 bg-slate-50 rounded-[2rem] border-2 border-dashed">
                            <Badge className="bg-amber-100 text-amber-700 border-none mb-4 px-4 py-1 text-[10px] font-black uppercase tracking-widest">Em Breve</Badge>
                            <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Inscrições para <br/><span className="text-primary">Eventos Estratégicos</span></h3>
                            <p className="text-muted-foreground text-sm max-w-xs mx-auto">Estamos preparando a agenda de eventos para 2026. Volte em breve!</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function EnrollmentPage() {
    return (
        <VolunteeringProvider>
            <main className="min-h-screen bg-[#F8F9FA] py-12 md:py-20 px-4">
                <EnrollmentForm />
                <footer className="mt-20 text-center space-y-2 opacity-40">
                    <Logo className="size-6 mx-auto text-slate-400 grayscale" />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Igreja Batista da Manhã • Gestão Ministerial</p>
                </footer>
            </main>
        </VolunteeringProvider>
    );
}
