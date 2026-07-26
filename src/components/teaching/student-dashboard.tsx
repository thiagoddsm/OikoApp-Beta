
'use client';
import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Calendar, Clock, Book, GraduationCap, CreditCard, User, Loader2,
  PlayCircle, ExternalLink, CheckCircle2, XCircle, AlertTriangle,
  RefreshCw, ChevronDown, ChevronUp, BarChart2, Minus, BookOpen, Folder, Award
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useFirebase } from '@/firebase';
import { useVolunteering, type Class } from '@/contexts/volunteering-context';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { format, parseISO, addWeeks, addMonths, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMembersData, useCoursesData } from "@/hooks/useDomainData";
import { CertificateView } from './certificate-view';

const safeParseISO = (dateStr: string): Date => {
  if (!dateStr || typeof dateStr !== 'string') return new Date(NaN);
  // Strip time component (T...), then take only YYYY-MM-DD (first 3 dash-parts).
  // The old regex /-[\d]+$/ incorrectly stripped the day: '2026-04-05' → '2026-04' → NaN.
  // This version handles: '2026-04-05' ✓, '2026-06-28-1' → '2026-06-28' ✓, '2026-05-02T08:00' ✓
  const withoutTime = dateStr.split('T')[0];
  const cleanD = withoutTime.split('-').slice(0, 3).join('-');
  const parsed = parseISO(cleanD);
  return isNaN(parsed.getTime()) ? new Date(NaN) : parsed;
};



// ─── helpers ────────────────────────────────────────────────────────────────

/** Calcula todas as datas de aula de uma turma (mesmo algoritmo do log do professor) */
function resolveClassSchedule(cls: Class): { dateStr: string; isExtra: boolean; isRepositionOnly: boolean }[] {
  const items: { dateStr: string; isExtra: boolean; isRepositionOnly: boolean }[] = [];
  if (!cls.startDate) return items;

  const start = safeParseISO(cls.startDate);
  if (isNaN(start.getTime())) return items;
  const end = cls.endDate ? safeParseISO(cls.endDate) : addMonths(start, 6);
  const holidaySet = new Set(cls.holidayDates || []);
  const overrides: Record<string, any> = cls.scheduleOverrides || {};

  if (cls.frequency === 'pontual') {
    items.push({ dateStr: cls.startDate, isExtra: false, isRepositionOnly: false });
  } else {
    let current = start;
    let safe = 0;
    while (safe++ < 300) {
      const dStr = format(current, 'yyyy-MM-dd');
      if (isBefore(end, startOfDay(current))) break;

      if (!holidaySet.has(dStr) && !overrides[dStr]?.isCancelled) {
        items.push({ dateStr: dStr, isExtra: false, isRepositionOnly: false });
      } else if (overrides[dStr] && !overrides[dStr]?.isCancelled) {
        items.push({ dateStr: dStr, isExtra: false, isRepositionOnly: false });
      }

      current = addWeeks(current, cls.frequency === 'quinzenal' ? 2 : 1);
    }

    // overrides fora da recorrência
    Object.keys(overrides).forEach(dStr => {
      if (!overrides[dStr]?.isCancelled && !items.find(i => i.dateStr === dStr)) {
        items.push({ dateStr: dStr, isExtra: false, isRepositionOnly: false });
      }
    });
  }

  // Aulas extras / reposições agendadas
  (cls.extraSessions || []).forEach((s: any) => {
    const uniqueStr = s.startTime ? `${s.date}T${s.startTime}` : `${s.date}-extra`;
    if (!items.find(i => i.dateStr === uniqueStr)) {
      items.push({ dateStr: uniqueStr, isExtra: true, isRepositionOnly: !!s.isRepositionOnly });
    }
  });

  return items.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
}

type SessionStatus = 'present' | 'online' | 'makeup' | 'absent' | 'future' | 'pending';
function getStudentStatus(dateStr: string, cls: Class, userId: string, today: Date): SessionStatus {
  const sessionDate = startOfDay(safeParseISO(dateStr));
  if (isNaN(sessionDate.getTime())) return 'pending';
  if (isBefore(today, sessionDate)) return 'future';

  const att = (cls.attendance || []).find((a: any) => a.date === dateStr);

  if (att?.presentStudentIds?.includes(userId)) return 'present';
  if (att?.onlineStudentIds?.includes(userId)) return 'online';

  // reposição nativa
  if (att?.repositions?.some((r: any) => r.studentId === userId)) return 'makeup';

  // reposição via extraSession deste módulo
  const repoSessions = (cls.extraSessions || []).filter((s: any) => s.isRepositionOnly);
  for (const rs of repoSessions) {
    const rsStr = rs.startTime ? `${rs.date}T${rs.startTime}` : `${rs.date}-extra`;
    const rsAtt = (cls.attendance || []).find((a: any) => a.date === rsStr);
    if (rsAtt?.presentStudentIds?.includes(userId) || rsAtt?.onlineStudentIds?.includes(userId)) {
      return 'makeup';
    }
  }

  return 'absent';
}

