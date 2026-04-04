'use client';

import React, { useState, useMemo } from 'react';
import { useFirebase, addDocumentNonBlocking, useCollection, useMemoFirebase } from '@/firebase';
import { collection, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { 
    Loader2, 
    CheckCircle, 
    Calendar, 
    ArrowRight, 
    Users, 
    BookOpen, 
    Heart, 
    Info,
    Send
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// Tipagem para os cursos escolares
type Course = {
    id: string;
    name: string;
    description: string;
    ministryName: string;
};

function EnrollmentPortal() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    
    const [isSaving, setIsSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [activeTab, setActiveTab] = useState('courses');
    
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        courseId: '',
    });

    const coursesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'courses') : null, [firestore]);
    const { data: courses, isLoading: isLoadingCourses } = useCollection<Course>(coursesQuery);

    const filteredCourses = useMemo(() => {
        if (!courses) return [];
        return courses.sort((a, b) => a.name.localeCompare(b.name));
    }, [courses]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.email || !formData.courseId || !firestore) {
            toast({ variant: 'destructive', title: "Campos obrigatórios", description: "Preencha seus dados e selecione um curso." });
            return;
        }

        setIsSaving(true);
        try {
            await addDocumentNonBlocking(collection(firestore, 'enrollment_requests'), {
                ...formData,
                status: 'pending',
                createdAt: Timestamp.now(),
            });
            setSuccess(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: "Erro ao enviar", description: "Ocorreu uma falha técnica. Tente novamente." });
        } finally {
            setIsSaving(false);
        }
    };

    if (success) {
        return (
            <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <Card className="max-w-md w-full text-center p-8 animate-in zoom-in-95 duration-500 rounded-[2rem] border-none shadow-2xl">
                    <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={40} />
                    </div>
                    <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 mb-4">Interesse Registrado!</h2>
                    <p className="text-muted-foreground mb-8">
                        Recebemos sua solicitação. O responsável pelo curso entrará em contato em breve para confirmar sua matrícula e horários.
                    </p>
                    <Button onClick={() => window.location.reload()} variant="outline" className="w-full font-bold h-12 rounded-xl">Fechar</Button>
                </Card>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50 py-12 md:py-20 px-4">
            <div className="max-w-6xl mx-auto space-y-12">
                <div className="text-center space-y-4">
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 py-1 px-4 text-xs font-black uppercase tracking-[0.2em]">Inscrições Abertas</Badge>
                    <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase text-slate-900 leading-[0.9]">O Riso que Restaura <br/><span className="text-primary">& Trilhas de Crescimento</span></h1>
                    <p className="text-muted-foreground text-sm md:text-lg max-w-2xl mx-auto">Garanta sua vaga nos próximos eventos estratégicos e cursos de capacitação da IBM.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="bg-white p-1 rounded-2xl shadow-sm border h-auto mb-8">
                                <TabsTrigger value="courses" className="rounded-xl px-8 py-3 font-bold data-[state=active]:bg-primary data-[state=active]:text-white transition-all">Cursos Escolares</TabsTrigger>
                                <TabsTrigger value="events" className="rounded-xl px-8 py-3 font-bold data-[state=active]:bg-rose-600 data-[state=active]:text-white transition-all">Eventos Estratégicos</TabsTrigger>
                            </TabsList>

                            <TabsContent value="courses" className="mt-0 space-y-6 animate-in fade-in-50">
                                {isLoadingCourses ? (
                                    <div className="flex justify-center p-12"><Loader2 className="animate-spin size-8 text-primary" /></div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {filteredCourses.map(course => (
                                            <Card 
                                                key={course.id} 
                                                className={cn(
                                                    "cursor-pointer transition-all hover:shadow-md border-2",
                                                    formData.courseId === course.id ? "border-primary bg-primary/5" : "border-transparent"
                                                )}
                                                onClick={() => setFormData(p => ({...p, courseId: course.id}))}
                                            >
                                                <CardContent className="p-6">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <Badge variant="outline" className="text-[10px] uppercase font-black">{course.ministryName}</Badge>
                                                        {formData.courseId === course.id && <CheckCircle className="size-5 text-primary" />}
                                                    </div>
                                                    <h3 className="font-bold text-lg text-slate-900 mb-2 uppercase">{course.name}</h3>
                                                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{course.description}</p>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="events" className="mt-0 animate-in fade-in-50">
                                <Card className="border-none shadow-xl overflow-hidden rounded-[2rem]">
                                    <div className="aspect-video relative">
                                        <img src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=1200" alt="Jantar dos Namorados" className="object-cover w-full h-full" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
                                        <div className="absolute bottom-6 left-6 right-6">
                                            <Badge className="bg-rose-600 text-white font-black mb-2">12 DE JUNHO</Badge>
                                            <h3 className="text-2xl md:text-4xl font-black text-white uppercase italic tracking-tighter">Jantar dos Namorados 2026</h3>
                                        </div>
                                    </div>
                                    <CardContent className="p-8">
                                        <p className="text-slate-600 mb-6 leading-relaxed">
                                            Uma noite inesquecível de comunhão, riso e alta gastronomia. Show de Stand-up com Welson Nunes e Menu Gourmet assinado por AR Eventos.
                                        </p>
                                        <Button asChild className="bg-rose-600 hover:bg-rose-700 h-12 px-8 font-black uppercase tracking-widest rounded-xl">
                                            <Link href="/eventos/jantar-dos-namorados">Ver Página do Evento</Link>
                                        </Button>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>

                    <div className="lg:col-span-1">
                        <Card className="shadow-2xl border-none rounded-[2rem] sticky top-8">
                            <CardHeader className="p-8 border-b bg-slate-50 rounded-t-[2rem]">
                                <CardTitle className="text-xl font-bold flex items-center gap-2">
                                    <Users className="size-5 text-primary" />
                                    Dados do Aluno
                                </CardTitle>
                                <CardDescription>Preencha para solicitar sua vaga.</CardDescription>
                            </CardHeader>
                            <form onSubmit={handleSave}>
                                <CardContent className="p-8 space-y-6">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-black text-muted-foreground">Nome Completo</Label>
                                        <Input required value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} placeholder="Seu nome" className="h-12" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-black text-muted-foreground">E-mail</Label>
                                        <Input type="email" required value={formData.email} onChange={e => setFormData(p => ({...p, email: e.target.value}))} placeholder="seu@email.com" className="h-12" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-black text-muted-foreground">Telefone / WhatsApp</Label>
                                        <Input required value={formData.phone} onChange={e => setFormData(p => ({...p, phone: e.target.value}))} placeholder="(21) 9..." className="h-12" />
                                    </div>

                                    {activeTab === 'courses' && !formData.courseId && (
                                        <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3 animate-pulse">
                                            <Info className="size-5 text-amber-600 shrink-0 mt-0.5" />
                                            <p className="text-[11px] text-amber-800 font-bold uppercase tracking-tighter">Selecione um curso na lista ao lado.</p>
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter className="p-8 pt-0">
                                    <Button type="submit" disabled={isSaving || (activeTab === 'courses' && !formData.courseId)} className="w-full h-14 font-black text-base uppercase tracking-widest shadow-xl">
                                        {isSaving ? <Loader2 className="mr-2 animate-spin" /> : <Send className="mr-2" />}
                                        {activeTab === 'courses' ? 'Solicitar Matrícula' : 'Garantir Vaga'}
                                    </Button>
                                </CardFooter>
                            </form>
                        </Card>
                    </div>
                </div>
            </div>
        </main>
    );
}

export default function EnrollmentPage() {
    const firebase = useFirebase();

    if (!firebase || !firebase.firestore) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest">Iniciando Portal...</p>
            </div>
        );
    }

    return <EnrollmentPortal />;
}
