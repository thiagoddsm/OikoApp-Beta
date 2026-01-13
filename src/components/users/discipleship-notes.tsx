
'use client';
import React, { useState, useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, MessageSquare, History, User } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

type MemberNote = {
    id: string;
    authorId: string;
    content: string;
    createdAt: Timestamp;
};

type Author = {
    id: string;
    name: string;
    avatar?: string;
};

export function DiscipleshipNotes({ memberId, memberName }: { memberId: string, memberName: string }) {
    const { firestore, user: currentUser } = useFirebase();
    const { toast } = useToast();
    const [newNote, setNewNote] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // This is a placeholder. You would replace this with a real Firestore query.
    const [notes, setNotes] = useState<MemberNote[]>([]);
    
    // In a real implementation, you would fetch these from Firestore.
    const allUsers: Author[] = [
        {id: 'user1', name: 'Carlos Pereira'},
        {id: 'user2', name: 'Ana Oliveira'},
    ];
    if (currentUser) {
        allUsers.push({id: currentUser.uid, name: currentUser.displayName || 'Você'});
    }
    const authorMap = useMemo(() => new Map(allUsers.map(u => [u.id, u])), [allUsers]);

    const handleAddNote = () => {
        if (!newNote.trim() || !currentUser || !firestore) return;
        
        setIsSaving(true);
        // Simulate saving to Firestore
        setTimeout(() => {
            const noteData = {
                id: Math.random().toString(),
                authorId: currentUser.uid,
                content: newNote,
                createdAt: Timestamp.now(),
            };
            setNotes(prev => [noteData, ...prev]);
            setIsSaving(false);
            setNewNote('');
            toast({ title: 'Anotação salva!'});
        }, 1000);
    };
    
    const isLoading = false; // Replace with your loading state

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><History/> Anotações de Discipulado</CardTitle>
                <CardDescription>Registre os encontros e o progresso de {memberName} no discipulado.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Input para nova anotação */}
                    <div className="flex items-start space-x-4">
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={currentUser?.photoURL || undefined} />
                            <AvatarFallback><User /></AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                            <Textarea
                                placeholder={`Adicione uma anotação sobre o discipulado de ${memberName}...`}
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

                    {/* Timeline */}
                    <div className="relative pl-8">
                        <div className="absolute left-4 top-4 bottom-4 w-px bg-border -translate-x-1/2"></div>
                        {isLoading ? (
                            <div className="flex justify-center items-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            </div>
                        ) : notes && notes.length > 0 ? (
                            notes.map(note => {
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
                                                    <p className="text-sm font-semibold text-foreground">{author?.name || 'Usuário desconhecido'}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatDistanceToNow(note.createdAt.toDate(), { addSuffix: true, locale: ptBR })}
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
                                Nenhuma anotação de discipulado encontrada.
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
