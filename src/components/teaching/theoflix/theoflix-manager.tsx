
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
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
    Type, 
    Image as ImageIcon,
    Save,
    Loader2,
    DatabaseZap,
    Youtube,
    Wand2,
    Settings,
    ChevronUp,
    ChevronDown,
    Palette
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
    { value: 'blue', label: 'Azul' },
    { value: 'rose', label: 'Rosa' },
    { value: 'amber', label: 'Âmbar' },
    { value: 'purple', label: 'Roxo' },
    { value: 'emerald', label: 'Esmeralda' },
    { value: 'indigo', label: 'Índigo' },
    { value: 'slate', label: 'Cinza' }
];

export function TheoflixManager({ open, onOpenChange, existingCourses, existingLevels }: TheoflixManagerProps) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [selectedLevel, setSelectedLevel] = useState<TheoLevel | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isSeeding, setIsSeeding] = useState(false);
    
    // YouTube Config
    const { data: theoflixConfig } = useDoc<any>('config/theoflix');
    const [youtubeApiKey, setYoutubeApiKey] = useState('');
    const [isSavingConfig, setIsSavingConfig] = useState(false);

    // Course Form State
    const [formCourse, setFormCourse] = useState<Partial<Course>>({
        title: '',
        desc: '',
        level: 1,
        image: '',
        type: 'Obrigatório',
        tags: [],
        episodes: []
    });

    // Level Form State
    const [formLevel, setFormLevel] = useState<Partial<TheoLevel>>({
        title: '',
        level: 1,
        color: 'blue'
    });

    useEffect(() => {
        if (theoflixConfig) setYoutubeApiKey(theoflixConfig.youtubeApiKey || '');
    }, [theoflixConfig]);

    useEffect(() => {
        if (selectedCourse) {
            setFormCourse({ ...selectedCourse, episodes: selectedCourse.episodes || [] });
        } else {
            setFormCourse({ title: '', desc: '', level: 1, image: '', type: 'Obrigatório', tags: [], episodes: [] });
        }
    }, [selectedCourse, open]);

    useEffect(() => {
        if (selectedLevel) {
            setFormLevel(selectedLevel);
        } else {
            setFormLevel({ title: '', level: existingLevels.length + 1, color: 'blue' });
        }
    }, [selectedLevel, open, existingLevels]);

    const handleSaveConfig = async () => {
        if (!firestore) return;
        setIsSavingConfig(true);
        try {
            await setDocumentNonBlocking(doc(firestore, 'config', 'theoflix'), {
                youtubeApiKey,
                updatedAt: new Date().toISOString()
            }, { merge: true });
            toast({ title: "Configuração Salva!", description: "A API Key do YouTube foi atualizada." });
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 border-b bg-muted/20">
                    <div className="flex justify-between items-center">
                        <div>
                            <DialogTitle className="flex items-center gap-2">
                                <Video className="text-primary" />
                                Gerenciador TheoFlix
                            </DialogTitle>
                            <DialogDescription>Administre cursos, aulas e níveis da trilha.</DialogDescription>
                        </div>
                        <Button variant="outline" size="icon" onClick={handleSeedData} disabled={isSeeding}>
                            {isSeeding ? <Loader2 className="animate-spin size-4" /> : <DatabaseZap className="size-4" />}
                        </Button>
                    </div>
                </DialogHeader>

                <Tabs defaultValue="courses" className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-6 border-b bg-white">
                        <TabsList className="bg-transparent border-b-0 h-12">
                            <TabsTrigger value="courses" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">Cursos</TabsTrigger>
                            <TabsTrigger value="levels" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">Níveis</TabsTrigger>
                            <TabsTrigger value="config" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">Configurações</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="courses" className="flex-1 flex overflow-hidden m-0">
                        <div className="w-1/3 border-r bg-muted/10 p-4 flex flex-col gap-4 overflow-y-auto">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-xs uppercase text-muted-foreground tracking-widest">Cursos Disponíveis</h3>
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setSelectedCourse(null)}><PlusCircle size={18} /></Button>
                            </div>
                            <div className="space-y-2">
                                {existingCourses.map(course => (
                                    <button key={course.id} onClick={() => setSelectedCourse(course)} className={cn("w-full p-3 rounded-xl border text-left transition-all hover:bg-white group", selectedCourse?.id === course.id ? "bg-white border-primary shadow-sm" : "bg-card")}>
                                        <div className="flex items-center gap-3">
                                            <div className="size-8 rounded-lg relative overflow-hidden bg-muted shrink-0">
                                                <Image src={course.image || 'https://picsum.photos/seed/placeholder/100/100'} alt="" fill className="object-cover" />
                                            </div>
                                            <div className="min-w-0 flex-1"><p className="text-sm font-bold truncate">{course.title}</p></div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 p-8 overflow-y-auto">
                            <div className="max-w-2xl mx-auto space-y-6">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-lg font-black uppercase italic tracking-tighter">{selectedCourse ? 'Editar Curso' : 'Novo Curso'}</h4>
                                    {selectedCourse && <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteDocumentNonBlocking(doc(firestore!, 'theoflix_courses', selectedCourse.id))}><Trash2 size={18} /></Button>}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2"><Label className="text-xs uppercase font-black">Título</Label><Input value={formCourse.title} onChange={e => setFormCourse(p => ({...p, title: e.target.value}))} /></div>
                                    <div className="space-y-2">
                                        <Label className="text-xs uppercase font-black">Nível</Label>
                                        <Input type="number" value={formCourse.level} onChange={e => setFormCourse(p => ({...p, level: parseInt(e.target.value)}))} />
                                    </div>
                                </div>
                                <div className="space-y-2"><Label className="text-xs uppercase font-black">Capa (URL)</Label><Input value={formCourse.image} onChange={e => setFormCourse(p => ({...p, image: e.target.value}))} /></div>
                                <div className="space-y-2"><Label className="text-xs uppercase font-black">Sinopse</Label><Textarea rows={3} value={formCourse.desc} onChange={e => setFormCourse(p => ({...p, desc: e.target.value}))} /></div>
                                <div className="space-y-4 pt-4">
                                    <div className="flex justify-between items-center"><h4 className="text-sm font-black uppercase text-primary">Aulas</h4><Button size="sm" variant="outline" onClick={handleAddEpisode}><PlusCircle className="mr-2 size-4" /> Add</Button></div>
                                    <div className="space-y-2">
                                        {(formCourse.episodes || []).map((ep, idx) => (
                                            <div key={idx} className="p-3 rounded-lg border bg-muted/20 flex flex-col gap-2 relative group">
                                                <Input className="h-8 text-sm bg-white" value={ep.title} onChange={e => { const n = [...formCourse.episodes!]; n[idx].title = e.target.value; setFormCourse(p => ({...p, episodes: n})); }} placeholder="Título da aula" />
                                                <div className="flex gap-2">
                                                    <div className="relative flex-1">
                                                        <Youtube className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-red-400" />
                                                        <Input className="h-8 text-sm pl-7 bg-white" value={ep.youtubeId} onChange={e => { const n = [...formCourse.episodes!]; n[idx].youtubeId = e.target.value; setFormCourse(p => ({...p, episodes: n})); }} placeholder="YouTube ID" />
                                                    </div>
                                                    <Button variant="secondary" size="icon" className="h-8 w-8" onClick={() => fetchYoutubeMetadata(idx)}><Wand2 size={14} /></Button>
                                                </div>
                                                <Button variant="ghost" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-white shadow-sm text-destructive" onClick={() => setFormCourse(p => ({...p, episodes: p.episodes?.filter((_, i) => i !== idx)}))}><Trash2 size={12} /></Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <Button className="w-full" onClick={handleSaveCourse} disabled={isSaving}>{isSaving ? <Loader2 className="animate-spin" /> : <Save className="mr-2" />} Salvar Curso</Button>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="levels" className="flex-1 flex overflow-hidden m-0">
                        <div className="w-1/3 border-r bg-muted/10 p-4 flex flex-col gap-4 overflow-y-auto">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-xs uppercase text-muted-foreground tracking-widest">Etapas da Trilha</h3>
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setSelectedLevel(null)}><PlusCircle size={18} /></Button>
                            </div>
                            <div className="space-y-2">
                                {existingLevels.map(lvl => (
                                    <button key={lvl.id} onClick={() => setSelectedLevel(lvl)} className={cn("w-full p-3 rounded-xl border text-left transition-all flex items-center gap-3", selectedLevel?.id === lvl.id ? "bg-white border-primary shadow-sm" : "bg-card")}>
                                        <div className={cn("size-3 rounded-full", `bg-${lvl.color}-500`)}></div>
                                        <div className="min-w-0 flex-1"><p className="text-sm font-bold truncate">{lvl.title}</p><p className="text-[10px] text-muted-foreground">Nível {lvl.level}</p></div>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 p-8 overflow-y-auto">
                            <div className="max-w-md mx-auto space-y-6">
                                <h4 className="text-lg font-black uppercase italic tracking-tighter">{selectedLevel ? 'Editar Nível' : 'Novo Nível'}</h4>
                                <div className="space-y-4">
                                    <div className="space-y-2"><Label className="text-xs uppercase font-black">Título do Nível</Label><Input value={formLevel.title} onChange={e => setFormLevel(p => ({...p, title: e.target.value}))} placeholder="Ex: Maturidade Cristã" /></div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2"><Label className="text-xs uppercase font-black">Ordem (Nível)</Label><Input type="number" value={formLevel.level} onChange={e => setFormLevel(p => ({...p, level: parseInt(e.target.value)}))} /></div>
                                        <div className="space-y-2">
                                            <Label className="text-xs uppercase font-black">Cor Temática</Label>
                                            <div className="grid grid-cols-4 gap-2">
                                                {colorOptions.map(opt => (
                                                    <button key={opt.value} onClick={() => setFormLevel(p => ({...p, color: opt.value}))} className={cn("size-6 rounded-full border-2 transition-all", `bg-${opt.value}-500`, formLevel.color === opt.value ? "border-black scale-110" : "border-transparent opacity-60")}></button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    {selectedLevel && <Button variant="ghost" className="w-full text-destructive" onClick={() => deleteDocumentNonBlocking(doc(firestore!, 'theoflix_levels', selectedLevel.id))}>Excluir Nível</Button>}
                                    <Button className="w-full" onClick={handleSaveLevel} disabled={isSaving}>{isSaving ? <Loader2 className="animate-spin" /> : <Save className="mr-2" />} Salvar Nível</Button>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="config" className="p-8 m-0">
                        <Card className="max-w-2xl mx-auto">
                            <CardHeader><CardTitle className="text-sm font-bold uppercase tracking-widest">Integração YouTube Data API</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>API Key (Google Cloud)</Label>
                                    <div className="flex gap-2">
                                        <Input type="password" value={youtubeApiKey} onChange={e => setYoutubeApiKey(e.target.value)} placeholder="Cole sua chave aqui..." />
                                        <Button onClick={handleSaveConfig} disabled={isSavingConfig}>{isSavingConfig ? <Loader2 className="animate-spin" /> : <Save className="size-4" />}</Button>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground italic">Necessário para importar automaticamente títulos e durações de vídeos.</p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                <DialogFooter className="p-6 border-t bg-muted/50"><DialogClose asChild><Button variant="outline">Fechar</Button></DialogClose></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
