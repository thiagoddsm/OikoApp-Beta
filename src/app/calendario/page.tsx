'use client';
import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { VolunteeringProvider, useVolunteering, type RoomReservation } from '@/contexts/volunteering-context';
import { CalendarClock, Search, X, ChevronDown, Check, MapPin, Tag, Clock, CalendarDays, CheckCircle2, XCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { PublicNavbar } from '@/components/public/navbar';
import { PublicFooter } from '@/components/public/footer';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import moment from 'moment';

const ReservationsCalendar = dynamic(
    () => import('@/components/volunteering/reservations-calendar').then(mod => mod.ReservationsCalendar),
    { 
        ssr: false,
        loading: () => (
             <div className="flex items-center justify-center p-8 h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }
);

function PublicCalendarContent() {
    const { rooms, reservationCategories, users } = useVolunteering();
    const [selectedReservation, setSelectedReservation] = useState<any>(null);
    const [isDetailsOpen, setDetailsOpen] = useState(false);
    
    // Estados de Filtro
    const [searchTerm, setSearchTerm] = useState('');
    const [roomFilter, setRoomFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState<string[]>([]); // [] = todas

    const handleEventClick = (res: any) => {
        setSelectedReservation(res);
        setDetailsOpen(true);
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setRoomFilter('all');
        setCategoryFilter([]);
    };

    const toggleCategory = (catId: string) => {
        setCategoryFilter(prev =>
            prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
        );
    };

    const hasActiveFilters = searchTerm !== '' || roomFilter !== 'all' || categoryFilter.length > 0;

    const categoryLabel = categoryFilter.length === 0
        ? 'Todas Categorias'
        : categoryFilter.length === 1
            ? reservationCategories.find(c => c.id === categoryFilter[0])?.name ?? '1 categoria'
            : `${categoryFilter.length} categorias`;

    const userMap = useMemo(() => new Map(users?.map(u => [u.id, u.name]) || []), [users]);
    const categoryMap = useMemo(() => new Map(reservationCategories?.map(c => [c.id, c.name]) || []), [reservationCategories]);

    const formattedEventTime = useMemo(() => {
        if (!selectedReservation) return '';
        try {
            const start = selectedReservation.startDateTime?.toDate ? selectedReservation.startDateTime.toDate() :
                         (selectedReservation.startDateTime instanceof Date ? selectedReservation.startDateTime : null);
            const end = selectedReservation.endDateTime?.toDate ? selectedReservation.endDateTime.toDate() :
                       (selectedReservation.endDateTime instanceof Date ? selectedReservation.endDateTime : null);
            
            if (selectedReservation.isStrategicEvent) {
                // Eventos estratégicos já possuem campos strings formatados
                const startStr = selectedReservation.startDate;
                const endStr = selectedReservation.endDate || selectedReservation.startDate;
                const timeStart = selectedReservation.timeStart || '00:00';
                const timeEnd = selectedReservation.timeEnd || '23:59';
                return `${moment(startStr).format('DD/MM/YYYY')} às ${timeStart} até ${moment(endStr).format('DD/MM/YYYY')} às ${timeEnd}`;
            }

            if (!start || !end) return '';
            
            const startStr = moment(start).format('DD/MM/YYYY [às] HH:mm');
            const endStr = moment(end).format(moment(start).isSame(end, 'day') ? 'HH:mm' : 'DD/MM/YYYY [às] HH:mm');
            
            return `${startStr} até ${endStr}`;
        } catch (e) {
            return '';
        }
    }, [selectedReservation]);

    return (
        <div className="flex-1 bg-slate-50/50 py-10">
            <div className="container mx-auto px-4 max-w-7xl space-y-6">
                
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-primary font-bold text-sm tracking-wider uppercase mb-1">
                            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                            Visualização Pública
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-slate-900 leading-none flex items-center gap-2">
                            <CalendarClock className="size-8 text-primary" />
                            Calendário de Eventos & Reservas
                        </h1>
                        <p className="text-muted-foreground mt-2 max-w-2xl text-sm md:text-base">
                            Consulte a agenda geral de cultos, eventos estratégicos e reservas de ambientes da igreja. 
                        </p>
                    </div>
                </header>

                <Card className="border-2 shadow-sm bg-white overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b pb-4">
                        <div className="flex flex-col gap-2">
                            <span className="text-xs font-bold uppercase text-muted-foreground">Filtros de Pesquisa</span>
                            {/* Barra de Filtros */}
                            <div className="flex flex-wrap items-end gap-3">
                                <div className="flex-1 min-w-[200px] space-y-1">
                                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Pesquisar</label>
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input 
                                            placeholder="Nome do evento..." 
                                            className="pl-8 bg-background"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="w-[180px] space-y-1">
                                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Ambiente</label>
                                    <Select value={roomFilter} onValueChange={setRoomFilter}>
                                        <SelectTrigger className="bg-background">
                                            <SelectValue placeholder="Todos Ambientes" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos Ambientes</SelectItem>
                                            {rooms.map(room => (
                                                <SelectItem key={room.id} value={room.name}>{room.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Filtro de Categorias */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Categorias</label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    "bg-background min-w-[180px] justify-between font-normal",
                                                    categoryFilter.length > 0 && "border-primary text-primary"
                                                )}
                                            >
                                                <span className="truncate">{categoryLabel}</span>
                                                <div className="flex items-center gap-1 ml-2 shrink-0">
                                                    {categoryFilter.length > 0 && (
                                                        <Badge className="h-5 px-1.5 text-[10px] font-black">
                                                            {categoryFilter.length}
                                                        </Badge>
                                                    )}
                                                    <ChevronDown className="h-4 w-4 opacity-50" />
                                                </div>
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-56 p-2" align="start">
                                            <div className="space-y-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setCategoryFilter([])}
                                                    className={cn(
                                                        "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted transition-colors",
                                                        categoryFilter.length === 0 && "font-bold text-primary bg-primary/5"
                                                    )}
                                                >
                                                    <Check className={cn("h-4 w-4", categoryFilter.length !== 0 && "opacity-0")} />
                                                    Todas as Categorias
                                                </button>

                                                <div className="border-t my-1" />

                                                {reservationCategories.map(cat => (
                                                    <label
                                                        key={cat.id}
                                                        className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer transition-colors"
                                                    >
                                                        <Checkbox
                                                            checked={categoryFilter.includes(cat.id)}
                                                            onCheckedChange={() => toggleCategory(cat.id)}
                                                            id={`cat-${cat.id}`}
                                                        />
                                                        <span className="text-sm">{cat.name}</span>
                                                        {cat.color && (
                                                            <span
                                                                className="ml-auto h-3 w-3 rounded-full shrink-0"
                                                                style={{ backgroundColor: cat.color }}
                                                            />
                                                        )}
                                                    </label>
                                                ))}
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                {hasActiveFilters && (
                                    <Button variant="ghost" size="icon" onClick={handleClearFilters} className="h-10 w-10 text-muted-foreground hover:text-destructive" title="Limpar Filtros">
                                        <X className="size-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4">
                        <ReservationsCalendar 
                            onEventClick={handleEventClick} 
                            searchTerm={searchTerm}
                            roomFilter={roomFilter}
                            categoryFilter={categoryFilter}
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Read-Only Details Dialog */}
            <Dialog open={isDetailsOpen} onOpenChange={setDetailsOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider mb-1">
                            <Info className="size-3.5" />
                            Detalhes do Evento
                        </div>
                        <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter text-slate-900 leading-tight">
                            {selectedReservation?.eventName}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Este é um link público de visualização. Edições não são permitidas.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedReservation && (
                        <div className="space-y-4 py-4 border-y my-2 text-sm text-slate-700">
                            {/* Período/Data */}
                            <div className="flex gap-3">
                                <Clock className="size-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div className="space-y-0.5">
                                    <span className="text-[10px] font-black uppercase text-muted-foreground block">Data e Horário</span>
                                    <span className="font-semibold text-slate-800">{formattedEventTime}</span>
                                    {selectedReservation.frequency && selectedReservation.frequency !== 'pontual' && (
                                        <span className="block text-xs text-blue-600 font-medium">
                                            Recorrência: {selectedReservation.frequency} 
                                            {selectedReservation.dayOfWeek ? ` (${selectedReservation.dayOfWeek})` : ''}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Ambientes */}
                            <div className="flex gap-3">
                                <MapPin className="size-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div className="space-y-0.5">
                                    <span className="text-[10px] font-black uppercase text-muted-foreground block">Espaço / Ambientes</span>
                                    <span className="font-semibold text-slate-800">
                                        {selectedReservation.rooms?.join(', ') || 'Nenhum ambiente selecionado'}
                                    </span>
                                </div>
                            </div>

                            {/* Categoria */}
                            {selectedReservation.categoryId && (
                                <div className="flex gap-3">
                                    <Tag className="size-5 text-muted-foreground shrink-0 mt-0.5" />
                                    <div className="space-y-0.5">
                                        <span className="text-[10px] font-black uppercase text-muted-foreground block">Categoria</span>
                                        <Badge variant="outline" className="mt-1 bg-slate-50 text-slate-700 border-slate-200">
                                            {categoryMap.get(selectedReservation.categoryId) || 'Categoria Geral'}
                                        </Badge>
                                    </div>
                                </div>
                            )}

                            {/* Tipo Especial (Ensinos / Eventos Estratégicos) */}
                            {selectedReservation.isStrategicEvent && (
                                <div className="flex gap-3">
                                    <span className="size-5 text-center leading-none mt-0.5">⭐</span>
                                    <div className="space-y-0.5">
                                        <span className="text-[10px] font-black uppercase text-muted-foreground block">Tipo</span>
                                        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block">
                                            Evento Estratégico da Igreja
                                        </span>
                                    </div>
                                </div>
                            )}
                            {selectedReservation.id?.startsWith('class_res_') && (
                                <div className="flex gap-3">
                                    <span className="size-5 text-center leading-none mt-0.5">📚</span>
                                    <div className="space-y-0.5">
                                        <span className="text-[10px] font-black uppercase text-muted-foreground block">Tipo</span>
                                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 inline-block">
                                            Aula / Ensino Acadêmico
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Descrição */}
                            {selectedReservation.description && (
                                <div className="space-y-1.5 pt-2 border-t border-dashed">
                                    <span className="text-[10px] font-black uppercase text-muted-foreground block">Descrição / Observações</span>
                                    <p className="text-xs leading-relaxed text-slate-600 whitespace-pre-wrap bg-slate-50 p-2.5 rounded-lg border">
                                        {selectedReservation.description}
                                    </p>
                                </div>
                            )}

                            {/* Status */}
                            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border mt-2">
                                <div className="space-y-0.5">
                                    <span className="text-[9px] font-black uppercase text-muted-foreground block">Status da Reserva</span>
                                    <span className="text-xs font-semibold text-slate-700">
                                        {selectedReservation.status === 'approved' ? 'Aprovada e Confirmada' : 'Aguardando Aprovação'}
                                    </span>
                                </div>
                                <Badge variant="outline" className={cn(
                                    "border text-[11px] px-2 py-0.5 font-bold",
                                    selectedReservation.status === 'approved'
                                        ? "bg-green-50 text-green-700 border-green-200"
                                        : "bg-yellow-50 text-yellow-700 border-yellow-200"
                                )}>
                                    {selectedReservation.status === 'approved' ? <CheckCircle2 className="size-3 mr-1 inline" /> : <Clock className="size-3 mr-1 inline" />}
                                    {selectedReservation.status === 'approved' ? 'Confirmado' : 'Pendente'}
                                </Badge>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDetailsOpen(false)} className="w-full sm:w-auto font-bold">
                            Fechar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function PublicCalendarPage() {
    return (
        <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
            <PublicNavbar />
            <VolunteeringProvider>
                <PublicCalendarContent />
            </VolunteeringProvider>
            <PublicFooter />
        </div>
    );
}
