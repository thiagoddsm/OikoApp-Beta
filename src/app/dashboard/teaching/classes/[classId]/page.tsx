
'use client';

import React, { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { Loader2, ArrowLeft, BookOpen, Users, Folder, GraduationCap, Edit, FileSpreadsheet } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VolunteeringProvider, useVolunteering, type Class, type Course } from '@/contexts/volunteering-context';
import { ClassStudentsManager } from '@/components/teaching/class-students-manager';
import { ClassGradesManager } from '@/components/teaching/class-grades-manager';
import { ClassMaterialsManager } from '@/components/teaching/class-materials-manager';
import { ClassPerformanceReport } from '@/components/teaching/class-performance-report';
import { ClassFormDialog } from '@/components/teaching/class-form-dialog';
import { ClassNotificationsManager } from '@/components/teaching/class-notifications-manager';
import { ClassScheduleManager } from '@/components/teaching/class-schedule-manager';
import { Send, Calendar as CalendarIcon } from 'lucide-react';
import Link from 'next/link';



function ClassDetailPageContent() {
    const params = useParams();
    const router = useRouter();
    const classId = params.classId as string;
    
    const { classes, courses, isLoading: isContextLoading } = useVolunteering();
    
    const classData = useMemo(() => classes.find(c => c.id === classId), [classes, classId]);
    const courseData = useMemo(() => classData ? courses.find(c => c.id === classData.courseId) : null, [classData, courses]);
    
    const [isEditOpen, setEditOpen] = useState(false);

    const isLoading = isContextLoading;

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
                        <TabsList className="flex h-auto flex-wrap justify-start bg-muted/50 p-1 mb-2">
                            <TabsTrigger value="students"><Users className="mr-2 h-4 w-4"/>Alunos</TabsTrigger>
                            <TabsTrigger value="schedule"><CalendarIcon className="mr-2 h-4 w-4"/>Cronograma</TabsTrigger>
                            <TabsTrigger value="grades"><GraduationCap className="mr-2 h-4 w-4"/>Notas</TabsTrigger>
                            <TabsTrigger value="report"><FileSpreadsheet className="mr-2 h-4 w-4"/>Relatório</TabsTrigger>
                            <TabsTrigger value="log"><BookOpen className="mr-2 h-4 w-4"/>Diário</TabsTrigger>
                            <TabsTrigger value="materials"><Folder className="mr-2 h-4 w-4"/>Materiais</TabsTrigger>
                            <TabsTrigger value="notifications"><Send className="mr-2 h-4 w-4"/>Notificações</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="students" className="mt-6">
                            <ClassStudentsManager classData={classData} />
                        </TabsContent>

                        <TabsContent value="schedule" className="mt-6">
                            <ClassScheduleManager classData={classData} />
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

                        <TabsContent value="notifications" className="mt-6">
                             <ClassNotificationsManager classData={classData} courseData={courseData} />
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
