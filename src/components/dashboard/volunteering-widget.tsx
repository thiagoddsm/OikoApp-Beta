'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Shield, HeartHandshake, UserCheck, AlertCircle } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { useVolunteering } from '@/contexts/volunteering-context';
import { format, parseISO, isAfter, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMembersData, useVolunteeringServiceData } from "@/hooks/useDomainData";

export function VolunteeringWidget() {
  const { user } = useFirebase();
    const { users } = useMembersData();
    const { serviceAreas, teams, savedSchedules } = useVolunteeringServiceData();

  const { isLoading } = useVolunteering();

  const currentUserDoc = useMemo(() => {
    if (!user || !users) return null;
    return users.find(u => u.id === user.uid);
  }, [user, users]);

  const serviceAreaName = useMemo(() => {
    if (!currentUserDoc?.serviceAreaId || !serviceAreas) return null;
    return serviceAreas.find(sa => sa.id === currentUserDoc.serviceAreaId)?.name;
  }, [currentUserDoc, serviceAreas]);

  const serviceTeamName = useMemo(() => {
    if (!currentUserDoc?.serviceTeamId || !teams) return null;
    return teams.find(t => t.id === currentUserDoc.serviceTeamId)?.name;
  }, [currentUserDoc, teams]);

  const userSchedules = useMemo(() => {
    if (!user || !savedSchedules) return [];

    const parseDDMMYYYY = (dateStr: string): Date => {
      if (!dateStr) return new Date(NaN);
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        // parts = [DD, MM, YYYY] -> Date (YYYY, MM-1, DD)
        return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      }
      return new Date(dateStr);
    };

    const schedulesList: { date: string; parsedDate: Date; eventName: string; teamName: string | null }[] = [];
    const today = startOfDay(new Date());

    savedSchedules.forEach(scheduleDoc => {
      if (scheduleDoc.schedule) {
        scheduleDoc.schedule.forEach(item => {
          if (item.memberIds && item.memberIds.includes(user.uid)) {
            const itemDate = parseDDMMYYYY(item.date);
            // Mostrar apenas escalas de hoje ou futuras
            if (!isNaN(itemDate.getTime()) && (isAfter(itemDate, today) || format(itemDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd'))) {
              schedulesList.push({
                date: item.date,
                parsedDate: itemDate,
                eventName: item.eventName,
                teamName: item.teamName || item.eventName,
              });
            }
          }
        });
      }
    });

    return schedulesList.sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());
  }, [user, savedSchedules]);

  if (isLoading) {
    return null;
  }

  if (!user || !currentUserDoc) return null;

  const isServing = currentUserDoc.serviceStatus === 'serving' || !!currentUserDoc.serviceAreaId;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
      {/* Informações Gerais de Voluntariado */}
      <Card className="bg-gradient-to-br from-indigo-700 to-indigo-900 text-white border-none shadow-lg overflow-hidden relative min-h-[160px] flex flex-col justify-between">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <HeartHandshake size={140} />
        </div>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-md font-bold uppercase tracking-wider">
            <UserCheck className="size-5" />
            Meu Voluntariado
          </CardTitle>
          <CardDescription className="text-indigo-200 text-xs">IBM Servir</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isServing ? (
            <div className="space-y-3">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-indigo-200 font-semibold mb-0.5">Área de Atuação</p>
                <p className="text-lg font-black truncate">{serviceAreaName || 'Sem Área Vinculada'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-indigo-200 font-semibold mb-0.5">Equipe / Função</p>
                <p className="text-sm font-semibold truncate flex items-center gap-1">
                  <Shield className="size-3.5" />
                  {serviceTeamName || 'Geral'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-indigo-100 font-medium">Você ainda não está servindo em nenhuma área de voluntariado.</p>
              <Badge variant="outline" className="bg-white/20 text-white border-white/20 font-bold text-[10px]">
                NÃO ATIVO
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Próximas Escalas */}
      <Card className="md:col-span-2 shadow-sm border border-border bg-card text-card-foreground">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-foreground font-black">
            <Calendar className="size-5 text-indigo-600 dark:text-indigo-400" />
            Minhas Escalas de Serviço
          </CardTitle>
          <CardDescription className="text-muted-foreground">Próximos dias em que você está escalado para servir.</CardDescription>
        </CardHeader>
        <CardContent>
          {userSchedules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground space-y-2">
              <AlertCircle className="size-8 text-muted-foreground/50" />
              <p className="text-sm font-medium">Nenhuma escala programada para os próximos dias.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {userSchedules.slice(0, 4).map((schedule, idx) => {
                const dayStr = format(schedule.parsedDate, "EEEE", { locale: ptBR });
                const dateFormatted = format(schedule.parsedDate, "dd 'de' MMMM", { locale: ptBR });

                return (
                  <div key={idx} className="p-3.5 bg-slate-50 dark:bg-muted/40 rounded-xl border border-slate-100 dark:border-border hover:bg-slate-100/70 dark:hover:bg-muted/70 transition-colors flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <Badge className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/30 text-[10px] font-black uppercase">
                          {schedule.eventName}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-semibold capitalize">{dayStr}</span>
                      </div>
                      <p className="text-sm font-black text-foreground leading-tight">{dateFormatted}</p>
                      {schedule.teamName && schedule.teamName !== schedule.eventName && (
                        <p className="text-[10px] text-muted-foreground mt-1 font-semibold flex items-center gap-1">
                          <Shield className="size-2.5 text-indigo-500 dark:text-indigo-400" />
                          {schedule.teamName}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
