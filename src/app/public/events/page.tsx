'use client';

import React, { useMemo, useState } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, MapPin, ArrowLeft, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { useVolunteering, VolunteeringProvider } from '@/contexts/volunteering-context';
import { RegistrationDialog } from '@/components/events/registration-dialog';

type StrategicEvent = {
  id: string;
  eventName: string;
  ministry: string;
  organizer?: string;
  startDate: string;
  endDate?: string;
  timeStart: string;
  timeEnd: string;
  space?: string;
  externalLocation?: string;
  eventType: 'interno' | 'externo';
  isPaid?: string;
  ticketPrice?: number;
  visionAlignment?: string;
  phaseAlignment?: string;
  status: string;
  isPublicForRegistration?: boolean;
  requiresBaptism?: boolean;
  requiresActiveService?: boolean;
  requiredCourseId?: string;
};

export default function PublicEventsPage() {
  return (
    <VolunteeringProvider>
      <EventsListContent />
    </VolunteeringProvider>
  );
}

function EventsListContent() {
  const { firestore, user } = useFirebase();
  const { courses } = useVolunteering();

  const [selectedEvent, setSelectedEvent] = useState<StrategicEvent | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Buscar apenas eventos estratégicos que foram aprovados
  const eventsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'strategic_events'),
      where('status', '==', 'aprovado')
    );
  }, [firestore, user]);

  const { data: rawEvents, isLoading } = useCollection<StrategicEvent>(eventsQuery);

  const sortedEvents = useMemo(() => {
    if (!rawEvents) return [];
    // Filtrar apenas eventos configurados para divulgação pública
    // E ordenar por data de início (os mais próximos primeiro)
    return [...rawEvents]
      .filter(evt => evt.isPublicForRegistration === true)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [rawEvents]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr + 'T00:00:00');
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const handleOpenRegistration = (evt: StrategicEvent) => {
    setSelectedEvent(evt);
    setIsDialogOpen(true);
  };

  return (
    <main className="min-h-screen bg-slate-900 text-white font-sans antialiased">
      {/* Header section with gradient backdrop */}
      <div className="relative bg-gradient-to-b from-slate-950 to-slate-900 border-b border-slate-800/60 pb-16 pt-12 px-6 sm:px-12 text-center overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="mb-6 flex justify-center">
            <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-all bg-slate-800/40 hover:bg-slate-800/80 px-4 py-2 rounded-full border border-slate-700/50">
              <ArrowLeft className="size-3.5" /> Voltar ao Início
            </Link>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent mb-4">
            Eventos da Igreja
          </h1>
          <p className="text-slate-400 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            Fique por dentro de tudo o que acontece na Igreja Batista da Manhã. Participe e conecte-se com nossa comunidade.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {isLoading || !user ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
            <p className="text-slate-400 text-sm">Carregando os próximos eventos...</p>
          </div>
        ) : sortedEvents.length === 0 ? (
          <div className="text-center py-20 bg-slate-950/40 rounded-2xl border border-slate-800/40 p-8">
            <Calendar className="size-16 mx-auto opacity-20 mb-4 text-blue-400" />
            <h3 className="text-xl font-bold text-slate-200 mb-2">Nenhum Evento Agendado</h3>
            <p className="text-slate-400 max-w-sm mx-auto text-sm">
              No momento, não temos eventos públicos com inscrições abertas. Volte em breve!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedEvents.map((evt) => {
              const location = evt.eventType === 'interno' ? (evt.space || 'Templo Sede') : (evt.externalLocation || 'Externo');
              const isPaid = evt.isPaid === 'pago';
              return (
                <Card 
                  key={evt.id} 
                  className="bg-slate-950/60 border-slate-800/80 hover:border-slate-700/60 transition-all hover:scale-[1.02] flex flex-col justify-between overflow-hidden shadow-2xl relative group"
                >
                  <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
                  <div>
                    <CardHeader className="pb-4">
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <Badge className="bg-blue-950 text-blue-300 border-blue-800 hover:bg-blue-950/80 text-[10px] uppercase font-bold tracking-wider">
                          {evt.ministry || 'Ministério'}
                        </Badge>
                        <Badge className={isPaid ? "bg-amber-950 text-amber-300 border-amber-800" : "bg-emerald-950 text-emerald-300 border-emerald-800"}>
                          {isPaid ? `R$ ${evt.ticketPrice?.toFixed(2)}` : 'Gratuito'}
                        </Badge>
                      </div>
                      <CardTitle className="text-xl text-white font-bold group-hover:text-blue-400 transition-colors leading-tight">
                        {evt.eventName}
                      </CardTitle>
                      
                      {/* Requirements indicator list */}
                      {(evt.requiresBaptism || evt.requiresActiveService || evt.requiredCourseId) && (
                        <div className="flex flex-wrap gap-1 mt-2.5">
                          {evt.requiresBaptism && (
                            <Badge variant="outline" className="text-[9px] bg-blue-950/30 text-blue-300 border-blue-900/50 px-1.5 py-0">
                              💧 Batismo
                            </Badge>
                          )}
                          {evt.requiresActiveService && (
                            <Badge variant="outline" className="text-[9px] bg-purple-950/30 text-purple-300 border-purple-900/50 px-1.5 py-0">
                              🛠️ Serviço
                            </Badge>
                          )}
                          {evt.requiredCourseId && (
                            <Badge variant="outline" className="text-[9px] bg-indigo-950/30 text-indigo-300 border-indigo-900/50 px-1.5 py-0 truncate max-w-[130px]" title={courses.find(c => c.id === evt.requiredCourseId)?.name}>
                              🎓 {courses.find(c => c.id === evt.requiredCourseId)?.name || 'Lumine'}
                            </Badge>
                          )}
                        </div>
                      )}
                    </CardHeader>
                    
                    <CardContent className="space-y-4 pb-6">
                      <div className="space-y-2.5 text-sm text-slate-300">
                        <div className="flex items-center gap-2">
                          <Calendar className="size-4 text-blue-400 shrink-0" />
                          <span>
                            {formatDate(evt.startDate)}
                            {evt.endDate && evt.endDate !== evt.startDate && ` a ${formatDate(evt.endDate)}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px] text-blue-400 shrink-0">schedule</span>
                          <span>{evt.timeStart || '00:00'} às {evt.timeEnd || '23:59'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="size-4 text-blue-400 shrink-0" />
                          <span className="truncate">{location}</span>
                        </div>
                      </div>

                      {evt.visionAlignment && (
                        <div className="border-t border-slate-800/80 pt-3 mt-3">
                          <p className="text-xs text-slate-400 italic leading-relaxed">
                            "{evt.visionAlignment}"
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </div>
                  
                  <div className="px-6 pb-6 pt-2 border-t border-slate-800/40 bg-slate-950/30">
                    <Button 
                      onClick={() => handleOpenRegistration(evt)}
                      className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all shadow-lg shadow-blue-900/20"
                    >
                      Inscrever-se no Evento
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {selectedEvent && (
        <RegistrationDialog 
          open={isDialogOpen} 
          onOpenChange={setIsDialogOpen} 
          event={selectedEvent} 
        />
      )}
    </main>
  );
}
