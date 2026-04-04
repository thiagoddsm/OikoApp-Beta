'use client';
import React, { useMemo } from 'react';
import { useVolunteering, type User } from '@/contexts/volunteering-context';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { format, parse } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';

interface VolunteerServiceFormProps {
  user: User;
}

export function VolunteerServiceForm({ user }: VolunteerServiceFormProps) {
  const { areas, teams, events, courses, isLoading, updateVolunteer } = useVolunteering();

  const handleStatusChange = (checked: boolean) => {
    const newStatus = checked ? 'serving' : 'not_serving';
    const updateData: Partial<User> = { serviceStatus: newStatus };
    
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

  const handleIsTeacherChange = (checked: boolean) => {
    const updateData: Partial<User> = { isTeacher: checked };
    if (!checked) {
      updateData.taughtCourseIds = [];
    }
    updateVolunteer(user.id, updateData);
  };
  
  const handleTaughtCoursesChange = (courseId: string, checked: boolean) => {
    const currentTaughtIds = user.taughtCourseIds || [];
    const newTaughtIds = checked
        ? [...currentTaughtIds, courseId]
        : currentTaughtIds.filter(id => id !== courseId);
    updateVolunteer(user.id, { taughtCourseIds: newTaughtIds });
  };

  const isServing = user.serviceStatus === 'serving';
  const isTeacher = user.isTeacher === true;
  const blockedDateObjects = user.blockedDates?.map(dateStr => parse(dateStr, 'yyyy-MM-dd', new Date())) || [];

  return (
    <div className="space-y-8">
        <Card>
            <CardHeader>
                <CardTitle>Ensino</CardTitle>
                <CardDescription>Gerencie as permissões e cursos que este membro pode lecionar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                 <div className="flex items-center space-x-3">
                    <Switch
                        id={`teacher-toggle-${user.id}`}
                        checked={isTeacher}
                        onCheckedChange={handleIsTeacherChange}
                    />
                    <div className="space-y-0.5">
                        <Label htmlFor={`teacher-toggle-${user.id}`} className="text-base">
                        Professor(a) Habilitado(a)
                        </Label>
                        <p className="text-sm text-muted-foreground">
                        {isTeacher
                            ? "Pode ser selecionado como professor de turmas."
                            : "Não pode ser selecionado como professor."}
                        </p>
                    </div>
                </div>
                
                {isTeacher && (
                    <div className="space-y-2">
                        <Label>Cursos que Leciona</Label>
                         <ScrollArea className="h-48 w-full rounded-md border p-4">
                            <div className="space-y-2">
                                {courses.map(course => (
                                    <div key={course.id} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`taught-course-${user.id}-${course.id}`}
                                            checked={user.taughtCourseIds?.includes(course.id) || false}
                                            onCheckedChange={(checked) => handleTaughtCoursesChange(course.id, !!checked)}
                                            disabled={isLoading}
                                        />
                                        <Label htmlFor={`taught-course-${user.id}-${course.id}`} className="font-normal cursor-pointer">
                                            {course.name}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                        <p className="text-xs text-muted-foreground">Cursos que este membro está apto a lecionar.</p>
                    </div>
                )}
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>Serviço Voluntário (Escalas)</CardTitle>
                <CardDescription>Gerencie a disponibilidade e áreas de atuação para escalas de serviço.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center space-x-3">
                    <Switch
                        id={`status-toggle-${user.id}`}
                        checked={isServing}
                        onCheckedChange={handleStatusChange}
                    />
                    <div className="space-y-0.5">
                        <Label htmlFor={`status-toggle-${user.id}`} className="text-base">
                        Disponível para Servir
                        </Label>
                        <p className="text-sm text-muted-foreground">
                        {isServing
                            ? "Este membro está ativo e pode ser escalado."
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
            </CardContent>
        </Card>
    </div>
  );
}
