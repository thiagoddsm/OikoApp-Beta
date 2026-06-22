'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Award, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useVolunteering, type Course } from '@/contexts/volunteering-context';
import { addTimelineEvent } from '@/lib/timeline';
import { useFirebase } from '@/firebase';
import { useMembersData } from "@/hooks/useDomainData";

interface RetroactiveApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  courseName: string;
}

export function RetroactiveApprovalDialog({ open, onOpenChange, courseId, courseName }: RetroactiveApprovalDialogProps) {
    const { users } = useMembersData();

  const { updateVolunteer, isLoading } = useVolunteering();
  const { firestore, user: currentUser } = useFirebase();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Filtrar e buscar usuários do banco
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    
    let result = [...users];

    // Filtro por texto
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      result = result.filter(u => 
        (u.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q) ||
        (u.email || '').toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));
  }, [users, searchQuery]);

  const handleToggleSelect = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    );
  };

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      // Selecionar apenas os que não estão aprovados na lista visível
      const notApprovedIds = filteredUsers
        .filter(u => u.journey?.courseStatus?.[courseId] !== 'approved')
        .map(u => u.id);
      setSelectedUserIds(notApprovedIds);
    } else {
      setSelectedUserIds([]);
    }
  };

  const handleSaveApproval = async () => {
    if (selectedUserIds.length === 0) return;
    setIsSaving(true);

    try {
      const promises = selectedUserIds.map(async (userId) => {
        // 1. Atualizar o perfil com a aprovação
        await updateVolunteer(userId, {
          [`journey.courseStatus.${courseId}`]: 'approved'
        });

        // 2. Registrar evento na timeline
        if (firestore) {
          await addTimelineEvent(userId, firestore, {
            category: 'teaching',
            entityTitle: courseName,
            eventDescription: 'APROVADO RETROATIVAMENTE (Eklesia/Sistema Antigo)',
            statusBadge: 'APROVADO',
            source: 'manual',
            authorId: currentUser?.uid ?? 'system',
            relatedId: courseId,
          });
        }
      });

      await Promise.all(promises);

      toast({
        title: "Aprovação Concluída",
        description: `${selectedUserIds.length} membro(s) aprovado(s) retroativamente no curso ${courseName}.`
      });

      setSelectedUserIds([]);
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Erro ao Aprovar",
        description: "Ocorreu um erro técnico ao processar as aprovações."
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 shadow-2xl border-none">
        <DialogHeader className="p-6 border-b bg-muted/20 shrink-0">
          <DialogTitle className="text-xl font-black italic tracking-tighter uppercase text-primary flex items-center gap-2">
            <Award className="size-6 text-primary" /> Aprovação Retroativa Manual
          </DialogTitle>
          <DialogDescription className="text-xs uppercase font-bold text-muted-foreground tracking-widest">
            Aprove membros que já concluíram o curso {courseName} no sistema antigo (Eklesia).
          </DialogDescription>
        </DialogHeader>

        {/* Barra de Pesquisa */}
        <div className="px-6 py-4 border-b bg-slate-50 flex items-center gap-3 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar membro por nome ou email..."
              className="pl-9 h-11 bg-white"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Tabela de Membros */}
        <div className="flex-grow overflow-y-auto p-6 min-h-[300px]">
          {isLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>
          ) : (
            <div className="rounded-xl border bg-background overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="w-12 text-center">
                      <Checkbox 
                        checked={selectedUserIds.length > 0 && selectedUserIds.length === filteredUsers.filter(u => u.journey?.courseStatus?.[courseId] !== 'approved').length}
                        onCheckedChange={handleToggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="font-bold text-slate-800">Nome</TableHead>
                    <TableHead className="text-right font-bold text-slate-800 pr-6">Situação no Curso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                        Nenhum membro encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map(student => {
                      const isApproved = student.journey?.courseStatus?.[courseId] === 'approved';
                      const isSelected = selectedUserIds.includes(student.id);

                      return (
                        <TableRow key={student.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="text-center">
                            <Checkbox 
                              disabled={isApproved}
                              checked={isSelected || isApproved}
                              onCheckedChange={() => handleToggleSelect(student.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-bold text-slate-900 leading-none">{student.name}</p>
                              <p className="text-xs text-muted-foreground mt-1">{student.email || student.phone || '-'}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            {isApproved ? (
                              <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold gap-1">
                                <CheckCircle2 className="size-3" /> APROVADO
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-slate-500 border-slate-300 font-bold bg-slate-50">
                                PENDENTE
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <DialogFooter className="p-6 border-t bg-muted/20 shrink-0">
          <DialogClose asChild>
            <Button variant="outline" className="font-bold">Cancelar</Button>
          </DialogClose>
          <Button 
            onClick={handleSaveApproval} 
            disabled={isSaving || selectedUserIds.length === 0} 
            className="font-black uppercase tracking-widest bg-primary text-white shadow-lg shadow-primary/20"
          >
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
            Aprovar Selecionados ({selectedUserIds.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
