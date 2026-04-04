'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { useVolunteering, VolunteeringProvider, type Course, type Class } from '@/contexts/volunteering-context';
import { collection, Timestamp, addDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
    Loader2, CheckCircle, ArrowRight, UserCheck, 
    Mail, Phone, User, BookOpen, CalendarDays, ChevronRight, 
    Sparkles, Waves, Lightbulb, HandHelping, GraduationCap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons';
import Image from 'next/image';
import { verifyMemberEmail, type VerifiedMember } from './actions';
import { cn } from '@/lib/utils';

function EnrollmentForm() {
    const { firestore } = useFirebase();
    const { courses, classes } = useVolunteering();
    const { toast } = useToast();

    const [step, setStep] = useState<'email' | 'confirm' | 'catalog' | 'success'>('email');
    const [isVerifying, setIsVerifying] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // User data
    const [email, setEmail] = useState('');
    const [memberInfo, setMemberInfo] = useState<VerifiedMember | null>(null);
    const [newName, setNewName] = useState('');
    const [newPhone, setNewPhone] = useState('');

    // Selection
    const [selectedTab, setSelectedTab] = useState<'ensino' | 'eventos'>('ensino');
    const [teachingFilter, setTeachingFilter] = useState<'all' | 'lumine' | 'escolas' | 'ministérios'>('all');
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [selectedClassId, setSelectedClassId] = useState<string>('');

    const handleVerifyEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !email.includes('@')) return;

        setIsVerifying(true);
        try {
            const result = await verifyMemberEmail(email);
            if (result && result.isExisting) {
                setMemberInfo(result);
                setStep('confirm');
            } else {
                setMemberInfo(null);
                setStep('catalog');
            }
        } catch (error) {
            toast({ variant: 'destructive', title: "Erro de Conexão", description: "Não foi possível validar seu e-mail agora." });
        } finally {
            setIsVerifying(false);
        }
    };

    const handleConfirmIdentity = (isMe: boolean) => {
        if (isMe) {
            setStep('catalog');
        } else {
            // Se não é a pessoa, volta para o e-mail para corrigir
            setStep('email');
            setEmail('');
            setMemberInfo(null);
        }
    };

    const filteredCourses = useMemo(() => {
        if (selectedTab === 'eventos') return [];
        
        let list = courses;
        if (teachingFilter === 'lumine') {
            list = courses.filter(c => c.ministryName?.toLowerCase().includes('lumine') || c.ministryName?.toLowerCase().includes('ebd'));
        } else if (teachingFilter === 'escolas') {
            list = courses.filter(c => c.ministryName?.toLowerCase().includes('wave') || c.ministryName?.toLowerCase() === 'dis');
        } else if (teachingFilter === 'ministérios') {
            list = courses.filter(c => !c.ministryName?.toLowerCase().includes('lumine') && !c.ministryName?.toLowerCase().includes('ebd') && !c.ministryName?.toLowerCase().includes('wave') && c.ministryName?.toLowerCase() !== 'dis');
        }
        return list;
    }, [courses, selectedTab, teachingFilter]);

    const availableClasses = useMemo(() => {
        if (!selectedCourse) return [];
        return classes.filter(c => c.courseId === selectedCourse.id);
    }, [selectedCourse, classes]);

    const handleFinalSubmit = async () => {
        if (!firestore) return;
        setIsSaving(true);

        try {
            await addDoc(collection(firestore, 'enrollment_requests'), {
                name: memberInfo?.isExisting ? 'Membro Identificado' : newName,
                email: email.toLowerCase().trim(),
                phone: memberInfo?.isExisting ? 'Mantido' : newPhone,
                courseId: selectedCourse?.id,
                classId: selectedClassId,
                status: 'pending',
                createdAt: Timestamp.now(),
                isExistingMember: !!memberInfo?.isExisting,
                memberId: memberInfo?.id || null
            });
            setStep('success');
        } catch (error) {
            toast({ variant: 'destructive', title: "Erro ao protocolar", description: "Tente novamente em instantes." });
        } finally {
            setIsSaving(false);
        }
    };

    if (step === 'success') {
        return (
            <div className="max-w-md mx-auto py-20 text-center animate-in zoom-in-95 duration-500">
                <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                    <CheckCircle size={40} />
                </div>
                <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 mb-4">Protocolo Realizado!</h2>
                <p className="text-muted-foreground mb-8">
                    Sua solicitação de inscrição foi enviada com sucesso. Em breve a coordenação entrará em contato.
                </p>
                <Button onClick={() => window.location.reload()} variant="outline" className="w-full font-bold h-12">Fazer Outra Inscrição</Button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-4">
                <Logo className="size-12 text-primary mx-auto mb-4" />
                <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">Portal de Inscrições</h1>
                <p className="text-muted-foreground text-sm md:text-lg font-medium">IBM • Onde a Organização serve ao Organismo.</p>
            </div>

            <Card className="shadow-2xl border-none overflow-hidden rounded-[2.5rem] bg-white">
                <CardContent className="p-0">
                    {/* Progress Header */}
                    <div className="bg-slate-900 p-8 text-white flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="size-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary border border-primary/30">
                                {step === 'email' || step === 'confirm' ? <User size={24} /> : <BookOpen size={24} />}
                            </div>
                            <div>
                                <h3 className="font-black uppercase italic tracking-wider leading-none">
                                    {step === 'email' || step === 'confirm' ? 'Identificação' : 'Seleção de Curso'}
                                </h3>
                                <p className="text-[10px] text-slate-400 uppercase font-bold mt-1 tracking-widest">Passo {step === 'email' || step === 'confirm' ? '1' : '2'} de 2</p>
                            </div>
                        </div>
                        {memberInfo?.isExisting && step !== 'confirm' && (
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 px-3 py-1">
                                <UserCheck className="size-3 mr-1" /> Olá, {memberInfo.name.split(' ')[0]}
                            </Badge>
                        )}
                    </div>

                    <div className="p-8 md:p-12">
                        {step === 'email' && (
                            <form onSubmit={handleVerifyEmail} className="max-w-md mx-auto space-y-6 animate-in fade-in slide-in-from-top-4">
                                <div className="text-center space-y-2 mb-8">
                                    <h4 className="text-xl font-bold text-slate-800">Para começar, qual seu e-mail?</h4>
                                    <p className="text-sm text-muted-foreground">Usamos seu e-mail para localizar seu cadastro e histórico ministerial.</p>
                                </div>
                                <div className="space-y-4">
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
                                        <Input 
                                            required 
                                            type="email" 
                                            placeholder="seu@email.com" 
                                            className="h-14 pl-12 rounded-2xl text-lg font-medium border-slate-200 focus:ring-primary/20"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                        />
                                    </div>
                                    <Button 
                                        type="submit" 
                                        disabled={isVerifying || !email.includes('@')}
                                        className="w-full h-14 rounded-2xl font-black text-base uppercase tracking-widest shadow-xl"
                                    >
                                        {isVerifying ? <Loader2 className="animate-spin mr-2" /> : <ArrowRight className="mr-2" />}
                                        Continuar
                                    </Button>
                                </div>
                            </form>
                        )}

                        {step === 'confirm' && memberInfo && (
                            <div className="max-w-md mx-auto space-y-8 text-center animate-in zoom-in-95">
                                <div className="space-y-4">
                                    <div className="size-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto border-2 border-primary/20">
                                        <UserCheck size={40} />
                                    </div>
                                    <h4 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Reconhecemos você!</h4>
                                    <div className="p-6 bg-slate-50 rounded-3xl border-2 border-dashed space-y-3">
                                        <div>
                                            <p className="text-[10px] uppercase font-black text-muted-foreground">Nome</p>
                                            <p className="text-lg font-bold text-slate-800">{memberInfo.name}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase font-black text-muted-foreground">Telefone</p>
                                            <p className="text-lg font-bold text-slate-800">{memberInfo.phone}</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-muted-foreground font-medium italic">Estes dados são seus?</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Button variant="outline" className="h-12 rounded-xl font-bold" onClick={() => handleConfirmIdentity(false)}>Não sou eu</Button>
                                    <Button className="h-12 rounded-xl font-black uppercase tracking-widest shadow-lg" onClick={() => handleConfirmIdentity(true)}>Sim, sou eu</Button>
                                </div>
                            </div>
                        )}

                        {step === 'catalog' && (
                            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
                                {/* NOVO CADASTRO FIELDS */}
                                {!memberInfo?.isExisting && (
                                    <div className="p-6 bg-amber-50 border-2 border-amber-200 rounded-[2rem] space-y-6">
                                        <div className="flex items-center gap-3">
                                            <Sparkles className="text-amber-600 size-5" />
                                            <h4 className="font-black text-amber-900 uppercase tracking-tight">Novo por aqui? Seja bem-vindo!</h4>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] uppercase font-black ml-1 text-amber-800">Seu Nome Completo</Label>
                                                <Input value={newName} onChange={e => setNewName(e.target.value)} className="bg-white border-amber-200 h-11" placeholder="Como quer ser chamado?" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] uppercase font-black ml-1 text-amber-800">Seu WhatsApp</Label>
                                                <Input value={newPhone} onChange={e => setNewPhone(e.target.value)} className="bg-white border-amber-200 h-11" placeholder="(21) 9..." />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* TABS DE SELEÇÃO */}
                                <div className="space-y-6">
                                    <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full sm:w-fit mx-auto border shadow-inner">
                                        <button 
                                            onClick={() => setSelectedTab('ensino')}
                                            className={cn("flex-1 sm:flex-none px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all", selectedTab === 'ensino' ? "bg-white shadow-xl text-primary scale-105" : "text-slate-500 hover:text-slate-700")}
                                        >
                                            <GraduationCap className="size-4 inline mr-2" /> Ensino
                                        </button>
                                        <button 
                                            onClick={() => setSelectedTab('eventos')}
                                            className={cn("flex-1 sm:flex-none px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all", selectedTab === 'eventos' ? "bg-white shadow-xl text-primary scale-105" : "text-slate-500 hover:text-slate-700")}
                                        >
                                            <CalendarDays className="size-4 inline mr-2" /> Eventos
                                        </button>
                                    </div>

                                    {selectedTab === 'ensino' && (
                                        <div className="space-y-8">
                                            {/* Filtros de Ensino */}
                                            <div className="flex flex-wrap justify-center gap-3">
                                                {[
                                                    { id: 'all', label: 'Tudo', icon: BookOpen },
                                                    { id: 'lumine', label: 'Lumine (EBD)', icon: Lightbulb },
                                                    { id: 'escolas', label: 'Escolas (Wave/DIS)', icon: Waves },
                                                    { id: 'ministérios', label: 'Ministérios', icon: HandHelping }
                                                ].map(f => (
                                                    <button 
                                                        key={f.id}
                                                        onClick={() => { setTeachingFilter(f.id as any); setSelectedCourse(null); }}
                                                        className={cn(
                                                            "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border-2 transition-all flex items-center gap-2",
                                                            teachingFilter === f.id ? "bg-primary border-primary text-white shadow-lg" : "bg-white border-slate-200 text-slate-500 hover:border-primary/30"
                                                        )}
                                                    >
                                                        <f.icon size={12} /> {f.label}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Grid de Cursos */}
                                            {!selectedCourse ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    {filteredCourses.map(course => (
                                                        <Card 
                                                            key={course.id} 
                                                            className="group cursor-pointer hover:shadow-2xl transition-all duration-500 border-none overflow-hidden relative aspect-[4/3] rounded-[2rem]"
                                                            onClick={() => setSelectedCourse(course)}
                                                        >
                                                            <Image src={`https://picsum.photos/seed/${course.id}/600/400`} alt={course.name} fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
                                                            <div className="absolute bottom-6 left-6 right-6 z-20">
                                                                <Badge className="bg-primary/30 backdrop-blur-md text-white border-none mb-2 text-[9px] font-black uppercase tracking-widest">{course.ministryName}</Badge>
                                                                <h4 className="text-white text-xl font-black uppercase italic tracking-tighter leading-none">{course.name}</h4>
                                                                <div className="mt-4 flex items-center gap-2 text-white/60 text-[10px] font-bold uppercase opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                                                                    Ver detalhes <ChevronRight size={12} />
                                                                </div>
                                                            </div>
                                                        </Card>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="space-y-6 animate-in slide-in-from-left-4">
                                                    <Button variant="ghost" className="text-xs font-black uppercase tracking-widest h-8 px-0 hover:bg-transparent text-primary" onClick={() => { setSelectedCourse(null); setSelectedClassId(''); }}>
                                                        <ArrowRight className="size-3 mr-2 rotate-180" /> Voltar ao Catálogo
                                                    </Button>
                                                    
                                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                                        <div className="space-y-4">
                                                            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">{selectedCourse.name}</h2>
                                                            <p className="text-slate-600 leading-relaxed font-medium">{selectedCourse.description}</p>
                                                            <div className="flex gap-2">
                                                                <Badge variant="secondary" className="font-bold">{selectedCourse.ministryName}</Badge>
                                                                <Badge variant="outline" className="font-bold">{selectedCourse.type === 'trilho' ? 'TRILHO' : 'ELETIVO'}</Badge>
                                                            </div>
                                                        </div>

                                                        <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-dashed space-y-6">
                                                            <h4 className="font-black text-xs uppercase tracking-widest text-slate-500">Escolha sua Turma / Horário</h4>
                                                            {availableClasses.length === 0 ? (
                                                                <div className="py-10 text-center space-y-3">
                                                                    <Loader2 className="size-8 mx-auto text-slate-300 animate-spin" />
                                                                    <p className="text-xs font-bold text-slate-400 uppercase">Aguardando definição de turmas...</p>
                                                                </div>
                                                            ) : (
                                                                <RadioGroup value={selectedClassId} onValueChange={setSelectedClassId} className="space-y-3">
                                                                    {availableClasses.map(cls => (
                                                                        <Label 
                                                                            key={cls.id} 
                                                                            htmlFor={cls.id}
                                                                            className={cn(
                                                                                "flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all bg-white",
                                                                                selectedClassId === cls.id ? "border-primary ring-4 ring-primary/10" : "border-transparent hover:border-slate-200"
                                                                            )}
                                                                        >
                                                                            <div className="flex items-center gap-3">
                                                                                <RadioGroupItem value={cls.id} id={cls.id} />
                                                                                <div>
                                                                                    <p className="font-bold text-slate-900">{cls.name}</p>
                                                                                    <p className="text-[10px] text-muted-foreground font-bold uppercase">{cls.dayOfWeek} às {cls.startTime}</p>
                                                                                </div>
                                                                            </div>
                                                                            <Badge variant="outline" className="text-[9px] font-black">Vagas Disponíveis</Badge>
                                                                        </Label>
                                                                    ))}
                                                                </RadioGroup>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <Button 
                                                        className="w-full h-16 rounded-[2rem] font-black text-lg uppercase tracking-[0.2em] shadow-2xl" 
                                                        disabled={isSaving || !selectedClassId}
                                                        onClick={handleFinalSubmit}
                                                    >
                                                        {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="size-5 mr-2" />}
                                                        Confirmar Inscrição
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {selectedTab === 'eventos' && (
                                        <div className="py-20 text-center space-y-4 bg-slate-50 rounded-[2.5rem] border-2 border-dashed">
                                            <CalendarDays className="size-16 mx-auto text-slate-300" />
                                            <div>
                                                <h4 className="text-xl font-bold text-slate-800">Nenhum evento com inscrições abertas</h4>
                                                <p className="text-sm text-muted-foreground mt-1">Fique atento aos nossos avisos durante as celebrações.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
                <CardFooter className="bg-muted/30 border-t p-6 flex flex-col gap-2">
                    <p className="text-[10px] text-center text-muted-foreground uppercase font-black tracking-widest">Igreja Batista da Manhã • Ano da Visão</p>
                </CardFooter>
            </Card>
        </div>
    );
}

export default function EnrollmentPage() {
    return (
        <VolunteeringProvider>
            <main className="min-h-screen bg-[#F8F9FA] py-12 md:py-20 px-4">
                <EnrollmentForm />
            </main>
        </VolunteeringProvider>
    );
}
