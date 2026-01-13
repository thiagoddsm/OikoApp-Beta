
'use client';
import React, { useState } from 'react';
import { useVolunteering, type User } from '@/contexts/volunteering-context';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { format, parse } from 'date-fns';

interface VolunteerServiceFormProps {
  user: User;
}

export function VolunteerServiceForm({ user }: VolunteerServiceFormProps) {
  const { areas, teams, events, isLoading, updateVolunteer } = useVolunteering();

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

  const handleEventEligibilityChange = (eventId: string, checked: boolean) => {
    const currentEligibleIds = user.eligibleEventIds || [];
    const newEligibleIds = checked
        ? [...currentEligibleIds, eventId]
        : currentEligibleIds.filter(id => id !== eventId);
    updateVolunteer(user.id, { eligibleEventIds: newEligibleIds });
  };

  const handleBlockoutDateChange = (dates: Date[] | undefined) => {
    const formattedDates = dates ? dates.map(date => format(date, 'yyyy-MM-dd')) : [];
    updateVolunteer(user.id, { blockedDates: formattedDates });
  };

  const isServing = user.serviceStatus === 'serving';

  // Parse the stored string dates back into Date objects for the calendar
  const blockedDateObjects = user.blockedDates?.map(dateStr => parse(dateStr, 'yyyy-MM-dd', new Date())) || [];

  return (
    <div className="space-y-8">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
            <div className="space-y-4">
                <Label className="text-base font-semibold">Disponibilidade de Eventos</Label>
                <div className="space-y-2 rounded-md border p-4">
                    {events.filter(e => e.frequency === 'semanal').map(event => (
                        <div key={event.id} className="flex items-center space-x-2">
                            <Checkbox
                                id={`event-${event.id}`}
                                checked={user.eligibleEventIds?.includes(event.id) || false}
                                onCheckedChange={(checked) => handleEventEligibilityChange(event.id, !!checked)}
                                disabled={!isServing || isLoading}
                            />
                            <Label htmlFor={`event-${event.id}`}>{event.name}</Label>
                        </div>
                    ))}
                </div>
            </div>
             <div className="space-y-4">
                <Label className="text-base font-semibold">Datas de Indisponibilidade</Label>
                <div className="rounded-md border p-0 flex justify-center">
                    <Calendar
                        mode="multiple"
                        selected={blockedDateObjects}
                        onSelect={handleBlockoutDateChange}
                        disabled={!isServing}
                    />
                </div>
            </div>
        </div>
    </div>
  );
}
