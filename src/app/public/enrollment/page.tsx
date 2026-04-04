
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    Loader2, BookOpen, Calendar, CheckCircle, 
    ChevronRight, Waves, Lightbulb, School, HandHelping,
    ArrowRight, Star, Heart, Sparkles, Send, Phone, Mail, User
} from 'lucide-react';
import { PublicNavbar } from '@/components/public/navbar';
import { PublicFooter } from '@/components/public/footer';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

type Course = {
  id: string;
  name: string;
  description: string;
  ministryName: string;
  type?: 'trilho' | 'eletivo';
};

function CourseCard({ course, isSelected, onClick }: { course: Course, isSelected: boolean, onClick: () => void }) {
    const getMinistryIcon = (name: string) => {
        const n = name?.toLowerCase() || '';
        if (n.includes('wave')) return Waves;
        if (n === 'dis') return HandHelping;
        if (n.includes('lumine')) return Lightbulb;
        if (n.includes('college') || n.includes('escola')) return School;
        return BookOpen;
    };

    const Icon = getMinistryIcon(course.ministryName);

    return (
        <Card 
            className={cn(
                "cursor-pointer transition-all duration-300 hover:shadow-md border-2",
                isSelected ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-transparent bg-white"
            )}
            onClick={onClick}
        >
            <CardContent className="p-5 flex items-center gap-4">
                <div className={cn(
                    "p-3 rounded-xl transition-colors",
                    isSelected ? "bg-primary text-white" : "bg-muted text-primary"
                )}>
                    <Icon size={24} />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="font-black text-sm uppercase tracking-tight text-slate-900 truncate">{course.name}</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">{course.ministryName}</p>
                </div>
                {isSelected && <CheckCircle className="text-primary size-5 shrink-0" />}
            </CardContent>
        </Card>
    );
}

