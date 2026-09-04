
'use client';
import React, { useState, useMemo } from 'react';
import { useVolunteering, type Team } from '@/contexts/volunteering-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Loader2, PlusCircle, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { TeamFormDialog } from './team-form-dialog';
import { DeleteConfirmationDialog } from '@/components/structure/delete-confirmation-dialog';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useVolunteeringServiceData } from "@/hooks/useDomainData";

export function TeamsManagement() {
    const { serviceAreas: areas, teams, savedSchedules } = useVolunteeringServiceData();

  const { isLoading, deleteTeam } = useVolunteering();
  const [isFormOpen, setFormOpen] = useState(false);
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  const handleEdit = (team: Team) => {
    setSelectedTeam(team);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setSelectedTeam(null);
    setFormOpen(true);
  };
  
  const handleDelete = (team: Team) => {
    setSelectedTeam(team);
    setDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (selectedTeam) {
      deleteTeam(selectedTeam.id);
      setDeleteOpen(false);
      setSelectedTeam(null);
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
      <Card>
          <CardHeader className="flex flex-row items-center justify-between">
              <div>
                  <CardTitle className="text-lg">Lista de Equipes</CardTitle>
                  <CardDescription>Todas as equipes cadastradas no sistema.</CardDescription>
              </div>
              <Button onClick={handleAdd}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Equipe
              </Button>
          </CardHeader>
          <CardContent className="p-0">
             <div className="overflow-x-auto w-full">
<Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-right w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={2} className="h-24 text-center">
                            Nenhuma equipe cadastrada.
                        </TableCell>
                    </TableRow>
                ) : (
                    teams.map((team) => (
                      <TableRow key={team.id}>
                        <TableCell className="font-medium">{team.name}</TableCell>
                        <TableCell className="text-right">
                           <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Abrir menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(team)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDelete(team)} className="text-destructive">
                                   <Trash2 className="mr-2 h-4 w-4" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
</div>
          </CardContent>
      </Card>
      
      <TeamFormDialog
        open={isFormOpen}
        onOpenChange={setFormOpen}
        existingTeam={selectedTeam}
      />
      
      {selectedTeam && (
        <DeleteConfirmationDialog
            open={isDeleteOpen}
            onOpenChange={setDeleteOpen}
            onConfirm={confirmDelete}
            itemName={selectedTeam.name}
            itemType="Equipe"
        />
      )}
    </>
  );
}
