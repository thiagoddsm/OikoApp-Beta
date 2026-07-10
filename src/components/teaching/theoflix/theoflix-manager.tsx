
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Checkbox } from '@/components/ui/checkbox';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
    DialogFooter,
    DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardDescription
} from '@/components/ui/card';
import { 
    PlusCircle, 
    Trash2, 
    Edit, 
    Video, 
    Layers, 
    ImageIcon,
    Save,
    Loader2,
    DatabaseZap,
    Youtube,
    Wand2,
    Settings,
    ChevronUp,
    ChevronDown,
    X,
    Info
} from 'lucide-react';
import { type Course, type Episode } from '@/lib/theoflix-data';
import { type TheoLevel } from '@/app/dashboard/teaching/theoflix/page';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface TheoflixManagerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    existingCourses: Course[];
    existingLevels: TheoLevel[];
}

const colorOptions = [
    { value: 'blue', label: 'Azul', class: 'bg-blue-500' },
    { value: 'rose', label: 'Rosa', class: 'bg-rose-500' },
    { value: 'amber', label: 'Âmbar', class: 'bg-amber-500' },
    { value: 'purple', label: 'Roxo', class: 'bg-purple-500' },
    { value: 'emerald', label: 'Esmeralda', class: 'bg-emerald-500' },
    { value: 'indigo', label: 'Índigo', class: 'bg-indigo-500' },
    { value: 'slate', label: 'Cinza', class: 'bg-slate-500' }
];

const colorDotMap: Record<string, string> = {
    blue: 'bg-blue-500',
    rose: 'bg-rose-500',
    amber: 'bg-amber-500',
    purple: 'bg-purple-500',
    emerald: 'bg-emerald-500',
    indigo: 'bg-indigo-500',
    slate: 'bg-slate-500'
};

