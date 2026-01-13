'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { useVolunteering, type SavedSchedule } from '@/contexts/volunteering-context';
import { useDoc } from '@/firebase';
import { Loader2, FileText, Download, Send, Trash2, Search, SlidersHorizontal, ChevronDown, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DeleteConfirmationDialog } from '@/components/structure/delete-confirmation-dialog';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const weekDays = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

export function SavedScheduleDetails({ areaId, monthFilter }: { areaId: string, monthFilter: string }) {
    const { teams, users, areas, isLoading: isContextLoading, deleteSchedule } = useVolunteering();
    const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
    
    const scheduleId = `${areaId}_${monthFilter}`;
    const { data: schedule, isLoading: isScheduleLoading } = useDoc<SavedSchedule>(scheduleId ? `saved_schedules/${scheduleId}` : null);
    
    const isLoading = isContextLoading || isScheduleLoading;

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [dayFilter, setDayFilter] = useState('all');
    const [eventFilter, setEventFilter] = useState('all');
    const [teamFilter, setTeamFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    
    const userMap = useMemo(() => new Map(users.map(u => [u.id, u.name])), [users]);
    const areaMap = useMemo(() => new Map(areas.map(a => [a.id, a.name])), [areas]);


    const filteredScheduleItems = useMemo(() => {
        if (!schedule?.schedule) return [];

        return schedule.schedule.filter(item => {
            const memberNames = item.memberIds.map(id => userMap.get(id) || '').join(' ');
            const searchMatch = searchTerm === '' || 
                item.eventName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.teamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                memberNames.toLowerCase().includes(searchTerm.toLowerCase());
            
            const date = new Date(item.date.split('/').reverse().join('-') + 'T12:00:00');
            const dayOfWeekName = weekDays[date.getDay()];

            const dayMatch = dayFilter === 'all' || dayOfWeekName === dayFilter;
            const eventMatch = eventFilter === 'all' || item.eventName === eventFilter;
            const teamMatch = teamFilter === 'all' || item.teamId === teamFilter;
            
            const hasVolunteers = item.memberIds.length > 0;
            const statusMatch = statusFilter === 'all' || (statusFilter === 'filled' && hasVolunteers) || (statusFilter === 'failed' && !hasVolunteers);

            return searchMatch && dayMatch && eventMatch && teamMatch && statusMatch;
        });

    }, [schedule, searchTerm, dayFilter, eventFilter, teamFilter, statusFilter, userMap]);
    
    const uniqueEvents = useMemo(() => Array.from(new Set(schedule?.schedule.map(item => item.eventName) || [])), [schedule]);
    const uniqueTeams = useMemo(() => {
        const teamMap = new Map();
        schedule?.schedule.forEach(item => teamMap.set(item.teamId, item.teamName));
        return Array.from(teamMap.entries()).map(([id, name]) => ({ id, name }));
    }, [schedule]);
    
    const getDayOfWeek = (dateString: string) => {
        const date = new Date(dateString.split('/').reverse().join('-') + 'T12:00:00');
        return weekDays[date.getDay()];
    }

    const handleExportPDF = () => {
        const doc = new jsPDF();
        const areaName = areaMap.get(areaId) || "Área Desconhecida";
        const monthName = new Date(monthFilter + '-02').toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

        doc.setFontSize(16);
        doc.text(`Escala de Serviço - ${areaName}`, 14, 16);
        doc.setFontSize(12);
        doc.text(`Período: ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`, 14, 22);

        const tableColumn = ["Data", "Dia", "Evento", "Equipe", "Voluntário"];
        const tableRows: any[] = [];

        filteredScheduleItems.forEach(item => {
            const rowData = [
                item.date,
                getDayOfWeek(item.date),
                item.eventName,
                item.teamName || '-',
                item.memberIds.map(id => userMap.get(id)).join(', ') || 'Vaga Aberta',
            ];
            tableRows.push(rowData);
        });

        (doc as any).autoTable(tableColumn, tableRows, { startY: 30 });
        doc.save(`escala_${areaName}_${monthFilter}.pdf`);
    };
    
    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8 h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
     if (!schedule) {
        return (
            <div className="flex flex-col items-center justify-center p-8 h-64 border-2 border-dashed rounded-lg">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">Nenhuma Escala Encontrada</h3>
                <p className="text-muted-foreground text-sm">Não há uma escala salva para a área e o período selecionados.</p>
                 <p className="text-muted-foreground text-sm mt-1">Tente gerar uma na aba "Gerar Escala".</p>
            </div>
        );
    }

    return (
        <>
            <Card className="border-dashed">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-lg">Ações e Filtros</CardTitle>
                        <CardDescription>Gerencie e refine a visualização da escala abaixo.</CardDescription>
                    </div>
                     <div className="flex gap-2">
                        <Button variant="outline" onClick={handleExportPDF}><Download className="mr-2"/>Exportar PDF</Button>
                        <div className="flex flex-col items-end">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button><Send className="mr-2"/> Notificar</Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem>Notificar todos por E-mail</DropdownMenuItem>
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>Notificar por WhatsApp</DropdownMenuSubTrigger>
                                        <DropdownMenuPortal>
                                        <DropdownMenuSubContent>
                                            <DropdownMenuItem>Notificar todos</DropdownMenuItem>
                                            <DropdownMenuItem>Notificar um voluntário...</DropdownMenuItem>
                                        </DropdownMenuSubContent>
                                        </DropdownMenuPortal>
                                    </DropdownMenuSub>
                                </DropdownMenuContent>
                            </DropdownMenu>
                             <p className="text-xs text-muted-foreground mt-1">Lembretes automáticos são enviados 3 e 1 dia antes.</p>
                        </div>
                         <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}><Trash2 className="mr-2"/> Excluir Escala</Button>
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-4">
                     <Input
                        placeholder="Buscar..."
                        className="md:col-span-2"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Select value={dayFilter} onValueChange={setDayFilter}>
                        <SelectTrigger><div className="flex items-center gap-2"><ChevronDown className="h-4 w-4"/>Dia da Semana</div></SelectTrigger>
                        <SelectContent><SelectItem value="all">Todos os Dias</SelectItem>{weekDays.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                    </Select>
                     <Select value={eventFilter} onValueChange={setEventFilter}>
                        <SelectTrigger><div className="flex items-center gap-2"><ChevronDown className="h-4 w-4"/>Evento</div></SelectTrigger>
                        <SelectContent><SelectItem value="all">Todos os Eventos</SelectItem>{uniqueEvents.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                    </Select>
                     <Select value={teamFilter} onValueChange={setTeamFilter}>
                        <SelectTrigger><div className="flex items-center gap-2"><ChevronDown className="h-4 w-4"/>Equipe</div></SelectTrigger>
                        <SelectContent><SelectItem value="all">Todas as Equipes</SelectItem>{uniqueTeams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                    </Select>
                </CardContent>
            </Card>
            
            <div className="mt-6 rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[120px]">Data</TableHead>
                            <TableHead className="w-[130px]">Dia</TableHead>
                            <TableHead>Evento</TableHead>
                            <TableHead>Equipe</TableHead>
                            <TableHead>Voluntário / Motivo</TableHead>
                            <TableHead className="w-[120px]">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredScheduleItems.length === 0 ? (
                           <TableRow>
                               <TableCell colSpan={6} className="h-24 text-center">
                                   Nenhum item corresponde aos filtros aplicados.
                               </TableCell>
                           </TableRow>
                        ) : (
                            filteredScheduleItems.map((item, index) => {
                                const hasVolunteers = item.memberIds.length > 0;
                                return (
                                <TableRow key={index}>
                                    <TableCell className="font-medium">{item.date}</TableCell>
                                    <TableCell>{getDayOfWeek(item.date)}</TableCell>
                                    <TableCell><Badge variant="outline">{item.eventName}</Badge></TableCell>
                                    <TableCell>{item.teamName ? <Badge>{item.teamName}</Badge> : '-'}</TableCell>
                                    <TableCell>
                                        {hasVolunteers ? (
                                             <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-auto p-1 -ml-1">
                                                        {item.memberIds.map(id => userMap.get(id)).join(', ')}
                                                        <ChevronDown className="h-3 w-3 ml-2" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="start">
                                                    <DropdownMenuItem disabled>Trocar por...</DropdownMenuItem>
                                                    {/* Lógica para listar voluntários elegíveis */}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        ) : (
                                            <DropdownMenu>
                                                 <DropdownMenuTrigger asChild>
                                                     <Button variant="ghost" className="h-auto p-1 -ml-1 text-destructive">
                                                        Nenhum voluntário atribuído
                                                        <ChevronDown className="h-3 w-3 ml-2" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="start">
                                                    <DropdownMenuItem disabled>Atribuir para...</DropdownMenuItem>
                                                     {/* Lógica para listar voluntários elegíveis */}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={hasVolunteers ? 'default' : 'destructive'} className={hasVolunteers ? 'bg-green-100 text-green-800' : ''}>
                                            {hasVolunteers ? <CheckCircle className="h-3 w-3 mr-1"/> : <XCircle className="h-3 w-3 mr-1"/>}
                                            {hasVolunteers ? 'Preenchida' : 'Falha'}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            )})
                        )}
                    </TableBody>
                </Table>
            </div>
             <DeleteConfirmationDialog
                open={isDeleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={() => {
                    deleteSchedule(schedule.id);
                    setDeleteDialogOpen(false);
                }}
                itemName={`a escala de ${schedule.month}`}
                itemType="Escala"
            />
        </>
    );
}
