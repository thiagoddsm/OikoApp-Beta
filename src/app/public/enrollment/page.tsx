
'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useVolunteering } from '@/contexts/volunteering-context';
import { useFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
    Loader2, 
    User, 
    Mail, 
    Phone, 
    IdCard, 
    CheckCircle2, 
    ChevronRight, 
    ArrowLeft, 
    BookOpen, 
    Waves, 
    GraduationCap, 
    Church,
    HeartHandshake,
    Sparkles,
    Calendar,
    Clock
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons';
import { cn } from '@/lib/utils';

type Step = 'identity' | 'personal_data' | 'course_selection' | 'success';

function EnrollmentContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { courses, isLoading: isContextLoading, addUser } = useVolunteering();
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const [step, setStep] = useState<Step>('identity');
    const [email, setEmail] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [identifiedUser, setIdentifiedUser] = useState<any>(null);
    
    // Form for new users
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [cpf, setCpf] = useState('');
    const [sexo, setSexo] = useState('Masculino');
    const [birthDate, setBirthDate] = useState('');

    const [selectedCourseId, setSelectedCourseId] = useState(searchParams.get('courseId') || '');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- Identification Logic ---
    const handleIdentify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !firestore) return;

        setIsSearching(true);
        try {
            const q = query(collection(firestore, 'users'), where('email', '==', email.trim().toLowerCase()));
            const snap = await getDocs(q);
            
            if (!snap.empty) {
                const u = snap.docs[0];
                const data = u.data();
                setIdentifiedUser({ id: u.id, ...data });
                setStep('course_selection');
                toast({ title: `Olá, ${data.name.split(' ')[0]}!`, description: "Reconhecemos seu cadastro. Escolha seu curso abaixo." });
            } else {
                setIdentifiedUser(null);
                setStep('personal_data');
            }
        } catch (error) {
            toast({ variant: 'destructive', title: "Erro na busca", description: "Tente novamente em instantes." });
        } finally {
            setIsSearching(false);
        }
    };

    // --- Final Submission ---
    const handleSubmit = async () => {
        if (!selectedCourseId) return;
        setIsSubmitting(true);

        try {
            let userId = identifiedUser?.id;

            if (!userId) {
                userId = await addUser({
                    name,
                    email: email.toLowerCase(),
                    phone,
                    cpf,
                    sexo,
                    dataNascimento: birthDate,
                    integrationStatus: 'nao_alcancado',
                });
            }

            await addDocumentNonBlocking(collection(firestore!, 'enrollment_requests'), {
                userId,
                name: identifiedUser?.name || name,
                email: email.toLowerCase(),
                phone: identifiedUser?.phone || phone,
                courseId: selectedCourseId,
                status: 'pending',
                createdAt: Timestamp.now()
            });

            setStep('success');
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Erro na inscrição', description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Filters for Tabs ---
    const getCoursesByTrack = (track: string) => {
        if (track === 'escolas') return courses.filter(c => c.ministryName.toLowerCase().includes('wave') || c.ministryName.toLowerCase() === 'dis');
        if (track === 'teologico') return courses.filter(c => c.ebdTrack === 'teologico');
        if (track === 'biblico') return courses.filter(c => c.ebdTrack === 'biblico');
        if (track === 'discipulado') return courses.filter(c => c.ebdTrack === 'discipulado');
        return courses.filter(c => !c.ebdTrack && !c.ministryName.toLowerCase().includes('wave') && c.ministryName.toLowerCase() !== 'dis');
    };

    const getTrackInfo = (course: any) => {
        if (course.ebdTrack === 'teologico') return "Fase Buscar | 12/03 a 16/04 às 09h00";
        if (course.ebdTrack === 'biblico' || course.ebdTrack === 'discipulado') return "Todo domingo às 09h00";
        return null;
    };

    if (isContextLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4">
            <div className="w-full max-w-2xl">
                <div className="flex flex-col items-center gap-4 mb-8">
                    <Logo className="size-12 text-primary" />
                    <div className="text-center">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Portal de Inscrições</h1>
                        <p className="text-muted-foreground font-medium">Igreja Batista da Manhã</p>
                    </div>
                </div>

                {step === 'identity' && (
                    <Card className="shadow-xl border-none">
                        <form onSubmit={handleIdentify}>
                            <CardHeader>
                                <CardTitle>Identificação</CardTitle>
                                <CardDescription>Informe seu e-mail para começarmos. Se você já é da casa, vamos te reconhecer!</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Seu E-mail *</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 size-4 text-muted-foreground" />
                                        <Input 
                                            id="email" 
                                            type="email" 
                                            placeholder="exemplo@email.com" 
                                            className="pl-10 h-11"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button type="submit" className="w-full h-11 font-bold" disabled={isSearching}>
                                    {isSearching ? <Loader2 className="animate-spin mr-2" /> : <ChevronRight className="mr-2" />}
                                    Continuar Inscrição
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                )}

                {step === 'personal_data' && (
                    <Card className="shadow-xl border-none animate-in slide-in-from-right-4 duration-300">
                        <CardHeader>
                            <div className="flex items-center gap-2 mb-2">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setStep('identity')}><ArrowLeft size={16}/></Button>
                                <Badge variant="secondary" className="bg-primary/10 text-primary">Novo Visitante</Badge>
                            </div>
                            <CardTitle>Seja bem-vindo!</CardTitle>
                            <CardDescription>Não encontramos seu e-mail em nossa base. Complete seu cadastro rápido:</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Nome Completo *</Label>
                                <div className="relative"><User className="absolute left-3 top-3 size-4 text-muted-foreground"/><Input value={name} onChange={e => setName(e.target.value)} className="pl-10 h-11" placeholder="Como devemos te chamar?" required/></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>WhatsApp *</Label>
                                    <div className="relative"><Phone className="absolute left-3 top-3 size-4 text-muted-foreground"/><Input value={phone} onChange={e => setPhone(e.target.value)} className="pl-10 h-11" placeholder="(21) 9..." required/></div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Data de Nascimento</Label>
                                    <Input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className="h-11" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>CPF</Label>
                                <div className="relative"><IdCard className="absolute left-3 top-3 size-4 text-muted-foreground"/><Input value={cpf} onChange={e => setCpf(e.target.value)} className="pl-10 h-11" placeholder="000.000.000-00"/></div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full h-11 font-bold" onClick={() => setStep('course_selection')} disabled={!name || !phone}>
                                Próximo: Escolher Curso
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {step === 'course_selection' && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        {identifiedUser && (
                            <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 flex items-center gap-4 mb-6">
                                <div className="size-12 rounded-full bg-primary flex items-center justify-center text-white font-black text-xl">
                                    {identifiedUser.name.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-900">Olá, {identifiedUser.name}!</p>
                                    <p className="text-xs text-muted-foreground">Que bom ter você servindo e crescendo conosco.</p>
                                </div>
                                <Button variant="ghost" className="ml-auto text-[10px] uppercase font-black" onClick={() => setStep('identity')}>Trocar E-mail</Button>
                            </div>
                        )}

                        <Card className="shadow-xl border-none">
                            <CardHeader>
                                <CardTitle>Qual será seu próximo passo?</CardTitle>
                                <CardDescription>Selecione o trilho e o curso desejado para este semestre.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Tabs defaultValue="discipulado" className="w-full">
                                    <ScrollArea className="w-full pb-4">
                                        <TabsList className="w-full h-auto flex-nowrap bg-muted/50 p-1">
                                            <TabsTrigger value="discipulado" className="flex-1 py-2 font-bold text-xs uppercase"><GraduationCap className="mr-2 size-3"/> Discipulado</TabsTrigger>
                                            <TabsTrigger value="teologico" className="flex-1 py-2 font-bold text-xs uppercase"><Sparkles className="mr-2 size-3"/> Teológico</TabsTrigger>
                                            <TabsTrigger value="biblico" className="flex-1 py-2 font-bold text-xs uppercase"><BookOpen className="mr-2 size-3"/> Bíblico</TabsTrigger>
                                            <TabsTrigger value="escolas" className="flex-1 py-2 font-bold text-xs uppercase"><Waves className="mr-2 size-3"/> Escolas</TabsTrigger>
                                            <TabsTrigger value="outros" className="flex-1 py-2 font-bold text-xs uppercase">Outros</TabsTrigger>
                                        </TabsList>
                                    </ScrollArea>

                                    {['discipulado', 'teologico', 'biblico', 'escolas', 'outros'].map(track => (
                                        <TabsContent key={track} value={track} className="mt-6 space-y-3">
                                            {getCoursesByTrack(track).length === 0 ? (
                                                <div className="text-center py-8 text-muted-foreground italic text-sm border-2 border-dashed rounded-xl">
                                                    Nenhum curso aberto neste trilho no momento.
                                                </div>
                                            ) : (
                                                getCoursesByTrack(track).map(course => (
                                                    <div 
                                                        key={course.id}
                                                        onClick={() => setSelectedCourseId(course.id)}
                                                        className={cn(
                                                            "p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between group",
                                                            selectedCourseId === course.id ? "bg-primary/5 border-primary shadow-md" : "hover:border-primary/20 border-transparent bg-slate-50"
                                                        )}
                                                    >
                                                        <div className="flex-1 pr-4">
                                                            <p className="font-black text-slate-900 uppercase italic tracking-tighter text-sm">{course.name}</p>
                                                            <div className="flex flex-col gap-1 mt-1">
                                                                {getTrackInfo(course) && (
                                                                    <p className="text-[10px] font-black text-primary flex items-center gap-1 uppercase">
                                                                        <Clock className="size-3" /> {getTrackInfo(course)}
                                                                    </p>
                                                                )}
                                                                <p className="text-xs text-muted-foreground line-clamp-1">{course.description || "Inicie seu crescimento na IBM."}</p>
                                                            </div>
                                                        </div>
                                                        <div className={cn(
                                                            "size-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                                                            selectedCourseId === course.id ? "bg-primary border-primary" : "border-slate-300"
                                                        )}>
                                                            {selectedCourseId === course.id && <CheckCircle2 className="size-4 text-white" />}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </TabsContent>
                                    ))}
                                </Tabs>
                            </CardContent>
                            <CardFooter>
                                <Button className="w-full h-14 text-lg font-black italic tracking-tighter shadow-lg shadow-primary/20" onClick={handleSubmit} disabled={isSubmitting || !selectedCourseId}>
                                    {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : "FINALIZAR MINHA INSCRIÇÃO"}
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                )}

                {step === 'success' && (
                    <Card className="shadow-2xl border-none animate-in zoom-in-95 duration-500 overflow-hidden">
                        <div className="bg-emerald-600 h-2 w-full" />
                        <CardContent className="pt-12 pb-12 flex flex-col items-center text-center space-y-6">
                            <div className="size-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 animate-bounce">
                                <CheckCircle2 size={48} />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Inscrição Recebida!</h2>
                                <p className="text-slate-600 max-w-xs mx-auto mt-2 leading-relaxed">
                                    Agora nossa equipe vai processar sua solicitação. Fique atento ao seu WhatsApp, entraremos em contato em breve!
                                </p>
                            </div>
                            <Button size="lg" variant="outline" className="rounded-full font-bold px-8" onClick={() => router.push('/')}>
                                Voltar para o Início
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

export default function EnrollmentPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>}>
            <EnrollmentContent />
        </Suspense>
    );
}
