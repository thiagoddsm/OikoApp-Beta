
'use client';
import React from 'react';
import { useVolunteering, type User } from '@/contexts/volunteering-context';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface VolunteerServiceFormProps {
  user: User;
}

export function VolunteerServiceForm({ user }: VolunteerServiceFormProps) {
  const { areas, teams, isLoading, updateVolunteer } = useVolunteering();

  const handleStatusChange = (checked: boolean) => {
    const newStatus = checked ? 'serving' : 'not_serving';
    const updateData: Partial<User> = { serviceStatus: newStatus };
    
    // If user is no longer serving, clear their area and team to avoid dangling references
    if (!checked) {
      updateData.serviceAreaId = '';
      updateData.serviceTeamId = '';
    }
    updateVolunteer(user.id, updateData);
  };

  const handleAreaChange = (areaId: string) => {
    updateVolunteer(user.id, { serviceAreaId: areaId === 'null' ? '' : areaId });
  };
  
  const handleTeamChange = (teamId: string) => {
    updateVolunteer(user.id, { serviceTeamId: teamId === 'null' ? '' : teamId });
  };

  const isServing = user.serviceStatus === 'serving';

  return (
    <div className="space-y-6">
        <div className="flex items-center space-x-3 rounded-md border p-4">
            <Switch
                id={`status-toggle-${user.id}`}
                checked={isServing}
                onCheckedChange={handleStatusChange}
            />
            <div className="space-y-0.5">
                <Label htmlFor={`status-toggle-${user.id}`} className="text-base">
                Status de Serviço
                </Label>
                <p className="text-sm text-muted-foreground">
                {isServing
                    ? "Este membro está ativo e pode ser escalado para servir."
                    : "Este membro não está servindo atualmente."}
                </p>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
                <Label htmlFor="service-area">Área de Serviço</Label>
                <Select
                    value={user.serviceAreaId || 'null'}
                    onValueChange={handleAreaChange}
                    disabled={!isServing || isLoading}
                >
                    <SelectTrigger id="service-area">
                        <SelectValue placeholder="Selecione uma área..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="null">Nenhuma</SelectItem>
                        {areas.map(area => <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                 <p className="text-xs text-muted-foreground">A área onde o voluntário atua.</p>
            </div>
            
            <div className="space-y-2">
                 <Label htmlFor="service-team">Equipe de Rodízio</Label>
                <Select
                    value={user.serviceTeamId || 'null'}
                    onValueChange={handleTeamChange}
                    disabled={!isServing || isLoading}
                >
                    <SelectTrigger id="service-team">
                        <SelectValue placeholder="Selecione uma equipe..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="null">Nenhuma</SelectItem>
                        {teams.map(team => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                 <p className="text-xs text-muted-foreground">A equipe para o sistema de rodízio (Ex: Alpha, Bravo).</p>
            </div>
        </div>
    </div>
  );
}
