'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  BarChart2,
  Users,
  Search,
  Filter,
  FileSpreadsheet,
  Download,
  Loader2,
  Phone,
  MessageCircle,
  Award,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Layers,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Sliders,
  Sparkles,
  RefreshCw,
  Clock,
  Printer,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Target
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { evaluateStudentAttendance } from '@/lib/teaching/attendance-calculator';
import { getResolvedSchedule } from '@/contexts/volunteering-context';

export type FrequencyFilterMode = 'range' | 'operator' | 'preset';
export type FrequencyOperator = 'lt' | 'lte' | 'gt' | 'gte' | 'eq';
export type LeadershipFilterType = 'all' | 'gc_leaders' | 'gc_coliders' | 'gc_supervisors' | 'gc_area_leaders' | 'volunteers' | 'members';

interface LeadershipRoleInfo {
  role: LeadershipFilterType;
  label: string;
  badgeLabel: string;
  icon: string;
  badgeClass: string;
}

/**
 * Função centralizada para detectar com precisão o papel de liderança do aluno
 */
export function getStudentLeadershipRole(
  userId: string,
  user: any,
  cells: any[],
  areas: any[],
  redes: any[]
): LeadershipRoleInfo {
  // 1. Líder de GC
  const isCellLider = cells.some((c: any) => c.liderId === userId || c.liderCasalId === userId);
  const isRoleLider = user?.hierarchy?.role === 'lider' || user?.isLiderGc === true || user?.role === 'lider_gc' || user?.isLider === true;
  if (isCellLider || isRoleLider) {
    return {
      role: 'gc_leaders',
      label: 'Líder de GC',
      badgeLabel: 'Líder de GC',
      icon: '👑',
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300'
    };
  }

  // 2. Co-Líder de GC
  const isCellCoLider = cells.some((c: any) =>
    c.coLiderIds?.includes(userId) ||
    c.coLideres?.some((cl: any) => cl.id === userId || cl.casalId === userId)
  );
  const isRoleCoLider = user?.hierarchy?.role === 'colider' || user?.isCoLider === true || user?.role === 'colider';
  if (isCellCoLider || isRoleCoLider) {
    return {
      role: 'gc_coliders',
      label: 'Co-Líder de GC',
      badgeLabel: 'Co-Líder',
      icon: '👥',
      badgeClass: 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/50 dark:text-purple-300'
    };
  }

  // 3. Supervisor / Líder de Área ou Rede
  const isSupervisor = cells.some((c: any) => c.supervisorId === userId) || user?.hierarchy?.role === 'supervisor' || user?.isSupervisor === true;
  const isAreaLider = areas.some((a: any) => a.liderId === userId || a.supervisorId === userId) || user?.hierarchy?.role === 'lider_area';
  const isRedeLider = redes.some((r: any) => r.liderId === userId || r.pastorId === userId) || user?.hierarchy?.role === 'lider_rede';
  if (isRedeLider || isAreaLider || isSupervisor) {
    return {
      role: 'gc_supervisors',
      label: 'Supervisor / Área / Rede',
      badgeLabel: 'Supervisor/Área',
      icon: '🗺️',
      badgeClass: 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300'
    };
  }

  // 4. Voluntário Ativo
  const isVolunteer =
    user?.isVolunteer === true ||
    user?.serviceStatus === 'serving' ||
    (Array.isArray(user?.serviceAreaIds) && user.serviceAreaIds.length > 0) ||
    (Array.isArray(user?.volunteeringAreas) && user.volunteeringAreas.length > 0) ||
    (Array.isArray(user?.serviceAreaNames) && user.serviceAreaNames.length > 0);
  if (isVolunteer) {
    return {
      role: 'volunteers',
      label: 'Voluntário',
      badgeLabel: 'Voluntário',
      icon: '🤝',
      badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300'
    };
  }

  // 5. Membro / Aluno
  return {
    role: 'members',
    label: 'Membro / Aluno',
    badgeLabel: 'Aluno',
    icon: '👤',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
  };
}

interface TeachingDynamicFrequencyReportProps {
  users: any[];
  courses: any[];
  classes: any[];
  cells: any[];
  areas: any[];
  redes: any[];
  enrollmentRequests?: any[];
}

