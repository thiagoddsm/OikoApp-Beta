
'use client';

import React, { useState, useEffect } from 'react';
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
    Settings
} from 'lucide-react';
import { type Course, type Episode } from '@/lib/theoflix-data';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface TheoflixManagerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    existingCourses: Course[];
}

export function TheoflixManager({ open, onOpenChange, existingCourses }: TheoflixManagerProps) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
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

    useEffect(() => {
        if (theoflixConfig) {
            setYoutubeApiKey(theoflixConfig.youtubeApiKey || '');
        }
    }, [theoflixConfig]);

    useEffect(() => {
        if (selectedCourse) {
            setFormCourse(selectedCourse);
        } else {
            setFormCourse({
                title: '',
                desc: '',
                level: 1,
                image: '',
                type: 'Obrigatório',
                tags: [],
                episodes: []
            });
        }
    }, [selectedCourse]);

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
        const docRef = doc(firestore, 'theoflix_courses', courseId);

        try {
            await setDocumentNonBlocking(docRef, { ...formCourse, id: courseId }, { merge: true });
            toast({ title: "Curso Salvo!", description: "As alterações foram publicadas no TheoFlix." });
            setSelectedCourse(null);
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: "Erro ao salvar", description: "Ocorreu uma falha técnica." });
        } finally {
            setIsSaving(false);
        }
    };

    const fetchYoutubeMetadata = async (index: number) => {
        const youtubeId = formCourse.episodes?.[index]?.youtubeId;
        if (!youtubeId || !youtubeApiKey) {
            toast({ 
                variant: 'destructive', 
                title: "Dados ausentes", 
                description: !youtubeApiKey ? "Configure a API Key do YouTube primeiro." : "Insira o ID do vídeo." 
            });
            return;
        }

        try {
            const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?id=${youtubeId}&key=${youtubeApiKey}&part=snippet,contentDetails`);
            const data = await res.json();

            if (data.items && data.items.length > 0) {
                const item = data.items[0];
                const title = item.snippet.title;
                const durationRaw = item.contentDetails.duration; // Ex: PT45M10S
                
                // Conversão simples de ISO 8601 duration para algo legível
                const minutesMatch = durationRaw.match(/(\d+)M/);
                const secondsMatch = durationRaw.match(/(\d+)S/);
                const minutes = minutesMatch ? minutesMatch[1] : '0';
                const seconds = secondsMatch ? secondsMatch[1] : '00';
                const duration = `${minutes}:${seconds.padStart(2, '0')}min`;

                const newEps = [...(formCourse.episodes || [])];
                newEps[index] = { ...newEps[index], title, duration };
                setFormCourse(prev => ({ ...prev, episodes: newEps }));
                
                toast({ title: "Metadados sincronizados!", description: "Título e duração importados do YouTube." });
            } else {
                toast({ variant: 'destructive', title: "Vídeo não encontrado", description: "Verifique se o ID está correto." });
            }
        } catch (e) {
            toast({ variant: 'destructive', title: "Erro na API do YouTube" });
        }
    };

    const handleSeedData = async () => {
        if (!firestore || !confirm("Isso irá importar os dados iniciais do sistema para o banco de dados. Deseja continuar?")) return;
        setIsSeeding(true);
        
        try {
            const promises = existingCourses.map(course => {
                const docRef = doc(firestore, 'theoflix_courses', course.id);
                return setDocumentNonBlocking(docRef, course, { merge: true });
            });
            await Promise.all(promises);
            toast({ title: "Sincronização Concluída!", description: "Dados padrão importados para o Firestore." });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: "Erro na Sincronização" });
        } finally {
            setIsSeeding(false);
        }
    };

    const handleAddEpisode = () => {
        const newEp: Episode = { title: 'Nova Aula', youtubeId: '', duration: '45min' };
        setFormCourse(prev => ({
            ...prev,
            episodes: [...(prev.episodes || []), newEp]
        }));
    };

    const handleUpdateEpisode = (index: number, field: keyof Episode, value: string) => {
        const newEps = [...(formCourse.episodes || [])];
        newEps[index] = { ...newEps[index], [field]: value };
        setFormCourse(prev => ({ ...prev, episodes: newEps }));
    };

    const handleRemoveEpisode = (index: number) => {
        setFormCourse(prev => ({
            ...prev,
            episodes: prev.episodes?.filter((_, i) => i !== index)
        }));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 border-b bg-muted/20">
                    <div className="flex justify-between items-center">
                        <div>
                            <DialogTitle className="flex items-center gap-2">
                                <Video className="text-primary" />
                                TheoFlix Content Manager
                            </DialogTitle>
                            <DialogDescription>
                                Gerencie os vídeos e a estrutura dos cursos.
                            </DialogDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handleSeedData} disabled={isSeeding}>
                                {isSeeding ? <Loader2 className="mr-2 size-4 animate-spin" /> : <DatabaseZap className="mr-2 size-4" />}
                                Importar Padrão
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 flex overflow-hidden">
                    {/* Lista Lateral */}
                    <div className="w-1/3 border-r bg-muted/10 p-4 space-y-4">
                        <div className="space-y-4">
                            <div className="p-3 bg-white rounded-xl border shadow-sm space-y-3">
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                                    <Settings size={12} /> Configuração YouTube
                                </div>
                                <div className="flex gap-2">
                                    <Input 
                                        type="password" 
                                        placeholder="API Key do YouTube" 
                                        value={youtubeApiKey} 
                                        onChange={e => setYoutubeApiKey(e.target.value)} 
                                        className="h-8 text-xs"
                                    />
                                    <Button size="icon" className="h-8 w-8 shrink-0" onClick={handleSaveConfig} disabled={isSavingConfig}>
                                        {isSavingConfig ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-4">
                            <h3 className="font-bold text-sm uppercase text-muted-foreground tracking-widest">Biblioteca</h3>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setSelectedCourse(null)}>
                                <PlusCircle className="size-5" />
                            </Button>
                        </div>
                        <ScrollArea className="h-full">
                            <div className="space-y-2 pr-4 pb-20">
                                {existingCourses.map(course => (
                                    <button
                                        key={course.id}
                                        onClick={() => setSelectedCourse(course)}
                                        className={cn(
                                            "w-full p-3 rounded-xl border text-left transition-all hover:bg-white hover:shadow-md group",
                                            selectedCourse?.id === course.id ? "bg-white border-primary shadow-sm" : "bg-card"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="size-10 rounded-lg relative overflow-hidden bg-muted">
                                                <Image src={course.image} alt="" fill className="object-cover" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold truncate">{course.title}</p>
                                                <span className="text-[10px] text-muted-foreground">{course.episodes?.length || 0} aulas</span>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Formulário */}
                    <div className="flex-1 p-8 overflow-y-auto">
                        <div className="max-w-2xl mx-auto space-y-8 pb-20">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase font-black">Título do Curso</Label>
                                    <Input 
                                        value={formCourse.title} 
                                        onChange={e => setFormCourse(p => ({...p, title: e.target.value}))} 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase font-black">Nível</Label>
                                    <Input 
                                        type="number" 
                                        value={formCourse.level} 
                                        onChange={e => setFormCourse(p => ({...p, level: parseInt(e.target.value)}))} 
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs uppercase font-black">Imagem de Capa</Label>
                                <Input 
                                    value={formCourse.image} 
                                    onChange={e => setFormCourse(p => ({...p, image: e.target.value}))} 
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs uppercase font-black">Sinopse</Label>
                                <Textarea 
                                    rows={4}
                                    value={formCourse.desc} 
                                    onChange={e => setFormCourse(p => ({...p, desc: e.target.value}))} 
                                />
                            </div>

                            {/* Grade de Aulas */}
                            <div className="pt-6 border-t space-y-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-sm font-black uppercase tracking-widest text-primary">Aulas & YouTube IDs</h4>
                                    <Button size="sm" variant="outline" onClick={handleAddEpisode}>
                                        <PlusCircle className="mr-2 size-4" /> Adicionar Aula
                                    </Button>
                                </div>

                                <div className="space-y-3">
                                    {formCourse.episodes?.map((ep, idx) => (
                                        <div key={idx} className="p-4 rounded-xl border bg-muted/20 space-y-4 relative group">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] font-bold">Título</Label>
                                                    <Input 
                                                        value={ep.title} 
                                                        onChange={e => handleUpdateEpisode(idx, 'title', e.target.value)}
                                                        className="h-8 text-sm"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] font-bold text-red-600">YouTube ID</Label>
                                                    <div className="flex gap-2">
                                                        <div className="relative flex-1">
                                                            <Youtube className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-red-400" />
                                                            <Input 
                                                                value={ep.youtubeId} 
                                                                onChange={e => handleUpdateEpisode(idx, 'youtubeId', e.target.value)}
                                                                className="h-8 text-sm pl-7"
                                                                placeholder="ex: dQw4w9WgXcQ"
                                                            />
                                                        </div>
                                                        <Button 
                                                            variant="secondary" 
                                                            size="icon" 
                                                            className="h-8 w-8 shrink-0" 
                                                            onClick={() => fetchYoutubeMetadata(idx)}
                                                            title="Sincronizar com YouTube"
                                                        >
                                                            <Wand2 size={14} />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-white shadow-sm text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => handleRemoveEpisode(idx)}
                                            >
                                                <Trash2 size={12} />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-6 border-t bg-muted/50">
                    <DialogClose asChild>
                        <Button variant="outline">Cancelar</Button>
                    </DialogClose>
                    <Button onClick={handleSaveCourse} disabled={isSaving || !formCourse.title}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Publicar no TheoFlix
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
