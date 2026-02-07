
'use client';
import React, { useState, useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { 
  Loader2, 
  PlusCircle, 
  BookOpen, 
  Edit, 
  Trash2, 
  Waves, 
  ChevronRight, 
  HandHelping, 
  Link as LinkIcon, 
  Lightbulb, 
  School 
} from 'lucide-react';
import { DeleteConfirmationDialog } from '@/components/structure/delete-confirmation-dialog';
import { CourseFormDialog } from './course-form-dialog';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

type Course = { 
  id: string; 
  name: string; 
  description: string; 
  ministryName: string; 
  type: 'basic' | 'complete' 
};

export function CoursesManagement() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const coursesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'courses')) : null, [firestore]);
  const { data: courses, isLoading: isLoadingCourses } = useCollection<Course>(coursesQuery);

  const [isCourseFormOpen, setCourseFormOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);

  // Grouping logic
  const groupedCourses = useMemo(() => {
    if (!courses) return {};
    const groups: Record<string, Course[]> = {};
    courses.forEach(c => {
      const ministry = c.ministryName || 'Geral';
      if (!groups[ministry]) groups[ministry] = [];
      groups[ministry].push(c);
    });
    return groups;
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

  const handleCopyEnrollmentLink = (courseId: string) => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/public/enrollment?courseId=${courseId}`;
    navigator.clipboard.writeText(link);
    toast({
        title: "Link Copiado!",
        description: "Link direto para inscrição deste curso copiado com sucesso.",
    });
  };

  const getMinistryIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('wave')) return Waves;
    if (n === 'dis') return HandHelping;
    if (n.includes('lumine')) return Lightbulb;
    if (n.includes('college') || n.includes('escola')) return School;
    return BookOpen;
  };

  const getCourseHref = (course: Course) => {
    const n = course.ministryName?.toLowerCase() || '';
    if (n.includes('wave')) return "/dashboard/teaching/wave";
    if (n === 'dis') return "/dashboard/teaching/dis";
    // Lumine and others currently use the generic detail view
    return `/dashboard/teaching/courses/${course.id}`;
  };
  
  const isLoading = isLoadingCourses;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2"><BookOpen/>Gestão de Ensino</CardTitle>
            <CardDescription>Cursos e turmas organizados por ministério.</CardDescription>
          </div>
          <Button onClick={handleAddCourse}><PlusCircle className="mr-2 size-4"/>Novo Curso</Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-48"><Loader2 className="animate-spin h-8 w-8 text-primary"/></div>
          ) : Object.keys(groupedCourses).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                Nenhum curso cadastrado no sistema.
            </div>
          ) : (
             <div className="space-y-8">
                {Object.entries(groupedCourses).sort(([a], [b]) => a.localeCompare(b)).map(([ministry, ministryCourses]) => (
                    <div key={ministry} className="space-y-3">
                        <div className="flex items-center gap-2 px-2">
                            <span className="h-4 w-1 bg-primary rounded-full"></span>
                            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                                {ministry}
                            </h3>
                            <Badge variant="secondary" className="ml-auto text-[10px] h-5">{ministryCourses.length} {ministryCourses.length === 1 ? 'curso' : 'cursos'}</Badge>
                        </div>
                        
                        <div className="grid gap-2">
                            {ministryCourses.map(course => {
                                const Icon = getMinistryIcon(ministry);
                                const href = getCourseHref(course);

                                return (
                                <div key={course.id} className="border rounded-xl relative group hover:bg-muted/50 transition-all hover:border-primary/30 shadow-sm">
                                    <Link href={href} className="block w-full h-full">
                                        <div className="flex items-center justify-between p-4 cursor-pointer">
                                            <div className="flex items-center gap-4 flex-1 text-left">
                                                <div className="p-2 bg-primary/5 rounded-lg text-primary group-hover:bg-primary/10 transition-colors">
                                                    <Icon className="size-5" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 leading-tight">{course.name}</p>
                                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{course.description || 'Sem descrição definida.'}</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="h-5 w-5 text-muted-foreground opacity-50 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </Link>
                                    
                                    <div className="absolute right-12 top-1/2 -translate-y-1/2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" 
                                            onClick={(e) => {e.preventDefault(); e.stopPropagation(); handleCopyEnrollmentLink(course.id);}} 
                                            title="Copiar link de inscrição"
                                        >
                                            <LinkIcon className="size-4"/>
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-slate-600 hover:text-slate-900 hover:bg-slate-100" 
                                            onClick={(e) => {e.preventDefault(); e.stopPropagation(); handleEditCourse(course);}}
                                            title="Editar curso"
                                        >
                                            <Edit className="size-4"/>
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" 
                                            onClick={(e) => {e.preventDefault(); e.stopPropagation(); handleDeleteCourse(course);}}
                                            title="Excluir curso"
                                        >
                                            <Trash2 className="size-4"/>
                                        </Button>
                                    </div>
                                </div>
                            )})}
                        </div>
                    </div>
                ))}
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
            itemType="Curso (As turmas vinculadas não serão excluídas automaticamente)"
          />
      )}
    </>
  );
}
