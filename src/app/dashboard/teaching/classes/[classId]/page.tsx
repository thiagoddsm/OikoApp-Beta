
'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc } from '@/firebase';
import { Loader2, ArrowLeft, BookOpen, Users, Folder, GraduationCap, Edit, FileSpreadsheet } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VolunteeringProvider } from '@/contexts/volunteering-context';
import { ClassStudentsManager } from '@/components/teaching/class-students-manager';
import { ClassGradesManager } from '@/components/teaching/class-grades-manager';
import { ClassMaterialsManager } from '@/components/teaching/class-materials-manager';
import { ClassPerformanceReport } from '@/components/teaching/class-performance-report';
import { ClassFormDialog } from '@/components/teaching/class-form-dialog';
import Link from 'next/link';

type Class = {
  id: string;
  name: string;
  courseId: string;
  [key: string]: any;
};

type Course = {
    id: string;
    name: string;
}

function ClassDetailPageContent() {
    const params = useParams();
    const router = useRouter();
    const classId = params.classId as string;
    
    const { data: classData, isLoading: isLoadingClass } = useDoc<Class>(classId ? `classes/${classId}` : null);
    const { data: courseData, isLoading: isLoadingCourse } = useDoc<Course>(classData ? `courses/${classData.courseId}` : null);
    
    const [isEditOpen, setEditOpen] = useState(false);

    const isLoading = isLoadingClass || isLoadingCourse;

    if (isLoading) {
        return <div className="flex justify-center p-10"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
    }

    if (!classData || !courseData) {
        return (
            <Card>
                <CardHeader><CardTitle>Turma não encontrada</CardTitle></CardHeader>
                <CardContent>
                    <p>A turma que você está procurando não existe ou foi removida.</p>
                     <Button onClick={() => router.back()} className="mt-4"><ArrowLeft className="mr-2"/>Voltar</Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <Button variant="outline" asChild>
                    <Link href={`/dashboard/teaching/courses/${courseData.id}`}>
                        <ArrowLeft className="mr-2 h-4 w-4"/>Voltar para o curso {courseData.name}
                    </Link>
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                    <Edit className="mr-2 h-4 w-4" /> Editar Detalhes da Turma
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Turma: {classData.name}</CardTitle>
                    <CardDescription>Curso: {courseData.name}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="students">
                        <TabsList className="grid w-full grid-cols-5">
                            <TabsTrigger value="students"><Users className="mr-2 h-4 w-4"/>Alunos</TabsTrigger>
                            <TabsTrigger value="grades"><GraduationCap className="mr-2 h-4 w-4"/>Notas</TabsTrigger>
                            <TabsTrigger value="report"><FileSpreadsheet className="mr-2 h-4 w-4"/>Relatório</TabsTrigger>
                            <TabsTrigger value="log"><BookOpen className="mr-2 h-4 w-4"/>Diário</TabsTrigger>
                            <TabsTrigger value="materials"><Folder className="mr-2 h-4 w-4"/>Materiais</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="students" className="mt-6">
                            <ClassStudentsManager classData={classData} />
                        </TabsContent>
                        
                        <TabsContent value="grades" className="mt-6">
                             <ClassGradesManager classData={classData} />
                        </TabsContent>

                        <TabsContent value="report" className="mt-6">
                             <ClassPerformanceReport classData={classData} />
                        </TabsContent>
                        
                        <TabsContent value="log" className="mt-6">
                            <div className="text-center py-10 border-2 border-dashed rounded-lg">
                                 <p className="text-muted-foreground mb-4">O Diário de Classe é usado pelos professores para lançar presenças e conteúdos.</p>
                                 <Button asChild>
                                    <Link href={`/dashboard/teaching/log/${classId}`}>
                                        <BookOpen className="mr-2 size-4" /> Ir para o Diário da Turma
                                    </Link>
                                 </Button>
                            </div>
                        </TabsContent>
                        
                        <TabsContent value="materials" className="mt-6">
                             <ClassMaterialsManager classData={classData} />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <ClassFormDialog 
                open={isEditOpen} 
                onOpenChange={setEditOpen} 
                existingClass={classData} 
                courseId={courseData.id} 
            />
        </div>
    );
}

export default function ClassDetailPage() {
    return (
        <VolunteeringProvider>
            <ClassDetailPageContent />
        </VolunteeringProvider>
    )
}
