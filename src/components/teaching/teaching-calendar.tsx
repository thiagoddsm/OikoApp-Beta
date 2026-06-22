'use client';
import React, { useMemo, useState } from 'react';
import { Calendar, momentLocalizer, View, Views } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/pt-br';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useVolunteering, type Class } from '@/contexts/volunteering-context';
import { Loader2, GraduationCap, Star } from 'lucide-react';
import { Card } from '../ui/card';
import { useEventsData, useCoursesData } from "@/hooks/useDomainData";

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
    searchTerm?: string;
}

export function TeachingCalendar({ onEventClick, searchTerm = '' }: TeachingCalendarProps) {
    const { reservations, rooms, strategicEvents, reservationCategories } = useEventsData();
    const { courses, classes, enrollmentRequests, pedagogicalLogs, theoflixCourses } = useCoursesData();

  const { isLoading } = useVolunteering();
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<View>(Views.MONTH);

  const courseMap = useMemo(() => new Map(courses.map(c => [c.id, c.name])), [courses]);
  const roomMap = useMemo(() => new Map(rooms.map(r => [r.id, r.name])), [rooms]);

  const events = useMemo(() => {
    if (!classes || !Array.isArray(classes)) return [];
    
    // Filtrar turmas com base no termo de pesquisa
    const filteredClasses = classes.filter(cls => {
        if (!searchTerm) return true;
        const courseName = courseMap.get(cls.courseId) || '';
        const searchLower = searchTerm.toLowerCase();
        return (
            cls.name.toLowerCase().includes(searchLower) ||
            courseName.toLowerCase().includes(searchLower)
        );
    });

    const allOccurrences: any[] = [];

    filteredClasses.forEach(cls => {
      try {
        if (!cls.startDate || !cls.startTime) return;

        // Horários base
        const baseStart = new Date(`${cls.startDate}T${cls.startTime}`);
        const baseEnd = new Date(`${cls.startDate}T${cls.endTime || cls.startTime}`);

        if (isNaN(baseStart.getTime())) return;

        const duration = baseEnd.getTime() - baseStart.getTime();
        const holidaySet = new Set(cls.holidayDates || []);
        
        // Limite de visualização futura (2 anos para permitir planejamento de longo prazo)
        const limitDate = moment().add(24, 'months');
        
        // Define o limite real da recorrência respeitando a data de término da turma
        let recurrenceStop = cls.endDate ? new Date(`${cls.endDate}T23:59:59`) : limitDate.toDate();
        
        if (moment(recurrenceStop).isAfter(limitDate)) {
            recurrenceStop = limitDate.toDate();
        }

        // --- EXPANSÃO DE RECORRÊNCIA ---
        if (cls.frequency && cls.frequency !== 'pontual') {
            let current = moment(baseStart);
            const targetDay = cls.dayOfWeek ? weekDayMap[cls.dayOfWeek] : -1;
            let safeCounter = 0;

            while (current.isSameOrBefore(moment(recurrenceStop), 'day') && safeCounter < 500) {
                safeCounter++;
                let shouldAdd = false;

                if (cls.frequency === 'semanal') {
                    if (targetDay === -1 || current.day() === targetDay) shouldAdd = true;
                } else if (cls.frequency === 'quinzenal') {
                    const diffWeeks = current.diff(moment(baseStart), 'weeks');
                    if (diffWeeks % 2 === 0 && (targetDay === -1 || current.day() === targetDay)) shouldAdd = true;
                } else if (cls.frequency === 'mensal') {
                    if (cls.weekOfMonth) {
                        const week = Math.ceil(current.date() / 7);
                        const isLastWeek = current.date() > (moment(current).endOf('month').date() - 7);
                        const matchesWeek = (cls.weekOfMonth === 'last' && isLastWeek) || (week.toString() === cls.weekOfMonth);
                        if (matchesWeek && current.day() === targetDay) shouldAdd = true;
                    } else {
                        if (current.date() === moment(baseStart).date()) shouldAdd = true;
                    }
                }

                const dateStr = current.format('YYYY-MM-DD');
                const override = cls.scheduleOverrides?.[dateStr];
                
                if (shouldAdd && !holidaySet.has(dateStr) && !override?.isCancelled) {
                    const occStart = current.toDate();
                    const occEnd = new Date(occStart.getTime() + duration);
                    
                    const currentCourse = courses.find(c => c.id === cls.courseId);
                    const syllabusItem = (override?.syllabusId && currentCourse?.syllabus)
                        ? currentCourse.syllabus.find(s => s.id === override.syllabusId)
                        : undefined;

                    allOccurrences.push({
                        id: `${cls.id}_${occStart.getTime()}`,
                        title: syllabusItem 
                            ? `Aula: ${syllabusItem.title} (${cls.name})` 
                            : `Turma: ${cls.name} (${courseMap.get(cls.courseId) || 'Ensino'})`,
                        start: occStart,
                        end: occEnd,
                        resource: cls,
                        isOverride: !!override
                    });
                }
                current.add(1, 'day'); 
            }
        } else if (cls.frequency === 'pontual') {
            if (!holidaySet.has(cls.startDate)) {
                allOccurrences.push({
                    id: cls.id,
                    title: `Turma: ${cls.name} (${courseMap.get(cls.courseId) || 'Ensino'})`,
                    start: baseStart,
                    end: baseEnd,
                    resource: cls,
                });
            }
        }

        // --- ADIÇÃO DE DATAS EXTRAS E OVERRIDES DE DATA ---
        const processedDates = new Set(allOccurrences.map(o => moment(o.start).format('YYYY-MM-DD')));

        if (cls.extraDates && cls.extraDates.length > 0) {
            cls.extraDates.forEach(dateStr => {
                if (processedDates.has(dateStr)) return;
                const extraStart = new Date(`${dateStr}T${cls.startTime}`);
                const extraEnd = new Date(extraStart.getTime() + duration);
                
                if (!isNaN(extraStart.getTime())) {
                    allOccurrences.push({
                        id: `${cls.id}_extra_${extraStart.getTime()}`,
                        title: `[EXTRA] ${cls.name} (${courseMap.get(cls.courseId) || 'Ensino'})`,
                        start: extraStart,
                        end: extraEnd,
                        resource: cls,
                        isExtra: true
                    });
                    processedDates.add(dateStr);
                }
            });
        }

        // Overrides que caem em datas fora da recorrência padrão
        if (cls.scheduleOverrides) {
            Object.entries(cls.scheduleOverrides).forEach(([dateStr, override]: [string, any]) => {
                if (processedDates.has(dateStr) || override.isCancelled) return;
                
                const overStart = new Date(`${dateStr}T${cls.startTime}`);
                const overEnd = new Date(overStart.getTime() + duration);
                
                if (!isNaN(overStart.getTime())) {
                    const currentCourse = courses.find(c => c.id === cls.courseId);
                    const syllabusItem = (override.syllabusId && currentCourse?.syllabus)
                        ? currentCourse.syllabus.find(s => s.id === override.syllabusId)
                        : undefined;

                    allOccurrences.push({
                        id: `${cls.id}_override_${overStart.getTime()}`,
                        title: syllabusItem 
                            ? `Aula: ${syllabusItem.title} (${cls.name})` 
                            : `Turma: ${cls.name} (Alterada)`,
                        start: overStart,
                        end: overEnd,
                        resource: cls,
                        isOverride: true
                    });
                }
            });
        }

      } catch (e) {
        console.error("Erro ao expandir recorrência da turma:", e, cls);
      }
    });

    return allOccurrences;
  }, [classes, courseMap, searchTerm]);
  
  const eventStyleGetter = (event: any) => {
    return {
        style: {
            backgroundColor: event.isExtra ? '#10b981' : event.isOverride ? '#f59e0b' : '#6366f1', // amber-500 para overrides
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
          {event.isExtra ? <Star className="size-2.5 shrink-0 fill-current" /> : <GraduationCap className="size-3 shrink-0" />}
          {event.title.replace('Turma: ', '').replace('[EXTRA] ', '')}
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
        <Calendar<any>
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
                noEventsInRange: "Sem aulas para esta pesquisa neste período.",
                showMore: (total) => `+ Ver mais (${total})`
            }}
            components={components}
        />
    </Card>
  );
}
