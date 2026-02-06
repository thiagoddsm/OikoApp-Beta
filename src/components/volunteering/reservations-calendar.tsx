'use client';
import React, { useMemo, useState } from 'react';
import { Calendar, momentLocalizer, View, Views } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/pt-br';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useVolunteering, type RoomReservation } from '@/contexts/volunteering-context';
import { Loader2, AlertCircle } from 'lucide-react';
import { Card } from '../ui/card';

// Configura o localizador do Moment.js para Português Brasil
moment.locale('pt-br');
const localizer = momentLocalizer(moment);

const statusColors = {
    approved: '#10B981', // green-500
    pending: '#F59E0B',  // amber-500
    rejected: '#EF4444', // red-500
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

export function ReservationsCalendar() {
  const { reservations, isLoading } = useVolunteering();
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<View>(Views.MONTH);

  const events = useMemo(() => {
    if (!reservations || !Array.isArray(reservations)) return [];
    
    const allOccurrences: any[] = [];

    reservations.forEach(res => {
      try {
        const baseStart = res.startDateTime?.toDate ? res.startDateTime.toDate() : 
                         (res.startDateTime instanceof Date ? res.startDateTime : null);
        const baseEnd = res.endDateTime?.toDate ? res.endDateTime.toDate() : 
                       (res.endDateTime instanceof Date ? res.endDateTime : null);

        if (!baseStart || !baseEnd || isNaN(baseStart.getTime())) return;

        const duration = baseEnd.getTime() - baseStart.getTime();

        // Se for pontual, adiciona apenas uma vez
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

        // Para eventos recorrentes, expandimos as ocorrências
        // Vamos expandir por até 1 ano a partir do início ou até a data final definida
        const limitDate = moment().add(1, 'year');
        const recurrenceEnd = res.endDateTime?.toDate ? moment(res.endDateTime.toDate()) : limitDate;
        const actualEndLimit = moment.min(limitDate, recurrenceEnd);

        let current = moment(baseStart);

        if (res.frequency === 'semanal' && res.dayOfWeek) {
          const targetDay = weekDayMap[res.dayOfWeek];
          // Ajusta para o primeiro dia válido
          while (current.day() !== targetDay) {
            current.add(1, 'day');
          }

          while (current.isBefore(actualEndLimit)) {
            const occStart = current.toDate();
            const occEnd = new Date(occStart.getTime() + duration);
            
            allOccurrences.push({
              id: `${res.id}_${occStart.getTime()}`,
              title: `${res.eventName} (${res.rooms?.join(', ') || 'N/A'})`,
              start: occStart,
              end: occEnd,
              resource: res,
            });
            current.add(1, 'week');
          }
        } else if (res.frequency === 'quinzenal') {
           while (current.isBefore(actualEndLimit)) {
            const occStart = current.toDate();
            const occEnd = new Date(occStart.getTime() + duration);
            
            allOccurrences.push({
              id: `${res.id}_${occStart.getTime()}`,
              title: `${res.eventName} (${res.rooms?.join(', ') || 'N/A'})`,
              start: occStart,
              end: occEnd,
              resource: res,
            });
            current.add(2, 'weeks');
          }
        } else if (res.frequency === 'mensal') {
            // Lógica simplificada para mensal (mesma data todo mês)
            while (current.isBefore(actualEndLimit)) {
                const occStart = current.toDate();
                const occEnd = new Date(occStart.getTime() + duration);
                
                allOccurrences.push({
                  id: `${res.id}_${occStart.getTime()}`,
                  title: `${res.eventName} (${res.rooms?.join(', ') || 'N/A'})`,
                  start: occStart,
                  end: occEnd,
                  resource: res,
                });
                current.add(1, 'month');
            }
        }

      } catch (e) {
        console.error("Erro ao expandir recorrência:", e, res);
      }
    });

    return allOccurrences;
  }, [reservations]);
  
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
        }
    };
  };
  
  const components = useMemo(() => ({
    event: ({ event }: any) => {
      const isClass = event.id?.toString().includes('class_res_');
      const isRecurring = event.resource?.frequency && event.resource?.frequency !== 'pontual';
      
      return (
        <div className="overflow-hidden">
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

  const handleNavigate = (newDate: Date) => {
    setDate(newDate);
  };

  const handleViewChange = (newView: View) => {
    setView(newView);
  };

  if (isLoading) {
    return (
        <div className="flex items-center justify-center p-8 h-[70vh]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <Card className="p-4 h-[75vh] w-full overflow-hidden shadow-inner bg-slate-50/30">
        <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            date={date}
            view={view}
            onNavigate={handleNavigate}
            onView={handleViewChange}
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
  );
}