// ─── sub-components ──────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: SessionStatus }) {
  if (status === 'present') return <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />;
  if (status === 'online') return <PlayCircle className="size-4 text-indigo-500 shrink-0" />;
  if (status === 'makeup') return (
    <div className="size-4 shrink-0 flex items-center justify-center">
      <Badge className="bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 h-4 w-4 p-0 flex items-center justify-center font-black text-[9px]">R</Badge>
    </div>
  );
  if (status === 'future') return <Clock className="size-4 text-slate-300 dark:text-slate-700 shrink-0" />;
  if (status === 'pending') return <Clock className="size-4 text-slate-300 dark:text-slate-700 shrink-0" />;
  return <XCircle className="size-4 text-red-400 shrink-0" />;
}

function StatusLabel({ status }: { status: SessionStatus }) {
  if (status === 'present') return <span className="text-emerald-600 dark:text-emerald-400 font-bold">Presença</span>;
  if (status === 'online') return <span className="text-indigo-600 dark:text-indigo-400 font-bold">Online</span>;
  if (status === 'makeup') return <span className="text-amber-600 dark:text-amber-400 font-bold">Reposição</span>;
  if (status === 'future') return <span className="text-slate-400 dark:text-slate-500">Agendada</span>;
  if (status === 'pending') return <span className="text-slate-400 dark:text-slate-500">Pendente</span>;
  return <span className="text-red-500 dark:text-red-400 font-bold">Falta</span>;
}

interface ClassAttendanceCardProps {
  cls: Class;
  courseName: string;
  userId: string;
  today: Date;
}

