
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { useVolunteering } from '@/contexts/volunteering-context';
import { VolunteeringProvider } from '@/contexts/volunteering-context';
import { 
    Loader2, Send, CheckCircle, Mail, User, Phone, 
    ArrowRight, BookOpen, Clock, Search, GraduationCap, 
    School, HandHelping, Lightbulb, CheckCircle2, Layers,
    ChevronRight, Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons';
import { verifyMemberEmail, submitEnrollmentRequest } from './actions';
import { cn } from '@/lib/utils';

function EnrollmentForm() {
    const { courses, classes } = useVolunteering();
    const { toast } = useToast();
    
    // States
    const [step, setStep] = useState<'email' | 'identify' | 'catalog' | 'confirm'>('email');
    const [email, setEmail] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [memberInfo, setMemberInfo] = useState<{ userId: string; maskedName: string; maskedPhone: string } | null>(null);
    
    const [selectedCourse, setSelectedCourse] = useState<any>(null);
    const [selectedClassId, setSelectedClassId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    // Filters
    const [selectedTab, setSelectedTab] = useState('ensino');
    const [teachingSubTab, setTeachingSubTab] = useState('lumine');
    const [lumineTrack, setLumineTrack] = useState<'all' | 'biblico' | 'teologico' | 'discipulado'>('all');
    const [searchTerm, setSearchTerm] = useState('');

    // New User Data (if not identified)
    const [newUserData, setNewUserData] = useState({ name: '', phone: '' });

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;
        setIsVerifying(true);
        
        const result = await verifyMemberEmail(email.toLowerCase().trim());
        
        if (result.exists) {
            setMemberInfo({
                userId: result.userId!,
                maskedName: result.maskedName!,
                maskedPhone: result.maskedPhone!
            });
            setStep('identify');
        } else {
            setMemberInfo(null);
            setStep('catalog');
        }
        setIsVerifying(false);
    };

    const handleConfirmIdentity = (isMe: boolean) => {
        if (isMe) {
            setStep('catalog');
        } else {
            setMemberInfo(null);
            setStep('catalog');
        }
    };

    const filteredCourses = useMemo(() => {
        return courses.filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 c.description.toLowerCase().includes(searchTerm.toLowerCase());
            
            if (teachingSubTab === 'lumine') {
                const isLumine = c.ministryName.toLowerCase().includes('lumine') || c.ministryName.toLowerCase().includes('ebd');
                const matchesTrack = lumineTrack === 'all' || c.ebdTrack === lumineTrack;
                return isLumine && matchesTrack && matchesSearch;
            }
            
            if (teachingSubTab === 'escolas') {
                const isSchool = c.ministryName.toLowerCase().includes('wave') || c.ministryName.toLowerCase().includes('dis');
                return isSchool && matchesSearch;
            }

            if (teachingSubTab === 'ministerios') {
                const isOther = !c.ministryName.toLowerCase().includes('lumine') && 
                                !c.ministryName.toLowerCase().includes('ebd') && 
                                !c.ministryName.toLowerCase().includes('wave') && 
                                !c.ministryName.toLowerCase().includes('dis');
                return isOther && matchesSearch;
            }

            return matchesSearch;
        });
    }, [courses, teachingSubTab, lumineTrack, searchTerm]);

    const courseClasses = useMemo(() => {
        if (!selectedCourse) return [];
        return classes.filter(cls => cls.courseId === selectedCourse.id);
    }, [classes, selectedCourse]);

    const handleSubmit = async () => {
        if (!selectedCourse) return;
        
        const isModular = selectedCourse.name.toLowerCase().includes('membro') || 
                          selectedCourse.name.toLowerCase().includes('pertencer');
        
        if (!isModular && !selectedClassId) {
            toast({ variant: 'destructive', title: "Selecione uma turma para continuar." });
            return;
        }

        setIsSubmitting(true);
        
        const result = await submitEnrollmentRequest({
            courseId: selectedCourse.id,
            classId: selectedClassId,
            userId: memberInfo?.userId,
            name: newUserData.name,
            email: email,
            phone: newUserData.phone
        });

        if (result.success) {
            setSuccess(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            toast({ variant: 'destructive', title: "Erro ao enviar", description: "Tente novamente em instantes." });
        }
        setIsSubmitting(false);
    };

    if (success) {
        return (
            <div className="max-w-md mx-auto py-20 animate-in zoom-in-95 duration-500">
                <Card className="text-center p-8 border-none shadow-2xl rounded-[3rem]">
                    <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <CheckCircle size={40} />
                    </div>
                    <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 mb-4">Protocolo Gerado!</h2>
                    <p className="text-muted-foreground mb-8 font-medium">
                        Sua solicitação de inscrição foi recebida. A secretaria da escola entrará em contato para confirmar sua vaga.
                    </p>
                    <Button onClick={() => window.location.reload()} variant="outline" className="w-full h-12 rounded-2xl font-bold uppercase tracking-widest">Nova Inscrição</Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
            {/* Header */}
            <div className="text-center space-y-4">
                <Logo className="size-12 text-primary mx-auto mb-4" />
                <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">Portal de Inscrições</h1>
                <p className="text-muted-foreground text-sm md:text-lg font-medium">Selecione sua trilha de crescimento e avance em sua jornada.</p>
            </div>

            <Card className="shadow-2xl border-none overflow-hidden rounded-[2.5rem]">
                {step === 'email' && (
                    <div className="p-8 md:p-12 space-y-8 animate-in fade-in slide-in-from-top-4">
                        <div className="space-y-2 text-center">
                            <h3 className="text-xl font-bold">Para começar, qual o seu e-mail?</h3>
                            <p className="text-sm text-muted-foreground">Usamos seu e-mail para identificar seu cadastro no sistema.</p>
                        </div>
                        <form onSubmit={handleVerify} className="max-w-md mx-auto space-y-6">
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
                                <Input 
                                    required 
                                    type="email" 
                                    placeholder="seu@email.com" 
                                    className="h-14 pl-12 rounded-2xl text-lg font-medium border-2 focus-visible:ring-primary/20"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                />
                            </div>
                            <Button 
                                type="submit" 
                                disabled={isVerifying}
                                className="w-full h-14 rounded-2xl font-black text-base uppercase tracking-widest shadow-xl"
                            >
                                {isVerifying ? <Loader2 className="animate-spin mr-2" /> : <ArrowRight className="mr-2" />}
                                Continuar
                            </Button>
                        </form>
                    </div>
                )}

                {step === 'identify' && memberInfo && (
                    <div className="p-8 md:p-12 space-y-8 text-center animate-in zoom-in-95">
                        <div className="size-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                            <User size={40} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-slate-900">Reconhecemos você!</h3>
                            <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-dashed border-primary/20 inline-block min-w-[300px]">
                                <p className="text-xl font-black text-primary tracking-tight">{memberInfo.maskedName}</p>
                                <p className="text-sm text-muted-foreground font-bold">{memberInfo.maskedPhone}</p>
                            </div>
                            <p className="text-sm text-muted-foreground mt-4">Este é o seu cadastro?</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-sm mx-auto">
                            <Button onClick={() => handleConfirmIdentity(true)} className="h-14 rounded-2xl flex-1 font-black uppercase text-sm">Sim, sou eu</Button>
                            <Button onClick={() => handleConfirmIdentity(false)} variant="outline" className="h-14 rounded-2xl flex-1 font-black uppercase text-sm border-2">Não sou eu</Button>
                        </div>
                    </div>
                )}

                {(step === 'catalog' || step === 'confirm') && (
                    <div className="animate-in fade-in duration-500">
                        {/* Seção de Catálogo */}
                        {!selectedCourse ? (
                            <div className="space-y-0">
                                <div className="bg-slate-900 p-8 md:p-12 text-white">
                                    <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
                                        <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto h-14 bg-white/10 rounded-2xl p-1 mb-8">
                                            <TabsTrigger value="ensino" className="rounded-xl font-black uppercase text-xs data-[state=active]:bg-white data-[state=active]:text-slate-900">Ensino</TabsTrigger>
                                            <TabsTrigger value="eventos" className="rounded-xl font-black uppercase text-xs data-[state=active]:bg-white data-[state=active]:text-slate-900">Eventos</TabsTrigger>
                                        </TabsList>

                                        {selectedTab === 'ensino' && (
                                            <div className="space-y-8">
                                                <div className="flex flex-wrap items-center justify-center gap-2">
                                                    <Button 
                                                        variant={teachingSubTab === 'lumine' ? 'default' : 'outline'} 
                                                        onClick={() => setTeachingSubTab('lumine')}
                                                        className={cn("h-11 px-6 rounded-full font-black uppercase italic tracking-tighter text-xs", teachingSubTab === 'lumine' ? "bg-white text-slate-900" : "bg-transparent border-white/20 hover:bg-white/10")}
                                                    >
                                                        Lumine
                                                    </Button>
                                                    <Button 
                                                        variant={teachingSubTab === 'escolas' ? 'default' : 'outline'} 
                                                        onClick={() => setTeachingSubTab('escolas')}
                                                        className={cn("h-11 px-6 rounded-full font-black uppercase italic tracking-tighter text-xs", teachingSubTab === 'escolas' ? "bg-white text-slate-900" : "bg-transparent border-white/20 hover:bg-white/10")}
                                                    >
                                                        Escolas (Wave/DIS)
                                                    </Button>
                                                    <Button 
                                                        variant={teachingSubTab === 'ministerios' ? 'default' : 'outline'} 
                                                        onClick={() => setTeachingSubTab('ministerios')}
                                                        className={cn("h-11 px-6 rounded-full font-black uppercase italic tracking-tighter text-xs", teachingSubTab === 'ministerios' ? "bg-white text-slate-900" : "bg-transparent border-white/20 hover:bg-white/10")}
                                                    >
                                                        Ministérios
                                                    </Button>
                                                </div>

                                                <div className="max-w-2xl mx-auto space-y-6">
                                                    <div className="relative group">
                                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400 group-focus-within:text-white transition-colors" />
                                                        <Input 
                                                            placeholder="Pesquisar curso ou assunto..." 
                                                            className="h-14 pl-12 bg-white/5 border-white/10 rounded-2xl focus:border-white/30 text-lg"
                                                            value={searchTerm}
                                                            onChange={e => setSearchTerm(e.target.value)}
                                                        />
                                                    </div>

                                                    {teachingSubTab === 'lumine' && (
                                                        <div className="flex justify-center gap-2">
                                                            {[
                                                                { id: 'all', label: 'Todos' },
                                                                { id: 'biblico', label: 'Bíblico' },
                                                                { id: 'teologico', label: 'Teológico' },
                                                                { id: 'discipulado', label: 'Discipulado' }
                                                            ].map(track => (
                                                                <button 
                                                                    key={track.id}
                                                                    onClick={() => setLumineTrack(track.id as any)}
                                                                    className={cn(
                                                                        "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                                                                        lumineTrack === track.id ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105" : "bg-white/5 text-white/40 hover:text-white"
                                                                    )}
                                                                >
                                                                    {track.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </Tabs>
                                </div>

                                <div className="p-8 md:p-12 bg-white">
                                    {selectedTab === 'ensino' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {filteredCourses.length > 0 ? (
                                                filteredCourses.map(course => (
                                                    <button 
                                                        key={course.id} 
                                                        onClick={() => setSelectedCourse(course)}
                                                        className="text-left group"
                                                    >
                                                        <Card className="h-full border-2 border-slate-100 group-hover:border-primary group-hover:shadow-xl transition-all rounded-[2rem] overflow-hidden">
                                                            <div className="relative aspect-[21/9] bg-slate-100 overflow-hidden">
                                                                <div className="absolute inset-0 bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-700">
                                                                    <BookOpen className="size-12 text-primary/20" />
                                                                </div>
                                                                <div className="absolute top-4 left-4">
                                                                    <Badge className="bg-white/90 backdrop-blur-md text-primary font-black uppercase text-[9px] border-none">{course.ministryName}</Badge>
                                                                </div>
                                                            </div>
                                                            <CardContent className="p-6">
                                                                <h4 className="text-xl font-black uppercase italic tracking-tighter mb-2 group-hover:text-primary transition-colors">{course.name}</h4>
                                                                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{course.description}</p>
                                                                <div className="mt-4 flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest">
                                                                    Ver detalhes <ChevronRight className="size-3 group-hover:translate-x-1 transition-transform" />
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="col-span-full py-20 text-center space-y-4">
                                                    <div className="size-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                                                        <Search className="size-8 text-slate-200" />
                                                    </div>
                                                    <p className="text-muted-foreground font-medium italic">Nenhum curso encontrado para esta busca.</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {selectedTab === 'eventos' && (
                                        <div className="py-20 text-center space-y-4 bg-slate-50 rounded-[2rem] border-2 border-dashed">
                                            <div className="size-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm">
                                                <Filter className="size-8 text-slate-200" />
                                            </div>
                                            <p className="text-muted-foreground font-medium italic uppercase tracking-widest text-xs">Nenhum evento com inscrições abertas no momento.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            /* Detalhes do Curso Selecionado */
                            <div className="animate-in slide-in-from-right-4 duration-500">
                                <div className="p-8 md:p-12 space-y-10">
                                    <Button variant="ghost" onClick={() => { setSelectedCourse(null); setSelectedClassId(''); }} className="h-10 rounded-xl hover:bg-slate-50 -ml-4">
                                        <ArrowRight className="size-4 mr-2 rotate-180" /> Voltar ao Catálogo
                                    </Button>

                                    <div className="flex flex-col md:flex-row gap-10">
                                        <div className="flex-1 space-y-6">
                                            <div className="space-y-2">
                                                <Badge className="bg-primary/10 text-primary border-none font-black uppercase tracking-widest text-[10px]">{selectedCourse.ministryName}</Badge>
                                                <h2 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">{selectedCourse.name}</h2>
                                            </div>
                                            <div className="bg-slate-50 p-6 rounded-[2rem] text-sm leading-relaxed text-slate-600 border-2 border-white shadow-inner">
                                                {selectedCourse.description}
                                            </div>
                                        </div>

                                        <div className="w-full md:w-80 space-y-6">
                                            {!memberInfo && (
                                                <div className="space-y-4 p-6 bg-slate-900 text-white rounded-[2rem] shadow-xl">
                                                    <h4 className="text-xs font-black uppercase tracking-widest text-primary">Seus Dados</h4>
                                                    <div className="space-y-4">
                                                        <div className="space-y-1.5">
                                                            <Label className="text-[9px] font-black uppercase opacity-50">Nome Completo</Label>
                                                            <Input className="bg-white/5 border-white/10 h-11 rounded-xl" value={newUserData.name} onChange={e => setNewUserData(p => ({...p, name: e.target.value}))} />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <Label className="text-[9px] font-black uppercase opacity-50">Telefone/WhatsApp</Label>
                                                            <Input className="bg-white/5 border-white/10 h-11 rounded-xl" placeholder="(21) 9..." value={newUserData.phone} onChange={e => setNewUserData(p => ({...p, phone: e.target.value}))} />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="space-y-4 p-6 bg-white border-2 border-slate-100 rounded-[2rem] shadow-lg">
                                                <Label className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
                                                    <Clock className="size-3" /> Selecione a Turma
                                                </Label>
                                                
                                                {selectedCourse.name.toLowerCase().includes('membro') || selectedCourse.name.toLowerCase().includes('pertencer') ? (
                                                    <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100 flex items-start gap-3">
                                                        <CheckCircle2 className="size-5 shrink-0 mt-0.5" />
                                                        <p className="text-xs font-bold leading-tight uppercase tracking-tight">Matrícula automática em todo o ciclo dominical (09h00).</p>
                                                    </div>
                                                ) : (
                                                    <div className="grid gap-2">
                                                        {courseClasses.length > 0 ? (
                                                            courseClasses.map(cls => (
                                                                <button 
                                                                    key={cls.id}
                                                                    onClick={() => setSelectedClassId(cls.id)}
                                                                    className={cn(
                                                                        "w-full p-4 text-left rounded-2xl border-2 transition-all group",
                                                                        selectedClassId === cls.id ? "bg-primary border-primary text-white shadow-lg" : "bg-white border-slate-100 hover:border-primary/30"
                                                                    )}
                                                                >
                                                                    <p className="text-xs font-black uppercase tracking-tighter">{cls.name}</p>
                                                                    <div className={cn("flex items-center gap-2 text-[10px] font-bold mt-1 uppercase", selectedClassId === cls.id ? "text-white/70" : "text-muted-foreground")}>
                                                                        <CalendarDays className="size-3" /> {cls.dayOfWeek} às {cls.startTime}
                                                                    </div>
                                                                </button>
                                                            ))
                                                        ) : (
                                                            <div className="p-4 text-center border-2 border-dashed rounded-2xl text-xs text-muted-foreground font-bold uppercase italic">
                                                                Sem turmas abertas
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                <Button 
                                                    onClick={handleSubmit} 
                                                    disabled={isSubmitting || (!selectedClassId && !selectedCourse.name.toLowerCase().includes('membro') && !selectedCourse.name.toLowerCase().includes('pertencer'))}
                                                    className="w-full h-14 rounded-2xl font-black text-sm uppercase tracking-widest mt-4 shadow-xl"
                                                >
                                                    {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2" />}
                                                    Finalizar Protocolo
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Card>
        </div>
    );
}

export default function EnrollmentPage() {
    return (
        <VolunteeringProvider>
            <main className="min-h-screen bg-[#F8F9FA] py-12 md:py-20 px-4 font-body">
                <EnrollmentForm />
            </main>
        </VolunteeringProvider>
    );
}
