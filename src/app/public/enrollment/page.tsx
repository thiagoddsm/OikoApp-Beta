
'use client';

import React, { useState, useMemo } from 'react';
import { useFirebase, useCollection, addDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { collection, query, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
    Loader2, 
    ChevronRight, 
    ArrowLeft, 
    CheckCircle2, 
    BookOpen, 
    Waves, 
    Lightbulb, 
    School, 
    HandHelping,
    UserPlus,
    Smartphone,
    Mail,
    ChevronLeft
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/icons';
import Link from 'next/link';

type Course = {
    id: string;
    name: string;
    description: string;
    ministryName: string;
};

const schoolIcons: Record<string, React.ElementType> = {
    'wave': Waves,
    'lumine': Lightbulb,
    'ebd': Lightbulb,
    'college': School,
    'dis': HandHelping,
    'default': BookOpen
};

export default function PublicEnrollmentPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    
    // Step State
    const [step, setStep] = useState<'school' | 'course' | 'form' | 'success'>('school');
    const [selectedSchool, setSelectedSchool] = useState<string | null>(null);
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
    
    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        dataNascimento: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch Courses
    const coursesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'courses')) : null, [firestore]);
    const { data: courses, isLoading } = useCollection<Course>(coursesQuery);

    // Filter Schools
    const schools = useMemo(() => {
        if (!courses) return [];
        const uniqueSchools = Array.from(new Set(courses.map(c => c.ministryName)));
        return uniqueSchools.sort();
    }, [courses]);

    // Filter Courses by School
    const filteredCourses = useMemo(() => {
        if (!courses || !selectedSchool) return [];
        return courses.filter(c => c.ministryName === selectedSchool);
    }, [courses, selectedSchool]);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCourseId || !firestore) return;

        setIsSubmitting(true);
        try {
            await addDocumentNonBlocking(collection(firestore, 'enrollment_requests'), {
                ...formData,
                courseId: selectedCourseId,
                status: 'pending',
                createdAt: Timestamp.now()
            });
            setStep('success');
        } catch (error) {
            toast({ variant: 'destructive', title: "Erro ao enviar", description: "Tente novamente mais tarde." });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4">
            <Link href="/" className="flex items-center gap-2 mb-12 hover:opacity-80 transition-opacity">
                <Logo className="size-8 text-primary" />
                <h1 className="text-2xl font-black tracking-tighter">OikoApp</h1>
            </Link>

            <div className="w-full max-w-xl">
                {step === 'school' && (
                    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                        <div className="text-center mb-10">
                            <h2 className="text-3xl font-black text-slate-900">Escolha sua Escola</h2>
                            <p className="text-muted-foreground mt-2">Selecione o departamento de ensino para ver os cursos.</p>
                        </div>
                        <div className="grid gap-4">
                            {schools.map(school => {
                                const Icon = schoolIcons[school.toLowerCase()] || schoolIcons.default;
                                return (
                                    <button 
                                        key={school}
                                        onClick={() => { setSelectedSchool(school); setStep('course'); }}
                                        className="flex items-center justify-between p-6 bg-white rounded-2xl border-2 border-transparent hover:border-primary hover:shadow-xl transition-all group text-left"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-primary/10 rounded-xl text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                                <Icon size={28} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-slate-900">{school}</h3>
                                                <p className="text-xs text-muted-foreground uppercase tracking-widest font-black">Portal IBM</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="text-slate-300 group-hover:text-primary transition-transform group-hover:translate-x-1" />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {step === 'course' && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        <button onClick={() => setStep('school')} className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition-colors mb-4">
                            <ChevronLeft size={16} /> Voltar para Escolas
                        </button>
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-black text-slate-900">{selectedSchool}</h2>
                            <p className="text-muted-foreground">Qual curso você deseja realizar?</p>
                        </div>
                        <div className="grid gap-3">
                            {filteredCourses.map(course => (
                                <button 
                                    key={course.id}
                                    onClick={() => { setSelectedCourseId(course.id); setStep('form'); }}
                                    className="flex flex-col p-5 bg-white rounded-xl border border-slate-200 hover:border-primary hover:shadow-md transition-all text-left group"
                                >
                                    <h3 className="font-bold text-slate-900 group-hover:text-primary transition-colors">{course.name}</h3>
                                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{course.description}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {step === 'form' && (
                    <Card className="animate-in slide-in-from-right-4 duration-300 shadow-2xl border-none rounded-3xl">
                        <CardHeader>
                            <button onClick={() => setStep('course')} className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors mb-4">
                                <ChevronLeft size={14} /> Voltar para Cursos
                            </button>
                            <CardTitle>Dados de Inscrição</CardTitle>
                            <CardDescription>
                                Preencha os campos abaixo para solicitar sua matrícula em <strong>{courses?.find(c => c.id === selectedCourseId)?.name}</strong>.
                            </CardDescription>
                        </CardHeader>
                        <form onSubmit={handleSubmit}>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nome Completo</Label>
                                    <div className="relative">
                                        <UserPlus className="absolute left-3 top-3 size-4 text-muted-foreground" />
                                        <Input id="name" name="name" className="pl-10" required value={formData.name} onChange={handleFormChange} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">WhatsApp (com DDD)</Label>
                                        <div className="relative">
                                            <Smartphone className="absolute left-3 top-3 size-4 text-muted-foreground" />
                                            <Input id="phone" name="phone" className="pl-10" required value={formData.phone} onChange={handleFormChange} placeholder="(21) 9..." />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="dataNascimento">Data de Nascimento</Label>
                                        <Input id="dataNascimento" name="dataNascimento" type="date" required value={formData.dataNascimento} onChange={handleFormChange} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">E-mail (Opcional)</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 size-4 text-muted-foreground" />
                                        <Input id="email" name="email" type="email" className="pl-10" value={formData.email} onChange={handleFormChange} />
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button type="submit" className="w-full h-12 font-bold text-base" disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : "Solicitar Matrícula"}
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                )}

                {step === 'success' && (
                    <div className="text-center space-y-6 animate-in zoom-in-95 duration-500 bg-white p-12 rounded-3xl shadow-2xl border-t-8 border-primary">
                        <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle2 size={48} />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900">Solicitação Enviada!</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Obrigado pelo seu interesse! A equipe do <strong>{selectedSchool}</strong> recebeu sua solicitação e entrará em contato via WhatsApp para confirmar sua turma e horários.
                        </p>
                        <Button asChild className="w-full h-12 font-bold" variant="outline">
                            <Link href="/">Voltar ao Início</Link>
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
