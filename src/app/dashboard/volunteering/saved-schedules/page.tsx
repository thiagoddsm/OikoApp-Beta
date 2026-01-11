'use client';
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { VolunteeringProvider } from '@/contexts/volunteering-context';
import { Save } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { SavedScheduleDetails } from '@/components/volunteering/saved-schedule-details';

const months = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const currentYear = new Date().getFullYear();
const years = [currentYear -1, currentYear, currentYear + 1];

export default function SavedSchedulesPage() {
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(currentYear);
    
    // Format "YYYY-MM"
    const selectedMonthString = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;

    return (
        <VolunteeringProvider>
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
                        
                        <SavedScheduleDetails monthFilter={selectedMonthString} />

                    </CardContent>
                </Card>
            </div>
        </VolunteeringProvider>
    );
}
