'use client';

import React, { useState, useMemo } from 'react';
import { useFirebase, useCollection, addDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { collection, query, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, BookOpen, UserPlus, Phone, Mail, CalendarDays, ArrowRight, Heart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons';
import { cn } from "@/lib/utils";
import Link from 'next/link';

function EventCard({ title, date, desc, href, icon: Icon, colorClass }: any) {
    return (
        <Card className="border-none shadow-xl overflow-hidden group hover:translate-y-[-4px] transition-all duration-300">
            <div className={cn("h-2 w-full", colorClass)} />
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div className={cn("p-2 rounded-lg", colorClass.replace('bg-', 'bg-opacity-10 text-'))}>
                        <Icon size={24} />
                    </div>
                    <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-widest">Destaque</Badge>
                </div>
                <CardTitle className="text-xl font-black mt-4 uppercase italic tracking-tighter leading-none">{title}</CardTitle>
                <CardDescription className="flex items-center gap-1 font-bold text-primary mt-1">
                    <CalendarDays size={14} /> {date}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                    {desc}
                </p>
            </CardContent>
            <CardFooter className="pt-0 pb-6 px-6">
                <Button asChild className={cn("w-full font-black uppercase tracking-widest flex items-center gap-2", colorClass)}>
                    <Link href={href}>
                        Ver Página do Evento
                        <ArrowRight size={16} />
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
}

function Badge({ children, className, variant }: any) {
    return (
        <div className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            variant === 'secondary' ? "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80" : "text-foreground",
            className
        )}>
            {children}
        </div>
    );
}

function EnrollmentPortal() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    
    const [isSaving, setIsSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        courseId: '',
    });

    const coursesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'courses')) : null, [firestore]);
    const { data: courses, isLoading } = useCollection<any>(coursesQuery);

    const filteredCourses = useMemo(() => {
        if (!courses) return [];
        // Apenas cursos que possuem turmas vinculadas (idealmente) ou todos para a demo
        return courses.filter(c => c.name);
    }, [courses]);

    const handleEnroll = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.email || !formData.courseId || !firestore) return;

        setIsSaving(true);
        try {
            const requestsRef = collection(firestore, 'enrollment_requests');
            await addDocumentNonBlocking(requestsRef, {
                ...formData,
                status: 'pending',
                createdAt: Timestamp.now(),
            });
            setSuccess(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (e) {
            toast({ variant: 'destructive', title: "Erro ao processar", description: "Tente novamente em instantes." });
        } finally {
            setIsSaving(false);
        }
    };

    if (success) {
        return (
            <div className="max-w-md mx-auto text-center p-8 animate-in zoom-in-95 duration-500">
                <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner mb-6">
                    <CheckCircle size={40} />
                </div>
                <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 mb-4">Interesse Registrado!</h2>
                <p className="text-muted-foreground mb-8 leading-relaxed">
                    Recebemos sua solicitação de matrícula. Nossa equipe de ensino entrará em contato em breve via WhatsApp para confirmar sua turma.
                </p>
                <Button onClick={() => window.location.reload()} variant="outline" className="w-full font-bold">Voltar ao Início</Button>
            </div>
        );
    }

    return (
        <div className="space-y-16">
            {/* Eventos Estratégicos */}
            <section>
                <div className="flex items-center gap-3 mb-8">
                    <div className="h-8 w-1.5 bg-rose-600 rounded-full" />
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter">Eventos com <span className="text-rose-600">Inscrições Abertas</span></h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <EventCard 
                        title="Jantar dos Namorados 2026"
                        date="12 de Junho, 19h"
                        desc="Uma noite inesquecível com Stand-up de Welson Nunes e Menu Gourmet All-inclusive para casais."
                        href="/eventos/jantar-dos-namorados"
                        icon={Heart}
                        colorClass="bg-rose-600"
                    />
                </div>
            </section>

            {/* Cursos e Escolas */}
            <section>
                <div className="flex items-center gap-3 mb-8">
                    <div className="h-8 w-1.5 bg-primary rounded-full" />
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">Matrículas <span className="text-primary">Escolares</span></h2>
                </div>

                <form onSubmit={handleEnroll} className="space-y-8">
                    <Card className="shadow-2xl border-none overflow-hidden rounded-[2rem]">
                        <CardHeader className="bg-primary/5 p-8 border-b">
                            <CardTitle className="text-xl font-bold">Escolha seu Curso</CardTitle>
                            <CardDescription>Selecione uma das opções abaixo para iniciar sua jornada de crescimento.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8">
                            {isLoading ? (
                                <div className="flex justify-center p-12"><Loader2 className="animate-spin size-8 text-primary" /></div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredCourses.map(course => (
                                        <Card key={course.id} className={cn(
                                            "cursor-pointer transition-all hover:shadow-lg border-2",
                                            formData.courseId === course.id ? "border-primary bg-primary/5" : "border-transparent"
                                        )} onClick={() => setFormData(p => ({...p, courseId: course.id}))}>
                                            <CardContent className="p-6">
                                                <Badge className="mb-3 bg-primary/10 text-primary border-none text-[10px] font-black uppercase tracking-tighter">
                                                    {course.ministryName}
                                                </Badge>
                                                <h4 className="font-bold text-slate-900 mb-2 leading-tight">{course.name}</h4>
                                                <p className="text-xs text-muted-foreground line-clamp-2">{course.description}</p>
                                            </CardContent>
                                        </Card>
                                    ))}
                                    {filteredCourses.length === 0 && <p className="col-span-full text-center py-10 text-muted-foreground italic">Nenhum curso disponível para matrícula agora.</p>}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="shadow-2xl border-none overflow-hidden rounded-[2rem]">
                        <CardHeader className="bg-primary/5 p-8 border-b">
                            <CardTitle className="text-xl font-bold">Seus Dados de Contato</CardTitle>
                            <CardDescription>Precisamos dessas informações para confirmar sua vaga na turma.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-black text-muted-foreground">Nome Completo</Label>
                                    <div className="relative">
                                        <UserPlus className="absolute left-3 top-3 size-4 text-muted-foreground" />
                                        <Input required value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} className="pl-10" placeholder="Como quer ser chamado?" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-black text-muted-foreground">E-mail</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 size-4 text-muted-foreground" />
                                        <Input required type="email" value={formData.email} onChange={e => setFormData(p => ({...p, email: e.target.value}))} className="pl-10" placeholder="seu@email.com" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-black text-muted-foreground">WhatsApp (com DDD)</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-3 size-4 text-muted-foreground" />
                                        <Input required type="tel" value={formData.phone} onChange={e => setFormData(p => ({...p, phone: e.target.value}))} className="pl-10" placeholder="(21) 9..." />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="p-8 bg-muted/20 border-t">
                            <Button type="submit" disabled={isSaving || !formData.courseId} className="w-full h-14 font-black text-base uppercase tracking-widest shadow-xl">
                                {isSaving ? <Loader2 className="mr-2 animate-spin" /> : null}
                                Solicitar Matrícula
                            </Button>
                        </CardFooter>
                    </Card>
                </form>
            </section>
        </div>
    );
}

export default function EnrollmentPage() {
    return (
        <main className="min-h-screen bg-[#F8F9FA] pb-20">
            <nav className="h-20 flex items-center bg-white border-b sticky top-0 z-50">
                <div className="container mx-auto px-4 flex justify-between items-center">
                    <Link href="/" className="flex items-center gap-2">
                        <Logo className="size-8 text-primary" />
                        <span className="text-xl font-black italic tracking-tighter uppercase text-slate-900">Oiko<span className="text-primary">App</span></span>
                    </Link>
                    <Button variant="ghost" className="font-bold" asChild><Link href="/login">Área do Membro</Link></Button>
                </div>
            </nav>

            <header className="bg-slate-900 py-16 md:py-24 text-white">
                <div className="container mx-auto px-4 text-center">
                    <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-none mb-4">Portal de <span className="text-primary">Inscrições</span></h1>
                    <p className="text-slate-400 max-w-2xl mx-auto text-sm md:text-lg">Reserve sua vaga em nossos próximos cursos e eventos estratégicos.</p>
                </div>
            </header>

            <div className="container mx-auto px-4 -mt-10">
                <EnrollmentPortal />
            </div>
        </main>
    );
}
