'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useFirebase, useVolunteering } from '@/firebase';
import { VolunteeringProvider } from '@/contexts/volunteering-context';
import { collection, Timestamp, addDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
    Loader2, CheckCircle, Search, Info, Mail, Phone, User, 
    ArrowRight, BookOpen, Music, GraduationCap, MapPin, 
    Calendar, Heart, Sparkles, Filter, LayoutGrid, Check
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { verifyMemberEmail, type VerifiedMember } from './actions';

function EnrollmentForm() {
    const { firestore } = useFirebase();
    const { courses, classes, isLoading: isLoadingContext } = useVolunteering();
    const { toast } = useToast();
    
    // Estados do Fluxo
    const [step, setStep] = useState<'identification' | 'catalog' | 'success'>('identification');
    const [isVerifying, setIsVerifying] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Dados do Usuário
    const [email, setEmail] = useState('');
    const [memberData, setMemberData] = useState<VerifiedMember | null>(null);
    const [newName, setNewName] = useState('');
    const [newPhone, setNewPhone] = useState('');
    
    // Filtros e Seleção
    const [selectedTab, setSelectedTab] = useState<'ensino' | 'eventos'>('ensino');
    const [selectedSubTab, setSelectedSubTab] = useState<'lumine' | 'escolas' | 'ministerios'>('lumine');
    const [selectedTrack, setSelectedTrack] = useState<'all' | 'biblico' | 'teologico' | 'discipulado'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

    const handleVerifyEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;

        setIsVerifying(true);
        try {
            const result = await verifyMemberEmail(email.trim());
            if (result.exists && result.member) {
                setMemberData(result.member);
                toast({ title: "Bem-vindo de volta!", description: `Reconhecemos seu cadastro, ${result.member.maskedName}.` });
            } else {
                setMemberData(null);
                toast({ title: "Novo por aqui?", description: "Não encontramos seu e-mail. Vamos criar seu cadastro agora." });
            }
            setStep('catalog');
        } catch (error) {
            toast({ variant: 'destructive', title: "Erro na verificação", description: "Tente novamente em instantes." });
        } finally {
            setIsVerifying(false);
        }
    };

    const filteredCourses = useMemo(() => {
        if (!courses) return [];
        return courses.filter(course => {
            const matchesSearch = course.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 course.description?.toLowerCase().includes(searchTerm.toLowerCase());
            
            const ministry = course.ministryName?.toLowerCase() || '';
            const isLumine = ministry.includes('lumine') || ministry.includes('ebd');
            const isEscola = ministry.includes('wave') || ministry === 'dis';
            
            let matchesSubTab = false;
            if (selectedSubTab === 'lumine') matchesSubTab = isLumine;
            else if (selectedSubTab === 'escolas') matchesSubTab = isEscola;
            else matchesSubTab = !isLumine && !isEscola;

            let matchesTrack = true;
            if (selectedSubTab === 'lumine' && selectedTrack !== 'all') {
                matchesTrack = course.ebdTrack === selectedTrack;
            }

            return matchesSearch && matchesSubTab && matchesTrack;
        });
    }, [courses, searchTerm, selectedSubTab, selectedTrack]);

    const handleEnroll = async () => {
        if (!selectedCourseId || !firestore) return;
        
        setIsSubmitting(true);
        try {
            await addDoc(collection(firestore, 'enrollment_requests'), {
                courseId: selectedCourseId,
                name: memberData ? memberData.maskedName : newName,
                email: email,
                phone: memberData ? memberData.maskedPhone : newPhone,
                status: 'pending',
                createdAt: Timestamp.now(),
                isExistingMember: !!memberData
            });
            setStep('success');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (e) {
            toast({ variant: 'destructive', title: "Falha ao processar", description: "Ocorreu um erro técnico. Tente novamente." });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (step === 'success') {
        return (
            <Card className="border-none shadow-2xl overflow-hidden rounded-[2.5rem] animate-in zoom-in-95 duration-500">
                <CardContent className="p-12 text-center space-y-6">
                    <div className="size-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner mb-4">
                        <CheckCircle size={48} />
                    </div>
                    <h2 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">Solicitação Enviada!</h2>
                    <p className="text-muted-foreground text-lg max-w-md mx-auto">
                        Protocolamos seu interesse com sucesso. O coordenador do curso entrará em contato em breve para confirmar sua vaga e turma.
                    </p>
                    <div className="pt-6">
                        <Button onClick={() => window.location.reload()} variant="outline" className="px-10 h-12 font-bold rounded-xl">Voltar ao Início</Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-none shadow-2xl overflow-hidden rounded-[2.5rem] transition-all duration-500">
            <CardHeader className="bg-primary/5 p-8 md:p-12 border-b">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-white rounded-3xl shadow-sm text-primary">
                            <GraduationCap size={32} />
                        </div>
                        <div>
                            <CardTitle className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter">
                                {step === 'identification' ? 'Identificação' : 'Catálogo Ministerial'}
                            </CardTitle>
                            <CardDescription className="text-sm md:text-base font-medium">
                                {step === 'identification' ? 'Informe seu e-mail para começarmos.' : 'Escolha onde você deseja crescer este semestre.'}
                            </CardDescription>
                        </div>
                    </div>
                    {step === 'catalog' && (
                        <div className="flex p-1 bg-white rounded-2xl border shadow-sm w-fit">
                            <button 
                                onClick={() => setSelectedTab('ensino')}
                                className={cn("px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all", selectedTab === 'ensino' ? "bg-primary text-white shadow-lg" : "text-slate-400 hover:text-primary")}
                            >
                                Ensino
                            </button>
                            <button 
                                onClick={() => setSelectedTab('eventos')}
                                className={cn("px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all", selectedTab === 'eventos' ? "bg-primary text-white shadow-lg" : "text-slate-400 hover:text-primary")}
                            >
                                Eventos
                            </button>
                        </div>
                    )}
                </div>
            </CardHeader>

            <CardContent className="p-8 md:p-12">
                {step === 'identification' ? (
                    <form onSubmit={handleVerifyEmail} className="max-w-md mx-auto space-y-8 py-10 animate-in fade-in slide-in-from-bottom-4">
                        <div className="space-y-4">
                            <div className="relative">
                                <Mail className="absolute left-4 top-4 text-slate-400 size-5" />
                                <Input 
                                    required 
                                    type="email" 
                                    placeholder="seu@email.com" 
                                    className="h-14 pl-12 rounded-2xl border-2 text-lg font-medium focus-visible:ring-primary/20"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground text-center font-medium italic">
                                Se você já é membro ou congregante, use o e-mail cadastrado na igreja.
                            </p>
                        </div>
                        <Button 
                            disabled={isVerifying || !email} 
                            className="w-full h-14 rounded-2xl font-black text-base uppercase tracking-widest shadow-xl group"
                        >
                            {isVerifying ? <Loader2 className="mr-2 animate-spin" /> : <ArrowRight className="mr-2 group-hover:translate-x-1 transition-transform" />}
                            Acessar Portal
                        </Button>
                    </form>
                ) : (
                    <div className="space-y-10 animate-in fade-in duration-700">
                        {selectedTab === 'ensino' ? (
                            <div className="space-y-8">
                                {/* Sub-abas Ministeriais */}
                                <div className="flex flex-wrap items-center justify-between gap-4">
                                    <div className="flex flex-wrap gap-2">
                                        <Button 
                                            variant={selectedSubTab === 'lumine' ? 'default' : 'outline'}
                                            onClick={() => { setSelectedSubTab('lumine'); setSelectedTrack('all'); }}
                                            className="h-11 px-6 rounded-full font-black uppercase italic tracking-tighter text-xs bg-white"
                                        >
                                            Lumine
                                        </Button>
                                        <Button 
                                            variant={selectedSubTab === 'escolas' ? 'default' : 'outline'}
                                            onClick={() => setSelectedSubTab('escolas')}
                                            className="h-11 px-6 rounded-full font-black uppercase italic tracking-tighter text-xs bg-white"
                                        >
                                            Escolas (Wave/DIS)
                                        </Button>
                                        <Button 
                                            variant={selectedSubTab === 'ministerios' ? 'default' : 'outline'}
                                            onClick={() => setSelectedSubTab('ministerios')}
                                            className="h-11 px-6 rounded-full font-black uppercase italic tracking-tighter text-xs bg-white"
                                        >
                                            Ministérios
                                        </Button>
                                    </div>

                                    {/* Busca */}
                                    <div className="relative w-full md:w-72">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                                        <Input 
                                            placeholder="Buscar curso..." 
                                            className="pl-9 h-11 rounded-xl bg-slate-50 border-none"
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Filtro de Trilhos Lumine */}
                                {selectedSubTab === 'lumine' && (
                                    <div className="p-4 bg-slate-50 rounded-2xl border flex flex-wrap items-center gap-3 animate-in slide-in-from-top-2">
                                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2 flex items-center gap-2">
                                            <Filter size={12} /> Trilhos EBD:
                                        </span>
                                        <div className="flex flex-wrap gap-2">
                                            {[
                                                { id: 'all', label: 'Todos' },
                                                { id: 'biblico', label: 'Bíblico' },
                                                { id: 'teologico', label: 'Teológico' },
                                                { id: 'discipulado', label: 'Discipulado' }
                                            ].map(track => (
                                                <button
                                                    key={track.id}
                                                    onClick={() => setSelectedTrack(track.id as any)}
                                                    className={cn(
                                                        "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all",
                                                        selectedTrack === track.id ? "bg-primary text-white shadow-md" : "bg-white text-slate-600 border hover:border-primary/30"
                                                    )}
                                                >
                                                    {track.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Grid de Cursos */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredCourses.length === 0 ? (
                                        <div className="col-span-full py-20 text-center text-muted-foreground italic border-2 border-dashed rounded-3xl">
                                            Nenhum curso encontrado nesta categoria.
                                        </div>
                                    ) : (
                                        filteredCourses.map(course => (
                                            <Card 
                                                key={course.id} 
                                                className={cn(
                                                    "overflow-hidden cursor-pointer transition-all duration-300 rounded-[2rem] group relative",
                                                    selectedCourseId === course.id ? "ring-4 ring-primary shadow-2xl scale-105" : "hover:shadow-xl hover:translate-y-[-4px]"
                                                )}
                                                onClick={() => setSelectedCourseId(course.id)}
                                            >
                                                <div className="aspect-[16/10] relative">
                                                    <img src={`https://picsum.photos/seed/${course.id}/600/400`} alt={course.name} className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700" />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
                                                    <div className="absolute bottom-4 left-6 z-20">
                                                        <Badge className="bg-primary/20 backdrop-blur-md text-white border-none mb-1 text-[10px] font-black uppercase tracking-widest">{course.ministryName}</Badge>
                                                        <h4 className="text-white text-xl font-black uppercase italic tracking-tighter leading-none">{course.name}</h4>
                                                    </div>
                                                    {selectedCourseId === course.id && (
                                                        <div className="absolute top-4 right-4 z-20 bg-primary text-white p-2 rounded-full shadow-lg animate-in zoom-in-50">
                                                            <Check size={20} />
                                                        </div>
                                                    )}
                                                </div>
                                                <CardContent className="p-6">
                                                    <p className="text-sm text-slate-600 line-clamp-2 mb-4 font-medium italic">"{course.description || 'Sem descrição definida.'}"</p>
                                                    <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                        <span className="flex items-center gap-1"><Users size={12}/> Vagas Abertas</span>
                                                        {course.ebdTrack && <span className="flex items-center gap-1 text-primary"><BookOpen size={12}/> Trilho {course.ebdTrack}</span>}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="py-20 text-center space-y-6 bg-slate-50 rounded-[3rem] border-2 border-dashed">
                                <div className="size-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mx-auto text-slate-300">
                                    <Calendar size={40} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black uppercase italic tracking-tighter">Eventos Estratégicos</h3>
                                    <p className="text-muted-foreground text-sm max-w-xs mx-auto mt-2">Nenhum evento com inscrições abertas no momento. Fique atento às nossas redes sociais.</p>
                                </div>
                            </div>
                        )}

                        {/* Seção de Confirmação Final */}
                        {selectedCourseId && (
                            <div className="pt-10 border-t space-y-8 animate-in slide-in-from-bottom-6">
                                <div className="bg-primary/5 p-8 rounded-[2.5rem] border-2 border-primary/10">
                                    <h3 className="text-xl font-black uppercase italic tracking-tighter text-primary mb-6 flex items-center gap-2">
                                        <CheckCircle size={24}/> Confirmar Dados da Inscrição
                                    </h3>
                                    
                                    {memberData ? (
                                        <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border-2 border-emerald-500 shadow-sm animate-in zoom-in-95">
                                            <div className="size-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-black text-lg">
                                                {memberData.maskedName.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-xs font-black uppercase text-muted-foreground tracking-widest leading-none">Membro Confirmado</p>
                                                <p className="text-lg font-bold text-slate-900">{memberData.maskedName}</p>
                                                <p className="text-xs text-muted-foreground">{memberData.maskedPhone}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] uppercase font-black text-muted-foreground ml-2 tracking-widest">Seu Nome Completo *</Label>
                                                <Input 
                                                    required 
                                                    className="h-12 rounded-xl bg-white" 
                                                    value={newName} 
                                                    onChange={e => setNewName(e.target.value)} 
                                                    placeholder="Como quer ser chamado?"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] uppercase font-black text-muted-foreground ml-2 tracking-widest">WhatsApp *</Label>
                                                <Input 
                                                    required 
                                                    className="h-12 rounded-xl bg-white" 
                                                    value={newPhone} 
                                                    onChange={e => setNewPhone(e.target.value)} 
                                                    placeholder="(21) 9..."
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <Button 
                                    onClick={handleEnroll} 
                                    disabled={isSubmitting || (!memberData && !newName)} 
                                    className="w-full h-16 rounded-[2rem] font-black text-lg uppercase tracking-[0.2em] shadow-2xl group"
                                >
                                    {isSubmitting ? <Loader2 className="mr-2 animate-spin" /> : <Sparkles className="mr-2 group-hover:rotate-12 transition-transform" />}
                                    Protocolar Minha Inscrição
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
            
            <CardFooter className="bg-muted/20 p-8 flex flex-col gap-4 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Igreja Batista da Manhã • Ano da Visão 2026</p>
            </CardFooter>
        </Card>
    );
}

export default function PublicEnrollmentPage() {
    return (
        <main className="min-h-screen bg-[#F8F9FA] py-12 md:py-20 px-4 flex flex-col items-center">
            <div className="max-w-5xl w-full space-y-12">
                <div className="text-center space-y-4">
                    <Logo className="size-16 text-primary mx-auto mb-4 animate-in fade-in duration-1000" />
                    <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">Portal de <br /> <span className="text-primary">Inscrições</span></h1>
                    <p className="text-muted-foreground text-sm md:text-xl font-medium tracking-tight uppercase tracking-widest max-w-xl mx-auto">Conectando você ao seu próximo nível ministerial e espiritual.</p>
                </div>

                <VolunteeringProvider>
                    <EnrollmentForm />
                </VolunteeringProvider>
            </div>
        </main>
    );
}
