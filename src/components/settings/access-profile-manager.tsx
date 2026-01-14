
'use client';

import React, { useState } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle, ShieldCheck } from 'lucide-react';
import { UnderConstruction } from '../common/under-construction';

// Mock data, will be replaced by Firestore data
const mockRoles = [
    { id: 'admin', name: 'Admin', description: 'Acesso total ao sistema.' },
    { id: 'pastor_senior', name: 'Pastor Sênior', description: 'Acesso de liderança sênior.' },
    { id: 'lider_rede', name: 'Líder de Rede', description: 'Gerencia áreas e líderes de área.' },
    { id: 'lider_area', name: 'Líder de Área', description: 'Supervisiona líderes de célula.' },
    { id: 'lider_gc', name: 'Líder de GC', description: 'Gerencia uma célula e seus membros.' },
    { id: 'member', name: 'Membro', description: 'Acesso padrão de membro da igreja.' },
];

export function AccessProfileManager() {
  const { firestore } = useFirebase();
  const [isCreating, setIsCreating] = useState(false);

  // In the future, this will fetch from a 'roles' collection
  // const rolesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'roles')) : null, [firestore]);
  // const { data: roles, isLoading } = useCollection(rolesQuery);

  const roles = mockRoles;
  const isLoading = false;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
        <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">Crie e edite os perfis de acesso que podem ser atribuídos aos usuários.</p>
             <Button onClick={() => setIsCreating(true)} disabled>
                <PlusCircle className="mr-2 h-4 w-4" />
                Novo Perfil
            </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map(role => (
                <Card key={role.id}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <ShieldCheck className="size-5" />
                            {role.name}
                        </CardTitle>
                        <CardDescription>{role.description}</CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Button variant="outline" size="sm" disabled>Editar Permissões</Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
        <div className="mt-4">
            <UnderConstruction 
                pageTitle="Gerenciamento de Permissões"
                pageDescription="Em breve, você poderá criar perfis personalizados e definir permissões detalhadas para cada um (ex: 'ver financeiro', 'editar membros', etc)."
            />
        </div>
    </div>
  );
}
