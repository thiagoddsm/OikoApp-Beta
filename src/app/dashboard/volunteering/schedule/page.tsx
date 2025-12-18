'use client';

import React, { useState } from 'react';
import { useFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CalendarCog, FileDown, Bell, Save } from 'lucide-react';
import { SchedulePreview } from '@/components/volunteering/schedule-preview';
import { getMonth, getYear } from 'date-fns';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useCollection } from '@/firebase/firestore/use-collection';


type Team = {
  id: string;
  name: string;
};

type AreaOfService = {
  id: string;
  name: string;
};

type GeneratedSchedule = {
    date: Date;
    teamName: string;
    teamId: string;
};

// Helper function to get all Sundays in a given month and year
const getSundaysOfMonth = (month: number, year: number): Date[] => {
    const sundays: Date[] = [];
    const date = new Date(Date.UTC(year, month, 1));
    
    // Find the first Sunday
    while (date.getUTCDay() !== 0) {
        date.setUTCDate(date.getUTCDate() + 1);
    }
    
    // Iterate through the month
    while (date.getUTCMonth() === month) {
        sundays.push(new Date(date));
        date.setUTCDate(date.getUTCDate() + 7);
    }
    
    return sundays;
};


export default function SchedulePage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(`${getYear(new Date())}-${String(getMonth(new Date()) + 1).padStart(2, '0')}`);
  const [generatedSchedule, setGeneratedSchedule] = useState<GeneratedSchedule[] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);

  const { data: teams, isLoading: loadingTeams } = useCollection<Team>('teams');
  const { data: areas, isLoading: loadingAreas } = useCollection<AreaOfService>('areas_of_service');
  
  const handleGenerateSchedule = () => {
    if (!selectedArea || !selectedMonth || !teams || teams.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Faltam informações',
        description: 'Por favor, selecione uma área, um mês e certifique-se de que existem equipes cadastradas.',
      });
      return;
    }
    
    setIsGenerating(true);
    
    const [year, month] = selectedMonth.split('-').map(Number);
    const sundays = getSundaysOfMonth(month - 1, year);
    
    let teamIndex = 0;
    const schedule = sundays.map(sunday => {
      const team = teams[teamIndex % teams.length];
      teamIndex++;
      return {
        date: sunday,
        teamName: team.name,
        teamId: team.id,
      };
    });

    // Simulate a delay for showing the loader
    setTimeout(() => {
        setGeneratedSchedule(schedule);
        setIsGenerating(false);
    }, 500);
  };
  
  const handleSaveSchedule = async () => {
    if (!generatedSchedule || !selectedArea || !selectedMonth || !firestore) {
        toast({
            variant: 'destructive',
            title: 'Nenhuma escala para salvar',
            description: 'Gere uma escala antes de tentar salvar.',
        });
        return;
    }
    setIsSaving(true);
    
    const schedulesCollection = collection(firestore, 'saved_schedules');
    const areaName = areas?.find(a => a.id === selectedArea)?.name || 'Desconhecida';
    
    try {
        await addDocumentNonBlocking(schedulesCollection, {
            areaId: selectedArea,
            areaName: areaName,
            month: selectedMonth,
            schedule: generatedSchedule.map(s => ({ ...s, date: s.date.toISOString() })), // Convert dates to strings for Firestore
        });
        toast({
            title: 'Escala Salva!',
            description: `A escala para ${areaName} de ${selectedMonth} foi salva com sucesso.`,
        });
    } catch (error) {
        // The error will be handled by the global error handler
        console.error('Failed to save schedule', error);
    } finally {
        setIsSaving(false);
    }
  };

  const handleNotifyTeams = async () => {
    if (!generatedSchedule) return;
    setIsNotifying(true);
    
    const areaName = areas?.find(a => a.id === selectedArea)?.name || 'Desconhecida';
    const message = `Lembrete de escala para a área de ${areaName} no mês ${selectedMonth}. Verifique o app para mais detalhes.`;

    try {
        const response = await fetch('/api/notifications/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ channel: 'whatsapp', audience: 'teams_in_schedule', message, schedule: generatedSchedule }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Falha no envio');
        
        toast({
            title: "Notificação Agendada",
            description: "As equipes escaladas foram adicionadas à fila de notificação.",
        });

    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Erro ao Notificar',
            description: (error as Error).message || 'Não foi possível agendar as notificações.',
        });
    } finally {
        setIsNotifying(false);
    }
  };

  const isLoading = loadingTeams || loadingAreas;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarCog />
            Gerador de Escalas de Voluntários
          </CardTitle>
          <CardDescription>
            Selecione uma área de serviço e um mês para gerar uma escala de rotação automática para as equipes.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-center gap-4">
          <Select onValueChange={setSelectedArea} disabled={isLoading}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Selecione a Área" />
            </SelectTrigger>
            <SelectContent>
              {loadingAreas && <SelectItem value="loading" disabled>Carregando áreas...</SelectItem>}
              {areas?.map(area => (
                <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full sm:w-[200px]"
          />
          
          <Button onClick={handleGenerateSchedule} disabled={!selectedArea || isGenerating || isLoading}>
            {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Gerar Escala
          </Button>
        </CardContent>
      </Card>
      
      {generatedSchedule && (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Pré-visualização da Escala</CardTitle>
                        <CardDescription>
                            Confira a escala gerada. Você pode salvar, exportar ou notificar as equipes.
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" disabled>
                            <FileDown className="mr-2 size-4" /> Exportar
                        </Button>
                        <Button onClick={handleSaveSchedule} disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 size-4" />}
                            Salvar Escala
                        </Button>
                        <Button onClick={handleNotifyTeams} disabled={isNotifying}>
                            {isNotifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bell className="mr-2 size-4" />}
                            Notificar Equipes
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <SchedulePreview schedule={generatedSchedule} />
            </CardContent>
        </Card>
      )}
    </div>
  );
}
