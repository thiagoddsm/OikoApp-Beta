'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, User, BookOpen, Clock, AlertTriangle, CheckCircle, Play, Plus, RefreshCw, Loader2, Music } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { useMembersData, useCoursesData, useTeachingFinance, useLearningSessionsData } from "@/hooks/useDomainData";
import { ClassSessionModal } from './class-session-modal';
import { doc, setDoc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';

export function TeacherDashboard() {
  const { user, firestore } = useFirebase();
  const { users } = useMembersData();
  const { courses, classes, isLoading: loadingCourses } = useCoursesData();
  const { wavePayments, isLoading: loadingFinance } = useTeachingFinance();
  const { sessions, makeups, isLoading: loadingSessions } = useLearningSessionsData('wave');

  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const isLoading = loadingCourses || loadingFinance || loadingSessions;

  // Filter assigned classes for the logged-in teacher
  const teacherClasses = useMemo(() => {
    if (!user || !classes) return [];
    return classes.filter(cls => cls.teacherId === user.uid);
  }, [user, classes]);

  // Filter learning sessions assigned to this teacher
  const teacherSessions = useMemo(() => {
    if (!user || !sessions) return [];
    return sessions.filter(s => s.teacherId === user.uid || teacherClasses.some(c => c.id === s.classId));
  }, [user, sessions, teacherClasses]);

  const courseMap = useMemo(() => new Map(courses.map(c => [c.id, c.name])), [courses]);
  const userMap = useMemo(() => new Map(users.map(u => [u.id, u.name])), [users]);

  // Generate today's date formatted as YYYY-MM-DD
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Today's sessions
  const todaySessions = useMemo(() => {
    return teacherSessions.filter(s => s.date === todayStr);
  }, [teacherSessions, todayStr]);

  // Upcoming next session
  const upcomingSession = useMemo(() => {
    if (todaySessions.length > 0) return todaySessions[0];
    return teacherSessions.find(s => s.status === 'scheduled' || s.status === 'in_progress') || null;
  }, [todaySessions, teacherSessions]);

  // Pending diaries count
  const pendingDiaries = useMemo(() => {
    return teacherSessions.filter(s => s.status === 'finished' && !s.diaryCompleted);
  }, [teacherSessions]);

  // Pending makeups count
  const pendingMakeups = useMemo(() => {
    if (!user || !makeups) return [];
    return makeups.filter(m => m.teacherId === user.uid && m.status === 'pending');
  }, [user, makeups]);

  // 🔄 Generate Auto Sessions for Active Classes if none exist for today
  const handleGenerateTodaySessions = async () => {
    if (!firestore || !user || teacherClasses.length === 0) return;
    setIsGenerating(true);
    try {
      let createdCount = 0;
      for (const cls of teacherClasses) {
        const studentList = cls.students || [];
        if (studentList.length > 0) {
          for (const studentId of studentList) {
            const sessionId = `${cls.id}_${studentId}_${todayStr}`;
            const sessionRef = doc(firestore, 'learning_sessions', sessionId);
            
            const studentName = userMap.get(studentId) || 'Aluno Wave';
            const courseName = courseMap.get(cls.courseId) || 'Música';

            await setDoc(sessionRef, {
              id: sessionId,
              programId: 'wave',
              courseId: cls.courseId,
              classId: cls.id,
              teacherId: user.uid,
              studentId,
              title: `Aula de ${courseName} - ${studentName}`,
              date: todayStr,
              startTime: cls.startTime || '14:00',
              status: 'scheduled',
              diaryCompleted: false,
              attendanceCompleted: false,
              createdAt: new Date().toISOString()
            }, { merge: true });

            createdCount++;
          }
        }
      }
      toast({ title: '📅 Agenda Gerada!', description: `${createdCount} sessões de aula foram criadas para hoje.` });
    } catch (err: any) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Erro ao gerar agenda', description: err.message });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpenSessionModal = (session: any) => {
    setSelectedSession(session);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <Loader2 className="size-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 3 Summary Top Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Card 1: Próxima Aula */}
        <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold text-slate-500 uppercase tracking-wider">Próximo Compromisso</CardDescription>
            <CardTitle className="text-3xl font-black text-indigo-600">
              {upcomingSession ? upcomingSession.startTime : '--:--'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs font-bold text-slate-700 truncate">
              {upcomingSession ? upcomingSession.title : 'Nenhuma aula pendente agora'}
            </p>
            {upcomingSession && (
              <Badge className="mt-2 bg-indigo-50 text-indigo-700 border-indigo-200">
                {upcomingSession.status === 'in_progress' ? '▶️ Em Andamento' : '📅 Agendada'}
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Central de Pendências */}
        <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold text-slate-500 uppercase tracking-wider">Central de Pendências</CardDescription>
            <CardTitle className="text-3xl font-black text-amber-600">
              {pendingDiaries.length + pendingMakeups.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs space-y-1 text-slate-600 font-medium">
              <p>• <strong>{pendingDiaries.length}</strong> diários sem preencher</p>
              <p>• <strong>{pendingMakeups.length}</strong> reposições pendentes</p>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Total Aulas Hoje */}
        <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold text-slate-500 uppercase tracking-wider">Aulas de Hoje ({todayStr})</CardDescription>
            <CardTitle className="text-3xl font-black text-emerald-600">
              {todaySessions.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-between items-end">
            <p className="text-xs text-slate-500 font-medium">
              {teacherClasses.length} turmas alocadas no Wave
            </p>
            <Button size="sm" variant="outline" onClick={handleGenerateTodaySessions} disabled={isGenerating} className="text-xs h-7">
              {isGenerating ? <Loader2 className="size-3 animate-spin mr-1" /> : <RefreshCw className="size-3 mr-1 text-indigo-600" />} Gerar Aulas
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Main Agenda Section (Aulas do Dia) */}
      <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-md font-bold text-slate-800">
              <Calendar className="size-5 text-indigo-600" />
              Agenda de Aulas & Atendimentos
            </CardTitle>
            <CardDescription className="text-xs">Gerencie suas sessões de música do dia com controle de início/fim e diário.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto w-full">
<Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Horário</TableHead>
                <TableHead>Aula / Aluno</TableHead>
                <TableHead>Curso</TableHead>
                <TableHead>Status Operacional</TableHead>
                <TableHead>Diário</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {todaySessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-28 text-slate-400 italic">
                    Nenhuma aula agendada para hoje. Clique no botão "Gerar Aulas" acima para criar as sessões da sua grade.
                  </TableCell>
                </TableRow>
              ) : (
                todaySessions.map(session => (
                  <TableRow key={session.id}>
                    <TableCell className="font-bold text-slate-800">{session.startTime}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-bold text-slate-800 text-xs">{session.title}</p>
                        <p className="text-[11px] text-slate-400 font-medium">{userMap.get(session.studentId) || 'Aluno'}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {courseMap.get(session.courseId) || 'Música'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {session.status === 'scheduled' && <Badge variant="outline" className="text-slate-600 text-[10px]">📅 Agendada</Badge>}
                      {session.status === 'in_progress' && <Badge className="bg-amber-500 text-white text-[10px] animate-pulse">▶️ Em Andamento</Badge>}
                      {session.status === 'finished' && <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">⏹️ Finalizada ({session.durationMinutes || 50}m)</Badge>}
                      {session.status === 'cancelled' && <Badge variant="destructive" className="text-[10px]">🔴 Cancelada</Badge>}
                    </TableCell>
                    <TableCell>
                      {session.diaryCompleted ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">✅ Preenchido</Badge>
                      ) : session.status === 'finished' ? (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">⚠️ Pendente</Badge>
                      ) : (
                        <span className="text-[10px] text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => handleOpenSessionModal(session)} className="h-8 text-xs font-bold bg-indigo-600 hover:bg-indigo-700">
                        <BookOpen className="size-3.5 mr-1.5" />
                        {session.status === 'scheduled' ? 'Iniciar / Diário' : session.status === 'in_progress' ? 'Finalizar Aula' : 'Ver / Editar Diário'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
</div>
        </CardContent>
      </Card>

      {/* Modal Dialog */}
      {selectedSession && (
        <ClassSessionModal
          session={selectedSession}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
