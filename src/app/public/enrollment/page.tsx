'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, addDoc, Timestamp } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
    Loader2, Search, BookOpen, GraduationCap, ArrowRight, 
    CheckCircle, HeartHandshake, Phone, Mail, User, Info,
    CalendarDays, Sparkles
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function EventCard({ title, description, date, href, icon: Icon }: any) {
  return (
    <Card className="flex flex-col h-full overflow-hidden transition-all hover:shadow-xl group border-2 border-transparent hover:border-rose-100">
        <CardHeader className="bg-rose-50/50 pb-4">
            <div className="size-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-rose-600 mb-4 group-hover:scale-110 transition-transform">
                <Icon size={24} />
            </div>
            <CardTitle className="text-xl font-bold text-slate-900">{title}</CardTitle>
            <CardDescription className="line-clamp-2">{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                <CalendarDays className="size-4" />
                {date}
            </div>
        </CardContent>
        <CardFooter className="pt-0 pb-6 px-6">
            <Button asChild className="w-full font-black uppercase tracking-widest bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-2">
                <Link href={href}>
                    Ver Página do Evento
                    <ArrowRight className="size-4" />
                </Link>
            </Button>
        </CardFooter>
    </Card>
  );
}

function EnrollmentPortal() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const initialCourseId = searchParams.get('courseId');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        courseId: initialCourseId || '',
    });

    const coursesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'courses')) : null, [firestore]);
    const { data: courses, isLoading } = useCollection<any>(coursesQuery);

    const filteredCourses = useMemo(() => {
        if (!courses) return [];
        return courses.filter(c => 
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.ministryName.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [courses, searchTerm]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.email || !formData.courseId || !firestore) return;

        setIsSubmitting(true);
        try {
            await addDoc(collection(firestore, 'enrollment_requests'), {
                ...formData,
                status: 'pending',
                createdAt: Timestamp.now(),
            });
            setSuccess(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: "Erro ao enviar", description: "Ocorreu uma falha. Tente novamente." });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (success) {
        return (
            <div className="max-w-md mx-auto text-center p-8 animate-in zoom-in-95 duration-500">
                <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner mb-6">
                    <CheckCircle size={40} />
                </div>
                <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 mb-4">Interesse Registrado!</h2>
                <p className="text-muted-foreground mb-8">
                    Recebemos sua solicitação de inscrição. O coordenador do curso entrará em contato com você via WhatsApp em breve.
                </p>
                <Button onClick={() => setSuccess(false)} variant="outline" className="w-full font-bold">Voltar</Button>
            </div>
        );
    }

    return (
        <div className="space-y-12">
            <div className="text-center space-y-4">
                <Logo className="size-12 text-primary mx-auto mb-4" />
                <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">Inscrições <span className="text-primary">IBM</span></h1>
                <p className="text-muted-foreground text-sm md:text-lg max-w-xl mx-auto">Escolha o seu próximo passo de crescimento na trilha de discipulado da Igreja Batista da Manhã.</p>
            </div>

            <Tabs defaultValue="courses" className="w-full">
                <div className="flex justify-center mb-8">
                    <TabsList className="bg-muted/50 p-1 h-12 rounded-xl">
                        <TabsTrigger value="courses" className="rounded-lg font-bold px-8">Cursos e Escolas</TabsTrigger>
                        <TabsTrigger value="events" className="rounded-lg font-bold px-8">Eventos Especiais</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="courses" className="space-y-8 animate-in fade-in-50 duration-500">
                    <div className="relative max-w-md mx-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input 
                            placeholder="Buscar por curso ou escola..." 
                            className="pl-10 h-12 rounded-full shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary size-8" /></div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredCourses.map(course => (
                                <Card key={course.id} className={cn(
                                    "cursor-pointer transition-all hover:shadow-lg border-2",
                                    formData.courseId === course.id ? "border-primary bg-primary/5" : "border-transparent"
                                )} onClick={() => setFormData(p => ({...p, courseId: course.id}))}>
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start">
                                            <Badge variant="secondary" className="text-[10px] font-black uppercase">{course.ministryName}</Badge>
                                            {formData.courseId === course.id && <CheckCircle className="size-5 text-primary" />}
                                        </div>
                                        <CardTitle className="text-lg font-bold mt-2">{course.name}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-xs text-muted-foreground line-clamp-2">{course.description}</p>
                                    </CardContent>
                                    <CardFooter className="pt-0">
                                        <Button variant={formData.courseId === course.id ? "default" : "ghost"} className="w-full text-xs font-bold">
                                            {formData.courseId === course.id ? "Selecionado" : "Selecionar para Inscrição"}
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    )}

                    <Card className="max-w-2xl mx-auto shadow-2xl border-none rounded-[2rem] overflow-hidden">
                        <CardHeader className="bg-primary text-white p-8">
                            <CardTitle className="text-2xl font-black uppercase italic">Formulário de Inscrição</CardTitle>
                            <CardDescription className="text-white/80">Preencha seus dados para que possamos entrar em contato.</CardDescription>
                        </CardHeader>
                        <form onSubmit={handleSubmit}>
                            <CardContent className="p-8 space-y-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-black text-muted-foreground">Curso Selecionado</Label>
                                    <div className="p-4 bg-muted/50 rounded-xl border-2 border-dashed flex items-center justify-between">
                                        <span className="font-bold text-slate-700">
                                            {courses?.find(c => c.id === formData.courseId)?.name || "Selecione um curso acima"}
                                        </span>
                                        {!formData.courseId && <Info className="size-4 text-amber-500" />}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-black text-muted-foreground">Seu Nome Completo</Label>
                                        <Input required value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} placeholder="Como deseja ser chamado" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-black text-muted-foreground">Seu E-mail</Label>
                                        <Input required type="email" value={formData.email} onChange={e => setFormData(p => ({...p, email: e.target.value}))} placeholder="aluno@exemplo.com" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-black text-muted-foreground">WhatsApp (com DDD)</Label>
                                    <Input required value={formData.phone} onChange={e => setFormData(p => ({...p, phone: e.target.value}))} placeholder="(21) 9..." />
                                </div>
                            </CardContent>
                            <CardFooter className="p-8 bg-muted/20 border-t">
                                <Button type="submit" disabled={isSubmitting || !formData.courseId} className="w-full h-14 font-black text-lg uppercase tracking-widest shadow-xl">
                                    {isSubmitting ? <Loader2 className="mr-2 animate-spin" /> : <GraduationCap className="mr-2" />}
                                    Solicitar Matrícula
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                </TabsContent>

                <TabsContent value="events" className="animate-in fade-in-50 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <EventCard 
                            title="Jantar dos Namorados 2026"
                            description="O Riso que Restaura - Uma noite de comunhão e risadas para casais com show de Stand-up."
                            date="12 de Junho, 2026"
                            href="/eventos/jantar-dos-namorados"
                            icon={HeartHandshake}
                        />
                        <div className="border-2 border-dashed rounded-3xl flex flex-col items-center justify-center p-12 text-center bg-muted/10 opacity-50">
                            <Sparkles className="size-12 text-muted-foreground mb-4" />
                            <h3 className="font-bold text-slate-400 uppercase tracking-widest text-sm">Novos Eventos</h3>
                            <p className="text-xs text-muted-foreground mt-2">Em breve anunciaremos as próximas conferências.</p>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default function EnrollmentPage() {
    return (
        <main className="min-h-screen bg-[#F8F9FA] py-12 md:py-20 px-4">
            <div className="max-w-6xl mx-auto">
                <Suspense fallback={<div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary size-10" /></div>}>
                    <EnrollmentPortal />
                </Suspense>
            </div>
        </main>
    );
}
