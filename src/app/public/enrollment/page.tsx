
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, limit, Timestamp, addDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    Loader2, 
    CheckCircle, 
    User, 
    Phone, 
    Mail, 
    BookOpen, 
    Calendar, 
    ArrowRight, 
    ArrowLeft,
    Search,
    ChevronRight,
    Sparkles,
    GraduationCap,
    Music,
    HandHelping,
    Lightbulb,
    Target,
    Filter
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { VolunteeringProvider, useVolunteering } from '@/contexts/volunteering-context';
import { verifyMemberEmail } from './actions';

type EnrollmentStep = 'identification' | 'catalog' | 'success';

function EnrollmentForm() {
    const { firestore } = useFirebase();
    const { courses, classes } = useVolunteering();
    const { toast } = useToast();
    
    const [step, setStep] = useState<EnrollmentStep>('identification');
    const [isVerifying, setIsVerifying] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Member Identification
    const [email, setEmail] = useState('');
    const [memberData, setMemberData] = useState<{ id: string; name: string; phone: string; isNew: boolean } | null>(null);
    
    // New Member Fields
    const [newName, setNewName] = useState('');
    const [newPhone, setNewPhone] = useState('');

    // Catalog Selection
    const [selectedTab, setSelectedTab] = useState('ensino');
    const [selectedSubTab, setSelectedSubTab] = useState('lumine');
    const [lumineTrack, setLumineTrack] = useState<string>('todos');
    const [courseSearch, setCourseSearch] = useState('');
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

    const handleVerifyEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !email.includes('@')) return;

        setIsVerifying(true);
        try {
            const result = await verifyMemberEmail(email.toLowerCase().trim());
            setMemberData(result);
            if (result.isNew) {
                setNewName('');
                setNewPhone('');
            }
            setStep('catalog');
        } catch (error) {
            toast({ variant: 'destructive', title: "Erro na verificação", description: "Tente novamente em instantes." });
        } finally {
            setIsVerifying(false);
        }
    };

    const handleEnroll = async (courseId: string) => {
        setIsSaving(true);
        try {
            const targetClass = classes.find(c => c.courseId === courseId);
            
            await addDoc(collection(firestore!, 'enrollment_requests'), {
                courseId,
                classId: targetClass?.id || '',
                name: memberData?.isNew ? newName : memberData?.name || '',
                email: email.toLowerCase().trim(),
                phone: memberData?.isNew ? newPhone : memberData?.phone || '',
                status: 'pending',
                createdAt: Timestamp.now(),
            });

            setStep('success');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
            toast({ variant: 'destructive', title: "Erro ao protocolar", description: "Verifique sua conexão." });
        } finally {
            setIsSaving(false);
        }
    };

    const filteredCourses = useMemo(() => {
        if (!courses) return [];
        
        return courses.filter(c => {
            const searchLower = courseSearch.toLowerCase();
            const matchesSearch = c.name.toLowerCase().includes(searchLower) || c.description?.toLowerCase().includes(searchLower);
            
            if (selectedSubTab === 'lumine') {
                const isLumine = c.ministryName?.toLowerCase().includes('lumine') || c.ministryName?.toLowerCase().includes('ebd');
                if (!isLumine) return false;
                if (lumineTrack !== 'todos' && c.ebdTrack !== lumineTrack) return false;
                return matchesSearch;
            }
            
            if (selectedSubTab === 'escolas') {
                return (c.ministryName?.toLowerCase().includes('wave') || c.ministryName?.toLowerCase().includes('dis')) && matchesSearch;
            }
            
            if (selectedSubTab === 'ministerios') {
                const isLumine = c.ministryName?.toLowerCase().includes('lumine') || c.ministryName?.toLowerCase().includes('ebd');
                const isSchool = c.ministryName?.toLowerCase().includes('wave') || c.ministryName?.toLowerCase().includes('dis');
                return !isLumine && !isSchool && matchesSearch;
            }

            return matchesSearch;
        });
    }, [courses, selectedSubTab, lumineTrack, courseSearch]);

    if (step === 'success') {
        return (
            <div className="max-w-md mx-auto py-20 px-4 animate-in zoom-in-95 duration-500">
                <Card className="text-center p-8 border-none shadow-2xl rounded-[3rem] bg-white">
                    <div className="size-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner mb-8">
                        <CheckCircle size={48} />
                    </div>
                    <h2 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900 mb-4">Protocolo Enviado!</h2>
                    <p className="text-muted-foreground font-medium mb-10 leading-relaxed">
                        Recebemos seu pedido de inscrição. O coordenador do curso entrará em contato em breve para confirmar sua vaga na turma.
                    </p>
                    <Button onClick={() => window.location.reload()} className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-lg shadow-xl shadow-primary/20">
                        Finalizar
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
            <div className="text-center space-y-4">
                <Logo className="size-16 text-primary mx-auto mb-2" />
                <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">Portal de <br className="md:hidden" /> <span className="text-primary">Inscrições</span></h1>
                <p className="text-muted-foreground font-medium text-lg max-w-xl mx-auto">Sua jornada ministerial começa aqui. Escolha seu próximo passo de crescimento.</p>
            </div>

            {step === 'identification' ? (
                <Card className="shadow-2xl border-none overflow-hidden rounded-[2.5rem] bg-white">
                    <CardHeader className="bg-primary/5 p-10 border-b">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-white rounded-2xl shadow-sm text-primary">
                                <Mail size={32} />
                            </div>
                            <div>
                                <CardTitle className="text-2xl font-black uppercase italic tracking-tighter">Identificação</CardTitle>
                                <CardDescription className="text-base font-medium">Informe seu e-mail para iniciarmos o protocolo.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <form onSubmit={handleVerifyEmail}>
                        <CardContent className="p-10 space-y-6">
                            <div className="space-y-3">
                                <Label className="text-xs uppercase font-black text-muted-foreground tracking-widest ml-1">E-mail Cadastrado ou Preferencial</Label>
                                <Input 
                                    required 
                                    type="email" 
                                    placeholder="seu@email.com" 
                                    className="h-16 text-lg rounded-2xl border-2 focus-visible:ring-primary/20"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="p-10 bg-slate-50 border-t">
                            <Button type="submit" disabled={isVerifying || !email.includes('@')} className="w-full h-16 rounded-2xl font-black text-xl uppercase tracking-[0.2em] shadow-xl shadow-primary/20 group">
                                {isVerifying ? <Loader2 className="animate-spin mr-2" /> : <ArrowRight className="mr-2 group-hover:translate-x-1 transition-transform" />}
                                Continuar
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            ) : (
                <div className="space-y-8">
                    {/* Member Info Banner */}
                    <Card className={cn(
                        "border-none shadow-lg rounded-[2rem] overflow-hidden animate-in slide-in-from-top-4",
                        memberData?.isNew ? "bg-amber-50" : "bg-emerald-50"
                    )}>
                        <CardContent className="p-6 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "size-14 rounded-full flex items-center justify-center shadow-inner",
                                    memberData?.isNew ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"
                                )}>
                                    {memberData?.isNew ? <User size={28} /> : <CheckCircle size={28} />}
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">
                                        {memberData?.isNew ? 'Seja bem-vindo!' : 'Membro Reconhecido'}
                                    </p>
                                    <h3 className="text-lg font-black uppercase italic tracking-tighter">
                                        {memberData?.isNew ? 'Novo Cadastro' : memberData?.name}
                                    </h3>
                                    {!memberData?.isNew && <p className="text-xs font-bold opacity-60">{memberData?.phone}</p>}
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setStep('identification')} className="text-xs font-bold uppercase underline">Alterar</Button>
                        </CardContent>
                    </Card>

                    {/* Registration Form for New Members */}
                    {memberData?.isNew && (
                        <Card className="shadow-xl border-2 border-amber-200 rounded-[2rem] bg-white overflow-hidden animate-in zoom-in-95">
                            <CardHeader className="bg-amber-50/50 p-8 border-b border-amber-100">
                                <CardTitle className="text-sm font-black uppercase text-amber-800 tracking-widest flex items-center gap-2">
                                    <Sparkles size={16} /> Complete seu Cadastro
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-black text-muted-foreground">Nome Completo</Label>
                                    <Input required value={newName} onChange={e => setNewName(e.target.value)} placeholder="Como gostaria de ser chamado" className="h-12 rounded-xl" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-black text-muted-foreground">Telefone/WhatsApp</Label>
                                    <Input required value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="(21) 99999-9999" className="h-12 rounded-xl" />
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Tabs / Catalog */}
                    <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 h-16 bg-slate-100 rounded-[1.5rem] p-1.5 shadow-inner">
                            <TabsTrigger value="ensino" className="rounded-xl font-black uppercase italic tracking-widest text-sm data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg">
                                <BookOpen className="mr-2 size-4" /> Ensino
                            </TabsTrigger>
                            <TabsTrigger value="eventos" className="rounded-xl font-black uppercase italic tracking-widest text-sm data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg">
                                <Calendar className="mr-2 size-4" /> Eventos
                            </TabsTrigger>
                        </TabsList>

                        <div className="mt-8">
                            {selectedTab === 'ensino' && (
                                <div className="space-y-8">
                                    {/* Sub-Tabs for Ensino */}
                                    <div className="flex flex-wrap justify-center gap-2">
                                        {[
                                            { id: 'lumine', label: 'Lumine (EBD)', icon: Lightbulb },
                                            { id: 'escolas', label: 'Escolas Wave/DIS', icon: GraduationCap },
                                            { id: 'ministerios', label: 'Cursos Ministeriais', icon: Target },
                                        ].map(tab => (
                                            <Button
                                                key={tab.id}
                                                variant={selectedSubTab === tab.id ? 'default' : 'outline'}
                                                onClick={() => {
                                                    setSelectedSubTab(tab.id);
                                                    setLumineTrack('todos');
                                                }}
                                                className={cn(
                                                    "h-11 px-6 rounded-full font-black uppercase italic tracking-tighter text-xs",
                                                    selectedSubTab === tab.id ? "shadow-lg shadow-primary/20" : "bg-white"
                                                )}
                                            >
                                                <tab.icon className="mr-2 size-4" /> {tab.label}
                                            </Button>
                                        ))}
                                    </div>

                                    {/* Lumine Search and Tracks */}
                                    {selectedSubTab === 'lumine' && (
                                        <div className="space-y-6 bg-primary/5 p-6 sm:p-8 rounded-[2rem] border-2 border-primary/10 animate-in slide-in-from-top-4">
                                            <div className="flex flex-col md:flex-row gap-4 items-center">
                                                <div className="relative w-full flex-1">
                                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
                                                    <Input 
                                                        placeholder="Pesquisar curso na EBD..." 
                                                        className="h-14 pl-12 rounded-2xl bg-white border-none shadow-sm text-lg font-medium"
                                                        value={courseSearch}
                                                        onChange={e => setCourseSearch(e.target.value)}
                                                    />
                                                </div>
                                                <div className="flex gap-2 p-1.5 bg-white rounded-2xl shadow-sm border w-full md:w-auto">
                                                    {[
                                                        { id: 'todos', label: 'Todos' },
                                                        { id: 'biblico', label: 'Bíblico' },
                                                        { id: 'teologico', label: 'Teológico' },
                                                        { id: 'discipulado', label: 'Discipulado' }
                                                    ].map(track => (
                                                        <button
                                                            key={track.id}
                                                            onClick={() => setLumineTrack(track.id)}
                                                            className={cn(
                                                                "flex-1 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                                                lumineTrack === track.id ? "bg-primary text-white shadow-md" : "text-muted-foreground hover:bg-slate-50"
                                                            )}
                                                        >
                                                            {track.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Course List */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {filteredCourses.length === 0 ? (
                                            <div className="col-span-full py-20 text-center space-y-4">
                                                <div className="size-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
                                                    <Search size={40} />
                                                </div>
                                                <p className="text-muted-foreground font-bold uppercase tracking-widest text-sm">Nenhum curso encontrado.</p>
                                            </div>
                                        ) : (
                                            filteredCourses.map(course => (
                                                <Card key={course.id} className="group overflow-hidden rounded-[2rem] border-2 border-transparent hover:border-primary/30 transition-all hover:shadow-2xl bg-white">
                                                    <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
                                                        <img src={course.image || 'https://picsum.photos/seed/placeholder/800/450'} alt={course.name} className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700" />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                                        <div className="absolute bottom-6 left-6 right-6 text-white">
                                                            <Badge className="bg-primary text-white border-none mb-2 text-[10px] font-black uppercase tracking-widest px-3">{course.ministryName}</Badge>
                                                            <h4 className="text-2xl font-black uppercase italic tracking-tighter leading-none">{course.name}</h4>
                                                        </div>
                                                    </div>
                                                    <CardContent className="p-6">
                                                        <p className="text-sm text-muted-foreground line-clamp-2 font-medium mb-6">
                                                            {course.description || 'Uma jornada de aprendizado e crescimento espiritual na IBM.'}
                                                        </p>
                                                        <Button 
                                                            onClick={() => handleEnroll(course.id)}
                                                            disabled={isSaving}
                                                            className="w-full h-12 rounded-xl font-black uppercase tracking-[0.1em] text-xs shadow-lg group-hover:shadow-primary/30 transition-all"
                                                        >
                                                            {isSaving && selectedCourseId === course.id ? <Loader2 className="animate-spin mr-2" /> : <ChevronRight className="mr-2 size-4" />}
                                                            Garantir Minha Vaga
                                                        </Button>
                                                    </CardContent>
                                                </Card>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {selectedTab === 'eventos' && (
                                <div className="py-20 text-center space-y-6 bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-200">
                                    <div className="size-24 bg-white rounded-full flex items-center justify-center mx-auto shadow-xl">
                                        <Calendar size={40} className="text-slate-300" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-black uppercase italic tracking-tighter text-slate-400">Eventos em Breve</h3>
                                        <p className="text-muted-foreground font-medium text-sm">Fique atento! Novas conferências e workshops serão listados aqui.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Tabs>
                </div>
            )}
        </div>
    );
}

export default function PublicEnrollmentPage() {
    return (
        <main className="min-h-screen bg-[#F8F9FA] py-12 md:py-20 px-4">
            <VolunteeringProvider>
                <EnrollmentForm />
            </VolunteeringProvider>
            <div className="mt-20 text-center opacity-30">
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-900">Igreja Batista da Manhã • OikoApp v2.0</p>
            </div>
        </main>
    );
}
