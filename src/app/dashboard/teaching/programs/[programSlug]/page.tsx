'use client';

import React, { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useTeachingPrograms } from '@/hooks/useTeachingPrograms';
import { CAPABILITIES_METADATA } from '@/lib/programs/capability-registry';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Music2, BookOpen, Hand, HeartHandshake, PlayCircle, GraduationCap, ArrowLeft, Users, DollarSign, CheckSquare, History, FileQuestion, PlusCircle, Folder, Pencil } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { VolunteeringProvider } from '@/contexts/volunteering-context';
import { WaveAdminDashboard } from '@/components/teaching/wave/admin-dashboard';
import { DisAdminDashboard } from '@/components/teaching/dis/dis-admin-dashboard';
import { WaveFinanceDashboard } from '@/components/teaching/wave/wave-finance-dashboard';
import { CourseFinanceHub } from '@/components/teaching/finance/course-finance-hub';
import { StudentsManagement } from '@/components/teaching/students-management';
import { ClassFormDialog } from '@/components/teaching/class-form-dialog';
import { HierarchicalMaterialsManager } from '@/components/teaching/materials/hierarchical-materials-manager';
import { useCoursesData, useMembersData } from '@/hooks/useDomainData';
import { useFirebase } from '@/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

const ICON_MAP: Record<string, any> = {
  Music2,
  BookOpen,
  Hand,
  HeartHandshake,
  PlayCircle,
  GraduationCap
};

