
'use client';

import React, { useState, useEffect } from 'react';
import { useFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
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
    DatabaseZap
} from 'lucide-react';
import { type Course, type Episode } from '@/lib/theoflix-data';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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
        const newEp: Episode = { title: 'Nova Aula', vimeoId: '', duration: '45min' };
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
                                Gerencie os vídeos, metadados e estrutura dos cursos de streaming.
                            </DialogDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleSeedData} disabled={isSeeding}>
                            {isSeeding ? <Loader2 className="mr-2 size-4 animate-spin" /> : <DatabaseZap className="mr-2 size-4" />}
                            Importar Dados Padrão
                        </Button>
                    </div>
                </DialogHeader>

                <div className="flex-1 flex overflow-hidden">
                    {/* Lista Lateral de Cursos */}
                    <div className="w-1/3 border-r bg-muted/10 p-4 space-y-4">
                        <div className="flex justify-between items-center">
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
                                            selectedCourse?.id === course.id ? "bg-white border-primary shadow-sm ring-1 ring-primary/20" : "bg-card"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="size-10 rounded-lg relative overflow-hidden bg-muted">
                                                <Image src={course.image} alt="" fill className="object-cover" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold truncate">{course.title}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant="outline" className="text-[8px] py-0 h-4">NÍVEL {course.level}</Badge>
                                                    <span className="text-[10px] text-muted-foreground">{course.episodes?.length || 0} aulas</span>
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Formulário de Edição */}
                    <div className="flex-1 p-8 overflow-y-auto">
                        <div className="max-w-2xl mx-auto space-y-8 pb-20">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase font-black">Título do Curso</Label>
                                    <div className="flex gap-2">
                                        <div className="p-2 bg-muted rounded-md"><Type size={16} /></div>
                                        <Input 
                                            value={formCourse.title} 
                                            onChange={e => setFormCourse(p => ({...p, title: e.target.value}))} 
                                            placeholder="Ex: Teologia do Antigo Testamento"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase font-black">Nível de Maturidade</Label>
                                    <div className="flex gap-2">
                                        <div className="p-2 bg-muted rounded-md"><Layers size={16} /></div>
                                        <Input 
                                            type="number" 
                                            min="1" max="4"
                                            value={formCourse.level} 
                                            onChange={e => setFormCourse(p => ({...p, level: parseInt(e.target.value)}))} 
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs uppercase font-black">Imagem de Capa (URL)</Label>
                                <div className="flex gap-2">
                                    <div className="p-2 bg-muted rounded-md"><ImageIcon size={16} /></div>
                                    <Input 
                                        value={formCourse.image} 
                                        onChange={e => setFormCourse(p => ({...p, image: e.target.value}))} 
                                        placeholder="https://images.unsplash.com/..."
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs uppercase font-black">Sinopse do Curso</Label>
                                <Textarea 
                                    rows={4}
                                    value={formCourse.desc} 
                                    onChange={e => setFormCourse(p => ({...p, desc: e.target.value}))} 
                                    placeholder="Descreva o que os alunos aprenderão neste curso..."
                                />
                            </div>

                            {/* Gestão de Episódios */}
                            <div className="pt-6 border-t space-y-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-sm font-black uppercase tracking-widest text-primary">Grade de Aulas & Vídeos</h4>
                                    <Button size="sm" variant="outline" onClick={handleAddEpisode}>
                                        <PlusCircle className="mr-2 size-4" /> Adicionar Aula
                                    </Button>
                                </div>

                                <div className="space-y-3">
                                    {formCourse.episodes?.map((ep, idx) => (
                                        <div key={idx} className="p-4 rounded-xl border bg-muted/20 space-y-4 relative group">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] font-bold">Título da Aula</Label>
                                                    <Input 
                                                        value={ep.title} 
                                                        onChange={e => handleUpdateEpisode(idx, 'title', e.target.value)}
                                                        className="h-8 text-sm"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] font-bold text-blue-600">Vimeo ID</Label>
                                                    <div className="relative">
                                                        <Video className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-blue-400" />
                                                        <Input 
                                                            value={ep.vimeoId} 
                                                            onChange={e => handleUpdateEpisode(idx, 'vimeoId', e.target.value)}
                                                            className="h-8 text-sm pl-7 border-blue-200 focus:ring-blue-500"
                                                            placeholder="Ex: 76979871"
                                                        />
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
                                    {formCourse.episodes?.length === 0 && (
                                        <p className="text-center py-10 text-xs text-muted-foreground italic border-2 border-dashed rounded-xl">
                                            Nenhuma aula cadastrada. Clique em "Adicionar Aula" para configurar os vídeos.
                                        </p>
                                    )}
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
                        {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
                        Salvar e Publicar no TheoFlix
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
