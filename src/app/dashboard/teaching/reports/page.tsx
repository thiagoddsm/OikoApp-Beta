'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { VolunteeringProvider, useVolunteering, getResolvedSchedule } from '@/contexts/volunteering-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  BarChart2, 
  BookOpen, 
  Users, 
  Percent, 
  Printer, 
  Calendar, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  ChevronDown, 
  ChevronUp, 
  ChevronLeft,
  ChevronRight,
  Award,
  Layers,
  MapPin,
  Sparkles,
  Filter,
  X,
  Search,
  GraduationCap,
  Download,
  FileSpreadsheet,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMembersData, useCoursesData, useGCData } from "@/hooks/useDomainData";
import { useFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { evaluateStudentAttendance, type AttendanceEvaluation, type AttendanceStatus } from '@/lib/teaching/attendance-calculator';
import { TeachingDynamicFrequencyReport } from '@/components/teaching/teaching-dynamic-frequency-report';
import { Sliders } from 'lucide-react';

function GeneralTeachingReportsContent() {
  const { users } = useMembersData();
  const { courses, classes, enrollmentRequests } = useCoursesData();
  const { cells, areas, redes } = useGCData();
  const { updateClass } = useVolunteering();
  const { firestore, user: currentUser } = useFirebase();
  const { toast } = useToast();

  // Aba Ativa (Geral vs. Quadro Dinâmico de Frequência)
  const [activeTab, setActiveTab] = useState<'general' | 'dynamic_frequency'>('general');

  // Estados dos filtros acadêmicos
  const [selectedCycle, setSelectedCycle] = useState<string>('all');
  const [selectedTrack, setSelectedTrack] = useState<string>('all');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');

  // Filtros de Período Separados
  const [lessonDateStart, setLessonDateStart] = useState<string>('');
  const [lessonDateEnd, setLessonDateEnd] = useState<string>('');
  const [enrollmentDateStart, setEnrollmentDateStart] = useState<string>('');
  const [enrollmentDateEnd, setEnrollmentDateEnd] = useState<string>('');

  // Estados dos filtros de GC (Estrutura Celular)
  const [selectedRedeId, setSelectedRedeId] = useState<string>('all');
  const [selectedAreaId, setSelectedAreaId] = useState<string>('all');
  const [selectedCellId, setSelectedCellId] = useState<string>('all');

  // Busca textual na tabela nominal de alunos
  const [studentSearchTerm, setStudentSearchTerm] = useState<string>('');

  // Ordenação da Tabela
  const [sortColumn, setSortColumn] = useState<string>('status');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Paginação da Tabela Nominal
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Estado de exportação Excel
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);

  // Controle de expansão das aulas por curso
  const [expandedCourses, setExpandedCourses] = useState<Record<string, boolean>>({});

  // Modal de Exceção da Coordenação
  const [isExceptionModalOpen, setIsExceptionModalOpen] = useState(false);
  const [selectedExceptionItem, setSelectedExceptionItem] = useState<any | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSavingDecision, setIsSavingDecision] = useState(false);

  // ── MAPAS RÁPIDOS O(1) NO TOPO ──────
  const userMap = useMemo(() => {
    const map = new Map<string, any>();
    users.forEach(u => map.set(u.id, u));
    return map;
  }, [users]);

  const courseMap = useMemo(() => {
    const map = new Map<string, any>();
    courses.forEach(c => map.set(c.id, c));
    return map;
  }, [courses]);

  const cellMap = useMemo(() => {
    const map = new Map<string, any>();
    cells.forEach(c => map.set(c.id, c));
    return map;
  }, [cells]);

  const areaMap = useMemo(() => {
    const map = new Map<string, any>();
    areas.forEach(a => map.set(a.id, a));
    return map;
  }, [areas]);

  const redeMap = useMemo(() => {
    const map = new Map<string, any>();
    redes.forEach(r => map.set(r.id, r));
    return map;
  }, [redes]);

  const userCellMap = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach(u => {
      const cid = u.cellId || u.hierarchy?.celulaId || u.gcId;
      if (cid) map.set(u.id, cid);
    });
    return map;
  }, [users]);

  const studentClassesMap = useMemo(() => {
    const map = new Map<string, typeof classes>();
    classes.forEach(c => {
      (c.students || []).forEach(stId => {
        if (!map.has(stId)) map.set(stId, []);
        map.get(stId)!.push(c);
      });
    });
    return map;
  }, [classes]);

  // Obter ciclos únicos ordenados
  const cycles = useMemo(() => {
    const set = new Set<string>();
    classes.forEach(c => { if (c.cycle) set.add(c.cycle); });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [classes]);

  // Helper de data para AULAS MINISTRADAS
  const isLessonDateInRange = (dateStr: string) => {
    if (!lessonDateStart && !lessonDateEnd) return true;
    const cleanDate = dateStr.split('T')[0];
    if (lessonDateStart && cleanDate < lessonDateStart) return false;
    if (lessonDateEnd && cleanDate > lessonDateEnd) return false;
    return true;
  };

  // Mapa de datas de inscrição dos alunos
  const enrollmentDateMap = useMemo(() => {
    const map = new Map<string, Date>();
    (enrollmentRequests || []).forEach((r: any) => {
      let d: Date | null = null;
      if (r.createdAt?.toDate) d = r.createdAt.toDate();
      else if (r.createdAt?.seconds) d = new Date(r.createdAt.seconds * 1000);
      else if (r.createdAt) {
        try { d = new Date(r.createdAt); } catch {}
      }
      if (!d || !r.courseId) return;

      const keys: string[] = [];
      if (r.volunteerId) keys.push(String(r.volunteerId));
      if (r.userId) keys.push(String(r.userId));
      if (r.email) keys.push(`email:${String(r.email).trim().toLowerCase()}`);
      if (r.phone) {
        const cleanPhone = String(r.phone).replace(/\D/g, '');
        if (cleanPhone) keys.push(`phone:${cleanPhone}`);
      }
      if (r.name) keys.push(`name:${String(r.name).trim().toLowerCase()}`);

      keys.forEach(key => {
        const compositeKey = `${key}_${r.courseId}`;
        if (!map.has(compositeKey) || d! > map.get(compositeKey)!) {
          map.set(compositeKey, d!);
        }
      });
    });
    return map;
  }, [enrollmentRequests]);

  // Helper de data para INSCRIÇÕES / MATRÍCULAS ESPECÍFICAS DO CURSO
  const isEnrollmentDateInRange = (studentId: string, courseId?: string) => {
    if (!enrollmentDateStart && !enrollmentDateEnd) return true;
    if (!courseId) return false;

    const u = userMap.get(studentId);
    let date: Date | null = null;

    if (enrollmentDateMap.has(`${studentId}_${courseId}`)) {
      date = enrollmentDateMap.get(`${studentId}_${courseId}`)!;
    }
    if (!date && u?.email) {
      const emailKey = `email:${String(u.email).trim().toLowerCase()}_${courseId}`;
      if (enrollmentDateMap.has(emailKey)) {
        date = enrollmentDateMap.get(emailKey)!;
      }
    }
    if (!date && (u?.phone || u?.whatsapp)) {
      const cleanPhone = String(u.phone || u.whatsapp || '').replace(/\D/g, '');
      if (cleanPhone) {
        const phoneKey = `phone:${cleanPhone}_${courseId}`;
        if (enrollmentDateMap.has(phoneKey)) {
          date = enrollmentDateMap.get(phoneKey)!;
        }
      }
    }
    if (!date && u?.name) {
      const nameKey = `name:${String(u.name).trim().toLowerCase()}_${courseId}`;
      if (enrollmentDateMap.has(nameKey)) {
        date = enrollmentDateMap.get(nameKey)!;
      }
    }

    if (!date && u?.createdAt) {
      if (u.createdAt.toDate) date = u.createdAt.toDate();
      else if (u.createdAt.seconds) date = new Date(u.createdAt.seconds * 1000);
      else {
        try { date = new Date(u.createdAt); } catch {}
      }
    }

    if (!date) return true;

    const dateStr = format(date, 'yyyy-MM-dd');
    if (enrollmentDateStart && dateStr < enrollmentDateStart) return false;
    if (enrollmentDateEnd && dateStr > enrollmentDateEnd) return false;
    return true;
  };

  // ── FILTROS DE GC CASCATEADOS ──────
  const filteredAreas = useMemo(() => {
    if (selectedRedeId === 'all') return areas;
    return areas.filter(a => a.redeId === selectedRedeId);
  }, [areas, selectedRedeId]);

  const filteredCells = useMemo(() => {
    let result = cells;
    if (selectedRedeId !== 'all') {
      result = result.filter(c => c.redeId === selectedRedeId);
    }
    if (selectedAreaId !== 'all') {
      result = result.filter(c => c.areaId === selectedAreaId);
    }
    return result;
  }, [cells, selectedRedeId, selectedAreaId]);

  const matchingStudentIds = useMemo(() => {
    if (selectedRedeId === 'all' && selectedAreaId === 'all' && selectedCellId === 'all') {
      return null;
    }

    const validCellIds = new Set(filteredCells.map(c => c.id));
    const matchingIds = new Set<string>();

    users.forEach(u => {
      const uCellId = u.cellId || u.hierarchy?.celulaId || u.gcId;
      if (uCellId) {
        if (selectedCellId !== 'all') {
          if (uCellId === selectedCellId) matchingIds.add(u.id);
        } else if (validCellIds.has(uCellId)) {
          matchingIds.add(u.id);
        }
      }
    });

    return matchingIds;
  }, [selectedRedeId, selectedAreaId, selectedCellId, filteredCells, users]);

  const isStudentInScope = (studentId: string): boolean => {
    if (!matchingStudentIds) return true;
    return matchingStudentIds.has(studentId);
  };

  // Cursos filtrados por Ciclo e Trilha
  const filteredCoursesByCycle = useMemo(() => {
    let list = courses;
    if (selectedCycle !== 'all') {
      const activeCourseIdsInCycle = new Set(
        classes.filter(c => c.cycle === selectedCycle).map(c => c.courseId)
      );
      list = list.filter(c => activeCourseIdsInCycle.has(c.id));
    }
    if (selectedTrack !== 'all') {
      list = list.filter(c => (c.ebdTrack || 'none') === selectedTrack);
    }
    return list;
  }, [courses, classes, selectedCycle, selectedTrack]);

  // Turmas filtradas
  const filteredClasses = useMemo(() => {
    return classes.filter(cls => {
      if (selectedCycle !== 'all' && cls.cycle !== selectedCycle) return false;
      if (selectedCourseId !== 'all' && cls.courseId !== selectedCourseId) return false;
      if (selectedClassId !== 'all' && cls.id !== selectedClassId) return false;
      if (selectedTrack !== 'all') {
        const course = courseMap.get(cls.courseId);
        if ((course?.ebdTrack || 'none') !== selectedTrack) return false;
      }
      return true;
    });
  }, [classes, selectedCycle, selectedCourseId, selectedClassId, selectedTrack, courseMap]);

  // ── CACHE DE CRONOGRAMAS DAS TURMAS ──
  const classScheduleMap = useMemo(() => {
    const map = new Map<string, { totalLessons: number; validSessions: any[] }>();
    classes.forEach(cls => {
      const course = courseMap.get(cls.courseId);
      const resolved = getResolvedSchedule(cls, course);
      const totalLessons = resolved.length > 0 ? resolved.length : (course?.syllabus?.length || 12);
      const validSessions = resolved.filter(r => !r.isCancelled);
      map.set(cls.id, { totalLessons, validSessions });
    });
    return map;
  }, [classes, courseMap]);

  // ── 1. KPI TOTAL DE MATRÍCULAS ──────
  const enrollmentStats = useMemo(() => {
    let total = 0;
    const courseCounts: Record<string, number> = {};

    filteredClasses.forEach(cls => {
      const activeStudents = (cls.students || []).filter(stId => 
        isStudentInScope(stId) && isEnrollmentDateInRange(stId, cls.courseId)
      );
      total += activeStudents.length;
      courseCounts[cls.courseId] = (courseCounts[cls.courseId] || 0) + activeStudents.length;
    });

    const list = filteredCoursesByCycle.map(course => ({
      id: course.id,
      name: course.name,
      count: courseCounts[course.id] || 0
    })).sort((a, b) => b.count - a.count);

    return { total, list };
  }, [filteredClasses, filteredCoursesByCycle, isStudentInScope, isEnrollmentDateInRange]);

  // ── 2. KPI FREQUÊNCIA MÉDIA GLOBAL E POR CURSO (VIA MOTOR CENTRALIZADOR) ──
  const frequencyStats = useMemo(() => {
    let grandTotalPresents = 0;
    let grandTotalConducted = 0;
    const courseStats: Record<string, { totalPresents: number; totalConducted: number }> = {};

    filteredClasses.forEach(cls => {
      const course = courseMap.get(cls.courseId);
      if (!course) return;

      const sched = classScheduleMap.get(cls.id);
      if (!sched || sched.totalLessons === 0) return;
      const validSessionDates = sched.validSessions.map(s => s.dateStr);

      const activeStudents = (cls.students || []).filter(stId => 
        isStudentInScope(stId) && isEnrollmentDateInRange(stId, course.id)
      );

      activeStudents.forEach(stId => {
        const evalResult = evaluateStudentAttendance({
          classData: cls,
          courseData: course,
          studentId: stId,
          validSessionDates,
          isLessonDateInRange
        });

        grandTotalPresents += evalResult.totalPresent;
        grandTotalConducted += evalResult.lessonsConducted;

        if (!courseStats[cls.courseId]) {
          courseStats[cls.courseId] = { totalPresents: 0, totalConducted: 0 };
        }
        courseStats[cls.courseId].totalPresents += evalResult.totalPresent;
        courseStats[cls.courseId].totalConducted += evalResult.lessonsConducted;
      });
    });

    const globalAverage = grandTotalConducted > 0 
      ? Math.round((grandTotalPresents / grandTotalConducted) * 100) 
      : 0;

    const courseAverages = filteredCoursesByCycle.map(course => {
      const st = courseStats[course.id];
      const avg = st && st.totalConducted > 0 ? Math.round((st.totalPresents / st.totalConducted) * 100) : 0;
      return { id: course.id, name: course.name, average: avg };
    }).sort((a, b) => b.average - a.average);

    return { globalAverage, courseAverages, totalPresentsRegistered: grandTotalPresents };
  }, [filteredClasses, courseMap, classScheduleMap, filteredCoursesByCycle, isStudentInScope, isEnrollmentDateInRange]);

  // ── 3. DETALHAMENTO DE ENCONTROS POR AULA ──
  const classesAndLessonsDetail = useMemo(() => {
    const map: Record<string, { courseName: string; lessons: Array<{ date: string; title: string; present: number; absent: number; rate: number }> }> = {};

    filteredClasses.forEach(cls => {
      const course = courseMap.get(cls.courseId);
      if (!course) return;

      const sched = classScheduleMap.get(cls.id);
      if (!sched || sched.validSessions.length === 0) return;

      if (!map[course.id]) {
        map[course.id] = { courseName: course.name, lessons: [] };
      }

      const activeStudents = (cls.students || []).filter(stId => 
        isStudentInScope(stId) && isEnrollmentDateInRange(stId, course.id)
      );
      const totalEnrolled = activeStudents.length;

      sched.validSessions.forEach(session => {
        if (!isLessonDateInRange(session.dateStr)) return;

        const attRecord = cls.attendance?.find(a => a.date === session.dateStr);
        let presentCount = 0;

        activeStudents.forEach(stId => {
          const isPhysical = attRecord?.presentStudentIds?.includes(stId);
          const isOnline = attRecord?.onlineStudentIds?.includes(stId);
          const isRepo = attRecord?.repositions?.some((r: any) => r.studentId === stId);
          if (isPhysical || isOnline || isRepo) presentCount++;
        });

        const absentCount = Math.max(0, totalEnrolled - presentCount);
        const rate = totalEnrolled > 0 ? Math.round((presentCount / totalEnrolled) * 100) : 0;

        map[course.id].lessons.push({
          date: session.dateStr,
          title: session.syllabusTitle || `Aula ${session.index + 1} (${session.dateStr})`,
          present: presentCount,
          absent: absentCount,
          rate
        });
      });
    });

    return map;
  }, [filteredClasses, courseMap, classScheduleMap, isStudentInScope, isEnrollmentDateInRange, lessonDateStart, lessonDateEnd]);

  // ── 4. KPI ELEGIBILIDADE & PROJEÇÃO DE FORMANDOS (MOTOR CENTRALIZADOR) ──
  const projectionsStats = useMemo(() => {
    let totalInscritos = 0;
    let elegiveisHoje = 0;
    let projAprovados = 0;
    let projReprovados = 0;

    filteredClasses.forEach(cls => {
      const course = courseMap.get(cls.courseId);
      if (!course) return;

      const sched = classScheduleMap.get(cls.id);
      if (!sched || sched.totalLessons === 0) return;
      const validSessionDates = sched.validSessions.map(s => s.dateStr);

      const activeStudents = (cls.students || []).filter(stId => 
        isStudentInScope(stId) && isEnrollmentDateInRange(stId, course.id)
      );
      totalInscritos += activeStudents.length;

      activeStudents.forEach(studentId => {
        const evalResult = evaluateStudentAttendance({
          classData: cls,
          courseData: course,
          studentId,
          validSessionDates,
          isLessonDateInRange
        });

        if (evalResult.eligible) {
          elegiveisHoje++;
          projAprovados++;
        } else {
          projReprovados++;
        }
      });
    });

    const taxaAprovacao = totalInscritos > 0 ? Math.round((projAprovados / totalInscritos) * 100) : 0;

    return {
      totalInscritos,
      elegiveisHoje,
      projAprovados,
      projReprovados,
      taxaAprovacao
    };
  }, [filteredClasses, courseMap, classScheduleMap, lessonDateStart, lessonDateEnd, enrollmentDateStart, enrollmentDateEnd, isStudentInScope, isEnrollmentDateInRange]);

  // ── 5. TABELA NOMINAL DE ALUNOS COM HISTÓRICO DE CURSOS E EXCEÇÕES ─────────────
  const rawStudentsFollowUpList = useMemo(() => {
    const list: any[] = [];

    filteredClasses.forEach(cls => {
      const course = courseMap.get(cls.courseId);
      if (!course) return;

      const sched = classScheduleMap.get(cls.id);
      if (!sched || sched.totalLessons === 0) return;
      const validSessionDates = sched.validSessions.map(s => s.dateStr);

      const activeStudents = (cls.students || []).filter(stId => 
        isStudentInScope(stId) && isEnrollmentDateInRange(stId, course.id)
      );

      activeStudents.forEach(studentId => {
        const userObj = userMap.get(studentId);
        const cellId = userCellMap.get(studentId);
        const cellObj = cellId ? cellMap.get(cellId) : null;
        const areaObj = cellObj?.areaId ? areaMap.get(cellObj.areaId) : null;
        const redeId = cellObj?.redeId || areaObj?.redeId;
        const redeObj = redeId ? redeMap.get(redeId) : null;

        // Avaliação no Motor Único
        const evalResult = evaluateStudentAttendance({
          classData: cls,
          courseData: course,
          studentId,
          validSessionDates,
          isLessonDateInRange
        });

        // ── HISTÓRICO DE CURSOS E TURMAS ANTERIORES (LOOKUP O(1)) ──
        const studentAllClasses = studentClassesMap.get(studentId) || [];
        const previousClasses = studentAllClasses.filter(c => c.id !== cls.id);
        const historyItems: { courseName: string; className: string; status: string; freq: number }[] = [];

        previousClasses.forEach(prevCls => {
          const prevCourse = courseMap.get(prevCls.courseId);
          const prevCourseName = prevCourse?.name || 'Curso';
          const prevStatusRaw = userObj?.journey?.courseStatus?.[prevCls.courseId] || (prevCls.status === 'completed' ? 'Concluído' : 'Cursando');
          
          const prevSched = classScheduleMap.get(prevCls.id);
          const prevValidDates = prevSched ? prevSched.validSessions.map((s: any) => s.dateStr) : undefined;
          
          const prevEval = evaluateStudentAttendance({
            classData: prevCls,
            courseData: prevCourse,
            studentId,
            validSessionDates: prevValidDates
          });

          const statusBadgeText = prevStatusRaw === 'approved' ? 'Aprovado' : prevStatusRaw === 'rejected' ? 'Reprovado' : prevStatusRaw;

          historyItems.push({
            courseName: prevCourseName,
            className: prevCls.name,
            status: statusBadgeText,
            freq: prevEval.totalRate
          });
        });

        const historyCoursesText = historyItems.length > 0
          ? historyItems.map(h => `${h.courseName} (${h.className} - ${h.status})`).join('; ')
          : 'Primeira Matrícula';

        const historyFreqText = historyItems.length > 0
          ? historyItems.map(h => `${h.freq}% (${h.courseName})`).join('; ')
          : '—';

        list.push({
          studentId,
          studentName: userObj?.name || 'Aluno',
          photoURL: userObj?.profilePicture || userObj?.photoURL,
          phone: userObj?.phone || userObj?.whatsapp || '',
          gcName: cellObj?.nome || 'Sem GC vinculado',
          areaName: areaObj?.nome || '—',
          redeName: redeObj?.nome || '—',
          classId: cls.id,
          className: cls.name,
          classData: cls,
          courseId: course.id,
          courseName: course.name,
          courseData: course,
          
          // Métricas do Motor
          presentsCount: evalResult.totalPresent,
          inPersonCount: evalResult.inPersonCount,
          onlineCount: evalResult.onlineCount,
          absencesCount: evalResult.absencesCount,
          lessonsConducted: evalResult.lessonsConducted,
          totalLessons: evalResult.totalLessons,
          totalRate: evalResult.totalRate,
          onlineRate: evalResult.onlineRate,
          inPersonRate: evalResult.inPersonRate,
          
          // Status Pedagógico & Exceção
          status: evalResult.status,
          statusLabel: evalResult.statusLabel,
          statusDescription: evalResult.statusDescription,
          statusBadgeVariant: evalResult.statusBadgeVariant,
          eligible: evalResult.eligible,
          hasException: evalResult.hasException,
          exception: evalResult.exception,
          
          // Histórico
          historyCoursesText,
          historyFreqText,
          historyItems
        });
      });
    });

    // Se o usuário não selecionou uma turma específica, deduplica para mostrar apenas a turma mais recente de cada aluno por curso
    if (selectedClassId === 'all') {
      const latestMap = new Map<string, any>();
      list.forEach(item => {
        const key = `${item.studentId}_${item.courseId}`;
        const existing = latestMap.get(key);
        if (!existing) {
          latestMap.set(key, item);
        } else {
          const existingDate = existing.classData?.startDate || '';
          const currentDate = item.classData?.startDate || '';
          const isCurrentNewer = currentDate > existingDate || 
            (item.classData?.status === 'active' && existing.classData?.status === 'completed');
          if (isCurrentNewer) {
            latestMap.set(key, item);
          }
        }
      });
      return Array.from(latestMap.values());
    }

    return list;
  }, [filteredClasses, courseMap, classScheduleMap, studentClassesMap, isStudentInScope, isEnrollmentDateInRange, userMap, userCellMap, cellMap, areaMap, redeMap, lessonDateStart, lessonDateEnd, selectedClassId]);

  // Filtro de busca textual
  const studentsFollowUpList = useMemo(() => {
    if (!studentSearchTerm.trim()) return rawStudentsFollowUpList;
    const term = studentSearchTerm.toLowerCase();
    return rawStudentsFollowUpList.filter(s => 
      s.studentName.toLowerCase().includes(term) ||
      s.gcName.toLowerCase().includes(term) ||
      s.courseName.toLowerCase().includes(term) ||
      s.className.toLowerCase().includes(term) ||
      s.historyCoursesText.toLowerCase().includes(term)
    );
  }, [rawStudentsFollowUpList, studentSearchTerm]);

  // ── ORDENAÇÃO DINÂMICA EM TODAS AS COLUNAS ──
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedStudentsList = useMemo(() => {
    return [...studentsFollowUpList].sort((a, b) => {
      let comparison = 0;
      switch (sortColumn) {
        case 'studentName':
          comparison = a.studentName.localeCompare(b.studentName, 'pt-BR');
          break;
        case 'gcName':
          comparison = a.gcName.localeCompare(b.gcName, 'pt-BR');
          break;
        case 'courseName':
          comparison = `${a.courseName} ${a.className}`.localeCompare(`${b.courseName} ${b.className}`, 'pt-BR');
          break;
        case 'presentsCount':
          comparison = a.presentsCount - b.presentsCount;
          break;
        case 'totalRate':
          comparison = a.totalRate - b.totalRate;
          break;
        case 'status': {
          const priority: Record<string, number> = {
            insufficient_attendance: 0,
            exceeds_online_limit: 1,
            exceeds_in_person_limit: 2,
            exception_rejected: 3,
            exception_pending: 4,
            exception_approved: 5,
            eligible: 6,
            approved: 7,
          };
          comparison = (priority[a.status] ?? 99) - (priority[b.status] ?? 99);
          break;
        }
        case 'historyCourses':
          comparison = a.historyCoursesText.localeCompare(b.historyCoursesText, 'pt-BR');
          break;
        case 'historyFreq':
          comparison = a.historyFreqText.localeCompare(b.historyFreqText, 'pt-BR');
          break;
        default:
          comparison = a.studentName.localeCompare(b.studentName, 'pt-BR');
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [studentsFollowUpList, sortColumn, sortDirection]);

  // Reseta para a página 1 sempre que filtros, ordenação ou busca mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [
    selectedCycle,
    selectedTrack,
    selectedCourseId,
    selectedClassId,
    selectedRedeId,
    selectedAreaId,
    selectedCellId,
    lessonDateStart,
    lessonDateEnd,
    enrollmentDateStart,
    enrollmentDateEnd,
    studentSearchTerm,
    sortColumn,
    sortDirection,
    pageSize
  ]);

  const totalStudents = sortedStudentsList.length;
  const totalPages = pageSize === 0 ? 1 : Math.max(1, Math.ceil(totalStudents / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedStudents = useMemo(() => {
    if (pageSize === 0) return sortedStudentsList;
    const start = (safeCurrentPage - 1) * pageSize;
    return sortedStudentsList.slice(start, start + pageSize);
  }, [sortedStudentsList, safeCurrentPage, pageSize]);

  // ── EXPORTAÇÃO COMPLETA PARA EXCEL (.XLSX) VIA EXCELJS ──
  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Oiko SaaS';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet('Acompanhamento de Ensino');

      // 1. Título & Metadados
      worksheet.mergeCells('A1:N1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = 'DASHBOARD GERENCIAL DO ENSINO - OIKO';
      titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(1).height = 32;

      worksheet.mergeCells('A2:N2');
      const subtitleCell = worksheet.getCell('A2');
      subtitleCell.value = `Relatório extraído em: ${format(new Date(), 'dd/MM/yyyy HH:mm')} | Ciclo: ${selectedCycle === 'all' ? 'Todos' : selectedCycle} | Total Alunos: ${sortedStudentsList.length}`;
      subtitleCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } };
      subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(2).height = 20;

      worksheet.addRow([]); // Linha 3 vazia

      // 2. Cabeçalhos das Colunas
      const headers = [
        'Aluno',
        'WhatsApp / Telefone',
        'Célula (GC)',
        'Área',
        'Rede',
        'Curso Atual',
        'Turma Atual',
        'Presenças (Presencial)',
        'Presenças (Online)',
        'Total Presenças',
        'Freq. Total (%)',
        'Status Pedagógico',
        'Cursos e Turmas Anteriores',
        'Freq. Anterior'
      ];

      const headerRow = worksheet.addRow(headers);
      headerRow.height = 26;
      headerRow.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4338CA' } }; // Indigo-700
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          bottom: { style: 'medium', color: { argb: 'FF1E293B' } },
          right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
        };
      });

      // 3. Adicionar Linhas de Dados
      sortedStudentsList.forEach((item, index) => {
        const row = worksheet.addRow([
          item.studentName,
          item.phone || '—',
          item.gcName,
          item.areaName,
          item.redeName,
          item.courseName,
          item.className,
          item.inPersonCount,
          item.onlineCount,
          `${item.presentsCount} / ${item.lessonsConducted}`,
          `${item.totalRate}%`,
          item.statusLabel,
          item.historyCoursesText,
          item.historyFreqText
        ]);

        row.height = 22;
        const isZebra = index % 2 === 1;

        row.eachCell((cell, colNum) => {
          cell.font = { name: 'Arial', size: 9 };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
          };

          if (isZebra) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          }

          // Alinhamento centralizado para números e status
          if ([8, 9, 10, 11, 12, 14].includes(colNum)) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          }
        });
      });

      // 4. Larguras Automáticas das Colunas
      worksheet.columns.forEach((column) => {
        let maxLen = 12;
        column.eachCell?.({ includeEmpty: false }, (cell) => {
          const valStr = cell.value ? String(cell.value) : '';
          if (valStr.length > maxLen) maxLen = valStr.length;
        });
        column.width = Math.min(Math.max(maxLen + 3, 12), 45);
      });

      // 5. Download do Arquivo
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Relatorio_Gerencial_Ensino_${format(new Date(), 'yyyy-MM-dd_HHmm')}.xlsx`);

      toast({ title: 'Planilha Exportada!', description: 'Arquivo Excel gerado e baixado com sucesso.' });
    } catch (e: any) {
      console.error('Erro ao exportar Excel:', e);
      toast({ variant: 'destructive', title: 'Erro na Exportação', description: 'Não foi possível gerar a planilha Excel.' });
    } finally {
      setIsExportingExcel(false);
    }
  };

  // ── 6. RESUMO CONSOLIDADO POR CURSO ──
  const courseConsolidatedStats = useMemo(() => {
    const map = new Map<string, {
      enrolled: number;
      freq: number;
      localElegiveis: number;
      localAprovados: number;
      localReprovados: number;
    }>();

    const enrollmentMap = new Map(enrollmentStats.list.map(e => [e.id, e.count]));
    const freqMap = new Map(frequencyStats.courseAverages.map(f => [f.id, f.average]));

    filteredCoursesByCycle.forEach(course => {
      const enrolled = enrollmentMap.get(course.id) || 0;
      const freq = freqMap.get(course.id) || 0;

      let localElegiveis = 0;
      let localAprovados = 0;
      let localReprovados = 0;

      const courseClasses = filteredClasses.filter(c => c.courseId === course.id);
      courseClasses.forEach(cls => {
        const sched = classScheduleMap.get(cls.id);
        if (!sched || sched.totalLessons === 0) return;
        const validSessionDates = sched.validSessions.map(s => s.dateStr);

        const activeStudents = (cls.students || []).filter(stId =>
          isStudentInScope(stId) && isEnrollmentDateInRange(stId, course.id)
        );

        activeStudents.forEach(studentId => {
          const evalResult = evaluateStudentAttendance({
            classData: cls,
            courseData: course,
            studentId,
            validSessionDates,
            isLessonDateInRange
          });

          if (evalResult.eligible) {
            localElegiveis++;
            localAprovados++;
          } else {
            localReprovados++;
          }
        });
      });

      map.set(course.id, {
        enrolled,
        freq,
        localElegiveis,
        localAprovados,
        localReprovados
      });
    });

    return map;
  }, [filteredCoursesByCycle, filteredClasses, enrollmentStats, frequencyStats, classScheduleMap, isStudentInScope, isEnrollmentDateInRange, lessonDateStart, lessonDateEnd]);

  // Ação de Decisão da Exceção
  const handleSaveExceptionDecision = async (newStatus: 'approved' | 'rejected') => {
    if (!selectedExceptionItem) return;
    setIsSavingDecision(true);
    try {
      const { classId, studentId, classData } = selectedExceptionItem;
      const currentEx = classData.onlineExceptions?.[studentId] || {};

      const updatedException = {
        ...currentEx,
        studentId,
        classId,
        courseId: classData.courseId,
        status: newStatus,
        reviewedAt: new Date().toISOString(),
        reviewedBy: currentUser?.uid || 'coordenação',
        reviewNotes: reviewNotes || ''
      };

      const updatedOnlineExceptions = {
        ...(classData.onlineExceptions || {}),
        [studentId]: updatedException
      };

      await updateClass(classId, { onlineExceptions: updatedOnlineExceptions });

      if (firestore) {
        await setDoc(doc(firestore, 'classes', classId, 'onlineExceptions', studentId), updatedException, { merge: true });
      }

      toast({
        title: newStatus === 'approved' ? 'Exceção Aprovada! 🎓' : 'Exceção Rejeitada',
        description: `O status acadêmico do aluno foi atualizado com sucesso.`
      });
      setIsExceptionModalOpen(false);
      setSelectedExceptionItem(null);
      setReviewNotes('');
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar decisão', description: e.message });
    } finally {
      setIsSavingDecision(false);
    }
  };

  const toggleCourseExpanded = (courseId: string) => {
    setExpandedCourses(prev => ({ ...prev, [courseId]: !prev[courseId] }));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12 print:p-0">
      {/* ── TOPO & ABAS DE NAVEGAÇÃO ───────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-2 print-hide">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Dashboard Gerencial do Ensino
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Acompanhe a saúde pedagógica, frequência e projeções de aprovação com filtros por Célula, Área e Rede.
          </p>
        </div>

        {/* Abas Estilo Underline Stitch */}
        <div className="flex items-center gap-6 self-start lg:self-center pt-2 lg:pt-0">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={cn(
              "pb-2.5 text-xs font-bold transition-all border-b-2",
              activeTab === 'general'
                ? "border-primary text-primary font-black"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            Acompanhamento Geral
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dynamic_frequency')}
            className={cn(
              "pb-2.5 text-xs font-bold transition-all border-b-2",
              activeTab === 'dynamic_frequency'
                ? "border-indigo-600 text-indigo-600 font-black"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            Frequência &amp; Liderança
          </button>
        </div>
      </div>

      {activeTab === 'general' && (
        <div className="flex items-center justify-end gap-2 -mt-2 print-hide">
          <Button 
            onClick={handleExportExcel} 
            disabled={isExportingExcel || sortedStudentsList.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5 shadow-sm h-8"
          >
            {isExportingExcel ? <Loader2 className="size-3.5 animate-spin" /> : <FileSpreadsheet className="size-3.5" />}
            Exportar Excel ({sortedStudentsList.length})
          </Button>
          <Button onClick={handlePrint} variant="outline" className="font-bold text-xs gap-1.5 bg-white h-8">
            <Printer className="size-3.5" />
            Imprimir
          </Button>
        </div>
      )}

      {activeTab === 'dynamic_frequency' ? (
        <TeachingDynamicFrequencyReport
          users={users}
          courses={courses}
          classes={classes}
          cells={cells}
          areas={areas}
          redes={redes}
          enrollmentRequests={enrollmentRequests}
        />
      ) : (
        <>
      {/* ── 1. FILTROS ACADÊMICOS & ESTRUTURA CELULAR ────────────── */}
      <div className="space-y-4 print-hide">
        {/* Painel de Filtros Acadêmicos */}
        <Card className="shadow-sm border border-slate-100 bg-white">
          <CardHeader className="py-3 px-4 bg-slate-50/50 border-b border-slate-100">
            <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Layers className="size-3.5 text-primary" />
              Filtros Acadêmicos &amp; Turmas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-600">Trilho</Label>
              <Select value={selectedTrack} onValueChange={setSelectedTrack}>
                <SelectTrigger className="h-8 text-xs bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Trilhos</SelectItem>
                  <SelectItem value="none">Geral / Sem Trilha</SelectItem>
                  <SelectItem value="teologico">Trilho Teológico</SelectItem>
                  <SelectItem value="biblico">Trilho Bíblico</SelectItem>
                  <SelectItem value="discipulado">Trilho de Discipulado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-600">Ciclo</Label>
              <Select value={selectedCycle} onValueChange={setSelectedCycle}>
                <SelectTrigger className="h-8 text-xs bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Ciclos</SelectItem>
                  {cycles.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-600">Curso</Label>
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                <SelectTrigger className="h-8 text-xs bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Cursos</SelectItem>
                  {filteredCoursesByCycle.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-600">Turma</Label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger className="h-8 text-xs bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Turmas</SelectItem>
                  {classes
                    .filter(c => selectedCourseId === 'all' || c.courseId === selectedCourseId)
                    .map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Painel de Filtros de Estrutura Celular */}
        <Card className="shadow-sm border border-slate-100 bg-white">
          <CardHeader className="py-3 px-4 bg-slate-50/50 border-b border-slate-100">
            <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Users className="size-3.5 text-indigo-600" />
              Acompanhamento por Estrutura Celular (GC)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-600">Rede</Label>
              <Select value={selectedRedeId} onValueChange={(v) => { setSelectedRedeId(v); setSelectedAreaId('all'); setSelectedCellId('all'); }}>
                <SelectTrigger className="h-8 text-xs bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Redes</SelectItem>
                  {redes.map(r => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-600">Área</Label>
              <Select value={selectedAreaId} onValueChange={(v) => { setSelectedAreaId(v); setSelectedCellId('all'); }}>
                <SelectTrigger className="h-8 text-xs bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Áreas</SelectItem>
                  {filteredAreas.map(a => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-600">Célula (GC)</Label>
              <Select value={selectedCellId} onValueChange={setSelectedCellId}>
                <SelectTrigger className="h-8 text-xs bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os GCs</SelectItem>
                  {filteredCells.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Filtros por Período */}
        <Card className="shadow-sm border border-slate-100 bg-white">
          <CardHeader className="py-3 px-4 bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Calendar className="size-3.5 text-emerald-600" />
              Filtros por Período
            </CardTitle>
            {(lessonDateStart || lessonDateEnd || enrollmentDateStart || enrollmentDateEnd) && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setLessonDateStart('');
                  setLessonDateEnd('');
                  setEnrollmentDateStart('');
                  setEnrollmentDateEnd('');
                }}
                className="h-6 text-[10px] text-muted-foreground hover:text-red-600 gap-1 font-bold"
              >
                <X className="size-3" /> Limpar Datas
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 p-3 bg-slate-50/50 rounded-lg border border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="size-3 text-emerald-600" />
                  Período das Aulas Ministradas
                </span>
                <Badge variant="outline" className="text-[9px] bg-white font-mono">Frequência &amp; Diário</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">De (Início)</Label>
                  <Input type="date" value={lessonDateStart} onChange={e => setLessonDateStart(e.target.value)} className="h-8 text-xs bg-white" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Até (Fim)</Label>
                  <Input type="date" value={lessonDateEnd} onChange={e => setLessonDateEnd(e.target.value)} className="h-8 text-xs bg-white" />
                </div>
              </div>
            </div>

            <div className="space-y-2 p-3 bg-slate-50/50 rounded-lg border border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Users className="size-3 text-indigo-600" />
                  Período das Inscrições
                </span>
                <Badge variant="outline" className="text-[9px] bg-white font-mono">Data da Matrícula</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">De (Início)</Label>
                  <Input type="date" value={enrollmentDateStart} onChange={e => setEnrollmentDateStart(e.target.value)} className="h-8 text-xs bg-white" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Até (Fim)</Label>
                  <Input type="date" value={enrollmentDateEnd} onChange={e => setEnrollmentDateEnd(e.target.value)} className="h-8 text-xs bg-white" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 2. KPIS GERENCIAIS (CARDS) ────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border border-slate-100 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Inscrições</CardTitle>
            <Users className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-800">{enrollmentStats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">Alunos inscritos ativos</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border border-slate-100 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Presença Média</CardTitle>
            <Percent className="size-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-800">{frequencyStats.globalAverage}%</div>
            <p className="text-xs text-muted-foreground mt-1">{frequencyStats.totalPresentsRegistered} presenças registradas</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border border-slate-100 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Elegíveis Hoje</CardTitle>
            <TrendingUp className="size-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-800">{projectionsStats.elegiveisHoje}</div>
            <p className="text-xs text-muted-foreground mt-1">Dentro das regras de frequência e modalidade</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border border-slate-100 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Projeção Aprovados</CardTitle>
            <CheckCircle2 className="size-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-800">{projectionsStats.projAprovados}</div>
            <p className="text-xs text-muted-foreground mt-1">Projeção de reprovação: {projectionsStats.projReprovados}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── 3. TABELA NOMINAL DE ALUNOS COM ORDENAÇÃO, HISTÓRICO E PAGINAÇÃO ───────── */}
      <Card className="shadow-sm border border-slate-100 bg-white print-card">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-black uppercase text-slate-800 flex items-center gap-2">
                  <GraduationCap className="size-4 text-indigo-600" />
                  Acompanhamento Nominal dos Alunos (Visão GC)
                </CardTitle>
                <Badge variant="secondary" className="text-xs font-bold font-mono">
                  {totalStudents} aluno{totalStudents !== 1 ? 's' : ''}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Monitore a frequência por modalidade (Presencial / Online), histórico de cursos anteriores e exceções
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2 print-hide">
              {/* Filtro de Linhas por Página */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[11px] font-bold text-muted-foreground whitespace-nowrap">Exibir:</span>
                <Select value={String(pageSize)} onValueChange={(val) => { setPageSize(Number(val)); setCurrentPage(1); }}>
                  <SelectTrigger className="h-8 w-[115px] text-xs font-bold bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 por pág.</SelectItem>
                    <SelectItem value="20">20 por pág.</SelectItem>
                    <SelectItem value="50">50 por pág.</SelectItem>
                    <SelectItem value="100">100 por pág.</SelectItem>
                    <SelectItem value="0">Todos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Busca Textual */}
              <div className="w-full sm:w-[220px] relative">
                <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar aluno, GC, curso..."
                  value={studentSearchTerm}
                  onChange={(e) => setStudentSearchTerm(e.target.value)}
                  className="h-8 pl-8 text-xs font-semibold"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-9 text-[10px] font-black uppercase text-slate-500 cursor-pointer hover:bg-slate-50 select-none" onClick={() => handleSort('studentName')}>
                    <div className="flex items-center gap-1">
                      Aluno {sortColumn === 'studentName' ? (sortDirection === 'asc' ? <ArrowUp className="size-3 text-indigo-600" /> : <ArrowDown className="size-3 text-indigo-600" />) : <ArrowUpDown className="size-3 text-slate-300" />}
                    </div>
                  </TableHead>

                  <TableHead className="h-9 text-[10px] font-black uppercase text-slate-500 cursor-pointer hover:bg-slate-50 select-none" onClick={() => handleSort('gcName')}>
                    <div className="flex items-center gap-1">
                      Célula / Estrutura {sortColumn === 'gcName' ? (sortDirection === 'asc' ? <ArrowUp className="size-3 text-indigo-600" /> : <ArrowDown className="size-3 text-indigo-600" />) : <ArrowUpDown className="size-3 text-slate-300" />}
                    </div>
                  </TableHead>

                  <TableHead className="h-9 text-[10px] font-black uppercase text-slate-500 cursor-pointer hover:bg-slate-50 select-none" onClick={() => handleSort('courseName')}>
                    <div className="flex items-center gap-1">
                      Curso &amp; Turma {sortColumn === 'courseName' ? (sortDirection === 'asc' ? <ArrowUp className="size-3 text-indigo-600" /> : <ArrowDown className="size-3 text-indigo-600" />) : <ArrowUpDown className="size-3 text-slate-300" />}
                    </div>
                  </TableHead>

                  <TableHead className="h-9 text-[10px] font-black uppercase text-slate-500 text-center cursor-pointer hover:bg-slate-50 select-none" onClick={() => handleSort('presentsCount')}>
                    <div className="flex items-center justify-center gap-1">
                      Presenças {sortColumn === 'presentsCount' ? (sortDirection === 'asc' ? <ArrowUp className="size-3 text-indigo-600" /> : <ArrowDown className="size-3 text-indigo-600" />) : <ArrowUpDown className="size-3 text-slate-300" />}
                    </div>
                  </TableHead>

                  <TableHead className="h-9 text-[10px] font-black uppercase text-slate-500 text-center cursor-pointer hover:bg-slate-50 select-none" onClick={() => handleSort('totalRate')}>
                    <div className="flex items-center justify-center gap-1">
                      Frequência {sortColumn === 'totalRate' ? (sortDirection === 'asc' ? <ArrowUp className="size-3 text-indigo-600" /> : <ArrowDown className="size-3 text-indigo-600" />) : <ArrowUpDown className="size-3 text-slate-300" />}
                    </div>
                  </TableHead>

                  <TableHead className="h-9 text-[10px] font-black uppercase text-slate-500 text-center cursor-pointer hover:bg-slate-50 select-none" onClick={() => handleSort('status')}>
                    <div className="flex items-center justify-center gap-1">
                      Status Pedagógico {sortColumn === 'status' ? (sortDirection === 'asc' ? <ArrowUp className="size-3 text-indigo-600" /> : <ArrowDown className="size-3 text-indigo-600" />) : <ArrowUpDown className="size-3 text-slate-300" />}
                    </div>
                  </TableHead>

                  <TableHead className="h-9 text-[10px] font-black uppercase text-slate-500 cursor-pointer hover:bg-slate-50 select-none" onClick={() => handleSort('historyCourses')}>
                    <div className="flex items-center gap-1">
                      Cursos Anteriores {sortColumn === 'historyCourses' ? (sortDirection === 'asc' ? <ArrowUp className="size-3 text-indigo-600" /> : <ArrowDown className="size-3 text-indigo-600" />) : <ArrowUpDown className="size-3 text-slate-300" />}
                    </div>
                  </TableHead>

                  <TableHead className="h-9 text-[10px] font-black uppercase text-slate-500 text-center cursor-pointer hover:bg-slate-50 select-none" onClick={() => handleSort('historyFreq')}>
                    <div className="flex items-center justify-center gap-1">
                      Freq. Anterior {sortColumn === 'historyFreq' ? (sortDirection === 'asc' ? <ArrowUp className="size-3 text-indigo-600" /> : <ArrowDown className="size-3 text-indigo-600" />) : <ArrowUpDown className="size-3 text-slate-300" />}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-xs text-muted-foreground italic">
                      Nenhum aluno encontrado para os filtros selecionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedStudents.map((item, idx) => (
                    <TableRow key={`${item.studentId}-${item.courseId}-${idx}`} className="hover:bg-slate-50/50">
                      {/* Aluno */}
                      <TableCell className="py-2.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="size-8 border">
                            <AvatarImage src={item.photoURL} alt={item.studentName} />
                            <AvatarFallback className="text-[10px] font-black bg-indigo-50 text-indigo-700">
                              {item.studentName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <Link 
                              href={`/dashboard/people/${item.studentId}`} 
                              className="font-bold text-xs text-slate-800 hover:text-primary hover:underline truncate block"
                            >
                              {item.studentName}
                            </Link>
                            {item.phone && (
                              <span className="text-[10px] text-muted-foreground block">{item.phone}</span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Célula */}
                      <TableCell className="py-2.5">
                        <div className="space-y-0.5">
                          <span className="font-bold text-xs text-slate-800 block truncate">{item.gcName}</span>
                          <span className="text-[10px] text-muted-foreground block truncate">
                            {item.redeName !== '—' ? `${item.redeName} · ` : ''}{item.areaName}
                          </span>
                        </div>
                      </TableCell>

                      {/* Curso & Turma */}
                      <TableCell className="py-2.5">
                        <div className="space-y-0.5">
                          <span className="font-bold text-xs text-slate-800 block truncate">{item.courseName}</span>
                          <span className="text-[10px] text-muted-foreground block truncate">{item.className}</span>
                        </div>
                      </TableCell>

                      {/* Presenças / Modalidades */}
                      <TableCell className="py-2.5 text-center">
                        <span className="text-xs font-bold text-slate-700">
                          {item.presentsCount} / {item.lessonsConducted}
                        </span>
                        <div className="flex items-center justify-center gap-1 mt-0.5 text-[10px] text-muted-foreground">
                          <span title="Presencial">🏫 {item.inPersonCount}</span>
                          <span>·</span>
                          <span title="Online">💻 {item.onlineCount}</span>
                        </div>
                      </TableCell>

                      {/* Frequência */}
                      <TableCell className="py-2.5 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black ${
                          item.totalRate >= 75 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 
                          item.totalRate >= 50 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 
                          'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {item.totalRate}%
                        </span>
                        <div className="text-[9px] text-muted-foreground mt-0.5">
                          {item.inPersonRate}% P / {item.onlineRate}% O
                        </div>
                      </TableCell>

                      {/* Status Pedagógico & Exceção */}
                      <TableCell className="py-2.5 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {item.status === 'approved' ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-bold text-[10px] gap-1">
                              <CheckCircle2 className="size-3" /> Formado
                            </Badge>
                          ) : item.status === 'eligible' ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 font-bold text-[10px] gap-1">
                              <CheckCircle2 className="size-3" /> Elegível
                            </Badge>
                          ) : item.status === 'exception_approved' ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-400 font-bold text-[10px] gap-1">
                              <ShieldCheck className="size-3 text-emerald-600" /> Exceção Aprovada
                            </Badge>
                          ) : item.status === 'exception_pending' ? (
                            <button
                              onClick={() => {
                                setSelectedExceptionItem(item);
                                setReviewNotes('');
                                setIsExceptionModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-amber-300 bg-amber-50 text-amber-800 text-[10px] font-bold hover:bg-amber-100 transition-colors"
                              title="Clique para analisar a solicitação de exceção"
                            >
                              <Clock className="size-3" /> Exceção Pendente
                            </button>
                          ) : item.status === 'exception_rejected' ? (
                            <Badge variant="outline" className="bg-rose-50 text-rose-800 border-rose-300 font-bold text-[10px] gap-1">
                              <XCircle className="size-3" /> Exceção Rejeitada
                            </Badge>
                          ) : item.status === 'exceeds_online_limit' ? (
                            <button
                              onClick={() => {
                                setSelectedExceptionItem(item);
                                setReviewNotes('');
                                setIsExceptionModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-amber-300 bg-amber-50 text-amber-800 text-[10px] font-bold hover:bg-amber-100 transition-colors"
                              title="Clique para conceder ou gerenciar exceção"
                            >
                              <AlertTriangle className="size-3" /> Excede Limite Online
                            </button>
                          ) : item.status === 'exceeds_in_person_limit' ? (
                            <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 font-bold text-[10px] gap-1">
                              <AlertTriangle className="size-3" /> Presencial Insuficiente
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300 font-bold text-[10px] gap-1">
                              <XCircle className="size-3" /> Freq. Insuficiente
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* Cursos Anteriores */}
                      <TableCell className="py-2.5 max-w-[200px]">
                        <span className="text-xs text-slate-700 block truncate" title={item.historyCoursesText}>
                          {item.historyCoursesText}
                        </span>
                      </TableCell>

                      {/* Freq. Anterior */}
                      <TableCell className="py-2.5 text-center">
                        <span className="text-xs font-semibold text-slate-700 block truncate" title={item.historyFreqText}>
                          {item.historyFreqText}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Footer de Paginação */}
          {pageSize > 0 && totalStudents > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 px-4 border-t border-slate-100 bg-slate-50/50 print-hide">
              <div className="text-xs text-muted-foreground font-semibold">
                Exibindo <span className="font-bold text-slate-800">{((safeCurrentPage - 1) * pageSize) + 1}</span> a <span className="font-bold text-slate-800">{Math.min(safeCurrentPage * pageSize, totalStudents)}</span> de <span className="font-bold text-slate-800">{totalStudents}</span> alunos
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={safeCurrentPage <= 1}
                  className="h-8 px-2.5 text-xs font-bold gap-1 bg-white"
                >
                  <ChevronLeft className="size-3.5" /> Anterior
                </Button>

                <div className="flex items-center gap-1 mx-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = i + 1;
                    if (totalPages > 5) {
                      if (safeCurrentPage > 3 && safeCurrentPage < totalPages - 2) {
                        pageNum = safeCurrentPage - 2 + i;
                      } else if (safeCurrentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      }
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === safeCurrentPage ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className={cn(
                          "h-8 w-8 p-0 text-xs font-bold",
                          pageNum === safeCurrentPage ? "bg-indigo-600 text-white" : "bg-white"
                        )}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={safeCurrentPage >= totalPages}
                  className="h-8 px-2.5 text-xs font-bold gap-1 bg-white"
                >
                  Próximo <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 4. RESUMO E DETALHAMENTO DE ENCONTROS ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-sm border border-slate-100 bg-white print-card">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase text-slate-800">Distribuição por Curso</CardTitle>
              <CardDescription className="text-xs">Número de alunos matriculados no período</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {enrollmentStats.list.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Nenhuma matrícula registrada.</p>
                ) : (
                  enrollmentStats.list.map(c => {
                    const pct = enrollmentStats.total > 0 ? Math.round((c.count / enrollmentStats.total) * 100) : 0;
                    return (
                      <div key={c.id} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-700 truncate max-w-[180px]">{c.name}</span>
                          <span className="text-slate-900 font-bold">{c.count} alunos ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border border-slate-100 bg-white print-card">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase text-slate-800">Média por Curso</CardTitle>
              <CardDescription className="text-xs">Taxa de presença acumulada por curso</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {frequencyStats.courseAverages.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Nenhum dado de frequência.</p>
                ) : (
                  frequencyStats.courseAverages.map(c => (
                    <div key={c.id} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-700 truncate max-w-[180px]">{c.name}</span>
                        <span className="text-emerald-600 font-bold">{c.average}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${c.average}%` }}></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm border border-slate-100 bg-white print-card">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase text-slate-800">Frequência por Encontro (Aulas)</CardTitle>
              <CardDescription className="text-xs">Monitore a frequência de cada aula nos cursos ativos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.keys(classesAndLessonsDetail).length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 italic">
                  Selecione um ciclo ou curso ativo para ver as aulas.
                </div>
              ) : (
                Object.entries(classesAndLessonsDetail).map(([courseId, data]) => {
                  const isExpanded = expandedCourses[courseId] ?? false;
                  return (
                    <div key={courseId} className="border border-slate-100 rounded-xl overflow-hidden">
                      <button
                        onClick={() => toggleCourseExpanded(courseId)}
                        className="w-full flex items-center justify-between p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <BookOpen className="size-4 text-primary" />
                          <span className="font-bold text-sm text-slate-800">{data.courseName}</span>
                          <Badge variant="secondary" className="text-[10px] ml-1">{data.lessons.length} aulas</Badge>
                        </div>
                        {isExpanded ? <ChevronUp className="size-4 text-slate-400" /> : <ChevronDown className="size-4 text-slate-400" />}
                      </button>

                      {isExpanded && (
                        <div className="border-t border-slate-100 p-2 bg-white">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="h-9 text-[10px] font-black uppercase text-slate-500">Aula / Conteúdo</TableHead>
                                <TableHead className="h-9 text-[10px] font-black uppercase text-slate-500 text-center">Presentes</TableHead>
                                <TableHead className="h-9 text-[10px] font-black uppercase text-slate-500 text-center">Faltas</TableHead>
                                <TableHead className="h-9 text-[10px] font-black uppercase text-slate-500 text-center">Aproveitamento</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {data.lessons.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={4} className="text-center py-4 text-xs text-muted-foreground italic">Nenhuma aula gerada no cronograma.</TableCell>
                                </TableRow>
                              ) : (
                                data.lessons.map((lesson, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell className="py-2 text-xs font-semibold text-slate-800">
                                      {lesson.title}
                                    </TableCell>
                                    <TableCell className="py-2 text-center text-xs font-bold text-emerald-600">
                                      {lesson.present}
                                    </TableCell>
                                    <TableCell className="py-2 text-center text-xs font-bold text-red-500">
                                      {lesson.absent}
                                    </TableCell>
                                    <TableCell className="py-2 text-center">
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${lesson.rate >= 90 ? 'bg-emerald-50 text-emerald-700' : lesson.rate >= 75 ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'}`}>
                                        {lesson.rate}%
                                      </span>
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── 5. RELATÓRIO EXECUTIVO DO CICLO ───────────────────────────── */}
      <Card className="shadow-sm border border-slate-100 bg-white print-card">
        <CardHeader>
          <CardTitle className="text-base font-black uppercase text-slate-800">Relatório Executivo do Ciclo</CardTitle>
          <CardDescription className="text-xs">Visão geral consolidada para liderança e coordenação de Ensino</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Curso</TableHead>
                <TableHead className="text-center">Matrículas</TableHead>
                <TableHead className="text-center">Frequência</TableHead>
                <TableHead className="text-center">Elegíveis (Hoje)</TableHead>
                <TableHead className="text-center">Proj. Formandos</TableHead>
                <TableHead className="text-center">Proj. Reprovação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCoursesByCycle.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground italic">
                    Nenhum curso cadastrado ou ativo no ciclo selecionado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCoursesByCycle.map(course => {
                  const stats = courseConsolidatedStats.get(course.id) || {
                    enrolled: 0,
                    freq: 0,
                    localElegiveis: 0,
                    localAprovados: 0,
                    localReprovados: 0
                  };

                  return (
                    <TableRow key={course.id}>
                      <TableCell className="font-bold text-sm text-slate-800">{course.name}</TableCell>
                      <TableCell className="text-center font-bold text-slate-700">{stats.enrolled}</TableCell>
                      <TableCell className="text-center font-black text-emerald-600">{stats.freq}%</TableCell>
                      <TableCell className="text-center font-bold text-blue-600">{stats.localElegiveis}</TableCell>
                      <TableCell className="text-center font-black text-indigo-600">{stats.localAprovados}</TableCell>
                      <TableCell className="text-center font-bold text-red-500">{stats.localReprovados}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── 6. MODAL DE GESTÃO DE EXCEÇÕES DA COORDENAÇÃO ───────────── */}
      <Dialog open={isExceptionModalOpen} onOpenChange={setIsExceptionModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-800 flex items-center gap-2">
              <ShieldCheck className="size-5 text-emerald-600" />
              Análise de Exceção de Frequência
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
              {selectedExceptionItem?.courseName} · {selectedExceptionItem?.className}
            </DialogDescription>
          </DialogHeader>

          {selectedExceptionItem && (
            <div className="space-y-4 py-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-bold">Aluno:</span>
                  <span className="font-bold text-slate-800">{selectedExceptionItem.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-bold">Frequência Total:</span>
                  <span className="font-bold text-slate-800">{selectedExceptionItem.totalRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-bold">Distribuição:</span>
                  <span className="font-bold text-slate-800">
                    {selectedExceptionItem.inPersonRate}% Presencial ({selectedExceptionItem.inPersonCount}) · {selectedExceptionItem.onlineRate}% Online ({selectedExceptionItem.onlineCount})
                  </span>
                </div>
              </div>

              {selectedExceptionItem.exception?.reason && (
                <div className="space-y-1 p-3 bg-amber-50/50 rounded-lg border border-amber-200">
                  <span className="text-[10px] uppercase font-black text-amber-800 tracking-wider block">Motivo Informado pelo Aluno</span>
                  <p className="text-slate-800 text-xs italic">
                    "{selectedExceptionItem.exception.reason}"
                  </p>
                  {selectedExceptionItem.exception.notes && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Obs: {selectedExceptionItem.exception.notes}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="review-notes" className="text-xs font-bold">Observações / Justificativa da Decisão</Label>
                <Textarea
                  id="review-notes"
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                  placeholder="Informe o motivo da aprovação ou recusa..."
                  rows={3}
                  className="text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSaveExceptionDecision('rejected')}
              disabled={isSavingDecision}
              className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50 text-xs font-bold"
            >
              Rejeitar Exceção
            </Button>
            <Button
              size="sm"
              onClick={() => handleSaveExceptionDecision('approved')}
              disabled={isSavingDecision}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
            >
              {isSavingDecision ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <ShieldCheck className="size-3.5 mr-1.5" />}
              Aprovar Exceção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </>
      )}
    </div>
  );
}

export default function GeneralTeachingReportsPage() {
  return (
    <VolunteeringProvider>
      <GeneralTeachingReportsContent />
    </VolunteeringProvider>
  );
}
