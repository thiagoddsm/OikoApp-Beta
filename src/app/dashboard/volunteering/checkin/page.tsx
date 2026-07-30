'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { VolunteeringProvider, useVolunteering } from '@/contexts/volunteering-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { QrCode, Calendar, CheckCircle, XCircle, Clock, Printer } from 'lucide-react';
import { useMembersData, useVolunteeringServiceData } from "@/hooks/useDomainData";
import { useDoc } from '@/firebase';
import { Input } from '@/components/ui/input';

function CheckinPanelContent() {
    const { users } = useMembersData();
    const { serviceAreas: areas } = useVolunteeringServiceData();
    const { saveSchedule } = useVolunteering();

    const [selectedAreaId, setSelectedAreaId] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [devIpOverride, setDevIpOverride] = useState<string>('');

    const userMap = useMemo(() => new Map(users.map(u => [u.id, u.name])), [users]);
    const areaName = useMemo(() => areas.find(a => a.id === selectedAreaId)?.name || '', [areas, selectedAreaId]);

    // Format selectedDate (YYYY-MM-DD) into pt-BR (DD/MM/YYYY)
    const formattedSelectedDate = useMemo(() => {
        if (!selectedDate) return '';
        const [year, month, day] = selectedDate.split('-');
        return `${day}/${month}/${year}`;
    }, [selectedDate]);

    // Retrieve saved schedule for this area and month
    const selectedMonthString = useMemo(() => {
        if (!selectedDate) return '';
        return selectedDate.substring(0, 7); // YYYY-MM
    }, [selectedDate]);

    const scheduleId = `${selectedAreaId}_${selectedMonthString}`;
    const { data: schedule } = useDoc<any>(selectedAreaId && selectedMonthString ? `saved_schedules/${scheduleId}` : null);

    // Filter items matching the selected date
    const dayScheduleItems = useMemo(() => {
        if (!schedule?.schedule) return [];
        return schedule.schedule.filter((item: any) => item.date === formattedSelectedDate);
    }, [schedule, formattedSelectedDate]);

    // Generate public Check-in URL
    const checkinUrl = useMemo(() => {
        if (typeof window === 'undefined' || !selectedDate) return '';
        let origin = window.location.origin;
        if (origin.includes('localhost') && devIpOverride.trim()) {
            origin = devIpOverride.trim();
        }
        const areaQuery = selectedAreaId ? `&areaId=${selectedAreaId}` : '';
        return `${origin}/public/checkin?date=${selectedDate}${areaQuery}`;
    }, [selectedAreaId, selectedDate, devIpOverride]);

    // QR Code API url
    const qrCodeApiUrl = useMemo(() => {
        if (!checkinUrl) return '';
        return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(checkinUrl)}`;
    }, [checkinUrl]);

    const handleManualCheckIn = async (item: any, status: 'present' | 'absent' | 'pending') => {
        if (!schedule || !schedule.schedule) return;

        const checkInKey = `${item.date}_${item.eventName}_${item.slotIndex || 0}`;
        const checkIns = { ...(schedule.checkIns || {}) };

        if (status === 'pending') {
            delete checkIns[checkInKey];
        } else {
            checkIns[checkInKey] = {
                status,
                memberId: item.memberIds[0] || '',
                timestamp: new Date(),
                method: 'manual'
            };
        }

        try {
            await saveSchedule({
                ...schedule,
                checkIns
            });
        } catch (error) {
            console.error("Failed to manually check-in:", error);
        }
    };

    const handlePrintQrCode = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const displayName = selectedAreaId ? areaName : 'Geral (Todas as Áreas)';

        printWindow.document.write(`
            <html>
            <head>
                <title>Imprimir QR Code - ${displayName}</title>
                <style>
                    body {
                        font-family: system-ui, sans-serif;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        height: 90vh;
                        text-align: center;
                        color: #1e293b;
                    }
                    .card {
                        border: 2px solid #e2e8f0;
                        border-radius: 24px;
                        padding: 40px;
                        max-width: 400px;
                        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                    }
                    h1 { margin-bottom: 5px; font-size: 24px; color: #7c3aed; }
                    p { font-size: 14px; color: #64748b; margin-bottom: 20px; }
                    img { border: 10px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); margin-bottom: 20px; }
                    .footer { font-size: 11px; color: #94a3b8; margin-top: 15px; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h1>CHECK-IN DE VOLUNTÁRIOS</h1>
                    <p>Área: <strong>${displayName}</strong></p>
                    <img src="${qrCodeApiUrl}" alt="QR Code" width="220" height="220" />
                    <p style="font-size: 12px; margin-top: 10px;">Escaneie o código acima com a câmera do seu celular para confirmar sua presença na escala de hoje!</p>
                    <div class="footer">OikoApp Church Management</div>
                </div>
                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(function() { window.close(); }, 500);
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <QrCode className="size-6 text-primary" />
                        Painel de Check-in (QR Code)
                    </CardTitle>
                    <CardDescription>
                        Gere códigos QR para check-in de voluntários e acompanhe a presença em tempo real.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Filters and QR Generator */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="border border-slate-150 rounded-2xl p-5 bg-slate-50/50 space-y-4">
                            <div>
                                <Label htmlFor="area-select">Modalidade do Check-in / QR Code</Label>
                                <Select value={selectedAreaId || 'all'} onValueChange={(val) => setSelectedAreaId(val === 'all' ? '' : val)}>
                                    <SelectTrigger id="area-select" className="bg-white font-semibold"><SelectValue placeholder="Selecione uma modalidade..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all" className="font-bold text-emerald-700">⭐ QR Code Único Geral (Todas as Áreas)</SelectItem>
                                        {areas.map((area) => <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <p className="text-[11px] text-muted-foreground italic mt-1">
                                    {!selectedAreaId 
                                        ? "Gera 1 QR Code único para o dia todo. O voluntário escaneia e escolhe sua área na tela."
                                        : `Gera QR Code específico apenas para a área ${areaName}.`}
                                </p>
                            </div>
                            <div>
                                <Label htmlFor="date-select">Data da Escala</Label>
                                <Input
                                    id="date-select"
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedDate(e.target.value)}
                                    className="bg-white"
                                />
                            </div>
                        </div>

                        {typeof window !== 'undefined' && window.location.hostname === 'localhost' && (
                            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 text-amber-800 dark:text-amber-300 p-4 rounded-2xl text-xs space-y-2 leading-normal">
                                <p className="font-bold">⚠️ Teste no Celular (Desenvolvimento Local)</p>
                                <p>Como você está rodando no seu computador (localhost), seu celular não conseguirá acessar o link padrão. Para testar no celular, coloque o IP do seu computador na mesma rede Wi-Fi:</p>
                                <div>
                                    <Label className="text-[10px] font-black text-amber-700 uppercase tracking-wider block">URL Base com IP (Ex: http://192.168.1.50:9002)</Label>
                                    <Input
                                        placeholder="http://192.168.1.50:9002"
                                        value={devIpOverride}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDevIpOverride(e.target.value)}
                                        className="h-8 text-xs bg-white mt-1 border-amber-300 focus-visible:ring-amber-400 text-slate-800"
                                    />
                                </div>
                            </div>
                        )}

                        {qrCodeApiUrl ? (
                            <div className="border border-slate-200 rounded-2xl p-5 bg-white shadow-sm flex flex-col items-center text-center space-y-4">
                                <Badge className={!selectedAreaId ? "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold" : "bg-slate-100 text-slate-700 border-slate-300"}>
                                    {!selectedAreaId ? '⭐ QR Code Único Geral' : `Área: ${areaName}`}
                                </Badge>
                                <div className="border-4 border-slate-50 rounded-2xl p-3 bg-white shadow-inner">
                                    <img src={qrCodeApiUrl} alt="Check-in QR Code" className="size-48" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-slate-800">{!selectedAreaId ? 'Todas as Áreas de Serviço' : areaName}</p>
                                    <p className="text-xs text-slate-500 font-medium">{formattedSelectedDate}</p>
                                    {!selectedAreaId && (
                                        <p className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 p-2 rounded-xl border border-emerald-150 mt-2">
                                            📱 Qualquer voluntário escaneia este QR Code, escolhe sua área e confirma a presença!
                                        </p>
                                    )}
                                </div>
                                <Button type="button" onClick={handlePrintQrCode} className="w-full h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
                                    <Printer className="size-4 mr-2" /> Imprimir Card de QR Code
                                </Button>
                            </div>
                        ) : (
                            <div className="border border-dashed border-slate-200 rounded-2xl p-8 bg-slate-25/10 text-center text-slate-400 text-xs">
                                Selecione a Data para gerar o QR Code.
                            </div>
                        )}
                    </div>

                    {/* Right Column: Attendance Tracker */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="border border-slate-150 rounded-2xl bg-white shadow-sm overflow-hidden">
                            <div className="bg-slate-50 px-5 py-4 border-b border-slate-150 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Calendar className="size-4.5 text-slate-500" />
                                    <span className="text-sm font-bold text-slate-800">Presença do Dia ({formattedSelectedDate})</span>
                                </div>
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Culto / Evento</TableHead>
                                        <TableHead>Equipe</TableHead>
                                        <TableHead>Voluntário</TableHead>
                                        <TableHead>Check-in</TableHead>
                                        <TableHead className="text-right">Marcar Presença</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                     {!selectedAreaId ? (
                                         <TableRow>
                                             <TableCell colSpan={5} className="h-32 text-center text-slate-500 py-8">
                                                 <div className="max-w-md mx-auto space-y-1">
                                                     <p className="font-bold text-slate-700 text-sm">⭐ Modalidade QR Code Único Geral Ativa</p>
                                                     <p className="text-xs text-slate-400">
                                                         O QR Code acima serve para <strong>TODAS AS ÁREAS DE SERVIÇO</strong> da igreja hoje.
                                                     </p>
                                                     <p className="text-[11px] text-slate-400 pt-1">
                                                         Para acompanhar os check-ins em tempo real de uma área específica na tabela abaixo, selecione-a no filtro ao lado.
                                                     </p>
                                                 </div>
                                             </TableCell>
                                         </TableRow>
                                    ) : dayScheduleItems.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-32 text-center text-slate-400 italic">
                                                Não há escala salva para a área nesta data.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        dayScheduleItems.map((item: any, idx: number) => {
                                            const hasVolunteers = item.memberIds?.length > 0;
                                            const volunteerName = hasVolunteers ? userMap.get(item.memberIds[0]) : null;
                                            const checkInKey = `${item.date}_${item.eventName}_${item.slotIndex || 0}`;
                                            const checkIn = schedule?.checkIns?.[checkInKey];

                                            return (
                                                <TableRow key={idx}>
                                                    <TableCell className="font-semibold text-slate-700">{item.eventName}</TableCell>
                                                    <TableCell>{item.teamName || '-'}</TableCell>
                                                    <TableCell className="font-medium">
                                                        {volunteerName || <span className="text-slate-400 italic">Vaga Aberta</span>}
                                                    </TableCell>
                                                    <TableCell>
                                                        {checkIn?.status === 'checked_out' ? (
                                                            <div className="space-y-1">
                                                                <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50 border-indigo-200">
                                                                    <CheckCircle className="size-3 mr-1 text-indigo-600" /> Check-out (Concluído)
                                                                </Badge>
                                                                {checkIn?.checkInTime && (
                                                                    <p className="text-[10px] text-slate-400">
                                                                        {checkIn.checkInTime} → {checkIn.checkOutTime || ''} {checkIn.durationMinutes ? `(${Math.floor(checkIn.durationMinutes / 60)}h ${checkIn.durationMinutes % 60}m)` : ''}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        ) : checkIn?.status === 'present' ? (
                                                            <div className="space-y-1">
                                                                <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200">
                                                                    <CheckCircle className="size-3 mr-1" /> Em Serviço (Presente)
                                                                </Badge>
                                                                {checkIn?.checkInTime && (
                                                                    <p className="text-[10px] text-slate-400">Entrada: {checkIn.checkInTime}</p>
                                                                )}
                                                            </div>
                                                        ) : checkIn?.status === 'absent' ? (
                                                            <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50">
                                                                <XCircle className="size-3 mr-1" /> Ausente
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-slate-400 border-slate-200">
                                                                <Clock className="size-3 mr-1" /> Sem Check-in
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {hasVolunteers ? (
                                                            <div className="flex justify-end gap-1.5">
                                                                <Button
                                                                    size="icon"
                                                                    variant="outline"
                                                                    className={`size-7 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 ${checkIn?.status === 'present' ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'text-slate-400'}`}
                                                                    onClick={() => handleManualCheckIn(item, 'present')}
                                                                    title="Presente"
                                                                >
                                                                    <CheckCircle className="size-4" />
                                                                </Button>
                                                                <Button
                                                                    size="icon"
                                                                    variant="outline"
                                                                    className={`size-7 border-red-200 hover:bg-red-50 hover:text-red-700 ${checkIn?.status === 'absent' ? 'bg-red-100 border-red-300 text-red-800' : 'text-slate-400'}`}
                                                                    onClick={() => handleManualCheckIn(item, 'absent')}
                                                                    title="Ausente"
                                                                >
                                                                    <XCircle className="size-4" />
                                                                </Button>
                                                                <Button
                                                                    size="icon"
                                                                    variant="outline"
                                                                    className="size-7 hover:bg-slate-50 text-slate-400"
                                                                    onClick={() => handleManualCheckIn(item, 'pending')}
                                                                    title="Limpar"
                                                                >
                                                                    <Clock className="size-4" />
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-slate-350">—</span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default function CheckinPanelPage() {
    return (
        <VolunteeringProvider>
            <CheckinPanelContent />
        </VolunteeringProvider>
    );
}
