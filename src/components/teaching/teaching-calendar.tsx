
'use client';
import React, { useMemo, useState } from 'react';
import { Calendar, momentLocalizer, View, Views } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/pt-br';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useVolunteering, type RoomReservation } from '@/contexts/volunteering-context';
import { Loader2, GraduationCap, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';

moment.locale('pt-br');
const localizer = momentLocalizer(moment);

const weekDayMap: Record<string, number> = {
    "Domingo": 0,
    "Segunda-feira": 1,
    "Terça-feira": 2,
    "Quarta-feira": 3,
    "Quinta-feira": 4,
    "Sexta-feira": 5,
    "Sábado": 6
};

interface TeachingCalendarProps {
    onEventClick?: (res: RoomReservation) => void;
}

export function TeachingCalendar({ onEventClick }: TeachingCalendarProps) {
  const { reservations, isLoading } = useVolunteering();
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<View>(Views.MONTH);

  const events = useMemo(() => {
    if (!reservations || !Array.isArray(reservations)) return [];
    
    // FILTRO: Apenas reservas que são turmas/ensino
    const teachingReservations = reservations.filter(res => res.id.startsWith('class_res_'));
    
    const allOccurrences: any[] = [];

    teachingReservations.forEach(res => {
      try {
        const baseStart = res.startDateTime?.toDate ? res.startDateTime.toDate() : 
                         (res.startDateTime instanceof Date ? res.startDateTime : null);
        const baseEnd = res.endDateTime?.toDate ? res.endDateTime.toDate() : 
                       (res.endDateTime instanceof Date ? res.endDateTime : null);

        if (!baseStart || !baseEnd || isNaN(baseStart.getTime())) return;

        const duration = baseEnd.getTime() - baseStart.getTime();
        const limitDate = moment().add(6, 'months');
        
        let recurrenceStop = res.recurrenceEndDate?.toDate ? res.recurrenceEndDate.toDate() : 
                            (res.recurrenceEndDate instanceof Date ? res.recurrenceEndDate : limitDate.toDate());
        
        if (moment(recurrenceStop).isAfter(limitDate)) {
            recurrenceStop = limitDate.toDate();
        }

        if (!res.frequency || res.frequency === 'pontual') {
          allOccurrences.push({
            id: res.id,
            title: res.eventName,
            start: baseStart,
            end: baseEnd,
            resource: res,
          });
          return;
        }

        let current = moment(baseStart);
        const targetDay = res.dayOfWeek ? weekDayMap[res.dayOfWeek] : -1;
        let safeCounter = 0;

        while (current.isSameOrBefore(moment(recurrenceStop), 'day') && safeCounter < 100) {
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
                    title: res.eventName,
                    start: occStart,
                    end: occEnd,
                    resource: res,
                });
            }
            current.add(1, 'day'); 
        }
      } catch (e) {
        console.error("Erro ao expandir recorrência no ensino:", e, res);
      }
    });

    return allOccurrences;
  }, [reservations]);
  
  const eventStyleGetter = () => {
    return {
        style: {
            backgroundColor: '#6366f1', // indigo-500
            borderRadius: '6px',
            opacity: 0.9,
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
    event: ({ event }: any) => (
      <div className="overflow-hidden h-full flex flex-col justify-center">
        <div className="font-bold flex items-center gap-1 truncate text-[11px]">
          <GraduationCap className="size-3 shrink-0" />
          {event.title.replace('Turma: ', '')}
        </div>
        <div className="text-[9px] opacity-80 truncate">
          {event.resource?.rooms?.[0] || 'IBM'}
        </div>
      </div>
    )
  }), []);

  if (isLoading) {
    return (
        <div className="flex items-center justify-center p-8 h-[70vh]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <Card className="p-4 h-[75vh] w-full overflow-hidden shadow-lg bg-white">
        <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            date={date}
            view={view}
            onNavigate={setDate}
            onView={setView}
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
                event: "Aula/Turma",
                noEventsInRange: "Sem aulas neste período.",
                showMore: (total) => `+ Ver mais (${total})`
            }}
            components={components}
        />
    </Card>
  );
}
