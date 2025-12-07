'use client';

import React, { useState, useMemo } from 'react';
import { useFirebase, useCollection, addDocumentNonBlocking, useDoc } from '@/firebase';
import { Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Send, MessageSquare, Calendar, User, FilePlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { collection } from 'firebase/firestore';

type MemberNote = {
    id: string;
    authorId: string;
    content: string;
    type: string;
    createdAt: Timestamp;
};

type UserProfile = {
    id: string;
    name: string;
};

// Componente para buscar e exibir o nome do autor de forma isolada
function AuthorName({ authorId }: { authorId: string }) {
    const { data: author, isLoading } = useDoc<UserProfile>(
        authorId ? `users/${authorId}` : null
    );

    if (isLoading) {
        return <span className="text-muted-foreground">...</span>;
    }

    return <>{author?.name || 'Desconhecido'}</>;
}


function NoteCard({ note }: { note: MemberNote }) {
    const noteDate = note.createdAt?.toDate();
    const formattedDate = noteDate ? formatDistanceToNow(noteDate, { addSuffix: true, locale: ptBR }) : 'data desconhecida';

    const noteTypes = {
        'pedido_oracao': 'Pedido de Oração',
        'encontro': 'Encontro 1 a 1',
        'observacao': 'Observação Geral'
    };

    return (
        <div className="relative pl-8">
            <div className="absolute left-0 top-1 h-full border-l-2 border-border"></div>
            <div className="absolute left-[-5px] top-1 h-3 w-3 rounded-full bg-primary"></div>
            <div className="ml-4 space-y-2">
                <div className="flex justify-between items-center">
                    <p className="text-sm font-semibold">
                       {noteTypes[note.type] || 'Anotação'} por <AuthorName authorId={note.authorId} />
                    </p>
                    <p className="text-xs text-muted-foreground">{formattedDate}</p>
                </div>
                <p className="text-sm text-foreground/80">{note.content}</p>
            </div>
        </div>
    );
}

export function DiscipleshipNotes({ memberId }: { memberId: string }) {
    const { firestore, user } = useFirebase();
    const { toast } = useToast();
    const [noteContent, setNoteContent] = useState('');
    const [noteType, setNoteType] = useState('encontro');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { data: notes, isLoading: isLoadingNotes } = useCollection<MemberNote>(
        'member_notes',
        [{ field: 'memberId', operator: '==', value: memberId }],
        [{ field: 'createdAt', direction: 'desc' }]
    );


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !noteContent.trim() || !firestore) return;

        setIsSubmitting(true);
        
        const notesCollection = collection(firestore, 'member_notes');
        
        try {
            await addDocumentNonBlocking(notesCollection, {
                authorId: user.uid,
                memberId,
                type: noteType,
                content: noteContent,
                createdAt: Timestamp.now(),
            });
            toast({
                title: "Sucesso!",
                description: "Sua anotação foi salva.",
            });
            setNoteContent('');
        } catch (error) {
            console.error("Error submitting note: ", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Anotações de Discipulado</CardTitle>
                <CardDescription>Registre suas conversas, orações e acompanhamentos com este membro.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4 mb-8">
                    <Textarea
                        placeholder="Digite sua anotação aqui..."
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                        required
                    />
                    <div className="flex justify-between items-center">
                       <Select value={noteType} onValueChange={setNoteType}>
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Tipo de nota" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="encontro">Encontro 1 a 1</SelectItem>
                            <SelectItem value="pedido_oracao">Pedido de Oração</SelectItem>
                            <SelectItem value="observacao">Observação Geral</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button type="submit" disabled={isSubmitting || !noteContent.trim()}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FilePlus className="mr-2 h-4 w-4" />}
                            Salvar Anotação
                        </Button>
                    </div>
                </form>

                <div className="space-y-6">
                    {isLoadingNotes && (
                        <div className="flex items-center justify-center h-24">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    )}
                    {!isLoadingNotes && notes?.length === 0 && (
                         <div className="text-center text-muted-foreground py-8">
                            <MessageSquare className="mx-auto h-8 w-8 mb-2" />
                            <p>Nenhuma anotação ainda.</p>
                            <p className="text-xs">Seja o primeiro a registrar um acompanhamento!</p>
                        </div>
                    )}
                    {notes?.map(note => (
                        <NoteCard key={note.id} note={note} />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
