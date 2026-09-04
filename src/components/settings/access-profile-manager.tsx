'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle, ShieldCheck, Edit, Trash2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { DeleteConfirmationDialog } from '../structure/delete-confirmation-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { AccessProfile } from '@/app/dashboard/settings/page';


const permissionsConfig = [
  { id: 'dashboard', label: 'Dashboard', actions: ['view'] },
  {
    id: 'pessoas',
    label: 'Pessoas',
    subItems: [
      { id: 'pessoas_journey', label: 'Jornada de Integração', actions: ['view', 'edit'] },
      { id: 'pessoas_list', label: 'Lista de Pessoas', actions: ['view', 'edit', 'delete'] },
      { id: 'pessoas_details', label: 'Detalhes Pessoais', actions: ['view', 'view_sensitive'] },
      { id: 'pessoas_settings', label: 'Configurações da Jornada', actions: ['view', 'edit'] },
    ]
  },
  {
    id: 'gcs',
    label: 'GCs',
    subItems: [
      { id: 'gcs_structure', label: 'Estrutura', actions: ['view', 'edit', 'delete'] },
      { id: 'gcs_cells', label: 'Células', actions: ['view', 'edit', 'delete'] },
      { id: 'gcs_report', label: 'Relatório de Célula', actions: ['view', 'submit'] },
      { id: 'gcs_supervisor', label: 'Supervisor', actions: ['view'] },
      { id: 'gcs_map', label: 'Mapa', actions: ['view'] },
    ]
  },
  {
    id: 'servico',
    label: 'Serviço',
    subItems: [
      { id: 'servico_areas', label: 'Áreas de Serviço', actions: ['view', 'edit', 'delete'] },
      { id: 'servico_servos', label: 'Servos & Voluntários', actions: ['view', 'edit', 'delete'] },
      { id: 'servico_teams', label: 'Equipes', actions: ['view', 'edit', 'delete'] },
      { id: 'servico_events', label: 'Gerenciar Eventos (Voluntariado)', actions: ['view', 'edit', 'delete'] },
      { id: 'servico_schedule', label: 'Gerar Escala', actions: ['view', 'edit', 'delete'] },
      { id: 'servico_saved', label: 'Escalas Salvas', actions: ['view', 'edit', 'delete'] },
      { id: 'servico_worship', label: 'Ordem de Culto', actions: ['view', 'edit', 'delete'] },
    ]
  },
  {
    id: 'ministerial',
    label: 'Ministerial',
    subItems: [
      { id: 'ministerial_attendance', label: 'Frequência (Culto)', actions: ['view', 'edit'] },
      {
        id: 'ministerial_teaching',
        label: 'Ensino',
        subItems: [
            { id: 'teaching_courses', label: 'Cursos e Turmas Gerais', actions: ['view', 'edit', 'delete', 'view_students', 'manage_attendance', 'manage_grades'] },
            { id: 'teaching_theoflix', label: 'TheoFlix', actions: ['view', 'edit', 'delete'] },
            { id: 'teaching_calendar', label: 'Calendário Escolar', actions: ['view', 'edit'] },
            { id: 'teaching_teachers', label: 'Professores', actions: ['view', 'edit'] },
            { id: 'teaching_students', label: 'Alunos', actions: ['view', 'edit'] },
            { id: 'teaching_reports', label: 'Relatórios Gerais', actions: ['view'] },
            { id: 'teaching_wave', label: 'Wave - Escola de Música', actions: ['view_admin', 'view_finance', 'view_teacher_area', 'view_student_area', 'manage_attendance', 'manage_grades'] },
            { id: 'teaching_dis', label: 'DIS - Escola de Inclusão', actions: ['view_admin', 'view_finance', 'view_teacher_area', 'view_student_area', 'manage_attendance', 'manage_grades'] },
        ]
      },
      { id: 'ministerial_events', label: 'Protocolos de Evento', actions: ['view', 'edit', 'delete'] },
      { id: 'ministerial_briefing', label: 'Briefing Pro', actions: ['view', 'edit'] },
      { id: 'ministerial_reservations', label: 'Calendário Geral', actions: ['view', 'approve', 'delete'] },
      { id: 'ministerial_finance', label: 'Financeiro', actions: ['view', 'edit'] },
      { id: 'ministerial_patrimony', label: 'Patrimônio', actions: ['view', 'edit', 'delete'] },
      { id: 'ministerial_social', label: 'Ação Social', actions: ['view', 'edit', 'delete'] },
      { id: 'ministerial_goals', label: 'Metas (KPIs)', actions: ['view', 'edit'] },
      { id: 'ministerial_ai', label: 'Agente IA', actions: ['use'] },
      { id: 'ministerial_notifications', label: 'Notificações', actions: ['send'] },
    ]
  },
  {
    id: 'settings',
    label: 'Configurações',
    actions: ['view', 'edit']
  }
];

