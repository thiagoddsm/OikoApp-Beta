
'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, Timestamp, where } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
    BookOpen, 
    CheckCircle2, 
    Loader2, 
    ChevronRight, 
    ArrowLeft, 
    Users, 
    MessageSquare,
    Clock,
    UserPlus,
    X,
    AlertTriangle,
    ShieldAlert
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

type Course = {
  id: string;
  name: string;
  description: string;
  ministryName: string;
  ebdTrack?: string;
};

type Class = {
  id: string;
  courseId: string;
  name: string;
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

function EnrollmentForm({ course, onCancel }: { course: Course, onCancel: () => void }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.phone || !firestore) return;

        setIsSaving(true);
        try {
            await addDocumentNonBlocking(collection(firestore, 'enrollment_requests'), {
                ...formData,
                courseId: course.id,
                courseName: course.name,
                status: 'pending',
                createdAt: Timestamp.now(),
            });
            setSuccess(true);
            toast({ title: "Solicitação Enviada!", description: "Em breve nossa equipe entrará em contato." });
        } catch (error) {
            toast({ variant: 'destructive', title: "Erro ao enviar", description: "Tente novamente mais tarde." });
        } finally {
            setIsSaving(false);
        }
    };

    if (success) {
        return (
            <div className="text-center py-10 space-y-4">
                <div className="size-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 size={32} />
                </div>
                <h3 className="text-xl font-bold">Inscrição Protocolada!</h3>
                <p className="text-muted-foreground">Obrigado pelo seu interesse. Nossa secretaria ministerial analisará seu pedido em breve.</p>
                <Button onClick={onCancel} className="w-full">Voltar aos Cursos</Button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Seu Nome Completo *</Label>
                    <Input id="name" required value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} placeholder="Como deseja ser chamado" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="phone">WhatsApp / Celular *</Label>
                    <Input id="phone" required value={formData.phone} onChange={e => setFormData(p => ({...p, phone: e.target.value}))} placeholder="(21) 9..." />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" type="email" value={formData.email} onChange={e => setFormData(p => ({...p, email: e.target.value}))} placeholder="seu@email.com" />
                </div>
            </div>
            <div className="flex gap-3 pt-4">
                <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">Cancelar</Button>
                <Button type="submit" disabled={isSaving} className="flex-1">
                    {isSaving ? <Loader2 className="size-4 animate-spin mr-2" /> : <UserPlus className="size-4 mr-2" />}
                    Confirmar Inscrição
                </Button>
            </div>
        </form>
    );
}

function EnrollmentContent() {
    const { firestore } = useFirebase();
    const searchParams = useSearchParams();
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

    const coursesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'courses')) : null, [firestore]);
    const classesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'classes')) : null, [firestore]);

    const { data: courses, isLoading: isLoadingCourses } = useCollection<Course>(coursesQuery);
    const { data: classes, isLoading: isLoadingClasses } = useCollection<Class>(classesQuery);

    const sortedCourses = useMemo(() => {
        if (!courses) return [];
        return [...courses].sort((a, b) => {
            const weightA = getDiscipleshipWeight(a.name);
            const weightB = getDiscipleshipWeight(b.name);
            if (weightA !== weightB) return weightA - weightB;
            return a.name.localeCompare(b.name);
        });
    }, [courses]);

    const isLoading = isLoadingCourses || isLoadingClasses;

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="size-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4">
            <div className="max-w-6xl mx-auto space-y-10">
                <div className="text-center space-y-4">
                    <div className="flex justify-center mb-4">
                        <Link href="/" className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity">
                            <ArrowLeft size={16} /> Voltar ao Site
                        </Link>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 uppercase italic">
                        Inscrições IBM
                    </h1>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        Escolha seu próximo passo na trilha de crescimento. <br/> 
                        <span className="font-bold text-slate-900">Pertencer, Crescer, Liderar, Cuidar, Apoiar e Enviar.</span>
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sortedCourses.map(course => {
                        const hasClasses = classes?.some(cls => cls.courseId === course.id);
                        const isLumine = course.ministryName?.toLowerCase().includes('lumine') || course.ministryName?.toLowerCase().includes('ebd');

                        return (
                            <Card key={course.id} className={cn(
                                "flex flex-col h-full transition-all duration-300 relative overflow-hidden group",
                                !hasClasses ? "grayscale opacity-60 border-slate-200 bg-slate-50" : "hover:shadow-xl hover:-translate-y-1"
                            )}>
                                <CardHeader>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="p-2 bg-primary/5 rounded-lg text-primary">
                                            <BookOpen size={20} />
                                        </div>
                                        {isLumine && <Badge variant="secondary" className="text-[10px] font-black uppercase">Lumine</Badge>}
                                    </div>
                                    <CardTitle className="text-xl font-black uppercase italic tracking-tighter text-slate-900">
                                        {course.name}
                                    </CardTitle>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Clock size={12} className="text-muted-foreground" />
                                        <span className="text-[10px] font-bold uppercase text-muted-foreground">Todo domingo às 09h00</span>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1">
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {course.description || "Inicie sua jornada de aprendizado na IBM."}
                                    </p>
                                    {!hasClasses && (
                                        <div className="mt-4 flex items-center gap-2 text-xs font-bold text-destructive">
                                            <ShieldAlert size={14} />
                                            SEM TURMAS ABERTAS
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter>
                                    <Button 
                                        className="w-full h-11 font-black uppercase text-xs tracking-widest"
                                        disabled={!hasClasses}
                                        onClick={() => setSelectedCourse(course)}
                                        variant={hasClasses ? "default" : "secondary"}
                                    >
                                        {hasClasses ? "Quero me Inscrever" : "Inscrições Indisponíveis"}
                                    </Button>
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>

                <div className="bg-white p-8 rounded-2xl border-2 border-dashed border-slate-200 text-center space-y-4 max-w-2xl mx-auto">
                    <HelpCircle size={32} className="mx-auto text-slate-300" />
                    <h3 className="font-bold text-lg">Dúvidas sobre os cursos?</h3>
                    <p className="text-sm text-muted-foreground">Fale diretamente com nossa secretaria ministerial pelo WhatsApp e receba orientações sobre sua trilha.</p>
                    <Button variant="outline" className="rounded-full px-8" asChild>
                        <a href="https://wa.me/5521999999999" target="_blank" rel="noopener noreferrer">
                            <MessageSquare className="size-4 mr-2" /> Atendimento via WhatsApp
                        </a>
                    </Button>
                </div>
            </div>

            <Dialog open={!!selectedCourse} onOpenChange={(open) => !open && setSelectedCourse(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black uppercase italic tracking-tighter">
                            Inscrição: {selectedCourse?.name}
                        </DialogTitle>
                        <DialogDescription>
                            Preencha os dados abaixo. Nossa equipe entrará em contato para confirmar sua vaga na turma.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedCourse && (
                        <EnrollmentForm 
                            course={selectedCourse} 
                            onCancel={() => setSelectedCourse(null)} 
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

function HelpCircle(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <path d="M12 17h.01" />
        </svg>
    )
}

export default function PublicEnrollmentPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>}>
            <EnrollmentContent />
        </Suspense>
    );
}
