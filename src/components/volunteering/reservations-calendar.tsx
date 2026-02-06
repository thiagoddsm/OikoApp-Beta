
'use client';
import React, { useMemo } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
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

export function ReservationsCalendar() {
  const { reservations, isLoading } = useVolunteering();

  const events = useMemo(() => {
    if (!reservations) return [];
    
    return reservations.map(res => {
      try {
        // Garante que temos objetos de data válidos para o calendário
        const startDate = res.startDateTime?.toDate ? res.startDateTime.toDate() : null;
        const endDate = res.endDateTime?.toDate ? res.endDateTime.toDate() : null;

        if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return null;
        }

        return {
          id: res.id,
          title: `${res.eventName} (${res.rooms?.join(', ') || 'N/A'})`,
          start: startDate,
          end: endDate,
          resource: res,
        };
      } catch (e) {
        console.error("Erro ao formatar evento para o calendário:", e, res);
        return null;
      }
    }).filter(event => event !== null);
  }, [reservations]);
  
  const eventStyleGetter = (event: any) => {
    const status = event.resource?.status || 'pending';
    const style = {
        backgroundColor: statusColors[status as keyof typeof statusColors] || '#6B7280',
        borderRadius: '6px',
        opacity: 0.85,
        color: 'white',
        border: 'none',
        display: 'block',
        fontSize: '0.75rem',
        padding: '2px 6px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
    };
    return {
        style: style
    };
  };
  
  const components = useMemo(() => ({
    event: ({ event }: any) => {
      const isClass = event.id?.startsWith('class_res_');
      return (
        <div className="overflow-hidden">
          <div className="font-bold flex items-center gap-1 truncate">
            {isClass && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
            {event.title}
          </div>
          <div className="text-[10px] opacity-80 uppercase font-black truncate">
            {event.resource?.status === 'approved' ? 'Confirmado' : 'Pendente'}
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

  if (reservations.length === 0) {
      return (
          <Card className="flex flex-col items-center justify-center p-12 h-[75vh] border-dashed">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">Nenhuma reserva para exibir</h3>
              <p className="text-sm text-muted-foreground text-center max-w-xs">
                  O calendário está vazio. Crie uma nova reserva ou verifique se as turmas possuem salas atribuídas.
              </p>
          </Card>
      )
  }

  return (
    <Card className="p-4 h-[75vh] w-full overflow-hidden shadow-inner bg-slate-50/30">
        <Calendar
            localizer={localizer}
            events={events as any}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            eventPropGetter={eventStyleGetter}
            onSelectEvent={(event) => console.log("Evento selecionado:", event)}
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
