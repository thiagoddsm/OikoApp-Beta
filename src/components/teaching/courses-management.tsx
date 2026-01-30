'use client';
import React, { useState, useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Loader2, PlusCircle, BookOpen, Edit, Trash2, Waves, ChevronRight, HandHelping } from 'lucide-react';
import { DeleteConfirmationDialog } from '@/components/structure/delete-confirmation-dialog';
import { CourseFormDialog } from './course-form-dialog';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';

type Course = { id: string; name: string; description: string; ministryName: string; type: 'basic' | 'complete' };

export function CoursesManagement() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const coursesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'courses')) : null, [firestore]);
  const { data: courses, isLoading: isLoadingCourses } = useCollection<Course>(coursesQuery);

  const [isCourseFormOpen, setCourseFormOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);

  const { completeCourses, basicCourses } = useMemo(() => {
    const complete: Course[] = [];
    const basic: Course[] = [];
    courses?.forEach(c => {
        const isWave = c.ministryName?.toLowerCase().includes('wave');
        const isDis = c.ministryName?.toLowerCase() === 'dis';
        if (c.type === 'complete' || isWave || isDis) {
            complete.push(c);
        } else {
            basic.push(c);
        }
    });
    return { completeCourses: complete, basicCourses: basic };
  }, [courses]);

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
    if (!deletingCourse || !firestore) return;
    const docRef = doc(firestore, 'courses', deletingCourse.id);
    deleteDocumentNonBlocking(docRef);
    toast({ variant: 'destructive', title: 'Curso excluído', description: `O curso "${deletingCourse.name}" será removido.`});
    setDeletingCourse(null);
  }
  
  const isLoading = isLoadingCourses;

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
          ) : (
             <div className="space-y-6">
                {completeCourses.length > 0 && (
                    <div>
                        <p className="text-sm font-semibold text-muted-foreground mb-2 px-2">Módulos Completos</p>
                        <div className="space-y-2">
                            {completeCourses.map(course => {
                                const isWave = course.ministryName?.toLowerCase().includes('wave');
                                const isDis = course.ministryName?.toLowerCase() === 'dis';
                                const href = isWave ? "/dashboard/teaching/wave" : isDis ? "/dashboard/teaching/dis" : `/dashboard/teaching/courses/${course.id}`;
                                const Icon = isWave ? Waves : isDis ? HandHelping : BookOpen;
                                const isDisabled = !isWave && !isDis && course.type !== 'complete';

                                return (
                                <div key={course.id} className="border rounded-md relative group hover:bg-muted/50 transition-colors">
                                    <Link href={href} className={cn("block w-full h-full", isDisabled && "pointer-events-none opacity-60")}>
                                        <div className="flex items-center justify-between p-4 cursor-pointer">
                                            <div className="flex items-center gap-3 flex-1 text-left">
                                                <Icon className="size-5 text-primary" />
                                                <div>
                                                    <p className="font-semibold">{course.name}</p>
                                                    <p className="text-sm text-muted-foreground">{course.ministryName}</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                    </Link>
                                    <div className="absolute right-12 top-1/2 -translate-y-1/2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => {e.preventDefault(); e.stopPropagation(); handleEditCourse(course);}}><Edit className="size-4"/></Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => {e.preventDefault(); e.stopPropagation(); handleDeleteCourse(course);}}><Trash2 className="size-4 text-destructive"/></Button>
                                    </div>
                                    {isDisabled && <Badge variant="outline" className="absolute top-2 right-2">Em breve</Badge>}
                                </div>
                            )})}
                        </div>
                    </div>
                )}
                
                {basicCourses.length > 0 && (
                  <div className="pt-4 mt-4 border-t">
                    <p className="text-sm font-semibold text-muted-foreground mb-2 px-2">Cursos Gerais (Básico)</p>
                     <div className="space-y-2">
                        {basicCourses.map(course => {
                            const href = `/dashboard/teaching/courses/${course.id}`;
                            const Icon = BookOpen;

                            return (
                                <div key={course.id} className="border rounded-md relative group hover:bg-muted/50 transition-colors">
                                    <Link href={href} className="block w-full h-full">
                                        <div className="flex items-center justify-between p-4 cursor-pointer">
                                            <div className="flex items-center gap-3 flex-1 text-left">
                                                <Icon className="size-5 text-primary" />
                                                <div>
                                                    <p className="font-semibold">{course.name}</p>
                                                    <p className="text-sm text-muted-foreground">{course.ministryName}</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                    </Link>
                                    <div className="absolute right-12 top-1/2 -translate-y-1/2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => {e.preventDefault(); e.stopPropagation(); handleEditCourse(course);}}><Edit className="size-4"/></Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => {e.preventDefault(); e.stopPropagation(); handleDeleteCourse(course);}}><Trash2 className="size-4 text-destructive"/></Button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                  </div>
                )}
             </div>
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
