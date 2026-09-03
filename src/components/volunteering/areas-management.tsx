
'use client';
import React, { useState, useMemo } from 'react';
import { useVolunteering, type AreaOfService } from '@/contexts/volunteering-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Loader2, PlusCircle, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { CreateAreaDialog } from './create-area-dialog';
import { DeleteConfirmationDialog } from '@/components/structure/delete-confirmation-dialog';
import { ImportVolunteersJsonDialog } from './import-volunteers-json-dialog';
import { useMembersData, useVolunteeringServiceData } from "@/hooks/useDomainData";
import { Badge } from '@/components/ui/badge';

export function AreasManagement() {
    const { users } = useMembersData();
    const { serviceAreas: areas, teams, savedSchedules } = useVolunteeringServiceData();

  const { isLoading, deleteArea } = useVolunteering();
  const [isFormOpen, setFormOpen] = useState(false);
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const [selectedArea, setSelectedArea] = useState<AreaOfService | null>(null);

  const userMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);

  const handleEdit = (area: AreaOfService) => {
    setSelectedArea(area);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setSelectedArea(null);
    setFormOpen(true);
  };
  
  const handleDelete = (area: AreaOfService) => {
    setSelectedArea(area);
    setDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (selectedArea) {
      deleteArea(selectedArea.id);
      setDeleteOpen(false);
      setSelectedArea(null);
    }
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-4">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Lista de Áreas de Serviço</h3>
        <div className="flex items-center gap-2">
          <ImportVolunteersJsonDialog triggerClassName="h-8 text-xs font-bold gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 shadow-sm" />
          <Button onClick={handleAdd} size="sm" className="font-bold shadow-sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Área
          </Button>
        </div>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Modo de Escala</TableHead>
              <TableHead>Líder</TableHead>
              <TableHead>Contato do Líder</TableHead>
              <TableHead className="text-right w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {areas.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                        Nenhuma área de serviço cadastrada.
                    </TableCell>
                </TableRow>
            ) : (
                areas.map((area) => {
                const leader = area.leaderId ? userMap.get(area.leaderId) : null;
                return (
                  <TableRow key={area.id}>
                    <TableCell className="font-medium">{area.name}</TableCell>
                    <TableCell>
                      {area.areaType === 'worship' ? (
                        <Badge className="bg-purple-100 text-purple-750 border-purple-200/30 font-bold hover:bg-purple-100 shrink-0">
                          🎸 Louvor
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="font-bold text-slate-650 shrink-0">
                          👋 Regular
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const mode = area.scheduleMode || (area.unifiedCelebrations ? 'grouped' : 'unified');
                        if (mode === 'unified') return <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">🔵 Unificada</span>;
                        if (mode === 'individual') return <span className="text-xs font-bold text-purple-650 dark:text-purple-400 flex items-center gap-1">🟣 Individual</span>;
                        const groupCount = area.serviceGroups?.length || area.unifiedGroups?.length || 0;
                        return <span className="text-xs font-bold text-orange-600 dark:text-orange-400 flex items-center gap-1">🟠 Agrupada ({groupCount} {groupCount === 1 ? 'grupo' : 'grupos'})</span>;
                      })()}
                    </TableCell>
                    <TableCell>{leader?.name || '-'}</TableCell>
                    <TableCell>{area.leaderContact || leader?.phone || leader?.email || '-'}</TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Abrir menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(area)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(area)} className="text-destructive">
                               <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
            }))}
          </TableBody>
        </Table>
      </div>
      
      <CreateAreaDialog
        open={isFormOpen}
        onOpenChange={setFormOpen}
        existingArea={selectedArea}
      />
      
      {selectedArea && (
        <DeleteConfirmationDialog
            open={isDeleteOpen}
            onOpenChange={setDeleteOpen}
            onConfirm={confirmDelete}
            itemName={selectedArea.name}
            itemType="Área de Serviço"
        />
      )}
    </>
  );
}

    