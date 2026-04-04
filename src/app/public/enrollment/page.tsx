
'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useVolunteering, VolunteeringProvider } from '@/contexts/volunteering-context';
import { useFirebase } from '@/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    Loader2, 
    Send, 
    CheckCircle, 
    BookOpen, 
    Calendar, 
    GraduationCap, 
    Search,
    ChevronRight,
    School,
    Waves,
    HandHelping,
    Lightbulb,
    Sparkles,
    Music,
    Users
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons';
import { cn } from '@/lib/utils';
import Link from 'next/link';

function EnrollmentPortal() {
    const searchParams = useSearchParams();
    const initialCourseId = searchParams.get('courseId');
    const { firestore } = useFirebase();
    const { courses, classes, isLoading } = useVolunteering();
    const { toast } = useToast();
    
    const [activeMainTab, setActiveMainTab] = useState('ensino');
    const [activeEnsinoTab, setActiveEnsinoTab] = useState('lumine');
    const [activeLumineTrack, setActiveLumineTrack] = useState('all');
    
    const [isSaving, setIsSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [formData, setFormData] = useState({
        courseId: initialCourseId || '',
        name: '',
        email: '',
        phone: '',
    });

    const filteredCourses = useMemo(() => {
        if (!courses) return [];
        let filtered = courses;

        if (activeEnsinoTab === 'lumine') {
            filtered = filtered.filter(c => c.ministryName?.toLowerCase().includes('lumine') || c.ministryName?.toLowerCase().includes('ebd'));
            if (activeLumineTrack !== 'all') {
                filtered = filtered.filter(c => c.ebdTrack === activeLumineTrack);
            }
        } else if (activeEnsinoTab === 'escolas') {
            filtered = filtered.filter(c => c.ministryName?.toLowerCase().includes('wave') || c.ministryName?.toLowerCase().includes('dis'));
        } else {
            filtered = filtered.filter(c => 
                !c.ministryName?.toLowerCase().includes('lumine') && 
                !c.ministryName?.toLowerCase().includes('ebd') &&
                !c.ministryName?.toLowerCase().includes('wave') &&
                !c.ministryName?.toLowerCase().includes('dis')
            );
        }

        if (searchTerm) {
            filtered = filtered.filter(c => 
                c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                c.description.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        return filtered;
    }, [courses, activeEnsinoTab, activeLumineTrack, searchTerm]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.email || !formData.courseId || !firestore) return;

        setIsSaving(true);
        try {
            await addDoc(collection(firestore, 'enrollment_requests'), {
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
            <div className="max-w-md mx-auto text-center p-8 animate-in zoom-in-95 duration-500">
                <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner mb-6">
                    <CheckCircle size={40} />
                </div>
                <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 mb-4">Interesse Registrado!</h2>
                <p className="text-muted-foreground mb-8 font-medium">
                    Recebemos sua solicitação. O responsável pelo curso entrará em contato com você via WhatsApp em breve para efetivar sua matrícula.
                </p>
                <Button onClick={() => window.location.reload()} variant="outline" className="w-full font-bold h-12 rounded-xl">Voltar ao Catálogo</Button>
            </div>
        );
    }

    return (
        <div className="space-y-12">
            {/* Header */}
            <div className="text-center space-y-4">
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 py-1 px-4 text-xs font-black uppercase tracking-[0.2em]">OikoApp • Matrículas</Badge>
                <h1 className="text-4xl md:text-7xl font-black italic tracking-tighter uppercase text-slate-900 leading-[0.9]">
                    Garanta sua <br/><span className="text-primary">Próxima Etapa</span>
                </h1>
                <p className="text-muted-foreground text-sm md:text-lg max-w-2xl mx-auto font-medium">
                    Selecione abaixo a escola ou evento estratégico que deseja participar e inicie sua jornada.
                </p>
            </div>

            {/* Main Navigation */}
            <div className="flex flex-col items-center gap-8">
                <div className="bg-muted/50 p-1.5 rounded-2xl border flex gap-2 w-full max-w-xs shadow-inner">
                    <button 
                        onClick={() => setActiveMainTab('ensino')}
                        className={cn(
                            "flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                            activeMainTab === 'ensino' ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-slate-900"
                        )}
                    >
                        Ensino
                    </button>
                    <button 
                        onClick={() => setActiveMainTab('eventos')}
                        className={cn(
                            "flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                            activeMainTab === 'eventos' ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-slate-900"
                        )}
                    >
                        Eventos
                    </button>
                </div>

                {activeMainTab === 'ensino' ? (
                    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {/* Sub-tabs Ensino */}
                        <div className="flex justify-center gap-4 flex-wrap">
                            {[
                                { id: 'lumine', label: 'Escola Lumine', icon: Lightbulb },
                                { id: 'escolas', label: 'Escolas Wave & DIS', icon: School },
                                { id: 'ministerios', label: 'Ministérios', icon: Users },
                            ].map(tab => (
                                <Button
                                    key={tab.id}
                                    variant={activeEnsinoTab === tab.id ? 'default' : 'outline'}
                                    onClick={() => setActiveEnsinoTab(tab.id)}
                                    className={cn(
                                        "rounded-full px-6 font-bold h-10 uppercase text-[10px] tracking-widest",
                                        activeEnsinoTab === tab.id ? "shadow-lg shadow-primary/20" : "bg-white"
                                    )}
                                >
                                    <tab.icon className="mr-2 size-3" />
                                    {tab.label}
                                </Button>
                            ))}
                        </div>

                        {/* Lumine Specific Tracks */}
                        {activeEnsinoTab === 'lumine' && (
                            <div className="flex justify-center gap-2 flex-wrap animate-in fade-in duration-300">
                                {[
                                    { id: 'all', label: 'Todos os Trilhos' },
                                    { id: 'teologico', label: 'Trilho Teológico' },
                                    { id: 'biblico', label: 'Trilho Bíblico' },
                                    { id: 'discipulado', label: 'Trilho de Discipulado' },
                                ].map(track => (
                                    <button
                                        key={track.id}
                                        onClick={() => setActiveLumineTrack(track.id)}
                                        className={cn(
                                            "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-tighter border transition-all",
                                            activeLumineTrack === track.id ? "bg-primary/10 border-primary text-primary" : "bg-white border-slate-200 text-muted-foreground hover:border-slate-300"
                                        )}
                                    >
                                        {track.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Search & Grid */}
                        <div className="space-y-6">
                            <div className="relative max-w-md mx-auto">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Buscar curso por nome..." 
                                    className="pl-10 h-12 rounded-2xl bg-white border-2 border-slate-100 focus:border-primary shadow-sm"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            {isLoading ? (
                                <div className="flex justify-center py-20"><Loader2 className="animate-spin size-8 text-primary opacity-20" /></div>
                            ) : filteredCourses.length === 0 ? (
                                <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed">
                                    <BookOpen className="size-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                                    <p className="text-muted-foreground font-bold">Nenhum curso encontrado nesta categoria.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredCourses.map(course => (
                                        <Card 
                                            key={course.id} 
                                            className={cn(
                                                "group cursor-pointer transition-all duration-500 hover:shadow-2xl border-none rounded-[2rem] overflow-hidden relative",
                                                formData.courseId === course.id ? "ring-2 ring-primary bg-primary/5" : "bg-white"
                                            )}
                                            onClick={() => setFormData(p => ({...p, courseId: course.id}))}
                                        >
                                            <CardContent className="p-8 space-y-4">
                                                <div className="flex justify-between items-start">
                                                    <div className="p-3 bg-slate-50 rounded-2xl text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                                        <BookOpen size={24} />
                                                    </div>
                                                    <Badge variant="secondary" className="text-[10px] font-black uppercase">{course.ministryName}</Badge>
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-black uppercase tracking-tighter italic leading-none mb-2">{course.name}</h3>
                                                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed font-medium">{course.description}</p>
                                                </div>
                                                <div className="pt-4 flex items-center justify-between">
                                                    <span className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-1">
                                                        {formData.courseId === course.id ? <CheckCircle size={14} /> : <div className="size-3.5 rounded-full border-2 border-primary/30" />}
                                                        {formData.courseId === course.id ? "Selecionado" : "Selecionar"}
                                                    </span>
                                                    <ChevronRight className="size-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="w-full max-w-4xl animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <Card className="border-none shadow-2xl rounded-[3rem] overflow-hidden bg-rose-600 text-white relative">
                            <div className="absolute top-0 right-0 p-12 opacity-10">
                                <Logo className="size-64" />
                            </div>
                            <CardContent className="p-12 md:p-20 space-y-8 relative z-10">
                                <Badge className="bg-white/20 text-white border-white/30 text-xs font-black uppercase tracking-[0.3em]">Evento em Destaque</Badge>
                                <h2 className="text-5xl md:text-7xl font-black italic tracking-tighter uppercase leading-[0.9]">Jantar dos <br/><span className="text-rose-200">Namorados 2026</span></h2>
                                <p className="text-xl md:text-2xl text-rose-50/80 font-medium max-w-xl leading-relaxed">O Riso que Restaura - Stand Up com Welson Nunes e Menu Gourmet AR Eventos.</p>
                                <div className="pt-4">
                                    <Button asChild size="lg" className="bg-white text-rose-600 hover:bg-rose-50 h-16 px-12 rounded-2xl font-black text-lg uppercase tracking-widest shadow-xl">
                                        <Link href="/eventos/jantar-dos-namorados">
                                            Ver Página e Ingressos
                                        </Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>

            {/* Application Form */}
            {activeMainTab === 'ensino' && (
                <section className="pt-12 border-t border-slate-200">
                    <div className="max-w-xl mx-auto space-y-8">
                        <div className="text-center">
                            <h3 className="text-2xl font-black uppercase italic tracking-tighter">Formulário de Protocolo</h3>
                            <p className="text-sm text-muted-foreground font-medium">Preencha seus dados para que a coordenação efetive sua vaga.</p>
                        </div>

                        <Card className="shadow-2xl border-none rounded-[2.5rem] overflow-hidden">
                            <form onSubmit={handleSave}>
                                <CardContent className="p-8 space-y-6">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Nome Completo *</Label>
                                        <Input required value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} className="h-12 rounded-xl" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">E-mail *</Label>
                                            <Input required type="email" value={formData.email} onChange={e => setFormData(p => ({...p, email: e.target.value}))} className="h-12 rounded-xl" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">WhatsApp *</Label>
                                            <Input required value={formData.phone} onChange={e => setFormData(p => ({...p, phone: e.target.value}))} className="h-12 rounded-xl" placeholder="(21) 9..." />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Curso Escolhido</Label>
                                        <div className="p-4 bg-muted/30 rounded-xl border border-dashed text-sm font-bold text-slate-900">
                                            {courses.find(c => c.id === formData.courseId)?.name || "Nenhum curso selecionado nos cards acima."}
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="p-8 bg-slate-50 border-t flex flex-col gap-4">
                                    <Button type="submit" disabled={isSaving || !formData.courseId} className="w-full h-16 font-black text-lg uppercase tracking-[0.2em] shadow-xl rounded-2xl">
                                        {isSaving ? <Loader2 className="mr-2 animate-spin" /> : <Send className="mr-2" />}
                                        Enviar Solicitação
                                    </Button>
                                    <p className="text-[10px] text-center text-muted-foreground uppercase font-bold tracking-tight">Igreja Batista da Manhã • Ano da Visão</p>
                                </CardFooter>
                            </form>
                        </Card>
                    </div>
                </section>
            )}
        </div>
    );
}

export default function EnrollmentPage() {
    return (
        <main className="min-h-screen bg-[#F8F9FA] py-12 md:py-24 px-4">
            <VolunteeringProvider>
                <Suspense fallback={<div className="flex justify-center p-20"><Loader2 className="animate-spin size-8 text-primary opacity-20" /></div>}>
                    <EnrollmentPortal />
                </Suspense>
            </VolunteeringProvider>
        </main>
    );
}
