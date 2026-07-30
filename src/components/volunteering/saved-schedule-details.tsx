import React, { useState, useMemo } from 'react';
import { useVolunteering, type SavedSchedule } from '@/contexts/volunteering-context';
import { useDoc, useFirebase } from '@/firebase';
import { Loader2, Download, Send, Trash2, ChevronDown, Mail, MessageSquare, CheckCircle, XCircle, Clock, CheckCheck, User, Calendar, Users, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DeleteConfirmationDialog } from '@/components/structure/delete-confirmation-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
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
    
    // Controlled Notification Modal
    const [isNotifyModalOpen, setNotifyModalOpen] = useState(false);
    const [notifyMode, setNotifyMode] = useState<'confirmation' | 'reminder'>('confirmation');
    const [targetAudience, setTargetAudience] = useState<'all' | 'date' | 'person' | 'team'>('all');
    const [targetValue, setTargetValue] = useState<string>('');
    const [isSending, setIsSending] = useState(false);
    const [sendingVolunteerId, setSendingVolunteerId] = useState<string | null>(null);

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
            (u.serviceAreaIds && u.serviceAreaIds.includes(areaId)) ||
            (u.worshipAreaId === areaId && u.worshipRoles && u.worshipRoles.length > 0)
        ).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }, [users, areaId]);

    // Computed unique dates for filter
    const uniqueDatesList = useMemo(() => {
        if (!schedule?.schedule) return [];
        const dateSet = new Set<string>();
        schedule.schedule.forEach((item: any) => {
            if (item.date) dateSet.add(item.date);
        });
        return Array.from(dateSet).map(date => {
            const dateParts = date.split('/');
            const d = new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]), 12, 0, 0);
            const dayName = weekDays[d.getDay()];
            return { date, label: `${date} (${dayName})` };
        });
    }, [schedule]);

    // Computed scheduled volunteers list for filter
    const scheduledVolunteersList = useMemo(() => {
        if (!schedule?.schedule) return [];
        const vMap = new Map<string, string>();
        schedule.schedule.forEach((item: any) => {
            item.memberIds?.forEach((id: string) => {
                const name = userMap.get(id);
                if (name) vMap.set(id, name);
            });
        });
        return Array.from(vMap.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
    }, [schedule, userMap]);

    const handleVolunteerChange = async (itemIndex: number, volunteerId: string) => {
        if (!schedule || !schedule.schedule) return;
        
        const originalItem = filteredScheduleItems[itemIndex];
        if (!originalItem) return;

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

    // Consolidated Handler for Sending Schedule Confirmation with interactive buttons
    const handleConfirmationNotification = async (filter?: { mode: 'all' | 'date' | 'person' | 'team', value?: string }) => {
        const areaName = areaMap.get(areaId) || 'Área Desconhecida';
        const scheduleData = schedule;
        if (!scheduleData?.schedule) return;

        let itemsToNotify = scheduleData.schedule.filter((item: any) => item.memberIds && item.memberIds.length > 0);

        if (filter) {
            if (filter.mode === 'date' && filter.value) {
                itemsToNotify = itemsToNotify.filter((item: any) => item.date === filter.value);
            } else if (filter.mode === 'person' && filter.value) {
                itemsToNotify = itemsToNotify.filter((item: any) => item.memberIds.includes(filter.value));
            } else if (filter.mode === 'team' && filter.value) {
                itemsToNotify = itemsToNotify.filter((item: any) => item.teamId === filter.value);
            }
        }

        const uniqueMemberIds = Array.from(new Set(
            itemsToNotify.flatMap((item: any) => item.memberIds || [])
        )) as string[];

        const volunteers = uniqueMemberIds
            .map(id => users.find(u => u.id === id))
            .filter((u): u is typeof users[0] => !!u && !!u.phone);

        if (volunteers.length === 0) {
            toast({ variant: 'destructive', title: 'Nenhum destinatário', description: 'Não há voluntários com telefone cadastrado para o filtro selecionado.' });
            return;
        }

        setIsSending(true);
        toast({ title: 'Enviando solicitações de confirmação...', description: `Enviando confirmações via WhatsApp com botões para ${volunteers.length} voluntário(s).` });

        let successCount = 0;
        for (const volunteer of volunteers) {
            const scheduledItems = itemsToNotify.filter((item: any) => item.memberIds.includes(volunteer.id));
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

        setIsSending(false);
        toast({ title: `✅ ${successCount} confirmações enviadas!`, description: 'Os voluntários receberam as solicitações com botões no WhatsApp.' });
    };

    // Consolidated Handler for Standard Scale Reminder Notifications
    const handleNotification = async (channel: 'email' | 'whatsapp', filter?: { mode: 'all' | 'date' | 'person' | 'team', value?: string }) => {
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
            toast({ variant: 'destructive', title: "Erro", description: "Dados da escala não disponíveis." });
            return;
        }

        let itemsToNotify = scheduleData.schedule.filter((item: any) => item.memberIds && item.memberIds.length > 0);

        if (filter) {
            if (filter.mode === 'date' && filter.value) {
                itemsToNotify = itemsToNotify.filter((item: any) => item.date === filter.value);
            } else if (filter.mode === 'person' && filter.value) {
                itemsToNotify = itemsToNotify.filter((item: any) => item.memberIds.includes(filter.value));
            } else if (filter.mode === 'team' && filter.value) {
                itemsToNotify = itemsToNotify.filter((item: any) => item.teamId === filter.value);
            }
        }

        const uniqueMemberIds = Array.from(new Set(
            itemsToNotify.flatMap((item: any) => item.memberIds || [])
        )) as string[];

        const volunteers = uniqueMemberIds
            .map(id => users.find(u => u.id === id))
            .filter((u): u is typeof users[0] => !!u && !!u.phone);

        if (volunteers.length === 0) {
            toast({
                variant: 'destructive',
                title: "Nenhum destinatário",
                description: "Não há voluntários com telefone cadastrado no filtro selecionado."
            });
            return;
        }

        setIsSending(true);
        toast({
            title: "Enviando Notificações...",
            description: `Enviando lembretes de escala via WhatsApp para ${volunteers.length} voluntário(s).`,
        });

        let successCount = 0;
        let failCount = 0;

        for (const volunteer of volunteers) {
            const firstName = volunteer.name
                ? (volunteer.name.trim().split(' ')[0].charAt(0).toUpperCase() + volunteer.name.trim().split(' ')[0].slice(1).toLowerCase())
                : 'Membro';

            const scheduledItems = itemsToNotify.filter((item: any) => item.memberIds.includes(volunteer.id));
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
                }
            } catch {
                failCount++;
            }
        }

        setIsSending(false);
        if (failCount === 0) {
            toast({ title: "Notificações enviadas!", description: `Todas as ${successCount} notificações foram enviadas.` });
        } else if (successCount > 0) {
            toast({ title: "Envio parcial", description: `${successCount} enviadas com sucesso, ${failCount} falharam.` });
        } else {
            toast({ variant: 'destructive', title: "Erro", description: `Falha ao enviar notificações.` });
        }
    };

    // Quick single volunteer trigger directly from row action
    const handleSingleVolunteerNotify = async (volunteerId: string) => {
        setSendingVolunteerId(volunteerId);
        await handleConfirmationNotification({ mode: 'person', value: volunteerId });
        setSendingVolunteerId(null);
    };

    // Submit handler from notification modal
    const handleExecuteModalNotification = async () => {
        const filter = {
            mode: targetAudience,
            value: targetValue
        };

        if (targetAudience !== 'all' && !targetValue) {
            toast({
                variant: 'destructive',
                title: 'Seleção necessária',
                description: 'Por favor, selecione a opção desejada para o filtro escolhido.'
            });
            return;
        }

        setNotifyModalOpen(false);

        if (notifyMode === 'confirmation') {
            await handleConfirmationNotification(filter);
        } else {
            await handleNotification('whatsapp', filter);
        }
    };

        const modalRecipientsCount = useMemo(() => {
        if (!schedule?.schedule) return 0;
        let items = schedule.schedule.filter((item: any) => item.memberIds && item.memberIds.length > 0);
        if (targetAudience === 'date' && targetValue) {
            items = items.filter((item: any) => item.date === targetValue);
        } else if (targetAudience === 'person' && targetValue) {
            items = items.filter((item: any) => item.memberIds.includes(targetValue));
        } else if (targetAudience === 'team' && targetValue) {
            items = items.filter((item: any) => item.teamId === targetValue);
        }
        const uniqueIds = new Set(items.flatMap((item: any) => item.memberIds || []));
        return Array.from(uniqueIds).filter(id => users.some(u => u.id === id && !!u.phone)).length;
    }, [schedule, targetAudience, targetValue, users]);
    
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
                        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                            <p className="text-xs text-slate-500">Total de vagas</p>
                            <p className="text-2xl font-bold text-slate-800">{total}</p>
                            <p className="text-xs text-slate-400">{filled} preenchidas</p>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 shadow-sm">
                            <p className="text-xs text-emerald-600">Confirmados ✅</p>
                            <p className="text-2xl font-bold text-emerald-700">{confirmed}</p>
                        </div>
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3 shadow-sm">
                            <p className="text-xs text-red-600">Recusaram ❌</p>
                            <p className="text-2xl font-bold text-red-700">{declined}</p>
                        </div>
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 shadow-sm">
                            <p className="text-xs text-amber-600">Pendentes ⏳</p>
                            <p className="text-2xl font-bold text-amber-700">{pending}</p>
                        </div>
                    </div>
                );
            })()}

            <Card className="border-dashed">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-lg">Ações e Filtros</CardTitle>
                        <CardDescription>Gerencie, notifique e filtre a escala de voluntários.</CardDescription>
                    </div>
                     <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" onClick={handleExportPDF}><Download className="mr-2 h-4 w-4"/>Exportar PDF</Button>

                        {/* Direct Notification Modal Trigger */}
                        <Button 
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                            onClick={() => {
                                setTargetAudience('all');
                                setTargetValue('');
                                setNotifyModalOpen(true);
                            }}
                        >
                            <Send className="mr-2 h-4 w-4"/> Notificar Voluntários
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline"><Filter className="mr-2 h-4 w-4"/> Opções de Envio</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuItem onClick={() => handleConfirmationNotification({ mode: 'all' })}>
                                    <CheckCheck className="mr-2 h-4 w-4 text-emerald-600"/> Pedir Confirmação de Todos
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleNotification('whatsapp', { mode: 'all' })}>
                                    <MessageSquare className="mr-2 h-4 w-4 text-emerald-600"/> Notificar Lembrete para Todos
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                    setTargetAudience('date');
                                    setNotifyModalOpen(true);
                                }}>
                                    <Calendar className="mr-2 h-4 w-4 text-primary"/> Notificar por Dia / Data
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                    setTargetAudience('person');
                                    setNotifyModalOpen(true);
                                }}>
                                    <User className="mr-2 h-4 w-4 text-primary"/> Notificar Pessoa Específica
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                    setTargetAudience('team');
                                    setNotifyModalOpen(true);
                                }}>
                                    <Users className="mr-2 h-4 w-4 text-primary"/> Notificar por Equipe
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                         <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}><Trash2 className="mr-2 h-4 w-4"/> Excluir</Button>
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-4">
                     <Input
                        placeholder="Buscar por voluntário, evento..."
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
            
            <div className="mt-6 rounded-lg border overflow-hidden bg-white shadow-sm">
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
                            <TableHead className="text-right">Notificar</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredScheduleItems.length === 0 ? (
                           <TableRow><TableCell colSpan={8} className="h-24 text-center">Nenhum item encontrado.</TableCell></TableRow>
                        ) : (
                            filteredScheduleItems.map((item: any, index: number) => {
                                const hasVolunteers = item.memberIds.length > 0;
                                const volunteerId = item.memberIds[0];
                                const isSendingThis = sendingVolunteerId === volunteerId;

                                return (
                                <TableRow key={index} className="hover:bg-slate-50 transition-colors">
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
                                    <TableCell className="text-right">
                                        {hasVolunteers ? (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                disabled={isSendingThis}
                                                onClick={() => handleSingleVolunteerNotify(volunteerId)}
                                                className="h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 font-bold"
                                                title="Enviar notificação de confirmação para este voluntário"
                                            >
                                                {isSendingThis ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1" />}
                                                Enviar
                                            </Button>
                                        ) : (
                                            <span className="text-slate-300 text-xs">—</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            )})
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Notification Modal for Targeted Audiences */}
            <Dialog open={isNotifyModalOpen} onOpenChange={setNotifyModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-slate-900">
                            <Send className="h-5 w-5 text-emerald-600" />
                            Notificar Voluntários da Escala
                        </DialogTitle>
                        <DialogDescription>
                            Configure os destinatários e a mensagem enviada via WhatsApp.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Tipo de Notificação */}
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-muted-foreground">Tipo de Notificação</Label>
                            <Select value={notifyMode} onValueChange={(val: any) => setNotifyMode(val)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="confirmation">
                                        <div className="flex items-center gap-2">
                                            <CheckCheck className="h-4 w-4 text-emerald-600" />
                                            <span>Pedir Confirmação (Botões Interativos no WhatsApp)</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="reminder">
                                        <div className="flex items-center gap-2">
                                            <MessageSquare className="h-4 w-4 text-blue-600" />
                                            <span>Lembrete Informativo (Mensagem de Escala)</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Destinatários (Filtro) */}
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-muted-foreground">Quem receberá a notificação?</Label>
                            <Select value={targetAudience} onValueChange={(val: any) => { setTargetAudience(val); setTargetValue(''); }}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        <div className="flex items-center gap-2">
                                            <Users className="h-4 w-4 text-emerald-600" />
                                            <span>Todos os voluntários escalados no mês</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="date">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-primary" />
                                            <span>Voluntários escalados em um Dia / Data específica</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="person">
                                        <div className="flex items-center gap-2">
                                            <User className="h-4 w-4 text-indigo-600" />
                                            <span>Uma Pessoa Específica</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="team">
                                        <div className="flex items-center gap-2">
                                            <Filter className="h-4 w-4 text-amber-600" />
                                            <span>Uma Equipe Específica</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Conditional Target Selector */}
                        {targetAudience === 'date' && (
                            <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg border">
                                <Label className="text-xs font-semibold">Selecione a Data:</Label>
                                <Select value={targetValue} onValueChange={setTargetValue}>
                                    <SelectTrigger><SelectValue placeholder="Escolha um dia da escala..." /></SelectTrigger>
                                    <SelectContent>
                                        {uniqueDatesList.map(item => (
                                            <SelectItem key={item.date} value={item.date}>{item.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {targetAudience === 'person' && (
                            <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg border">
                                <Label className="text-xs font-semibold">Selecione o Voluntário:</Label>
                                <Select value={targetValue} onValueChange={setTargetValue}>
                                    <SelectTrigger><SelectValue placeholder="Escolha o voluntário..." /></SelectTrigger>
                                    <SelectContent>
                                        {scheduledVolunteersList.map(v => (
                                            <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {targetAudience === 'team' && (
                            <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg border">
                                <Label className="text-xs font-semibold">Selecione a Equipe:</Label>
                                <Select value={targetValue} onValueChange={setTargetValue}>
                                    <SelectTrigger><SelectValue placeholder="Escolha a equipe..." /></SelectTrigger>
                                    <SelectContent>
                                        {uniqueTeams.map((t: any) => (
                                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Recipient Count Indicator */}
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-semibold flex items-center justify-between">
                            <span>Destinatários prontos para envio:</span>
                            <Badge className="bg-emerald-600 text-white font-bold">{modalRecipientsCount} voluntário(s)</Badge>
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setNotifyModalOpen(false)}>Cancelar</Button>
                        <Button 
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                            disabled={isSending || (targetAudience !== 'all' && !targetValue)}
                            onClick={handleExecuteModalNotification}
                        >
                            {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            Enviar Notificações
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
