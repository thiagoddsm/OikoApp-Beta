'use client';

import React, { useState, useMemo } from 'react';
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
  Award,
  Layers,
  MapPin,
  Sparkles,
  Filter,
  X,
  Search,
  GraduationCap
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMembersData, useCoursesData, useGCData } from "@/hooks/useDomainData";
import Link from 'next/link';

function GeneralTeachingReportsContent() {
  const { users } = useMembersData();
  const { courses, classes, enrollmentRequests } = useCoursesData();
  const { cells, areas, redes } = useGCData();

  // Estados dos filtros acadêmicos
  const [selectedCycle, setSelectedCycle] = useState<string>('all');
  const [selectedTrack, setSelectedTrack] = useState<string>('all');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');

  // Filtros de Período Separados (Opção 2)
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

  // Controle de expansão das aulas por curso
  const [expandedCourses, setExpandedCourses] = useState<Record<string, boolean>>({});

  // Obter ciclos únicos ordenados
  const cycles = useMemo(() => {
    const set = new Set<string>();
    classes.forEach(c => { if (c.cycle) set.add(c.cycle); });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [classes]);

  // Helper de data para AULAS MINISTRADAS (Frequência & Diário)
  const isLessonDateInRange = (dateStr: string) => {
    if (!lessonDateStart && !lessonDateEnd) return true;
    const cleanDate = dateStr.split('T')[0];
    if (lessonDateStart && cleanDate < lessonDateStart) return false;
    if (lessonDateEnd && cleanDate > lessonDateEnd) return false;
    return true;
  };

  // Mapa de datas de inscrição dos alunos (por solicitação ou cadastro)
  const enrollmentDateMap = useMemo(() => {
    const map = new Map<string, Date>();
    (enrollmentRequests || []).forEach((r: any) => {
      let d: Date | null = null;
      if (r.createdAt?.toDate) d = r.createdAt.toDate();
      else if (r.createdAt?.seconds) d = new Date(r.createdAt.seconds * 1000);
      else if (r.createdAt) {
        try { d = new Date(r.createdAt); } catch {}
      }
      if (!d) return;

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
        if (r.courseId) {
          const compositeKey = `${key}_${r.courseId}`;
          if (!map.has(compositeKey) || d! > map.get(compositeKey)!) {
            map.set(compositeKey, d!);
          }
        }
        if (!map.has(key) || d! > map.get(key)!) {
          map.set(key, d!);
        }
      });
    });
    return map;
  }, [enrollmentRequests]);

  // Helper de data para INSCRIÇÕES / MATRÍCULAS
  const isEnrollmentDateInRange = (studentId: string, courseId?: string) => {
    if (!enrollmentDateStart && !enrollmentDateEnd) return true;

    const u = userMap.get(studentId) || users.find(user => user.id === studentId);
    let date: Date | null = null;

    // 1. Cruzamento por ID do aluno
    if (courseId && enrollmentDateMap.has(`${studentId}_${courseId}`)) {
      date = enrollmentDateMap.get(`${studentId}_${courseId}`)!;
    } else if (enrollmentDateMap.has(studentId)) {
      date = enrollmentDateMap.get(studentId)!;
    }

    // 2. Cruzamento por E-mail do aluno
    if (!date && u?.email) {
      const emailKey = `email:${String(u.email).trim().toLowerCase()}`;
      if (courseId && enrollmentDateMap.has(`${emailKey}_${courseId}`)) {
        date = enrollmentDateMap.get(`${emailKey}_${courseId}`)!;
      } else if (enrollmentDateMap.has(emailKey)) {
        date = enrollmentDateMap.get(emailKey)!;
      }
    }

    // 3. Cruzamento por Telefone do aluno
    if (!date && (u?.phone || u?.whatsapp)) {
      const cleanPhone = String(u.phone || u.whatsapp || '').replace(/\D/g, '');
      if (cleanPhone) {
        const phoneKey = `phone:${cleanPhone}`;
        if (courseId && enrollmentDateMap.has(`${phoneKey}_${courseId}`)) {
          date = enrollmentDateMap.get(`${phoneKey}_${courseId}`)!;
        } else if (enrollmentDateMap.has(phoneKey)) {
          date = enrollmentDateMap.get(phoneKey)!;
        }
      }
    }

    // 4. Cruzamento por Nome do aluno
    if (!date && u?.name) {
      const nameKey = `name:${String(u.name).trim().toLowerCase()}`;
      if (courseId && enrollmentDateMap.has(`${nameKey}_${courseId}`)) {
        date = enrollmentDateMap.get(`${nameKey}_${courseId}`)!;
      } else if (enrollmentDateMap.has(nameKey)) {
        date = enrollmentDateMap.get(nameKey)!;
      }
    }

    // 5. Cruzamento por data salva na jornada do aluno
    if (!date && u?.journey?.enrolledAt?.[courseId || '']) {
      const val = u.journey.enrolledAt[courseId || ''];
      if (val?.toDate) date = val.toDate();
      else if (val?.seconds) date = new Date(val.seconds * 1000);
      else { try { date = new Date(val); } catch {} }
    }

    // Se houver filtro de período ativo e o aluno não possui registro de matrícula detectado, descarta do período
    if (!date) return false;

    const cleanDate = date.toISOString().split('T')[0];
    if (enrollmentDateStart && cleanDate < enrollmentDateStart) return false;
    if (enrollmentDateEnd && cleanDate > enrollmentDateEnd) return false;
    return true;
  };

  const clearDateFilters = () => {
    setLessonDateStart('');
    setLessonDateEnd('');
    setEnrollmentDateStart('');
    setEnrollmentDateEnd('');
  };

  const hasActiveDateFilter = !!(lessonDateStart || lessonDateEnd || enrollmentDateStart || enrollmentDateEnd);

  // ── FILTRAGEM CASCATA DE GCs E ÁREAS ─────────────────────────────────────────
  const filteredAreas = useMemo(() => {
    if (selectedRedeId === 'all') return areas;
    return areas.filter(a => a.redeId === selectedRedeId);
  }, [areas, selectedRedeId]);

  const filteredCells = useMemo(() => {
    return cells.filter(c => {
      const cStatus = (c as any).status;
      const isAtv = cStatus === 'active' || cStatus === 'growing' || !cStatus;
      if (!isAtv) return false;
      if (selectedAreaId !== 'all') return c.areaId === selectedAreaId;
      if (selectedRedeId !== 'all') {
        const areaOfCell = areas.find(a => a.id === c.areaId);
        return c.redeId === selectedRedeId || areaOfCell?.redeId === selectedRedeId;
      }
      return true;
    });
  }, [cells, areas, selectedRedeId, selectedAreaId]);

  // Mapas rápidos para O(1) lookups
  const cellMap = useMemo(() => {
    const map = new Map<string, any>();
    cells.forEach(c => map.set(c.id, c));
    return map;
  }, [cells]);

  const userCellMap = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach(u => {
      const cid = u.cellId || u.hierarchy?.celulaId || u.gcId;
      if (cid) map.set(u.id, cid);
    });
    return map;
  }, [users]);

  const userMap = useMemo(() => {
    const map = new Map<string, any>();
    users.forEach(u => map.set(u.id, u));
    return map;
  }, [users]);

  // Status de filtro de GC ativo
  const isGcFilterActive = selectedRedeId !== 'all' || selectedAreaId !== 'all' || selectedCellId !== 'all';

  // ── MOTOR DE ESCOPO DE ALUNOS (matchingStudentIds) ───────────────────────────
  const matchingStudentIds = useMemo(() => {
    if (!isGcFilterActive) return null; // null = sem filtro de GC (todos)

    const targetCellIds = new Set<string>();
    cells.forEach(c => {
      if (selectedCellId !== 'all') {
        if (c.id === selectedCellId) targetCellIds.add(c.id);
        return;
      }
      if (selectedAreaId !== 'all') {
        if (c.areaId === selectedAreaId) targetCellIds.add(c.id);
        return;
      }
      if (selectedRedeId !== 'all') {
        const areaOfCell = areas.find(a => a.id === c.areaId);
        if (c.redeId === selectedRedeId || areaOfCell?.redeId === selectedRedeId) {
          targetCellIds.add(c.id);
        }
        return;
      }
    });

    const studentIds = new Set<string>();
    users.forEach(u => {
      const cid = u.cellId || u.hierarchy?.celulaId || u.gcId;
      if (cid && targetCellIds.has(cid)) {
        studentIds.add(u.id);
      }
    });

    return studentIds;
  }, [isGcFilterActive, cells, areas, users, selectedRedeId, selectedAreaId, selectedCellId]);

  // Função auxiliar para verificar se um estudante está no escopo de GC ativo
  const isStudentInScope = (studentId: string) => {
    if (!matchingStudentIds) return true;
    return matchingStudentIds.has(studentId);
  };

  const clearGcFilters = () => {
    setSelectedRedeId('all');
    setSelectedAreaId('all');
    setSelectedCellId('all');
  };

  // Filtrar turmas pelo ciclo ativo e trilho selecionado
  const filteredClassesByCycleAndTrack = useMemo(() => {
    let result = classes;
    if (selectedCycle !== 'all') {
      result = result.filter(c => c.cycle === selectedCycle);
    }
    if (selectedTrack !== 'all') {
      result = result.filter(c => {
        const course = courses.find(co => co.id === c.courseId);
        if (!course) return false;
        if (selectedTrack === 'eletivo') {
          return (course.ebdTrack as any) === 'eletivo' || (course as any).type === 'eletivo';
        }
        return (course.ebdTrack as any) === selectedTrack;
      });
    }
    return result;
  }, [classes, courses, selectedCycle, selectedTrack]);

  // Obter cursos únicos baseados nas turmas filtradas pelo ciclo/trilho
  const filteredCoursesByCycle = useMemo(() => {
    const courseIds = new Set(filteredClassesByCycleAndTrack.map(c => c.courseId));
    return courses.filter(c => courseIds.has(c.id));
  }, [courses, filteredClassesByCycleAndTrack]);

  // Filtrar turmas considerando também o curso selecionado e a turma selecionada
  const filteredClasses = useMemo(() => {
    let result = filteredClassesByCycleAndTrack;
    if (selectedCourseId !== 'all') {
      result = result.filter(c => c.courseId === selectedCourseId);
    }
    if (selectedClassId !== 'all') {
      result = result.filter(c => c.id === selectedClassId);
    }
    return result;
  }, [filteredClassesByCycleAndTrack, selectedCourseId, selectedClassId]);

  const toggleCourseExpanded = (courseId: string) => {
    setExpandedCourses(prev => ({ ...prev, [courseId]: !prev[courseId] }));
  };

  // ── 1. CÁLCULO DE INSCRITOS POR CURSO (COM FILTRO DE GC & INSCRIÇÃO) ───────
  const enrollmentStats = useMemo(() => {
    let totalInscritos = 0;
    const distribution: Record<string, { name: string; count: number; track: string }> = {};

    filteredClasses.forEach(cls => {
      const course = courses.find(c => c.id === cls.courseId);
      if (!course) return;

      const activeStudents = (cls.students || []).filter(stId => 
        isStudentInScope(stId) && isEnrollmentDateInRange(stId, course.id)
      );
      const studentCount = activeStudents.length;
      totalInscritos += studentCount;

      if (!distribution[course.id]) {
        distribution[course.id] = { 
          name: course.name, 
          count: 0, 
          track: course.ebdTrack || 'discipulado' 
        };
      }
      distribution[course.id].count += studentCount;
    });

    return {
      total: totalInscritos,
      list: Object.entries(distribution).map(([id, info]) => ({ id, ...info })).sort((a, b) => b.count - a.count)
    };
  }, [filteredClasses, courses, matchingStudentIds, enrollmentDateStart, enrollmentDateEnd]);

  // ── 2. CÁLCULO DE FREQUÊNCIA E PRESENÇAS (COM FILTRO DE GC & AULAS) ──────────
  const frequencyStats = useMemo(() => {
    let totalPossibilities = 0;
    let totalPresents = 0;
    const courseFreq: Record<string, { total: number; presents: number }> = {};

    filteredClasses.forEach(cls => {
      const course = courses.find(c => c.id === cls.courseId);
      if (!course) return;

      const resolved = getResolvedSchedule(cls, course);
      const activeDates = new Set(resolved.map(r => r.dateStr));

      if (!courseFreq[course.id]) {
        courseFreq[course.id] = { total: 0, presents: 0 };
      }

      const activeStudents = (cls.students || []).filter(stId => 
        isStudentInScope(stId) && isEnrollmentDateInRange(stId, course.id)
      );
      activeStudents.forEach(studentId => {
        cls.attendance?.forEach(att => {
          if (!activeDates.has(att.date)) return;
          if (!isLessonDateInRange(att.date)) return; // Filtro de data de aula ministrada

          const isPresent = att.presentStudentIds?.includes(studentId) || att.onlineStudentIds?.includes(studentId);
          const isRepo = att.repositions?.some(r => r.studentId === studentId);

          if (isPresent || isRepo) {
            totalPresents++;
            courseFreq[course.id].presents++;
          }
          totalPossibilities++;
          courseFreq[course.id].total++;
        });
      });
    });

    const averageGlobal = totalPossibilities > 0 ? Math.round((totalPresents / totalPossibilities) * 100) : 0;

    const list = Object.entries(courseFreq).map(([id, stats]) => {
      const course = courses.find(c => c.id === id);
      return {
        id,
        name: course?.name || 'Desconhecido',
        average: stats.total > 0 ? Math.round((stats.presents / stats.total) * 100) : 0
      };
    }).sort((a, b) => b.average - a.average);

    return {
      globalAverage: averageGlobal,
      totalPresences: totalPresents,
      courseAverages: list
    };
  }, [filteredClasses, courses, lessonDateStart, lessonDateEnd, enrollmentDateStart, enrollmentDateEnd, matchingStudentIds]);

  // ── 3. DETALHAMENTO DE FREQUÊNCIA POR AULA ────────────────────────────────────
  const classesAndLessonsDetail = useMemo(() => {
    const result: Record<string, {
      courseName: string;
      lessons: {
        title: string;
        date: string;
        present: number;
        absent: number;
        rate: number;
      }[];
    }> = {};

    filteredClasses.forEach(cls => {
      const course = courses.find(c => c.id === cls.courseId);
      if (!course) return;

      const resolved = getResolvedSchedule(cls, course);

      resolved.forEach((session, index) => {
        if (!isLessonDateInRange(session.dateStr)) return; // Filtro de data de aula

        if (!result[course.id]) {
          result[course.id] = { courseName: course.name, lessons: [] };
        }

        const attRecord = cls.attendance?.find(a => a.date === session.dateStr);
        const uniquePresents = new Set<string>();
        attRecord?.presentStudentIds?.forEach(id => uniquePresents.add(id));
        attRecord?.onlineStudentIds?.forEach(id => uniquePresents.add(id));
        attRecord?.repositions?.forEach(r => uniquePresents.add(r.studentId));

        const activeStudents = (cls.students || []).filter(stId => 
          isStudentInScope(stId) && isEnrollmentDateInRange(stId, course.id)
        );
        const presentCount = Array.from(uniquePresents).filter(id => activeStudents.includes(id)).length;
        const totalStudents = activeStudents.length;
        const absentCount = Math.max(0, totalStudents - presentCount);
        const rate = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

        result[course.id].lessons.push({
          title: session.syllabusItem?.title || session.syllabusItem?.name || `Aula ${index + 1}`,
          date: session.dateStr,
          present: presentCount,
          absent: absentCount,
          rate
        });
      });
    });

    return result;
  }, [filteredClasses, courses, lessonDateStart, lessonDateEnd, enrollmentDateStart, enrollmentDateEnd, matchingStudentIds]);

  // ── 4. PROJEÇÃO DE APROVAÇÃO / REPROVAÇÃO ──────────────────────────────────────
  const approvalProjections = useMemo(() => {
    let totalInscritos = 0;
    let elegiveisHoje = 0;
    let projAprovados = 0;
    let projReprovados = 0;

    filteredClasses.forEach(cls => {
      const course = courses.find(c => c.id === cls.courseId);
      if (!course) return;

      const resolved = getResolvedSchedule(cls, course);
      const validSessions = resolved.filter(r => isLessonDateInRange(r.dateStr));
      const totalLessons = validSessions.length;
      if (totalLessons === 0) return;

      const minAttendanceRate = course.minAttendanceApproval || 75;
      const maxAbsencesAllowed = Math.floor((1 - (minAttendanceRate / 100)) * totalLessons);

      const activeStudents = (cls.students || []).filter(stId => 
        isStudentInScope(stId) && isEnrollmentDateInRange(stId, course.id)
      );
      totalInscritos += activeStudents.length;

      activeStudents.forEach(studentId => {
        let absencesCount = 0;
        let lessonsConducted = 0;
        let presentsCount = 0;

        cls.attendance?.forEach(att => {
          const isValidSession = validSessions.some(r => r.dateStr === att.date);
          if (!isValidSession) return;
          if (!isLessonDateInRange(att.date)) return;

          lessonsConducted++;
          const isPresent = att.presentStudentIds?.includes(studentId) || att.onlineStudentIds?.includes(studentId);
          const isRepo = att.repositions?.some(r => r.studentId === studentId);

          if (isPresent || isRepo) {
            presentsCount++;
          } else {
            absencesCount++;
          }
        });

        // ELEGÍVEL HOJE: Suas faltas atuais não ultrapassam o limite máximo de faltas do curso inteiro.
        const isEligible = absencesCount <= maxAbsencesAllowed;
        if (isEligible) {
          elegiveisHoje++;
        }

        // PROJEÇÃO FINAL
        if (lessonsConducted === totalLessons) {
          if (isEligible) projAprovados++;
          else projReprovados++;
        } else {
          if (isEligible) projAprovados++;
          else projReprovados++;
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
  }, [filteredClasses, courses, lessonDateStart, lessonDateEnd, enrollmentDateStart, enrollmentDateEnd, matchingStudentIds]);

  // ── 5. TABELA NOMINAL DE ALUNOS COM STATUS PEDAGÓGICO E VISÃO GC ─────────────
  const studentsFollowUpList = useMemo(() => {
    const list: {
      studentId: string;
      studentName: string;
      photoURL?: string;
      phone?: string;
      gcName: string;
      areaName: string;
      redeName: string;
      courseId: string;
      courseName: string;
      className: string;
      presentsCount: number;
      absencesCount: number;
      lessonsConducted: number;
      totalLessons: number;
      rate: number;
      status: 'elegivel' | 'risco' | 'critico' | 'concluido';
    }[] = [];

    filteredClasses.forEach(cls => {
      const course = courses.find(c => c.id === cls.courseId);
      if (!course) return;

      const resolved = getResolvedSchedule(cls, course);
      const validSessions = resolved.filter(r => isLessonDateInRange(r.dateStr));
      const totalLessons = validSessions.length;
      if (totalLessons === 0) return;

      const minAttendanceRate = course.minAttendanceApproval || 75;
      const maxAbsencesAllowed = Math.floor((1 - (minAttendanceRate / 100)) * totalLessons);

      const activeStudents = (cls.students || []).filter(stId => 
        isStudentInScope(stId) && isEnrollmentDateInRange(stId, course.id)
      );

      activeStudents.forEach(studentId => {
        const userObj = userMap.get(studentId);
        const cellId = userCellMap.get(studentId);
        const cellObj = cellId ? cellMap.get(cellId) : null;
        const areaObj = cellObj?.areaId ? areas.find(a => a.id === cellObj.areaId) : null;
        const redeObj = (cellObj?.redeId || areaObj?.redeId) ? redes.find(r => r.id === (cellObj?.redeId || areaObj?.redeId)) : null;

        let presentsCount = 0;
        let absencesCount = 0;
        let lessonsConducted = 0;

        cls.attendance?.forEach(att => {
          const isValidSession = validSessions.some(r => r.dateStr === att.date);
          if (!isValidSession) return;
          if (!isLessonDateInRange(att.date)) return;

          lessonsConducted++;
          const isPresent = att.presentStudentIds?.includes(studentId) || att.onlineStudentIds?.includes(studentId);
          const isRepo = att.repositions?.some(r => r.studentId === studentId);

          if (isPresent || isRepo) presentsCount++;
          else absencesCount++;
        });

        const rate = lessonsConducted > 0 ? Math.round((presentsCount / lessonsConducted) * 100) : 100;

        let status: 'elegivel' | 'risco' | 'critico' | 'concluido' = 'elegivel';
        if (absencesCount > maxAbsencesAllowed) {
          status = 'critico'; // Já ultrapassou o limite máximo de faltas do curso
        } else if (absencesCount === maxAbsencesAllowed && lessonsConducted < totalLessons) {
          status = 'risco'; // No limite máximo permitido de faltas
        } else if (lessonsConducted === totalLessons && absencesCount <= maxAbsencesAllowed) {
          status = 'concluido';
        }

        list.push({
          studentId,
          studentName: userObj?.name || 'Aluno',
          photoURL: userObj?.profilePicture || userObj?.photoURL,
          phone: userObj?.phone || userObj?.whatsapp,
          gcName: cellObj?.nome || 'Sem GC vinculado',
          areaName: areaObj?.nome || '—',
          redeName: redeObj?.nome || '—',
          courseId: course.id,
          courseName: course.name,
          className: cls.name,
          presentsCount,
          absencesCount,
          lessonsConducted,
          totalLessons,
          rate,
          status
        });
      });
    });

    // Filtro por termo de busca se houver
    let result = list;
    if (studentSearchTerm.trim()) {
      const term = studentSearchTerm.toLowerCase();
      result = result.filter(s => 
        s.studentName.toLowerCase().includes(term) ||
        s.gcName.toLowerCase().includes(term) ||
        s.courseName.toLowerCase().includes(term) ||
        s.className.toLowerCase().includes(term)
      );
    }

    return result.sort((a, b) => {
      const priority = { critico: 0, risco: 1, elegivel: 2, concluido: 3 };
      if (priority[a.status] !== priority[b.status]) {
        return priority[a.status] - priority[b.status];
      }
      return a.studentName.localeCompare(b.studentName);
    });
  }, [filteredClasses, courses, isStudentInScope, userMap, userCellMap, cellMap, areas, redes, lessonDateStart, lessonDateEnd, enrollmentDateStart, enrollmentDateEnd, studentSearchTerm]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print:space-y-4 print:p-0">
      {/* CSS para Impressão PDF */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body {
            background: white !important;
            color: black !important;
            font-size: 12px !important;
          }
          .print-hide {
            display: none !important;
          }
          .print-full {
            width: 100% !important;
            max-width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-card {
            page-break-inside: avoid !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 8px !important;
            margin-bottom: 12px !important;
          }
        }
      `}} />

      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border shadow-sm print-card">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Award className="size-6 text-primary print-hide" />
            Dashboard Gerencial do Ensino
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Acompanhe a saúde pedagógica, frequência e projeções de aprovação com filtros por Célula, Área e Rede.
          </p>
        </div>

        <Button onClick={handlePrint} variant="outline" className="h-10 font-bold uppercase gap-1.5 print-hide shrink-0">
          <Printer className="size-4" /> Imprimir Relatório
        </Button>
      </div>

      {/* ── BARRA DE FILTROS DUPLA: ACADÊMICO + ESTRUTURA CELULAR ──────────── */}
      <Card className="shadow-sm border border-slate-100 bg-white print-hide">
        <CardContent className="p-4 space-y-4">
          {/* Seção 1: Filtros Acadêmicos */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <BookOpen className="size-3.5 text-primary" />
              <span>Filtros Acadêmicos &amp; Turmas</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* Seletor de Trilho */}
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase text-slate-500">Trilho</Label>
                <Select value={selectedTrack} onValueChange={(val) => {
                  setSelectedTrack(val);
                  setSelectedCourseId('all');
                  setSelectedClassId('all');
                }}>
                  <SelectTrigger className="bg-white font-bold h-9 text-xs">
                    <SelectValue placeholder="Todos os Trilhos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">Todos os Trilhos</SelectItem>
                    <SelectItem value="discipulado" className="text-xs">Trilho de Discipulado</SelectItem>
                    <SelectItem value="biblico" className="text-xs">Trilho Bíblico</SelectItem>
                    <SelectItem value="teologico" className="text-xs">Trilho Teológico</SelectItem>
                    <SelectItem value="eletivo" className="text-xs">Eletivas &amp; Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Seletor de Ciclo */}
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase text-slate-500">Ciclo</Label>
                <Select value={selectedCycle} onValueChange={(val) => {
                  setSelectedCycle(val);
                  setSelectedCourseId('all');
                  setSelectedClassId('all');
                }}>
                  <SelectTrigger className="bg-white font-bold h-9 text-xs">
                    <SelectValue placeholder="Todos os Ciclos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">Todos os Ciclos</SelectItem>
                    {cycles.map(c => (
                      <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Seletor de Curso */}
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase text-slate-500">Curso</Label>
                <Select value={selectedCourseId} onValueChange={(val) => {
                  setSelectedCourseId(val);
                  setSelectedClassId('all');
                }}>
                  <SelectTrigger className="bg-white font-bold h-9 text-xs">
                    <SelectValue placeholder="Todos os Cursos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">Todos os Cursos</SelectItem>
                    {filteredCoursesByCycle.map(course => (
                      <SelectItem key={course.id} value={course.id} className="text-xs">{course.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Seletor de Turma */}
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase text-slate-500">Turma</Label>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger className="bg-white font-bold h-9 text-xs">
                    <SelectValue placeholder="Todas as Turmas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">Todas as Turmas</SelectItem>
                    {filteredClassesByCycleAndTrack
                      .filter(c => selectedCourseId === 'all' || c.courseId === selectedCourseId)
                      .map(cls => (
                        <SelectItem key={cls.id} value={cls.id} className="text-xs">{cls.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Divisor */}
          <div className="border-t border-slate-100" />

          {/* Seção 2: Estrutura Celular (Rede, Área e GC) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Users className="size-3.5 text-indigo-500" />
                <span>Acompanhamento por Estrutura Celular (GC)</span>
              </div>
              {isGcFilterActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearGcFilters}
                  className="h-6 text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 gap-1"
                >
                  <X className="size-3" /> Limpar filtros de GC
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Seletor de Rede */}
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1">
                  <Layers className="size-2.5" /> Rede
                </Label>
                <Select 
                  value={selectedRedeId} 
                  onValueChange={(val) => {
                    setSelectedRedeId(val);
                    setSelectedAreaId('all');
                    setSelectedCellId('all');
                  }}
                >
                  <SelectTrigger className="bg-white font-bold h-9 text-xs">
                    <SelectValue placeholder="Todas as Redes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs font-bold">Todas as Redes</SelectItem>
                    {redes.map(r => (
                      <SelectItem key={r.id} value={r.id} className="text-xs">{r.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Seletor de Área */}
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1">
                  <MapPin className="size-2.5" /> Área
                </Label>
                <Select 
                  value={selectedAreaId} 
                  onValueChange={(val) => {
                    setSelectedAreaId(val);
                    setSelectedCellId('all');
                  }}
                >
                  <SelectTrigger className="bg-white font-bold h-9 text-xs">
                    <SelectValue placeholder="Todas as Áreas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs font-bold">Todas as Áreas</SelectItem>
                    {filteredAreas.map(a => (
                      <SelectItem key={a.id} value={a.id} className="text-xs">{a.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Seletor de GC / Célula */}
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1">
                  <Sparkles className="size-2.5" /> Célula (GC)
                </Label>
                <Select 
                  value={selectedCellId} 
                  onValueChange={setSelectedCellId}
                >
                  <SelectTrigger className="bg-white font-bold h-9 text-xs">
                    <SelectValue placeholder="Todas as Células" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs font-bold">Todos os GCs</SelectItem>
                    {filteredCells.map(c => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Divisor */}
          <div className="border-t border-slate-100" />

          {/* Seção 3: Filtros por Período de Datas (Aulas vs Inscrições) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Calendar className="size-3.5 text-emerald-600" />
                <span>Filtros por Período</span>
              </div>
              {hasActiveDateFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearDateFilters}
                  className="h-6 text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 gap-1"
                >
                  <X className="size-3" /> Limpar datas do período
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Bloco 1: Período das Aulas Ministradas */}
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-slate-700 flex items-center gap-1.5">
                    🗓️ Período das Aulas Ministradas
                  </span>
                  <span className="text-[10px] text-muted-foreground">Frequência &amp; Diário</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold uppercase text-slate-500">De (Início)</Label>
                    <input
                      type="date"
                      className="flex h-8 w-full rounded-md border border-input bg-white px-2 py-1 text-xs font-bold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={lessonDateStart}
                      onChange={(e) => setLessonDateStart(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold uppercase text-slate-500">Até (Fim)</Label>
                    <input
                      type="date"
                      className="flex h-8 w-full rounded-md border border-input bg-white px-2 py-1 text-xs font-bold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={lessonDateEnd}
                      onChange={(e) => setLessonDateEnd(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Bloco 2: Período das Inscrições / Matrículas */}
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-slate-700 flex items-center gap-1.5">
                    📝 Período das Inscrições
                  </span>
                  <span className="text-[10px] text-muted-foreground">Data da Matrícula</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold uppercase text-slate-500">De (Início)</Label>
                    <input
                      type="date"
                      className="flex h-8 w-full rounded-md border border-input bg-white px-2 py-1 text-xs font-bold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={enrollmentDateStart}
                      onChange={(e) => setEnrollmentDateStart(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold uppercase text-slate-500">Até (Fim)</Label>
                    <input
                      type="date"
                      className="flex h-8 w-full rounded-md border border-input bg-white px-2 py-1 text-xs font-bold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={enrollmentDateEnd}
                      onChange={(e) => setEnrollmentDateEnd(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

            {/* Tag informativa de filtro de GC ativo */}
            {isGcFilterActive && (
              <div className="pt-1 flex items-center gap-2">
                <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-bold py-0.5 gap-1.5">
                  <Users className="size-3" />
                  Filtrando por GC: {enrollmentStats.total} aluno(s) matriculado(s) no escopo selecionado
                </Badge>
              </div>
            )}
        </CardContent>
      </Card>

      {/* Indicadores do Ciclo (KPI Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print-card">
        {/* Inscrições */}
        <Card className="shadow-sm border border-slate-100 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Inscrições</CardTitle>
            <Users className="size-4 text-indigo-500 print-hide" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-indigo-600">{enrollmentStats.total}</div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {isGcFilterActive ? 'Alunos do escopo celular ativo' : 'Alunos inscritos ativos'}
            </p>
          </CardContent>
        </Card>

        {/* Frequência Média */}
        <Card className="shadow-sm border border-slate-100 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Presença Média</CardTitle>
            <Percent className="size-4 text-emerald-500 print-hide" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-600">{frequencyStats.globalAverage}%</div>
            <p className="text-[10px] text-muted-foreground mt-1">{frequencyStats.totalPresences} presenças registradas</p>
          </CardContent>
        </Card>

        {/* Elegíveis Hoje */}
        <Card className="shadow-sm border border-slate-100 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Elegíveis Hoje</CardTitle>
            <TrendingUp className="size-4 text-blue-500 print-hide" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-blue-600">{approvalProjections.elegiveisHoje}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Dentro da margem de faltas permitidas</p>
          </CardContent>
        </Card>

        {/* Projeção de Aprovação */}
        <Card className="shadow-sm border border-slate-100 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Projeção Aprovados</CardTitle>
            <CheckCircle2 className="size-4 text-violet-500 print-hide" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-violet-600">{approvalProjections.projAprovados}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Projeção de reprovação: {approvalProjections.projReprovados}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── 6. NOVA TABELA: ACOMPANHAMENTO NOMINAL DOS ALUNOS POR GC ───────── */}
      <Card className="shadow-sm border border-slate-100 bg-white print-card">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-black uppercase text-slate-800 flex items-center gap-2">
                <GraduationCap className="size-4 text-indigo-600" />
                Acompanhamento Nominal dos Alunos (Visão GC)
              </CardTitle>
              <CardDescription className="text-xs">
                Monitore o engajamento e risco de reprovação individual dos membros da sua célula nos cursos
              </CardDescription>
            </div>

            <div className="w-full sm:w-[240px] relative print-hide">
              <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar aluno, GC ou curso..."
                value={studentSearchTerm}
                onChange={(e) => setStudentSearchTerm(e.target.value)}
                className="h-8 pl-8 text-xs font-semibold"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-9 text-[10px] font-black uppercase text-slate-500">Aluno</TableHead>
                <TableHead className="h-9 text-[10px] font-black uppercase text-slate-500">Célula / Estrutura</TableHead>
                <TableHead className="h-9 text-[10px] font-black uppercase text-slate-500">Curso &amp; Turma</TableHead>
                <TableHead className="h-9 text-[10px] font-black uppercase text-slate-500 text-center">Presenças</TableHead>
                <TableHead className="h-9 text-[10px] font-black uppercase text-slate-500 text-center">Frequência</TableHead>
                <TableHead className="h-9 text-[10px] font-black uppercase text-slate-500 text-center">Status Pedagógico</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {studentsFollowUpList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-xs text-muted-foreground italic">
                    Nenhum aluno encontrado para os filtros selecionados.
                  </TableCell>
                </TableRow>
              ) : (
                studentsFollowUpList.map((item, idx) => (
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

                    {/* Presenças / Aulas Realizadas */}
                    <TableCell className="py-2.5 text-center">
                      <span className="text-xs font-bold text-slate-700">
                        {item.presentsCount} / {item.lessonsConducted}
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        ({item.totalLessons} no total)
                      </span>
                    </TableCell>

                    {/* Frequência */}
                    <TableCell className="py-2.5 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black ${
                        item.rate >= 75 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 
                        item.rate >= 50 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 
                        'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {item.rate}%
                      </span>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="py-2.5 text-center">
                      {item.status === 'concluido' ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-bold text-[10px] gap-1">
                          <CheckCircle2 className="size-3" /> Formado
                        </Badge>
                      ) : item.status === 'elegivel' ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 font-bold text-[10px] gap-1">
                          <CheckCircle2 className="size-3" /> Elegível
                        </Badge>
                      ) : item.status === 'risco' ? (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 font-bold text-[10px] gap-1">
                          <AlertTriangle className="size-3" /> No Limite de Faltas
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300 font-bold text-[10px] gap-1">
                          <XCircle className="size-3" /> Excedeu Faltas
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribuição de Alunos e Frequência Média por Curso */}
        <div className="lg:col-span-1 space-y-6">
          {/* Distribuição */}
          <Card className="shadow-sm border border-slate-100 bg-white print-card">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase text-slate-800">Distribuição por Curso</CardTitle>
              <CardDescription className="text-xs">Número de alunos matriculados no período</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {enrollmentStats.list.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Nenhum aluno inscrito.</p>
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

          {/* Frequência Média */}
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

        {/* Frequência por Aula e Detalhamento */}
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

      {/* Relatório Gerencial Consolidado (Tabela de Impressão e Auditoria) */}
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
                  const stats = enrollmentStats.list.find(e => e.id === course.id);
                  const enrolled = stats?.count || 0;
                  const freq = frequencyStats.courseAverages.find(f => f.id === course.id)?.average || 0;

                  // Projeção local por curso
                  let localElegiveis = 0;
                  let localAprovados = 0;
                  let localReprovados = 0;

                  const courseClasses = filteredClasses.filter(c => c.courseId === course.id);
                  courseClasses.forEach(cls => {
                    const resolved = getResolvedSchedule(cls, course);
                    const totalLessons = resolved.length;
                    if (totalLessons === 0) return;

                    const minAttendanceRate = course.minAttendanceApproval || 75;
                    const maxAbsencesAllowed = Math.floor((1 - (minAttendanceRate / 100)) * totalLessons);

                    const activeStudents = (cls.students || []).filter(isStudentInScope);

                    activeStudents.forEach(studentId => {
                      let absencesCount = 0;
                      let lessonsConducted = 0;
                      let presentsCount = 0;

                      cls.attendance?.forEach(att => {
                        const isValidSession = resolved.some(r => r.dateStr === att.date);
                        if (!isValidSession) return;

                        lessonsConducted++;
                        const isPresent = att.presentStudentIds?.includes(studentId) || att.onlineStudentIds?.includes(studentId);
                        const isRepo = att.repositions?.some(r => r.studentId === studentId);

                        if (isPresent || isRepo) presentsCount++;
                        else absencesCount++;
                      });

                      if (absencesCount <= maxAbsencesAllowed) localElegiveis++;

                      const historicalRate = lessonsConducted > 0 ? (presentsCount / lessonsConducted) : 1.0;
                      const remainingLessons = Math.max(0, totalLessons - lessonsConducted);
                      const projectedPresents = presentsCount + (remainingLessons * historicalRate);
                      const projectedRate = (projectedPresents / totalLessons) * 100;

                      if (projectedRate >= minAttendanceRate && absencesCount <= maxAbsencesAllowed) {
                        localAprovados++;
                      } else {
                        localReprovados++;
                      }
                    });
                  });

                  return (
                    <TableRow key={course.id}>
                      <TableCell className="font-bold text-sm text-slate-800">{course.name}</TableCell>
                      <TableCell className="text-center font-bold text-slate-700">{enrolled}</TableCell>
                      <TableCell className="text-center font-black text-emerald-600">{freq}%</TableCell>
                      <TableCell className="text-center font-bold text-blue-600">{localElegiveis}</TableCell>
                      <TableCell className="text-center font-black text-indigo-600">{localAprovados}</TableCell>
                      <TableCell className="text-center font-bold text-red-500">{localReprovados}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
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
