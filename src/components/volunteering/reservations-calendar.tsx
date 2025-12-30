'use client';
import React, { useMemo } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/pt-br';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useVolunteering, type RoomReservation } from '@/contexts/volunteering-context';
import { Loader2 } from 'lucide-react';
import { Card } from '../ui/card';

// Setup the localizer by providing the moment Object
// to the correct localizer.
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
    return reservations.map(res => ({
      id: res.id,
      title: `${res.eventName} (${res.room})`,
      start: res.startDateTime.toDate(),
      end: res.endDateTime.toDate(),
      resource: res, // Keep original object for tooltips, etc.
    }));
  }, [reservations]);
  
  const eventStyleGetter = (event, start, end, isSelected) => {
    const style = {
        backgroundColor: statusColors[event.resource.status] || '#6B7280', // gray-500 for default
        borderRadius: '5px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '0.8em',
        padding: '2px 5px',
    };
    return {
        style: style
    };
  };
  
   const components = useMemo(() => ({
    event: ({ event }) => {
      const status = event.resource.status;
      return (
        <div>
          <strong>{event.title}</strong>
          <p className="capitalize text-xs opacity-90">{status}</p>
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
    <Card className="p-4 h-[75vh] w-full">
        <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
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
            }}
            components={components}
        />
    </Card>
  );
}
