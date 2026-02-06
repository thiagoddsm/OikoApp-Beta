'use client';
import React, { useMemo, useState } from 'react';
import { Calendar, momentLocalizer, View, Views } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/pt-br';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useVolunteering, type RoomReservation } from '@/contexts/volunteering-context';
import { Loader2 } from 'lucide-react';
import { Card } from '../ui/card';

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
        const limitDate = moment().add(6, 'months');
        
        // Define o limite real da recorrência
        let recurrenceStop = res.recurrenceEndDate?.toDate ? res.recurrenceEndDate.toDate() : limitDate.toDate();
        if (recurrenceStop > limitDate.toDate()) recurrenceStop = limitDate.toDate();

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

        // --- LÓGICA DE EXPANSÃO DE RECORRÊNCIA ---
        let current = moment(baseStart);
        const targetDay = res.dayOfWeek ? weekDayMap[res.dayOfWeek] : -1;

        // Limite de segurança para evitar loops infinitos (máximo 100 ocorrências por reserva)
        let safeCounter = 0;

        while (current.isBefore(moment(recurrenceStop).endOf('day')) && safeCounter < 100) {
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
                    
                    const matchesWeek = (res.weekOfMonth === 'last' && isLastWeek) || 
                                      (week.toString() === res.weekOfMonth);
                    
                    if (matchesWeek && current.day() === targetDay) shouldAdd = true;
                } else {
                    if (current.date() === moment(baseStart).date()) shouldAdd = true;
                }
            }

            if (shouldAdd) {
                const occStart = current.toDate();
                // O fim da sessão deve ser no mesmo dia da ocorrência calculada
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

  const handleNavigate = (newDate: Date) => setDate(newDate);
  const handleViewChange = (newView: View) => setView(newView);

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
