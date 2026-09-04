'use client';
import React, { useMemo, useState } from 'react';
import { useVolunteering, type User } from '@/contexts/volunteering-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, User as UserIcon, Search } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { useMembersData, useVolunteeringServiceData } from "@/hooks/useDomainData";

export function VolunteersManagement() {
    const { users } = useMembersData();
    const { serviceAreas: areas, teams, savedSchedules } = useVolunteeringServiceData();

  const { isLoading, updateVolunteer } = useVolunteering();
  const [search, setSearch] = useState('');

  const handleStatusChange = (user: User, checked: boolean) => {
    const newStatus = checked ? 'serving' : 'not_serving';
    const updateData: Partial<User> = { serviceStatus: newStatus };
    // If user is no longer serving, clear their area and team
    if (!checked) {
      updateData.serviceAreaId = '';
      updateData.serviceTeamId = '';
    }
    updateVolunteer(user.id, updateData);
  };

  const handleAreaChange = (user: User, areaId: string) => {
    updateVolunteer(user.id, { serviceAreaId: areaId === 'null' ? '' : areaId });
  };
  
  const handleTeamChange = (user: User, teamId: string) => {
    updateVolunteer(user.id, { serviceTeamId: teamId === 'null' ? '' : teamId });
  };

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const term = search.toLowerCase();
    return users.filter(u => u.name?.toLowerCase().includes(term));
  }, [users, search]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar voluntário pelo nome..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border">
        <div className="overflow-x-auto w-full">
<Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">Membro</TableHead>
            <TableHead className="w-[150px]">Status</TableHead>
            <TableHead>Área de Serviço</TableHead>
            <TableHead>Equipe</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredUsers.map(user => {
            const avatar = PlaceHolderImages.find(p => p.id === 'avatar-1'); // Placeholder avatar
            const isServing = user.serviceStatus === 'serving';

            return (
              <TableRow key={user.id}>
                <TableCell>
                   <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                           {avatar && <AvatarImage src={avatar.imageUrl} alt={user.name} />}
                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                    </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`status-${user.id}`}
                      checked={isServing}
                      onCheckedChange={(checked) => handleStatusChange(user, checked)}
                    />
                    <label htmlFor={`status-${user.id}`} className="text-sm font-medium">
                      {isServing ? 'Servindo' : 'Não Servindo'}
                    </label>
                  </div>
                </TableCell>
                <TableCell>
                   <Select
                        value={user.serviceAreaId || 'null'}
                        onValueChange={(value) => handleAreaChange(user, value)}
                        disabled={!isServing}
                    >
                        <SelectTrigger><SelectValue placeholder="Selecione uma área" /></SelectTrigger>
                        <SelectContent>
                             <SelectItem value="null">Nenhuma</SelectItem>
                            {areas.map(area => <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </TableCell>
                <TableCell>
                    <Select
                        value={user.serviceTeamId || 'null'}
                        onValueChange={(value) => handleTeamChange(user, value)}
                        disabled={!isServing}
                    >
                        <SelectTrigger><SelectValue placeholder="Selecione uma equipe" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="null">Nenhuma</SelectItem>
                            {teams.map(team => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
</div>
      </div>
    </div>
  );
}
