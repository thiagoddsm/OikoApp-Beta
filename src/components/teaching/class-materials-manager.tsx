
'use client';
import React, { useState } from 'react';
import { useVolunteering, type Class } from '@/contexts/volunteering-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, Link, FileText, Trash2, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function ClassMaterialsManager({ classData }: { classData: Class }) {
    const { updateClass } = useVolunteering();
    const { toast } = useToast();
    
    const [title, setTitle] = useState('');
    const [url, setUrl] = useState('');
    const [description, setDescription] = useState('');

    const handleAddMaterial = () => {
        if (!title.trim() || !url.trim()) return;
        
        const newMaterials = [...(classData.materials || []), { title, url, description }];
        updateClass(classData.id, { materials: newMaterials });
        
        setTitle('');
        setUrl('');
        setDescription('');
        toast({ title: 'Material adicionado com sucesso!' });
    };

    const handleRemoveMaterial = (index: number) => {
        if (confirm('Deseja remover este material?')) {
            const newMaterials = classData.materials?.filter((_, i) => i !== index) || [];
            updateClass(classData.id, { materials: newMaterials });
        }
    };

    return (
        <div className="space-y-8">
            <Card className="bg-muted/30 border-dashed">
                <CardContent className="p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2"><PlusCircle className="size-4" />Adicionar Novo Material</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="mat-title">Título do Material</Label>
                            <Input id="mat-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Apostila Módulo 1" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="mat-url">Link (Google Drive, YouTube, etc.)</Label>
                            <Input id="mat-url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <Label htmlFor="mat-desc">Breve Descrição (Opcional)</Label>
                            <Input id="mat-desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="Explique do que se trata o conteúdo" />
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                        <Button onClick={handleAddMaterial} disabled={!title.trim() || !url.trim()}>
                            Salvar Material
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {classData.materials && classData.materials.length > 0 ? (
                    classData.materials.map((mat, index) => (
                        <Card key={index} className="group relative hover:border-primary transition-colors">
                            <CardContent className="p-4 flex items-start gap-4">
                                <div className="bg-primary/10 p-3 rounded-lg text-primary">
                                    <FileText className="size-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold truncate">{mat.title}</h4>
                                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{mat.description || 'Sem descrição'}</p>
                                    <div className="mt-3 flex items-center gap-2">
                                        <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                                            <a href={mat.url} target="_blank" rel="noopener noreferrer">
                                                <ExternalLink className="mr-1 size-3" /> Acessar
                                            </a>
                                        </Button>
                                    </div>
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-destructive"
                                    onClick={() => handleRemoveMaterial(index)}
                                >
                                    <Trash2 className="size-4" />
                                </Button>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                        Nenhum material de apoio cadastrado para esta turma.
                    </div>
                )}
            </div>
        </div>
    );
}