function ClassAttendanceCard({ cls, courseName, userId, today }: ClassAttendanceCardProps) {
  const [expanded, setExpanded] = useState(false);

  const schedule = useMemo(() => resolveClassSchedule(cls), [cls]);

  // Apenas sessões já ocorridas (não futuras) e não somente-reposição
  const pastSessions = useMemo(() =>
    schedule.filter(s => {
      if (s.isRepositionOnly) return false;
      const parsedDate = safeParseISO(s.dateStr);
      if (isNaN(parsedDate.getTime())) return false;
      const date = startOfDay(parsedDate);
      return !isBefore(today, date);
    }),
    [schedule, today]
  );

  const sessionStatuses = useMemo(() =>
    pastSessions.map(s => ({
      ...s,
      status: getStudentStatus(s.dateStr, cls, userId, today)
    })),
    [pastSessions, cls, userId, today]
  );

  const presentCount = sessionStatuses.filter(s => s.status === 'present' || s.status === 'online' || s.status === 'makeup').length;
  const absentCount = sessionStatuses.filter(s => s.status === 'absent').length;
  const total = sessionStatuses.length;
  const pct = total > 0 ? Math.round((presentCount / total) * 100) : 0;
  const isApto = pct >= 75;

  const missedNeedingMakeup = sessionStatuses.filter(s => s.status === 'absent');
  const futureSessions = schedule.filter(s => {
    if (s.isRepositionOnly) return false;
    const parsedDate = safeParseISO(s.dateStr);
    if (isNaN(parsedDate.getTime())) return false;
    const date = startOfDay(parsedDate);
    return isBefore(today, date);
  });

  if (pastSessions.length === 0 && futureSessions.length === 0) return null;

  return (
    <Card className={cn(
      "border-2 bg-card text-card-foreground transition-all overflow-hidden",
      absentCount > 0 ? "border-orange-200 dark:border-orange-950/60" : "border-emerald-200 dark:border-emerald-950/60"
    )}>
      {/* Header */}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{courseName}</p>
            <CardTitle className="text-base font-black leading-tight truncate">{cls.name}</CardTitle>
            <CardDescription className="flex items-center gap-1.5 mt-1">
              <Clock className="size-3" />
              {cls.dayOfWeek} às {cls.startTime}
            </CardDescription>
          </div>
          <Badge
            className={cn(
              "text-[10px] font-black uppercase shrink-0 mt-1",
              isApto ? "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-900/30" : "bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-900/30"
            )}
            variant="outline"
          >
            {total === 0 ? 'AGUARDANDO' : isApto ? 'APTO' : `${pct}%`}
          </Badge>
        </div>

        {/* Barra de frequência */}
        {total > 0 && (
          <div className="mt-3 space-y-1.5">
            <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
              <span>{presentCount} presença{presentCount !== 1 ? 's' : ''} de {total} aula{total !== 1 ? 's' : ''}</span>
              <span className={cn(isApto ? "text-emerald-600 dark:text-emerald-400" : "text-orange-600 dark:text-orange-400")}>{pct}% de frequência</span>
            </div>
            <Progress
              value={pct}
              className="h-2"
            />
          </div>
        )}

        {/* Alertas de reposição */}
        {missedNeedingMakeup.length > 0 && (
          <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/30 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="size-3.5 text-orange-500" />
              <p className="text-[10px] font-black uppercase text-orange-700 dark:text-orange-400">
                {missedNeedingMakeup.length} aula{missedNeedingMakeup.length > 1 ? 's' : ''} para repor
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {missedNeedingMakeup.map(s => {
                const parsedDate = safeParseISO(s.dateStr);
                if (isNaN(parsedDate.getTime())) return null;
                return (
                  <Badge key={s.dateStr} variant="outline" className="text-[9px] bg-card border-orange-300 dark:border-orange-900/30 text-orange-700 dark:text-orange-400 font-bold">
                    {format(parsedDate, "dd/MM", { locale: ptBR })}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </CardHeader>

      {/* Materiais Didáticos Compartilhados */}
      {cls.materials && cls.materials.length > 0 && (
        <div className="px-6 pb-3">
          <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-xl space-y-2">
            <div className="flex items-center gap-2">
              <Folder className="size-3.5 text-indigo-600 dark:text-indigo-400" />
              <p className="text-[10px] font-black uppercase text-indigo-700 dark:text-indigo-400">
                Materiais de Apoio ({cls.materials.length})
              </p>
            </div>
            <div className="space-y-1.5">
              {cls.materials.map((mat, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2 p-2 bg-card rounded-lg border text-xs">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold truncate text-xs">{mat.title}</p>
                    {mat.description && <p className="text-[10px] text-muted-foreground truncate">{mat.description}</p>}
                  </div>
                  <Button asChild size="sm" variant="outline" className="h-6 text-[10px] font-bold px-2 shrink-0">
                    <a href={mat.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="size-3 mr-1" /> Acessar
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Lista de aulas */}
      {sessionStatuses.length > 0 && (
        <CardContent className="pt-0">
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-2 w-full text-[10px] font-black uppercase text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            <BookOpen className="size-3" />
            {expanded ? 'Ocultar' : 'Ver'} histórico completo de aulas
            {expanded ? <ChevronUp className="size-3 ml-auto" /> : <ChevronDown className="size-3 ml-auto" />}
          </button>

          {expanded && (
            <div className="space-y-1.5 mt-1 animate-in fade-in-0 slide-in-from-top-2 duration-200">
              {sessionStatuses.map((s, idx) => (
                <div
                  key={s.dateStr}
                  className={cn(
                    "flex items-center gap-3 p-2.5 rounded-lg text-sm",
                    s.status === 'present' || s.status === 'online' ? "bg-emerald-50 dark:bg-emerald-950/20" :
                    s.status === 'makeup' ? "bg-amber-50 dark:bg-amber-950/20" :
                    s.status === 'absent' ? "bg-red-50 dark:bg-red-950/20" : "bg-slate-50 dark:bg-muted/40"
                  )}
                >
                  <StatusIcon status={s.status} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs truncate">
                      {s.isExtra ? 'Aula Extra' : `Aula ${idx + 1}`}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {(() => {
                        const parsedDate = safeParseISO(s.dateStr);
                        return isNaN(parsedDate.getTime()) ? '-' : format(parsedDate, "EEEE, dd 'de' MMMM", { locale: ptBR });
                      })()}
                    </p>
                  </div>
                  <StatusLabel status={s.status} />
                </div>
              ))}

              {/* Próximas aulas */}
              {futureSessions.length > 0 && (
                <>
                  <p className="text-[9px] font-black uppercase text-muted-foreground pt-2 pb-1 px-1 tracking-widest">
                    Próximas aulas
                  </p>
                  {futureSessions.slice(0, 3).map((s, idx) => (
                    <div key={s.dateStr} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-muted/40 text-sm">
                      <Clock className="size-4 text-slate-300 dark:text-slate-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-xs truncate">
                          {s.isExtra ? 'Aula Extra' : `Aula ${sessionStatuses.length + idx + 1}`}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {(() => {
                            const parsedDate = safeParseISO(s.dateStr);
                            return isNaN(parsedDate.getTime()) ? '-' : format(parsedDate, "EEEE, dd 'de' MMMM", { locale: ptBR });
                          })()}
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">Agendada</span>
                    </div>
                  ))}
                  {futureSessions.length > 3 && (
                    <p className="text-center text-[10px] text-muted-foreground py-1">
                      +{futureSessions.length - 3} aulas agendadas
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export function StudentDashboard() {
  const { user } = useFirebase();
    const { users } = useMembersData();
    const { courses, classes, enrollmentRequests, pedagogicalLogs, theoflixCourses } = useCoursesData();

  const { isLoading } = useVolunteering();
  const today = useMemo(() => startOfDay(new Date()), []);
  
  // Estado para visualização de certificados
  const [selectedCert, setSelectedCert] = useState<{
    studentName: string;
    courseName: string;
    pdfUrl: string;
  } | null>(null);

  // Turmas do aluno agrupadas por curso
  const myClasses = useMemo(() => {
    if (!user || !classes) return [];
    return classes.filter(cls => cls.students && cls.students.includes(user.uid));
  }, [user, classes]);

  const groupedClasses = useMemo(() => {
    const groups: Record<string, Class[]> = {};
    myClasses.forEach(cls => {
      if (!groups[cls.courseId]) groups[cls.courseId] = [];
      groups[cls.courseId].push(cls);
    });
    return Object.values(groups).sort((a, b) => {
      const nameA = courses.find(c => c.id === a[0].courseId)?.name || '';
      const nameB = courses.find(c => c.id === b[0].courseId)?.name || '';
      return nameA.localeCompare(nameB);
    });
  }, [myClasses, courses]);

  const courseMap = useMemo(() => new Map(courses.map(c => [c.id, c])), [courses]);
  const teacherMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);

  // Resumo global: total de faltas em aberto
  const totalMissed = useMemo(() => {
    if (!user) return 0;
    return myClasses.reduce((acc, cls) => {
      const schedule = resolveClassSchedule(cls);
      const past = schedule.filter(s => {
        if (s.isRepositionOnly) return false;
        return !isBefore(today, startOfDay(parseISO(s.dateStr.split('T')[0])));
      });
      const missed = past.filter(s => getStudentStatus(s.dateStr, cls, user.uid, today) === 'absent');
      return acc + missed.length;
    }, 0);
  }, [myClasses, user, today]);

  if (isLoading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-8">

      {/* ── Identidade + Agenda ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Carteirinha */}
        <Card className="bg-gradient-to-br from-indigo-600 to-purple-700 text-primary-foreground dark:from-transparent dark:to-transparent dark:bg-card dark:text-card-foreground dark:border dark:border-border border-none shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <GraduationCap size={120} />
          </div>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="size-5" />
              Identidade Estudantil
            </CardTitle>
            <CardDescription className="text-white/70 dark:text-muted-foreground">Ensino IBM</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest opacity-70 dark:opacity-100 dark:text-muted-foreground mb-1">Aluno(a)</p>
              <p className="text-xl font-black leading-tight truncate">{user.displayName}</p>
            </div>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] uppercase tracking-widest opacity-70 dark:opacity-100 dark:text-muted-foreground mb-1">Matrículas ativas</p>
                <Badge variant="outline" className="bg-white/20 text-white border-white/20 dark:bg-muted dark:text-foreground dark:border-border font-bold">
                  {myClasses.length} turma{myClasses.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              {totalMissed > 0 && (
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-widest opacity-70 dark:opacity-100 dark:text-muted-foreground mb-1">A repor</p>
                  <Badge className="bg-orange-500 text-white border-none font-black dark:bg-orange-600">
                    {totalMissed} falta{totalMissed !== 1 ? 's' : ''}
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Agenda */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="size-5 text-primary" /> Minha Agenda
            </CardTitle>
            <CardDescription>Seus horários de aula em todos os cursos.</CardDescription>
          </CardHeader>
          <CardContent>
            {groupedClasses.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Você não possui matrículas ativas.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {groupedClasses.map(group => {
                  const firstCls = group[0];
                  const course = courseMap.get(firstCls.courseId);
                  return (
                    <div key={firstCls.courseId} className="p-4 bg-muted/30 rounded-xl border hover:bg-muted/50 transition-colors flex flex-col justify-between h-full">
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <p className="text-sm font-black text-primary truncate max-w-[150px]">{course?.name}</p>
                          <Badge variant="outline" className="text-[9px] uppercase font-black">{course?.ministryName}</Badge>
                        </div>
                        <div className="space-y-3">
                          {group.map(cls => (
                            <div key={cls.id} className="space-y-1">
                              <div className="flex items-center gap-2 text-xs">
                                <Clock className="size-3.5 text-muted-foreground" />
                                <span className="font-bold">{cls.dayOfWeek} às {cls.startTime}</span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                <User className="size-3" />
                                <span>Prof. {teacherMap.get(cls.teacherId)?.name || 'A definir'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {course?.linkedTheoflixId && (
                        <Button size="sm" variant="outline" className="mt-4 w-full text-[10px] font-black uppercase h-8 border-primary/30 hover:bg-primary/5 group" asChild>
                          <Link href="/dashboard/teaching/theoflix">
                            <PlayCircle className="size-3 mr-1.5 text-primary" />
                            Assistir no TheoFlix
                            <ExternalLink className="size-2.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Frequência por turma ───────────────────────────────────────────── */}
      {myClasses.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-xl text-primary">
              <BarChart2 className="size-5" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-tight">Minha Frequência</h2>
              <p className="text-[11px] text-muted-foreground">Presenças, faltas e aulas a repor por turma</p>
            </div>
          </div>

          {/* Legenda */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-muted-foreground bg-muted/30 p-3 rounded-xl border">
            <div className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-emerald-500" /><span className="font-medium">Presencial</span></div>
            <div className="flex items-center gap-1.5"><PlayCircle className="size-3.5 text-indigo-500" /><span className="font-medium">Online</span></div>
            <div className="flex items-center gap-1.5">
              <Badge className="bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 h-3.5 w-3.5 p-0 flex items-center justify-center font-black text-[8px]">R</Badge>
              <span className="font-medium">Reposição</span>
            </div>
            <div className="flex items-center gap-1.5"><XCircle className="size-3.5 text-red-400" /><span className="font-medium">Falta</span></div>
            <div className="flex items-center gap-1.5"><Clock className="size-3.5 text-slate-300" /><span className="font-medium">Agendada</span></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {myClasses.map(cls => (
              <ClassAttendanceCard
                key={cls.id}
                cls={cls}
                courseName={courseMap.get(cls.courseId)?.name || 'Curso'}
                userId={user.uid}
                today={today}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Meus Certificados ──────────────────────────────────────────────── */}
      {(() => {
        const currentUserProfile = users.find(u => u.id === user.uid);
        if (!currentUserProfile) return null;

        const certificates = currentUserProfile.journey?.certificates || {};
        const courseStatus = currentUserProfile.journey?.courseStatus || {};

        // Coleta todos os cursos onde há um PDF salvo OU o curso consta como aprovado/apto
        const eligibleCourseIds = Array.from(new Set([
          ...Object.keys(certificates).filter(id => !!certificates[id]),
          ...Object.keys(courseStatus).filter(id => {
            const st = (courseStatus[id] || '').toLowerCase();
            return st === 'approved' || st === 'completed' || st === 'apto';
          })
        ]));

        if (eligibleCourseIds.length === 0) return null;

        return (
          <div className="space-y-4 mt-8">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-xl text-primary">
                <Award className="size-5" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-tight">Meus Certificados</h2>
                <p className="text-[11px] text-muted-foreground">Documentos oficiais de conclusão liberados</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {eligibleCourseIds.map(courseId => {
                const course = courseMap.get(courseId);
                const pdfUrl = certificates[courseId];
                if (!course) return null;

                return (
                  <Card key={courseId} className="border-2 border-primary/10 hover:border-primary/20 transition-all">
                    <CardHeader className="pb-3">
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                        {course?.ministryName || 'Ensino'}
                      </p>
                      <CardTitle className="text-base font-black truncate">{course?.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {pdfUrl ? 'Certificado em PDF disponível' : 'Conclusão registrada com sucesso'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Button
                        size="sm"
                        onClick={() => setSelectedCert({
                          studentName: user.displayName || 'Aluno',
                          courseName: course?.name || 'Curso',
                          pdfUrl: pdfUrl || ''
                        })}
                        className="w-full text-xs font-black uppercase tracking-wider gap-1.5 shadow-sm"
                      >
                        <Award className="size-4" /> Visualizar / Baixar
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })()}

      {selectedCert && (
        <CertificateView
          open={!!selectedCert}
          onOpenChange={(open) => !open && setSelectedCert(null)}
          studentName={selectedCert.studentName}
          courseName={selectedCert.courseName}
          pdfUrl={selectedCert.pdfUrl}
        />
      )}
    </div>
  );
}