const actionLabels: Record<string, string> = {
  view: 'Visualizar',
  edit: 'Editar',
  delete: 'Excluir',
  submit: 'Enviar',
  approve: 'Aprovar',
  use: 'Usar',
  send: 'Enviar',
  view_sensitive: 'Ver Dados Sensíveis',
  view_admin: 'Ver Admin',
  view_finance: 'Ver Financeiro',
  view_teacher_area: "Área do Professor",
  view_student_area: "Área do Aluno",
  view_students: "Ver Alunos/Matrículas",
  manage_attendance: "Lançar Chamada",
  manage_grades: "Lançar Notas"
};


interface EditProfileDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (data: { name: string; description: string }) => void;
    existingProfile: AccessProfile | null;
}

function EditProfileDialog({ open, onOpenChange, onSave, existingProfile }: EditProfileDialogProps) {
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
            <DialogContent className="max-h-[85vh] overflow-y-auto">
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

interface PermissionRowProps {
    item: any;
    permissions: any;
    onPermissionChange: (permId: string, action: string, checked: boolean) => void;
    roleId: string;
    disabled: boolean;
}

const PermissionRow = ({ item, permissions, onPermissionChange, roleId, disabled }: PermissionRowProps) => {
  return (
    <div className="grid grid-cols-12 items-center gap-2 py-2">
      <Label className="col-span-5 md:col-span-4 font-normal">{item.label}</Label>
      <div className="col-span-7 md:col-span-8 flex items-center gap-4 flex-wrap">
        {(item.actions as string[]).map(action => (
          <div key={action} className="flex items-center gap-2">
            <Checkbox 
              id={`${roleId}-${item.id}-${action}`}
              checked={!!permissions?.[action]}
              onCheckedChange={(checked) => onPermissionChange(item.id, action, !!checked)}
              disabled={disabled}
            />
            <Label htmlFor={`${roleId}-${item.id}-${action}`} className="text-xs text-muted-foreground font-normal">
              {actionLabels[action]}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
};


export function AccessProfileManager({ roles }: { roles: AccessProfile[] }) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editingProfile, setEditingProfile] = useState<AccessProfile | null>(null);
  const [deletingProfile, setDeletingProfile] = useState<AccessProfile | null>(null);
  
  const [localPermissions, setLocalPermissions] = useState<Record<string, Record<string, Record<string, boolean>>>>({});
  const [isSaving, setIsSaving] = useState<string | null>(null);
  
  useEffect(() => {
    const initialPermissions: Record<string, any> = {};
    roles.forEach(role => {
      initialPermissions[role.id] = role.permissions || {};
    });
    setLocalPermissions(initialPermissions);
  }, [roles]);

  const handlePermissionChange = (roleId: string, permissionId: string, action: string, checked: boolean) => {
    setLocalPermissions(prev => ({
      ...prev,
      [roleId]: {
        ...(prev[roleId] || {}),
        [permissionId]: {
          ...(prev[roleId]?.[permissionId] || {}),
          [action]: checked,
        },
      },
    }));
  };
  
  const handleSavePermissions = (roleId: string) => {
    if (!firestore) return;
    setIsSaving(roleId);
    
    const permissionsToSave = localPermissions[roleId];
    const roleDocRef = doc(firestore, 'access_profiles', roleId);

    updateDocumentNonBlocking(roleDocRef, { permissions: permissionsToSave });

    setTimeout(() => {
        setIsSaving(null);
        toast({
            title: "Permissões Salvas!",
            description: `As permissões para o perfil ${roles.find(r => r.id === roleId)?.name} serão atualizadas.`
        });
    }, 500);
  };
  
  const handleOpenEditDialog = (profile: AccessProfile) => {
      setEditingProfile(profile);
      setIsEditing(true);
  };
  
  const handleOpenCreateDialog = () => {
      setEditingProfile(null);
      setIsEditing(true);
  };

  const handleOpenDeleteDialog = (profile: AccessProfile) => {
      setDeletingProfile(profile);
  };
  
  const handleSaveProfile = (profileData: { name: string, description: string }) => {
      if (!firestore) return;
      
      if (editingProfile) {
          const docRef = doc(firestore, 'access_profiles', editingProfile.id);
          updateDocumentNonBlocking(docRef, profileData);
          toast({ title: "Perfil Atualizado", description: `O perfil "${profileData.name}" será alterado.`});
      } else {
          const id = profileData.name.toLowerCase().replace(/\s+/g, '_').replace(/[^\w-]/g, '');
          const newProfile = {
              name: profileData.name,
              description: profileData.description,
              permissions: {}
          };
          const docRef = doc(firestore, 'access_profiles', id);
          setDocumentNonBlocking(docRef, newProfile);
          toast({ title: "Perfil Criado", description: `O perfil "${profileData.name}" foi adicionado.`});
      }
  };

  const handleConfirmDelete = () => {
      if (deletingProfile && firestore) {
          deleteDocumentNonBlocking(doc(firestore, 'access_profiles', deletingProfile.id));
          toast({ variant: 'destructive', title: "Perfil Excluído", description: `O perfil "${deletingProfile.name}" será removido.`});
          setDeletingProfile(null);
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
                const rolePermissions = localPermissions[role.id] || {};
                const isAdmin = role.id === 'admin';
                return (
                    <AccordionItem value={role.id} key={role.id}>
                        <div className="flex items-center justify-between hover:bg-muted/50 rounded-t-md transition-colors">
                            <AccordionTrigger className="flex-1 py-3 px-4" disabled={isAdmin}>
                                <div className="flex items-center gap-3">
                                    <ShieldCheck className="size-5 text-primary" />
                                    <div>
                                        <p className="font-semibold text-base text-left">{role.name}</p>
                                        <p className="text-sm text-muted-foreground text-left">{role.description}</p>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <div className="flex items-center gap-1 pr-2">
                                {!isAdmin && (
                                    <>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEditDialog(role)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleOpenDeleteDialog(role)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                        <AccordionContent className="p-6 bg-muted/30 rounded-b-md">
                           <div className="space-y-6">
                                {permissionsConfig.map(module => (
                                    <div key={module.id}>
                                        <h4 className="font-semibold text-foreground border-b pb-2 mb-2">{module.label}</h4>
                                        <div className="space-y-2">
                                            {module.actions && (
                                                <PermissionRow
                                                    item={module}
                                                    permissions={rolePermissions[module.id]}
                                                    onPermissionChange={(permissionId, action, checked) => handlePermissionChange(role.id, permissionId, action, checked)}
                                                    roleId={role.id}
                                                    disabled={isAdmin}
                                                />
                                            )}
                                            {module.subItems && (
                                                <div className="pl-6 border-l-2 border-slate-200 space-y-1">
                                                    {module.subItems.map(subItem => (
                                                        subItem.actions ? (
                                                            <PermissionRow
                                                                key={subItem.id}
                                                                item={subItem}
                                                                permissions={rolePermissions[subItem.id]}
                                                                onPermissionChange={(permissionId, action, checked) => handlePermissionChange(role.id, permissionId, action, checked)}
                                                                roleId={role.id}
                                                                disabled={isAdmin}
                                                            />
                                                        ) : (subItem as any).subItems ? (
                                                            <div key={subItem.id} className="pt-2">
                                                                <h5 className="font-semibold text-foreground/80 text-sm">{subItem.label}</h5>
                                                                <div className="pl-6 border-l-2 border-slate-200/70 space-y-1 mt-1">
                                                                    {(subItem as any).subItems.map((nestedSubItem: any) => (
                                                                        <PermissionRow
                                                                            key={nestedSubItem.id}
                                                                            item={nestedSubItem}
                                                                            permissions={rolePermissions[nestedSubItem.id]}
                                                                            onPermissionChange={(permissionId, action, checked) => handlePermissionChange(role.id, permissionId, action, checked)}
                                                                            roleId={role.id}
                                                                            disabled={isAdmin}
                                                                        />
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ) : null
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                             <div className="flex justify-end mt-6">
                                <Button size="sm" onClick={() => handleSavePermissions(role.id)} disabled={isSaving === role.id || isAdmin}>
                                     {isSaving === role.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Salvar Permissões do Perfil
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
