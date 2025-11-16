'use client';

import React from 'react';
import Link from 'next/link';
import { useFirebase, useMemoFirebase } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Plus, Users } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { ScrollArea } from '@/components/ui/scroll-area';

type Member = {
  id: string;
  name: string;
  avatar?: string;
  integrationStatus?: string;
};

const getAppId = () => (typeof window !== 'undefined' && window.__app_id) ? window.__app_id : 'default-app-id';

export default function MembersListPage() {
    const { firestore, user } = useFirebase();

    const usersQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, 'users'));
    }, [firestore, user]);

    const { data: members, isLoading: isLoadingMembers } = useCollection<Member>(usersQuery);

    if (!user) {
        return (
            <Card className="h-[calc(100vh-8rem)] flex flex-col">
                 <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Users className="size-5" /> Membros
                        </CardTitle>
                        <Button asChild size="sm">
                            <Link href="/leader/new-member">
                                <Plus className="mr-2 h-4 w-4" />
                                Adicionar
                            </Link>
                        </Button>
                    </div>
                    <CardDescription>Selecione um membro para ver seu perfil detalhado.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                        <p>Aguardando autenticação...</p>
                    </div>
                </CardContent>
            </Card>
        );
    }
    
    if (isLoadingMembers) {
      return (
            <Card className="h-[calc(100vh-8rem)] flex flex-col">
                 <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Users className="size-5" /> Membros
                        </CardTitle>
                        <Button asChild size="sm">
                            <Link href="/leader/new-member">
                                <Plus className="mr-2 h-4 w-4" />
                                Adicionar
                            </Link>
                        </Button>
                    </div>
                    <CardDescription>Selecione um membro para ver seu perfil detalhado.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin" />
                </CardContent>
            </Card>
        );
    }


    return (
        <Card className="h-[calc(100vh-8rem)] flex flex-col">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Users className="size-5" /> Membros
                    </CardTitle>
                    <Button asChild size="sm">
                        <Link href="/leader/new-member">
                            <Plus className="mr-2 h-4 w-4" />
                            Adicionar
                        </Link>
                    </Button>
                </div>
                 <CardDescription>Selecione um membro para ver seu perfil detalhado.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-2">
                <ScrollArea className="h-full">
                    <div className="space-y-2 p-4">
                        {members && members.length > 0 ? members.map(member => {
                            const avatar = PlaceHolderImages.find(p => p.id === (member.avatar || 'avatar-1'));
                            return (
                                <Link
                                    key={member.id}
                                    href={`/dashboard/members/${member.id}`}
                                    className="w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors hover:bg-muted"
                                >
                                    <Avatar className="h-10 w-10">
                                        {avatar && <AvatarImage src={avatar.imageUrl} alt={avatar.description} />}
                                        <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold text-sm">{member.name}</p>
                                        <p className="text-xs text-muted-foreground capitalize">{(member.integrationStatus || 'Não definido').replace(/_/g, ' ')}</p>
                                    </div>
                                </Link>
                            );
                        }) : (
                          <div className="text-center py-10">
                            <p className="text-muted-foreground">Nenhum membro encontrado.</p>
                          </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
