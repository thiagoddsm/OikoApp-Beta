
'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useVolunteering, VolunteeringProvider } from '@/contexts/volunteering-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
    Loader2, CheckCircle2, User, Phone, Mail, 
    BookOpen, ArrowRight, ArrowLeft, Waves, Lightbulb, GraduationCap, IdCard, Search
} from 'lucide-react';
import { Logo } from '@/components/icons';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';

function EnrollmentContent() {
    const { courses, users, addEnrollmentRequest, isLoading } = useVolunteering();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const preSelectedCourseId = searchParams.get('courseId');

    const [step, setStep] = useState(1); // 1: Identificação, 2: Dados Complementares, 3: Curso, 4: Sucesso
    const [submitting, setSubmitting] = useState(false);
    
    // User Identity Search
    const [isSearchingUser, setIsSearchingUser] = useState(false);
    const [existingUser, setExistingUser] = useState<any>(null);

    const [formData, setFormData] = useState({
        email: '',
        name: '',
        phone: '',
        cpf: '',
        courseId: preSelectedCourseId || '',
    });

    const handleEmailBlur = async () => {
        if (!formData.email.trim() || !formData.email.includes('@')) return;
        
        setIsSearchingUser(true);
        try {
            const user = users.find(u => u.email?.toLowerCase() === formData.email.toLowerCase());
            if (user) {
                setExistingUser(user);
                setFormData(p => ({ ...p, name: user.name, phone: user.phone || '', cpf: user.cpf || '' }));
            } else {
                setExistingUser(null);
            }
        } finally {
            setIsSearchingUser(false);
        }
    };

    const handleNextStep = () => {
        if (step === 1) {
            if (!formData.email) return;
            if (existingUser) setStep(3); // Pula dados se já existe
            else setStep(2);
        } else if (step === 2) {
            if (!formData.name || !formData.phone) return;
            setStep(3);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.courseId) return;

        setSubmitting(true);
        try {
            await addEnrollmentRequest({
                userId: existingUser?.id || '',
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                cpf: formData.cpf,
                courseId: formData.courseId,
                status: 'pending',
                createdAt: new Date() as any,
            });
            setStep(4);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao enviar', description: 'Tente novamente.' });
        } finally {
            setSubmitting(false);
        }
    };

    const getCourseLabel = (course: any) => {
        const ministry = course.ministryName?.toLowerCase() || '';
        const name = course.name?.toLowerCase() || '';
        
        if (course.ebdTrack === 'teologico') {
            return "Fase Buscar | 12/03 a 16/04 às 09h00";
        }
        if (course.ebdTrack === 'biblico' || course.ebdTrack === 'discipulado') {
            return "Todo domingo às 09h00";
        }
        return null;
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4">
            <div className="flex items-center gap-3 mb-8">
                <Logo className="size-10 text-primary" />
                <h1 className="text-2xl font-black text-slate-900 tracking-tighter">OikoApp IBM</h1>
            </div>

            <Card className="w-full max-w-xl shadow-xl border-none">
                {step < 4 && (
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl">Matrícula em Curso / GC</CardTitle>
                        <CardDescription>Sua jornada de crescimento na IBM começa aqui.</CardDescription>
                        <div className="flex justify-center gap-2 mt-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className={cn("h-1.5 w-12 rounded-full transition-all", step >= i ? "bg-primary" : "bg-slate-200")} />
                            ))}
                        </div>
                    </CardHeader>
                )}

                <CardContent className="pt-6">
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in duration-500">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="font-bold">E-mail para identificação *</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 size-4 text-muted-foreground" />
                                    <Input 
                                        id="email" 
                                        type="email" 
                                        value={formData.email}
                                        onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                                        onBlur={handleEmailBlur}
                                        placeholder="seu@email.com" 
                                        className="pl-10 h-12"
                                        required
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">O e-mail é obrigatório para localizarmos seu histórico.</p>
                            </div>
                            
                            {isSearchingUser && <div className="flex items-center gap-2 text-xs text-primary font-bold"><Loader2 className="animate-spin size-3" /> Buscando cadastro...</div>}
                            
                            {existingUser && (
                                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 animate-in zoom-in-95">
                                    <CheckCircle2 className="text-emerald-600 size-5" />
                                    <div>
                                        <p className="text-sm font-bold text-emerald-900">Olá, {existingUser.name}!</p>
                                        <p className="text-xs text-emerald-700">Reconhecemos seu e-mail. Clique em avançar para escolher seu curso.</p>
                                    </div>
                                </div>
                            )}

                            <Button className="w-full h-12 font-bold" onClick={handleNextStep} disabled={!formData.email || isSearchingUser}>
                                Próximo <ArrowRight className="ml-2 size-4" />
                            </Button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                            <div className="p-4 bg-blue-50 text-blue-700 rounded-xl text-xs flex items-start gap-2 mb-2">
                                <Search className="size-4 shrink-0 mt-0.5" />
                                Não encontramos cadastro com este e-mail. Por favor, preencha seus dados para continuar.
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="font-bold">Nome Completo *</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3 size-4 text-muted-foreground" />
                                        <Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Nome e sobrenome" className="pl-10" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="font-bold">WhatsApp *</Label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-3 size-4 text-muted-foreground" />
                                            <Input value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} placeholder="(21) 9..." className="pl-10" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="font-bold">CPF (Opcional)</Label>
                                        <div className="relative">
                                            <IdCard className="absolute left-3 top-3 size-4 text-muted-foreground" />
                                            <Input value={formData.cpf} onChange={e => setFormData(p => ({ ...p, cpf: e.target.value }))} placeholder="000.000.000-00" className="pl-10" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setStep(1)} className="h-12"><ArrowLeft /></Button>
                                <Button className="flex-1 h-12 font-bold" onClick={handleNextStep} disabled={!formData.name || !formData.phone}>
                                    Avançar para Cursos
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <form onSubmit={handleSubmit} className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                            <div className="space-y-2">
                                <Label className="font-bold">Qual curso ou trilho você deseja fazer? *</Label>
                                <div className="grid gap-3">
                                    {courses.map(course => {
                                        const label = getCourseLabel(course);
                                        return (
                                            <div 
                                                key={course.id}
                                                onClick={() => setFormData(p => ({ ...p, courseId: course.id }))}
                                                className={cn(
                                                    "p-4 border-2 rounded-xl cursor-pointer transition-all hover:bg-slate-50",
                                                    formData.courseId === course.id ? "border-primary bg-primary/5 shadow-md" : "border-slate-100"
                                                )}
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="font-black text-sm text-slate-900 uppercase">{course.name}</span>
                                                    <Badge variant="outline" className="text-[8px] h-4 uppercase">{course.ministryName}</Badge>
                                                </div>
                                                {label && (
                                                    <p className="text-[10px] font-bold text-primary uppercase mt-1 flex items-center gap-1">
                                                        <GraduationCap className="size-3" /> {label}
                                                    </p>
                                                )}
                                                <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{course.description}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" onClick={() => setStep(existingUser ? 1 : 2)} className="h-12"><ArrowLeft /></Button>
                                <Button className="flex-1 h-12 font-bold" type="submit" disabled={submitting || !formData.courseId}>
                                    {submitting ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2" />}
                                    Finalizar Inscrição
                                </Button>
                            </div>
                        </form>
                    )}

                    {step === 4 && (
                        <div className="py-12 text-center space-y-6 animate-in zoom-in-95 duration-500">
                            <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-200/50">
                                <CheckCircle2 size={40} />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Inscrição Protocolada!</h2>
                                <p className="text-slate-600 mt-2">
                                    Obrigado, {formData.name.split(' ')[0]}! <br/>
                                    Sua solicitação foi enviada para o responsável pelo curso. Em breve entraremos em contato.
                                </p>
                            </div>
                            <Button className="font-bold px-8 h-12" onClick={() => window.location.reload()}>
                                Realizar outra matrícula
                            </Button>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="text-center justify-center bg-muted/20 py-4 border-t">
                    <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">OikoApp • Gestão Inteligente IBM</p>
                </CardFooter>
            </Card>
        </div>
    );
}

export default function EnrollmentPage() {
    return (
        <VolunteeringProvider>
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary size-10" /></div>}>
                <EnrollmentContent />
            </Suspense>
        </VolunteeringProvider>
    );
}
