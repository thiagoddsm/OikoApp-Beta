
'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useVolunteering, VolunteeringProvider } from '@/contexts/volunteering-context';
import { useFirebase } from '@/firebase';
import { collection, query, where, getDocs, Timestamp, addDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
    Loader2, CheckCircle2, User, BookOpen, GraduationCap, 
    Smartphone, Mail, Search, ChevronRight, ArrowLeft,
    Handshake, Waves, School, Lightbulb
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

function EnrollmentFormContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();
    const { firestore } = useFirebase();
    const { courses, classes, isLoading: isContextLoading } = useVolunteering();

    const initialCourseId = searchParams.get('courseId');
    
    const [step, setStep] = useState<'email' | 'data' | 'course' | 'success'>('email');
    const [email, setEmail] = useState('');
    const [isSearchingMember, setIsSearchingMember] = useState(false);
    const [foundMember, setFoundMember] = useState<any>(null);

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        cpf: '',
        dataNascimento: '',
    });

    const [selectedCourseId, setSelectedCourseId] = useState(initialCourseId || '');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleCheckEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.includes('@')) return;

        setIsSearchingMember(true);
        try {
            const q = query(collection(firestore!, 'users'), where('email', '==', email.trim().toLowerCase()));
            const snap = await getDocs(q);
            
            if (!snap.empty) {
                const member = snap.docs[0].data();
                setFoundMember({ id: snap.docs[0].id, ...member });
                setStep('course');
                toast({ title: `Olá, ${member.name}!`, description: "Identificamos seu cadastro. Escolha seu curso abaixo." });
            } else {
                setFoundMember(null);
                setStep('data');
            }
        } catch (e) {
            toast({ variant: 'destructive', title: "Erro na busca", description: "Tente novamente em instantes." });
        } finally {
            setIsSearchingMember(false);
        }
    };

    const handleDataSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setStep('course');
    };

    const handleEnroll = async () => {
        if (!selectedCourseId) return;
        setIsSubmitting(true);

        try {
            let userId = foundMember?.id;

            if (!userId) {
                const userRef = await addDoc(collection(firestore!, 'users'), {
                    ...formData,
                    email: email.toLowerCase().trim(),
                    integrationStatus: 'nao_alcancado',
                    createdAt: Timestamp.now()
                });
                userId = userRef.id;
            }

            await addDoc(collection(firestore!, 'enrollment_requests'), {
                userId,
                name: foundMember?.name || formData.name,
                email: email.toLowerCase().trim(),
                phone: foundMember?.phone || formData.phone,
                courseId: selectedCourseId,
                status: 'pending',
                createdAt: Timestamp.now()
            });

            setStep('success');
        } catch (error) {
            toast({ variant: 'destructive', title: "Falha na inscrição", description: "Ocorreu um erro ao processar seu pedido." });
        } finally {
            setIsSubmitting(false);
        }
    };

    const groupedCourses = useMemo(() => {
        const groups: Record<string, any[]> = {
            'discipulado': [],
            'teologico': [],
            'biblico': [],
            'escolas': [],
            'outros': []
        };

        courses.forEach(c => {
            const name = c.name.toLowerCase();
            const min = c.ministryName?.toLowerCase() || '';

            if (name.includes('pertencer') || name.includes('crescer') || name.includes('liderar')) groups.discipulado.push(c);
            else if (c.ebdTrack === 'teologico' || min.includes('lumine')) groups.teologico.push(c);
            else if (c.ebdTrack === 'biblico') groups.biblico.push(c);
            else if (min.includes('wave') || min.includes('dis')) groups.escolas.push(c);
            else groups.outros.push(c);
        });

        return groups;
    }, [courses]);

    if (step === 'success') {
        return (
            <div className="max-w-md mx-auto text-center space-y-6 py-12 animate-in zoom-in-95">
                <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg">
                    <CheckCircle2 size={40} />
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Inscrição Protocolada!</h2>
                <p className="text-slate-600">Sua solicitação foi enviada para a coordenação. Em breve entraremos em contato via WhatsApp para confirmar sua turma.</p>
                <Button className="w-full h-12 font-bold" onClick={() => router.push('/')}>Voltar ao Início</Button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            {step === 'email' && (
                <Card className="max-w-md mx-auto shadow-2xl border-none">
                    <CardHeader className="text-center">
                        <div className="size-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mx-auto mb-4">
                            <Mail size={24} />
                        </div>
                        <CardTitle className="text-2xl font-black tracking-tight">Identifique-se</CardTitle>
                        <CardDescription>Para começar, informe seu e-mail de membro ou visitante.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCheckEmail} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">E-mail Obrigatório</Label>
                                <Input 
                                    id="email" 
                                    type="email" 
                                    placeholder="seu@email.com" 
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                    className="h-12 text-lg"
                                />
                            </div>
                            <Button type="submit" className="w-full h-12 font-bold text-base" disabled={isSearchingMember}>
                                {isSearchingMember ? <Loader2 className="animate-spin mr-2" /> : "Continuar"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            )}

            {step === 'data' && (
                <Card className="max-w-lg mx-auto shadow-2xl border-none">
                    <CardHeader>
                        <Button variant="ghost" size="sm" className="w-fit -ml-2 mb-2" onClick={() => setStep('email')}>
                            <ArrowLeft className="size-4 mr-2" /> Voltar
                        </Button>
                        <CardTitle className="text-2xl font-black">Quase lá!</CardTitle>
                        <CardDescription>Não encontramos seu e-mail. Preencha seus dados para criar seu perfil.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleDataSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Nome Completo</Label>
                                <Input required value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} placeholder="Como quer ser chamado?" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>WhatsApp</Label>
                                    <Input required value={formData.phone} onChange={e => setFormData(p => ({...p, phone: e.target.value}))} placeholder="(21) 9..." />
                                </div>
                                <div className="space-y-2">
                                    <Label>CPF (Opcional)</Label>
                                    <Input value={formData.cpf} onChange={e => setFormData(p => ({...p, cpf: e.target.value}))} placeholder="000.000..." />
                                </div>
                            </div>
                            <Button type="submit" className="w-full h-12 font-bold mt-4">Continuar para Cursos</Button>
                        </form>
                    </CardContent>
                </Card>
            )}

            {step === 'course' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border">
                        <div className="flex items-center gap-3">
                            <div className="size-10 bg-primary text-white rounded-full flex items-center justify-center font-black">
                                {(foundMember?.name || formData.name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-900">Olá, {foundMember?.name || formData.name}!</p>
                                <p className="text-[10px] text-muted-foreground uppercase font-bold">{email}</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setStep('email')} className="text-[10px] font-black uppercase">Trocar E-mail</Button>
                    </div>

                    <div className="text-center space-y-2">
                        <h2 className="text-3xl font-black tracking-tight italic uppercase">Escolha seu Próximo Passo</h2>
                        <p className="text-muted-foreground">Selecione o trilho e o curso desejado para este semestre.</p>
                    </div>

                    <Tabs defaultValue="discipulado" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto bg-muted/50 p-1 rounded-xl mb-8">
                            <TabsTrigger value="discipulado" className="py-3 rounded-lg font-bold data-[state=active]:shadow-md">Discipulado</TabsTrigger>
                            <TabsTrigger value="teologico" className="py-3 rounded-lg font-bold data-[state=active]:shadow-md">Teológico</TabsTrigger>
                            <TabsTrigger value="biblico" className="py-3 rounded-lg font-bold data-[state=active]:shadow-md">Bíblico</TabsTrigger>
                            <TabsTrigger value="escolas" className="py-3 rounded-lg font-bold data-[state=active]:shadow-md">Escolas</TabsTrigger>
                            <TabsTrigger value="outros" className="py-3 rounded-lg font-bold data-[state=active]:shadow-md">Outros</TabsTrigger>
                        </TabsList>

                        {Object.entries(groupedCourses).map(([key, list]) => (
                            <TabsContent key={key} value={key} className="animate-in slide-in-from-bottom-4 duration-500">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {list.map(course => {
                                        const isSelected = selectedCourseId === course.id;
                                        const isEbd = course.ebdTrack === 'teologico' || course.ebdTrack === 'biblico';
                                        const isDisc = key === 'discipulado';

                                        return (
                                            <div 
                                                key={course.id}
                                                onClick={() => setSelectedCourseId(course.id)}
                                                className={cn(
                                                    "p-5 rounded-2xl border-2 transition-all cursor-pointer relative group overflow-hidden",
                                                    isSelected ? "border-primary bg-primary/5 ring-4 ring-primary/10" : "bg-white border-slate-100 hover:border-primary/30"
                                                )}
                                            >
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className={cn("p-2 rounded-lg", isSelected ? "bg-primary text-white" : "bg-muted text-slate-500 group-hover:bg-primary/10 transition-colors")}>
                                                        {key === 'escolas' ? <Waves size={20}/> : key === 'teologico' ? <Lightbulb size={20}/> : <GraduationCap size={20}/>}
                                                    </div>
                                                    {isSelected && <CheckCircle2 className="text-primary animate-in zoom-in" size={24} />}
                                                </div>
                                                <h3 className="font-black text-slate-900 uppercase italic tracking-tighter leading-none mb-2">{course.name}</h3>
                                                
                                                <div className="space-y-2">
                                                    {(isDisc || course.ebdTrack === 'biblico') && (
                                                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-black h-5 uppercase">
                                                            Todo domingo às 09h00
                                                        </Badge>
                                                    )}
                                                    {course.ebdTrack === 'teologico' && (
                                                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] font-black h-5 uppercase">
                                                            Fase Buscar | 12/03 a 16/04 às 09h00
                                                        </Badge>
                                                    )}
                                                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{course.description}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </TabsContent>
                        ))}
                    </Tabs>

                    <div className="pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
                            <BookOpen className="size-4" />
                            Selecione um curso para habilitar a inscrição
                        </div>
                        <Button 
                            size="lg" 
                            className="w-full md:w-64 h-14 text-lg font-black shadow-xl shadow-primary/20" 
                            disabled={!selectedCourseId || isSubmitting}
                            onClick={handleEnroll}
                        >
                            {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : "Confirmar Inscrição"}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function PublicEnrollmentPage() {
    return (
        <div className="min-h-screen bg-slate-50/50 py-12 px-4 md:px-8">
            <div className="max-w-4xl mx-auto mb-12 text-center space-y-4">
                <div className="flex justify-center items-center gap-2 mb-2">
                    <div className="size-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                        <School size={24} />
                    </div>
                    <h1 className="text-2xl font-black uppercase tracking-tighter">IBM Ensino</h1>
                </div>
                <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter leading-none">Portal de Matrículas</h2>
                <p className="text-slate-500 max-w-xl mx-auto font-medium">Invista no seu crescimento espiritual. Faça parte dos nossos trilhos de discipulado e formação teológica.</p>
            </div>

            <VolunteeringProvider>
                <Suspense fallback={<div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary size-10" /></div>}>
                    <EnrollmentFormContent />
                </Suspense>
            </VolunteeringProvider>
        </div>
    );
}
