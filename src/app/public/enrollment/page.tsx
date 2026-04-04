
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { useVolunteering, VolunteeringProvider } from '@/contexts/volunteering-context';
import { collection, Timestamp, addDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
    Loader2, CheckCircle, Mail, User, Phone, ArrowRight, 
    BookOpen, Search, Filter, ShieldCheck, GraduationCap, 
    Waves, Lightbulb, HandHelping, School, Clock, X, ChevronRight,
    Star, CalendarDays, Check
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { verifyMemberEmail } from './actions';

function EnrollmentForm() {
    const { firestore } = useFirebase();
    const { courses, classes, isLoading: isLoadingContext } = useVolunteering();
    const { toast } = useToast();

    // Estados do Fluxo
    const [step, setStep] = useState<'identification' | 'selection' | 'success'>('identification');
    const [isVerifying, setIsVerifying] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Dados do Aluno
    const [email, setEmail] = useState('');
    const [memberData, setMemberData] = useState<{ id: string; name: string; phone: string; isNew: boolean } | null>(null);
    const [newName, setNewName] = useState('');
    const [newPhone, setNewPhone] = useState('');

    // Seleção de Curso
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
    const [mainTab, setMainTab] = useState<'ensino' | 'eventos'>('ensino');
    const [teachingTab, setTeachingTab] = useState<'lumine' | 'escolas' | 'ministerios'>('lumine');
    const [lumineTrack, setLumineTrack] = useState<'all' | 'biblico' | 'teologico' | 'discipulado'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;

        setIsVerifying(true);
        try {
            const result = await verifyMemberEmail(email);
            if (result.exists) {
                setMemberData({
                    id: result.userId!,
                    name: result.maskedName!,
                    phone: result.maskedPhone!,
                    isNew: false
                });
            } else {
                setMemberData({ id: '', name: '', phone: '', isNew: true });
            }
            setStep('selection');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro na verificação', description: 'Tente novamente.' });
        } finally {
            setIsVerifying(false);
        }
    };

    const filteredCourses = useMemo(() => {
        return courses.filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                 c.description.toLowerCase().includes(searchQuery.toLowerCase());
            
            if (mainTab === 'eventos') return false;

            if (teachingTab === 'lumine') {
                const isLumine = c.ministryName.toLowerCase().includes('lumine') || c.ministryName.toLowerCase().includes('ebd');
                const matchesTrack = lumineTrack === 'all' || c.ebdTrack === lumineTrack;
                return isLumine && matchesTrack && matchesSearch;
            }

            if (teachingTab === 'escolas') {
                return (c.ministryName.toLowerCase().includes('wave') || c.ministryName.toLowerCase().includes('dis')) && matchesSearch;
            }

            if (teachingTab === 'ministerios') {
                const isLumine = c.ministryName.toLowerCase().includes('lumine') || c.ministryName.toLowerCase().includes('ebd');
                const isWave = c.ministryName.toLowerCase().includes('wave');
                const isDis = c.ministryName.toLowerCase().includes('dis');
                return !isLumine && !isWave && !isDis && matchesSearch;
            }

            return matchesSearch;
        });
    }, [courses, teachingTab, lumineTrack, searchQuery, mainTab]);

    const courseClasses = useMemo(() => {
        if (!selectedCourseId) return [];
        return classes.filter(cls => cls.courseId === selectedCourseId);
    }, [classes, selectedCourseId]);

    const handleEnroll = async () => {
        if (!selectedCourseId || !firestore) return;
        
        setIsSubmitting(true);
        try {
            const protocolData = {
                courseId: selectedCourseId,
                classId: selectedClassId || 'pending',
                name: memberData?.isNew ? newName : (memberData?.name || 'Membro Identificado'),
                email: email.trim().toLowerCase(),
                phone: memberData?.isNew ? newPhone : (memberData?.phone || ''),
                status: 'pending',
                createdAt: Timestamp.now(),
                isNewMember: memberData?.isNew || false,
                memberId: memberData?.id || null
            };

            await addDoc(collection(firestore, 'enrollment_requests'), protocolData);
            setStep('success');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao processar', description: 'Não foi possível enviar sua inscrição.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (step === 'success') {
        return (
            <Card className="border-none shadow-2xl overflow-hidden rounded-[2.5rem] animate-in zoom-in-95 duration-500">
                <div className="bg-emerald-600 p-12 text-center text-white">
                    <div className="size-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-md">
                        <CheckCircle size={40} className="text-white" />
                    </div>
                    <h2 className="text-4xl font-black uppercase italic tracking-tighter mb-4">Inscrição Protocolada!</h2>
                    <p className="text-emerald-50 max-w-xs mx-auto font-medium">Recebemos seu pedido. A coordenação entrará em contato em breve para confirmar sua vaga.</p>
                </div>
                <CardFooter className="p-8 bg-white">
                    <Button onClick={() => window.location.reload()} variant="outline" className="w-full h-12 font-bold rounded-xl">Realizar Outra Inscrição</Button>
                </CardFooter>
            </Card>
        );
    }

    return (
        <Card className="border-none shadow-2xl overflow-hidden rounded-[2.5rem] bg-white">
            <CardHeader className="bg-slate-900 p-8 md:p-12 text-white relative">
                <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
                    <Logo className="size-32" />
                </div>
                <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary rounded-xl"><GraduationCap size={24} /></div>
                        <span className="text-xs font-black uppercase tracking-[0.3em] text-primary-foreground/70">Fluxo de Matrícula</span>
                    </div>
                    <CardTitle className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter leading-none">
                        {step === 'identification' ? 'Quem é você?' : 'Escolha sua Jornada'}
                    </CardTitle>
                    <CardDescription className="text-slate-400 text-sm md:text-lg max-w-md font-medium">
                        {step === 'identification' 
                            ? 'Identifique-se para que possamos personalizar sua experiência de ensino.' 
                            : 'Explore os cursos disponíveis e garanta sua vaga nos próximos ciclos.'}
                    </CardDescription>
                </div>
            </CardHeader>

            <CardContent className="p-8 md:p-12">
                {step === 'identification' ? (
                    <form onSubmit={handleVerify} className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Seu melhor E-mail</Label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 size-5" />
                                <Input 
                                    required 
                                    type="email" 
                                    value={email} 
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="exemplo@email.com" 
                                    className="h-16 pl-12 rounded-2xl bg-slate-50 border-2 focus:border-primary text-lg font-bold"
                                />
                            </div>
                        </div>
                        <Button type="submit" disabled={isVerifying} className="w-full h-16 rounded-2xl font-black text-lg uppercase tracking-widest shadow-xl shadow-primary/20">
                            {isVerifying ? <Loader2 className="mr-2 animate-spin" /> : <ArrowRight className="mr-2" />}
                            Verificar Cadastro
                        </Button>
                    </form>
                ) : (
                    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
                        {/* Identidade Confirmada */}
                        <div className="p-6 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="size-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                                    <User size={28} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Inscrito(a)</p>
                                    <h3 className="text-xl font-black text-slate-900 leading-none">
                                        {memberData?.isNew ? 'Novo Visitante' : memberData?.name}
                                    </h3>
                                    <p className="text-xs font-bold text-primary mt-1">{email}</p>
                                </div>
                            </div>
                            {memberData?.isNew ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full md:w-auto">
                                    <Input placeholder="Seu Nome" value={newName} onChange={e => setNewName(e.target.value)} className="h-11 font-bold" />
                                    <Input placeholder="Seu Celular" value={newPhone} onChange={e => setNewPhone(e.target.value)} className="h-11 font-bold" />
                                </div>
                            ) : (
                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 h-8 px-4 rounded-full font-black border-none"><Check size={14} className="mr-1" /> RECONHECIDO</Badge>
                            )}
                        </div>

                        {/* Navegação de Cursos */}
                        <div className="space-y-6">
                            <div className="flex flex-col md:flex-row gap-4 justify-between items-end">
                                <div className="flex bg-slate-100 p-1 rounded-2xl border w-full md:w-auto">
                                    <button onClick={() => setMainTab('ensino')} className={cn("flex-1 md:flex-none px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all", mainTab === 'ensino' ? "bg-white shadow-xl text-primary scale-105" : "text-slate-500")}>Ensino</button>
                                    <button onClick={() => setMainTab('eventos')} className={cn("flex-1 md:flex-none px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all", mainTab === 'eventos' ? "bg-white shadow-xl text-primary scale-105" : "text-slate-500")}>Eventos</button>
                                </div>
                                <div className="relative w-full md:w-80">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                                    <Input placeholder="Buscar curso..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 h-11 rounded-xl bg-slate-50" />
                                </div>
                            </div>

                            {mainTab === 'ensino' && (
                                <div className="space-y-8">
                                    <div className="flex flex-wrap gap-2">
                                        <button onClick={() => setTeachingTab('lumine')} className={cn("px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border-2 transition-all", teachingTab === 'lumine' ? "bg-primary border-primary text-white" : "bg-white border-slate-200 text-slate-500 hover:border-primary/30")}>Lumine</button>
                                        <button onClick={() => setTeachingTab('escolas')} className={cn("px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border-2 transition-all", teachingTab === 'escolas' ? "bg-primary border-primary text-white" : "bg-white border-slate-200 text-slate-500 hover:border-primary/30")}>Escolas (Wave/DIS)</button>
                                        <button onClick={() => setTeachingTab('ministerios')} className={cn("px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border-2 transition-all", teachingTab === 'ministerios' ? "bg-primary border-primary text-white" : "bg-white border-slate-200 text-slate-500 hover:border-primary/30")}>Ministérios</button>
                                    </div>

                                    {teachingTab === 'lumine' && (
                                        <div className="flex gap-2 pb-4 border-b">
                                            {['all', 'biblico', 'teologico', 'discipulado'].map((t) => (
                                                <button key={t} onClick={() => setLumineTrack(t as any)} className={cn("px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all", lumineTrack === t ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}>
                                                    {t === 'all' ? 'Ver Todos' : `Trilho ${t}`}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {filteredCourses.length === 0 ? (
                                            <div className="col-span-full py-20 text-center space-y-4 bg-slate-50 rounded-[2rem] border-2 border-dashed">
                                                <div className="size-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-inner">
                                                    <Search className="size-8 text-slate-200" />
                                                </div>
                                                <p className="text-slate-400 font-bold italic">Nenhum curso encontrado nesta categoria.</p>
                                            </div>
                                        ) : (
                                            filteredCourses.map(course => (
                                                <button 
                                                    key={course.id} 
                                                    onClick={() => { setSelectedCourseId(course.id); setSelectedClassId(null); }}
                                                    className={cn(
                                                        "group relative p-6 rounded-[2rem] border-2 text-left transition-all hover:scale-[1.02] active:scale-95",
                                                        selectedCourseId === course.id ? "border-primary bg-primary/5 ring-4 ring-primary/10 shadow-2xl" : "border-slate-100 bg-white hover:border-primary/30"
                                                    )}
                                                >
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="p-3 bg-slate-50 rounded-2xl text-slate-400 group-hover:text-primary transition-colors">
                                                            <BookOpen size={24} />
                                                        </div>
                                                        {selectedCourseId === course.id && <CheckCircle className="text-primary animate-in zoom-in-50" />}
                                                    </div>
                                                    <Badge variant="outline" className="text-[9px] font-black uppercase mb-2 h-5">{course.ministryName}</Badge>
                                                    <h4 className="text-lg font-black uppercase italic tracking-tighter text-slate-900 mb-2 leading-none">{course.name}</h4>
                                                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{course.description}</p>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {mainTab === 'eventos' && (
                                <div className="py-20 text-center space-y-4 bg-slate-50 rounded-[2rem] border-2 border-dashed">
                                    <CalendarDays className="size-12 mx-auto text-slate-200" />
                                    <p className="text-slate-400 font-bold italic">As inscrições para eventos abrem periodicamente. Fique atento!</p>
                                </div>
                            )}
                        </div>

                        {/* Seleção de Turma */}
                        {selectedCourseId && (
                            <div className="space-y-6 p-8 bg-primary/5 rounded-[2.5rem] border-2 border-primary/10 animate-in slide-in-from-top-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <Clock className="text-primary size-5" />
                                    <h3 className="text-xl font-black uppercase italic tracking-tighter text-primary">Selecione o Ciclo / Turma</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {courseClasses.length === 0 ? (
                                        <div className="col-span-full p-6 bg-white rounded-2xl text-center border">
                                            <p className="text-sm font-bold text-slate-500">Este curso ainda não possui turmas com inscrições abertas.</p>
                                        </div>
                                    ) : (
                                        courseClasses.map(cls => (
                                            <button 
                                                key={cls.id} 
                                                onClick={() => setSelectedClassId(cls.id)}
                                                className={cn(
                                                    "p-4 rounded-2xl border-2 text-left transition-all",
                                                    selectedClassId === cls.id ? "border-primary bg-white shadow-lg" : "bg-white/50 border-transparent hover:bg-white"
                                                )}
                                            >
                                                <p className="font-black text-sm uppercase tracking-tight">{cls.name}</p>
                                                <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 font-bold uppercase">
                                                    <CalendarDays size={12} /> {cls.dayOfWeek} às {cls.startTime}
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Botão Final */}
                        <div className="pt-6 border-t flex flex-col gap-4">
                            <Button 
                                onClick={handleEnroll} 
                                disabled={isSubmitting || !selectedCourseId || (courseClasses.length > 0 && !selectedClassId)} 
                                className="w-full h-16 rounded-[1.5rem] font-black text-lg uppercase tracking-widest shadow-2xl"
                            >
                                {isSubmitting ? <Loader2 className="mr-2 animate-spin" /> : <ShieldCheck className="mr-2" />}
                                Protocolar Inscrição Agora
                            </Button>
                            <p className="text-[10px] text-center text-slate-400 uppercase font-black tracking-tighter">Igreja Batista da Manhã • Onde a Organização serve ao Organismo</p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function EnrollmentPage() {
    return (
        <VolunteeringProvider>
            <main className="min-h-screen bg-slate-50 py-12 md:py-20 px-4">
                <div className="max-w-4xl mx-auto space-y-12">
                    <div className="text-center space-y-4">
                        <Logo className="size-16 text-primary mx-auto mb-4" />
                        <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">Portal de Inscrições</h1>
                        <p className="text-slate-500 font-medium text-lg">Escolha seu próximo passo de crescimento na IBM.</p>
                    </div>
                    <EnrollmentForm />
                </div>
            </main>
        </VolunteeringProvider>
    );
}
