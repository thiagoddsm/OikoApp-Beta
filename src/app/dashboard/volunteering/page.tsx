
'use client';

import React, { useState, useMemo } from 'react';
import { useCollection, deleteDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, PlusCircle, Pencil, Trash2, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TeamFormDialog } from '@/components/volunteering/team-form-dialog';
import { DeleteConfirmationDialog } from '@/components/structure/delete-confirmation-dialog';
import { PlaceHolderImages } from '@/lib/placeholder-images';

type Team = {
  id: string;
  name: string;
  members: string[]; // array of user IDs
};

type User = {
  id: string;
  name: string;
  avatar?: string;
};

export default function VolunteeringPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [isTeamDialogOpen, setTeamDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);

  const { data: teams, isLoading: isLoadingTeams } = useCollection<Team>('teams');
  const { data: users, isLoading: isLoadingUsers } = useCollection<User>('users');

  const userMap = useMemo(() => {
    return new Map(users?.map(user => [user.id, user]));
  }, [users]);

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
  
  const isLoading = isLoadingTeams || isLoadingUsers;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Gestão de Equipes de Voluntários</CardTitle>
            <CardDescription>Crie e gerencie as equipes que servem em sua igreja.</CardDescription>
          </div>
          <Button onClick={handleCreateTeam}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Criar Equipe
          </Button>
        </CardHeader>
        <CardContent>
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
                    <TableHead>Membros</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teams && teams.length > 0 ? (
                    teams.map((team) => (
                      <TableRow key={team.id}>
                        <TableCell className="font-medium">{team.name}</TableCell>
                        <TableCell>
                          <div className="flex -space-x-2 overflow-hidden">
                            {team.members?.slice(0, 5).map(memberId => {
                                const member = userMap.get(memberId);
                                if (!member) return null;
                                const avatar = PlaceHolderImages.find(p => p.id === (member.avatar || 'avatar-1'));
                                return (
                                    <Avatar key={member.id} className="inline-block h-8 w-8 rounded-full ring-2 ring-background">
                                        {avatar && <AvatarImage src={avatar.imageUrl} alt={member.name} />}
                                        <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                );
                            })}
                            {team.members?.length > 5 && (
                                <Avatar className="relative flex h-8 w-8 items-center justify-center rounded-full bg-muted-foreground text-xs font-medium text-background ring-2 ring-background">
                                    +{team.members.length - 5}
                                </Avatar>
                            )}
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
        </CardContent>
      </Card>
      
      {isTeamDialogOpen && (
        <TeamFormDialog
            open={isTeamDialogOpen}
            onOpenChange={setTeamDialogOpen}
            allUsers={users || []}
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
