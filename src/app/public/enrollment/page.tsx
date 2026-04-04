
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
    Loader2, CheckCircle, ArrowRight, User, Mail, 
    Smartphone, Search, GraduationCap, CalendarDays,
    BookOpen, Lightbulb, School, Waves, HandHelping,
    Filter, X, Check
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { verifyMemberEmail } from './actions';

function EnrollmentForm() {
    const { firestore } = useFirebase();
    const { courses, classes } = useVolunteering();
    const { toast } = useToast();

    const [step, setStep] = useState<'identification' | 'confirmation' | 'catalog' | 'success'>('identification');
    const [isVerifying, setIsVerifying] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Member Data
    const [email, setEmail] = useState('');
    const [memberInfo, setMemberInfo] = useState<{ id?: string; name: string; phone: string; isExisting: boolean } | null>(null);
    
    // Catalog State
    const [selectedTab, setSelectedTab] = useState<'ensino' | 'eventos'>('ensino');
    const [ensinoFilter, setEnsinoFilter] = useState<'all' | 'lumine' | 'escolas' | 'ministerios'>('all');
    const [lumineTrack, setLumineTrack] = useState<'all' | 'biblico' | 'teologico' | 'discipulado'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Enrollment Selection
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

    const handleVerifyEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;

        setIsVerifying(true);
        try {
            const result = await verifyMemberEmail(email.toLowerCase().trim());
            if (result.success && result.member) {
                setMemberInfo({
                    id: result.member.id,
                    name: result.member.name,
                    phone: result.member.phone,
                    isExisting: true
                });
                setStep('confirmation');
            } else {
                setMemberInfo({ name: '', phone: '', isExisting: false });
                setStep('confirmation');
            }
        } catch (error) {
            toast({ variant: 'destructive', title: "Erro na verificação", description: "Tente novamente em instantes." });
        } finally {
            setIsVerifying(false);
        }
    };

    const handleConfirmIdentity = (e: React.FormEvent) => {
        e.preventDefault();
        setStep('catalog');
    };

    const filteredCourses = useMemo(() => {
        return courses.filter(course => {
            const matchesSearch = course.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                course.description?.toLowerCase().includes(searchTerm.toLowerCase());
            
            if (ensinoFilter === 'lumine') {
                const isLumine = course.ministryName?.toLowerCase().includes('lumine') || course.ministryName?.toLowerCase().includes('ebd');
                if (!isLumine) return false;
                if (lumineTrack !== 'all' && course.ebdTrack !== lumineTrack) return false;
            } else if (ensinoFilter === 'escolas') {
                const isEscola = course.ministryName?.toLowerCase().includes('wave') || course.ministryName?.toLowerCase() === 'dis';
                if (!isEscola) return false;
            } else if (ensinoFilter === 'ministerios') {
                const isMinisterio = !course.ministryName?.toLowerCase().includes('lumine') && 
                                   !course.ministryName?.toLowerCase().includes('ebd') &&
                                   !course.ministryName?.toLowerCase().includes('wave') &&
                                   course.ministryName?.toLowerCase() !== 'dis';
                if (!isMinisterio) return false;
            }

            return matchesSearch;
        });
    }, [courses, ensinoFilter, lumineTrack, searchTerm]);

    const handleFinalSubmit = async () => {
        if (!selectedCourseId || !memberInfo || !firestore) return;

        setIsSubmitting(true);
        try {
            await addDoc(collection(firestore, 'enrollment_requests'), {
                courseId: selectedCourseId,
                classId: selectedClassId,
                name: memberInfo.name,
                email: email.toLowerCase().trim(),
                phone: memberInfo.phone,
                status: 'pending',
                createdAt: Timestamp.now()
            });
            setStep('success');
        } catch (error) {
            toast({ variant: 'destructive', title: "Erro no envio", description: "Não foi possível processar sua inscrição agora." });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (step === 'success') {
        return (
            <div className="min-h-[60vh] flex items-center justify-center p-6">
                <Card className="max-w-md w-full text-center p-8 rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-500">
                    <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={40} />
                    </div>
                    <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 mb-4">Protocolado!</h2>
                    <p className="text-muted-foreground mb-8">
                        Sua solicitação de inscrição foi enviada. O responsável pelo curso entrará em contato em breve para confirmar sua vaga.
                    </p>
                    <Button onClick={() => window.location.reload()} className="w-full h-12 font-bold rounded-xl">Fazer Outra Inscrição</Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
            {/* Header dinâmico baseado no passo */}
            <div className="text-center space-y-4">
                <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">
                    Portal de <span className="text-primary">Inscrições</span>
                </h1>
                <p className="text-muted-foreground max-w-xl mx-auto">
                    {step === 'identification' && 'Para começar, informe seu e-mail cadastrado na IBM.'}
                    {step === 'confirmation' && 'Confirme se estes são os seus dados para prosseguir.'}
                    {step === 'catalog' && 'Escolha o curso ou evento que deseja participar.'}
                </p>
            </div>

            {/* Passo 1: Identificação */}
            {step === 'identification' && (
                <Card className="max-w-md mx-auto shadow-2xl border-none rounded-[2rem] overflow-hidden">
                    <form onSubmit={handleVerifyEmail}>
                        <CardContent className="p-8 space-y-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Seu Melhor E-mail</Label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
                                    <Input 
                                        required 
                                        type="email" 
                                        placeholder="seu@email.com" 
                                        className="h-14 pl-12 rounded-2xl bg-slate-50 border-none focus-visible:ring-primary/20 text-lg"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
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
            )}

            {/* Passo 2: Confirmação de Identidade */}
            {step === 'confirmation' && memberInfo && (
                <Card className="max-w-md mx-auto shadow-2xl border-none rounded-[2rem] overflow-hidden animate-in slide-in-from-bottom-4">
                    <CardHeader className="bg-primary/5 p-8 border-b text-center">
                        <div className="size-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 text-primary">
                            <User size={32} />
                        </div>
                        <CardTitle className="text-xl font-bold">Confirme seus Dados</CardTitle>
                        <CardDescription>Para sua segurança, protegemos parte das suas informações.</CardDescription>
                    </CardHeader>
                    <form onSubmit={handleConfirmIdentity}>
                        <CardContent className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground block mb-1">Nome Identificado</Label>
                                    <Input 
                                        required={!memberInfo.isExisting}
                                        readOnly={memberInfo.isExisting}
                                        value={memberInfo.name}
                                        onChange={e => setMemberInfo(p => ({ ...p!, name: e.target.value }))}
                                        className={cn("h-11 font-bold", memberInfo.isExisting ? "bg-transparent border-none px-0 h-auto" : "bg-white")}
                                        placeholder="Seu nome completo"
                                    />
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground block mb-1">WhatsApp de Contato</Label>
                                    <Input 
                                        required={!memberInfo.isExisting}
                                        readOnly={memberInfo.isExisting}
                                        value={memberInfo.phone}
                                        onChange={e => setMemberInfo(p => ({ ...p!, phone: e.target.value }))}
                                        className={cn("h-11 font-bold", memberInfo.isExisting ? "bg-transparent border-none px-0 h-auto" : "bg-white")}
                                        placeholder="(21) 99999-9999"
                                    />
                                </div>
                            </div>
                            <Button type="submit" className="w-full h-14 rounded-2xl font-black text-base uppercase tracking-widest shadow-xl">
                                {memberInfo.isExisting ? 'Sim, Sou Eu' : 'Criar Cadastro e Continuar'}
                            </Button>
                            <Button type="button" variant="ghost" className="w-full text-xs text-muted-foreground" onClick={() => setStep('identification')}>
                                Este não é meu e-mail
                            </Button>
                        </CardContent>
                    </form>
                </Card>
            )}

            {/* Passo 3: Catálogo */}
            {step === 'catalog' && (
                <div className="space-y-8 animate-in fade-in duration-700">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="flex bg-muted/50 p-1.5 rounded-2xl border w-full md:w-auto">
                            <button 
                                onClick={() => setSelectedTab('ensino')}
                                className={cn(
                                    "flex-1 md:flex-none px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                                    selectedTab === 'ensino' ? "bg-white shadow-lg text-primary scale-105" : "text-muted-foreground hover:text-slate-900"
                                )}
                            >
                                <GraduationCap className="size-4 inline mr-2" /> Ensino
                            </button>
                            <button 
                                onClick={() => setSelectedTab('eventos')}
                                className={cn(
                                    "flex-1 md:flex-none px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                                    selectedTab === 'eventos' ? "bg-white shadow-lg text-primary scale-105" : "text-muted-foreground hover:text-slate-900"
                                )}
                            >
                                <CalendarDays className="size-4 inline mr-2" /> Eventos
                            </button>
                        </div>

                        <div className="relative w-full md:w-80 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            <Input 
                                placeholder="Pesquisar curso..." 
                                className="h-12 pl-11 rounded-2xl bg-white border-none shadow-sm focus-visible:ring-primary/20"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {selectedTab === 'ensino' && (
                        <div className="space-y-8">
                            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                                <Button 
                                    variant={ensinoFilter === 'all' ? 'default' : 'outline'} 
                                    onClick={() => setEnsinoFilter('all')}
                                    className="h-11 px-6 rounded-full font-black uppercase italic tracking-tighter text-xs"
                                >
                                    Todos
                                </Button>
                                <Button 
                                    variant={ensinoFilter === 'lumine' ? 'default' : 'outline'} 
                                    onClick={() => setEnsinoFilter('lumine')}
                                    className="h-11 px-6 rounded-full font-black uppercase italic tracking-tighter text-xs"
                                >
                                    Lumine
                                </Button>
                                <Button 
                                    variant={ensinoFilter === 'escolas' ? 'default' : 'outline'} 
                                    onClick={() => setEnsinoFilter('escolas')}
                                    className="h-11 px-6 rounded-full font-black uppercase italic tracking-tighter text-xs"
                                >
                                    Escolas (Wave/DIS)
                                </Button>
                                <Button 
                                    variant={ensinoFilter === 'ministerios' ? 'default' : 'outline'} 
                                    onClick={() => setEnsinoFilter('ministerios')}
                                    className="h-11 px-6 rounded-full font-black uppercase italic tracking-tighter text-xs"
                                >
                                    Ministérios
                                </Button>
                            </div>

                            {ensinoFilter === 'lumine' && (
                                <div className="p-4 bg-primary/5 rounded-[2rem] border-2 border-primary/10 space-y-4 animate-in slide-in-from-top-4">
                                    <div className="flex items-center gap-2 px-4">
                                        <Filter className="size-3 text-primary" />
                                        <span className="text-[10px] font-black uppercase text-primary tracking-widest">Filtrar por Trilho</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button 
                                            onClick={() => setLumineTrack('all')}
                                            className={cn(
                                                "px-4 py-2 rounded-full text-[10px] font-bold uppercase transition-all",
                                                lumineTrack === 'all' ? "bg-primary text-white" : "bg-white text-slate-600 hover:bg-slate-100"
                                            )}
                                        >
                                            Todos os Trilhos
                                        </button>
                                        <button 
                                            onClick={() => setLumineTrack('biblico')}
                                            className={cn(
                                                "px-4 py-2 rounded-full text-[10px] font-bold uppercase transition-all",
                                                lumineTrack === 'biblico' ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-100"
                                            )}
                                        >
                                            Trilho Bíblico
                                        </button>
                                        <button 
                                            onClick={() => setLumineTrack('teologico')}
                                            className={cn(
                                                "px-4 py-2 rounded-full text-[10px] font-bold uppercase transition-all",
                                                lumineTrack === 'teologico' ? "bg-purple-600 text-white" : "bg-white text-slate-600 hover:bg-slate-100"
                                            )}
                                        >
                                            Trilho Teológico
                                        </button>
                                        <button 
                                            onClick={() => setLumineTrack('discipulado')}
                                            className={cn(
                                                "px-4 py-2 rounded-full text-[10px] font-bold uppercase transition-all",
                                                lumineTrack === 'discipulado' ? "bg-rose-600 text-white" : "bg-white text-slate-600 hover:bg-slate-100"
                                            )}
                                        >
                                            Trilho de Discipulado
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {filteredCourses.map(course => {
                                    const courseClasses = classes.filter(c => c.courseId === course.id);
                                    const isSelected = selectedCourseId === course.id;

                                    return (
                                        <Card 
                                            key={course.id} 
                                            className={cn(
                                                "group relative overflow-hidden rounded-[2.5rem] border-4 transition-all duration-500 cursor-pointer hover:shadow-2xl",
                                                isSelected ? "border-primary bg-primary/5 ring-4 ring-primary/10" : "border-white bg-white"
                                            )}
                                            onClick={() => {
                                                setSelectedCourseId(course.id);
                                                setSelectedClassId(null);
                                            }}
                                        >
                                            <div className="relative aspect-[16/9] overflow-hidden">
                                                <img 
                                                    src={`https://picsum.photos/seed/${course.id}/800/450`} 
                                                    alt={course.name} 
                                                    className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-110" 
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
                                                <div className="absolute bottom-6 left-8 z-20">
                                                    <Badge className="bg-primary/20 backdrop-blur-md text-white border-none mb-2 text-[10px] font-black uppercase px-3">{course.ministryName}</Badge>
                                                    <h4 className="text-white text-2xl font-black uppercase italic tracking-tighter leading-none">{course.name}</h4>
                                                </div>
                                                {isSelected && (
                                                    <div className="absolute top-4 right-4 z-20 bg-primary text-white size-10 rounded-full flex items-center justify-center shadow-2xl animate-in zoom-in-50">
                                                        <Check size={20} strokeWidth={4} />
                                                    </div>
                                                )}
                                            </div>
                                            <CardContent className="p-8 space-y-6">
                                                <p className="text-slate-600 text-sm leading-relaxed line-clamp-3 font-medium">
                                                    {course.description || 'Descrição indisponível.'}
                                                </p>

                                                {isSelected && (
                                                    <div className="space-y-4 animate-in slide-in-from-top-2">
                                                        <Label className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
                                                            <Clock className="size-3" /> Selecione a Turma
                                                        </Label>
                                                        {courseClasses.length > 0 ? (
                                                            <div className="grid gap-2">
                                                                {courseClasses.map(cls => (
                                                                    <button 
                                                                        key={cls.id}
                                                                        onClick={(e) => { e.stopPropagation(); setSelectedClassId(cls.id); }}
                                                                        className={cn(
                                                                            "w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between group/btn",
                                                                            selectedClassId === cls.id ? "border-primary bg-primary text-white" : "border-slate-100 hover:border-primary/30 bg-slate-50"
                                                                        )}
                                                                    >
                                                                        <div className="min-w-0">
                                                                            <p className="font-bold text-sm truncate uppercase tracking-tight">{cls.name}</p>
                                                                            <p className={cn("text-[10px] font-medium mt-0.5", selectedClassId === cls.id ? "text-white/70" : "text-muted-foreground")}>
                                                                                {cls.dayOfWeek} às {cls.startTime}
                                                                            </p>
                                                                        </div>
                                                                        {selectedClassId === cls.id && <CheckCircle size={16} />}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="p-4 bg-amber-50 text-amber-700 text-xs font-bold rounded-2xl border border-amber-100 italic">
                                                                Não há turmas abertas para este curso no momento.
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {selectedTab === 'eventos' && (
                        <div className="py-20 text-center space-y-4 bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-200 animate-pulse">
                            <CalendarDays className="size-16 mx-auto text-slate-300" />
                            <div>
                                <h3 className="text-xl font-bold text-slate-400 uppercase tracking-tighter italic">Nenhum Evento Aberto</h3>
                                <p className="text-sm text-slate-400">Volte em breve para conferir as próximas conferências e workshops.</p>
                            </div>
                        </div>
                    )}

                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-lg px-6 z-50">
                        <Button 
                            disabled={isSubmitting || !selectedCourseId || (selectedTab === 'ensino' && !selectedClassId)}
                            onClick={handleFinalSubmit}
                            className="w-full h-16 rounded-[2rem] font-black text-lg uppercase tracking-[0.2em] shadow-[0_20px_50px_rgba(103,80,164,0.4)] transition-all hover:scale-105 active:scale-95"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2" />}
                            Finalizar Inscrição
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

const Send = ({ className, size = 20 }: { className?: string; size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
);

export default function EnrollmentPage() {
    return (
        <main className="min-h-screen bg-[#F8F9FA] py-12 md:py-20 px-4">
            <VolunteeringProvider>
                <EnrollmentForm />
            </VolunteeringProvider>
        </main>
    );
}
