
'use client';

import React, { useState, useEffect } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle, ShieldCheck, Settings, BarChart2, Users, Edit } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '../ui/label';
import { useToast } from '@/hooks/use-toast';


// Mock data, will be replaced by Firestore data
const mockRoles = [
    { id: 'admin', name: 'Admin', description: 'Acesso total ao sistema.' },
    { id: 'pastor_senior', name: 'Pastor Sênior', description: 'Acesso de liderança sênior.' },
    { id: 'lider_rede', name: 'Líder de Rede', description: 'Gerencia áreas e líderes de área.' },
    { id: 'lider_area', name: 'Líder de Área', description: 'Supervisiona líderes de célula.' },
    { id: 'lider_gc', name: 'Líder de GC', description: 'Gerencia uma célula e seus membros.' },
    { id: 'member', name: 'Membro', description: 'Acesso padrão de membro da igreja.' },
];

const allPermissions = [
  { id: 'view_dashboard_kpis', label: 'Ver KPIs do Dashboard Principal' },
  { id: 'manage_people', label: 'Gerenciar Pessoas (Criar, Editar, Excluir)' },
  { id: 'view_people_details', label: 'Ver Detalhes Pessoais dos Membros' },
  { id: 'manage_structure', label: 'Gerenciar Estrutura (Redes, Áreas)' },
  { id: 'view_financials', label: 'Ver Painel Financeiro' },
  { id: 'manage_financials', label: 'Gerenciar Financeiro (Integração Conta Azul)' },
  { id: 'manage_volunteering', label: 'Gerenciar Voluntariado (Escalas, Áreas)' },
  { id: 'manage_settings', label: 'Gerenciar Configurações de Acesso' },
];


export function AccessProfileManager() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [permissions, setPermissions] = useState<Record<string, string[]>>({});
  const [isSaving, setIsSaving] = useState<string | null>(null);

  // In the future, this will fetch from a 'roles' collection
  // const rolesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'roles')) : null, [firestore]);
  // const { data: roles, isLoading } = useCollection(rolesQuery);
  const roles = mockRoles;
  const isLoading = false;

  useEffect(() => {
    // Mock initial permissions. In a real scenario, this would be fetched from Firestore.
    const initialPermissions: Record<string, string[]> = {
        admin: allPermissions.map(p => p.id),
        pastor_senior: allPermissions.filter(p => p.id !== 'manage_settings').map(p => p.id),
        lider_rede: ['view_dashboard_kpis', 'manage_people', 'manage_structure'],
        lider_area: ['view_dashboard_kpis', 'manage_people'],
        lider_gc: ['view_dashboard_kpis', 'view_people_details'],
        member: ['view_dashboard_kpis'],
    };
    setPermissions(initialPermissions);
  }, []);

  const handlePermissionChange = (roleId: string, permissionId: string, checked: boolean) => {
    setPermissions(prev => {
        const currentPermissions = prev[roleId] || [];
        if (checked) {
            return { ...prev, [roleId]: [...currentPermissions, permissionId] };
        } else {
            return { ...prev, [roleId]: currentPermissions.filter(p => p !== permissionId) };
        }
    });
  };
  
  const handleSavePermissions = (roleId: string) => {
    setIsSaving(roleId);
    console.log(`Saving permissions for ${roleId}:`, permissions[roleId]);
    // Simulate Firestore save
    setTimeout(() => {
        setIsSaving(null);
        toast({
            title: "Permissões Salvas!",
            description: `As permissões para o perfil ${roles.find(r => r.id === roleId)?.name} foram atualizadas.`
        });
    }, 1000);
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
        <div className="flex justify-between items-center mb-6">
            <p className="text-sm text-muted-foreground max-w-2xl">
              Crie e edite os perfis de acesso, definindo permissões detalhadas para cada um. As alterações aqui refletirão o que cada usuário pode ver e fazer no sistema.
            </p>
             <Button onClick={() => setIsCreating(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Novo Perfil
            </Button>
        </div>
        
        <Accordion type="single" collapsible className="w-full">
            {roles.map(role => {
                const rolePermissions = permissions[role.id] || [];
                return (
                    <AccordionItem value={role.id} key={role.id}>
                        <AccordionTrigger>
                            <div className="flex items-center gap-3">
                                <ShieldCheck className="size-5 text-primary" />
                                <div>
                                    <p className="font-semibold text-base">{role.name}</p>
                                    <p className="text-sm text-muted-foreground text-left">{role.description}</p>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-6 bg-muted/50 rounded-b-md">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {allPermissions.map(permission => (
                                <div key={permission.id} className="flex items-center space-x-2">
                                    <Checkbox 
                                        id={`${role.id}-${permission.id}`}
                                        checked={rolePermissions.includes(permission.id)}
                                        onCheckedChange={(checked) => handlePermissionChange(role.id, permission.id, !!checked)}
                                    />
                                    <Label htmlFor={`${role.id}-${permission.id}`} className="font-normal">{permission.label}</Label>
                                </div>
                            ))}
                            </div>
                            <div className="flex justify-end mt-6">
                                <Button size="sm" onClick={() => handleSavePermissions(role.id)} disabled={isSaving === role.id}>
                                     {isSaving === role.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Salvar Permissões
                                </Button>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                )
            })}
        </Accordion>
    </div>
  );
}
