
'use client';
import React, { useState, useMemo } from 'react';
import { useFirebase, addDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Send, MessageSquare, History, User, Zap, Repeat } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Timestamp, collection } from 'firebase/firestore';

export type Note = {
  id: string;
  authorId: string;
  type: 'user' | 'system';
  content: string;
  createdAt: any; // Can be Date or Timestamp
};

interface FollowUpTimelineProps {
    memberId: string;
    memberName: string;
    initialNotes: Note[];
    onNoteAdded?: () => void; // Now just a callback for refresh if needed
}

export function FollowUpTimeline({ memberId, memberName, initialNotes, onNoteAdded }: FollowUpTimelineProps) {
    const { user: currentUser, firestore } = useFirebase();
    const { toast } = useToast();
    const [newNote, setNewNote] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleAddNote = async () => {
        if (!newNote.trim() || !currentUser) return;
        setIsSaving(true);
        
        try {
            await addDocumentNonBlocking(collection(firestore, `users/${memberId}/notes`), {
                authorId: currentUser.uid,
                type: 'user',
                content: newNote,
                createdAt: Timestamp.now()
            });

            toast({ title: "Anotação salva!" });
            setNewNote('');
            if (onNoteAdded) onNoteAdded();
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: "Erro ao salvar", description: "Tente novamente em instantes." });
        } finally {
            setIsSaving(false);
        }
    };
    
    // Convert Timestamps to Dates if necessary
    const processedNotes = useMemo(() => {
        return [...initialNotes].sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : (a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt));
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : (b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt));
            return dateB.getTime() - dateA.getTime();
        });
    }, [initialNotes]);

    const authorMap = useMemo(() => {
        const map = new Map();
        map.set('admin', { id: 'admin', name: 'Sistema Oiko', avatar: 'avatar-6' });
        if (currentUser) {
            map.set(currentUser.uid, { id: currentUser.uid, name: currentUser.displayName || 'Você', avatar: 'avatar-1' });
        }
        return map;
    }, [currentUser]);

    const getIconForType = (type: string) => {
        switch (type) {
            case 'system':
                return <Zap className="h-3 w-3" />;
            default:
                return <MessageSquare className="h-3 w-3" />;
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><History/> Linha do Tempo de Follow-up</CardTitle>
                <CardDescription>Registre e visualize todas as interações e pontos de contato com {memberName}.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="flex items-start space-x-4">
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={currentUser?.photoURL || undefined} />
                            <AvatarFallback><User /></AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                            <Textarea
                                placeholder={`Adicione uma anotação sobre ${memberName}...`}
                                className="min-h-20"
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                            />
                            <div className="mt-2 flex justify-end">
                                <Button onClick={handleAddNote} disabled={isSaving || !newNote.trim()}>
                                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Salvar Anotação
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="relative pl-8">
                        <div className="absolute left-4 top-4 bottom-4 w-px bg-border -translate-x-1/2"></div>
                        {processedNotes.length > 0 ? (
                            processedNotes.map(note => {
                                const author = authorMap.get(note.authorId);
                                const authorAvatar = PlaceHolderImages.find(p => p.id === (author?.avatar || 'avatar-1'));
                                return (
                                    <div key={note.id} className="relative pb-8">
                                        <div className="absolute top-4 -left-4 w-3 h-3 rounded-full bg-primary ring-4 ring-background"></div>
                                        <div className="pl-6">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8">
                                                    {authorAvatar && <AvatarImage src={authorAvatar.imageUrl} />}
                                                    <AvatarFallback>{author?.name?.charAt(0) || '?'}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                                                        {getIconForType(note.type)}
                                                        {author?.name || 'Usuário desconhecido'}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatDistanceToNow(note.createdAt, { addSuffix: true, locale: ptBR })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="mt-3 p-3 bg-muted/50 rounded-lg text-sm text-foreground whitespace-pre-wrap">
                                                {note.content}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                <MessageSquare className="mx-auto h-8 w-8 mb-2" />
                                Nenhuma anotação encontrada. <br/> Seja o primeiro a registrar um ponto de contato!
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
