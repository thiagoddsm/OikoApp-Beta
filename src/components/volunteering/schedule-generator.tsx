
'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { useVolunteering } from '@/contexts/volunteering-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, CalendarCog, Download, Save, Wand2 } from 'lucide-react';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Timestamp } from 'firebase/firestore';
import { useDoc } from '@/firebase';
import { Checkbox } from '@/components/ui/checkbox';
import { useMembersData, useEventsData, useVolunteeringServiceData } from "@/hooks/useDomainData";

const months = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const currentYear = new Date().getFullYear();
const years = [currentYear, currentYear + 1];

// Helper to get the week of the month for a given date
const getWeekOfMonth = (date: Date) => {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  return Math.ceil((date.getDate() + firstDay) / 7);
}

// Helper to get which occurrence of a "5th week" this is in the year
const getFifthWeekOccurrenceInYear = (date: Date, allFifthWeeksOfYear: Date[]) => {
    const dateString = date.toISOString().split('T')[0];
    const index = allFifthWeeksOfYear.findIndex(d => d.toISOString().split('T')[0] === dateString);
    return index; // 0-indexed
}

// Pre-calculate all dates in the year that fall on a 5th week of their month
const getAllFifthWeeksOfYear = (year: number) => {
    const fifthWeeks: Date[] = [];
    for (let month = 0; month < 12; month++) {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            if (getWeekOfMonth(date) === 5) {
                fifthWeeks.push(date);
            }
        }
    }
    return fifthWeeks;
}