export function TheoflixManager({ open, onOpenChange, existingCourses, existingLevels }: TheoflixManagerProps) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [selectedLevel, setSelectedLevel] = useState<TheoLevel | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isSeeding, setIsSeeding] = useState(false);
    
    const { data: theoflixConfig } = useDoc<any>('config/theoflix');
    const [youtubeApiKey, setYoutubeApiKey] = useState('');
    const [quizMinScore, setQuizMinScore] = useState(70);
    const [isSavingConfig, setIsSavingConfig] = useState(false);

    const [formCourse, setFormCourse] = useState<Partial<Course>>({
        title: '',
        desc: '',
        level: 1,
        image: '',
        type: 'Obrigatório',
        tags: [],
        episodes: [],
        requireEnrollment: false
    });

    const [formLevel, setFormLevel] = useState<Partial<TheoLevel>>({
        title: '',
        level: 1,
        color: 'blue'
    });

    useEffect(() => {
        if (theoflixConfig) {
            setYoutubeApiKey(theoflixConfig.youtubeApiKey || '');
            setQuizMinScore(theoflixConfig.quizMinScore || 70);
        }
    }, [theoflixConfig]);

    useEffect(() => {
        if (selectedCourse) {
            setFormCourse({ ...selectedCourse, episodes: selectedCourse.episodes || [] });
        } else {
            setFormCourse({ title: '', desc: '', level: 1, image: '', type: 'Obrigatório', tags: [], episodes: [], requireEnrollment: false });
        }
    }, [selectedCourse, open]);

    useEffect(() => {
        if (selectedLevel) {
            setFormLevel(selectedLevel);
        } else {
            setFormLevel({ title: '', level: (existingLevels?.length || 0) + 1, color: 'blue' });
        }
    }, [selectedLevel, open, existingLevels]);

    const handleSaveConfig = async () => {
        if (!firestore) return;
        setIsSavingConfig(true);
        try {
            await setDocumentNonBlocking(doc(firestore, 'config', 'theoflix'), {
                youtubeApiKey,
                quizMinScore,
                updatedAt: new Date().toISOString()
            }, { merge: true });
            toast({ title: "Configuração Salva!", description: "As configurações do TheoFlix foram atualizadas." });
        } catch (e) {
            toast({ variant: 'destructive', title: "Erro ao salvar config" });
        } finally {
            setIsSavingConfig(false);
        }
    };

    const handleSaveCourse = async () => {
        if (!firestore || !formCourse.title) return;
        setIsSaving(true);
        const courseId = formCourse.id || formCourse.title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
        try {
            await setDocumentNonBlocking(doc(firestore, 'theoflix_courses', courseId), { ...formCourse, id: courseId }, { merge: true });
            toast({ title: "Curso Salvo!" });
            setSelectedCourse(null);
        } catch (error) {
            toast({ variant: 'destructive', title: "Erro ao salvar" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveLevel = async () => {
        if (!firestore || !formLevel.title) return;
        setIsSaving(true);
        const lvlId = formLevel.id || `level_${formLevel.level}`;
        try {
            await setDocumentNonBlocking(doc(firestore, 'theoflix_levels', lvlId), { ...formLevel, id: lvlId }, { merge: true });
            toast({ title: "Nível Salvo!" });
            setSelectedLevel(null);
        } catch (error) {
            toast({ variant: 'destructive', title: "Erro ao salvar nível" });
        } finally {
            setIsSaving(false);
        }
    };

    const parseDuration = (duration: string) => {
      const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      if (!match) return '0min';
      const hours = parseInt(match[1]) || 0;
      const minutes = parseInt(match[2]) || 0;
      const seconds = parseInt(match[3]) || 0;
      let result = '';
      if (hours > 0) result += `${hours}h `;
      if (minutes > 0 || hours > 0) result += `${minutes}min`;
      else if (seconds > 0) result += `${seconds}s`;
      return result.trim() || '0min';
    };

    const fetchYoutubeMetadata = async (index: number) => {
        const youtubeId = formCourse.episodes?.[index]?.youtubeId;
        if (!youtubeId || !youtubeApiKey) {
            toast({ variant: 'destructive', title: "Configuração pendente", description: "Insira a API Key e o ID do vídeo." });
            return;
        }
        try {
            const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?id=${youtubeId}&key=${youtubeApiKey}&part=snippet,contentDetails`);
            const data = await res.json();
            if (data.items && data.items.length > 0) {
                const item = data.items[0];
                const newEps = [...(formCourse.episodes || [])];
                newEps[index] = { ...newEps[index], title: item.snippet.title, duration: parseDuration(item.contentDetails.duration) };
                setFormCourse(prev => ({ ...prev, episodes: newEps }));
                toast({ title: "Dados importados!" });
            }
        } catch (e) { toast({ variant: 'destructive', title: "Erro API YouTube" }); }
    };

    const handleSeedData = async () => {
        if (!firestore || !confirm("Deseja importar cursos e níveis padrão?")) return;
        setIsSeeding(true);
        try {
            const coursePromises = existingCourses.map(c => setDocumentNonBlocking(doc(firestore, 'theoflix_courses', c.id), c, { merge: true }));
            const levelPromises = existingLevels.map(l => setDocumentNonBlocking(doc(firestore, 'theoflix_levels', l.id), l, { merge: true }));
            await Promise.all([...coursePromises, ...levelPromises]);
            toast({ title: "Sincronização Concluída!" });
        } catch (error) { toast({ variant: 'destructive', title: "Erro na Sincronização" }); }
        finally { setIsSeeding(false); }
    };

    const handleAddEpisode = () => {
        setFormCourse(prev => ({ ...prev, episodes: [...(prev.episodes || []), { title: 'Nova Aula', youtubeId: '', duration: '45min' }] }));
    };

    const moveEpisode = (index: number, direction: 'up' | 'down') => {
        if (!formCourse.episodes) return;
        const newEps = [...formCourse.episodes];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        
        if (targetIndex < 0 || targetIndex >= newEps.length) return;
        
        const temp = newEps[index];
        newEps[index] = newEps[targetIndex];
        newEps[targetIndex] = temp;
        
        setFormCourse(prev => ({ ...prev, episodes: newEps }));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl w-full h-[100dvh] sm:h-[90vh] flex flex-col p-0 overflow-hidden rounded-none sm:rounded-xl border-none">
                <DialogHeader className="p-4 sm:p-6 border-b bg-muted/20 shrink-0">
                    <div className="flex justify-between items-center pr-8 sm:pr-0">
                        <div>
                            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                                <Video className="text-primary size-5" />
                                Gerenciador TheoFlix
                            </DialogTitle>
                            <DialogDescription className="text-[10px] sm:text-xs">Administre cursos, aulas e níveis da trilha.</DialogDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="icon" onClick={handleSeedData} disabled={isSeeding} className="h-8 w-8 sm:h-10 sm:w-10">
                                {isSeeding ? <Loader2 className="animate-spin size-4" /> : <DatabaseZap className="size-4" />}
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                <Tabs defaultValue="courses" className="flex-1 min-h-0 flex flex-col overflow-hidden">
                    <div className="px-4 sm:px-6 border-b bg-white overflow-x-auto no-scrollbar shrink-0">
                        <TabsList className="bg-transparent border-b-0 h-12 w-full justify-start sm:justify-center flex-nowrap min-w-max">
                            <TabsTrigger value="courses" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 text-xs sm:text-sm h-full">Cursos</TabsTrigger>
                            <TabsTrigger value="levels" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 text-xs sm:text-sm h-full">Níveis</TabsTrigger>
                            <TabsTrigger value="config" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 text-xs sm:text-sm h-full">Configurações</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="courses" className="flex-1 min-h-0 m-0 data-[state=inactive]:hidden data-[state=active]:flex data-[state=active]:flex-col">
                        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
                            <div className="w-full md:w-80 border-r bg-muted/10 p-4 flex flex-col gap-4 overflow-y-auto max-h-[25vh] md:max-h-full shrink-0">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-black text-[10px] uppercase text-muted-foreground tracking-widest">Biblioteca</h3>
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={() => setSelectedCourse(null)}><PlusCircle size={18} /></Button>
                                </div>
                                <div className="flex flex-col gap-2">
                                    {existingCourses.map(course => (
                                        <button 
                                            key={course.id} 
                                            onClick={() => setSelectedCourse(course)} 
                                            className={cn(
                                                "w-full p-2.5 rounded-xl border text-left transition-all flex items-center gap-3", 
                                                selectedCourse?.id === course.id ? "bg-white border-primary shadow-sm ring-1 ring-primary/20" : "bg-card hover:bg-white"
                                            )}
                                        >
                                            <div className="size-10 rounded-lg relative overflow-hidden bg-muted shrink-0 shadow-sm">
                                                <Image src={course.image || 'https://picsum.photos/seed/placeholder/100/100'} alt="" fill className="object-cover" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-black truncate text-slate-900 uppercase tracking-tighter">{course.title}</p>
                                                <Badge variant="outline" className="text-[8px] h-4 mt-0.5 font-bold">Nível {course.level}</Badge>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex-1 min-h-0 overflow-y-auto bg-white p-4 sm:p-8">
                                <div className="max-w-2xl mx-auto space-y-8 pb-12">
                                    <div className="flex justify-between items-center pb-2 border-b">
                                        <h4 className="text-lg sm:text-xl font-black uppercase italic tracking-tighter text-slate-900">
                                            {selectedCourse ? `Editar: ${selectedCourse.title}` : 'Novo Curso'}
                                        </h4>
                                        {selectedCourse && (
                                            <Button variant="ghost" size="icon" className="text-destructive h-10 w-10 hover:bg-red-50" onClick={() => {
                                                if(confirm("Deseja excluir este curso?")) deleteDocumentNonBlocking(doc(firestore!, 'theoflix_courses', selectedCourse.id));
                                            }}>
                                                <Trash2 size={20} />
                                            </Button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-wider">Título do Curso</Label>
                                            <Input value={formCourse.title} onChange={e => setFormCourse(p => ({...p, title: e.target.value}))} placeholder="Ex: Curso de Membros" className="h-11 font-bold" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-wider">Nível da Trilha</Label>
                                            <Input type="number" value={formCourse.level} onChange={e => setFormCourse(p => ({...p, level: parseInt(e.target.value)}))} className="h-11" />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-wider">URL da Imagem de Capa</Label>
                                        <div className="relative">
                                            <ImageIcon className="absolute left-3 top-3 size-4 text-muted-foreground" />
                                            <Input value={formCourse.image} onChange={e => setFormCourse(p => ({...p, image: e.target.value}))} placeholder="https://..." className="pl-10 h-11" />
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-2 p-4 bg-slate-50 rounded-xl border border-dashed">
                                        <Checkbox 
                                            id="requireEnrollment" 
                                            checked={formCourse.requireEnrollment} 
                                            onCheckedChange={(checked) => setFormCourse(p => ({...p, requireEnrollment: !!checked}))}
                                        />
                                        <div className="grid gap-1.5 leading-none">
                                            <label
                                                htmlFor="requireEnrollment"
                                                className="text-xs font-black uppercase tracking-tight leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                            >
                                                Restrito a Alunos Matriculados
                                            </label>
                                            <p className="text-[10px] text-muted-foreground font-medium">
                                                Se ativo, apenas alunos matriculados no curso presencial correspondente poderão assistir.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-wider">Sinopse do Curso</Label>
                                        <Textarea rows={4} value={formCourse.desc} onChange={e => setFormCourse(p => ({...p, desc: e.target.value}))} placeholder="Breve descrição do conteúdo..." className="resize-none" />
                                    </div>
                                    
                                    <div className="space-y-6 pt-6 border-t">
                                        <div className="flex justify-between items-center">
                                            <h4 className="text-xs font-black uppercase text-primary tracking-[0.2em]">Grade de Aulas</h4>
                                            <Button size="sm" variant="outline" onClick={handleAddEpisode} className="h-8 font-bold border-primary text-primary hover:bg-primary/5">
                                                <PlusCircle className="mr-2 size-4" /> Adicionar Aula
                                            </Button>
                                        </div>
                                        <div className="space-y-4">
                                            {(formCourse.episodes || []).map((ep, idx) => (
                                                <Card key={idx} className="p-4 rounded-2xl border-2 bg-muted/5 flex flex-col gap-4 relative group transition-all hover:border-primary/30">
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Título da Aula {idx + 1}</Label>
                                                        <Input className="h-10 text-sm bg-white font-bold" value={ep.title} onChange={e => { const n = [...formCourse.episodes!]; n[idx].title = e.target.value; setFormCourse(p => ({...p, episodes: n})); }} />
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <div className="space-y-1.5">
                                                            <Label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">YouTube ID</Label>
                                                            <div className="flex gap-2">
                                                                <div className="relative flex-1">
                                                                    <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-red-500" />
                                                                    <Input className="h-10 text-xs pl-10 bg-white font-mono" value={ep.youtubeId} onChange={e => { const n = [...formCourse.episodes!]; n[idx].youtubeId = e.target.value; setFormCourse(p => ({...p, episodes: n})); }} placeholder="ID do Vídeo" />
                                                                </div>
                                                                <Button variant="secondary" size="icon" className="h-10 w-10 shrink-0 shadow-sm" onClick={() => fetchYoutubeMetadata(idx)}>
                                                                    <Wand2 size={18} />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <Label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Duração</Label>
                                                            <Input className="h-10 text-sm bg-white" value={ep.duration} onChange={e => { const n = [...formCourse.episodes!]; n[idx].duration = e.target.value; setFormCourse(p => ({...p, episodes: n})); }} placeholder="Ex: 45min" />
                                                        </div>
                                                    </div>
                                                    <div className="absolute -top-3 -right-3 flex gap-1.5">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-8 w-8 rounded-full bg-white shadow-xl text-primary border-2 hover:scale-110 active:scale-95 transition-transform disabled:opacity-30" 
                                                            onClick={() => moveEpisode(idx, 'up')}
                                                            disabled={idx === 0}
                                                        >
                                                            <ChevronUp size={16} />
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-8 w-8 rounded-full bg-white shadow-xl text-primary border-2 hover:scale-110 active:scale-95 transition-transform disabled:opacity-30" 
                                                            onClick={() => moveEpisode(idx, 'down')}
                                                            disabled={idx === (formCourse.episodes?.length || 0) - 1}
                                                        >
                                                            <ChevronDown size={16} />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white shadow-xl text-destructive border-2 hover:scale-110 active:scale-95 transition-transform" onClick={() => setFormCourse(p => ({...p, episodes: p.episodes?.filter((_, i) => i !== idx)}))}>
                                                            <X size={16} />
                                                        </Button>
                                                    </div>

                                                    {/* Editor de Quiz */}
                                                    <div className="mt-4 pt-4 border-t border-dashed">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div className="flex items-center gap-2">
                                                                <DatabaseZap className={cn("size-4", ep.quiz?.enabled ? "text-primary" : "text-muted-foreground")} />
                                                                <span className="text-[10px] font-black uppercase tracking-widest">Avaliação (Quiz)</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Label htmlFor={`quiz-enable-${idx}`} className="text-[9px] font-bold uppercase cursor-pointer">Ativar Quiz</Label>
                                                                <input 
                                                                    id={`quiz-enable-${idx}`}
                                                                    type="checkbox" 
                                                                    checked={!!ep.quiz?.enabled} 
                                                                    onChange={e => {
                                                                        const n = [...formCourse.episodes!];
                                                                        n[idx].quiz = { enabled: e.target.checked, questions: n[idx].quiz?.questions || [] };
                                                                        setFormCourse(p => ({...p, episodes: n}));
                                                                    }}
                                                                    className="size-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                                />
                                                            </div>
                                                        </div>

                                                        {ep.quiz?.enabled && (
                                                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                                                {(ep.quiz.questions || []).map((q, qIdx) => (
                                                                    <div key={qIdx} className="bg-white p-3 rounded-xl border border-primary/10 relative space-y-3">
                                                                        <div className="flex justify-between items-center">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-[9px] font-black text-primary/50">PERGUNTA {qIdx + 1}</span>
                                                                                <select
                                                                                    value={q.type || 'multiple'}
                                                                                    onChange={e => {
                                                                                        const n = [...formCourse.episodes!];
                                                                                        const typeVal = e.target.value as 'multiple' | 'essay';
                                                                                        n[idx].quiz!.questions[qIdx].type = typeVal;
                                                                                        if (typeVal === 'essay') {
                                                                                            n[idx].quiz!.questions[qIdx].options = [];
                                                                                            n[idx].quiz!.questions[qIdx].correctIndex = undefined;
                                                                                        } else {
                                                                                            n[idx].quiz!.questions[qIdx].options = ['', '', '', ''];
                                                                                            n[idx].quiz!.questions[qIdx].correctIndex = 0;
                                                                                        }
                                                                                        setFormCourse(p => ({...p, episodes: n}));
                                                                                    }}
                                                                                    className="text-[9px] font-black uppercase tracking-tight bg-slate-100 border border-slate-200 text-slate-800 rounded px-1.5 py-0.5"
                                                                                >
                                                                                    <option value="multiple">Múltipla Escolha</option>
                                                                                    <option value="essay">Discursiva (Texto)</option>
                                                                                </select>
                                                                            </div>
                                                                            <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => {
                                                                                const n = [...formCourse.episodes!];
                                                                                n[idx].quiz!.questions = n[idx].quiz!.questions.filter((_, i) => i !== qIdx);
                                                                                setFormCourse(p => ({...p, episodes: n}));
                                                                            }}>
                                                                                <Trash2 size={12} />
                                                                            </Button>
                                                                        </div>
                                                                        <Input 
                                                                            placeholder="Texto da pergunta..." 
                                                                            className="h-9 text-xs font-bold"
                                                                            value={q.question}
                                                                            onChange={e => {
                                                                                const n = [...formCourse.episodes!];
                                                                                n[idx].quiz!.questions[qIdx].question = e.target.value;
                                                                                setFormCourse(p => ({...p, episodes: n}));
                                                                            }}
                                                                        />
                                                                        
                                                                        {(q.type || 'multiple') === 'multiple' ? (
                                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                                {[0, 1, 2, 3].map(optIdx => (
                                                                                    <div key={optIdx} className="flex items-center gap-2">
                                                                                        <input 
                                                                                            type="radio" 
                                                                                            name={`correct-${idx}-${qIdx}`}
                                                                                            checked={q.correctIndex === optIdx}
                                                                                            onChange={() => {
                                                                                                const n = [...formCourse.episodes!];
                                                                                                n[idx].quiz!.questions[qIdx].correctIndex = optIdx;
                                                                                                setFormCourse(p => ({...p, episodes: n}));
                                                                                            }}
                                                                                            className="size-3 text-primary"
                                                                                        />
                                                                                        <Input 
                                                                                            placeholder={`Opção ${optIdx + 1}`} 
                                                                                            className={cn("h-8 text-[10px]", q.correctIndex === optIdx && "border-primary bg-primary/5")}
                                                                                            value={(q.options || [])[optIdx] || ''}
                                                                                            onChange={e => {
                                                                                                const n = [...formCourse.episodes!];
                                                                                                const opts = [...(n[idx].quiz!.questions[qIdx].options || ['', '', '', ''])];
                                                                                                opts[optIdx] = e.target.value;
                                                                                                n[idx].quiz!.questions[qIdx].options = opts;
                                                                                                setFormCourse(p => ({...p, episodes: n}));
                                                                                            }}
                                                                                        />
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        ) : (
                                                                            <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-dashed text-xs">
                                                                                <p className="text-[10px] text-muted-foreground italic">
                                                                                    Pergunta discursiva. O aluno responderá digitando um texto aberto livremente.
                                                                                </p>
                                                                                <div className="flex items-center gap-2 mt-1">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        id={`aiActive-${idx}-${qIdx}`}
                                                                                        checked={q.aiActive || false}
                                                                                        onChange={e => {
                                                                                            const n = [...formCourse.episodes!];
                                                                                            n[idx].quiz!.questions[qIdx].aiActive = e.target.checked;
                                                                                            setFormCourse(p => ({...p, episodes: n}));
                                                                                        }}
                                                                                        className="size-3.5 rounded border-gray-300 text-primary focus:ring-primary"
                                                                                    />
                                                                                    <label htmlFor={`aiActive-${idx}-${qIdx}`} className="text-[10px] font-bold text-slate-700">
                                                                                        Ativar Correção por IA (Gemini)
                                                                                    </label>
                                                                                </div>
                                                                                {q.aiActive && (
                                                                                    <div className="mt-2 space-y-1">
                                                                                        <label className="text-[9px] font-black text-slate-500 uppercase">Gabarito / Critérios Sugeridos (Opcional)</label>
                                                                                        <Input
                                                                                            placeholder="Ex: A resposta deve mencionar arrependimento, batismo e o Espírito Santo..."
                                                                                            className="h-8 text-[10px]"
                                                                                            value={q.essayGabarito || ''}
                                                                                            onChange={e => {
                                                                                                const n = [...formCourse.episodes!];
                                                                                                n[idx].quiz!.questions[qIdx].essayGabarito = e.target.value;
                                                                                                setFormCourse(p => ({...p, episodes: n}));
                                                                                            }}
                                                                                        />
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="sm" 
                                                                    className="w-full h-8 text-[10px] font-black uppercase border-2 border-dashed border-primary/20 text-primary hover:bg-primary/5"
                                                                    onClick={() => {
                                                                        const n = [...formCourse.episodes!];
                                                                        n[idx].quiz!.questions.push({ question: '', type: 'multiple', options: ['', '', '', ''], correctIndex: 0 });
                                                                        setFormCourse(p => ({...p, episodes: n}));
                                                                    }}
                                                                >
                                                                    <PlusCircle className="mr-1 size-3" /> Adicionar Pergunta
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </Card>
                                            ))}
                                            {formCourse.episodes?.length === 0 && (
                                                <div className="text-center py-12 text-xs text-muted-foreground border-2 border-dashed rounded-2xl bg-muted/5">Nenhuma aula cadastrada.</div>
                                            )}
                                        </div>
                                    </div>
                                    <Button className="w-full h-14 font-black text-base shadow-lg shadow-primary/20 rounded-2xl" onClick={handleSaveCourse} disabled={isSaving}>
                                        {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />} 
                                        Salvar Alterações do Curso
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="levels" className="flex-1 min-h-0 m-0 data-[state=inactive]:hidden data-[state=active]:flex data-[state=active]:flex-col">
                        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
                            <div className="w-full md:w-80 border-r bg-muted/10 p-4 flex flex-col gap-4 overflow-y-auto max-h-[25vh] md:max-h-full shrink-0">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-black text-[10px] uppercase text-muted-foreground tracking-widest">Etapas</h3>
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={() => setSelectedLevel(null)}><PlusCircle size={18} /></Button>
                                </div>
                                <div className="flex flex-col gap-2">
                                    {existingLevels.map(lvl => (
                                        <button 
                                            key={lvl.id} 
                                            onClick={() => setSelectedLevel(lvl)} 
                                            className={cn(
                                                "w-full p-3.5 rounded-xl border text-left transition-all flex items-center gap-3", 
                                                selectedLevel?.id === lvl.id ? "bg-white border-primary shadow-sm ring-1 ring-primary/20" : "bg-card hover:bg-white"
                                            )}
                                        >
                                            <div className={cn("size-3 rounded-full shrink-0", colorDotMap[lvl.color] || 'bg-slate-500')}></div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-black truncate uppercase tracking-tighter text-slate-900">{lvl.title}</p>
                                                <p className="text-[9px] text-muted-foreground uppercase font-black">Nível {lvl.level}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex-1 min-h-0 overflow-y-auto bg-white p-4 sm:p-8">
                                <div className="max-w-md mx-auto space-y-8 pb-12">
                                    <div className="flex justify-between items-center pb-2 border-b">
                                        <h4 className="text-lg sm:text-xl font-black uppercase italic tracking-tighter">
                                            {selectedLevel ? `Editar: ${selectedLevel.title}` : 'Novo Nível'}
                                        </h4>
                                        {selectedLevel && (
                                            <Button variant="ghost" size="icon" className="text-destructive h-10 w-10 hover:bg-red-50" onClick={() => {
                                                if(confirm("Deseja excluir este nível?")) deleteDocumentNonBlocking(doc(firestore!, 'theoflix_levels', selectedLevel.id));
                                            }}>
                                                <Trash2 size={20} />
                                            </Button>
                                        )}
                                    </div>
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-wider">Nome da Categoria</Label>
                                            <Input value={formLevel.title} onChange={e => setFormLevel(p => ({...p, title: e.target.value}))} placeholder="Ex: Maturidade Cristã" className="h-11 font-bold" />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-wider">Ordem (Nível)</Label>
                                                <Input type="number" value={formLevel.level} onChange={e => setFormLevel(p => ({...p, level: parseInt(e.target.value)}))} className="h-11" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-wider">Cor Visual</Label>
                                                <div className="flex flex-wrap gap-2.5 pt-1">
                                                    {colorOptions.map(opt => (
                                                        <button 
                                                            key={opt.value} 
                                                            onClick={() => setFormLevel(p => ({...p, color: opt.value}))} 
                                                            className={cn(
                                                                "size-7 rounded-full border-2 transition-all shadow-sm", 
                                                                opt.class, 
                                                                formLevel.color === opt.value ? "border-primary scale-125 z-10" : "border-transparent opacity-60 hover:opacity-100"
                                                            )}
                                                            title={opt.label}
                                                        ></button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <Button className="w-full h-14 font-black rounded-2xl shadow-lg" onClick={handleSaveLevel} disabled={isSaving}>
                                            {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />} 
                                            Salvar Nível
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="config" className="flex-1 min-h-0 m-0 data-[state=inactive]:hidden data-[state=active]:block overflow-y-auto bg-white p-4 sm:p-8">
                        <Card className="max-w-2xl mx-auto shadow-sm border-2 border-primary/10 rounded-2xl overflow-hidden">
                            <CardHeader className="bg-primary/5 border-b">
                                <CardTitle className="text-xs sm:text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Settings className="size-4 text-primary" />
                                    Integração YouTube Data API
                                </CardTitle>
                                <CardDescription className="text-[10px] sm:text-xs">Configure as chaves para busca automática de metadados.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-6">
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Google Cloud API Key</Label>
                                    <div className="flex gap-2">
                                        <Input 
                                            type="password" 
                                            value={youtubeApiKey} 
                                            onChange={e => setYoutubeApiKey(e.target.value)} 
                                            placeholder="Cole sua chave aqui..." 
                                            className="font-mono text-xs h-11"
                                        />
                                        <Button onClick={handleSaveConfig} disabled={isSavingConfig} className="h-11 px-4">
                                            {isSavingConfig ? <Loader2 className="animate-spin size-4" /> : <Save className="size-4" />}
                                        </Button>
                                    </div>
                                    <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                                        <Info className="size-5 text-blue-600 shrink-0 mt-0.5" />
                                        <p className="text-[10px] sm:text-xs text-blue-700 leading-relaxed italic font-medium">
                                            Esta chave é necessária para que o botão de "Varinha Mágica" funcione. 
                                            Ela permite que o sistema busque o título e a duração dos vídeos diretamente do YouTube.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-6 border-t border-dashed">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Nota de Corte do Quiz (%)</Label>
                                    <div className="flex items-center gap-4">
                                        <Input 
                                            type="number" 
                                            min="0"
                                            max="100"
                                            value={quizMinScore} 
                                            onChange={e => setQuizMinScore(parseInt(e.target.value))} 
                                            className="w-24 h-11 text-center font-bold"
                                        />
                                        <p className="text-[10px] text-muted-foreground font-medium italic">Percentual mínimo de acertos para aprovação na aula.</p>
                                        <Button onClick={handleSaveConfig} disabled={isSavingConfig} className="h-11 px-4 ml-auto">
                                            {isSavingConfig ? <Loader2 className="animate-spin size-4" /> : <Save className="size-4" />}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                <DialogFooter className="p-4 sm:p-6 border-t bg-muted/50 shrink-0">
                    <DialogClose asChild><Button variant="outline" className="w-full font-black uppercase text-xs h-11 rounded-xl">Fechar Gerenciador</Button></DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