export default function EnrollmentPage() {
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

    const coursesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'courses')) : null, [firestore]);
    const { data: courses, isLoading } = useCollection<Course>(coursesQuery);

    const filteredCourses = useMemo(() => {
        if (!courses) return [];
        return courses.sort((a, b) => a.name.localeCompare(b.name));
    }, [courses]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.phone || !formData.courseId || !firestore) return;

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
            toast({ variant: 'destructive', title: "Erro ao enviar", description: "Ocorreu uma falha técnica. Tente novamente." });
        } finally {
            setIsSaving(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
                <PublicNavbar />
                <main className="flex-1 flex items-center justify-center p-4">
                    <Card className="max-w-md w-full text-center p-8 animate-in zoom-in-95 duration-500 rounded-[2.5rem] shadow-2xl border-none">
                        <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner mb-6">
                            <CheckCircle size={40} />
                        </div>
                        <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 mb-4">Interesse Registrado!</h2>
                        <p className="text-muted-foreground mb-8 leading-relaxed">
                            Recebemos sua solicitação de matrícula. Em breve, o responsável pelo curso entrará em contato com você via WhatsApp para confirmar os detalhes.
                        </p>
                        <Button onClick={() => window.location.reload()} variant="outline" className="w-full font-black uppercase h-12 rounded-xl">Voltar ao Portal</Button>
                    </Card>
                </main>
                <PublicFooter />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans">
            <PublicNavbar />

            <main className="flex-1 py-12 md:py-20 px-4">
                <div className="max-w-6xl mx-auto space-y-12">
                    <div className="text-center space-y-4">
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 py-1 px-4 text-xs font-black uppercase tracking-[0.2em]">Inscrições Abertas</Badge>
                        <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase text-slate-900 leading-[0.9]">O Riso que Restaura <br/><span className="text-primary">& Trilhas de Crescimento</span></h1>
                        <p className="text-muted-foreground text-sm md:text-lg max-w-2xl mx-auto">Garanta sua vaga nos próximos eventos estratégicos e cursos de capacitação da IBM.</p>
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <div className="flex justify-center mb-8">
                            <TabsList className="bg-white p-1 rounded-2xl shadow-sm border border-slate-100 h-14 w-full max-w-md">
                                <TabsTrigger value="courses" className="rounded-xl font-black uppercase text-xs tracking-widest flex-1 data-[state=active]:bg-primary data-[state=active]:text-white">Escolas & Cursos</TabsTrigger>
                                <TabsTrigger value="events" className="rounded-xl font-black uppercase text-xs tracking-widest flex-1 data-[state=active]:bg-primary data-[state=active]:text-white">Eventos</TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="courses" className="animate-in fade-in-50 duration-500">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                                {/* Lista de Cursos */}
                                <div className="lg:col-span-2 space-y-6">
                                    <h3 className="text-xl font-black uppercase italic tracking-tight flex items-center gap-2">
                                        <BookOpen className="text-primary" /> Escolha seu curso
                                    </h3>
                                    {isLoading ? (
                                        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary size-10" /></div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {filteredCourses.map(course => (
                                                <CourseCard 
                                                    key={course.id} 
                                                    course={course} 
                                                    isSelected={formData.courseId === course.id}
                                                    onClick={() => setFormData(p => ({...p, courseId: course.id}))}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Formulário de Inscrição */}
                                <Card className="shadow-2xl border-none rounded-[2rem] h-fit sticky top-24 overflow-hidden">
                                    <CardHeader className="bg-primary text-white p-8">
                                        <CardTitle className="text-xl font-black uppercase italic tracking-tighter">Ficha de Matrícula</CardTitle>
                                        <CardDescription className="text-primary-foreground/80 font-medium">Preencha seus dados para contato.</CardDescription>
                                    </CardHeader>
                                    <form onSubmit={handleSave}>
                                        <CardContent className="p-8 space-y-5">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] uppercase font-black text-muted-foreground flex items-center gap-1.5"><User size={12}/> Seu Nome Completo</Label>
                                                <Input required value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} className="h-11 bg-slate-50 border-slate-200" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] uppercase font-black text-muted-foreground flex items-center gap-1.5"><Phone size={12}/> Celular/WhatsApp</Label>
                                                <Input required value={formData.phone} onChange={e => setFormData(p => ({...p, phone: e.target.value}))} placeholder="(21) 9..." className="h-11 bg-slate-50 border-slate-200" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] uppercase font-black text-muted-foreground flex items-center gap-1.5"><Mail size={12}/> E-mail</Label>
                                                <Input required type="email" value={formData.email} onChange={e => setFormData(p => ({...p, email: e.target.value}))} className="h-11 bg-slate-50 border-slate-200" />
                                            </div>
                                            
                                            {!formData.courseId && (
                                                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3 animate-pulse">
                                                    <Sparkles className="size-5 text-amber-600 mt-0.5" />
                                                    <p className="text-[11px] text-amber-800 font-bold uppercase leading-tight">Selecione um curso na lista ao lado para habilitar o envio.</p>
                                                </div>
                                            )}
                                        </CardContent>
                                        <CardFooter className="p-8 pt-0">
                                            <Button type="submit" disabled={isSaving || !formData.courseId} className="w-full h-14 font-black uppercase text-sm tracking-widest shadow-xl">
                                                {isSaving ? <Loader2 className="mr-2 animate-spin" /> : <Send className="mr-2 size-4" />}
                                                Solicitar Inscrição
                                            </Button>
                                        </CardFooter>
                                    </form>
                                </Card>
                            </div>
                        </TabsContent>

                        <TabsContent value="events" className="animate-in fade-in-50 duration-500">
                            <div className="max-w-4xl mx-auto space-y-8">
                                <Card className="border-none shadow-2xl overflow-hidden rounded-[2.5rem] bg-indigo-950 text-white group">
                                    <div className="grid grid-cols-1 md:grid-cols-2">
                                        <div className="relative h-64 md:h-full overflow-hidden">
                                            <img 
                                                src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=1200&auto=format&fit=crop" 
                                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                                alt="Jantar Namorados" 
                                            />
                                            <div className="absolute inset-0 bg-indigo-950/40" />
                                            <div className="absolute top-6 left-6">
                                                <Badge className="bg-rose-600 text-white border-none font-black uppercase px-3 py-1 text-[10px]">Destaque do Mês</Badge>
                                            </div>
                                        </div>
                                        <div className="p-8 md:p-12 space-y-6">
                                            <div className="space-y-2">
                                                <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter leading-none">Jantar dos <br/><span className="text-rose-500">Namorados</span></h2>
                                                <p className="text-indigo-200 font-medium">O Riso que Restaura - Show de Stand-Up & Menu Gourmet</p>
                                            </div>
                                            <div className="flex flex-col gap-3">
                                                <div className="flex items-center gap-3 text-sm font-bold text-white/80">
                                                    <Calendar className="size-5 text-rose-500" /> 12 de Junho • 19h30
                                                </div>
                                                <div className="flex items-center gap-3 text-sm font-bold text-white/80">
                                                    <Star className="size-5 text-rose-500" /> Templo IBM • Mutondo
                                                </div>
                                            </div>
                                            <Button asChild className="w-full h-14 bg-rose-600 hover:bg-rose-700 font-black uppercase tracking-widest text-sm rounded-2xl shadow-xl shadow-rose-900/40">
                                                <Link href="/eventos/jantar-dos-namorados">
                                                    Ver Detalhes & Reservar <ArrowRight className="ml-2 size-5" />
                                                </Link>
                                            </Button>
                                        </div>
                                    </div>
                                </Card>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Card className="p-8 rounded-[2rem] border-none shadow-xl bg-white flex flex-col justify-between">
                                        <div className="space-y-4">
                                            <div className="size-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shadow-sm"><Heart size={24}/></div>
                                            <h3 className="text-xl font-black uppercase italic tracking-tighter">Congresso de Família</h3>
                                            <p className="text-sm text-muted-foreground leading-relaxed">Em breve iniciaremos as inscrições para o maior congresso de casais e famílias da IBM.</p>
                                        </div>
                                        <Button variant="outline" className="mt-8 font-black uppercase text-[10px] tracking-widest h-10 rounded-xl" disabled>Em breve</Button>
                                    </Card>
                                    
                                    <Card className="p-8 rounded-[2rem] border-none shadow-xl bg-white flex flex-col justify-between">
                                        <div className="space-y-4">
                                            <div className="size-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-sm"><Waves size={24}/></div>
                                            <h3 className="text-xl font-black uppercase italic tracking-tighter">Batismo Wave</h3>
                                            <p className="text-sm text-muted-foreground leading-relaxed">Celebração de novos começos na praia. Se você deseja descer às águas, prepare-se.</p>
                                        </div>
                                        <Button variant="outline" className="mt-8 font-black uppercase text-[10px] tracking-widest h-10 rounded-xl" disabled>Em breve</Button>
                                    </Card>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </main>

            <PublicFooter />
        </div>
    );
}