export function ScheduleGenerator() {
    const { users } = useMembersData();
    const { events, reservations, rooms, strategicEvents, reservationCategories } = useEventsData();
    const { serviceAreas: areas, teams, savedSchedules } = useVolunteeringServiceData();

  const { isLoading, saveSchedule } = useVolunteering();
  const { toast } = useToast();
  const { data: waConfig } = useDoc<any>('config/notifications');
  const [notifyOnSave, setNotifyOnSave] = useState(true);
  const [selectedAreaId, setSelectedAreaId] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [skeleton, setSkeleton] = useState<any[] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [weekTeams, setWeekTeams] = useState<Record<number, string>>({
    1: '',
    2: '',
    3: '',
    4: '',
    5: ''
  });

  // Populate default week rotation based on team names including alpha/bravo/charlie/delta
  useEffect(() => {
    if (teams && teams.length > 0) {
      const findTeamId = (name: string) => teams.find(t => t.name.toLowerCase().includes(name))?.id || '';
      setWeekTeams({
        1: findTeamId('alpha'),
        2: findTeamId('bravo'),
        3: findTeamId('charlie'),
        4: findTeamId('delta'),
        5: findTeamId('alpha')
      });
    }
  }, [teams]);


  const handleGenerateSkeleton = () => {
    setIsGenerating(true);
    setTimeout(() => {
        const isAllAreas = selectedAreaId === 'all';
        let dates: any[] = [];
        const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        const fifthWeeksOfYear = getAllFifthWeeksOfYear(selectedYear);

        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(selectedYear, selectedMonth, day);
            const dayOfWeekName = currentDate.toLocaleDateString('pt-BR', { weekday: 'long' });

            const weeklyEvents = events.filter(e => e.frequency === 'semanal' && e.dayOfWeek?.toLowerCase() === dayOfWeekName.toLowerCase());
            const punctualEvents = events.filter(e => e.frequency === 'pontual' && e.date === currentDate.toISOString().split('T')[0]);
            const relevantEvents = [...weeklyEvents, ...punctualEvents];

            relevantEvents.forEach(event => {
                event.requiredAreas?.forEach(reqArea => {
                    const area = areas.find(a => a.id === reqArea.areaId);
                    if (area && (isAllAreas || area.id === selectedAreaId)) {
                        
                        let assignedTeam = null;
                        const weekOfMonth = getWeekOfMonth(currentDate);
                        const assignedTeamId = weekTeams[weekOfMonth];
                        if (assignedTeamId) {
                            assignedTeam = teams.find(t => t.id === assignedTeamId) || null;
                        }

                         for (let i = 0; i < reqArea.quantity; i++) {
                            dates.push({
                                date: currentDate.toLocaleDateString('pt-BR'),
                                eventId: event.id,
                                eventName: event.name,
                                areaId: area.id,
                                areaName: area.name,
                                teamId: assignedTeam?.id || null,
                                teamName: assignedTeam?.name || null,
                                volunteerId: null, // Initially empty
                            });
                        }
                    }
                })
            });
        }
        
        setSkeleton(dates.sort((a,b) => new Date(a.date.split('/').reverse().join('-')).getTime() - new Date(b.date.split('/').reverse().join('-')).getTime()));
        setIsGenerating(false);
    }, 500);
  };
  
  const handleAutoFill = () => {
    if (!skeleton) return;

    let tempSkeleton = [...skeleton];
    const volunteerAllocations: Record<string, number> = {};

    for (let i = 0; i < tempSkeleton.length; i++) {
        const item = tempSkeleton[i];
        if (item.volunteerId) continue; // Skip already filled slots

        const dateString = item.date.split('/').reverse().join('-');

        const eligibleVolunteers = users
            .filter(u => {
                const isCorrectArea = u.serviceAreaId === item.areaId || (u.worshipAreaId === item.areaId && u.worshipRoles && u.worshipRoles.length > 0);
                const isEligibleForEvent = u.eligibleEventIds?.includes(item.eventId);
                const isCorrectTeam = !item.teamId || u.serviceTeamId === item.teamId || !u.serviceTeamId; // Wildcard if no team is assigned to slot
                const isNotBlocked = !u.blockedDates?.includes(dateString);
                
                // Se for celebração unificada, permite servir no mesmo dia para o mesmo grupo de cultos
                const area = areas.find(a => a.id === item.areaId);
                let isNotServingSameDay = true;
                if (area?.unifiedCelebrations && area.unifiedGroups) {
                    const group = area.unifiedGroups.find(g => g.eventNames.some(name => item.eventName.toLowerCase().includes(name.toLowerCase())));
                    isNotServingSameDay = !tempSkeleton.some(s => {
                        if (s.volunteerId !== u.id || s.date !== item.date) return false;
                        const isSameGroup = group?.eventNames.some(name => s.eventName.toLowerCase().includes(name.toLowerCase()));
                        return !isSameGroup; // Só bloqueia se for de outro grupo
                    });
                } else {
                    isNotServingSameDay = !tempSkeleton.some(s => s.volunteerId === u.id && s.date === item.date);
                }

                return u.serviceStatus === 'serving' && isCorrectArea && isEligibleForEvent && isCorrectTeam && isNotBlocked && isNotServingSameDay;
            })
            .sort((a, b) => {
                // Criterion 1: Less services this month
                const servicesA = volunteerAllocations[a.id] || 0;
                const servicesB = volunteerAllocations[b.id] || 0;
                if (servicesA !== servicesB) return servicesA - servicesB;

                // Criterion 2: Oldest last served date
                const lastServedA = a.lastServedDate ? a.lastServedDate.toMillis() : 0;
                const lastServedB = b.lastServedDate ? b.lastServedDate.toMillis() : 0;
                if (lastServedA !== lastServedB) return lastServedA - lastServedB;
                
                // Criterion 3: Alphabetical
                return a.name.localeCompare(b.name);
            });

        if (eligibleVolunteers.length > 0) {
            const assignedVolunteerId = eligibleVolunteers[0].id;
            tempSkeleton[i].volunteerId = assignedVolunteerId;
            volunteerAllocations[assignedVolunteerId] = (volunteerAllocations[assignedVolunteerId] || 0) + 1;

            // Propagar para eventos unificados no mesmo dia
            const area = areas.find(a => a.id === item.areaId);
            if (area?.unifiedCelebrations && area.unifiedGroups) {
                const group = area.unifiedGroups.find(g => g.eventNames.some(name => item.eventName.toLowerCase().includes(name.toLowerCase())));
                if (group) {
                    tempSkeleton.forEach((otherItem) => {
                        if (otherItem.date === item.date && otherItem.areaId === item.areaId && !otherItem.volunteerId) {
                            const isSameGroup = group.eventNames.some(name => otherItem.eventName.toLowerCase().includes(name.toLowerCase()));
                            if (isSameGroup) {
                                otherItem.volunteerId = assignedVolunteerId;
                            }
                        }
                    });
                }
            }
        }
    }

    setSkeleton(tempSkeleton);
    toast({ title: "Mágica!", description: "A escala foi preenchida automaticamente. Revise e salve."});
  };

  const handleVolunteerChange = (index: number, volunteerId: string) => {
    if(!skeleton) return;
    const newSkeleton = [...skeleton];
    const val = volunteerId === 'null' ? null : volunteerId;
    newSkeleton[index].volunteerId = val;

    // Propagar alteração se for celebração unificada
    const currentItem = newSkeleton[index];
    const area = areas.find(a => a.id === currentItem.areaId);
    if (area?.unifiedCelebrations && area.unifiedGroups) {
      const group = area.unifiedGroups.find(g => g.eventNames.some(name => currentItem.eventName.toLowerCase().includes(name.toLowerCase())));
      if (group) {
        newSkeleton.forEach((item, idx) => {
          if (idx !== index && item.date === currentItem.date && item.areaId === currentItem.areaId) {
            const isSameGroup = group.eventNames.some(name => item.eventName.toLowerCase().includes(name.toLowerCase()));
            if (isSameGroup) {
              item.volunteerId = val;
            }
          }
        });
      }
    }
    setSkeleton(newSkeleton);
  }

  const handleTeamChange = (index: number, teamId: string) => {
    if (!skeleton) return;
    const newSkeleton = [...skeleton];
    const team = teams.find(t => t.id === teamId);
    const valTeamId = teamId === 'null' ? null : teamId;
    const valTeamName = teamId === 'null' ? null : (team?.name || null);
    newSkeleton[index].teamId = valTeamId;
    newSkeleton[index].teamName = valTeamName;
    newSkeleton[index].volunteerId = null; // Reset volunteer when team changes

    // Propagar alteração se for celebração unificada
    const currentItem = newSkeleton[index];
    const area = areas.find(a => a.id === currentItem.areaId);
    if (area?.unifiedCelebrations && area.unifiedGroups) {
      const group = area.unifiedGroups.find(g => g.eventNames.some(name => currentItem.eventName.toLowerCase().includes(name.toLowerCase())));
      if (group) {
        newSkeleton.forEach((item, idx) => {
          if (idx !== index && item.date === currentItem.date && item.areaId === currentItem.areaId) {
            const isSameGroup = group.eventNames.some(name => item.eventName.toLowerCase().includes(name.toLowerCase()));
            if (isSameGroup) {
              item.teamId = valTeamId;
              item.teamName = valTeamName;
              item.volunteerId = null;
            }
          }
        });
      }
    }
    setSkeleton(newSkeleton);
  };
  
  const handleSave = async () => {
    if (!skeleton || selectedAreaId === 'all') {
         toast({
            variant: "destructive",
            title: "Seleção Necessária",
            description: "Por favor, selecione uma área de serviço específica antes de salvar a escala."
        });
        return;
    }
    setIsSaving(true);
    
    const monthString = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
    
    const scheduleToSave = skeleton.map(item => ({
        date: item.date,
        eventName: item.eventName,
        areaId: item.areaId,
        teamId: item.teamId,
        teamName: item.teamName,
        memberIds: item.volunteerId ? [item.volunteerId] : [],
    }));

    await saveSchedule({
        areaId: selectedAreaId,
        month: monthString,
        schedule: scheduleToSave,
    });

    setIsSaving(false);
    toast({
        title: "Escala Salva!",
        description: "A escala gerada foi salva e pode ser visualizada na aba 'Escalas Salvas'."
    });

    if (notifyOnSave) {
        // Obter voluntários designados com telefones
        const volunteersToNotify = skeleton
            .filter(item => item.volunteerId)
            .map(item => {
                const u = users.find(user => user.id === item.volunteerId);
                return {
                    id: item.volunteerId,
                    name: u?.name || 'Voluntário',
                    phone: u?.phone || '',
                };
            })
            .filter(v => v.phone);

        if (volunteersToNotify.length > 0) {
            // Agrupar voluntários por id
            const uniqueVolunteers = Array.from(new Set(volunteersToNotify.map(v => v.id)))
                .map(id => volunteersToNotify.find(v => v.id === id)!);

            const areaName = areas.find(a => a.id === selectedAreaId)?.name || "Área Desconhecida";
            const monthName = months[selectedMonth] + " de " + selectedYear;

            toast({
                title: "Enviando Notificações...",
                description: `Enviando lembretes de escala via WhatsApp para ${uniqueVolunteers.length} voluntários.`,
            });

            for (const volunteer of uniqueVolunteers) {
                const firstName = volunteer.name
                    ? (volunteer.name.trim().split(' ')[0].charAt(0).toUpperCase() + volunteer.name.trim().split(' ')[0].slice(1).toLowerCase())
                    : 'Membro';

                const scheduledItems = skeleton.filter(item => item.volunteerId === volunteer.id);
                const formattedDates = scheduledItems.map(item => {
                    const dateParts = item.date.split('/');
                    const dateObj = new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]), 12, 0, 0);
                    const weekDays = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
                    const day = weekDays[dateObj.getDay()];
                    return `• ${item.date} (${day}) - ${item.eventName}${item.teamName ? ` [Equipe ${item.teamName}]` : ''}`;
                }).join('\n');

                const personalizedMessage = `Olá, ${firstName}! 🗓️ Segue a sua escala de voluntariado na área de ${areaName} para ${monthName.toLowerCase()}:\n\n${formattedDates}\n\nContamos com você! Em caso de imprevistos, avise sua liderança o quanto antes.`;

                try {
                    await fetch('/api/notifications/send', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            channel: 'whatsapp',
                            audience: 'specific_members',
                            targets: [{ id: volunteer.id, name: volunteer.name, phone: volunteer.phone }],
                            message: personalizedMessage,
                            instanceKey: waConfig?.instanceKey || waConfig?.whatsappApiKey,
                            serverUrl: waConfig?.serverUrl
                        }),
                    });
                } catch (error) {
                    console.error("Erro ao notificar no salvamento:", volunteer.name, error);
                }
            }
        }
    }
  };

  const getEligibleVolunteers = (item: any) => {
    if (!users || !item) return [];
    const dateString = item.date.split('/').reverse().join('-');

    return users.filter(u => {
        const isCorrectArea = u.serviceAreaId === item.areaId || (u.worshipAreaId === item.areaId && u.worshipRoles && u.worshipRoles.length > 0);
        const isEligibleForEvent = u.eligibleEventIds?.includes(item.eventId);
        const isCorrectTeam = !item.teamId || u.serviceTeamId === item.teamId || !u.serviceTeamId;
        const isNotBlocked = !u.blockedDates?.includes(dateString);

        return u.serviceStatus === 'serving' && isCorrectArea && isEligibleForEvent && isCorrectTeam && isNotBlocked;
    });
  }

  return (
    <div className="space-y-6">
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle>Configurações da Escala</CardTitle>
          <CardDescription>Selecione a área e o período para gerar o esqueleto da escala.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="md:col-span-2">
                <Label htmlFor="area">Área de Serviço</Label>
                <Select value={selectedAreaId} onValueChange={setSelectedAreaId}>
                  <SelectTrigger id="area"><SelectValue placeholder="Selecione uma área" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Áreas</SelectItem>
                    {areas.map(area => <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>)}
                  </SelectContent>
                </Select>
            </div>
             <div>
                <Label htmlFor="month">Mês</Label>
                <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                  <SelectTrigger id="month"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {months.map((month, index) => <SelectItem key={index} value={index.toString()}>{month}</SelectItem>)}
                  </SelectContent>
                </Select>
            </div>
            <div>
                <Label htmlFor="year">Ano</Label>
                 <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                  <SelectTrigger id="year"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {years.map(year => <SelectItem key={year} value={year.toString()}>{year}</SelectItem>)}
                  </SelectContent>
                </Select>
            </div>
            
          </div>

          <div className="mt-6 border-t pt-6 animate-in fade-in-50 duration-300">
            <Label className="text-xs font-black uppercase text-slate-500 mb-3 block">Configuração de Rodízio de Equipes (Por Semana do Mês)</Label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map((week) => (
                <div key={week} className="space-y-1.5">
                  <Label className="text-xs text-slate-600 font-semibold">Semana {week}</Label>
                  <Select 
                    value={weekTeams[week] || 'null'} 
                    onValueChange={(val) => setWeekTeams(prev => ({ ...prev, [week]: val === 'null' ? '' : val }))}
                  >
                    <SelectTrigger className="h-9 bg-background">
                      <SelectValue placeholder="Sem Equipe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="null">Nenhuma</SelectItem>
                      {teams.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
           <div className="mt-6 flex justify-end">
                <Button onClick={handleGenerateSkeleton} disabled={isGenerating || !selectedAreaId}>
                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarCog className="mr-2 h-4 w-4" />}
                    {isGenerating ? 'Montando...' : 'Montar Esqueleto'}
                </Button>
            </div>
        </CardContent>
      </Card>

      {skeleton && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
                 <div>
                    <CardTitle>Esqueleto da Escala</CardTitle>
                    <CardDescription>
                       Revise as vagas, preencha automaticamente ou atribua voluntários manualmente.
                    </CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 mr-2">
                    <Checkbox
                      id="notify-on-save"
                      checked={notifyOnSave}
                      onCheckedChange={(checked) => setNotifyOnSave(!!checked)}
                    />
                    <Label htmlFor="notify-on-save" className="text-xs cursor-pointer select-none text-muted-foreground font-medium">
                      Notificar por WhatsApp ao salvar
                    </Label>
                  </div>
                  <div className="flex gap-2">
                       <Button variant="outline" onClick={handleAutoFill}><Wand2 className="mr-2 h-4 w-4" /> Preencher Auto.</Button>
                      <Button variant="outline" disabled><Download className="mr-2 h-4 w-4" /> Exportar</Button>
                      <Button onClick={handleSave} disabled={isSaving || selectedAreaId === 'all'}>
                          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                          Salvar Escala
                      </Button>
                  </div>
                </div>
            </div>
          </CardHeader>
          <CardContent>
            {skeleton.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Nenhuma vaga necessária para os filtros selecionados.</p>
            ) : (
                <div className="rounded-lg border max-h-[60vh] overflow-auto">
                    <Table>
                        <TableHeader className="sticky top-0 bg-background z-10">
                            <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Evento</TableHead>
                                <TableHead>Área</TableHead>
                                <TableHead>Equipe</TableHead>
                                <TableHead className="w-[250px]">Voluntário</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {skeleton.map((item, index) => {
                                const eligibleVolunteers = getEligibleVolunteers(item);
                                return(
                                <TableRow key={index}>
                                    <TableCell className="font-medium">{item.date}</TableCell>
                                    <TableCell>{item.eventName}</TableCell>
                                    <TableCell><Badge variant="outline">{item.areaName}</Badge></TableCell>
                                    <TableCell>
                                        <Select 
                                            value={item.teamId || 'null'} 
                                            onValueChange={(value) => handleTeamChange(index, value)}
                                        >
                                            <SelectTrigger className="h-8 w-[140px] bg-background">
                                                <SelectValue placeholder="Sem Equipe" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="null">Nenhuma</SelectItem>
                                                {teams.map(t => (
                                                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                     <TableCell>
                                        <Select value={item.volunteerId || 'null'} onValueChange={(value) => handleVolunteerChange(index, value)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione um voluntário..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="null">Nenhum (Vaga aberta)</SelectItem>
                                                {eligibleVolunteers.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
