'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useFirebase, useMemoFirebase } from '@/firebase';
import { useDoc } from '@/firebase/firestore/use-doc';
import { doc } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Loader2, User, ArrowLeft, Pencil } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Link from 'next/link';

type Member = {
  id: string;
  name: string;
  avatar?: string;
  integrationStatus?: string;
  email?: string;
  phone?: string;
  hierarchy?: {
    celulaId?: string;
  };
};

type Cell = {
    id: string;
    nome: string;
}

const getAppId = () => (typeof window !== 'undefined' && window.__app_id) ? window.__app_id : 'default-app-id';

export default function MemberProfilePage() {
  const { user, firestore } = useFirebase();
  const params = useParams();
  const memberId = params.memberId as string;
  const [appId, setAppId] = useState<string | null>(null);

  useEffect(() => {
    setAppId(getAppId());
  }, []);

  const memberDocRef = useMemoFirebase(() => {
    return firestore && user && memberId && appId
      ? doc(firestore, 'users', memberId) 
      : null;
  }, [firestore, user, memberId, appId]);

  const { data: member, isLoading: isLoadingMember } = useDoc<Member>(memberDocRef);

  const cellDocRef = useMemoFirebase(() => {
    if (!firestore || !member?.hierarchy?.celulaId || !appId) return null;
    return doc(firestore, 'cells', member.hierarchy.celulaId);
  }, [firestore, member, appId]);

  const { data: cell, isLoading: isLoadingCell } = useDoc<Cell>(cellDocRef);

  const avatar = PlaceHolderImages.find(p => p.id === (member?.avatar || 'avatar-1'));
  const isLoading = isLoadingMember || !user || isLoadingCell;

  if (isLoading) {
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
            O membro que você está procurando não foi encontrado ou você não tem permissão para visualizá-lo.
          </p>
          <Button asChild className="mt-6">
            <Link href="/dashboard/members"><ArrowLeft className="mr-2 h-4 w-4" />Voltar para Membros</Link>
          </Button>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="flex justify-center items-start pt-6 h-full">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <Avatar className="h-24 w-24 mb-4">
            {avatar && <AvatarImage src={avatar.imageUrl} alt={avatar.description} />}
            <AvatarFallback className="text-3xl">{member.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <CardTitle>{member.name}</CardTitle>
          <CardDescription className="capitalize">{(member.integrationStatus || 'Não definido').replace(/_/g, ' ')}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm">
           <div className="space-y-3">
             <div className="flex flex-col">
                <span className="font-semibold text-muted-foreground">Email:</span>
                <span>{member.email || 'Não informado'}</span>
             </div>
             <div className="flex flex-col">
                <span className="font-semibold text-muted-foreground">Telefone:</span>
                <span>{member.phone || 'Não informado'}</span>
             </div>
              <div className="flex flex-col">
                <span className="font-semibold text-muted-foreground">Célula:</span>
                <span>{cell?.nome || 'Nenhuma'}</span>
             </div>
           </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
            <Button className="w-full">
                <Pencil className="mr-2 h-4 w-4" />
                Editar Perfil
            </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/dashboard/members">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para lista
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
