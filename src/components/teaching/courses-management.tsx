
'use client';
import React, { useState, useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, doc, where } from 'firebase/firestore';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, PlusCircle, BookOpen, Edit, Trash2, Waves } from 'lucide-react';
import { DeleteConfirmationDialog } from '@/components/structure/delete-confirmation-dialog';
import { CourseFormDialog } from './course-form-dialog';
import { ClassFormDialog } from './class-form-dialog';
import { useToast } from '@/hooks/use-toast';
import { WaveMusicSchoolPage } from '@/components/teaching/wave/wave-page';
import { cn } from '@/lib/utils';


type Course = { id: string; name: string; description: string; ministryName: string; };
type Class = { id: string; name: string; teacherId: string; students: string[]; schedule: string; courseId: string; };
type User = { id: string; name: string; };

function CourseItem({ course, allUsers }: { course: Course, allUsers: User[] }) {
    const { firestore } = useFirebase();
    const [isClassFormOpen, setClassFormOpen] = useState(false);
    const [editingClass, setEditingClass] = useState(null);
    
    const isWaveCourse = course.ministryName?.toLowerCase() === 'wave - escola de música';

    const classesQuery = useMemoFirebase(() => {
        if (!firestore || isWaveCourse || course.id === 'static-wave-course') return null; // Do not fetch classes for Wave course or static course
        return query(collection(firestore, `courses/${course.id}/classes`));
    }, [firestore, course.id, isWaveCourse]);

    const { data: classes, isLoading: isLoadingClasses } = useCollection<Class>(classesQuery);

    const userMap = useMemo(() => new Map(allUsers?.map(u => [u.id, u.name]) || []), [allUsers]);

    const handleEditClass = (cls) => {
        setEditingClass(cls);
        setClassFormOpen(true);
    }
    
    const handleAddClass = () => {
        setEditingClass(null);
        setClassFormOpen(true);
    }
    
    const handleDeleteClass = (cls) => {
        if (confirm(`Tem certeza que deseja excluir a turma "${cls.name}"?`)) {
            const docRef = doc(firestore, `courses/${course.id}/classes`, cls.id);
            deleteDocumentNonBlocking(docRef);
        }
    }
    
    return (
        <AccordionItem value={course.id}>
            <AccordionTrigger className="hover:bg-muted/50 rounded-md px-4 transition-colors">
                <div className="flex items-center gap-3 flex-1 text-left">
                     {isWaveCourse ? <Waves className="size-5 text-primary" /> : <BookOpen className="size-5 text-primary"/>}
                     <div>
                        <p className="font-semibold">{course.name}</p>
                        <p className="text-sm text-muted-foreground">{course.ministryName}</p>
                    </div>
                </div>
            </AccordionTrigger>
            <AccordionContent className={cn("bg-muted/30", isWaveCourse ? "p-0" : "p-4")}>
                 {isWaveCourse ? (
                    <WaveMusicSchoolPage />
                 ) : (
                    <>
                        <div className="flex justify-between items-center mb-4">
                            <p className="text-sm text-muted-foreground">{course.description || "Nenhuma descrição para este curso."}</p>
                            <Button size="sm" onClick={handleAddClass}><PlusCircle className="mr-2 size-4"/>Nova Turma</Button>
                        </div>
                        <div className="rounded-md border bg-background">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Turma</TableHead>
                                        <TableHead>Professor</TableHead>
                                        <TableHead>Alunos</TableHead>
                                        <TableHead>Horário</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoadingClasses ? (
                                        <TableRow><TableCell colSpan={5} className="text-center h-24"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
                                    ) : classes?.length === 0 ? (
                                        <TableRow><TableCell colSpan={5} className="text-center h-24">Nenhuma turma cadastrada para este curso.</TableCell></TableRow>
                                    ) : (
                                        classes?.map(cls => (
                                            <TableRow key={cls.id}>
                                                <TableCell className="font-medium">{cls.name}</TableCell>
                                                <TableCell>{userMap.get(cls.teacherId) || '-'}</TableCell>
                                                <TableCell>{cls.students?.length || 0}</TableCell>
                                                <TableCell>{cls.schedule || '-'}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" onClick={() => handleEditClass(cls)}><Edit className="size-4"/></Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteClass(cls)}><Trash2 className="size-4 text-destructive"/></Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        <ClassFormDialog
                            open={isClassFormOpen}
                            onOpenChange={setClassFormOpen}
                            existingClass={editingClass}
                            courseId={course.id}
                        />
                    </>
                 )}
            </AccordionContent>
        </AccordionItem>
    )
}

export function CoursesManagement() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const coursesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'courses')) : null, [firestore]);
  const usersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);

  const { data: courses, isLoading: isLoadingCourses } = useCollection<Course>(coursesQuery);
  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);

  const [isCourseFormOpen, setCourseFormOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);

  const waveCourseExists = useMemo(() => 
    courses?.some(c => c.ministryName?.toLowerCase() === 'wave - escola de música'), 
  [courses]);

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course);
    setCourseFormOpen(true);
  }

  const handleAddCourse = () => {
    setEditingCourse(null);
    setCourseFormOpen(true);
  }
  
  const handleDeleteCourse = (course: Course) => {
      setDeletingCourse(course);
  }
  
  const confirmDeleteCourse = () => {
    if (!deletingCourse) return;
    // Note: This does not delete subcollections (classes). Firestore rules should handle this or a cloud function.
    const docRef = doc(firestore, 'courses', deletingCourse.id);
    deleteDocumentNonBlocking(docRef);
    toast({ variant: 'destructive', title: 'Curso excluído', description: `O curso "${deletingCourse.name}" será removido.`});
    setDeletingCourse(null);
  }
  
  const isLoading = isLoadingCourses || isLoadingUsers;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2"><BookOpen/>Cursos e Turmas</CardTitle>
            <CardDescription>Gerencie os cursos oferecidos e as turmas de cada um.</CardDescription>
          </div>
          <Button onClick={handleAddCourse}><PlusCircle className="mr-2 size-4"/>Novo Curso</Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-48"><Loader2 className="animate-spin h-8 w-8 text-primary"/></div>
          ) : (courses?.length === 0 && !waveCourseExists) ? (
            <div className="text-center text-muted-foreground py-10 border-2 border-dashed rounded-lg">
                <p>Nenhum curso cadastrado ainda.</p>
                <p>Clique em "Novo Curso" para começar.</p>
            </div>
          ) : (
            <Accordion type="multiple" className="w-full space-y-2">
              {courses?.map(course => (
                  <div key={course.id} className="border rounded-md relative group">
                      <div className="absolute right-12 top-1/2 -translate-y-1/2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => {e.stopPropagation(); handleEditCourse(course);}}><Edit className="size-4"/></Button>
                         <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => {e.stopPropagation(); handleDeleteCourse(course);}}><Trash2 className="size-4 text-destructive"/></Button>
                      </div>
                     <CourseItem course={course} allUsers={users || []} />
                  </div>
              ))}
              {!waveCourseExists && (
                <div className="border rounded-md relative group">
                    <CourseItem 
                        course={{ 
                            id: 'static-wave-course', 
                            name: 'Wave - Escola de Música', 
                            description: 'Gestão completa da escola de música.',
                            ministryName: 'Wave - Escola de Música'
                        }} 
                        allUsers={users || []} 
                    />
                </div>
              )}
            </Accordion>
          )}
        </CardContent>
      </Card>
      
      <CourseFormDialog 
        open={isCourseFormOpen}
        onOpenChange={setCourseFormOpen}
        existingCourse={editingCourse}
      />
      
      {deletingCourse && (
          <DeleteConfirmationDialog 
            open={!!deletingCourse}
            onOpenChange={() => setDeletingCourse(null)}
            onConfirm={confirmDeleteCourse}
            itemName={deletingCourse.name}
            itemType="Curso (Turmas não serão excluídas)"
          />
      )}
    </>
  );
}
