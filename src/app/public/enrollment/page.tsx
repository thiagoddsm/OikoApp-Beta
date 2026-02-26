
'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFirebase, addDocumentNonBlocking, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, BookOpen, UserPlus, CheckCircle2, ChevronRight, Mail, Smartphone, IdCard, Search, GraduationCap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/icons';

type Course = {
    id: string;
    name: string;
    description: string;
    ministryName: string;
    type?: 'trilho' | 'eletivo';
    ebdTrack?: 'teologico' | 'biblico' | 'discipulado';
};

function EnrollmentForm() {
    const searchParams = useSearchParams();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    
    // Configurações de Estado
    const [step, setStep] = useState(1); // 1: Email, 2: Cadastro (se novo), 3: Curso, 4: Sucesso
    const [isSearching, setIsSearching] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Dados do Usuário
    const [email, setEmail] = useState('');
    const [existingUserId, setExistingUserId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [cpf, setCpf] = useState('');
    
    // Dados da Matrícula
    const [selectedCourseId, setSelectedCourseId] = useState(searchParams.get('courseId') || '');

    // Dados de Cursos do Banco
    const coursesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'courses')) : null, [firestore]);
    const { data: courses, isLoading: isLoadingCourses } = useCollection<Course>(coursesQuery);

    const groupedCourses = useMemo(() => {
        if (!courses) return {};
        const groups: Record<string, Course[]> = {};
        courses.forEach(c => {
            const ministry = c.ministryName || 'Outros';
            if (!groups[ministry]) groups[ministry] = [];
            groups[ministry].push(c);
        });
        return groups;
    }, [courses]);

    // Busca de usuário por email
    const handleIdentify = async () => {
        if (!email.trim() || !firestore) return;
        setIsSearching(true);
        try {
            const q = query(collection(firestore, 'users'), where('email', '==', email.trim().toLowerCase()));
            const snap = await getDocs(q);
            
            if (!snap.empty) {
                const u = snap.docs[0];
                const data = u.data();
                setExistingUserId(u.id);
                setName(data.name);
                setPhone(data.phone || '');
                setCpf(data.cpf || '');
                setStep(3); // Pula direto para curso
                toast({ title: `Olá, ${data.name.split(' ')[0]}!`, description: "Reconhecemos seu cadastro. Escolha seu curso abaixo." });
            } else {
                setExistingUserId(null);
                setStep(2); // Vai para cadastro completo
            }
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: "Erro na busca", description: "Tente novamente em instantes." });
        } finally {
            setIsSearching(false);
        }
    };

    const handleSubmit = async () => {
        if (!selectedCourseId || !firestore) return;
        setIsSubmitting(true);

        try {
            let userId = existingUserId;

            // Se for novo usuário, criamos o perfil básico
            if (!userId) {
                const userRef = await addDocumentNonBlocking(collection(firestore, 'users'), {
                    name,
                    email: email.toLowerCase(),
                    phone,
                    cpf,
                    createdAt: Timestamp.now(),
                    integrationStatus: 'nao_alcancado',
                    hierarchy: { role: '' }
                });
                userId = userRef.id;
            }

            // Cria a solicitação de inscrição
            await addDocumentNonBlocking(collection(firestore, 'enrollment_requests'), {
                userId,
                name,
                email: email.toLowerCase(),
                phone,
                courseId: selectedCourseId,
                status: 'pending',
                createdAt: Timestamp.now()
            });

            setStep(4);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
            toast({ variant: 'destructive', title: "Erro na Inscrição", description: "Ocorreu uma falha técnica. Tente novamente." });
        } finally {
            setIsSubmitting(false);
        }
    };

    const getCourseBadge = (course: Course) => {
        if (course.ebdTrack === 'biblico' || course.ebdTrack === 'discipulado') {
            return (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-black h-5 uppercase">
                    Todo domingo às 09h00
                </Badge>
            );
        }
        if (course.ebdTrack === 'teologico') {
            return (
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] font-black h-5 uppercase">
                    Fase Buscar | 12/03 a 16/04 às 09h00
                </Badge>
            );
        }
        return null;
    };

    if (isLoadingCourses) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary size-10" /></div>;

    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Cabeçalho */}
            <div className="text-center space-y-4">
                <div className="flex justify-center mb-6">
                    <div className="p-3 bg-primary rounded-2xl shadow-xl shadow-primary/20">
                        <Logo className="size-10 text-white" />
                    </div>
                </div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 italic">Inscrição de Cursos & Trilhos</h1>
                <p className="text-slate-500 max-w-lg mx-auto">Seja bem-vindo à nossa jornada de crescimento. Inicie sua caminhada ministerial aqui.</p>
            </div>

            {/* Step 1: Identificação */}
            {step === 1 && (
                <Card className="border-none shadow-2xl overflow-hidden">
                    <CardHeader className="bg-primary/5 border-b border-primary/10">
                        <CardTitle className="text-lg flex items-center gap-2"><Mail className="size-5 text-primary"/> Identifique-se</CardTitle>
                        <CardDescription>O e-mail é nosso identificador único para evitar duplicidade.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-8 space-y-6">
                        <div className="space-y-3">
                            <Label htmlFor="email" className="font-bold text-xs uppercase tracking-widest text-slate-500">E-mail do Membro ou Visitante *</Label>
                            <Input 
                                id="email" 
                                type="email" 
                                value={email} 
                                onChange={e => setEmail(e.target.value)} 
                                placeholder="exemplo@mail.com" 
                                className="h-14 text-lg font-medium bg-muted/20 border-2 focus-visible:ring-primary"
                            />
                        </div>
                        <Button onClick={handleIdentify} disabled={isSearching || !email.includes('@')} className="w-full h-14 text-base font-black shadow-lg shadow-primary/20 rounded-xl">
                            {isSearching ? <Loader2 className="animate-spin mr-2" /> : <ChevronRight className="mr-2" />}
                            Continuar para Inscrição
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Step 2: Cadastro Novo */}
            {step === 2 && (
                <Card className="border-none shadow-2xl animate-in slide-in-from-right-4">
                    <CardHeader className="bg-emerald-50 border-b border-emerald-100">
                        <CardTitle className="text-lg flex items-center gap-2 text-emerald-800"><UserPlus className="size-5"/> Novo Cadastro</CardTitle>
                        <CardDescription className="text-emerald-700/70">Não encontramos o e-mail <strong>{email}</strong>. Preencha seus dados para criar seu perfil.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-8 space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nome Completo *</Label>
                            <Input id="name" value={name} onChange={e => setName(e.target.value)} className="h-12" placeholder="Digite seu nome completo" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="phone">Celular/WhatsApp *</Label>
                                <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} className="h-12" placeholder="(99) 99999-9999" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cpf">CPF (Opcional)</Label>
                                <Input id="cpf" value={cpf} onChange={e => setCpf(e.target.value)} className="h-12" placeholder="000.000.000-00" />
                            </div>
                        </div>
                        <Button onClick={() => setStep(3)} disabled={!name || !phone} className="w-full h-14 font-black rounded-xl">
                            Salvar e Escolher Curso <ChevronRight className="ml-2" />
                        </Button>
                        <Button variant="ghost" onClick={() => setStep(1)} className="w-full h-10 text-xs uppercase font-bold text-muted-foreground">Voltar e trocar e-mail</Button>
                    </CardContent>
                </Card>
            )}

            {/* Step 3: Escolha do Curso */}
            {step === 3 && (
                <div className="space-y-8 animate-in slide-in-from-right-4 pb-20">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="font-black text-xl text-slate-900 uppercase italic flex items-center gap-2">
                            <BookOpen className="size-6 text-primary" />
                            Catálogo de Cursos
                        </h3>
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold">
                            Olá, {name.split(' ')[0]}
                        </Badge>
                    </div>

                    {Object.entries(groupedCourses).map(([ministry, ministryCourses]) => (
                        <div key={ministry} className="space-y-4">
                            <div className="flex items-center gap-2 mb-4 px-2">
                                <div className="h-px flex-1 bg-slate-200"></div>
                                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">{ministry}</span>
                                <div className="h-px flex-1 bg-slate-200"></div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {ministryCourses.map(course => (
                                    <button 
                                        key={course.id} 
                                        onClick={() => setSelectedCourseId(course.id)}
                                        className={cn(
                                            "p-5 rounded-2xl border-2 text-left transition-all duration-300 group hover:shadow-xl",
                                            selectedCourseId === course.id 
                                                ? "bg-primary/5 border-primary ring-4 ring-primary/10 shadow-lg scale-[1.02]" 
                                                : "bg-white border-slate-100 hover:border-primary/30"
                                        )}
                                    >
                                        <div className="flex flex-col h-full justify-between gap-4">
                                            <div>
                                                <div className="flex justify-between items-start mb-2">
                                                    <h4 className="font-black text-slate-900 uppercase tracking-tight leading-tight transition-colors group-hover:text-primary">
                                                        {course.name}
                                                    </h4>
                                                    <div className={cn(
                                                        "size-5 rounded-full border-2 flex items-center justify-center shrink-0",
                                                        selectedCourseId === course.id ? "bg-primary border-primary" : "border-slate-200"
                                                    )}>
                                                        {selectedCourseId === course.id && <div className="size-2 bg-white rounded-full"></div>}
                                                    </div>
                                                </div>
                                                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">{course.description || 'Nenhuma descrição disponível.'}</p>
                                            </div>
                                            {getCourseBadge(course)}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}

                    <div className="fixed bottom-6 left-0 right-0 px-4 max-w-3xl mx-auto z-50">
                        <Button 
                            onClick={handleSubmit} 
                            disabled={isSubmitting || !selectedCourseId} 
                            className="w-full h-16 text-lg font-black shadow-[0_10px_40px_rgba(103,80,164,0.4)] rounded-2xl uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin mr-3 size-6" /> : <GraduationCap className="mr-3 size-6" />}
                            Confirmar Matrícula
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 4: Sucesso */}
            {step === 4 && (
                <div className="text-center py-20 space-y-8 animate-in zoom-in-95 duration-500">
                    <div className="size-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/20">
                        <CheckCircle2 size={48} />
                    </div>
                    <div className="space-y-4">
                        <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic">Inscrição Solicitada!</h2>
                        <p className="text-lg text-slate-600 max-w-md mx-auto leading-relaxed">
                            Obrigado, <strong>{name}</strong>! Recebemos sua solicitação para o curso selecionado. O coordenador entrará em contato em breve.
                        </p>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 inline-block text-left max-w-sm">
                        <p className="text-xs font-black uppercase text-slate-400 mb-3 tracking-widest">Próximos Passos:</p>
                        <ul className="space-y-3">
                            <li className="flex gap-3 items-start text-sm font-medium text-slate-700">
                                <div className="size-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-black shrink-0">1</div>
                                Aguarde a confirmação via WhatsApp.
                            </li>
                            <li className="flex gap-3 items-start text-sm font-medium text-slate-700">
                                <div className="size-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-black shrink-0">2</div>
                                O curso aparecerá no seu painel em "Ministerial &gt; Ensino".
                            </li>
                        </ul>
                    </div>
                    <div className="pt-4">
                        <Button variant="outline" onClick={() => window.location.href = '/'} className="h-12 px-10 rounded-full font-bold">Voltar ao Início</Button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function EnrollmentPage() {
    return (
        <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6">
            <Suspense fallback={<div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary size-10" /></div>}>
                <EnrollmentForm />
            </Suspense>
        </main>
    );
}
