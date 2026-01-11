
'use client';
import React, { useState, useMemo } from 'react';
import { useVolunteering } from '@/contexts/volunteering-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, CalendarCog, Download, Save } from 'lucide-react';
import { Label } from '../ui/label';

const months = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const currentYear = new Date().getFullYear();
const years = [currentYear, currentYear + 1];

export function ScheduleGenerator() {
  const { areas, teams, events, isLoading } = useVolunteering();
  const [selectedAreaId, setSelectedAreaId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [generatedSchedule, setGeneratedSchedule] = useState<any | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    if (!selectedAreaId) return;

    setIsGenerating(true);
    // Lógica de simulação de geração de escala
    setTimeout(() => {
        // Encontra eventos semanais para a área
        const relevantEvents = events.filter(e => 
            e.frequency === 'semanal' && e.requiredAreas?.some(ra => ra.areaId === selectedAreaId)
        );

        if (relevantEvents.length === 0 || teams.length === 0) {
            setGeneratedSchedule({ dates: [], error: 'Nenhum evento semanal ou equipe encontrada para esta área.' });
            setIsGenerating(false);
            return;
        }

        const dates: any[] = [];
        let teamIndex = 0;
        const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1);
        const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(selectedYear, selectedMonth, day);
            const dayOfWeek = currentDate.toLocaleDateString('pt-BR', { weekday: 'long' });

            relevantEvents.forEach(event => {
                if (event.dayOfWeek?.toLowerCase() === dayOfWeek.toLowerCase()) {
                    dates.push({
                        date: currentDate.toLocaleDateString('pt-BR'),
                        eventName: event.name,
                        team: teams[teamIndex % teams.length]
                    });
                    teamIndex++;
                }
            });
        }
        
        setGeneratedSchedule({ dates });
        setIsGenerating(false);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle>Configurações da Escala</CardTitle>
          <CardDescription>Selecione a área e o período para gerar a escala de voluntários.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="md:col-span-2">
                <Label htmlFor="area">Área de Serviço</Label>
                <Select value={selectedAreaId} onValueChange={setSelectedAreaId}>
                  <SelectTrigger id="area"><SelectValue placeholder="Selecione uma área" /></SelectTrigger>
                  <SelectContent>
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
                <Button onClick={handleGenerate} disabled={isGenerating || !selectedAreaId}>
                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarCog className="mr-2 h-4 w-4" />}
                    {isGenerating ? 'Gerando...' : 'Gerar Escala'}
                </Button>
            </div>
        </CardContent>
      </Card>

      {generatedSchedule && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
                 <div>
                    <CardTitle>Escala Gerada</CardTitle>
                    <CardDescription>
                        Escala para {areas.find(a => a.id === selectedAreaId)?.name} - {months[selectedMonth]}/{selectedYear}
                    </CardDescription>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Exportar</Button>
                    <Button><Save className="mr-2 h-4 w-4" /> Salvar Escala</Button>
                </div>
            </div>
          </CardHeader>
          <CardContent>
            {generatedSchedule.error ? (
                <p className="text-destructive text-center py-8">{generatedSchedule.error}</p>
            ) : (
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Evento</TableHead>
                                <TableHead>Equipe Escalada</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {generatedSchedule.dates.map((item, index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-medium">{item.date}</TableCell>
                                    <TableCell>{item.eventName}</TableCell>
                                    <TableCell>{item.team.name}</TableCell>
                                </TableRow>
                            ))}
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
