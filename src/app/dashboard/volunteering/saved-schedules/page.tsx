'use client';
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { VolunteeringProvider, useVolunteering } from '@/contexts/volunteering-context';
import { Save, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { SavedScheduleDetails } from '@/components/volunteering/saved-schedule-details';

const months = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const currentYear = new Date().getFullYear();
const years = [currentYear -1, currentYear, currentYear + 1];


function SavedSchedulesPageContent() {
    const { serviceAreas, isLoading } = useVolunteering();
    const [selectedAreaId, setSelectedAreaId] = useState<string | undefined>(undefined);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(currentYear);
    
    // Format "YYYY-MM"
    const selectedMonthString = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
    
    return (
         <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <Save className="size-6 text-primary"/>
                        Escalas Salvas
                    </CardTitle>
                    <CardDescription>
                        Visualize, gerencie e notifique os voluntários sobre as escalas que foram geradas e salvas no sistema.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="flex items-end gap-4 mb-6 p-4 border rounded-lg bg-muted/50">
                        {isLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin"/>
                        ) : (
                             <div className="grid gap-1.5">
                                <Label htmlFor="area">Área de Serviço</Label>
                                <Select value={selectedAreaId} onValueChange={setSelectedAreaId}>
                                <SelectTrigger id="area" className="w-[250px]"><SelectValue placeholder="Selecione uma área..." /></SelectTrigger>
                                <SelectContent>
                                    {serviceAreas.map((area) => <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>)}
                                </SelectContent>
                                </Select>
                            </div>
                        )}
                         <div className="grid gap-1.5">
                            <Label htmlFor="month">Mês</Label>
                            <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                              <SelectTrigger id="month" className="w-[180px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {months.map((month, index) => <SelectItem key={index} value={index.toString()}>{month}</SelectItem>)}
                              </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="year">Ano</Label>
                             <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                              <SelectTrigger id="year" className="w-[120px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {years.map(year => <SelectItem key={year} value={year.toString()}>{year}</SelectItem>)}
                              </SelectContent>
                            </Select>
                        </div>
                    </div>
                    
                    {selectedAreaId ? (
                        <SavedScheduleDetails areaId={selectedAreaId} monthFilter={selectedMonthString} />
                    ) : (
                        <div className="text-center text-muted-foreground py-10 border-2 border-dashed rounded-lg">
                            <p>Por favor, selecione uma Área de Serviço para ver a escala salva.</p>
                        </div>
                    )}

                </CardContent>
            </Card>
        </div>
    )
}

export default function SavedSchedulesPage() {
    return (
        <VolunteeringProvider>
            <SavedSchedulesPageContent />
        </VolunteeringProvider>
    );
}