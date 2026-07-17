'use client';
import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { VolunteeringProvider, useVolunteering } from '@/contexts/volunteering-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { PersonSearchInput } from '@/components/common/person-search-input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { History, Calendar, CheckCircle, XCircle, Clock, Award } from 'lucide-react';
import { useMembersData, useVolunteeringServiceData } from "@/hooks/useDomainData";

const months = [
  "Todos", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const currentYear = new Date().getFullYear();
const years = [currentYear - 1, currentYear, currentYear + 1];

function VolunteerHistoryContent() {
    const { users } = useMembersData();
    const { serviceAreas: areas, savedSchedules } = useVolunteeringServiceData();
    
    const [selectedVolunteerId, setSelectedVolunteerId] = useState<string>('');
    const [selectedMonth, setSelectedMonth] = useState<number>(0); // 0 means "All"
    const [selectedYear, setSelectedYear] = useState<number>(currentYear);

    const areaMap = useMemo(() => new Map(areas.map(a => [a.id, a.name])), [areas]);

    // Query and map all history items for the selected volunteer
    const volunteerHistory = useMemo(() => {
        if (!selectedVolunteerId || !savedSchedules) return [];

        const list: any[] = [];

        savedSchedules.forEach((schedule: any) => {
            // Filter by year if applicable
            const [schedYear, schedMonthStr] = schedule.month.split('-');
            const schedYearNum = parseInt(schedYear);
            const schedMonthNum = parseInt(schedMonthStr);

            if (schedYearNum !== selectedYear) return;
            if (selectedMonth > 0 && schedMonthNum !== selectedMonth) return;

            const scheduleItems = schedule.schedule || [];
            
            scheduleItems.forEach((item: any) => {
                if (item.memberIds?.includes(selectedVolunteerId)) {
                    // Find check-in status
                    const checkInKey = `${item.date}_${item.eventName}_${item.slotIndex || 0}`;
                    const checkIn = schedule.checkIns?.[checkInKey];
                    const confirmation = schedule.confirmations?.[selectedVolunteerId];

                    list.push({
                        date: item.date,
                        eventName: item.eventName,
                        areaId: item.areaId,
                        areaName: areaMap.get(item.areaId) || 'Área Desconhecida',
                        teamName: item.teamName || '-',
                        slotIndex: item.slotIndex || 0,
                        checkInStatus: checkIn?.status || 'pending',
                        checkInTime: checkIn?.timestamp,
                        checkInMethod: checkIn?.method,
                        confirmationStatus: confirmation?.status || 'pending'
                    });
                }
            });
        });

        // Sort chronologically (newest first)
        return list.sort((a, b) => {
            const aDate = new Date(a.date.split('/').reverse().join('-')).getTime();
            const bDate = new Date(b.date.split('/').reverse().join('-')).getTime();
            return bDate - aDate;
        });

    }, [selectedVolunteerId, selectedMonth, selectedYear, savedSchedules, areaMap]);

    // KPI Calculations
    const stats = useMemo(() => {
        const total = volunteerHistory.length;
        const present = volunteerHistory.filter(h => h.checkInStatus === 'present').length;
        const absent = volunteerHistory.filter(h => h.checkInStatus === 'absent').length;
        const pending = volunteerHistory.filter(h => h.checkInStatus === 'pending').length;
        const rate = total > 0 ? Math.round(((present) / (total - pending || total)) * 100) : 100;

        return { total, present, absent, pending, rate };
    }, [volunteerHistory]);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <History className="size-6 text-primary" />
                        Histórico do Voluntário
                    </CardTitle>
                    <CardDescription>
                        Consulte o histórico de escalas, funções desempenhadas e assiduidade dos voluntários.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Filters Row */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end p-4 border rounded-xl bg-slate-50/50">
                        <div className="md:col-span-2">
                            <Label htmlFor="volunteer-select">Selecionar Voluntário</Label>
                            <PersonSearchInput
                                value={selectedVolunteerId}
                                onChange={setSelectedVolunteerId}
                                users={users}
                                placeholder="Buscar voluntário..."
                            />
                        </div>
                        <div>
                            <Label htmlFor="month-select">Mês</Label>
                            <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                                <SelectTrigger id="month-select"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {months.map((m, idx) => <SelectItem key={idx} value={idx.toString()}>{m}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="year-select">Ano</Label>
                            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                                <SelectTrigger id="year-select"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {selectedVolunteerId ? (
                        <>
                            {/* KPI Metrics */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="border border-slate-150 rounded-xl p-4 bg-white shadow-sm space-y-1">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total de Escalas</span>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="size-5 text-blue-500" />
                                        <span className="text-2xl font-black text-slate-800">{stats.total}</span>
                                    </div>
                                </div>
                                <div className="border border-slate-150 rounded-xl p-4 bg-white shadow-sm space-y-1">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Presenças</span>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="size-5 text-emerald-500" />
                                        <span className="text-2xl font-black text-slate-800">{stats.present}</span>
                                    </div>
                                </div>
                                <div className="border border-slate-150 rounded-xl p-4 bg-white shadow-sm space-y-1">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Faltas</span>
                                    <div className="flex items-center gap-2">
                                        <XCircle className="size-5 text-red-500" />
                                        <span className="text-2xl font-black text-slate-800">{stats.absent}</span>
                                    </div>
                                </div>
                                <div className="border border-slate-150 rounded-xl p-4 bg-white shadow-sm space-y-1">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Assiduidade</span>
                                    <div className="flex items-center gap-2">
                                        <Award className="size-5 text-amber-500" />
                                        <span className="text-2xl font-black text-slate-800">{stats.rate}%</span>
                                    </div>
                                </div>
                            </div>

                            {/* History Table */}
                            <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
                                <Table>
                                    <TableHeader className="bg-slate-50">
                                        <TableRow>
                                            <TableHead>Data</TableHead>
                                            <TableHead>Culto / Evento</TableHead>
                                            <TableHead>Área de Serviço</TableHead>
                                            <TableHead>Equipe</TableHead>
                                            <TableHead>Confirmação</TableHead>
                                            <TableHead>Frequência (Check-in)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {volunteerHistory.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-24 text-center text-slate-400 italic">
                                                    Nenhuma escala encontrada para este período.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            volunteerHistory.map((item, idx) => (
                                                <TableRow key={idx}>
                                                    <TableCell className="font-semibold text-slate-700">{item.date}</TableCell>
                                                    <TableCell>{item.eventName}</TableCell>
                                                    <TableCell><Badge variant="outline">{item.areaName}</Badge></TableCell>
                                                    <TableCell>{item.teamName}</TableCell>
                                                    <TableCell>
                                                        {item.confirmationStatus === 'confirmed' && (
                                                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100/80 border-emerald-250">✅ Confirmado</Badge>
                                                        )}
                                                        {item.confirmationStatus === 'declined' && (
                                                            <Badge variant="destructive">❌ Recusou</Badge>
                                                        )}
                                                        {item.confirmationStatus === 'pending' && (
                                                            <Badge variant="outline" className="text-amber-600 border-amber-300">⏳ Pendente</Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {item.checkInStatus === 'present' && (
                                                            <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200">
                                                                <CheckCircle className="size-3 mr-1" /> Presente
                                                            </Badge>
                                                        )}
                                                        {item.checkInStatus === 'absent' && (
                                                            <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50">
                                                                <XCircle className="size-3 mr-1" /> Ausente
                                                            </Badge>
                                                        )}
                                                        {item.checkInStatus === 'pending' && (
                                                            <Badge variant="outline" className="text-slate-500 border-slate-300">
                                                                <Clock className="size-3 mr-1" /> Não confirmado
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </>
                    ) : (
                        <div className="text-center text-slate-400 py-12 border-2 border-dashed rounded-2xl bg-slate-25/30">
                            Selecione um voluntário acima para carregar o histórico de escalas e assiduidade.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default function VolunteerHistoryPage() {
    return (
        <VolunteeringProvider>
            <VolunteerHistoryContent />
        </VolunteeringProvider>
    );
}
