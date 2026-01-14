
'use client';

import React, { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle, ShieldCheck, Edit, Trash2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '../ui/label';
import { useToast } from '@/hooks/use-toast';
import { DeleteConfirmationDialog } from '../structure/delete-confirmation-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const initialRoles = [
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

function EditProfileDialog({ open, onOpenChange, onSave, existingProfile }) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        if (existingProfile) {
            setName(existingProfile.name);
            setDescription(existingProfile.description);
        } else {
            setName('');
            setDescription('');
        }
    }, [existingProfile, open]);

    const handleSave = () => {
        onSave({ name, description });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{existingProfile ? 'Editar Perfil' : 'Criar Novo Perfil'}</DialogTitle>
                    <DialogDescription>
                        Defina o nome e a descrição para este perfil de acesso.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div>
                        <Label htmlFor="profile-name">Nome do Perfil</Label>
                        <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div>
                        <Label htmlFor="profile-desc">Descrição</Label>
                        <Input id="profile-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                    <Button onClick={handleSave}>Salvar Perfil</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function AccessProfileManager() {
  const { toast } = useToast();
  const [roles, setRoles] = useState(initialRoles);
  const [isEditing, setIsEditing] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [deletingProfile, setDeletingProfile] = useState(null);
  
  const [permissions, setPermissions] = useState<Record<string, string[]>>({});
  const [isSaving, setIsSaving] = useState<string | null>(null);
  
  useEffect(() => {
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
    setTimeout(() => {
        setIsSaving(null);
        toast({
            title: "Permissões Salvas!",
            description: `As permissões para o perfil ${roles.find(r => r.id === roleId)?.name} foram atualizadas.`
        });
    }, 1000);
  };
  
  const handleOpenEditDialog = (profile) => {
      setEditingProfile(profile);
      setIsEditing(true);
  };
  
  const handleOpenCreateDialog = () => {
      setEditingProfile(null);
      setIsEditing(true);
  };

  const handleOpenDeleteDialog = (profile) => {
      setDeletingProfile(profile);
  };
  
  const handleSaveProfile = (profileData) => {
      if (editingProfile) {
          // Edit logic
          setRoles(roles.map(r => r.id === editingProfile.id ? {...r, ...profileData} : r));
          toast({ title: "Perfil Atualizado", description: `O perfil "${profileData.name}" foi alterado.`});
      } else {
          // Create logic
          const newProfile = { id: profileData.name.toLowerCase().replace(' ', '_'), ...profileData };
          setRoles([...roles, newProfile]);
          toast({ title: "Perfil Criado", description: `O perfil "${profileData.name}" foi adicionado.`});
      }
  };

  const handleConfirmDelete = () => {
      if (deletingProfile) {
          setRoles(roles.filter(r => r.id !== deletingProfile.id));
          setDeletingProfile(null);
           toast({ variant: 'destructive', title: "Perfil Excluído", description: `O perfil "${deletingProfile.name}" foi removido.`});
      }
  };

  return (
    <div>
        <div className="flex justify-between items-center mb-6">
            <p className="text-sm text-muted-foreground max-w-2xl">
              Crie e edite os perfis de acesso, definindo permissões detalhadas para cada um. As alterações aqui refletirão o que cada usuário pode ver e fazer no sistema.
            </p>
             <Button onClick={handleOpenCreateDialog}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Novo Perfil
            </Button>
        </div>
        
        <Accordion type="single" collapsible className="w-full">
            {roles.map(role => {
                const rolePermissions = permissions[role.id] || [];
                return (
                    <AccordionItem value={role.id} key={role.id}>
                        <div className="flex items-center justify-between">
                            <AccordionTrigger className="flex-1 py-0">
                                <div className="flex items-center gap-3">
                                    <ShieldCheck className="size-5 text-primary" />
                                    <div>
                                        <p className="font-semibold text-base">{role.name}</p>
                                        <p className="text-sm text-muted-foreground text-left">{role.description}</p>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <div className="flex items-center gap-1 pr-2">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEditDialog(role)}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleOpenDeleteDialog(role)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
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

        <EditProfileDialog 
            open={isEditing}
            onOpenChange={setIsEditing}
            onSave={handleSaveProfile}
            existingProfile={editingProfile}
        />
        
        {deletingProfile && (
            <DeleteConfirmationDialog 
                open={!!deletingProfile}
                onOpenChange={() => setDeletingProfile(null)}
                onConfirm={handleConfirmDelete}
                itemName={deletingProfile.name}
                itemType="Perfil de Acesso"
            />
        )}
    </div>
  );
}
