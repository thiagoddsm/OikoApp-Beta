'use client';
import React, { useMemo, useState } from 'react';
import { useVolunteering, type User, type Class, type Course } from '@/contexts/volunteering-context';
import { Loader2, Search, PlusCircle, ChevronRight, UserX, Download, FilterX, Upload } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import Link from 'next/link';
import { EnrollmentDialog } from './enrollment-dialog';
import { ImportEnrollmentsDialog } from './import-enrollments-dialog';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { useMembersData, useCoursesData } from "@/hooks/useDomainData";

interface StudentsManagementProps {
    filterCourseIds?: string[];
    defaultCourseId?: string;
}

export function StudentsManagement({ filterCourseIds, defaultCourseId }: StudentsManagementProps) {
    const { users } = useMembersData();
    const { courses, classes, enrollmentRequests, pedagogicalLogs, theoflixCourses } = useCoursesData();

  const { isLoading, updateClass } = useVolunteering();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTrackFilter, setSelectedTrackFilter] = useState<string>('all');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  
  const [isEnrollmentOpen, setEnrollmentOpen] = useState(false);
  const [isImportOpen, setImportOpen] = useState(false);
  const [isActionInProgress, setIsActionInProgress] = useState<string | null>(null);
  
  // Confirmação de exclusão
  const [deleteData, setDeleteData] = useState<{studentId: string, classId: string, className: string, studentName: string} | null>(null);

  const enrollments = useMemo(() => {
    if (!users || !classes || !courses) return [];

    const userMap = new Map(users.map(u => [u.id, u]));
    const courseMap = new Map(courses.map(c => [c.id, c]));

    const allEnrollments: { id: string; user: User; class: Class; course: Course }[] = [];
    const seenKeys = new Set<string>();

    classes.forEach(cls => {
        if (filterCourseIds && !filterCourseIds.includes(cls.courseId)) return;

        const course = courseMap.get(cls.courseId);
        if (course) {
            cls.students?.forEach(studentId => {
                const user = userMap.get(studentId);
                if (user) {
                    const key = `${user.id}-${cls.id}`;
                    if (!seenKeys.has(key)) {
                        seenKeys.add(key);
                        allEnrollments.push({
                            id: key,
                            user,
                            class: cls,
                            course
                        });
                    }
                }
            });
        }
    });

    return allEnrollments.sort((a, b) => a.user.name.localeCompare(b.user.name));
  }, [users, classes, courses, filterCourseIds]);


  const filteredEnrollments = useMemo(() => {
      if (!enrollments) return [];

      const normalize = (str: string) => 
          (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

      const term = normalize(searchTerm.trim());

      return enrollments.filter(enrollment => {
        const studentName = normalize(enrollment.user.name);
        const email = normalize(enrollment.user.email || '');
        const courseName = normalize(enrollment.course.name);
        const className = normalize(enrollment.class.name);

        const matchesSearch = 
            studentName.includes(term) ||
            email.includes(term) ||
            courseName.includes(term) ||
            className.includes(term);
            
        const matchesTrack = selectedTrackFilter === 'all' || enrollment.course.ebdTrack === selectedTrackFilter;
        const matchesCourse = selectedCourseFilter === 'all' || enrollment.course.id === selectedCourseFilter;
        const matchesClass = selectedClassFilter === 'all' || enrollment.class.id === selectedClassFilter;

        return matchesSearch && matchesTrack && matchesCourse && matchesClass;
      });
  }, [enrollments, searchTerm, selectedTrackFilter, selectedCourseFilter, selectedClassFilter]);

  const availableCoursesForFilter = useMemo(() => {
      if (!courses) return [];
      let filtered = courses;
      if (filterCourseIds) {
          filtered = filtered.filter(c => filterCourseIds.includes(c.id));
      }
      if (selectedTrackFilter !== 'all') {
          filtered = filtered.filter(c => c.ebdTrack === selectedTrackFilter);
      }
      return filtered;
  }, [courses, filterCourseIds, selectedTrackFilter]);

  const availableClassesForFilter = useMemo(() => {
      if (!classes) return [];
      if (selectedCourseFilter !== 'all') {
          return classes.filter(c => c.courseId === selectedCourseFilter);
      }
      
      if (selectedTrackFilter !== 'all') {
         const validCourseIds = availableCoursesForFilter.map(c => c.id);
         return classes.filter(c => validCourseIds.includes(c.courseId));
      }

      if (filterCourseIds) {
          return classes.filter(c => filterCourseIds.includes(c.courseId));
      }
      return classes;
  }, [classes, selectedCourseFilter, selectedTrackFilter, availableCoursesForFilter, filterCourseIds]);

  const handleConfirmDelete = async () => {
      if (!deleteData) return;
      const { studentId, classId, className, studentName } = deleteData;
      setIsActionInProgress(`${studentId}-${classId}`);
      try {
          const cls = classes.find(c => c.id === classId);
          if (cls) {
              const updatedStudents = (cls.students || []).filter(id => id !== studentId);
              await updateClass(classId, { students: updatedStudents });
              toast({ title: 'Matrícula Removida', description: `${studentName} removido da turma ${className}.` });
          } else {
              toast({ variant: 'destructive', title: 'Erro', description: 'Turma não encontrada.' });
          }
      } catch (error) {
          console.error("Erro ao remover:", error);
          toast({ variant: 'destructive', title: 'Erro ao remover', description: 'Falha na comunicação com o banco.' });
      } finally {
          setIsActionInProgress(null);
          setDeleteData(null);
      }
  };

  const exportToExcel = () => {
    if (filteredEnrollments.length === 0) {
        toast({ variant: 'destructive', title: 'Aviso', description: 'Não há dados para exportar.' });
        return;
    }

    const dataToExport = filteredEnrollments.map(e => ({
        'Nome do Aluno': e.user.name,
        'E-mail': e.user.email || 'Não informado',
        'Telefone': e.user.phone || 'Não informado',
        'Trilha': e.course.ebdTrack ? e.course.ebdTrack.charAt(0).toUpperCase() + e.course.ebdTrack.slice(1) : 'Outros',
        'Curso': e.course.name,
        'Escola/Ministério': e.course.ministryName,
        'Turma': e.class.name,
        'Horário': `${e.class.dayOfWeek || 'N/A'} às ${e.class.startTime || 'N/A'}`
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const wscols = [{ wch: 30 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
    worksheet['!cols'] = wscols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Matrículas");
    XLSX.writeFile(workbook, `matriculas_ibm_${new Date().getTime()}.xlsx`);
    toast({ title: 'Sucesso', description: 'Planilha exportada!' });
  };
  
  if (isLoading) {
    return <div className="flex items-center justify-center p-8 h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const hasActiveFilters = selectedTrackFilter !== 'all' || selectedCourseFilter !== 'all' || selectedClassFilter !== 'all' || searchTerm !== '';

  const clearFilters = () => {
      setSearchTerm('');
      setSelectedTrackFilter('all');
      setSelectedCourseFilter('all');
      setSelectedClassFilter('all');
  };

  return (
      <>
      <Card className="border-none shadow-none">
          <CardHeader className="flex flex-col gap-4 px-0">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                      <CardTitle>Alunos Matriculados</CardTitle>
                      <CardDescription>Visualize todos os alunos matriculados.</CardDescription>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                       <Button variant="outline" onClick={exportToExcel} className="hidden sm:flex" disabled={filteredEnrollments.length === 0}>
                            <Download className="mr-2 h-4 w-4"/> Exportar
                       </Button>
                       <Button variant="secondary" onClick={() => setImportOpen(true)} className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200">
                            <Upload className="mr-2 h-4 w-4"/> Importar Excel
                        </Button>
                       <Button onClick={() => setEnrollmentOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4"/> Nova Matrícula
                        </Button>
                  </div>
              </div>

              <div className="flex flex-col xl:flex-row items-center gap-3 bg-muted/30 p-3 rounded-lg border border-dashed">
                 <div className="relative w-full xl:w-[250px]">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Buscar por aluno, curso..." className="pl-8 bg-white h-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  </div>

                  <Select value={selectedTrackFilter} onValueChange={(val) => { setSelectedTrackFilter(val); setSelectedCourseFilter('all'); setSelectedClassFilter('all'); }}>
                      <SelectTrigger className="w-full xl:w-[160px] bg-white h-9"><SelectValue placeholder="Todas as Trilhas" /></SelectTrigger>
                      <SelectContent>
                          <SelectItem value="all">Todas as Trilhas</SelectItem>
                          <SelectItem value="discipulado">Trilha de Discipulado</SelectItem>
                          <SelectItem value="biblico">Trilha Bíblica</SelectItem>
                          <SelectItem value="teologico">Trilha Teológica</SelectItem>
                      </SelectContent>
                  </Select>

                  <Select value={selectedCourseFilter} onValueChange={(val) => { setSelectedCourseFilter(val); setSelectedClassFilter('all'); }}>
                      <SelectTrigger className="w-full xl:w-[200px] bg-white h-9"><SelectValue placeholder="Todos os Cursos" /></SelectTrigger>
                      <SelectContent>
                          <SelectItem value="all">Todos os Cursos</SelectItem>
                          {availableCoursesForFilter.map(course => <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>)}
                      </SelectContent>
                  </Select>

                  <Select value={selectedClassFilter} onValueChange={setSelectedClassFilter} disabled={availableClassesForFilter.length === 0}>
                      <SelectTrigger className="w-full xl:w-[200px] bg-white h-9"><SelectValue placeholder="Todas as Turmas" /></SelectTrigger>
                      <SelectContent>
                          <SelectItem value="all">Todas as Turmas</SelectItem>
                          {availableClassesForFilter.map(cls => <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>)}
                      </SelectContent>
                  </Select>

                  {hasActiveFilters && (
                      <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-destructive shrink-0 h-9" title="Limpar Filtros">
                          <FilterX className="size-4 mr-2" /> Limpar
                      </Button>
                  )}
              </div>
          </CardHeader>

          <CardContent className="px-0">
              <div className="rounded-lg border overflow-hidden">
                  <Table>
                      <TableHeader className="bg-muted/50">
                          <TableRow>
                              <TableHead>Aluno</TableHead>
                              <TableHead>Curso / Trilha</TableHead>
                              <TableHead>Turma</TableHead>
                              <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {filteredEnrollments.length === 0 ? (
                            <TableRow><TableCell colSpan={4} className="h-32 text-center text-muted-foreground italic">Nenhum aluno encontrado.</TableCell></TableRow>
                          ) : (
                            filteredEnrollments.map((enrollment) => {
                                const { user, course, class: cls } = enrollment;
                                const avatar = PlaceHolderImages.find(p => p.id === 'avatar-1');
                                const isRemoving = isActionInProgress === enrollment.id;
                                
                                return (
                                <TableRow key={enrollment.id} className="hover:bg-muted/30 group">
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9"><AvatarImage src={avatar?.imageUrl} alt={user.name} /><AvatarFallback>{user.name.charAt(0)}</AvatarFallback></Avatar>
                                            <div><p className="font-bold">{user.name}</p><p className="text-[10px] text-muted-foreground uppercase">{user.email || 'Sem e-mail'}</p></div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex flex-col items-start gap-1"><span className="text-sm font-semibold">{course.name}</span>{course.ebdTrack && <Badge variant="secondary" className="text-[9px] uppercase tracking-wider font-bold h-4">Trilha {course.ebdTrack}</Badge>}</div>
                                    </TableCell>
                                    <TableCell><div className="text-sm font-medium">{cls.name}</div><div className="text-[10px] text-muted-foreground">{cls.dayOfWeek} às {cls.startTime}</div></TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="sm" asChild className="transition-all"><Link href={`/dashboard/people/${user.id}`}>Ver Perfil <ChevronRight className="ml-1 size-3" /></Link></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" 
                                                onClick={() => setDeleteData({studentId: user.id, classId: cls.id, className: cls.name, studentName: user.name})}
                                                disabled={isRemoving}
                                            >
                                                {isRemoving ? <Loader2 className="animate-spin size-4" /> : <UserX className="size-4" />}
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )})
                          )}
                      </TableBody>
                  </Table>
              </div>
          </CardContent>
      </Card>
      
      <AlertDialog open={!!deleteData} onOpenChange={() => setDeleteData(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
                Esta ação removerá permanentemente a matrícula de <strong>{deleteData?.studentName}</strong> da turma <strong>{deleteData?.className}</strong>.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">Confirmar Exclusão</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <EnrollmentDialog 
        open={isEnrollmentOpen} 
        onOpenChange={setEnrollmentOpen} 
        initialCourseId={defaultCourseId || (filterCourseIds && filterCourseIds.length > 0 ? filterCourseIds[0] : null)}
      />
      <ImportEnrollmentsDialog open={isImportOpen} onOpenChange={setImportOpen} />
      </>
  );
}
