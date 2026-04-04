
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { useVolunteering, VolunteeringProvider } from '@/contexts/volunteering-context';
import { collection, query, where, getDocs, limit, Timestamp, addDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    Loader2, 
    Search, 
    BookOpen, 
    Waves, 
    HandHelping, 
    Lightbulb, 
    School, 
    GraduationCap, 
    CheckCircle, 
    ArrowRight,
    UserPlus,
    Mail,
    Phone,
    User,
    Calendar,
    ChevronRight,
    MapPin,
    AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons';
import { cn } from '@/lib/utils';

// Helper to filter and group courses
const getCourseGroup = (course: any) => {
    const ministry = course.ministryName?.toLowerCase() || '';
    if (ministry.includes('wave')) return 'wave';
    if (ministry.includes('dis')) return 'dis';
    if (ministry.includes('lumine') || ministry.includes('ebd')) return 'lumine';
    return 'ministerios';
};

function EnrollmentPortal() {
    const { firestore } = useFirebase();
    const { courses, classes } = useVolunteering();
    const { toast } = useToast();

    const [activeTab, setActiveTab] = useState('ensino');
    const [ensinoSubTab, setEnsinoSubTab] = useState('lumine');
    const [lumineTrack, setLumineTrack] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Step-by-step Enrollment State
    const [selectedCourse, setSelectedCourse] = useState<any>(null);
    const [enrollStep, setEnrollStep] = useState<'email' | 'details' | 'success'>('email');
    const [isProcessing, setIsProcessing] = useState(false);
    
    const [emailInput, setEmailInput] = useState('');
    const [identifiedUser, setIdentifiedUser] = useState<any>(null);
    const [formData, setFormData] = useState({ name: '', phone: '' });

    // Filtering logic
    const filteredCourses = useMemo(() => {
        return courses.filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
            const group = getCourseGroup(c);
            
            if (activeTab === 'ensino') {
                if (ensinoSubTab === 'lumine') {
                    const isLumine = group === 'lumine';
                    const matchesTrack = lumineTrack === 'all' || c.ebdTrack === lumineTrack;
                    return isLumine && matchesTrack && matchesSearch;
                }
                if (ensinoSubTab === 'escolas') {
                    return (group === 'wave' || group === 'dis') && matchesSearch;
                }
                return group === 'ministerios' && matchesSearch;
            }
            
            return false; // Events tab logic would go here
        });
    }, [courses, activeTab, ensinoSubTab, lumineTrack, searchTerm]);

    const handleOpenEnroll = (course: any) => {
        setSelectedCourse(course);
        setEnrollStep('email');
        setEmailInput('');
        setIdentifiedUser(null);
        setFormData({ name: '', phone: '' });
    };

    const handleVerifyEmail = async () => {
        if (!emailInput.trim() || !firestore) return;
        setIsProcessing(true);
        
        try {
            const q = query(
                collection(firestore, 'users'), 
                where('email', '==', emailInput.toLowerCase().trim()), 
                limit(1)
            );
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const userData = querySnapshot.docs[0].data();
                setIdentifiedUser({ id: querySnapshot.docs[0].id, ...userData });
                setFormData({ name: userData.name || '', phone: userData.phone || '' });
                toast({ title: "Bem-vindo de volta!", description: `Identificamos seu cadastro, ${userData.name?.split(' ')[0]}.` });
            } else {
                setIdentifiedUser(null);
                setFormData({ name: '', phone: '' });
            }
            setEnrollStep('details');
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: "Erro na verificação", description: "Não foi possível consultar seu e-mail." });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleConfirmProtocol = async () => {
        if (!formData.name || !emailInput || !selectedCourse || !firestore) return;
        setIsProcessing(true);

        try {
            await addDoc(collection(firestore, 'enrollment_requests'), {
                courseId: selectedCourse.id,
                name: formData.name,
                email: emailInput.toLowerCase().trim(),
                phone: formData.phone,
                status: 'pending',
                identifiedUserId: identifiedUser?.id || null,
                createdAt: Timestamp.now(),
            });
            setEnrollStep('success');
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: "Falha no Protocolo", description: "Tente novamente em instantes." });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#F8F9FA] pb-20">
            {/* Custom Hero */}
            <div className="bg-white border-b pt-20 pb-16 px-4">
                <div className="max-w-4xl mx-auto text-center space-y-6">
                    <Logo className="size-16 text-primary mx-auto mb-4" />
                    <h1 className="text-5xl md:text-8xl font-black italic tracking-tighter uppercase text-slate-900 leading-[0.85]">
                        Portal de <span className="text-primary">Inscrições</span>
                    </h1>
                    <p className="text-muted-foreground text-lg md:text-xl font-medium max-w-2xl mx-auto">
                        Escolha seu próximo passo de crescimento na Igreja Batista da Manhã.
                    </p>
                    
                    {/* Search Bar */}
                    <div className="relative max-w-md mx-auto mt-10">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground size-5" />
                        <Input 
                            placeholder="Buscar curso ou evento..." 
                            className="h-14 pl-12 rounded-2xl border-2 focus-visible:ring-primary shadow-sm text-lg"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="container mx-auto px-4 mt-12">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="flex justify-center mb-12">
                        <TabsList className="bg-slate-200/50 p-1.5 rounded-2xl h-16 w-full max-w-sm border shadow-inner">
                            <TabsTrigger value="ensino" className="rounded-xl font-black uppercase italic tracking-widest text-xs h-full data-[state=active]:bg-white data-[state=active]:shadow-xl">Ensino</TabsTrigger>
                            <TabsTrigger value="eventos" className="rounded-xl font-black uppercase italic tracking-widest text-xs h-full data-[state=active]:bg-white data-[state=active]:shadow-xl">Eventos</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="ensino" className="space-y-12 animate-in fade-in duration-500">
                        {/* Ensino Sub-Navigation */}
                        <div className="flex flex-wrap justify-center gap-3">
                            {[
                                { id: 'lumine', label: 'Escola Lumine', icon: Lightbulb },
                                { id: 'escolas', label: 'Escolas Wave & DIS', icon: School },
                                { id: 'ministerios', label: 'Ministérios', icon: BookOpen }
                            ].map(sub => (
                                <Button 
                                    key={sub.id}
                                    variant={ensinoSubTab === sub.id ? 'default' : 'outline'}
                                    onClick={() => setEnsinoSubTab(sub.id)}
                                    className={cn(
                                        "h-12 px-8 rounded-2xl font-bold transition-all shadow-sm",
                                        ensinoSubTab === sub.id ? "scale-105 shadow-primary/20" : "bg-white"
                                    )}
                                >
                                    <sub.icon className="mr-2 size-4" />
                                    {sub.label}
                                </Button>
                            ))}
                        </div>

                        {/* Lumine Track Filters */}
                        {ensinoSubTab === 'lumine' && (
                            <div className="flex justify-center gap-2 animate-in slide-in-from-top-2">
                                {[
                                    { id: 'all', label: 'Todos' },
                                    { id: 'teologico', label: 'Teológico' },
                                    { id: 'biblico', label: 'Bíblico' },
                                    { id: 'discipulado', label: 'Discipulado' }
                                ].map(track => (
                                    <button 
                                        key={track.id}
                                        onClick={() => setLumineTrack(track.id)}
                                        className={cn(
                                            "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border-2",
                                            lumineTrack === track.id ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-100 hover:border-slate-300"
                                        )}
                                    >
                                        {track.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Grid de Cursos */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {filteredCourses.map(course => (
                                <Card key={course.id} className="border-none shadow-xl rounded-[2.5rem] overflow-hidden group hover:translate-y-[-8px] transition-all duration-500 bg-white">
                                    <div className="h-48 bg-slate-100 relative overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                                        <div className="absolute top-4 right-4 z-20">
                                            <Badge className="bg-white/90 text-slate-900 border-none font-black uppercase italic tracking-tighter text-[10px]">
                                                {course.ministryName}
                                            </Badge>
                                        </div>
                                        <div className="absolute bottom-4 left-6 z-20 text-white">
                                            <h3 className="text-2xl font-black uppercase italic tracking-tighter leading-none">{course.name}</h3>
                                        </div>
                                    </div>
                                    <CardContent className="p-8 space-y-4">
                                        <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">
                                            {course.description || "Nenhuma descrição disponível."}
                                        </p>
                                        
                                        <div className="flex flex-wrap gap-2 pt-2">
                                            {course.ebdTrack && (
                                                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 font-bold text-[9px] uppercase">
                                                    Trilha {course.ebdTrack}
                                                </Badge>
                                            )}
                                            <Badge variant="outline" className="text-[9px] uppercase font-bold">
                                                {classes.filter(cls => cls.courseId === course.id).length} Turmas Ativas
                                            </Badge>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="px-8 pb-8 pt-0">
                                        <Button className="w-full h-12 rounded-2xl font-black uppercase italic tracking-widest shadow-lg shadow-primary/20 group" onClick={() => handleOpenEnroll(course)}>
                                            Inscrever-se Agora
                                            <ArrowRight className="ml-2 size-4 group-hover:translate-x-1 transition-transform" />
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>

                        {filteredCourses.length === 0 && (
                            <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed">
                                <Search className="size-12 mx-auto text-slate-200 mb-4" />
                                <p className="text-muted-foreground font-bold">Nenhum curso encontrado nesta categoria.</p>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="eventos" className="animate-in fade-in duration-500">
                        <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed shadow-sm">
                            <Calendar className="size-16 mx-auto text-slate-200 mb-6" />
                            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">Agenda de Eventos</h2>
                            <p className="text-muted-foreground mt-2">Em breve, você poderá se inscrever nos próximos eventos estratégicos da IBM por aqui.</p>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Enrollment Modal */}
            <Dialog open={!!selectedCourse} onOpenChange={(open) => !open && setSelectedCourse(null)}>
                <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl">
                    <DialogHeader className="p-8 bg-slate-900 text-white shrink-0">
                        <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">Protocolo de Inscrição</DialogTitle>
                        <DialogDescription className="text-slate-400 font-medium">{selectedCourse?.name}</DialogDescription>
                    </DialogHeader>

                    {enrollStep === 'email' && (
                        <div className="p-8 space-y-6 animate-in fade-in slide-in-from-top-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase font-black text-muted-foreground">Comece pelo seu E-mail</Label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Mail className="absolute left-3 top-3 size-4 text-muted-foreground" />
                                        <Input 
                                            placeholder="seu@email.com" 
                                            className="pl-10 h-12 rounded-xl"
                                            value={emailInput}
                                            onChange={e => setEmailInput(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleVerifyEmail()}
                                        />
                                    </div>
                                    <Button onClick={handleVerifyEmail} className="h-12 px-6 font-bold" disabled={!emailInput.trim() || isProcessing}>
                                        {isProcessing ? <Loader2 className="animate-spin size-4" /> : 'Verificar'}
                                    </Button>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground italic leading-relaxed">
                                Identificaremos se você já possui cadastro em nossa base ministerial para agilizar seu processo.
                            </p>
                        </div>
                    )}

                    {enrollStep === 'details' && (
                        <div className="p-8 space-y-6 animate-in zoom-in-95 duration-300">
                            {identifiedUser ? (
                                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-4">
                                    <div className="size-12 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg">
                                        <CheckCircle size={24} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-emerald-600">Cadastro Identificado</p>
                                        <p className="font-bold text-slate-900">{identifiedUser.name}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-3">
                                        <UserPlus size={20} className="text-blue-600" />
                                        <p className="text-xs font-bold text-blue-800">Primeira vez por aqui? Seja bem-vindo!</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-black">Seu Nome Completo</Label>
                                        <Input value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} placeholder="Como deseja ser chamado?" className="h-12 rounded-xl" />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase font-black">WhatsApp / Telefone</Label>
                                <Input value={formData.phone} onChange={e => setFormData(p => ({...p, phone: e.target.value}))} placeholder="(21) 9...." className="h-12 rounded-xl" />
                            </div>

                            <Button className="w-full h-14 rounded-2xl font-black uppercase italic tracking-widest shadow-xl" onClick={handleConfirmProtocol} disabled={isProcessing}>
                                {isProcessing ? <Loader2 className="animate-spin size-5" /> : 'Confirmar Inscrição'}
                            </Button>
                            
                            <Button variant="ghost" className="w-full text-[10px] font-bold uppercase tracking-widest text-muted-foreground" onClick={() => setEnrollStep('email')}>
                                Corrigir E-mail
                            </Button>
                        </div>
                    )}

                    {enrollStep === 'success' && (
                        <div className="p-12 text-center space-y-6 animate-in zoom-in-95 duration-500">
                            <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                                <CheckCircle size={40} />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">Protocolado!</h2>
                                <p className="text-muted-foreground font-medium">Sua solicitação para <span className="font-bold text-primary">{selectedCourse?.name}</span> foi enviada com sucesso.</p>
                            </div>
                            <p className="text-xs text-muted-foreground bg-muted p-4 rounded-xl">
                                Um responsável entrará em contato via WhatsApp para confirmar os detalhes da sua turma.
                            </p>
                            <Button className="w-full h-12 rounded-2xl font-black" variant="outline" onClick={() => setSelectedCourse(null)}>Fechar</Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </main>
    );
}

// Wrapper to provide context
export default function EnrollmentPage() {
    return (
        <VolunteeringProvider>
            <EnrollmentPortal />
        </VolunteeringProvider>
    );
}

// Need Dialog components from UI
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
