'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useFirebase, useMemoFirebase } from '@/firebase';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useCollection } from '@/firebase/firestore/use-collection';
import { doc, collection, query, where, orderBy, Timestamp, addDoc } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HandHeart, Handshake, Pencil, Loader2, Plus, NotebookPen, User, ArrowLeft } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';

type Member = {
  id: string;
  name: string;
  avatar?: string;
  integrationStatus?: string;
  email?: string;
  phone?: string;
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
        
        await addDoc(notesCollection, {
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
    const { firestore, user } = useFirebase();

    const notesQuery = useMemoFirebase(() => {
        if (!firestore || !user || !memberId) return null;
        return query(collection(firestore, 'member_notes'), where('memberId', '==', memberId), orderBy('createdAt', 'desc'));
    }, [firestore, user, memberId]);

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

export default function MemberProfilePage() {
    const { user, firestore } = useFirebase();
    const params = useParams();
    const memberId = params.memberId as string;

    const memberDocRef = useMemoFirebase(() =>
        firestore && user && memberId ? doc(firestore, 'users', memberId) : null,
        [firestore, user, memberId]
    );

    const { data: member, isLoading: isLoadingMember } = useDoc<Member>(memberDocRef);
    const avatar = PlaceHolderImages.find(p => p.id === (member?.avatar || 'avatar-1'));

    if (isLoadingMember || !user) {
        return (
            <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!member) {
        return (
            <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
                <Card className="w-full max-w-md text-center p-8">
                    <User className="h-12 w-12 mx-auto text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-medium">Membro não encontrado</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        O membro que você está procurando não foi encontrado.
                    </p>
                    <Button asChild className="mt-6">
                        <Link href="/dashboard/members"><ArrowLeft className="mr-2 h-4 w-4" />Voltar para Membros</Link>
                    </Button>
                </Card>
            </div>
        );
    }
    
    return (
        <div className="grid md:grid-cols-3 gap-6 h-[calc(100vh-8rem)]">
            {/* Member Profile Card */}
            <div className="md:col-span-1 h-full flex flex-col">
                <Card className="w-full">
                    <CardHeader className="items-center text-center">
                        <Avatar className="h-24 w-24 mb-4">
                            {avatar && <AvatarImage src={avatar.imageUrl} alt={avatar.description} />}
                            <AvatarFallback className="text-3xl">{member.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <CardTitle>{member.name}</CardTitle>
                        <CardDescription className="capitalize">{(member.integrationStatus || 'Não definido').replace(/_/g, ' ')}</CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                         <div className="space-y-2">
                             <p><strong>Email:</strong> {member.email || 'Não informado'}</p>
                             <p><strong>Telefone:</strong> {member.phone || 'Não informado'}</p>
                         </div>
                    </CardContent>
                     <CardFooter>
                        <Button asChild variant="outline" className="w-full">
                            <Link href="/dashboard/members">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Voltar para lista
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
                 {user && <NoteForm member={member} authorId={user.uid} />}
            </div>

            {/* Notes Section */}
            <div className="md:col-span-2 h-full flex flex-col gap-6">
                <Card className="flex-1 flex flex-col">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <NotebookPen className="size-5" /> Histórico de {member.name}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto p-2">
                         <ScrollArea className="h-full">
                            <div className="p-4">
                                <MemberNotes memberId={member.id} />
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
