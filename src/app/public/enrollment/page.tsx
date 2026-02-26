
'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, getDocs, Timestamp, doc, writeBatch, arrayUnion } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
    Loader2, CheckCircle2, User, Mail, Smartphone, 
    BookOpen, ChevronRight, ArrowLeft, GraduationCap, 
    Sparkles, ShieldCheck, Search, UserPlus, AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Course = {
    id: string;
    name: string;
    ministryName: string;
    description?: string;
    type?: 'trilho' | 'eletivo';
    ebdTrack?: 'teologico' | 'biblico' | 'discipulado';
};

const getTrackBadge = (course: Course) => {
    if (course.ebdTrack === 'teologico') {
        return (
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] font-black h-5 uppercase">
                Fase Buscar | 12/03 a 16/04 às 09h00
            </Badge>
        );
    }
    if (course.ebdTrack === 'biblico' || course.ebdTrack === 'discipulado') {
        return (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-black h-5 uppercase">
                Todo domingo às 09h00
            </Badge>
        );
    }
    return null;
};

function EnrollmentFlow() {
    const searchParams = useSearchParams();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    
    // State
    const [step, setStep] = useState<'id' | 'profile' | 'course' | 'success'>('id');
    const [isSearching, setIsSearching] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [existingUser, setExistingUser] = useState<any>(null);
    
    const [formData, setFormData] = useState({
        email: '',
        name: '',
        phone: '',
        cpf: '',
        courseId: searchParams.get('courseId') || '',
    });

    const coursesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'courses')) : null, [firestore]);
    const { data: courses, isLoading: isLoadingCourses } = useCollection<Course>(coursesQuery);

    const handleCheckEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.email.trim() || !firestore) return;

        setIsSearching(true);
        try {
            const q = query(collection(firestore, 'users'), where('email', '==', formData.email.trim().toLowerCase()));
            const snap = await getDocs(q);
            
            if (!snap.empty) {
                const userDoc = snap.docs[0];
                const userData = userDoc.data();
                setExistingUser({ id: userDoc.id, ...userData });
                setFormData(prev => ({ ...prev, name: userData.name, phone: userData.phone || '' }));
                setStep('course');
                toast({ title: "Bem-vindo de volta!", description: `Identificamos seu cadastro como ${userData.name}.` });
            } else {
                setExistingUser(null);
                setStep('profile');
            }
        } catch (e) {
            toast({ variant: 'destructive', title: "Erro na busca", description: "Não foi possível verificar seu e-mail." });
        } finally {
            setIsSearching(false);
        }
    };

    const handleFinalSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.courseId || !firestore) return;

        setIsSubmitting(true);
        try {
            const batch = writeBatch(firestore);
            let finalUserId = existingUser?.id;

            // 1. Create user if new
            if (!existingUser) {
                const userRef = doc(collection(firestore, 'users'));
                finalUserId = userRef.id;
                batch.set(userRef, {
                    name: formData.name,
                    email: formData.email.toLowerCase(),
                    phone: formData.phone,
                    cpf: formData.cpf,
                    integrationStatus: 'nao_alcancado',
                    createdAt: Timestamp.now()
                });
            }

            // 2. Create Enrollment Request
            const requestRef = doc(collection(firestore, 'enrollment_requests'));
            batch.set(requestRef, {
                userId: finalUserId,
                name: formData.name,
                email: formData.email.toLowerCase(),
                phone: formData.phone,
                courseId: formData.courseId,
                status: 'pending',
                createdAt: Timestamp.now()
            });

            await batch.commit();
            setStep('success');
        } catch (error) {
            toast({ variant: 'destructive', title: "Erro ao processar", description: "Tente novamente em alguns instantes." });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoadingCourses) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4">
            <div className="w-full max-w-xl space-y-8">
                <div className="flex flex-col items-center text-center gap-2">
                    <Logo className="size-12 text-primary" />
                    <h1 className="text-3xl font-black tracking-tighter text-slate-900">OikoApp</h1>
                    <p className="text-sm text-muted-foreground uppercase font-black tracking-widest">Portal de Inscrições IBM</p>
                </div>

                {step === 'id' && (
                    <Card className="shadow-2xl border-none">
                        <CardHeader>
                            <CardTitle>Para começar, qual seu e-mail?</CardTitle>
                            <CardDescription>Usamos o e-mail para identificar se você já possui cadastro conosco.</CardDescription>
                        </CardHeader>
                        <form onSubmit={handleCheckEmail}>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email" className="font-bold">E-mail Principal</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-3 size-4 text-muted-foreground" />
                                            <Input 
                                                id="email" 
                                                type="email" 
                                                required 
                                                placeholder="seu@email.com" 
                                                className="pl-10 h-12 text-lg"
                                                value={formData.email}
                                                onChange={e => setFormData(p => ({...p, email: e.target.value}))}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button type="submit" className="w-full h-12 text-base font-bold" disabled={isSearching}>
                                    {isSearching ? <Loader2 className="mr-2 animate-spin" /> : "Continuar"}
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                )}

                {step === 'profile' && (
                    <Card className="shadow-2xl border-none animate-in slide-in-from-right-4 duration-300">
                        <CardHeader>
                            <CardTitle>Prazer em te conhecer!</CardTitle>
                            <CardDescription>Complete seu cadastro básico para prosseguir com a inscrição.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nome Completo</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 size-4 text-muted-foreground" />
                                    <Input id="name" required value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} className="pl-10" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Telefone/WhatsApp</Label>
                                    <div className="relative">
                                        <Smartphone className="absolute left-3 top-3 size-4 text-muted-foreground" />
                                        <Input id="phone" required placeholder="(21) 9..." value={formData.phone} onChange={e => setFormData(p => ({...p, phone: e.target.value}))} className="pl-10" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="cpf">CPF (Opcional)</Label>
                                    <Input id="cpf" value={formData.cpf} onChange={e => setFormData(p => ({...p, cpf: e.target.value}))} />
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex gap-3">
                            <Button variant="outline" onClick={() => setStep('id')} className="h-12"><ArrowLeft className="mr-2 size-4" /> Voltar</Button>
                            <Button className="flex-1 h-12 font-bold" onClick={() => setStep('course')}>Avançar para Cursos</Button>
                        </CardFooter>
                    </Card>
                )}

                {step === 'course' && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        {existingUser && (
                            <div className="bg-primary/10 p-4 rounded-xl border border-primary/20 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-full bg-primary flex items-center justify-center text-white font-black">
                                        {existingUser.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-primary leading-tight">Olá, {existingUser.name}!</p>
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Cadastro Identificado</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" className="text-[10px] uppercase font-black" onClick={() => { setExistingUser(null); setStep('id'); }}>Não é você?</Button>
                            </div>
                        )}

                        <div className="space-y-4">
                            <h3 className="text-lg font-black uppercase tracking-tighter text-slate-700">Selecione o Curso Desejado</h3>
                            <div className="grid gap-3">
                                {courses?.map(course => (
                                    <button
                                        key={course.id}
                                        onClick={() => setFormData(p => ({...p, courseId: course.id}))}
                                        className={cn(
                                            "w-full text-left p-4 rounded-xl border-2 transition-all group flex items-center justify-between",
                                            formData.courseId === course.id 
                                                ? "bg-primary/5 border-primary shadow-md ring-2 ring-primary/10" 
                                                : "bg-white border-transparent hover:border-slate-200"
                                        )}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "p-2.5 rounded-lg transition-colors",
                                                formData.courseId === course.id ? "bg-primary text-white" : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                                            )}>
                                                <BookOpen size={20} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-black text-slate-900 uppercase text-sm">{course.name}</p>
                                                    {getTrackBadge(course)}
                                                </div>
                                                <p className="text-xs text-muted-foreground font-medium">{course.ministryName}</p>
                                            </div>
                                        </div>
                                        <div className={cn(
                                            "size-5 rounded-full border-2 flex items-center justify-center transition-all",
                                            formData.courseId === course.id ? "border-primary bg-primary" : "border-slate-200"
                                        )}>
                                            {formData.courseId === course.id && <CheckCircle2 size={12} className="text-white" />}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button variant="outline" onClick={() => existingUser ? setStep('id') : setStep('profile')} className="h-12"><ArrowLeft className="mr-2 size-4" /> Voltar</Button>
                            <Button 
                                className="flex-1 h-12 font-black text-lg shadow-xl shadow-primary/20" 
                                disabled={!formData.courseId || isSubmitting}
                                onClick={handleFinalSubmit}
                            >
                                {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <ShieldCheck className="mr-2" />}
                                Solicitar Inscrição
                            </Button>
                        </div>
                    </div>
                )}

                {step === 'success' && (
                    <Card className="shadow-2xl border-none text-center p-8 animate-in zoom-in-95 duration-500">
                        <CardContent className="space-y-6 pt-6">
                            <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                                <CheckCircle2 size={40} />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Inscrição Protocolada!</h2>
                                <p className="text-muted-foreground font-medium">Obrigado, {formData.name.split(' ')[0]}. Nossa equipe pedagógica analisará sua solicitação e entrará em contato em breve.</p>
                            </div>
                            <div className="pt-6">
                                <Button asChild className="rounded-full px-10 font-black" size="lg">
                                    <a href="/">Voltar ao Site</a>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

export default function PublicEnrollmentPage() {
    return (
        <Suspense fallback={<div className="flex justify-center p-20"><Loader2 className="animate-spin" /></div>}>
            <EnrollmentFlow />
        </Suspense>
    );
}