export default function ProgramDetailPage() {
  const params = useParams();
  const programSlug = params.programSlug as string;
  const { programs, isLoading: loadingPrograms } = useTeachingPrograms();
  const { courses, classes, isLoading: loadingCourses } = useCoursesData();
  const { users } = useMembersData();
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [isClassFormOpen, setClassFormOpen] = useState(false);
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedClassForEdit, setSelectedClassForEdit] = useState<any>(null);

  const program = useMemo(() => {
    return programs.find(p => p.slug === programSlug || p.id === programSlug);
  }, [programs, programSlug]);

  const userMap = useMemo(() => new Map(users.map(u => [u.id, u.name])), [users]);

  // Filter courses & classes that belong to this program
  const programCourses = useMemo(() => {
    if (!courses || !program) return [];
    const slugLower = program.slug.toLowerCase();
    const nameLower = program.name.toLowerCase();

    return courses.filter((c: any) => {
      if (c.schoolId) return c.schoolId.toLowerCase() === slugLower;
      if (c.programId) return c.programId.toLowerCase() === slugLower;
      if (c.ministryName) return c.ministryName.toLowerCase() === slugLower || nameLower.includes(c.ministryName.toLowerCase());
      if (c.ministry) return c.ministry.toLowerCase() === slugLower;
      return false;
    });
  }, [courses, program]);

  const programCourseIds = useMemo(() => new Set(programCourses.map(c => c.id)), [programCourses]);

  const programClasses = useMemo(() => {
    if (!classes) return [];
    if (programCourseIds.size > 0) {
      return classes.filter(cls => programCourseIds.has(cls.courseId));
    }
    return classes;
  }, [classes, programCourseIds]);

  const primaryCourseId = programCourses[0]?.id || '';

  const handleNewClassClick = async () => {
    let targetCourseId = selectedCourseId || primaryCourseId;
    if (!targetCourseId && program && firestore) {
      setIsCreatingCourse(true);
      try {
        const docRef = await addDoc(collection(firestore, 'courses'), {
          name: `Mentoria ${program.name}`,
          ministryName: program.name,
          ministry: program.slug,
          schoolId: program.slug,
          programId: program.id,
          createdAt: Timestamp.now()
        });
        targetCourseId = docRef.id;
        setSelectedCourseId(targetCourseId);
        toast({ title: 'Curso Criado', description: `Curso padrão para "${program.name}" criado com sucesso.` });
      } catch (err) {
        console.error("Erro ao criar curso padrão:", err);
        toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível criar o curso padrão.' });
        setIsCreatingCourse(false);
        return;
      }
      setIsCreatingCourse(false);
    }
    setClassFormOpen(true);
  };

  const isLoading = loadingPrograms || loadingCourses;
  const IconComponent = (program?.icon ? ICON_MAP[program.icon] : null) || GraduationCap;
  const capabilities = program?.capabilities || [];

  if (isLoading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <Loader2 className="size-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="py-12 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Programa Não Encontrado</h2>
        <p className="text-slate-500 text-sm">O programa de ensino "{programSlug}" não existe ou foi arquivado.</p>
        <Link href="/dashboard/teaching/programs">
          <Button variant="outline"><ArrowLeft className="mr-2 size-4" /> Voltar aos Programas</Button>
        </Link>
      </div>
    );
  }

  return (
    <VolunteeringProvider>
      <div className="space-y-6">
        {/* Program Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/teaching/programs">
              <Button variant="ghost" size="icon" className="size-9">
                <ArrowLeft className="size-5 text-slate-500" />
              </Button>
            </Link>
            <div className="p-3 rounded-2xl text-white shadow-sm" style={{ backgroundColor: program.color || '#6366f1' }}>
              <IconComponent className="size-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{program.name}</h1>
                <Badge variant="outline" className="text-xs uppercase">{program.attendanceMode}</Badge>
              </div>
              <p className="text-sm text-slate-500 line-clamp-1">{program.description}</p>
            </div>
          </div>
        </div>

        {program.slug === 'wave' ? (
          <WaveAdminDashboard />
        ) : program.slug === 'dis' || program.slug === 'libras' ? (
          <DisAdminDashboard />
        ) : (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="flex flex-wrap h-auto p-1 bg-slate-100 dark:bg-slate-850 rounded-xl mb-6">
              <TabsTrigger value="overview" className="rounded-lg text-xs font-semibold py-2">
                Visão Geral
              </TabsTrigger>
              <TabsTrigger value="courses" className="rounded-lg text-xs font-semibold py-2">
                Cursos &amp; Turmas
              </TabsTrigger>

              {capabilities.includes('financial') && (
                <TabsTrigger value="financial" className="rounded-lg text-xs font-semibold py-2 flex items-center gap-1.5">
                  <DollarSign className="size-3.5" /> Financeiro
                </TabsTrigger>
              )}

              {capabilities.includes('electronic_point') && (
                <TabsTrigger value="diario" className="rounded-lg text-xs font-semibold py-2 flex items-center gap-1.5">
                  <CheckSquare className="size-3.5" /> Ponto &amp; Diário
                </TabsTrigger>
              )}

              {capabilities.includes('replacement_queue') && (
                <TabsTrigger value="reposicoes" className="rounded-lg text-xs font-semibold py-2 flex items-center gap-1.5">
                  <History className="size-3.5" /> Reposições
                </TabsTrigger>
              )}

              {capabilities.includes('quizzes') && (
                <TabsTrigger value="quizzes" className="rounded-lg text-xs font-semibold py-2 flex items-center gap-1.5">
                  <FileQuestion className="size-3.5" /> Quizzes &amp; EAD
                </TabsTrigger>
              )}

              <TabsTrigger value="materials" className="rounded-lg text-xs font-semibold py-2 flex items-center gap-1.5">
                <Folder className="size-3.5" /> Materiais
              </TabsTrigger>

              <TabsTrigger value="students" className="rounded-lg text-xs font-semibold py-2 flex items-center gap-1.5">
                <Users className="size-3.5" /> Alunos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <Card className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl">
                <CardHeader>
                  <CardTitle>Painel do Programa: {program.name}</CardTitle>
                  <CardDescription>Resumo de atividades e turmas ativas deste programa.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950">
                      <p className="text-xs text-slate-400">Capacidades Ativas</p>
                      <p className="text-2xl font-bold text-indigo-600 mt-1">{capabilities.length}</p>
                    </div>
                    <div className="p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950">
                      <p className="text-xs text-slate-400">Modalidade de Frequência</p>
                      <p className="text-2xl font-bold text-emerald-600 capitalize mt-1">{program.attendanceMode}</p>
                    </div>
                    <div className="p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950">
                      <p className="text-xs text-slate-400">Identificador Interno</p>
                      <p className="text-xl font-bold text-slate-700 dark:text-slate-300 mt-1">{program.slug}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="courses">
              <Card className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl">
                <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle>Turmas e Agendas de {program.name}</CardTitle>
                    <CardDescription>Gestão de disciplinas, horários de aula, salas e mentores alocados.</CardDescription>
                  </div>
                  <Button size="sm" onClick={handleNewClassClick} disabled={isCreatingCourse} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                    <PlusCircle className="mr-2 size-4" /> Nova Turma / Mentoria
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                    <div className="overflow-x-auto w-full">
<Table>
                      <TableHeader className="bg-slate-50 dark:bg-slate-850">
                        <TableRow>
                          <TableHead>Turma</TableHead>
                          <TableHead>Mentor / Professor</TableHead>
                          <TableHead>Horário</TableHead>
                          <TableHead className="text-center">Alunos</TableHead>
                          <TableHead className="text-right">Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {programClasses.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                              Nenhuma turma cadastrada neste programa ainda. Clique no botão acima para adicionar!
                            </TableCell>
                          </TableRow>
                        ) : (
                          programClasses.map(cls => (
                            <TableRow key={cls.id}>
                              <TableCell className="font-bold">{cls.name}</TableCell>
                              <TableCell>{userMap.get(cls.teacherId) || 'A definir'}</TableCell>
                              <TableCell className="text-xs text-slate-500">
                                {cls.dayOfWeek} das {cls.startTime} às {cls.endTime}
                              </TableCell>
                              <TableCell className="text-center font-semibold">
                                {cls.students?.length || 0}
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                  {cls.status || 'Ativa'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedClassForEdit(cls)}
                                  aria-label={`Editar turma ${cls.name}`}
                                >
                                  <Pencil className="mr-1.5 size-3.5" /> Editar
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
</div>
                  </div>
                </CardContent>
              </Card>

              <ClassFormDialog
                open={isClassFormOpen}
                onOpenChange={setClassFormOpen}
                courseId={selectedCourseId || primaryCourseId}
              />

              {selectedClassForEdit && (
                <ClassFormDialog
                  open={Boolean(selectedClassForEdit)}
                  onOpenChange={(open) => {
                    if (!open) setSelectedClassForEdit(null);
                  }}
                  existingClass={selectedClassForEdit}
                  courseId={selectedClassForEdit.courseId}
                />
              )}
            </TabsContent>

            {capabilities.includes('financial') && (
              <TabsContent value="financial">
                {program.slug === 'wave' ? (
                  <WaveFinanceDashboard />
                ) : (
                  <CourseFinanceHub 
                    courseId={primaryCourseId || program.id} 
                    courseName={programCourses[0]?.name || program.name} 
                    course={programCourses[0]} 
                  />
                )}
              </TabsContent>
            )}

            {capabilities.includes('electronic_point') && (
              <TabsContent value="diario">
                <Card className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl">
                  <CardHeader>
                    <CardTitle>Ponto Eletrônico &amp; Diários</CardTitle>
                    <CardDescription>Sessões ativas e diários de aula dos mentores de {program.name}.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link href="/dashboard/teaching/diario">
                      <Button className="bg-indigo-600 text-white">Abrir Central do Diário de Classe</Button>
                    </Link>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {capabilities.includes('replacement_queue') && (
              <TabsContent value="reposicoes">
                <Card className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl">
                  <CardHeader>
                    <CardTitle>Fila de Reposições de {program.name}</CardTitle>
                    <CardDescription>Reagendamento automático de faltas de alunos ou professores.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link href="/dashboard/teaching/reposicoes">
                      <Button className="bg-indigo-600 text-white">Abrir Fila de Reposições</Button>
                    </Link>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {capabilities.includes('quizzes') && (
              <TabsContent value="quizzes">
                <Card className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl">
                  <CardHeader>
                    <CardTitle>Quizzes, Conteúdos EAD &amp; Vídeos TheoFlix</CardTitle>
                    <CardDescription>Plataforma de videoaulas, episódios, questionários e acompanhamento de respostas.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link href="/dashboard/teaching/theoflix">
                      <Button className="bg-indigo-600 text-white">Abrir Portal TheoFlix &amp; Quizzes</Button>
                    </Link>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            <TabsContent value="materials">
              <HierarchicalMaterialsManager 
                programName={program.name} 
                courseName={programCourses[0]?.name || 'Curso do Programa'} 
                canManage={true} 
              />
            </TabsContent>

            <TabsContent value="students">
              <StudentsManagement 
                filterCourseIds={Array.from(programCourseIds)} 
                defaultCourseId={primaryCourseId} 
              />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </VolunteeringProvider>
  );
}
