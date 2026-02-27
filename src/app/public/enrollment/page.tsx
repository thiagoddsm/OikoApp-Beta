
'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useVolunteering, VolunteeringProvider } from '@/contexts/volunteering-context';
import { useFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    Loader2, BookOpen, Waves, Lightbulb, School, 
    ArrowLeft, CheckCircle2, Phone, Mail, User, 
    ChevronRight, AlertCircle, Info, GraduationCap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

/**
 * Ordem litúrgica da Trilha Lumine
 */
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

function EnrollmentForm({ course, classes, on处Success }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        classId: '',
        cpf: '',
        sexo: '',
        dataNascimento: ''
    });

    const isMemberCourse = course.name.toLowerCase().includes('membro') || course.name.toLowerCase().includes('pertencer') || course.name.toLowerCase().includes('integração');

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.phone || (!isMemberCourse && !formData.classId)) {
            toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Preencha seu nome, telefone e escolha uma turma.' });
            return;
        }

        setIsSaving(true);
        try {
            const requestsCol = collection(firestore!, 'enrollment_requests');
            await addDocumentNonBlocking(requestsCol, {
                ...formData,
                courseId: course.id,
                status: 'pending',
                createdAt: Timestamp.now()
            });
            toast({ title: 'Solicitação Enviada!', description: 'Em breve nossa equipe entrará em contato.' });
            on处Success();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao enviar', description: 'Tente novamente em instantes.' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <form onSubmit={handleSave} className="space-y-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="name">Nome Completo *</Label>
                <Input id="name" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="phone">Telefone / WhatsApp *</Label>
                    <Input id="phone" type="tel" value={formData.phone} onChange={e => setFormData(p => ({...p, phone: e.target.value}))} placeholder="(21) 9..." required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" type="email" value={formData.email} onChange={e => setFormData(p => ({...p, email: e.target.value}))} />
                </div>
            </div>
            {!isMemberCourse && (
                <div className="space-y-2">
                    <Label htmlFor="class-select">Selecione a Turma *</Label>
                    <Select value={formData.classId} onValueChange={v => setFormData(p => ({...p, classId: v}))}>
                        <SelectTrigger id="class-select">
                            <SelectValue placeholder="Escolha um horário disponível..." />
                        </SelectTrigger>
                        <SelectContent>
                            {classes.map(cls => (
                                <SelectItem key={cls.id} value={cls.id}>
                                    {cls.name} ({cls.dayOfWeek} às {cls.startTime})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
            {isMemberCourse && (
                <div className="p-3 bg-primary/5 border rounded-lg flex items-start gap-2">
                    <Info className="size-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-[11px] text-muted-foreground">Este curso acontece em ciclos. Ao se inscrever, você será alocado na próxima turma disponível.</p>
                </div>
            )}
            <Button type="submit" className="w-full h-12 font-bold" disabled={isSaving}>
                {isSaving ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2" />}
                Confirmar Inscrição
            </Button>
        </form>
    );
}

function CourseCard({ course, classes, onSelect }) {
    const hasClasses = classes.length > 0;
    const isLumine = course.ministryName.toLowerCase().includes('lumine') || course.ministryName.toLowerCase().includes('ebd');
    
    return (
        <Card className={cn(
            "flex flex-col h-full transition-all duration-300 border-2",
            hasClasses ? "hover:shadow-xl hover:border-primary/50" : "opacity-60 grayscale bg-slate-50"
        )}>
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start mb-2">
                    <div className={cn("p-2 rounded-lg", hasClasses ? "bg-primary/10 text-primary" : "bg-slate-200 text-slate-400")}>
                        <BookOpen size={20} />
                    </div>
                    <Badge variant="outline" className="text-[9px] uppercase font-black tracking-widest">{course.ministryName}</Badge>
                </div>
                <CardTitle className="text-xl font-black italic uppercase tracking-tighter">{course.name}</CardTitle>
                <CardDescription className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-muted-foreground">
                    <Clock className="size-3" />
                    {isLumine ? "Todo domingo às 09h00" : (classes[0]?.dayOfWeek ? `${classes[0].dayOfWeek} às ${classes[0].startTime}` : "Horário sob consulta")}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-6">
                <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                    {course.description || "Inicie sua jornada de aprendizado na IBM."}
                </p>
                {!hasClasses && (
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase">
                        <AlertCircle size={14} /> Sem turmas abertas
                    </div>
                )}
            </CardContent>
            <CardFooter>
                <Button 
                    className="w-full font-black uppercase text-xs h-11 tracking-wider" 
                    disabled={!hasClasses}
                    onClick={() => onSelect(course)}
                >
                    {hasClasses ? "Quero me Inscrever" : "Inscrições Indisponíveis"}
                </Button>
            </CardFooter>
        </Card>
    );
}

function Badge({ children, className, variant = 'default' }: { children: React.ReactNode, className?: string, variant?: 'default' | 'secondary' | 'outline' }) {
    const variants = {
        default: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        outline: 'border border-current'
    };
    return (
        <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-colors", variants[variant], className)}>
            {children}
        </span>
    );
}

function EnrollmentPageContent() {
    const { courses, classes, isLoading } = useVolunteering();
    const [selectedCourse, setSelectedCourse] = useState<any>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    const groupedCourses = useMemo(() => {
        const groups: Record<string, any[]> = {
            'Lumine (Discipulado)': [],
            'Wave (Música)': [],
            'DIS (Inclusão)': [],
            'Outros': []
        };

        courses.forEach(c => {
            const m = c.ministryName.toLowerCase();
            if (m.includes('lumine') || m.includes('ebd')) groups['Lumine (Discipulado)'].push(c);
            else if (m.includes('wave')) groups['Wave (Música)'].push(c);
            else if (m === 'dis') groups['DIS (Inclusão)'].push(c);
            else groups['Outros'].push(c);
        });

        // Ordenação Lumine
        groups['Lumine (Discipulado)'].sort((a, b) => getDiscipleshipWeight(a.name) - getDiscipleshipWeight(b.name));

        return groups;
    }, [courses]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <Loader2 className="size-10 animate-spin text-primary" />
                <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Carregando catálogo...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <header className="bg-white border-b py-6 px-4">
                <div className="container mx-auto flex flex-col items-center text-center">
                    <Button variant="ghost" asChild className="mb-4 text-muted-foreground hover:text-primary">
                        <Link href="/"><ArrowLeft className="mr-2 size-4" /> Voltar ao Site</Link>
                    </Button>
                    <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter text-slate-900 mb-4">INSCRIÇÕES IBM</h1>
                    <p className="text-slate-500 max-w-lg">Escolha seu próximo passo na trilha de crescimento.</p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                        {['Pertencer', 'Crescer', 'Liderar', 'Cuidar', 'Apoiar', 'Enviar'].map(step => (
                            <span key={step} className="text-[10px] font-black uppercase text-primary/60">{step}</span>
                        ))}
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-12">
                <Tabs defaultValue="Lumine (Discipulado)" className="w-full">
                    <div className="flex justify-center mb-12">
                        <TabsList className="bg-white border p-1 h-14 rounded-2xl shadow-sm overflow-x-auto no-scrollbar max-w-full justify-start md:justify-center">
                            {Object.keys(groupedCourses).map(group => groupedCourses[group].length > 0 && (
                                <TabsTrigger 
                                    key={group} 
                                    value={group}
                                    className="px-8 rounded-xl font-black uppercase italic tracking-tighter text-xs data-[state=active]:bg-primary data-[state=active]:text-white transition-all"
                                >
                                    {group.split(' ')[0]}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>

                    {Object.entries(groupedCourses).map(([group, list]) => (
                        <TabsContent key={group} value={group} className="mt-0 animate-in fade-in-50 duration-500">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {list.map(course => (
                                    <CourseCard 
                                        key={course.id} 
                                        course={course} 
                                        classes={classes.filter(cls => cls.courseId === course.id)}
                                        onSelect={setSelectedCourse}
                                    />
                                ))}
                            </div>
                        </TabsContent>
                    ))}
                </Tabs>
            </main>

            {/* Modal de Inscrição */}
            <Dialog open={!!selectedCourse} onOpenChange={(open) => !open && setSelectedCourse(null)}>
                <DialogContent className="max-w-xl sm:rounded-3xl border-none shadow-2xl">
                    <DialogHeader className="p-4 bg-primary/5 rounded-t-2xl">
                        <DialogTitle className="text-2xl font-black italic tracking-tighter uppercase text-primary">
                            Inscrição: {selectedCourse?.name}
                        </DialogTitle>
                        <DialogDescription className="font-bold uppercase text-[10px]">Preencha os dados para garantir sua vaga</DialogDescription>
                    </DialogHeader>
                    
                    {isSuccess ? (
                        <div className="py-12 flex flex-col items-center text-center gap-4 animate-in zoom-in-95">
                            <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-inner">
                                <CheckCircle2 size={48} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900">SOLICITAÇÃO RECEBIDA!</h3>
                                <p className="text-muted-foreground text-sm mt-2">Nossa secretaria entrará em contato em breve para confirmar sua participação.</p>
                            </div>
                            <Button className="mt-4 rounded-xl px-8 font-bold" onClick={() => { setSelectedCourse(null); setIsSuccess(false); }}>Fechar</Button>
                        </div>
                    ) : (
                        selectedCourse && (
                            <EnrollmentForm 
                                course={selectedCourse} 
                                classes={classes.filter(cls => cls.courseId === selectedCourse.id)}
                                on处Success={() => setIsSuccess(true)}
                            />
                        )
                    )}
                </DialogContent>
            </Dialog>

            <footer className="py-12 bg-white border-t mt-20">
                <div className="container mx-auto px-4 text-center text-muted-foreground text-xs font-bold uppercase tracking-widest">
                    © {new Date().getFullYear()} Igreja Batista da Manhã • OikoApp
                </div>
            </footer>
        </div>
    );
}

export default function PublicEnrollmentPage() {
    return (
        <VolunteeringProvider>
            <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>}>
                <EnrollmentPageContent />
            </Suspense>
        </VolunteeringProvider>
    );
}
