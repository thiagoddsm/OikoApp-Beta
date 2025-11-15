'use client';

import React, { useState } from 'react';
import { useFirebase, useMemoFirebase } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, HandHeart, Handshake, Pencil, Loader2, Plus, Users, NotebookPen } from 'lucide-react';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cellMembers as mockMembers } from '@/lib/data'; // Using mock data for now
import { ScrollArea } from '@/components/ui/scroll-area';

type Member = {
  id: string;
  name: string;
  avatar: string;
  status: string;
};

type Note = {
    id: string;
    authorId: string;
    memberId: string;
    type: 'pedido_oracao' | 'encontro' | 'observacao';
    content: string;
    createdAt: Timestamp;
};

const NoteIcon = ({ type, className }: { type: Note['type'], className?: string }) => {
    switch (type) {
        case 'pedido_oracao':
            return <HandHeart className={className} />;
        case 'encontro':
            return <Handshake className={className} />;
        case 'observacao':
            return <Pencil className={className} />;
        default:
            return <NotebookPen className={className} />;
    }
};

const noteTypeLabels = {
    'pedido_oracao': 'Pedido de Oração',
    'encontro': 'Encontro',
    'observacao': 'Observação'
};


function NoteForm({ member, authorId }: { member: Member, authorId: string }) {
    const { firestore } = useFirebase();
    const [content, setContent] = useState('');
    const [type, setType] = useState<Note['type']>('observacao');
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() || !member || !authorId || !firestore) return;

        setIsSaving(true);
        const notesCollection = collection(firestore, 'member_notes');
        
        await addDocumentNonBlocking(notesCollection, {
            authorId,
            memberId: member.id,
            content,
            type,
            createdAt: Timestamp.now(),
        });
        
        setContent('');
        setIsSaving(false);
    };

    return (
        <Card className="flex-shrink-0">
             <form onSubmit={handleSubmit}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Plus className="size-5" /> Adicionar Anotação para {member.name}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Select value={type} onValueChange={(value: Note['type']) => setType(value)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo de anotação" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="observacao">Observação</SelectItem>
                            <SelectItem value="pedido_oracao">Pedido de Oração</SelectItem>
                            <SelectItem value="encontro">Encontro</SelectItem>
                        </SelectContent>
                    </Select>
                    <Textarea
                        placeholder="Digite sua anotação aqui..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={3}
                        required
                    />
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={isSaving || !content.trim()}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar Anotação
                    </Button>
                </CardFooter>
            </form>
        </Card>
    )
}

function MemberNotes({ memberId }: { memberId: string }) {
    const { firestore } = useFirebase();

    const notesQuery = useMemoFirebase(() => {
        if (!firestore || !memberId) return null;
        return query(collection(firestore, 'member_notes'), where('memberId', '==', memberId), orderBy('createdAt', 'desc'));
    }, [firestore, memberId]);

    const { data: notes, isLoading } = useCollection<Note>(notesQuery);

    if (isLoading) {
        return <div className="flex justify-center items-center h-40"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
    }
    
    if (!notes || notes.length === 0) {
        return <p className="text-center text-muted-foreground py-8">Nenhuma anotação para este membro ainda.</p>;
    }

    return (
        <div className="space-y-4">
            {notes.map(note => (
                <div key={note.id} className="flex items-start gap-4 p-4 rounded-lg bg-background">
                    <div className="p-2 bg-primary/10 rounded-full">
                       <NoteIcon type={note.type} className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <p className="font-semibold text-sm">{noteTypeLabels[note.type]}</p>
                            <p className="text-xs text-muted-foreground">
                                {note.createdAt.toDate().toLocaleDateString('pt-BR')}
                            </p>
                        </div>
                        <p className="text-sm text-foreground mt-1">{note.content}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function MembersPage() {
    const { user } = useFirebase();
    const [selectedMember, setSelectedMember] = useState<Member | null>(mockMembers[0] || null);

    const members = mockMembers; // Placeholder for real member fetching logic

    return (
        <div className="grid md:grid-cols-3 gap-6 h-[calc(100vh-8rem)]">
            {/* Members List */}
            <Card className="md:col-span-1 h-full flex flex-col">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="size-5" /> Membros da Célula
                    </CardTitle>
                     <CardDescription>Selecione um membro para ver ou adicionar anotações.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-2">
                    <ScrollArea className="h-full">
                        <div className="space-y-2 p-4">
                            {members.map(member => {
                                const avatar = PlaceHolderImages.find(p => p.id === member.avatar);
                                return (
                                    <button
                                        key={member.id}
                                        className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${selectedMember?.id === member.id ? 'bg-primary/10' : 'hover:bg-muted'}`}
                                        onClick={() => setSelectedMember(member)}
                                    >
                                        <Avatar className="h-10 w-10">
                                            {avatar && <AvatarImage src={avatar.imageUrl} alt={avatar.description} />}
                                            <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold text-sm">{member.name}</p>
                                            <p className="text-xs text-muted-foreground capitalize">{member.status}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* Notes Section */}
            <div className="md:col-span-2 h-full flex flex-col gap-6">
                {selectedMember && user ? (
                    <>
                       <NoteForm member={selectedMember} authorId={user.uid} />

                        <Card className="flex-1 flex flex-col">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <NotebookPen className="size-5" /> Histórico de {selectedMember.name}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 overflow-y-auto p-2">
                                 <ScrollArea className="h-full">
                                    <div className="p-4">
                                        <MemberNotes memberId={selectedMember.id} />
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </>
                ) : (
                    <Card className="h-full flex items-center justify-center">
                        <div className="text-center">
                            <User className="h-12 w-12 mx-auto text-muted-foreground" />
                            <h3 className="mt-4 text-lg font-medium">Selecione um Membro</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Escolha um membro da lista ao lado para ver suas anotações.
                            </p>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
}