export function TeachingDynamicFrequencyReport({
  users,
  courses,
  classes,
  cells,
  areas,
  redes,
  enrollmentRequests = []
}: TeachingDynamicFrequencyReportProps) {
  const { toast } = useToast();

  // ── ESTADOS DE FILTRO DE FREQUÊNCIA ──────────────────────────────
  const [filterMode, setFilterMode] = useState<FrequencyFilterMode>('range');
  const [minRate, setMinRate] = useState<number>(0);
  const [maxRate, setMaxRate] = useState<number>(40);
  const [operator, setOperator] = useState<FrequencyOperator>('lte');
  const [targetRate, setTargetRate] = useState<number>(60);
  const [activePreset, setActivePreset] = useState<string>('custom');
  const [isFiltersOpen, setIsFiltersOpen] = useState<boolean>(true);

  // ── ESTADOS DE FILTRO DE PAPEL / LIDERANÇA ───────────────────────
  const [selectedLeadershipRole, setSelectedLeadershipRole] = useState<LeadershipFilterType>('all');

  // ── ESTADOS DE FILTRO ACADÊMICO & ESTRUTURA ──────────────────────
  const [selectedTrack, setSelectedTrack] = useState<string>('all');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedCycle, setSelectedCycle] = useState<string>('all');
  const [selectedRedeId, setSelectedRedeId] = useState<string>('all');
  const [selectedAreaId, setSelectedAreaId] = useState<string>('all');
  const [selectedCellId, setSelectedCellId] = useState<string>('all');

  // Busca textual
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Paginação e Ordenação
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortColumn, setSortColumn] = useState<string>('totalRate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Exportação
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);

  // ── MAPAS O(1) ──────────────────────────────────────────────────
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

  // Mapa de papéis de liderança de cada usuário pré-calculado
  const userLeadershipMap = useMemo(() => {
    const map = new Map<string, LeadershipRoleInfo>();
    users.forEach(u => {
      map.set(u.id, getStudentLeadershipRole(u.id, u, cells, areas, redes));
    });
    return map;
  }, [users, cells, areas, redes]);

  // Cronogramas válidos pré-calculados
  const classScheduleMap = useMemo(() => {
    const map = new Map<string, { totalLessons: number; validSessions: any[] }>();
    classes.forEach(cls => {
      const course = courseMap.get(cls.courseId);
      const schedule = getResolvedSchedule(cls, course);
      const validSessions = schedule.filter(s => !s.isRepositionOnly);
      map.set(cls.id, {
        totalLessons: validSessions.length,
        validSessions
      });
    });
    return map;
  }, [classes, courseMap]);

  // Ciclos disponíveis
  const cycles = useMemo(() => {
    const set = new Set<string>();
    classes.forEach(c => { if (c.cycle) set.add(c.cycle); });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [classes]);

  // Áreas e Células filtradas
  const filteredAreas = useMemo(() => {
    if (selectedRedeId === 'all') return areas;
    return areas.filter(a => a.redeId === selectedRedeId);
  }, [areas, selectedRedeId]);

  const filteredCells = useMemo(() => {
    let result = cells;
    if (selectedRedeId !== 'all') result = result.filter(c => c.redeId === selectedRedeId);
    if (selectedAreaId !== 'all') result = result.filter(c => c.areaId === selectedAreaId);
    return result;
  }, [cells, selectedRedeId, selectedAreaId]);

  // Cursos filtrados por Ciclo e Trilha
  const filteredCourses = useMemo(() => {
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

  // Alunos em escopo de GC
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

  // ── AVALIAÇÃO NOMINAL DE TODOS OS ALUNOS NO ESCOPO ─────────────
  const allEvaluatedStudents = useMemo(() => {
    const list: any[] = [];

    filteredClasses.forEach(cls => {
      const course = courseMap.get(cls.courseId);
      if (!course) return;

      const sched = classScheduleMap.get(cls.id);
      if (!sched || sched.totalLessons === 0) return;
      const validSessionDates = sched.validSessions.map(s => s.dateStr);

      const enrolledIds = cls.students || [];

      enrolledIds.forEach((studentId: string) => {
        if (matchingStudentIds && !matchingStudentIds.has(studentId)) return;

        const userObj = userMap.get(studentId);
        const cellId = userCellMap.get(studentId);
        const cellObj = cellId ? cellMap.get(cellId) : null;
        const areaObj = cellObj?.areaId ? areaMap.get(cellObj.areaId) : null;
        const redeId = cellObj?.redeId || areaObj?.redeId;
        const redeObj = redeId ? redeMap.get(redeId) : null;
        const leadership = userLeadershipMap.get(studentId) || {
          role: 'members',
          label: 'Membro / Aluno',
          badgeLabel: 'Aluno',
          icon: '👤',
          badgeClass: 'bg-slate-100 text-slate-700'
        };

        const evalResult = evaluateStudentAttendance({
          classData: cls,
          courseData: course,
          studentId,
          validSessionDates
        });

        list.push({
          studentId,
          studentName: userObj?.name || 'Aluno',
          photoURL: userObj?.profilePicture || userObj?.photoURL,
          phone: userObj?.phone ? String(userObj.phone) : (userObj?.whatsapp ? String(userObj.whatsapp) : ''),
          email: userObj?.email ? String(userObj.email) : '',
          leadership,
          gcName: cellObj?.nome || 'Sem GC',
          areaName: areaObj?.nome || '—',
          redeName: redeObj?.nome || '—',
          classId: cls.id,
          className: cls.name,
          classData: cls,
          courseId: course.id,
          courseName: course.name,
          courseData: course,

          presentsCount: evalResult.totalPresent,
          inPersonCount: evalResult.inPersonCount,
          onlineCount: evalResult.onlineCount,
          repositionsCount: evalResult.repositionsCount,
          absencesCount: evalResult.absencesCount,
          lessonsConducted: evalResult.lessonsConducted,
          totalLessons: evalResult.totalLessons,
          totalRate: evalResult.totalRate,
          onlineRate: evalResult.onlineRate,
          inPersonRate: evalResult.inPersonRate,

          status: evalResult.status,
          statusLabel: evalResult.statusLabel,
          eligible: evalResult.eligible
        });
      });
    });

    // Deduplica por aluno e curso se nenhuma turma específica foi selecionada
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
          if (currentDate >= existingDate) {
            latestMap.set(key, item);
          }
        }
      });
      return Array.from(latestMap.values());
    }

    return list;
  }, [filteredClasses, courseMap, classScheduleMap, matchingStudentIds, userMap, userCellMap, cellMap, areaMap, redeMap, userLeadershipMap, selectedClassId]);

  // ── FILTRAGEM DINÂMICA DE FREQUÊNCIA & LIDERANÇA ────────────────
  const filteredStudentsList = useMemo(() => {
    return allEvaluatedStudents.filter(student => {
      // 1. Filtro de Liderança / Papel
      if (selectedLeadershipRole !== 'all') {
        if (selectedLeadershipRole === 'gc_leaders' && student.leadership.role !== 'gc_leaders') return false;
        if (selectedLeadershipRole === 'gc_coliders' && student.leadership.role !== 'gc_coliders') return false;
        if (selectedLeadershipRole === 'gc_supervisors' && student.leadership.role !== 'gc_supervisors') return false;
        if (selectedLeadershipRole === 'volunteers' && student.leadership.role !== 'volunteers') return false;
        if (selectedLeadershipRole === 'members' && student.leadership.role !== 'members') return false;
      }

      // 2. Filtro de Frequência (%)
      const rate = student.totalRate;

      if (filterMode === 'range') {
        const min = Math.min(minRate, maxRate);
        const max = Math.max(minRate, maxRate);
        if (rate < min || rate > max) return false;
      } else if (filterMode === 'operator') {
        switch (operator) {
          case 'lt':
            if (rate >= targetRate) return false;
            break;
          case 'lte':
            if (rate > targetRate) return false;
            break;
          case 'gt':
            if (rate <= targetRate) return false;
            break;
          case 'gte':
            if (rate < targetRate) return false;
            break;
          case 'eq':
            if (rate !== targetRate) return false;
            break;
        }
      }

      // 3. Busca textual
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matches =
          student.studentName.toLowerCase().includes(term) ||
          student.gcName.toLowerCase().includes(term) ||
          student.courseName.toLowerCase().includes(term) ||
          student.className.toLowerCase().includes(term) ||
          student.leadership.label.toLowerCase().includes(term);
        if (!matches) return false;
      }

      return true;
    });
  }, [allEvaluatedStudents, selectedLeadershipRole, filterMode, minRate, maxRate, operator, targetRate, searchTerm]);

  // ── HISTOGRAMA / DISTRIBUIÇÃO EM FAIXAS (DO GRUPO ATUAL) ───────
  const distributionStats = useMemo(() => {
    // Calcula sobre a lista com filtros de papel e curso (sem o filtro de % atual) para alimentar os badges de atalho
    const baseList = allEvaluatedStudents.filter(student => {
      if (selectedLeadershipRole !== 'all' && student.leadership.role !== selectedLeadershipRole) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        return (
          student.studentName.toLowerCase().includes(term) ||
          student.gcName.toLowerCase().includes(term) ||
          student.courseName.toLowerCase().includes(term) ||
          student.className.toLowerCase().includes(term)
        );
      }
      return true;
    });

    let critical = 0; // 0 - 39%
    let warning = 0;  // 40 - 74%
    let passing = 0;  // 75 - 99%
    let perfect = 0;  // 100%

    baseList.forEach(s => {
      if (s.totalRate === 100) perfect++;
      else if (s.totalRate >= 75) passing++;
      else if (s.totalRate >= 40) warning++;
      else critical++;
    });

    return {
      totalBase: baseList.length,
      critical,
      warning,
      passing,
      perfect
    };
  }, [allEvaluatedStudents, selectedLeadershipRole, searchTerm]);

  // ── ORDENAÇÃO ──────────────────────────────────────────────────
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedStudentsList = useMemo(() => {
    return [...filteredStudentsList].sort((a, b) => {
      let comparison = 0;
      switch (sortColumn) {
        case 'studentName':
          comparison = a.studentName.localeCompare(b.studentName, 'pt-BR');
          break;
        case 'leadership':
          comparison = a.leadership.label.localeCompare(b.leadership.label, 'pt-BR');
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
        case 'status':
          comparison = (a.eligible ? 1 : 0) - (b.eligible ? 1 : 0);
          break;
        default:
          comparison = a.totalRate - b.totalRate;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredStudentsList, sortColumn, sortDirection]);

  // Reset de página ao alterar filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [
    filterMode,
    minRate,
    maxRate,
    operator,
    targetRate,
    selectedLeadershipRole,
    selectedTrack,
    selectedCourseId,
    selectedClassId,
    selectedCycle,
    selectedRedeId,
    selectedAreaId,
    selectedCellId,
    searchTerm,
    sortColumn,
    sortDirection,
    pageSize
  ]);

  const totalFilteredStudents = sortedStudentsList.length;
  const totalPages = pageSize === 0 ? 1 : Math.max(1, Math.ceil(totalFilteredStudents / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedStudents = useMemo(() => {
    if (pageSize === 0) return sortedStudentsList;
    const start = (safeCurrentPage - 1) * pageSize;
    return sortedStudentsList.slice(start, start + pageSize);
  }, [sortedStudentsList, safeCurrentPage, pageSize]);

  // Média de presença dos alunos filtrados
  const averageFilteredRate = useMemo(() => {
    if (filteredStudentsList.length === 0) return 0;
    const sum = filteredStudentsList.reduce((acc, s) => acc + s.totalRate, 0);
    return Math.round(sum / filteredStudentsList.length);
  }, [filteredStudentsList]);

  // ── APLICAR PRESETS RÁPIDOS ────────────────────────────────────
  const applyPreset = (preset: string) => {
    setActivePreset(preset);
    switch (preset) {
      case 'critical':
        setFilterMode('range');
        setMinRate(0);
        setMaxRate(39);
        break;
      case 'warning':
        setFilterMode('range');
        setMinRate(40);
        setMaxRate(74);
        break;
      case 'passing':
        setFilterMode('operator');
        setOperator('gte');
        setTargetRate(75);
        break;
      case 'perfect':
        setFilterMode('operator');
        setOperator('eq');
        setTargetRate(100);
        break;
      case 'all':
        setFilterMode('range');
        setMinRate(0);
        setMaxRate(100);
        break;
    }
  };

  // ── EXPORTAÇÃO EXCEL (.xlsx) ───────────────────────────────────
  const handleExportExcel = async () => {
    if (sortedStudentsList.length === 0) {
      toast({ variant: 'destructive', title: 'Sem dados', description: 'Não há alunos filtrados para exportar.' });
      return;
    }

    setIsExportingExcel(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'OikoApp - Gestão de Ensino';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet('Quadro de Frequência');

      // Título
      const roleLabel = selectedLeadershipRole === 'all' ? 'Todos os Papéis' : userLeadershipMap.get(selectedLeadershipRole)?.label || selectedLeadershipRole;
      const courseLabel = selectedCourseId === 'all' ? 'Todos os Cursos' : courseMap.get(selectedCourseId)?.name || 'Curso';
      const freqDescription = filterMode === 'range' ? `${minRate}% a ${maxRate}%` : `${operator === 'lte' ? '≤' : operator === 'lt' ? '<' : operator === 'gte' ? '≥' : operator === 'gt' ? '>' : '='} ${targetRate}%`;

      worksheet.mergeCells('A1:J1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = `Quadro Dinâmico de Frequência — ${courseLabel} | ${roleLabel} | Freq: ${freqDescription}`;
      titleCell.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
      worksheet.getRow(1).height = 28;

      // Cabeçalhos
      const headers = [
        'Nome do Aluno',
        'Cargo / Papel',
        'Telefone',
        'Célula (GC)',
        'Área',
        'Rede',
        'Curso',
        'Turma',
        'Presenças / Aulas',
        'Frequência (%)',
        'Status Pedagógico'
      ];

      const headerRow = worksheet.addRow(headers);
      headerRow.height = 24;
      headerRow.eachCell(cell => {
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4338CA' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          bottom: { style: 'medium', color: { argb: 'FF1E293B' } }
        };
      });

      // Linhas
      sortedStudentsList.forEach((item, idx) => {
        const row = worksheet.addRow([
          item.studentName,
          item.leadership.label,
          item.phone || '—',
          item.gcName,
          item.areaName,
          item.redeName,
          item.courseName,
          item.className,
          `${item.presentsCount} / ${item.lessonsConducted}`,
          `${item.totalRate}%`,
          item.statusLabel
        ]);

        row.height = 20;
        const isZebra = idx % 2 === 1;

        row.eachCell((cell, colNum) => {
          cell.font = { name: 'Arial', size: 9 };
          if (isZebra) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          }
          if ([9, 10, 11].includes(colNum)) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          }
        });
      });

      // Ajuste de largura das colunas
      worksheet.columns.forEach(column => {
        let maxLen = 12;
        column.eachCell?.({ includeEmpty: false }, cell => {
          const valStr = cell.value ? String(cell.value) : '';
          if (valStr.length > maxLen) maxLen = valStr.length;
        });
        column.width = Math.min(Math.max(maxLen + 3, 12), 40);
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Quadro_Frequencia_${format(new Date(), 'yyyy-MM-dd_HHmm')}.xlsx`);

      toast({ title: 'Planilha Exportada!', description: 'Arquivo Excel baixado com sucesso.' });
    } catch (e: any) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Erro na exportação', description: 'Não foi possível gerar a planilha.' });
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Helper para formatar link do WhatsApp com mensagem de aviso contextual
  const getWhatsAppLink = (phone: any, studentName: any, courseName: any, rate: number, missedCount: number) => {
    if (!phone) return null;
    const phoneStr = String(phone).trim();
    const cleanPhone = phoneStr.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 8) return null;
    const finalPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const safeName = String(studentName || 'Aluno').trim();
    const firstName = safeName.split(' ')[0] || 'Aluno';
    const safeCourse = String(courseName || 'do Ensino');
    const text = encodeURIComponent(
      `Olá, ${firstName}! Tudo bem? Paz do Senhor! Passando para falar sobre o seu curso *${safeCourse}*. Notamos que sua frequência atual está em *${rate}%* (${missedCount} falta(s)). Queremos te apoiar para você repor as aulas necessárias e concluir o curso com sucesso! Podemos te ajudar com o material de reposição?`
    );
    return `https://wa.me/${finalPhone}?text=${text}`;
  };

  return (
    <div className="space-y-6 pb-12 print:p-0">
      {/* ── SUBHEADER: TÍTULO & BOTÕES DE AÇÃO ─────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print-hide">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Quadro Dinâmico
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Filtre instantaneamente alunos e líderes de GC.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => window.print()}
            variant="outline"
            className="font-bold text-xs gap-1.5 bg-white border-slate-200 text-slate-700 h-9 px-3.5 shadow-sm hover:bg-slate-50"
          >
            <Printer className="size-3.5" />
            Imprimir
          </Button>
          <Button
            onClick={handleExportExcel}
            disabled={isExportingExcel || sortedStudentsList.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5 shadow-sm h-9 px-4"
          >
            {isExportingExcel ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
            Exportar Excel ({sortedStudentsList.length})
          </Button>
        </div>
      </div>

      {/* ── 3 CARDS DE KPI & RESUMO (ESTILO MOCKUP STITCH) ─────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Alunos Filtrados */}
        <Card className="rounded-2xl border border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                <Users className="size-4" />
              </div>
              <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                Alunos Filtrados
              </span>
            </div>

            <div>
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                {totalFilteredStudents}
              </span>
              <p className="text-xs font-bold text-indigo-600 flex items-center gap-1 mt-1">
                <TrendingUp className="size-3.5" />
                Média de presença: {averageFilteredRate}%
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Filtro de Liderança */}
        <Card className="rounded-2xl border border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">
                  <Award className="size-4" />
                </div>
                <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  Filtro de Liderança
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-black bg-slate-100 text-slate-700">
                {totalFilteredStudents}
              </span>
            </div>

            <div>
              <p className="text-lg font-black text-slate-900 truncate">
                {selectedLeadershipRole === 'gc_leaders' && '👑 Líderes de GC'}
                {selectedLeadershipRole === 'gc_coliders' && '👥 Co-Líderes de GC'}
                {selectedLeadershipRole === 'gc_supervisors' && '🗺️ Supervisores/Área'}
                {selectedLeadershipRole === 'volunteers' && '🤝 Voluntários'}
                {selectedLeadershipRole === 'members' && '👤 Membros/Alunos'}
                {selectedLeadershipRole === 'all' && 'Todos os Papéis'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Critério de Frequência */}
        <Card className="rounded-2xl border border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs">
                  <Sliders className="size-4" />
                </div>
                <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  Critério de Frequência
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-50 text-amber-800 border border-amber-200/80">
                Ativo
              </span>
            </div>

            <div>
              <p className="text-xl font-black text-slate-900">
                {filterMode === 'range' ? `${minRate}% a ${maxRate}%` : `${operator === 'lte' ? '≤' : operator === 'lt' ? '<' : operator === 'gte' ? '≥' : operator === 'gt' ? '>' : '='} ${targetRate}%`}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── CARD DE FILTROS DINÂMICOS COM ACORDEÃO ───────────────── */}
      <Card className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden print-hide">
        <div className="p-4 bg-white border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            className="flex items-center gap-2 text-left group cursor-pointer"
          >
            <Filter className="size-4 text-slate-600 group-hover:text-indigo-600 transition-colors" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-900 group-hover:text-indigo-600 transition-colors">
              Filtros Dinâmicos
            </span>
          </button>

          {/* Atalhos Rápidos & Toggle */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              variant={activePreset === 'critical' ? 'default' : 'outline'}
              size="sm"
              onClick={() => applyPreset('critical')}
              className={cn(
                "h-7 text-[11px] font-black rounded-full px-3 transition cursor-pointer",
                activePreset === 'critical'
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "text-red-700 bg-red-50/70 border-red-200 hover:bg-red-100"
              )}
            >
              Crítico ({distributionStats.critical})
            </Button>
            <Button
              variant={activePreset === 'warning' ? 'default' : 'outline'}
              size="sm"
              onClick={() => applyPreset('warning')}
              className={cn(
                "h-7 text-[11px] font-black rounded-full px-3 transition cursor-pointer",
                activePreset === 'warning'
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : "text-amber-700 bg-amber-50/70 border-amber-200 hover:bg-amber-100"
              )}
            >
              Atenção ({distributionStats.warning})
            </Button>
            <Button
              variant={activePreset === 'passing' ? 'default' : 'outline'}
              size="sm"
              onClick={() => applyPreset('passing')}
              className={cn(
                "h-7 text-[11px] font-black rounded-full px-3 transition cursor-pointer",
                activePreset === 'passing'
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "text-emerald-700 bg-emerald-50/70 border-emerald-200 hover:bg-emerald-100"
              )}
            >
              Regular ({distributionStats.passing + distributionStats.perfect})
            </Button>

            <button
              type="button"
              onClick={() => setIsFiltersOpen(!isFiltersOpen)}
              className="size-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition ml-1 cursor-pointer"
            >
              {isFiltersOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </button>
          </div>
        </div>

        {isFiltersOpen && (
          <CardContent className="p-4 space-y-3 bg-slate-50/40">
            {/* Linha 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-black text-slate-600">Modo</Label>
                <Select
                  value={filterMode}
                  onValueChange={(v: FrequencyFilterMode) => {
                    setFilterMode(v);
                    setActivePreset('custom');
                  }}
                >
                  <SelectTrigger className="h-8 text-xs bg-white font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="range">Faixa (% Mín - Máx)</SelectItem>
                    <SelectItem value="operator">Operador (&gt;, &lt;, =)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filterMode === 'range' ? (
                <>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black text-slate-600">Mínima (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={minRate}
                      onChange={e => { setMinRate(Number(e.target.value)); setActivePreset('custom'); }}
                      className="h-8 text-xs bg-white font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black text-slate-600">Máxima (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={maxRate}
                      onChange={e => { setMaxRate(Number(e.target.value)); setActivePreset('custom'); }}
                      className="h-8 text-xs bg-white font-bold"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black text-slate-600">Operador</Label>
                    <Select value={operator} onValueChange={(v: FrequencyOperator) => { setOperator(v); setActivePreset('custom'); }}>
                      <SelectTrigger className="h-8 text-xs bg-white font-bold"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lte">≤ Menor ou Igual</SelectItem>
                        <SelectItem value="lt">&lt; Menor que</SelectItem>
                        <SelectItem value="gte">≥ Maior ou Igual</SelectItem>
                        <SelectItem value="gt">&gt; Maior que</SelectItem>
                        <SelectItem value="eq">= Igual a</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black text-slate-600">Valor Alvo (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={targetRate}
                      onChange={e => { setTargetRate(Number(e.target.value)); setActivePreset('custom'); }}
                      className="h-8 text-xs bg-white font-bold"
                    />
                  </div>
                </>
              )}

              {/* Papel / Liderança com Destaque Lavanda/Roxo do Mockup */}
              <div className="space-y-1">
                <Label className="text-[10px] font-black text-indigo-950">Papel</Label>
                <Select
                  value={selectedLeadershipRole}
                  onValueChange={(v: LeadershipFilterType) => setSelectedLeadershipRole(v)}
                >
                  <SelectTrigger className="h-8 text-xs bg-indigo-50/60 font-black border-indigo-300 text-indigo-950">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Alunos</SelectItem>
                    <SelectItem value="gc_leaders">👑 Apenas Líderes de GC</SelectItem>
                    <SelectItem value="gc_coliders">👥 Co-Líderes de GC</SelectItem>
                    <SelectItem value="gc_supervisors">🗺️ Supervisores / Área / Rede</SelectItem>
                    <SelectItem value="volunteers">🤝 Voluntários</SelectItem>
                    <SelectItem value="members">👤 Membros / Alunos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-black text-slate-600">Curso</Label>
                <Select value={selectedCourseId} onValueChange={(v) => { setSelectedCourseId(v); setSelectedClassId('all'); }}>
                  <SelectTrigger className="h-8 text-xs bg-white font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {filteredCourses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-black text-slate-600">Rede/Área</Label>
                <Select value={selectedRedeId} onValueChange={(v) => { setSelectedRedeId(v); setSelectedAreaId('all'); setSelectedCellId('all'); }}>
                  <SelectTrigger className="h-8 text-xs bg-white font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {redes.map(r => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Linha 2 de Filtros Complementares */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1 border-t border-slate-200/60">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500">Trilho</Label>
                <Select value={selectedTrack} onValueChange={(v) => { setSelectedTrack(v); setSelectedCourseId('all'); setSelectedClassId('all'); }}>
                  <SelectTrigger className="h-7 text-xs bg-white"><SelectValue /></SelectTrigger>
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
                <Label className="text-[10px] font-bold text-slate-500">Ciclo</Label>
                <Select value={selectedCycle} onValueChange={setSelectedCycle}>
                  <SelectTrigger className="h-7 text-xs bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Ciclos</SelectItem>
                    {cycles.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500">Turma</Label>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger className="h-7 text-xs bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Turmas</SelectItem>
                    {classes.filter(c => selectedCourseId === 'all' || c.courseId === selectedCourseId).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500">Célula (GC)</Label>
                <Select value={selectedCellId} onValueChange={setSelectedCellId}>
                  <SelectTrigger className="h-7 text-xs bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os GCs</SelectItem>
                    {filteredCells.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* ── TABELA NOMINAL DOS ALUNOS ────────────────────────────── */}
      <Card className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        {/* Barra de Busca e Quantidade */}
        <div className="p-4 bg-white border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print-hide">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
            <Input
              placeholder="Buscar aluno, GC ou curso..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="h-9 pl-9 text-xs bg-white border-slate-200 rounded-xl"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-xs font-bold text-slate-500">Mostrar:</span>
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="h-9 text-xs w-[90px] bg-white font-bold rounded-xl border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="0">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 border-b border-slate-100">
                <TableHead onClick={() => handleSort('studentName')} className="cursor-pointer font-black text-[11px] text-slate-500 uppercase tracking-wider py-3.5 px-4">
                  <div className="flex items-center gap-1">
                    ALUNO
                    {sortColumn === 'studentName' && (sortDirection === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                  </div>
                </TableHead>
                <TableHead onClick={() => handleSort('leadership')} className="cursor-pointer font-black text-[11px] text-slate-500 uppercase tracking-wider py-3.5 px-4">
                  <div className="flex items-center gap-1">
                    PAPEL / GC
                    {sortColumn === 'leadership' && (sortDirection === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                  </div>
                </TableHead>
                <TableHead onClick={() => handleSort('courseName')} className="cursor-pointer font-black text-[11px] text-slate-500 uppercase tracking-wider py-3.5 px-4">
                  <div className="flex items-center gap-1">
                    CURSO
                    {sortColumn === 'courseName' && (sortDirection === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                  </div>
                </TableHead>
                <TableHead onClick={() => handleSort('presentsCount')} className="cursor-pointer font-black text-[11px] text-slate-500 uppercase tracking-wider py-3.5 px-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    AULAS
                    {sortColumn === 'presentsCount' && (sortDirection === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                  </div>
                </TableHead>
                <TableHead onClick={() => handleSort('totalRate')} className="cursor-pointer font-black text-[11px] text-slate-500 uppercase tracking-wider py-3.5 px-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    FREQUÊNCIA
                    {sortColumn === 'totalRate' && (sortDirection === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                  </div>
                </TableHead>
                <TableHead className="font-black text-[11px] text-slate-500 uppercase tracking-wider py-3.5 px-4 text-center">
                  STATUS
                </TableHead>
                <TableHead className="font-black text-[11px] text-slate-500 uppercase tracking-wider py-3.5 px-4 text-right print-hide">
                  AÇÃO
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-slate-100">
              {paginatedStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-36 text-center text-sm text-slate-400 font-medium">
                    Nenhum aluno encontrado para os critérios selecionados.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedStudents.map((item, idx) => {
                  const waLink = getWhatsAppLink(item.phone, item.studentName, item.courseName, item.totalRate, item.absencesCount);

                  return (
                    <TableRow key={`${item.studentId}_${item.classId}_${idx}`} className="hover:bg-slate-50/60 transition-colors">
                      {/* ALUNO */}
                      <TableCell className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-9 border border-slate-200 shrink-0">
                            <AvatarImage src={item.photoURL} alt={item.studentName} />
                            <AvatarFallback className="text-xs font-extrabold bg-slate-100 text-slate-700">
                              {item.studentName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-bold text-xs text-slate-900">{item.studentName}</p>
                            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                              {item.phone || 'Sem telefone'}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* PAPEL / GC */}
                      <TableCell className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] font-black rounded-full px-2 py-0.5 border shadow-none", item.leadership.badgeClass)}
                        >
                          <span className="mr-1">{item.leadership.icon}</span>
                          {item.leadership.badgeLabel}
                        </Badge>
                        <p className="text-[11px] font-semibold text-slate-500 mt-1">
                          {item.gcName}
                        </p>
                      </TableCell>

                      {/* CURSO & TURMA */}
                      <TableCell className="py-3 px-4">
                        <p className="font-bold text-xs text-slate-900">{item.courseName}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{item.className}</p>
                      </TableCell>

                      {/* AULAS */}
                      <TableCell className="py-3 px-4 text-center">
                        <span className="text-xs font-bold text-slate-700">
                          {item.presentsCount} / {item.lessonsConducted}
                        </span>
                      </TableCell>

                      {/* FREQUÊNCIA */}
                      <TableCell className="py-3 px-4 text-center w-36">
                        <div className="flex items-center justify-center gap-2">
                          <span className={cn(
                            "text-xs font-black min-w-[32px] text-right",
                            item.totalRate < 40 ? "text-red-600" : item.totalRate < 75 ? "text-amber-600" : "text-emerald-600"
                          )}>
                            {item.totalRate}%
                          </span>
                          <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden shrink-0">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                item.totalRate < 40 ? "bg-red-500" : item.totalRate < 75 ? "bg-amber-500" : "bg-emerald-500"
                              )}
                              style={{ width: `${item.totalRate}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>

                      {/* STATUS */}
                      <TableCell className="py-3 px-4 text-center">
                        <span
                          className={cn(
                            "inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border",
                            item.eligible
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : item.totalRate >= 40
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-red-50 text-red-700 border-red-200"
                          )}
                        >
                          {item.eligible ? 'Apto' : item.totalRate >= 40 ? 'Atenção' : 'Insuficiente'}
                        </span>
                      </TableCell>

                      {/* AÇÃO */}
                      <TableCell className="py-3 px-4 text-right print-hide">
                        {waLink ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <a
                                  href={waLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-center size-8 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors shadow-sm"
                                >
                                  <MessageCircle className="size-4" />
                                </a>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs font-semibold">Enviar mensagem de apoio no WhatsApp</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginação */}
        {pageSize > 0 && totalFilteredStudents > 0 && (
          <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-white print-hide">
            <p className="text-xs text-slate-500 font-medium">
              Mostrando <span className="font-bold text-slate-800">{paginatedStudents.length}</span> de <span className="font-bold text-slate-800">{totalFilteredStudents}</span> alunos
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safeCurrentPage === 1}
                className="h-8 text-xs font-bold rounded-xl border-slate-200"
              >
                <ChevronLeft className="size-3.5 mr-1" /> Anterior
              </Button>
              <span className="text-xs font-black px-2 text-slate-700">
                {safeCurrentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage === totalPages}
                className="h-8 text-xs font-bold rounded-xl border-slate-200"
              >
                Próxima <ChevronRight className="size-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
