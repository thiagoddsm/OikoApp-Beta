'use client';
import React, { useMemo, useState } from 'react';
import { Calendar, momentLocalizer, View, Views } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/pt-br';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useVolunteering, type Class } from '@/contexts/volunteering-context';
import { Loader2, GraduationCap } from 'lucide-react';
import { Card } from '../ui/card';

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
    onEventClick?: (cls: Class) => void;
}

export function TeachingCalendar({ onEventClick }: TeachingCalendarProps) {
  const { classes, courses, rooms, isLoading } = useVolunteering();
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<View>(Views.MONTH);

  const courseMap = useMemo(() => new Map(courses.map(c => [c.id, c.name])), [courses]);
  const roomMap = useMemo(() => new Map(rooms.map(r => [r.id, r.name])), [rooms]);

  const events = useMemo(() => {
    if (!classes || !Array.isArray(classes)) return [];
    
    const allOccurrences: any[] = [];

    classes.forEach(cls => {
      try {
        if (!cls.startDate || !cls.startTime) return;

        // Horários base
        const baseStart = new Date(`${cls.startDate}T${cls.startTime}`);
        const baseEnd = new Date(`${cls.startDate}T${cls.endTime || cls.startTime}`);

        if (isNaN(baseStart.getTime())) return;

        const duration = baseEnd.getTime() - baseStart.getTime();
        
        // Limite de visualização futura (2 anos para permitir planejamento de longo prazo)
        const limitDate = moment().add(24, 'months');
        
        // Define o limite real da recorrência respeitando a data de término da turma
        let recurrenceStop = cls.endDate ? new Date(`${cls.endDate}T23:59:59`) : limitDate.toDate();
        
        if (moment(recurrenceStop).isAfter(limitDate)) {
            recurrenceStop = limitDate.toDate();
        }

        // Se for pontual, adiciona apenas uma vez
        if (!cls.frequency || cls.frequency === 'pontual') {
          allOccurrences.push({
            id: cls.id,
            title: `Turma: ${cls.name} (${courseMap.get(cls.courseId) || 'Ensino'})`,
            start: baseStart,
            end: baseEnd,
            resource: cls,
          });
          return;
        }

        // --- EXPANSÃO DE RECORRÊNCIA ---
        let current = moment(baseStart);
        const targetDay = cls.dayOfWeek ? weekDayMap[cls.dayOfWeek] : -1;
        let safeCounter = 0;

        while (current.isSameOrBefore(moment(recurrenceStop), 'day') && safeCounter < 200) {
            safeCounter++;
            let shouldAdd = false;

            if (cls.frequency === 'semanal') {
                if (targetDay === -1 || current.day() === targetDay) shouldAdd = true;
            } else if (cls.frequency === 'quinzenal') {
                const diffWeeks = current.diff(moment(baseStart), 'weeks');
                if (diffWeeks % 2 === 0 && (targetDay === -1 || current.day() === targetDay)) shouldAdd = true;
            } else if (cls.frequency === 'mensal') {
                // Lógica simplificada para dia do mês
                if (current.date() === moment(baseStart).date()) shouldAdd = true;
            }

            if (shouldAdd) {
                const occStart = current.toDate();
                const occEnd = new Date(occStart.getTime() + duration);
                
                allOccurrences.push({
                    id: `${cls.id}_${occStart.getTime()}`,
                    title: `Turma: ${cls.name} (${courseMap.get(cls.courseId) || 'Ensino'})`,
                    start: occStart,
                    end: occEnd,
                    resource: cls,
                });
            }
            current.add(1, 'day'); 
        }
      } catch (e) {
        console.error("Erro ao expandir recorrência da turma:", e, cls);
      }
    });

    return allOccurrences;
  }, [classes, courseMap]);
  
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
          {event.resource?.locationId === 'the_school' ? 'The School' : (roomMap.get(event.resource?.locationId) || 'IBM')}
        </div>
      </div>
    )
  }), [roomMap]);

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