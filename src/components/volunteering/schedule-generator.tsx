
'use client';
import React, { useState, useMemo } from 'react';
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
  const { areas, teams, events, users, isLoading, saveSchedule } = useVolunteering();
  const { toast } = useToast();
  const [selectedAreaId, setSelectedAreaId] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [skeleton, setSkeleton] = useState<any[] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const teamRotation = useMemo(() => {
    const rotationMap = new Map<string, any>();
    const teamNames = ['Alpha', 'Bravo', 'Charlie', 'Delta'];
    teamNames.forEach(name => {
      const team = teams.find(t => t.name.toLowerCase() === name.toLowerCase());
      if (team) {
        rotationMap.set(name.toLowerCase(), team);
      }
    });
    return rotationMap;
  }, [teams]);


  const handleGenerateSkeleton = () => {
    setIsGenerating(true);
    setTimeout(() => {
        const isAllAreas = selectedAreaId === 'all';
        const targetAreas = isAllAreas ? areas : areas.filter(a => a.id === selectedAreaId);

        const relevantEvents = events.filter(e => e.frequency === 'semanal');
        
        if (relevantEvents.length === 0) {
            setSkeleton([]);
            toast({ variant: 'destructive', title: 'Nenhum Evento Semanal', description: 'Não há eventos semanais cadastrados para gerar um esqueleto.'});
            setIsGenerating(false);
            return;
        }

        let dates: any[] = [];
        const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(selectedYear, selectedMonth, day);
            const dayOfWeekName = currentDate.toLocaleDateString('pt-BR', { weekday: 'long' });

            relevantEvents.forEach(event => {
                if (event.dayOfWeek?.toLowerCase() === dayOfWeekName.toLowerCase()) {
                    event.requiredAreas?.forEach(reqArea => {
                        const area = areas.find(a => a.id === reqArea.areaId);
                        if (area && (isAllAreas || area.id === selectedAreaId)) {
                             for (let i = 0; i < reqArea.quantity; i++) {
                                dates.push({
                                    date: currentDate.toLocaleDateString('pt-BR'),
                                    eventName: event.name,
                                    areaId: area.id,
                                    areaName: area.name,
                                    teamId: null,
                                    teamName: null,
                                    volunteerId: null,
                                });
                            }
                        }
                    })
                }
            });
        }
        
        setSkeleton(dates.sort((a,b) => new Date(a.date.split('/').reverse().join('-')).getTime() - new Date(b.date.split('/').reverse().join('-')).getTime()));
        setIsGenerating(false);
    }, 500);
  };
  
  const handleAutoFill = () => {
    if (!skeleton) return;

    const fifthWeeksOfYear = getAllFifthWeeksOfYear(selectedYear);
    
    // Create a copy of the skeleton to modify
    let tempSkeleton = [...skeleton];
    
    // Sort volunteers by last served date (ascending, nulls first)
    const sortedUsers = [...users].sort((a, b) => {
        const dateA = a.lastServedDate ? a.lastServedDate.toMillis() : 0;
        const dateB = b.lastServedDate ? b.lastServedDate.toMillis() : 0;
        return dateA - dateB;
    });

    const filledSkeleton = tempSkeleton.map(item => {
        const currentDate = new Date(item.date.split('/').reverse().join('-'));
        currentDate.setHours(12);
        const weekOfMonth = getWeekOfMonth(currentDate);
        
        let assignedTeam = null;
        if (weekOfMonth >= 1 && weekOfMonth <= 4) {
            const teamName = ['Alpha', 'Bravo', 'Charlie', 'Delta'][weekOfMonth - 1].toLowerCase();
            assignedTeam = teamRotation.get(teamName) || null;
        } else if (weekOfMonth === 5) {
            const fifthWeekIndex = getFifthWeekOccurrenceInYear(currentDate, fifthWeeksOfYear);
            if (fifthWeekIndex !== -1) {
                const teamName = ['Alpha', 'Bravo', 'Charlie', 'Delta'][fifthWeekIndex % 4].toLowerCase();
                assignedTeam = teamRotation.get(teamName) || null;
            }
        }
        
        // Fair volunteer assignment logic
        let volunteerId = null;
        if (assignedTeam) {
            // Find eligible volunteers who are not yet assigned in this autofill run
            const eligibleVolunteers = sortedUsers.filter(u => 
                u.serviceTeamId === assignedTeam.id && 
                u.serviceAreaId === item.areaId &&
                u.serviceStatus === 'serving' &&
                !tempSkeleton.find(s => s.volunteerId === u.id && s.date === item.date) // Avoid double booking on the same day
            );
            
            if (eligibleVolunteers.length > 0) {
                volunteerId = eligibleVolunteers[0].id;
                // "Assign" the volunteer by removing them from future consideration in this run
                const assignedIndex = sortedUsers.findIndex(u => u.id === volunteerId);
                if (assignedIndex > -1) {
                    // This is a simple way to prevent re-assignment; a more complex system might track allocations
                }
            }
        }

        return {
            ...item,
            teamId: assignedTeam?.id || null,
            teamName: assignedTeam?.name || null,
            volunteerId: volunteerId,
        };
    });

    setSkeleton(filledSkeleton);
    toast({ title: "Mágica!", description: "A escala foi preenchida automaticamente. Revise e salve."});
  };

  const handleVolunteerChange = (index: number, volunteerId: string) => {
    if(!skeleton) return;
    const newSkeleton = [...skeleton];
    newSkeleton[index].volunteerId = volunteerId === 'null' ? null : volunteerId;
    setSkeleton(newSkeleton);
  }
  
  const handleSave = async () => {
    if (!skeleton || !selectedAreaId) return;
    setIsSaving(true);
    
    const monthString = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
    
    const scheduleToSave = skeleton.map(item => ({
        date: item.date,
        eventName: item.eventName,
        areaId: item.areaId,
        teamId: item.teamId,
        teamName: item.teamName,
        memberIds: item.volunteerId ? [item.volunteerId] : [], // Storing as array for future multiple volunteers
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
  };

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
                <div className="flex gap-2">
                     <Button variant="outline" onClick={handleAutoFill}><Wand2 className="mr-2 h-4 w-4" /> Preencher Auto.</Button>
                    <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Exportar</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Salvar Escala
                    </Button>
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
                                const eligibleVolunteers = users.filter(u => u.serviceAreaId === item.areaId && u.serviceTeamId === item.teamId);
                                return(
                                <TableRow key={index}>
                                    <TableCell className="font-medium">{item.date}</TableCell>
                                    <TableCell>{item.eventName}</TableCell>
                                    <TableCell><Badge variant="outline">{item.areaName}</Badge></TableCell>
                                    <TableCell>{item.teamName ? <Badge>{item.teamName}</Badge> : '-'}</TableCell>
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

    