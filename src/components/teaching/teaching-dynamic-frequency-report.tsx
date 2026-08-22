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

  // ── ESTADOS DE FILTRO DE PAPEL / LIDERANÇA ───────────────────────
  const [selectedLeadershipRole, setSelectedLeadershipRole] = useState<LeadershipFilterType>('all');

  // ── ESTADOS DE FILTRO ACADÊMICO & ESTRUTURA ──────────────────────
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

  // Turmas filtradas
  const filteredClasses = useMemo(() => {
    return classes.filter(cls => {
      if (selectedCycle !== 'all' && cls.cycle !== selectedCycle) return false;
      if (selectedCourseId !== 'all' && cls.courseId !== selectedCourseId) return false;
      if (selectedClassId !== 'all' && cls.id !== selectedClassId) return false;
      return true;
    });
  }, [classes, selectedCycle, selectedCourseId, selectedClassId]);

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
          phone: userObj?.phone || userObj?.whatsapp || '',
          email: userObj?.email || '',
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
  const getWhatsAppLink = (phone: string, studentName: string, courseName: string, rate: number, missedCount: number) => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) return null;
    const finalPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const firstName = studentName.split(' ')[0];
    const text = encodeURIComponent(
      `Olá, ${firstName}! Tudo bem? Paz do Senhor! Passando para falar sobre o seu curso *${courseName}*. Notamos que sua frequência atual está em *${rate}%* (${missedCount} falta(s)). Queremos te apoiar para você repor as aulas necessárias e concluir o curso com sucesso! Podemos te ajudar com o material de reposição?`
    );
    return `https://wa.me/${finalPhone}?text=${text}`;
  };

  return (
    <div className="space-y-6 pb-12 print:p-0">
      {/* ── TOPO DO QUADRO DINÂMICO ──────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 print-hide">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Sliders className="size-5 text-indigo-600" />
            Quadro Dinâmico de Frequência &amp; Liderança
          </h2>
          <p className="text-xs text-muted-foreground font-semibold">
            Filtre instantaneamente alunos e líderes de GC por faixas exatas de frequência, operadores matemáticos e cursos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleExportExcel}
            disabled={isExportingExcel || sortedStudentsList.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-sm h-8"
          >
            {isExportingExcel ? <Loader2 className="size-3.5 animate-spin" /> : <FileSpreadsheet className="size-3.5" />}
            Exportar Excel ({sortedStudentsList.length})
          </Button>
          <Button onClick={() => window.print()} variant="outline" className="font-bold text-xs gap-1.5 bg-white h-8">
            <Printer className="size-3.5" />
            Imprimir
          </Button>
        </div>
      </div>

      {/* ── CARD RESUMO INTELIGENTE DINÂMICO ──────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:grid-cols-2">
        <Card className="border-2 border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-white shadow-sm md:col-span-2">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-sm shrink-0">
              <Target className="size-6" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase text-indigo-900 tracking-wider">Resultado dos Critérios</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-black text-slate-900">{totalFilteredStudents}</span>
                <span className="text-xs text-muted-foreground font-bold">
                  aluno(s) encontrado(s)
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-600 mt-1">
                Média de presença do grupo filtrado: <span className="font-black text-indigo-700">{averageFilteredRate}%</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 bg-white shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground">Filtro de Liderança</p>
              <p className="text-sm font-black text-slate-800 mt-1 flex items-center gap-1.5">
                {selectedLeadershipRole === 'gc_leaders' && '👑 Líderes de GC'}
                {selectedLeadershipRole === 'gc_coliders' && '👥 Co-Líderes de GC'}
                {selectedLeadershipRole === 'gc_supervisors' && '🗺️ Supervisores/Área'}
                {selectedLeadershipRole === 'volunteers' && '🤝 Voluntários'}
                {selectedLeadershipRole === 'members' && '👤 Membros/Alunos'}
                {selectedLeadershipRole === 'all' && '🌐 Todos os Papéis'}
              </p>
            </div>
            <Badge variant="outline" className="text-xs font-bold bg-slate-50">
              {totalFilteredStudents}
            </Badge>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 bg-white shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground">Critério de Frequência</p>
              <p className="text-sm font-black text-slate-800 mt-1">
                {filterMode === 'range' ? `${minRate}% a ${maxRate}%` : `${operator === 'lte' ? '≤' : operator === 'lt' ? '<' : operator === 'gte' ? '≥' : operator === 'gt' ? '>' : '='} ${targetRate}%`}
              </p>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "text-xs font-black",
                (filterMode === 'range' ? maxRate : targetRate) < 40
                  ? "bg-red-50 text-red-700 border-red-200"
                  : (filterMode === 'range' ? maxRate : targetRate) < 75
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
              )}
            >
              Ativo
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* ── PAINEL PRINCIPAL DE FILTROS DINÂMICOS ─────────────────── */}
      <Card className="shadow-sm border border-slate-200 bg-white print-hide">
        <CardHeader className="py-3 px-4 bg-slate-50/80 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-2">
          <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Sliders className="size-3.5 text-primary" />
            Configuração dos Filtros Dinâmicos
          </CardTitle>

          {/* Presets Rápidos */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-black uppercase text-muted-foreground mr-1">Atalhos:</span>
            <Button
              variant={activePreset === 'critical' ? 'default' : 'outline'}
              size="sm"
              onClick={() => applyPreset('critical')}
              className={cn(
                "h-6 text-[10px] font-bold px-2",
                activePreset === 'critical' ? "bg-red-600 hover:bg-red-700 text-white" : "text-red-700 border-red-200 hover:bg-red-50"
              )}
            >
              🔴 Crítico (0 - 39%) ({distributionStats.critical})
            </Button>
            <Button
              variant={activePreset === 'warning' ? 'default' : 'outline'}
              size="sm"
              onClick={() => applyPreset('warning')}
              className={cn(
                "h-6 text-[10px] font-bold px-2",
                activePreset === 'warning' ? "bg-amber-600 hover:bg-amber-700 text-white" : "text-amber-700 border-amber-200 hover:bg-amber-50"
              )}
            >
              🟡 Atenção (40 - 74%) ({distributionStats.warning})
            </Button>
            <Button
              variant={activePreset === 'passing' ? 'default' : 'outline'}
              size="sm"
              onClick={() => applyPreset('passing')}
              className={cn(
                "h-6 text-[10px] font-bold px-2",
                activePreset === 'passing' ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "text-emerald-700 border-emerald-200 hover:bg-emerald-50"
              )}
            >
              🟢 Regular (≥ 75%) ({distributionStats.passing + distributionStats.perfect})
            </Button>
            <Button
              variant={activePreset === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => applyPreset('all')}
              className="h-6 text-[10px] font-bold px-2"
            >
              Todos (0 - 100%)
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-4">
          {/* Linha 1: Filtros de Frequência e Papel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-3 bg-slate-50/50 rounded-xl border border-slate-100">
            {/* Modo de Filtro de Frequência */}
            <div className="space-y-1">
              <Label className="text-[11px] font-black text-slate-700">Modo de Frequência</Label>
              <Select
                value={filterMode}
                onValueChange={(v: FrequencyFilterMode) => {
                  setFilterMode(v);
                  setActivePreset('custom');
                }}
              >
                <SelectTrigger className="h-8 text-xs bg-white font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="range">Faixa (% Mínimo até % Máximo)</SelectItem>
                  <SelectItem value="operator">Operador Matemático (&gt;, &lt;, =)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Inputs de Frequência Condicionais */}
            {filterMode === 'range' ? (
              <>
                <div className="space-y-1">
                  <Label className="text-[11px] font-black text-slate-700">Presença Mínima (%)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={minRate}
                      onChange={e => {
                        setMinRate(Number(e.target.value));
                        setActivePreset('custom');
                      }}
                      className="h-8 text-xs bg-white font-bold"
                    />
                    <span className="text-xs font-bold text-muted-foreground">%</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-black text-slate-700">Presença Máxima (%)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={maxRate}
                      onChange={e => {
                        setMaxRate(Number(e.target.value));
                        setActivePreset('custom');
                      }}
                      className="h-8 text-xs bg-white font-bold"
                    />
                    <span className="text-xs font-bold text-muted-foreground">%</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <Label className="text-[11px] font-black text-slate-700">Operador</Label>
                  <Select
                    value={operator}
                    onValueChange={(v: FrequencyOperator) => {
                      setOperator(v);
                      setActivePreset('custom');
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs bg-white font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lte">≤ Menor ou Igual a</SelectItem>
                      <SelectItem value="lt">&lt; Menor que</SelectItem>
                      <SelectItem value="gte">≥ Maior ou Igual a</SelectItem>
                      <SelectItem value="gt">&gt; Maior que</SelectItem>
                      <SelectItem value="eq">= Exatamente Igual a</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-black text-slate-700">Valor Alvo (%)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={targetRate}
                      onChange={e => {
                        setTargetRate(Number(e.target.value));
                        setActivePreset('custom');
                      }}
                      className="h-8 text-xs bg-white font-bold"
                    />
                    <span className="text-xs font-bold text-muted-foreground">%</span>
                  </div>
                </div>
              </>
            )}

            {/* Filtro de Papel de Liderança */}
            <div className="space-y-1">
              <Label className="text-[11px] font-black text-indigo-950 flex items-center gap-1">
                <span>👑</span> Papel / Liderança
              </Label>
              <Select
                value={selectedLeadershipRole}
                onValueChange={(v: LeadershipFilterType) => setSelectedLeadershipRole(v)}
              >
                <SelectTrigger className="h-8 text-xs bg-white font-black border-indigo-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">🌐 Todos os Alunos</SelectItem>
                  <SelectItem value="gc_leaders">👑 Apenas Líderes de GC</SelectItem>
                  <SelectItem value="gc_coliders">👥 Co-Líderes de GC</SelectItem>
                  <SelectItem value="gc_supervisors">🗺️ Supervisores / Área / Rede</SelectItem>
                  <SelectItem value="volunteers">🤝 Voluntários em Serviço</SelectItem>
                  <SelectItem value="members">👤 Membros / Novos Convertidos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Linha 2: Filtros Acadêmicos & GC */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-slate-600">Ciclo</Label>
              <Select value={selectedCycle} onValueChange={setSelectedCycle}>
                <SelectTrigger className="h-8 text-xs bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Ciclos</SelectItem>
                  {cycles.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-slate-600">Curso</Label>
              <Select value={selectedCourseId} onValueChange={(v) => { setSelectedCourseId(v); setSelectedClassId('all'); }}>
                <SelectTrigger className="h-8 text-xs bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Cursos</SelectItem>
                  {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-slate-600">Turma</Label>
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

            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-slate-600">Rede (GC)</Label>
              <Select value={selectedRedeId} onValueChange={(v) => { setSelectedRedeId(v); setSelectedAreaId('all'); setSelectedCellId('all'); }}>
                <SelectTrigger className="h-8 text-xs bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Redes</SelectItem>
                  {redes.map(r => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-slate-600">Área (GC)</Label>
              <Select value={selectedAreaId} onValueChange={(v) => { setSelectedAreaId(v); setSelectedCellId('all'); }}>
                <SelectTrigger className="h-8 text-xs bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Áreas</SelectItem>
                  {filteredAreas.map(a => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── TABELA NOMINAL DOS ALUNOS FILTRADOS ───────────────────── */}
      <Card className="shadow-sm border border-slate-200 bg-white">
        <CardHeader className="py-3 px-4 bg-slate-50/80 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-primary" />
            <CardTitle className="text-sm font-black text-slate-800">
              Alunos Filtrados ({totalFilteredStudents})
            </CardTitle>
          </div>

          <div className="flex flex-wrap items-center gap-2 print-hide">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, GC ou curso..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="h-8 pl-8 text-xs bg-white"
              />
            </div>

            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="h-8 text-xs w-[120px] bg-white font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 por pág.</SelectItem>
                <SelectItem value="25">25 por pág.</SelectItem>
                <SelectItem value="50">50 por pág.</SelectItem>
                <SelectItem value="0">Todos ({totalFilteredStudents})</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
                  <TableHead onClick={() => handleSort('studentName')} className="cursor-pointer font-black text-[11px] text-slate-700">
                    <div className="flex items-center gap-1">
                      Aluno
                      {sortColumn === 'studentName' && (sortDirection === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                    </div>
                  </TableHead>
                  <TableHead onClick={() => handleSort('leadership')} className="cursor-pointer font-black text-[11px] text-slate-700">
                    <div className="flex items-center gap-1">
                      Cargo / Papel
                      {sortColumn === 'leadership' && (sortDirection === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                    </div>
                  </TableHead>
                  <TableHead onClick={() => handleSort('gcName')} className="cursor-pointer font-black text-[11px] text-slate-700">
                    <div className="flex items-center gap-1">
                      Célula (GC)
                      {sortColumn === 'gcName' && (sortDirection === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                    </div>
                  </TableHead>
                  <TableHead onClick={() => handleSort('courseName')} className="cursor-pointer font-black text-[11px] text-slate-700">
                    <div className="flex items-center gap-1">
                      Curso &amp; Turma
                      {sortColumn === 'courseName' && (sortDirection === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                    </div>
                  </TableHead>
                  <TableHead onClick={() => handleSort('presentsCount')} className="cursor-pointer font-black text-[11px] text-slate-700 text-center">
                    <div className="flex items-center justify-center gap-1">
                      Presenças / Aulas
                      {sortColumn === 'presentsCount' && (sortDirection === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                    </div>
                  </TableHead>
                  <TableHead onClick={() => handleSort('totalRate')} className="cursor-pointer font-black text-[11px] text-slate-700 text-center">
                    <div className="flex items-center justify-center gap-1">
                      Frequência (%)
                      {sortColumn === 'totalRate' && (sortDirection === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                    </div>
                  </TableHead>
                  <TableHead className="font-black text-[11px] text-slate-700 text-center">
                    Status
                  </TableHead>
                  <TableHead className="font-black text-[11px] text-slate-700 text-right print-hide">
                    Contato
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {paginatedStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-sm text-muted-foreground">
                      Nenhum aluno encontrado para os critérios selecionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedStudents.map((item, idx) => {
                    const waLink = getWhatsAppLink(item.phone, item.studentName, item.courseName, item.totalRate, item.absencesCount);

                    return (
                      <TableRow key={`${item.studentId}_${item.classId}_${idx}`} className="hover:bg-slate-50/50">
                        {/* Aluno */}
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <Avatar className="size-8 border">
                              <AvatarImage src={item.photoURL} alt={item.studentName} />
                              <AvatarFallback className="text-[10px] font-bold">
                                {item.studentName.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-bold text-xs text-slate-800">{item.studentName}</p>
                              {item.phone && (
                                <p className="text-[10px] text-muted-foreground font-mono">{item.phone}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Cargo / Papel */}
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn("text-[10px] font-bold border px-1.5 py-0.5", item.leadership.badgeClass)}
                          >
                            <span className="mr-1">{item.leadership.icon}</span>
                            {item.leadership.badgeLabel}
                          </Badge>
                        </TableCell>

                        {/* GC */}
                        <TableCell>
                          <p className="text-xs font-semibold text-slate-700">{item.gcName}</p>
                          {item.redeName !== '—' && (
                            <p className="text-[10px] text-muted-foreground">{item.redeName}</p>
                          )}
                        </TableCell>

                        {/* Curso & Turma */}
                        <TableCell>
                          <p className="text-xs font-bold text-slate-800">{item.courseName}</p>
                          <p className="text-[10px] text-muted-foreground">{item.className}</p>
                        </TableCell>

                        {/* Presenças */}
                        <TableCell className="text-center">
                          <span className="text-xs font-black text-slate-800">
                            {item.presentsCount} / {item.lessonsConducted}
                          </span>
                          {item.repositionsCount > 0 && (
                            <span className="text-[9px] text-amber-600 font-bold block">
                              ({item.repositionsCount} reposição)
                            </span>
                          )}
                        </TableCell>

                        {/* Frequência com Barra */}
                        <TableCell className="text-center w-36">
                          <div className="space-y-1">
                            <span className={cn(
                              "text-xs font-black",
                              item.totalRate < 40 ? "text-red-600" : item.totalRate < 75 ? "text-amber-600" : "text-emerald-600"
                            )}>
                              {item.totalRate}%
                            </span>
                            <Progress
                              value={item.totalRate}
                              className="h-1.5"
                            />
                          </div>
                        </TableCell>

                        {/* Status */}
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] font-bold",
                              item.eligible
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-red-50 text-red-700 border-red-200"
                            )}
                          >
                            {item.statusLabel}
                          </Badge>
                        </TableCell>

                        {/* Ações / WhatsApp */}
                        <TableCell className="text-right print-hide">
                          {waLink ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <a
                                    href={waLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center size-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                                  >
                                    <MessageCircle className="size-3.5" />
                                  </a>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">Enviar aviso de reposição via WhatsApp</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">—</span>
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
            <div className="flex items-center justify-between p-3 border-t border-slate-100 bg-slate-50/50 print-hide">
              <p className="text-xs text-muted-foreground font-semibold">
                Mostrando {paginatedStudents.length} de {totalFilteredStudents} alunos
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={safeCurrentPage === 1}
                  className="h-7 text-xs font-bold"
                >
                  <ChevronLeft className="size-3.5 mr-1" /> Anterior
                </Button>
                <span className="text-xs font-bold px-2">
                  {safeCurrentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage === totalPages}
                  className="h-7 text-xs font-bold"
                >
                  Próxima <ChevronRight className="size-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
