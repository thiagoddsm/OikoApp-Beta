'use client';

import React, { useState, useMemo } from 'react';
import { useCollection, deleteDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TeamFormDialog } from '@/components/volunteering/team-form-dialog';
import { DeleteConfirmationDialog } from '@/components/structure/delete-confirmation-dialog';

type Team = {
  id: string;
  name: string;
  members: string[]; // array of user IDs
  areaIds: string[]; // array of area IDs
};

type User = {
  id: string;
  name: string;
  avatar?: string;
};

type AreaOfService = {
  id: string;
  name: string;
};

export default function TeamsManagement() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [isTeamDialogOpen, setTeamDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);

  const { data: teams, isLoading: isLoadingTeams } = useCollection<Team>('teams');
  const { data: users, isLoading: isLoadingUsers } = useCollection<User>('users');
  const { data: areas, isLoading: isLoadingAreas } = useCollection<AreaOfService>('areas_of_service');

  const areaMap = useMemo(() => new Map(areas?.map(area => [area.id, area])), [areas]);

  const handleCreateTeam = () => {
    setEditingTeam(null);
    setTeamDialogOpen(true);
  };

  const handleEditTeam = (team: Team) => {
    setEditingTeam(team);
    setTeamDialogOpen(true);
  };

  const handleDeleteTeam = (team: Team) => {
    setTeamToDelete(team);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!teamToDelete || !firestore) return;

    const docRef = doc(firestore, 'teams', teamToDelete.id);
    deleteDocumentNonBlocking(docRef);

    toast({
      title: "Exclusão Agendada",
      description: `A equipe "${teamToDelete.name}" será excluída.`,
    });

    setDeleteDialogOpen(false);
    setTeamToDelete(null);
  };
  
  const isLoading = isLoadingTeams || isLoadingUsers || isLoadingAreas;

  return (
    <>
      <div className="flex items-center justify-end mb-4">
          <Button onClick={handleCreateTeam}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Criar Equipe
          </Button>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome da Equipe</TableHead>
                <TableHead>Áreas de Serviço</TableHead>
                <TableHead className="text-right">Membros</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams && teams.length > 0 ? (
                teams.map((team) => (
                  <TableRow key={team.id}>
                    <TableCell className="font-medium">{team.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {team.areaIds?.map(areaId => {
                          const area = areaMap.get(areaId);
                          return area ? <Badge key={areaId} variant="outline">{area.name}</Badge> : null;
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{team.members?.length || 0}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEditTeam(team)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteTeam(team)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    Nenhuma equipe encontrada. Comece criando uma nova.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
      
      {isTeamDialogOpen && (
        <TeamFormDialog
            open={isTeamDialogOpen}
            onOpenChange={setTeamDialogOpen}
            allAreas={areas || []}
            existingTeam={editingTeam}
        />
      )}
      
      {teamToDelete && (
        <DeleteConfirmationDialog
            open={isDeleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            onConfirm={confirmDelete}
            itemName={teamToDelete.name}
            itemType="Equipe"
        />
      )}
    </>
  );
}