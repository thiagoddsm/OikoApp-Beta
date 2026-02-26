
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
  School,
  GraduationCap
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
  type: 'trilho' | 'eletivo';
  ebdTrack?: 'teologico' | 'biblico' | 'discipulado';
};

const getDiscipleshipWeight = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('pertencer')) return 1;
    if (lowerName.includes('crescer')) return 2;
    if (lowerName.includes('liderar')) return 3;
    if (lowerName.includes('cuidar')) return 4;
    if (lowerName.includes('apoiar')) return 5;
    if (lowerName.includes('enviar')) return 6;
    return 99;
};

export function CoursesManagement() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const coursesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'courses')) : null, [firestore]);
  const { data: courses, isLoading: isLoadingCourses } = useCollection<Course>(coursesQuery);

  const [isCourseFormOpen, setCourseFormOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);

  const groupedCourses = useMemo(() => {
    if (!courses) return {};
    const groups: Record<string, Course[]> = {};
    
    courses.forEach(c => {
      const ministry = c.ministryName || 'Geral';
      if (!groups[ministry]) groups[ministry] = [];
      groups[ministry].push(c);
    });

    Object.keys(groups).forEach(ministry => {
        groups[ministry].sort((a, b) => {
            if (a.ebdTrack === 'discipulado' && b.ebdTrack === 'discipulado') {
                return getDiscipleshipWeight(a.name) - getDiscipleshipWeight(b.name);
            }
            return a.name.localeCompare(b.name);
        });
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
    if (n.includes('lumine') || n.includes('ebd')) return Lightbulb;
    if (n.includes('college') || n.includes('escola')) return School;
    return BookOpen;
  };

  const getCourseHref = (course: Course) => {
    const n = course.ministryName?.toLowerCase() || '';
    if (n.includes('wave')) return "/dashboard/teaching/wave";
    if (n === 'dis') return "/dashboard/teaching/dis";
    return `/dashboard/teaching/courses/${course.id}`;
  };

  const getTrackInfo = (course: Course) => {
    if (course.ebdTrack === 'teologico') {
        return (
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] font-black h-5 uppercase">
                <GraduationCap className="size-3 mr-1" /> Fase Buscar | 12/03 a 16/04 às 09h00
            </Badge>
        );
    }
    if (course.ebdTrack === 'biblico' || course.ebdTrack === 'discipulado') {
        return (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-black h-5 uppercase">
                <GraduationCap className="size-3 mr-1" /> Todo domingo às 09h00
            </Badge>
        );
    }
    return null;
  };

  const renderCourseCard = (course: Course, ministry: string) => {
    const Icon = getMinistryIcon(ministry);
    const href = getCourseHref(course);

    return (
        <div key={course.id} className="border rounded-xl relative group hover:bg-muted/50 transition-all hover:border-primary/30 shadow-sm bg-card">
            <Link href={href} className="block w-full h-full">
                <div className="flex items-center justify-between p-4 cursor-pointer">
                    <div className="flex items-center gap-4 flex-1 text-left">
                        <div className="p-2 bg-primary/5 rounded-lg text-primary group-hover:bg-primary/10 transition-colors">
                            <Icon className="size-5" />
                        </div>
                        <div className="pr-20 sm:pr-32 overflow-hidden">
                            <p className="font-bold text-slate-900 leading-tight truncate uppercase text-sm">{course.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                                {getTrackInfo(course)}
                                {!getTrackInfo(course) && <p className="text-xs text-muted-foreground line-clamp-1">{course.description || 'Sem descrição definida.'}</p>}
                            </div>
                        </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground opacity-50 group-hover:translate-x-1 transition-transform" />
                </div>
            </Link>
            
            <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10 flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all pr-2">
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
    );
  };
  
  return (
    <>
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2"><BookOpen/>Portal de Escolas</CardTitle>
            <CardDescription>Gerencie o catálogo de ensino organizado por ministérios e trilhos.</CardDescription>
          </div>
          <Button onClick={handleAddCourse}><PlusCircle className="mr-2 size-4"/>Novo Curso</Button>
        </CardHeader>
        <CardContent>
          {isLoadingCourses ? (
            <div className="flex justify-center items-center h-48"><Loader2 className="animate-spin h-8 w-8 text-primary"/></div>
          ) : Object.keys(groupedCourses).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                Nenhum curso cadastrado no sistema.
            </div>
          ) : (
             <div className="space-y-10">
                {Object.entries(groupedCourses).sort(([a], [b]) => a.localeCompare(b)).map(([ministry, ministryCourses]) => {
                    const isLumine = ministry.toLowerCase().includes('lumine') || ministry.toLowerCase().includes('ebd');
                    
                    if (isLumine) {
                        const tracks = {
                            teologico: ministryCourses.filter(c => c.ebdTrack === 'teologico'),
                            biblico: ministryCourses.filter(c => c.ebdTrack === 'biblico'),
                            discipulado: ministryCourses.filter(c => c.ebdTrack === 'discipulado'),
                            other: ministryCourses.filter(c => !c.ebdTrack)
                        };

                        return (
                            <div key={ministry} className="space-y-6">
                                <div className="flex items-center gap-3 px-2">
                                    <div className="p-2 bg-primary text-white rounded-xl shadow-lg shadow-primary/20">
                                        <Lightbulb className="size-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black uppercase tracking-tight text-slate-900">
                                            {ministry}
                                        </h3>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Escola Bíblica Discipuladora</p>
                                    </div>
                                    <Badge variant="secondary" className="ml-auto text-[10px] h-5">{ministryCourses.length} cursos</Badge>
                                </div>
                                
                                <div className="pl-4 space-y-8 border-l-2 border-primary/10 ml-6">
                                    {[
                                        { id: 'discipulado', label: 'Trilho de Discipulado', list: tracks.discipulado },
                                        { id: 'teologico', label: 'Trilho Teológico', list: tracks.teologico },
                                        { id: 'biblico', label: 'Trilho Bíblico', list: tracks.biblico },
                                        { id: 'other', label: 'Eletivos / Outras Disciplinas', list: tracks.other }
                                    ].map(track => track.list.length > 0 && (
                                        <div key={track.id} className="space-y-3">
                                            <h4 className="text-xs font-black text-primary/60 uppercase tracking-[0.15em] flex items-center gap-2">
                                                <ChevronRight className="size-3" />
                                                {track.label}
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {track.list.map(course => renderCourseCard(course, ministry))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    }

                    const Icon = getMinistryIcon(ministry);

                    return (
                        <div key={ministry} className="space-y-4">
                            <div className="flex items-center gap-3 px-2">
                                <div className="p-2 bg-slate-900 text-white rounded-xl">
                                    <Icon className="size-6" />
                                </div>
                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-900">
                                    {ministry}
                                </h3>
                                <Badge variant="secondary" className="ml-auto text-[10px] h-5">{ministryCourses.length} cursos</Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {ministryCourses.map(course => renderCourseCard(course, ministry))}
                            </div>
                        </div>
                    );
                })}
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
            itemType="Curso"
          />
      )}
    </>
  );
}
