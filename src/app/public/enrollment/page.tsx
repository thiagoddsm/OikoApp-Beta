'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useFirebase, useVolunteering } from '@/firebase';
import { VolunteeringProvider } from '@/contexts/volunteering-context';
import { collection, Timestamp, addDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    Loader2, CheckCircle, Mail, Phone, User, GraduationCap, 
    Layout, BookOpen, Music, Users, Waves, School, 
    HandHelping, Lightbulb, ShieldCheck, ArrowRight, CheckCircle2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { verifyMemberEmail } from './actions';

function EnrollmentForm() {
    const { firestore } = useFirebase();
    const { courses, classes } = useVolunteering();
    const { toast } = useToast();
    
    const [step, setStep] = useState<'email' | 'confirm' | 'form' | 'success'>('email');
    const [isVerifying, setIsVerifying] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    const [email, setEmail] = useState('');
    const [recognizedMember, setRecognizedMember] = useState<{ id: string; name: string; phone: string } | null>(null);
    const [selectedTab, setSelectedTab] = useState('ensino');
    const [selectedSubTab, setSelectedSubTab] = useState('lumine');

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        courseId: '',
        classId: '',
        notes: '',
    });

    const handleVerify = async () => {
        if (!email.trim()) return;
        setIsVerifying(true);
        try {
            const result = await verifyMemberEmail(email.trim());
            if (result.exists && result.member) {
                setRecognizedMember({
                    id: result.member.id,
                    name: result.member.name,
                    phone: result.member.phone
                });
                setFormData(p => ({ ...p, name: result.member!.name, phone: result.member!.phone }));
                setStep('confirm');
            } else {
                setRecognizedMember(null);
                setStep('form');
            }
        } catch (e) {
            toast({ variant: 'destructive', title: "Erro de conexão", description: "Tente novamente em instantes." });
        } finally {
            setIsVerifying(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.courseId || !firestore) {
            toast({ variant: 'destructive', title: "Selecione um curso", description: "Escolha o curso que deseja se inscrever." });
            return;
        }

        setIsSaving(true);
        try {
            await addDoc(collection(firestore, 'enrollment_requests'), {
                ...formData,
                email,
                status: 'pending',
                createdAt: Timestamp.now(),
                isExistingMember: !!recognizedMember,
                memberId: recognizedMember?.id || null
            });
            setStep('success');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (e) {
            toast({ variant: 'destructive', title: "Erro ao enviar", description: "Falha técnica. Tente novamente." });
        } finally {
            setIsSaving(false);
        }
    };

    const categories = useMemo(() => {
        const ensino = courses.filter(c => !c.name.toLowerCase().includes('evento'));
        return {
            lumine: ensino.filter(c => c.ministryName?.toLowerCase().includes('lumine') || c.ministryName?.toLowerCase().includes('ebd')),
            escolas: ensino.filter(c => c.ministryName?.toLowerCase().includes('wave') || c.ministryName?.toLowerCase().includes('dis')),
            ministerios: ensino.filter(c => !c.ministryName?.toLowerCase().includes('lumine') && !c.ministryName?.toLowerCase().includes('ebd') && !c.ministryName?.toLowerCase().includes('wave') && !c.ministryName?.toLowerCase().includes('dis')),
            eventos: courses.filter(c => c.name.toLowerCase().includes('evento') || c.category === 'eventos')
        };
    }, [courses]);

    if (step === 'success') {
        return (
            <div className="max-w-md mx-auto text-center py-20 px-4 animate-in zoom-in-95 duration-500">
                <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner mb-6">
                    <CheckCircle size={40} />
                </div>
                <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 mb-4">Protocolo Enviado!</h2>
                <p className="text-muted-foreground mb-8">Recebemos seu interesse. O responsável pelo curso entrará em contato em breve para confirmar sua vaga.</p>
                <Button onClick={() => window.location.reload()} variant="outline" className="w-full font-bold">Voltar ao Início</Button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
            <div className="text-center space-y-4">
                <Logo className="size-12 text-primary mx-auto mb-4" />
                <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">Portal de Inscrições</h1>
                <p className="text-muted-foreground text-sm md:text-lg">Escolha o seu próximo passo na trilha de crescimento IBM.</p>
            </div>

            <Card className="shadow-2xl border-none overflow-hidden rounded-[2.5rem] bg-white">
                {step === 'email' && (
                    <div className="p-8 md:p-12 space-y-8 animate-in fade-in slide-in-from-bottom-4">
                        <div className="space-y-2 text-center max-w-sm mx-auto">
                            <h3 className="text-xl font-bold text-slate-800">Seja bem-vindo!</h3>
                            <p className="text-sm text-muted-foreground">Para começar, informe seu e-mail para identificarmos seu cadastro.</p>
                        </div>
                        <div className="max-w-md mx-auto space-y-4">
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
                                <Input 
                                    type="email" 
                                    placeholder="seu@email.com" 
                                    className="h-14 pl-12 rounded-2xl bg-slate-50 border-none text-lg focus-visible:ring-primary/20"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleVerify()}
                                />
                            </div>
                            <Button 
                                onClick={handleVerify} 
                                disabled={isVerifying || !email.includes('@')}
                                className="w-full h-14 rounded-2xl font-black text-base uppercase tracking-widest shadow-xl"
                            >
                                {isVerifying ? <Loader2 className="animate-spin mr-2" /> : <ArrowRight className="mr-2" />}
                                Continuar
                            </Button>
                        </div>
                    </div>
                )}

                {step === 'confirm' && recognizedMember && (
                    <div className="p-8 md:p-12 text-center space-y-8 animate-in zoom-in-95">
                        <div className="size-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                            <User size={40} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-slate-900">Reconhecemos você!</h3>
                            <p className="text-muted-foreground mt-2">Olá, <span className="font-bold text-slate-900">{recognizedMember.name}</span>. Confirmamos seu telefone final <span className="font-bold text-slate-900">{recognizedMember.phone.slice(-4)}</span>?</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-sm mx-auto">
                            <Button onClick={() => setStep('form')} className="h-12 px-8 font-bold flex-1">Sim, sou eu</Button>
                            <Button variant="outline" onClick={() => { setRecognizedMember(null); setStep('form'); setFormData(p => ({...p, name: '', phone: ''})); }} className="h-12 px-8 font-bold flex-1">Não é meu cadastro</Button>
                        </div>
                    </div>
                )}

                {(step === 'form' || (step === 'confirm' && false)) && (
                    <form onSubmit={handleSave} className="animate-in fade-in duration-500">
                        <CardHeader className="bg-primary/5 p-8 border-b">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-white rounded-2xl shadow-sm text-primary">
                                    <GraduationCap size={24} />
                                </div>
                                <div>
                                    <CardTitle className="text-xl font-bold">Protocolo de Matrícula</CardTitle>
                                    <CardDescription>Escolha o curso e preencha as informações complementares.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8 space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-black text-muted-foreground">Nome Completo</Label>
                                    <Input required value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} disabled={!!recognizedMember} />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-black text-muted-foreground">WhatsApp</Label>
                                    <Input required value={formData.phone} onChange={e => setFormData(p => ({...p, phone: e.target.value}))} disabled={!!recognizedMember} />
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center gap-2 text-primary font-bold border-b pb-2">
                                    <Layout className="size-4" />
                                    <span>Catálogo de Oportunidades</span>
                                </div>

                                <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
                                    <TabsList className="bg-muted/50 p-1 mb-6 rounded-2xl border-2">
                                        <TabsTrigger value="ensino" className="rounded-xl px-8 font-bold uppercase text-[10px] tracking-widest">Ensino</TabsTrigger>
                                        <TabsTrigger value="eventos" className="rounded-xl px-8 font-bold uppercase text-[10px] tracking-widest">Eventos</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="ensino" className="mt-0 space-y-6 animate-in slide-in-from-left-4">
                                        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
                                            {[
                                                { id: 'lumine', label: 'Lumine (EBD)', icon: Lightbulb },
                                                { id: 'escolas', label: 'Escolas (Wave/DIS)', icon: Music },
                                                { id: 'ministerios', label: 'Ministérios', icon: HandHelping }
                                            ].map(sub => (
                                                <button 
                                                    key={sub.id}
                                                    type="button"
                                                    onClick={() => setSelectedSubTab(sub.id)}
                                                    className={cn(
                                                        "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all flex items-center gap-2",
                                                        selectedSubTab === sub.id ? "bg-white text-primary shadow-sm ring-1 ring-black/5" : "text-slate-500 hover:text-slate-900"
                                                    )}
                                                >
                                                    <sub.icon size={12} />
                                                    {sub.label}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {categories[selectedSubTab as keyof typeof categories]?.map((course: any) => {
                                                const isSelected = formData.courseId === course.id;
                                                return (
                                                    <div 
                                                        key={course.id}
                                                        onClick={() => setFormData(p => ({ ...p, courseId: course.id, classId: '' }))}
                                                        className={cn(
                                                            "group cursor-pointer p-1 rounded-[1.5rem] border-2 transition-all relative overflow-hidden",
                                                            isSelected ? "border-primary bg-primary/5 ring-4 ring-primary/10 shadow-lg" : "border-slate-100 hover:border-slate-300 bg-white"
                                                        )}
                                                    >
                                                        <div className="relative h-32 w-full rounded-[1.25rem] overflow-hidden mb-3">
                                                            <img src={course.image || `https://picsum.photos/seed/${course.id}/400/200`} alt="" className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700" />
                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                                                            <div className="absolute bottom-4 left-6 z-20">
                                                                <Badge className="bg-primary/20 backdrop-blur-md text-white border-none mb-1 text-[10px] font-black uppercase">{course.ministryName}</Badge>
                                                                <h4 className="text-white font-black uppercase italic tracking-tighter leading-none">{course.name}</h4>
                                                            </div>
                                                            {isSelected && <div className="absolute top-4 right-4 z-20 bg-primary text-white p-1.5 rounded-full shadow-lg"><CheckCircle2 size={16} /></div>}
                                                        </div>
                                                        <div className="px-4 pb-4">
                                                            <p className="text-xs text-muted-foreground line-clamp-2 italic">"{course.description || 'Nenhuma descrição.'}"</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="eventos" className="mt-0 animate-in slide-in-from-right-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {categories.eventos.length === 0 ? (
                                                <div className="col-span-2 py-20 text-center space-y-4 bg-slate-50 rounded-[2rem] border-2 border-dashed">
                                                    <Users className="size-12 text-slate-300 mx-auto" />
                                                    <p className="text-muted-foreground font-medium uppercase text-xs tracking-widest">Nenhum evento com inscrições abertas.</p>
                                                </div>
                                            ) : (
                                                categories.eventos.map((course: any) => {
                                                    const isSelected = formData.courseId === course.id;
                                                    return (
                                                        <div 
                                                            key={course.id}
                                                            onClick={() => setFormData(p => ({ ...p, courseId: course.id, classId: '' }))}
                                                            className={cn(
                                                                "group cursor-pointer p-1 rounded-[1.5rem] border-2 transition-all relative overflow-hidden",
                                                                isSelected ? "border-primary bg-primary/5 ring-4 ring-primary/10 shadow-lg" : "border-slate-100 hover:border-slate-300 bg-white"
                                                            )}
                                                        >
                                                            <div className="relative h-32 w-full rounded-[1.25rem] overflow-hidden mb-3">
                                                                <img src={course.image || `https://picsum.photos/seed/${course.id}/400/200`} alt="" className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700" />
                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                                                                <div className="absolute bottom-4 left-6 z-20 text-white">
                                                                    <h4 className="font-black uppercase italic tracking-tighter leading-none">{course.name}</h4>
                                                                </div>
                                                                {isSelected && <div className="absolute top-4 right-4 z-20 bg-primary text-white p-1.5 rounded-full shadow-lg"><CheckCircle2 size={16} /></div>}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </div>

                            {formData.courseId && (
                                <div className="space-y-4 animate-in slide-in-from-top-4">
                                    <Label className="text-[10px] uppercase font-black text-primary">Turma Desejada (Opcional)</Label>
                                    <Select value={formData.classId} onValueChange={v => setFormData(p => ({...p, classId: v}))}>
                                        <SelectTrigger className="h-12 bg-slate-50 border-none rounded-xl font-bold">
                                            <SelectValue placeholder="Escolha um horário..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {classes.filter(cls => cls.courseId === formData.courseId).map(cls => (
                                                <SelectItem key={cls.id} value={cls.id}>
                                                    {cls.name} ({cls.dayOfWeek} às {cls.startTime})
                                                </SelectItem>
                                            ))}
                                            {classes.filter(cls => cls.courseId === formData.courseId).length === 0 && (
                                                <SelectItem value="null">A definir pelo coordenador</SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase font-black text-muted-foreground">Observações / Motivo da Inscrição</Label>
                                <Textarea value={formData.notes} onChange={e => setFormData(p => ({...p, notes: e.target.value}))} rows={4} placeholder="Conte-nos o que motiva você a fazer este curso..." />
                            </div>
                        </CardContent>
                        <CardFooter className="p-8 bg-muted/20 border-t flex flex-col gap-4">
                            <Button type="submit" disabled={isSaving || !formData.courseId} className="w-full h-14 font-black text-base uppercase tracking-widest shadow-xl rounded-2xl">
                                {isSaving ? <Loader2 className="mr-2 animate-spin" /> : <ShieldCheck className="mr-2" />}
                                Protocolar Inscrição
                            </Button>
                            <p className="text-[10px] text-center text-muted-foreground uppercase font-bold tracking-tighter">Igreja Batista da Manhã • Ano da Visão 2026</p>
                        </CardFooter>
                    </form>
                )}
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
