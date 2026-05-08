'use client';
import React, { useMemo, useState } from 'react';
import { Calendar, momentLocalizer, View, Views } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/pt-br';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useVolunteering, type RoomReservation } from '@/contexts/volunteering-context';
import { Loader2, CalendarDays, List, CheckCircle2, Clock, RefreshCw, MapPin, Tag } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

moment.locale('pt-br');
const localizer = momentLocalizer(moment);

const statusColors = {
    approved: '#10B981',
    pending: '#F59E0B',
    rejected: '#EF4444',
};

const weekDayMap: Record<string, number> = {
    "Domingo": 0,
    "Segunda-feira": 1,
    "Terça-feira": 2,
    "Quarta-feira": 3,
    "Quinta-feira": 4,
    "Sexta-feira": 5,
    "Sábado": 6
};

interface ReservationsCalendarProps {
    onEventClick?: (res: RoomReservation) => void;
    searchTerm?: string;
    roomFilter?: string;
    categoryFilter?: string;
}

// ─── Componente de visualização em Lista ────────────────────────────────────
function EventListView({ events, onEventClick, reservationCategories }: { events: any[], onEventClick?: (res: RoomReservation) => void, reservationCategories: any[] }) {
    const categoryMap = useMemo(() => new Map(reservationCategories.map(c => [c.id, c.name])), [reservationCategories]);

    // Agrupar por mês
    const grouped = useMemo(() => {
        const map = new Map<string, any[]>();
        const sorted = [...events].sort((a, b) => a.start - b.start);
        sorted.forEach(ev => {
            const key = format(ev.start, 'MMMM yyyy', { locale: ptBR });
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(ev);
        });
        return Array.from(map.entries());
    }, [events]);

    if (grouped.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
                <CalendarDays className="size-12 opacity-20" />
                <p className="text-sm font-medium">Nenhum evento encontrado para os filtros aplicados.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {grouped.map(([month, evts]) => (
                <div key={month}>
                    {/* Cabeçalho do mês */}
                    <div className="flex items-center gap-3 mb-3">
                        <div className="h-px flex-1 bg-border" />
                        <span className="text-xs font-black uppercase tracking-widest text-muted-foreground px-2 capitalize">
                            {month}
                        </span>
                        <div className="h-px flex-1 bg-border" />
                    </div>

                    {/* Eventos do mês */}
                    <div className="space-y-2">
                        {evts.map((ev, idx) => {
                            const res: RoomReservation = ev.resource;
                            const isApproved = res.status === 'approved';
                            const isRecurring = res.frequency && res.frequency !== 'pontual';
                            const categoryName = res.categoryId ? categoryMap.get(res.categoryId) : null;

                            return (
                                <button
                                    key={`${ev.id}_${idx}`}
                                    onClick={() => onEventClick?.(res)}
                                    className={cn(
                                        "w-full text-left flex items-stretch gap-0 rounded-xl border overflow-hidden",
                                        "hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group",
                                        isApproved ? "border-emerald-200 bg-emerald-50/40" : "border-amber-200 bg-amber-50/30"
                                    )}
                                >
                                    {/* Coluna de data */}
                                    <div className={cn(
                                        "flex flex-col items-center justify-center px-4 py-3 min-w-[60px] text-white font-black",
                                        isApproved ? "bg-emerald-500" : "bg-amber-500"
                                    )}>
                                        <span className="text-2xl leading-none">{format(ev.start, 'dd')}</span>
                                        <span className="text-[10px] uppercase tracking-wider opacity-80">{format(ev.start, 'EEE', { locale: ptBR })}</span>
                                    </div>

                                    {/* Conteúdo */}
                                    <div className="flex-1 px-4 py-3 flex items-center justify-between gap-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-bold text-slate-800 text-sm group-hover:text-primary transition-colors">
                                                {res.eventName}
                                            </span>
                                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                {res.rooms && res.rooms.length > 0 && (
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="size-3" />
                                                        {res.rooms.join(', ')}
                                                    </span>
                                                )}
                                                {format(ev.start, 'HH:mm')} – {format(ev.end, 'HH:mm')}
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "text-[10px] h-5 border",
                                                    isApproved
                                                        ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                                        : "bg-amber-100 text-amber-700 border-amber-200"
                                                )}
                                            >
                                                {isApproved ? <CheckCircle2 className="size-3 mr-1" /> : <Clock className="size-3 mr-1" />}
                                                {isApproved ? 'Confirmado' : 'Pendente'}
                                            </Badge>
                                            <div className="flex items-center gap-1">
                                                {categoryName && (
                                                    <Badge variant="outline" className="text-[10px] h-5 bg-slate-100 text-slate-600 border-slate-200">
                                                        <Tag className="size-2.5 mr-1" />
                                                        {categoryName}
                                                    </Badge>
                                                )}
                                                {isRecurring && (
                                                    <Badge variant="outline" className="text-[10px] h-5 bg-blue-50 text-blue-600 border-blue-200">
                                                        <RefreshCw className="size-2.5 mr-1" />
                                                        {res.frequency}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Componente principal ────────────────────────────────────────────────────
export function ReservationsCalendar({
    onEventClick,
    searchTerm = '',
    roomFilter = 'all',
    categoryFilter = 'all'
}: ReservationsCalendarProps) {
  const { reservations, reservationCategories, isLoading } = useVolunteering();
  const [date, setDate] = useState(new Date());
  const [calView, setCalView] = useState<View>(Views.MONTH);
  const [displayMode, setDisplayMode] = useState<'calendar' | 'list'>('calendar');

  const events = useMemo(() => {
    if (!reservations || !Array.isArray(reservations)) return [];

    const filteredBase = reservations.filter(res => {
        if (categoryFilter !== 'all' && res.categoryId !== categoryFilter) return false;
        if (roomFilter !== 'all' && !res.rooms?.includes(roomFilter)) return false;
        if (searchTerm && !res.eventName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
    });

    const allOccurrences: any[] = [];

    filteredBase.forEach(res => {
      try {
        const baseStart = res.startDateTime?.toDate ? res.startDateTime.toDate() :
                         (res.startDateTime instanceof Date ? res.startDateTime : null);
        const baseEnd = res.endDateTime?.toDate ? res.endDateTime.toDate() :
                       (res.endDateTime instanceof Date ? res.endDateTime : null);

        if (!baseStart || !baseEnd || isNaN(baseStart.getTime())) return;

        const duration = baseEnd.getTime() - baseStart.getTime();
        const limitDate = moment().add(24, 'months');

        let recurrenceStop = res.recurrenceEndDate?.toDate ? res.recurrenceEndDate.toDate() :
                            (res.recurrenceEndDate instanceof Date ? res.recurrenceEndDate : limitDate.toDate());

        if (moment(recurrenceStop).isAfter(limitDate)) {
            recurrenceStop = limitDate.toDate();
        }

        if (!res.frequency || res.frequency === 'pontual') {
          allOccurrences.push({
            id: res.id,
            title: `${res.eventName} (${res.rooms?.join(', ') || 'N/A'})`,
            start: baseStart,
            end: baseEnd,
            resource: res,
          });
          return;
        }

        let current = moment(baseStart);
        const targetDay = res.dayOfWeek ? weekDayMap[res.dayOfWeek] : -1;
        let safeCounter = 0;

        while (current.isSameOrBefore(moment(recurrenceStop), 'day') && safeCounter < 200) {
            safeCounter++;
            let shouldAdd = false;

            if (res.frequency === 'semanal') {
                if (targetDay === -1 || current.day() === targetDay) shouldAdd = true;
            } else if (res.frequency === 'quinzenal') {
                const diffWeeks = current.diff(moment(baseStart), 'weeks');
                if (diffWeeks % 2 === 0 && (targetDay === -1 || current.day() === targetDay)) shouldAdd = true;
            } else if (res.frequency === 'mensal') {
                if (res.weekOfMonth) {
                    const week = Math.ceil(current.date() / 7);
                    const isLastWeek = current.date() > (moment(current).endOf('month').date() - 7);
                    const matchesWeek = (res.weekOfMonth === 'last' && isLastWeek) || (week.toString() === res.weekOfMonth);
                    if (matchesWeek && current.day() === targetDay) shouldAdd = true;
                } else {
                    if (current.date() === moment(baseStart).date()) shouldAdd = true;
                }
            }

            if (shouldAdd) {
                const occStart = current.toDate();
                const occEnd = new Date(occStart.getTime() + duration);

                allOccurrences.push({
                    id: `${res.id}_${occStart.getTime()}`,
                    title: `${res.eventName} (${res.rooms?.join(', ') || 'N/A'})`,
                    start: occStart,
                    end: occEnd,
                    resource: res,
                });
            }
            current.add(1, 'day');
        }
      } catch (e) {
        console.error("Erro ao expandir recorrência no calendário global:", e, res);
      }
    });

    return allOccurrences;
  }, [reservations, searchTerm, roomFilter, categoryFilter]);

  const eventStyleGetter = (event: any) => {
    const status = event.resource?.status || 'pending';
    return {
        style: {
            backgroundColor: statusColors[status as keyof typeof statusColors] || '#6B7280',
            borderRadius: '6px',
            opacity: 0.85,
            color: 'white',
            border: 'none',
            display: 'block',
            fontSize: '0.75rem',
            padding: '2px 6px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
            cursor: 'pointer'
        }
    };
  };

  const components = useMemo(() => ({
    event: ({ event }: any) => {
      const isClass = event.id?.toString().includes('class_res_');
      const isRecurring = event.resource?.frequency && event.resource?.frequency !== 'pontual';

      return (
        <div className="overflow-hidden h-full">
          <div className="font-bold flex items-center gap-1 truncate">
            {isClass && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
            {event.title}
          </div>
          <div className="text-[10px] opacity-80 uppercase font-black truncate flex items-center gap-1">
            {event.resource?.status === 'approved' ? 'Confirmado' : 'Pendente'}
            {isRecurring && <span className="ml-1">🔄</span>}
          </div>
        </div>
      );
    }
  }), []);

  if (isLoading) {
    return (
        <div className="flex items-center justify-center p-8 h-[70vh]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="space-y-4">
        {/* Toggle de visualização */}
        <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
                <span className="font-bold text-slate-700">{events.length}</span> ocorrência(s) encontrada(s)
            </p>
            <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
                <Button
                    variant={displayMode === 'calendar' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setDisplayMode('calendar')}
                    className="h-8 gap-2"
                >
                    <CalendarDays className="size-4" />
                    <span className="hidden sm:inline">Calendário</span>
                </Button>
                <Button
                    variant={displayMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setDisplayMode('list')}
                    className="h-8 gap-2"
                >
                    <List className="size-4" />
                    <span className="hidden sm:inline">Lista</span>
                </Button>
            </div>
        </div>

        {/* Visualização de Calendário */}
        {displayMode === 'calendar' && (
            <Card className="p-4 h-[72vh] w-full overflow-hidden shadow-inner bg-slate-50/30">
                <Calendar
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '100%' }}
                    date={date}
                    view={calView}
                    onNavigate={setDate}
                    onView={setCalView}
                    onSelectEvent={(event) => onEventClick?.(event.resource)}
                    eventPropGetter={eventStyleGetter}
                    messages={{
                        next: "Próximo",
                        previous: "Anterior",
                        today: "Hoje",
                        month: "Mês",
                        week: "Semana",
                        day: "Dia",
                        agenda: "Agenda",
                        date: "Data",
                        time: "Hora",
                        event: "Evento",
                        noEventsInRange: "Não há eventos neste período.",
                        showMore: (total) => `+ Ver mais (${total})`
                    }}
                    components={components}
                />
            </Card>
        )}

        {/* Visualização de Lista */}
        {displayMode === 'list' && (
            <div className="min-h-[40vh]">
                <EventListView
                    events={events}
                    onEventClick={onEventClick}
                    reservationCategories={reservationCategories}
                />
            </div>
        )}
    </div>
  );
}
