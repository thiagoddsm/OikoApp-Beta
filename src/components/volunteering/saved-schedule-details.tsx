'use client';
import React, { useState, useMemo } from 'react';
import { useVolunteering, type SavedSchedule } from '@/contexts/volunteering-context';
import { useDoc, useFirebase } from '@/firebase';
import { Loader2, Download, Send, Trash2, ChevronDown, Mail, MessageSquare, CheckCircle, XCircle, Clock, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DeleteConfirmationDialog } from '@/components/structure/delete-confirmation-dialog';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from '@/hooks/use-toast';
import { useMembersData, useVolunteeringServiceData } from "@/hooks/useDomainData";

const weekDays = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

export function SavedScheduleDetails({ areaId, monthFilter }: { areaId: string, monthFilter: string }) {
    const { user: currentUser } = useFirebase();
    const { users } = useMembersData();
    const { serviceAreas: areas, teams, savedSchedules } = useVolunteeringServiceData();

    const { isLoading: isContextLoading, deleteSchedule, saveSchedule } = useVolunteering();
    const { toast } = useToast();
    const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
    
    const scheduleId = `${areaId}_${monthFilter}`;
    const { data: schedule, isLoading: isScheduleLoading } = useDoc<SavedSchedule>(scheduleId ? `saved_schedules/${scheduleId}` : null);
    const { data: waConfig } = useDoc<any>('config/notifications');
    
    const isLoading = isContextLoading || isScheduleLoading;

    const [searchTerm, setSearchTerm] = useState('');
    const [dayFilter, setDayFilter] = useState('all');
    const [eventFilter, setEventFilter] = useState('all');
    const [teamFilter, setTeamFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [confirmFilter, setConfirmFilter] = useState('all');
    
    const userMap = useMemo(() => new Map(users.map(u => [u.id, u.name])), [users]);
    const areaMap = useMemo(() => new Map(areas.map(a => [a.id, a.name])), [areas]);

    // Calculate all volunteers belonging to this area (either regular or worship)
    const areaVolunteers = useMemo(() => {
        if (!users) return [];
        return users.filter(u => 
            u.serviceAreaId === areaId || 
            (u.worshipAreaId === areaId && u.worshipRoles && u.worshipRoles.length > 0)
        ).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }, [users, areaId]);

    const handleVolunteerChange = async (itemIndex: number, volunteerId: string) => {
        if (!schedule || !schedule.schedule) return;
        
        // Find the actual item in the filtered list
        const originalItem = filteredScheduleItems[itemIndex];
        if (!originalItem) return;

        // Find the index of this item in the original schedule.schedule array
        const originalIndex = schedule.schedule.findIndex(
            (i: any) => i.date === originalItem.date && 
                       i.eventName === originalItem.eventName && 
                       i.areaId === originalItem.areaId &&
                       (i.teamId || null) === (originalItem.teamId || null) &&
                       JSON.stringify(i.memberIds) === JSON.stringify(originalItem.memberIds)
        );

        if (originalIndex === -1) return;

        const updatedScheduleList = [...schedule.schedule];
        const val = volunteerId === 'null' ? [] : [volunteerId];
        
        updatedScheduleList[originalIndex] = {
            ...updatedScheduleList[originalIndex],
            memberIds: val
        };

        // Reset/update confirmations
        const confirmations = { ...(schedule.confirmations || {}) };
        if (volunteerId === 'null') {
            if (originalItem.memberIds[0]) {
                delete confirmations[originalItem.memberIds[0]];
            }
        } else {
            confirmations[volunteerId] = {
                status: 'pending',
                phone: users.find(u => u.id === volunteerId)?.phone || '',
                updatedAt: new Date() as any
            };
        }

        try {
            await saveSchedule({
                ...schedule,
                schedule: updatedScheduleList,
                confirmations
            });
            toast({
                title: "Escala Atualizada!",
                description: "O voluntário foi alterado com sucesso."
            });
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Erro ao salvar",
                description: error.message || "Não foi possível salvar a alteração."
            });
        }
    };

    const filteredScheduleItems = useMemo(() => {
        if (!schedule?.schedule) return [];

        return schedule.schedule.filter((item: any) => {
            const memberNames = item.memberIds.map((id: string) => userMap.get(id) || '').join(' ');
            const searchMatch = searchTerm === '' || 
                item.eventName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.teamName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                memberNames.toLowerCase().includes(searchTerm.toLowerCase());
            
            const dateParts = item.date.split('/');
            const date = new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]), 12, 0, 0);
            const dayOfWeekName = weekDays[date.getDay()];

            const dayMatch = dayFilter === 'all' || dayOfWeekName === dayFilter;
            const eventMatch = eventFilter === 'all' || item.eventName === eventFilter;
            const teamMatch = teamFilter === 'all' || item.teamId === teamFilter;
            
            const hasVolunteers = item.memberIds.length > 0;
            const statusMatch = statusFilter === 'all' || (statusFilter === 'filled' && hasVolunteers) || (statusFilter === 'failed' && !hasVolunteers);

            const confirmStatus = item.memberIds.length > 0
                ? (schedule?.confirmations?.[item.memberIds[0]]?.status || 'pending')
                : null;

            const confirmMatch = confirmFilter === 'all' ||
                (confirmFilter === 'confirmed' && confirmStatus === 'confirmed') ||
                (confirmFilter === 'declined' && confirmStatus === 'declined') ||
                (confirmFilter === 'pending' && confirmStatus === 'pending');

            return searchMatch && dayMatch && eventMatch && teamMatch && statusMatch && confirmMatch;
        });

    }, [schedule, searchTerm, dayFilter, eventFilter, teamFilter, statusFilter, userMap]);
    
    const uniqueEvents = useMemo(() => Array.from(new Set(schedule?.schedule.map((item: any) => item.eventName) || [])), [schedule]);
    const uniqueTeams = useMemo(() => {
        const tMap = new Map();
        schedule?.schedule.forEach((item: any) => {
            if (item.teamId) tMap.set(item.teamId, item.teamName);
        });
        return Array.from(tMap.entries()).map(([id, name]) => ({ id, name }));
    }, [schedule]);
    
    const getDayOfWeek = (dateString: string) => {
        const dateParts = dateString.split('/');
        const date = new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]), 12, 0, 0);
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

        filteredScheduleItems.forEach((item: any) => {
            const rowData = [
                item.date,
                getDayOfWeek(item.date),
                item.eventName,
                item.teamName || '-',
                item.memberIds.map((id: string) => userMap.get(id)).join(', ') || 'Vaga Aberta',
            ];
            tableRows.push(rowData);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 30,
        });
        doc.save(`escala_${areaName}_${monthFilter}.pdf`);
    };

    const handleConfirmationNotification = async () => {
        const areaName = areaMap.get(areaId) || 'Área Desconhecida';
        const monthName = new Date(monthFilter + '-02').toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
        const scheduleData = schedule;
        if (!scheduleData?.schedule) return;

        const uniqueMemberIds = Array.from(new Set(
            scheduleData.schedule.flatMap((item: any) => item.memberIds || [])
        )) as string[];
        const volunteers = uniqueMemberIds
            .map(id => users.find(u => u.id === id))
            .filter((u): u is typeof users[0] => !!u && !!u.phone);

        if (volunteers.length === 0) {
            toast({ variant: 'destructive', title: 'Nenhum destinatário', description: 'Não há voluntários com telefone nesta escala.' });
            return;
        }

        toast({ title: 'Enviando notificações de confirmação...', description: `Enviando confirmações via WhatsApp com botões interativos para ${volunteers.length} voluntários.` });

        let successCount = 0;
        for (const volunteer of volunteers) {
            const scheduledItems = scheduleData.schedule.filter((item: any) => item.memberIds.includes(volunteer.id));
            const formattedItems = scheduledItems.map((item: any) => {
                const day = getDayOfWeek(item.date);
                return `${item.date} (${day}) - ${item.eventName}${item.teamName ? ` [${item.teamName}]` : ''}`;
            });

            try {
                const token = await currentUser?.getIdToken();
                const response = await fetch('/api/notifications/send-schedule-confirmation', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    },
                    body: JSON.stringify({
                        volunteerId: volunteer.id,
                        phone: volunteer.phone,
                        name: volunteer.name,
                        scheduleId: `${areaId}_${monthFilter}`,
                        items: formattedItems,
                        areaName,
                    }),
                });
                if (response.ok) successCount++;
            } catch { /* ignore per-volunteer errors */ }
        }

        toast({ title: `✅ ${successCount} confirmações enviadas!`, description: 'Os voluntários receberam a mensagem com os botões de confirmação no WhatsApp.' });
    };

    const handleNotification = async (channel: 'email' | 'whatsapp', audience: 'all' | string) => {
        const areaName = areaMap.get(areaId) || "Área Desconhecida";
        const monthName = new Date(monthFilter + '-02').toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

        if (channel === 'email') {
            toast({
                variant: 'destructive',
                title: "Canal não suportado",
                description: "O envio de notificações por e-mail não está configurado para esta funcionalidade. Por favor, utilize o WhatsApp."
            });
            return;
        }

        const scheduleData = schedule;
        if (!scheduleData || !scheduleData.schedule) {
            toast({
                variant: 'destructive',
                title: "Erro",
                description: "Dados da escala não disponíveis."
            });
            return;
        }

        const uniqueMemberIds = Array.from(new Set(
            scheduleData.schedule.flatMap((item: any) => item.memberIds || []) || []
        ));

        const volunteers = uniqueMemberIds
            .map(id => users.find(u => u.id === id))
            .filter((u): u is typeof users[0] => !!u && !!u.phone);

        if (volunteers.length === 0) {
            toast({
                variant: 'destructive',
                title: "Nenhum destinatário",
                description: "Não há voluntários com telefone/e-mail cadastrado nesta escala."
            });
            return;
        }

        toast({
            title: "Enviando Notificações...",
            description: `Enviando lembretes de escala via ${channel === 'whatsapp' ? 'WhatsApp' : 'E-mail'} para ${volunteers.length} voluntários.`,
        });

        let successCount = 0;
        let failCount = 0;

        for (const volunteer of volunteers) {
            const firstName = volunteer.name
                ? (volunteer.name.trim().split(' ')[0].charAt(0).toUpperCase() + volunteer.name.trim().split(' ')[0].slice(1).toLowerCase())
                : 'Membro';

            // Filtrar itens da escala em que este voluntário participa
            const scheduledItems = scheduleData.schedule.filter((item: any) => item.memberIds.includes(volunteer.id));
            const formattedDates = scheduledItems.map((item: any) => {
                const day = getDayOfWeek(item.date);
                return `• ${item.date} (${day}) - ${item.eventName}${item.teamName ? ` [Equipe ${item.teamName}]` : ''}`;
            }).join('\n');

            const personalizedMessage = `Olá, ${firstName}! 🗓️ Segue a sua escala de voluntariado na área de ${areaName} para ${monthName.toLowerCase()}:\n\n${formattedDates}\n\nContamos com você! Em caso de imprevistos, avise sua liderança o quanto antes.`;

            try {
                const response = await fetch('/api/notifications/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        channel,
                        audience: 'specific_members',
                        targets: [{ id: volunteer.id, name: volunteer.name, phone: volunteer.phone }],
                        message: personalizedMessage,
                        instanceKey: waConfig?.instanceKey || waConfig?.whatsappApiKey,
                        serverUrl: waConfig?.serverUrl
                    }),
                });

                if (response.ok) {
                    successCount++;
                } else {
                    failCount++;
                    try {
                        const errBody = await response.json();
                        console.error("Erro ao enviar para voluntário:", volunteer.name, errBody);
                        toast({
                            variant: 'destructive',
                            title: `Falha no envio (${volunteer.name})`,
                            description: errBody.error || "Erro desconhecido no gateway de envio."
                        });
                    } catch (e) {
                        toast({
                            variant: 'destructive',
                            title: `Falha no envio (${volunteer.name})`,
                            description: `Código HTTP: ${response.status}`
                        });
                    }
                }
            } catch (error: any) {
                failCount++;
                toast({
                    variant: 'destructive',
                    title: `Erro de rede (${volunteer.name})`,
                    description: error.message || "Erro na conexão com o servidor."
                });
            }
        }

        if (failCount === 0) {
            toast({ title: "Notificações enviadas!", description: `Todas as ${successCount} notificações foram enviadas.` });
        } else if (successCount > 0) {
            toast({ title: "Envio parcial", description: `${successCount} enviadas com sucesso, ${failCount} falharam.` });
        } else {
            toast({ variant: 'destructive', title: "Erro", description: `Falha ao enviar notificações.` });
        }
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
                <h3 className="text-lg font-semibold">Nenhuma Escala Encontrada</h3>
                <p className="text-muted-foreground text-sm">Não há uma escala salva para a área e o período selecionados.</p>
            </div>
        );
    }

    return (
        <>
            {/* KPI cards */}
            {schedule && (() => {
                const allItems = schedule.schedule || [];
                const withVolunteer = allItems.filter((i: any) => i.memberIds?.length > 0);
                const confirmations = schedule.confirmations || {};
                const confirmed = withVolunteer.filter((i: any) => confirmations[i.memberIds[0]]?.status === 'confirmed').length;
                const declined = withVolunteer.filter((i: any) => confirmations[i.memberIds[0]]?.status === 'declined').length;
                const pending = withVolunteer.filter((i: any) => !confirmations[i.memberIds[0]] || confirmations[i.memberIds[0]]?.status === 'pending').length;
                const filled = withVolunteer.length;
                const total = allItems.length;

                return (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        <div className="bg-white border border-slate-200 rounded-xl p-3">
                            <p className="text-xs text-slate-500">Total de vagas</p>
                            <p className="text-2xl font-bold text-slate-800">{total}</p>
                            <p className="text-xs text-slate-400">{filled} preenchidas</p>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                            <p className="text-xs text-emerald-600">Confirmados ✅</p>
                            <p className="text-2xl font-bold text-emerald-700">{confirmed}</p>
                        </div>
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                            <p className="text-xs text-red-600">Recusaram ❌</p>
                            <p className="text-2xl font-bold text-red-700">{declined}</p>
                        </div>
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                            <p className="text-xs text-amber-600">Pendentes ⏳</p>
                            <p className="text-2xl font-bold text-amber-700">{pending}</p>
                        </div>
                    </div>
                );
            })()}

            <Card className="border-dashed">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-lg">Ações e Filtros</CardTitle>
                        <CardDescription>Gerencie e refine a visualização da escala abaixo.</CardDescription>
                    </div>
                     <div className="flex gap-2">
                        <Button variant="outline" onClick={handleExportPDF}><Download className="mr-2"/>Exportar PDF</Button>
                        <Button variant="outline" onClick={handleConfirmationNotification}>
                            <CheckCheck className="mr-2 h-4 w-4" /> Notificar + Pedir Confirmação
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button><Send className="mr-2"/> Notificar</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleNotification('email', 'all')}>
                                    <Mail className="mr-2"/> Notificar todos por E-mail
                                </DropdownMenuItem>
                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>
                                        <MessageSquare className="mr-2"/> Notificar por WhatsApp
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuPortal>
                                    <DropdownMenuSubContent>
                                        <DropdownMenuItem onClick={() => handleNotification('whatsapp', 'all')}>Notificar todos</DropdownMenuItem>
                                    </DropdownMenuSubContent>
                                    </DropdownMenuPortal>
                                </DropdownMenuSub>
                            </DropdownMenuContent>
                        </DropdownMenu>
                         <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}><Trash2 className="mr-2"/> Excluir</Button>
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
                        <SelectTrigger><div className="flex items-center gap-2"><ChevronDown className="h-4 w-4"/>Dia</div></SelectTrigger>
                        <SelectContent><SelectItem value="all">Todos os Dias</SelectItem>{weekDays.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                    </Select>
                     <Select value={eventFilter} onValueChange={setEventFilter}>
                        <SelectTrigger><div className="flex items-center gap-2"><ChevronDown className="h-4 w-4"/>Evento</div></SelectTrigger>
                        <SelectContent><SelectItem value="all">Todos os Eventos</SelectItem>{uniqueEvents.map((e: any) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                    </Select>
                     <Select value={teamFilter} onValueChange={setTeamFilter}>
                        <SelectTrigger><div className="flex items-center gap-2"><ChevronDown className="h-4 w-4"/>Equipe</div></SelectTrigger>
                        <SelectContent><SelectItem value="all">Todas as Equipes</SelectItem>{uniqueTeams.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                    </Select>
                </CardContent>
            </Card>
            
            <div className="mt-6 rounded-lg border overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Dia</TableHead>
                            <TableHead>Evento</TableHead>
                            <TableHead>Equipe</TableHead>
                            <TableHead>Voluntário</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Confirmação</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredScheduleItems.length === 0 ? (
                           <TableRow><TableCell colSpan={7} className="h-24 text-center">Nenhum item encontrado.</TableCell></TableRow>
                        ) : (
                            filteredScheduleItems.map((item: any, index: number) => {
                                const hasVolunteers = item.memberIds.length > 0;
                                return (
                                <TableRow key={index}>
                                    <TableCell className="font-medium">{item.date}</TableCell>
                                    <TableCell>{getDayOfWeek(item.date)}</TableCell>
                                    <TableCell><Badge variant="outline">{item.eventName}</Badge></TableCell>
                                    <TableCell>{item.teamName ? <Badge>{item.teamName}</Badge> : '-'}</TableCell>
                                    <TableCell>
                                        <Select
                                            value={item.memberIds[0] || 'null'}
                                            onValueChange={(val) => handleVolunteerChange(index, val)}
                                        >
                                            <SelectTrigger className="h-8 min-w-[160px] bg-background">
                                                <SelectValue placeholder="Selecione um voluntário..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="null">Vaga Aberta (Nenhum)</SelectItem>
                                                {areaVolunteers.map(v => (
                                                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={hasVolunteers ? 'default' : 'destructive'} className={hasVolunteers ? 'bg-green-50 hover:bg-green-105 text-green-700 border-green-200' : 'bg-red-50 text-red-750 border-red-200'}>
                                            {hasVolunteers ? <CheckCircle className="h-3 w-3 mr-1"/> : <XCircle className="h-3 w-3 mr-1"/>}
                                            {hasVolunteers ? 'Preenchida' : 'Falha'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {hasVolunteers ? (() => {
                                            const confStatus = schedule?.confirmations?.[item.memberIds[0]]?.status;
                                            if (confStatus === 'confirmed') return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200"><CheckCircle className="h-3 w-3 mr-1" />Confirmado</Badge>;
                                            if (confStatus === 'declined') return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Recusou</Badge>;
                                            return <Badge variant="outline" className="text-amber-600 border-amber-300"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
                                        })() : <span className="text-slate-300 text-xs">—</span>}
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
