
'use client';

import React, { useState, useMemo } from 'react';
import { useCollection, addDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CalendarCog, FileDown, Bell } from 'lucide-react';
import { SchedulePreview } from '@/components/volunteering/schedule-preview';
import { getMonth, getYear, lastDayOfMonth } from 'date-fns';

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
    const date = new Date(year, month, 1);
    
    // Find the first Sunday
    while (date.getDay() !== 0) {
        date.setDate(date.getDate() + 1);
    }
    
    // Iterate through the month
    while (date.getMonth() === month) {
        sundays.push(new Date(date));
        date.setDate(date.getDate() + 7);
    }
    
    return sundays;
};


export default function SchedulePage() {
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(`${getYear(new Date())}-${String(getMonth(new Date()) + 1).padStart(2, '0')}`);
  const [generatedSchedule, setGeneratedSchedule] = useState<GeneratedSchedule[] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: teams, isLoading: loadingTeams } = useCollection<Team>('teams');
  const { data: areas, isLoading: loadingAreas } = useCollection<AreaOfService>('areas_of_service');
  
  const handleGenerateSchedule = () => {
    if (!selectedArea || !selectedMonth || !teams || teams.length === 0) {
      alert("Por favor, selecione uma área e um mês, e certifique-se de que existem equipes cadastradas.");
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
                            Confira a escala gerada abaixo. Você pode salvá-la, exportá-la ou notificar as equipes.
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline"><FileDown className="mr-2 size-4" /> Exportar</Button>
                        <Button><Bell className="mr-2 size-4" /> Notificar Equipes</Button>
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
