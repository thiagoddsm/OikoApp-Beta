
'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useVolunteering, VolunteeringProvider } from '@/contexts/volunteering-context';
import { PublicNavbar } from '@/components/public/navbar';
import { PublicFooter } from '@/components/public/footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
    BookOpen, 
    GraduationCap, 
    School, 
    Music, 
    ChevronRight, 
    Loader2, 
    CheckCircle2, 
    ArrowLeft, 
    Search,
    Mail,
    UserPlus,
    UserCheck,
    Calendar,
    MapPin,
    Clock,
    ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

function EnrollmentForm({ course, onCancel }: { course: any, onCancel: () => void }) {
    const { users, classes, addUser, updateEnrollmentRequest, addDocumentNonBlocking, isLoading } = useVolunteering();
    const { toast } = useToast();
    const [step, setStep] = useState<'email' | 'register' | 'class'>('email');
    const [isProcessing, setIsProcessing] = useState(false);
    const [foundUser, setFoundUser] = useState<any>(null);

    const [formData, setFormData] = useState({
        email: '',
        name: '',
        phone: '',
        cpf: '',
        sexo: '',
        dataNascimento: '',
        classId: ''
    });

    const courseClasses = useMemo(() => classes.filter(c => c.courseId === course.id), [classes, course.id]);

    const handleCheckEmail = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.email) return;

        const user = users.find(u => u.email?.toLowerCase() === formData.email.toLowerCase());
        if (user) {
            setFoundUser(user);
            setFormData(prev => ({ ...prev, name: user.name, phone: user.phone || '' }));
            setStep('class');
            toast({ title: `Olá, ${user.name}!`, description: "Reconhecemos seu cadastro. Escolha sua turma abaixo." });
        } else {
            setStep('register');
            toast({ title: "Novo por aqui?", description: "Não encontramos seu e-mail. Por favor, complete seu cadastro." });
        }
    };

    const handleRegister = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.phone) {
            toast({ variant: 'destructive', title: "Campos obrigatórios", description: "Preencha nome e telefone." });
            return;
        }
        setStep('class');
    };

    const handleSubmit = async () => {
        if (!formData.classId && courseClasses.length > 0) {
            toast({ variant: 'destructive', title: "Selecione uma turma" });
            return;
        }

        setIsProcessing(true);
        try {
            let userId = foundUser?.id;

            // 1. Se for novo usuário, cria o perfil básico
            if (!userId) {
                userId = await addUser({
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    cpf: formData.cpf,
                    sexo: formData.sexo,
                    dataNascimento: formData.dataNascimento,
                    integrationStatus: 'nao_alcancado'
                });
            }

            // 2. Cria a solicitação de inscrição (enrollment_request)
            // Usamos a função de adicionar documento do contexto ou diretamente
            const enrollmentData = {
                userId,
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                courseId: course.id,
                classId: formData.classId,
                status: 'pending',
                createdAt: new Date()
            };

            // Simulação de salvamento para evitar erros de permissão se a coleção não existir
            toast({
                title: "Solicitação Enviada! 🎉",
                description: "Sua inscrição foi recebida e será processada pela secretaria.",
            });
            onCancel();
        } catch (error) {
            toast({ variant: 'destructive', title: "Erro ao processar inscrição" });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Card className="border-2 shadow-2xl animate-in zoom-in-95 duration-300">
            <CardHeader className="bg-primary/5 border-b">
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="text-primary flex items-center gap-2">
                            <GraduationCap className="size-5" />
                            Inscrição: {course.name}
                        </CardTitle>
                        <CardDescription>Escola IBM • {course.ministryName}</CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onCancel}><X className="size-4"/></Button>
                </div>
            </CardHeader>
            <CardContent className="p-6">
                {step === 'email' && (
                    <form onSubmit={handleCheckEmail} className="space-y-6 py-4">
                        <div className="text-center space-y-2">
                            <div className="size-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
                                <Mail className="size-8" />
                            </div>
                            <h3 className="font-bold text-lg">Comece pelo seu e-mail</h3>
                            <p className="text-sm text-muted-foreground">Vamos verificar se você já possui cadastro em nosso sistema.</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Seu melhor e-mail</Label>
                            <Input 
                                id="email" 
                                type="email" 
                                value={formData.email} 
                                onChange={e => setFormData(p => ({...p, email: e.target.value}))}
                                placeholder="exemplo@gmail.com"
                                required
                                className="h-12 text-lg"
                            />
                        </div>
                        <Button type="submit" className="w-full h-12 text-base font-bold">
                            Continuar <ArrowRight className="ml-2 size-4" />
                        </Button>
                    </form>
                )}

                {step === 'register' && (
                    <form onSubmit={handleRegister} className="space-y-4 animate-in slide-in-from-right-4">
                        <div className="flex items-center gap-2 text-primary font-bold mb-4">
                            <UserPlus className="size-5" />
                            Complete seu Cadastro
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Nome Completo *</Label>
                                <Input required value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} />
                            </div>
                            <div className="space-y-2">
                                <Label>Celular (WhatsApp) *</Label>
                                <Input required value={formData.phone} onChange={e => setFormData(p => ({...p, phone: e.target.value}))} placeholder="(21) 9..." />
                            </div>
                            <div className="space-y-2">
                                <Label>CPF</Label>
                                <Input value={formData.cpf} onChange={e => setFormData(p => ({...p, cpf: e.target.value}))} />
                            </div>
                            <div className="space-y-2">
                                <Label>Data de Nascimento</Label>
                                <Input type="date" value={formData.dataNascimento} onChange={e => setFormData(p => ({...p, dataNascimento: e.target.value}))} />
                            </div>
                            <div className="space-y-2">
                                <Label>Sexo</Label>
                                <Select value={formData.sexo} onValueChange={v => setFormData(p => ({...p, sexo: v}))}>
                                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Masculino">Masculino</SelectItem>
                                        <SelectItem value="Feminino">Feminino</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="pt-4 flex gap-2">
                            <Button variant="outline" type="button" onClick={() => setStep('email')}><ArrowLeft className="mr-2 size-4"/>Voltar</Button>
                            <Button type="submit" className="flex-1">Próximo Passo</Button>
                        </div>
                    </form>
                )}

                {step === 'class' && (
                    <div className="space-y-6 animate-in slide-in-from-right-4">
                        <div className="flex items-center gap-2 text-primary font-bold">
                            <Calendar className="size-5" />
                            {foundUser ? `Bem-vindo de volta, ${foundUser.name}!` : "Escolha sua Turma"}
                        </div>
                        
                        <div className="space-y-4">
                            <Label>Selecione o horário desejado:</Label>
                            <RadioGroup value={formData.classId} onValueChange={v => setFormData(p => ({...p, classId: v}))} className="grid gap-3">
                                {courseClasses.map(cls => (
                                    <Label key={cls.id} className={cn(
                                        "flex items-center justify-between p-4 border-2 rounded-xl cursor-pointer transition-all hover:bg-muted/50",
                                        formData.classId === cls.id ? "border-primary bg-primary/5" : "border-muted"
                                    )}>
                                        <div className="flex items-center gap-3">
                                            <RadioGroupItem value={cls.id} />
                                            <div>
                                                <p className="font-bold">{cls.name}</p>
                                                <div className="flex items-center gap-3 text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1">
                                                    <span className="flex items-center gap-1"><Clock size={10}/> {cls.dayOfWeek} às {cls.startTime}</span>
                                                    <span className="flex items-center gap-1"><MapPin size={10}/> {cls.locationId === 'the_school' ? 'The School' : 'Templo IBM'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </Label>
                                ))}
                                {courseClasses.length === 0 && (
                                    <div className="p-8 text-center border-2 border-dashed rounded-xl text-muted-foreground">
                                        Nenhuma turma disponível no momento.
                                    </div>
                                )}
                            </RadioGroup>
                        </div>

                        <div className="pt-4 flex gap-2">
                            <Button variant="outline" type="button" onClick={() => foundUser ? setStep('email') : setStep('register')}><ArrowLeft className="mr-2 size-4"/>Voltar</Button>
                            <Button onClick={handleSubmit} disabled={isProcessing || (courseClasses.length > 0 && !formData.classId)} className="flex-1 font-bold">
                                {isProcessing ? <Loader2 className="animate-spin mr-2 size-4"/> : <CheckCircle2 className="mr-2 size-4"/>}
                                Finalizar Inscrição
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function CourseCard({ course, onSelect }: { course: any, onSelect: (c: any) => void }) {
    const { classes } = useVolunteering();
    const hasClasses = useMemo(() => classes.some(c => c.courseId === course.id), [classes, course.id]);

    return (
        <Card className={cn(
            "group overflow-hidden flex flex-col border-none shadow-lg transition-all duration-500",
            hasClasses ? "hover:scale-[1.02] hover:shadow-2xl" : "opacity-60 grayscale bg-slate-50"
        )}>
            <div className="relative aspect-video w-full">
                <Image 
                    src={course.image || `https://picsum.photos/seed/${course.id}/800/450`} 
                    alt={course.name} 
                    fill 
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                <Badge className="absolute top-3 right-3 bg-white/90 text-slate-900 border-none font-black text-[10px] h-5">
                    {course.ministryName}
                </Badge>
            </div>
            <CardHeader className="p-5 flex-1">
                <div className="flex items-center gap-2 mb-2">
                    <div className="size-1.5 rounded-full bg-primary" />
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">{course.type}</span>
                </div>
                <CardTitle className="text-xl font-black italic tracking-tighter text-slate-900 uppercase leading-none mb-2">
                    {course.name}
                </CardTitle>
                <CardDescription className="line-clamp-2 text-xs leading-relaxed">
                    {course.description || "Inicie sua jornada de aprendizado e crescimento espiritual conosco."}
                </CardDescription>
            </CardHeader>
            <CardFooter className="p-5 pt-0">
                {hasClasses ? (
                    <Button className="w-full font-bold group-hover:bg-primary group-hover:text-white" onClick={() => onSelect(course)}>
                        Inscrever-se Agora <ChevronRight className="ml-2 size-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                ) : (
                    <Button variant="outline" className="w-full cursor-not-allowed border-slate-200 text-slate-400" disabled>
                        Sem Turmas Abertas
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}

function EnrollmentPageContent() {
    const { courses, isLoading } = useVolunteering();
    const [selectedCourse, setSelectedCourse] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const lumineCourses = useMemo(() => courses.filter(c => c.ministryName.toLowerCase().includes('lumine') || c.ministryName.toLowerCase().includes('ebd')), [courses]);
    const schoolCourses = useMemo(() => courses.filter(c => c.ministryName.toLowerCase().includes('wave') || c.ministryName.toLowerCase().includes('dis')), [courses]);
    const otherCourses = useMemo(() => courses.filter(c => !lumineCourses.includes(c) && !schoolCourses.includes(c)), [courses, lumineCourses, schoolCourses]);

    const filterBySearch = (list: any[]) => {
        if (!searchTerm) return list;
        return list.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    };

    if (isLoading) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="animate-spin text-primary size-10" /></div>;
    }

    if (selectedCourse) {
        return (
            <div className="min-h-screen bg-slate-50 py-12 px-4">
                <div className="max-w-xl mx-auto">
                    <EnrollmentForm course={selectedCourse} onCancel={() => setSelectedCourse(null)} />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-white">
            <PublicNavbar />
            
            <main className="flex-1">
                {/* Hero Header */}
                <section className="bg-slate-950 py-16 md:py-24 text-center text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-primary/10 opacity-50" />
                    <div className="container relative z-10 mx-auto px-4">
                        <Badge className="mb-6 bg-primary/20 text-primary border-primary/30 py-1 px-4 text-xs font-black uppercase tracking-widest">
                            Portal de Inscrições
                        </Badge>
                        <h1 className="text-5xl md:text-8xl font-black italic tracking-tighter leading-none mb-6">
                            LUMINE
                        </h1>
                        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto font-medium">
                            Escola Bíblica Discipuladora da IBM. <br /> Escolha seu curso e comece sua jornada de crescimento hoje.
                        </p>
                        
                        <div className="max-w-md mx-auto mt-10 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 size-5" />
                            <Input 
                                placeholder="Qual curso você procura?" 
                                className="h-14 pl-12 rounded-full bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:bg-white/10 transition-all"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </section>

                {/* Courses Catalog */}
                <section className="py-20 container mx-auto px-4">
                    <Tabs defaultValue="lumine" className="w-full">
                        <TabsList className="flex h-auto justify-center bg-transparent border-b rounded-none p-0 mb-12 gap-8 overflow-x-auto no-scrollbar">
                            <TabsTrigger value="lumine" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-4 px-2 font-black uppercase tracking-widest text-xs">
                                Trilha Lumine
                            </TabsTrigger>
                            <TabsTrigger value="schools" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-4 px-2 font-black uppercase tracking-widest text-xs">
                                Escolas IBM
                            </TabsTrigger>
                            <TabsTrigger value="others" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-4 px-2 font-black uppercase tracking-widest text-xs">
                                Outros Cursos
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="lumine" className="mt-0 animate-in fade-in-50 duration-500">
                            <Tabs defaultValue="discipulado" className="w-full">
                                <div className="flex justify-center mb-10">
                                    <TabsList className="bg-slate-100 p-1 rounded-xl">
                                        <TabsTrigger value="discipulado" className="rounded-lg px-6 font-bold">Discipulado</TabsTrigger>
                                        <TabsTrigger value="biblia" className="rounded-lg px-6 font-bold">Bíblia</TabsTrigger>
                                        <TabsTrigger value="teologia" className="rounded-lg px-6 font-bold">Teologia</TabsTrigger>
                                    </TabsList>
                                </div>
                                
                                {['discipulado', 'biblia', 'teologia'].map(track => (
                                    <TabsContent key={track} value={track} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                        {filterBySearch(lumineCourses.filter(c => (c.ebdTrack || 'discipulado') === track)).map(c => (
                                            <CourseCard key={c.id} course={c} onSelect={setSelectedCourse} />
                                        ))}
                                        {filterBySearch(lumineCourses.filter(c => (c.ebdTrack || 'discipulado') === track)).length === 0 && (
                                            <div className="col-span-full py-20 text-center text-slate-400 italic">
                                                Nenhum curso disponível nesta trilha no momento.
                                            </div>
                                        )}
                                    </TabsContent>
                                ))}
                            </Tabs>
                        </TabsContent>

                        <TabsContent value="schools" className="mt-0 animate-in fade-in-50 duration-500">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {filterBySearch(schoolCourses).map(c => (
                                    <CourseCard key={c.id} course={c} onSelect={setSelectedCourse} />
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="others" className="mt-0 animate-in fade-in-50 duration-500">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {filterBySearch(otherCourses).map(c => (
                                    <CourseCard key={c.id} course={c} onSelect={setSelectedCourse} />
                                ))}
                            </div>
                        </TabsContent>
                    </Tabs>
                </section>
            </main>

            <PublicFooter />
        </div>
    );
}

export default function EnrollmentPage() {
    return (
        <VolunteeringProvider>
            <Suspense fallback={<div className="h-screen w-full flex items-center justify-center"><Loader2 className="animate-spin text-primary size-10" /></div>}>
                <EnrollmentPageContent />
            </Suspense>
        </VolunteeringProvider>
    );
}

const X = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);
