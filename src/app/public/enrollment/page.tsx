'use client';

import React, { useState, useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, addDoc, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
    BookOpen, 
    CheckCircle2, 
    Loader2, 
    Waves, 
    School, 
    Lightbulb, 
    HandHelping, 
    ArrowRight, 
    GraduationCap,
    Check
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PublicNavbar } from '@/components/public/navbar';
import { PublicFooter } from '@/components/public/footer';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

type Course = {
    id: string;
    name: string;
    description: string;
    ministryName: string;
    ebdTrack?: 'teologico' | 'biblico' | 'discipulado';
};

const getDiscipleshipWeight = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('pertencer')) return 1;
    if (lowerName.includes('crescer')) return 2;
    if (lowerName.includes('liderar')) return 3;
    if (lowerName.includes('cuidar')) return 4;
    if (lowerName.includes('apoiar')) return 5;
    if (lowerName.includes('enviar')) return 6;
    return 99;
};

export default function PublicEnrollmentPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        cpf: '',
        sexo: '',
        dataNascimento: '',
    });

    const coursesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'courses')) : null, [firestore]);
    const { data: courses, isLoading } = useCollection<Course>(coursesQuery);

    const groupedCourses = useMemo(() => {
        if (!courses) return {};
        const groups: Record<string, Course[]> = {};
        courses.forEach(c => {
            const m = c.ministryName || 'Geral';
            if (!groups[m]) groups[m] = [];
            groups[m].push(c);
        });

        // Sort discipleship track
        Object.keys(groups).forEach(m => {
            groups[m].sort((a, b) => {
                if (a.ebdTrack === 'discipulado' && b.ebdTrack === 'discipulado') {
                    return getDiscipleshipWeight(a.name) - getDiscipleshipWeight(b.name);
                }
                return a.name.localeCompare(b.name);
            });
        });

        return groups;
    }, [courses]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCourse || !firestore) return;

        setIsSubmitting(true);
        try {
            await addDoc(collection(firestore, 'enrollment_requests'), {
                ...formData,
                courseId: selectedCourse.id,
                status: 'pending',
                createdAt: Timestamp.now(),
            });
            setSuccess(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao enviar', description: 'Tente novamente em instantes.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const getMinistryIcon = (name: string) => {
        const n = name.toLowerCase();
        if (n.includes('wave')) return Waves;
        if (n === 'dis') return HandHelping;
        if (n.includes('lumine') || n.includes('ebd')) return Lightbulb;
        if (n.includes('college') || n.includes('escola')) return School;
        return BookOpen;
    };

    if (success) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col">
                <PublicNavbar />
                <main className="flex-1 container mx-auto px-4 py-20 flex items-center justify-center">
                    <Card className="max-w-md w-full text-center p-8 border-t-8 border-emerald-500 shadow-2xl animate-in zoom-in-95">
                        <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 size={48} />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 mb-4 italic tracking-tighter">SOLICITAÇÃO ENVIADA!</h2>
                        <p className="text-slate-600 leading-relaxed mb-8">
                            Sua pré-inscrição para o curso <strong>{selectedCourse?.name}</strong> foi recebida. 
                            Nossa equipe entrará em contato em breve para confirmar sua matrícula.
                        </p>
                        <Button size="lg" className="w-full font-bold" onClick={() => window.location.href = '/'}>
                            Voltar ao Início
                        </Button>
                    </Card>
                </main>
                <PublicFooter />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <PublicNavbar />
            
            <main className="flex-1 container mx-auto px-4 py-12 md:py-20">
                <div className="max-w-6xl mx-auto space-y-16">
                    
                    <header className="text-center space-y-4">
                        <Badge variant="outline" className="text-primary font-black px-4 py-1 uppercase tracking-widest border-primary/30">Crescimento & Ensino</Badge>
                        <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter text-slate-900 leading-none">
                            FAÇA PARTE DA <span className="text-primary">JORNADA.</span>
                        </h1>
                        <p className="text-slate-500 max-w-2xl mx-auto text-lg">
                            Escolha abaixo a escola ou trilho de discipulado que você deseja ingressar.
                        </p>
                    </header>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                        {/* Listagem de Cursos */}
                        <div className="lg:col-span-7 space-y-12">
                            {isLoading ? (
                                <div className="flex justify-center p-20"><Loader2 className="animate-spin size-10 text-primary" /></div>
                            ) : (
                                Object.entries(groupedCourses).sort(([a], [b]) => a.localeCompare(b)).map(([ministry, ministryCourses]) => {
                                    const Icon = getMinistryIcon(ministry);
                                    const isLumine = ministry.toLowerCase().includes('lumine') || ministry.toLowerCase().includes('ebd');

                                    return (
                                        <section key={ministry} className="space-y-6">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-xl shadow-slate-900/20">
                                                    <Icon size={28} />
                                                </div>
                                                <div>
                                                    <h3 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">{ministry}</h3>
                                                    {isLumine && <p className="text-[10px] font-black text-primary uppercase tracking-widest">Escola Bíblica Discipuladora</p>}
                                                </div>
                                            </div>

                                            {isLumine ? (
                                                <div className="pl-4 border-l-2 border-primary/10 ml-7 space-y-10">
                                                    {[
                                                        { id: 'discipulado', label: 'Trilho de Discipulado', list: ministryCourses.filter(c => c.ebdTrack === 'discipulado') },
                                                        { id: 'teologico', label: 'Trilho Teológico', list: ministryCourses.filter(c => c.ebdTrack === 'teologico') },
                                                        { id: 'biblico', label: 'Trilho Bíblico', list: ministryCourses.filter(c => c.ebdTrack === 'biblico') },
                                                        { id: 'other', label: 'Eletivos & Outros', list: ministryCourses.filter(c => !c.ebdTrack) }
                                                    ].map(track => track.list.length > 0 && (
                                                        <div key={track.id} className="space-y-4">
                                                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                                                <ArrowRight size={12} className="text-primary" />
                                                                {track.label}
                                                            </h4>
                                                            <div className="grid grid-cols-1 gap-3">
                                                                {track.list.map(course => (
                                                                    <button 
                                                                        key={course.id}
                                                                        onClick={() => setSelectedCourse(course)}
                                                                        className={cn(
                                                                            "text-left p-5 rounded-2xl border transition-all hover:shadow-lg group flex items-center justify-between",
                                                                            selectedCourse?.id === course.id ? "bg-primary border-primary text-white shadow-primary/20" : "bg-white border-slate-200 text-slate-900 hover:border-primary/50"
                                                                        )}
                                                                    >
                                                                        <div className="flex-1 pr-4">
                                                                            <p className="font-black text-lg italic uppercase tracking-tighter leading-tight">{course.name}</p>
                                                                            <p className={cn("text-xs mt-1 line-clamp-1", selectedCourse?.id === course.id ? "text-white/80" : "text-slate-500")}>
                                                                                {course.description || "Inicie sua jornada hoje."}
                                                                            </p>
                                                                        </div>
                                                                        <div className={cn(
                                                                            "size-10 rounded-full flex items-center justify-center transition-all",
                                                                            selectedCourse?.id === course.id ? "bg-white text-primary" : "bg-slate-100 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary"
                                                                        )}>
                                                                            {selectedCourse?.id === course.id ? <Check size={20} /> : <ArrowRight size={20} />}
                                                                        </div>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 gap-3">
                                                    {ministryCourses.map(course => (
                                                        <button 
                                                            key={course.id}
                                                            onClick={() => setSelectedCourse(course)}
                                                            className={cn(
                                                                "text-left p-5 rounded-2xl border transition-all hover:shadow-lg group flex items-center justify-between",
                                                                selectedCourse?.id === course.id ? "bg-primary border-primary text-white shadow-primary/20" : "bg-white border-slate-200 text-slate-900 hover:border-primary/50"
                                                            )}
                                                        >
                                                            <div className="flex-1 pr-4">
                                                                <p className="font-black text-lg italic uppercase tracking-tighter leading-tight">{course.name}</p>
                                                                <p className={cn("text-xs mt-1 line-clamp-1", selectedCourse?.id === course.id ? "text-white/80" : "text-slate-500")}>
                                                                    {course.description || "Clique para selecionar este curso."}
                                                                </p>
                                                            </div>
                                                            <div className={cn(
                                                                "size-10 rounded-full flex items-center justify-center",
                                                                selectedCourse?.id === course.id ? "bg-white text-primary" : "bg-slate-100 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary"
                                                            )}>
                                                                {selectedCourse?.id === course.id ? <Check size={20} /> : <ArrowRight size={20} />}
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </section>
                                    )
                                })
                            )}
                        </div>

                        {/* Formulário de Inscrição */}
                        <div className="lg:col-span-5">
                            <div className="sticky top-24">
                                <Card className="border-none shadow-2xl overflow-hidden rounded-[2.5rem]">
                                    <CardHeader className="bg-slate-900 text-white p-8">
                                        <div className="flex items-center gap-3 mb-2">
                                            <GraduationCap className="text-primary" size={32} />
                                            <CardTitle className="text-2xl font-black italic tracking-tighter">FICHA DE INSCRIÇÃO</CardTitle>
                                        </div>
                                        <CardDescription className="text-slate-400 font-medium">
                                            {selectedCourse 
                                                ? `Você está se inscrevendo no curso: ${selectedCourse.name}` 
                                                : "Selecione um curso ao lado para preencher seus dados."}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-8">
                                        <form onSubmit={handleSubmit} className="space-y-6">
                                            <div className="space-y-4">
                                                <div>
                                                    <Label htmlFor="name" className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Nome Completo</Label>
                                                    <Input name="name" required value={formData.name} onChange={handleInputChange} className="h-12 border-slate-200" disabled={!selectedCourse} />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <Label htmlFor="phone" className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Celular (WhatsApp)</Label>
                                                        <Input name="phone" required value={formData.phone} onChange={handleInputChange} placeholder="(99) 99999-9999" className="h-12 border-slate-200" disabled={!selectedCourse} />
                                                    </div>
                                                    <div>
                                                        <Label htmlFor="dataNascimento" className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Data Nascimento</Label>
                                                        <Input name="dataNascimento" type="date" value={formData.dataNascimento} onChange={handleInputChange} className="h-12 border-slate-200" disabled={!selectedCourse} />
                                                    </div>
                                                </div>
                                                <div>
                                                    <Label htmlFor="email" className="text-[10px] font-black uppercase text-slate-400 tracking-widest">E-mail</Label>
                                                    <Input name="email" type="email" value={formData.email} onChange={handleInputChange} className="h-12 border-slate-200" disabled={!selectedCourse} />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <Label htmlFor="cpf" className="text-[10px] font-black uppercase text-slate-400 tracking-widest">CPF</Label>
                                                        <Input name="cpf" value={formData.cpf} onChange={handleInputChange} placeholder="000.000.000-00" className="h-12 border-slate-200" disabled={!selectedCourse} />
                                                    </div>
                                                    <div>
                                                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Sexo</Label>
                                                        <Select onValueChange={(v) => setFormData({...formData, sexo: v})} disabled={!selectedCourse}>
                                                            <SelectTrigger className="h-12 border-slate-200"><SelectValue placeholder="Selecione..."/></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="Masculino">Masculino</SelectItem>
                                                                <SelectItem value="Feminino">Feminino</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                            </div>

                                            <Button 
                                                type="submit" 
                                                className="w-full h-14 text-lg font-black italic tracking-tighter shadow-xl shadow-primary/20" 
                                                disabled={!selectedCourse || isSubmitting}
                                            >
                                                {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : "QUERO ME INSCREVER AGORA"}
                                            </Button>
                                            
                                            {!selectedCourse && (
                                                <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest italic animate-pulse">
                                                    Selecione um curso para habilitar o formulário
                                                </p>
                                            )}
                                        </form>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <PublicFooter />
        </div>
    );
}
