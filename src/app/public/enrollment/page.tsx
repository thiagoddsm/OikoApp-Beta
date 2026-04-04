'use client';

import React, { useState, useMemo } from 'react';
import { PublicNavbar } from '@/components/public/navbar';
import { PublicFooter } from '@/components/public/footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
    Search, 
    BookOpen, 
    Calendar, 
    ChevronRight, 
    GraduationCap, 
    Music, 
    HeartHandshake, 
    Sparkles, 
    Lightbulb,
    Loader2,
    MapPin,
    Clock,
    Send
} from 'lucide-react';
import { useVolunteering, type Course, type VolunteeringEvent } from '@/contexts/volunteering-context';
import { cn } from '@/lib/utils';
import { useFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

function EnrollmentPortal() {
    const { courses, events, classes, isLoading } = useVolunteering();
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const [searchTerm, setSearchTerm] = useState('');
    const [mainTab, setMainTab] = useState('ensino');
    const [ensinoTab, setEnsinoTab] = useState('lumine');
    const [lumineTrack, setLumineTab] = useState('discipulado');
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: ''
    });

    // --- FILTRAGEM DE CURSOS ---
    const filteredCourses = useMemo(() => {
        let list = courses;
        if (searchTerm) {
            list = list.filter(c => 
                c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                c.description.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        return list;
    }, [courses, searchTerm]);

    const lumineCourses = useMemo(() => 
        filteredCourses.filter(c => c.ministryName?.toLowerCase().includes('lumine') || c.ebdTrack),
    [filteredCourses]);

    const escolasCourses = useMemo(() => 
        filteredCourses.filter(c => c.ministryName?.toLowerCase().includes('wave') || c.ministryName?.toLowerCase().includes('dis')),
    [filteredCourses]);

    const ministeriosCourses = useMemo(() => 
        filteredCourses.filter(c => 
            !c.ministryName?.toLowerCase().includes('lumine') && 
            !c.ministryName?.toLowerCase().includes('wave') && 
            !c.ministryName?.toLowerCase().includes('dis') &&
            !c.ebdTrack
        ),
    [filteredCourses]);

    const lumineByTrack = useMemo(() => ({
        teologico: lumineCourses.filter(c => c.ebdTrack === 'teologico'),
        biblico: lumineCourses.filter(c => c.ebdTrack === 'biblico'),
        discipulado: lumineCourses.filter(c => c.ebdTrack === 'discipulado' || c.name.toLowerCase().includes('pertencer') || c.name.toLowerCase().includes('crescer'))
    }), [lumineCourses]);

    const handleEnroll = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCourseId || !formData.name || !formData.email) return;

        setIsSubmitting(true);
        try {
            await addDocumentNonBlocking(collection(firestore!, 'enrollment_requests'), {
                ...formData,
                courseId: selectedCourseId,
                status: 'pending',
                createdAt: Timestamp.now()
            });
            toast({ title: "Solicitação Enviada!", description: "Em breve a coordenação entrará em contato." });
            setSelectedCourseId(null);
            setFormData({ name: '', email: '', phone: '' });
        } catch (err) {
            toast({ variant: 'destructive', title: "Erro ao enviar", description: "Tente novamente mais tarde." });
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderCourseCard = (course: Course) => {
        const hasClasses = classes.some(cls => cls.courseId === course.id);
        const isSelected = selectedCourseId === course.id;

        return (
            <Card 
                key={course.id} 
                className={cn(
                    "group transition-all duration-300 border-2 cursor-pointer relative overflow-hidden",
                    isSelected ? "border-primary ring-2 ring-primary/20 shadow-xl" : "hover:border-primary/30 hover:shadow-md"
                )}
                onClick={() => setSelectedCourseId(course.id)}
            >
                <CardHeader className="p-5">
                    <div className="flex justify-between items-start mb-2">
                        <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-muted/50 border-none">
                            {course.ministryName}
                        </Badge>
                        {isSelected && <Sparkles className="size-4 text-primary animate-pulse" />}
                    </div>
                    <CardTitle className="text-lg font-black uppercase italic tracking-tighter leading-tight group-hover:text-primary transition-colors">
                        {course.name}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-0">
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                        {course.description}
                    </p>
                </CardContent>
                <CardFooter className="p-5 pt-0 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {hasClasses ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 text-[10px] font-bold">Turmas Abertas</Badge>
                        ) : (
                            <Badge variant="secondary" className="text-[10px] font-bold">Lista de Espera</Badge>
                        )}
                    </div>
                    <ChevronRight className={cn("size-5 transition-all", isSelected ? "text-primary translate-x-1" : "text-muted-foreground/30")} />
                </CardFooter>
            </Card>
        );
    };

    if (isLoading) {
        return (
            <div className="flex flex-col min-h-screen items-center justify-center bg-white">
                <Loader2 className="size-12 animate-spin text-primary opacity-20" />
                <p className="mt-4 text-xs font-black uppercase tracking-[0.3em] text-slate-400">Carregando Portal...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-white font-body">
            <PublicNavbar />

            <main className="flex-1 py-16 px-4 sm:px-6">
                <div className="max-w-6xl mx-auto space-y-12">
                    {/* --- CABEÇALHO --- */}
                    <div className="text-center space-y-6">
                        <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter uppercase text-slate-950 leading-[0.85]">
                            Portal de <span className="text-primary">Inscrições</span>
                        </h1>
                        <p className="text-slate-500 text-lg max-w-xl mx-auto font-medium">
                            Escolha sua trilha de crescimento e torne-se parte ativa da nossa comunidade.
                        </p>
                        
                        {/* --- BUSCA --- */}
                        <div className="max-w-xl mx-auto relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input 
                                placeholder="Buscar por curso ou evento..." 
                                className="h-14 pl-12 rounded-full border-2 bg-slate-50/50 focus:bg-white transition-all text-lg shadow-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* --- ABAS PRINCIPAIS --- */}
                    <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
                        <div className="flex justify-center mb-12">
                            <TabsList className="bg-slate-100 p-1 rounded-full h-12">
                                <TabsTrigger value="ensino" className="rounded-full px-8 font-black uppercase text-xs tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-md">
                                    <GraduationCap className="size-4 mr-2" /> Ensino
                                </TabsTrigger>
                                <TabsTrigger value="evento" className="rounded-full px-8 font-black uppercase text-xs tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-md">
                                    <Calendar className="size-4 mr-2" /> Eventos
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="ensino" className="mt-0 animate-in fade-in duration-500">
                            <Tabs value={ensinoTab} onValueChange={setEnsinoTab} className="w-full">
                                <div className="flex justify-center mb-10">
                                    <TabsList className="bg-transparent border-b rounded-none h-10 w-full max-w-md justify-center gap-8">
                                        <TabsTrigger value="lumine" className="border-b-2 border-transparent rounded-none px-0 data-[state=active]:border-primary data-[state=active]:bg-transparent font-bold text-sm uppercase tracking-wider">Lumine</TabsTrigger>
                                        <TabsTrigger value="escolas" className="border-b-2 border-transparent rounded-none px-0 data-[state=active]:border-primary data-[state=active]:bg-transparent font-bold text-sm uppercase tracking-wider">Escolas</TabsTrigger>
                                        <TabsTrigger value="ministerios" className="border-b-2 border-transparent rounded-none px-0 data-[state=active]:border-primary data-[state=active]:bg-transparent font-bold text-sm uppercase tracking-wider">Ministérios</TabsTrigger>
                                    </TabsList>
                                </div>

                                {/* --- LUMINE --- */}
                                <TabsContent value="lumine" className="space-y-12">
                                    <Tabs value={lumineTrack} onValueChange={setLumineTab} className="w-full">
                                        <div className="flex justify-center mb-8">
                                            <TabsList className="bg-slate-50 p-1 rounded-xl">
                                                <TabsTrigger value="discipulado" className="rounded-lg px-6 font-bold text-xs uppercase">Trilho Discipulado</TabsTrigger>
                                                <TabsTrigger value="teologico" className="rounded-lg px-6 font-bold text-xs uppercase">Trilho Teológico</TabsTrigger>
                                                <TabsTrigger value="biblico" className="rounded-lg px-6 font-bold text-xs uppercase">Trilho Bíblico</TabsTrigger>
                                            </TabsList>
                                        </div>
                                        
                                        {['discipulado', 'teologico', 'biblico'].map(track => (
                                            <TabsContent key={track} value={track} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-2">
                                                {lumineByTrack[track as keyof typeof lumineByTrack].map(renderCourseCard)}
                                                {lumineByTrack[track as keyof typeof lumineByTrack].length === 0 && (
                                                    <div className="col-span-full py-20 text-center border-2 border-dashed rounded-3xl">
                                                        <p className="text-muted-foreground font-medium italic">Nenhum curso disponível neste trilho no momento.</p>
                                                    </div>
                                                )}
                                            </TabsContent>
                                        ))}
                                    </Tabs>
                                </TabsContent>

                                {/* --- ESCOLAS (WAVE/DIS) --- */}
                                <TabsContent value="escolas" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-2">
                                    {escolasCourses.map(renderCourseCard)}
                                </TabsContent>

                                {/* --- MINISTÉRIOS --- */}
                                <TabsContent value="ministerios" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-2">
                                    {ministeriosCourses.map(renderCourseCard)}
                                </TabsContent>
                            </Tabs>
                        </TabsContent>

                        {/* --- EVENTOS --- */}
                        <TabsContent value="evento" className="space-y-8 animate-in fade-in duration-500">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                <Card className="border-none shadow-xl bg-indigo-900 text-white overflow-hidden group">
                                    <div className="h-48 bg-[url('https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=800&auto=format&fit=crop')] bg-cover bg-center group-hover:scale-110 transition-transform duration-700 opacity-60" />
                                    <CardHeader className="p-6">
                                        <Badge className="w-fit bg-rose-600 text-white border-none font-black text-[10px] mb-2 uppercase">Destaque</Badge>
                                        <CardTitle className="text-2xl font-black italic uppercase tracking-tighter">Jantar dos Namorados 2026</CardTitle>
                                        <CardDescription className="text-indigo-200">O Riso que Restaura - Noite exclusiva para casais.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="px-6 pb-6">
                                        <div className="flex flex-col gap-2 text-sm">
                                            <div className="flex items-center gap-2 opacity-80"><Clock size={14}/> 12 de Junho, 19h30</div>
                                            <div className="flex items-center gap-2 opacity-80"><MapPin size={14}/> Templo IBM</div>
                                        </div>
                                        <Button className="w-full mt-6 bg-white text-indigo-900 font-black uppercase hover:bg-indigo-50" asChild>
                                            <a href="/eventos/jantar-dos-namorados">Ver Página do Evento</a>
                                        </Button>
                                    </CardContent>
                                </Card>
                                
                                {events.map(event => (
                                    <Card key={event.id} className="border-none shadow-lg hover:shadow-2xl transition-all">
                                        <CardHeader>
                                            <CardTitle className="text-xl font-black uppercase italic tracking-tighter">{event.name}</CardTitle>
                                            <CardDescription>Evento ministerial aberto para participação.</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex flex-col gap-2 text-sm text-muted-foreground font-medium">
                                                <div className="flex items-center gap-2"><Clock size={14}/> {event.time}</div>
                                                <div className="flex items-center gap-2"><MapPin size={14}/> {event.room || 'Auditório'}</div>
                                            </div>
                                            <Button variant="outline" className="w-full mt-6 font-bold uppercase text-xs" disabled>
                                                Saiba Mais
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </TabsContent>
                    </Tabs>

                    {/* --- FORMULÁRIO DE INSCRIÇÃO (STICKY MOBILE/SIDEBAR DESKTOP) --- */}
                    {selectedCourseId && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
                            <Card className="max-w-md w-full shadow-2xl rounded-[2rem] border-none overflow-hidden">
                                <CardHeader className="bg-primary p-8 text-white relative">
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => setSelectedCourseId(null)}
                                        className="absolute top-4 right-4 text-white hover:bg-white/20"
                                    >
                                        <X className="size-6" />
                                    </Button>
                                    <Badge className="bg-white/20 text-white border-none font-bold text-[10px] mb-2">QUASE LÁ!</Badge>
                                    <CardTitle className="text-2xl font-black uppercase italic tracking-tighter">Inscrição</CardTitle>
                                    <CardDescription className="text-white/70 font-medium">
                                        {courses.find(c => c.id === selectedCourseId)?.name}
                                    </CardDescription>
                                </CardHeader>
                                <form onSubmit={handleEnroll}>
                                    <CardContent className="p-8 space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Seu Nome Completo</Label>
                                            <Input required value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} placeholder="Como quer ser chamado" className="h-12" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Seu E-mail</Label>
                                            <Input required type="email" value={formData.email} onChange={e => setFormData(p => ({...p, email: e.target.value}))} placeholder="seu@email.com" className="h-12" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Celular / WhatsApp</Label>
                                            <Input required value={formData.phone} onChange={e => setFormData(p => ({...p, phone: e.target.value}))} placeholder="(21) 9..." className="h-12" />
                                        </div>
                                    </CardContent>
                                    <CardFooter className="p-8 bg-slate-50 border-t">
                                        <Button type="submit" disabled={isSubmitting} className="w-full h-14 font-black uppercase tracking-[0.2em] shadow-lg">
                                            {isSubmitting ? <Loader2 className="animate-spin" /> : <Send className="mr-2" />}
                                            Confirmar Interesse
                                        </Button>
                                    </CardFooter>
                                </form>
                            </Card>
                        </div>
                    )}
                </div>
            </main>

            <PublicFooter />
        </div>
    );
}

const X = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);

export default function EnrollmentPage() {
    const firebase = useFirebase();

    if (!firebase) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center bg-white space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
                <p className="text-muted-foreground text-xs font-black uppercase tracking-widest">Iniciando Portal...</p>
            </div>
        );
    }

    return <EnrollmentPortal />;
}
