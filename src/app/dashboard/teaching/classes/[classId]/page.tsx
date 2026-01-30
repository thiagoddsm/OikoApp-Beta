'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc } from '@/firebase';
import { Loader2, ArrowLeft, BookOpen, Users, Folder, GraduationCap } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VolunteeringProvider } from '@/contexts/volunteering-context';
import { ClassStudentsManager } from '@/components/teaching/class-students-manager';
import { UnderConstruction } from '@/components/common/under-construction';
import Link from 'next/link';

type Class = {
  id: string;
  name: string;
  courseId: string;
  // ... other fields
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
    
    const isLoading = isLoadingClass || isLoadingCourse;

    if (isLoading) {
        return <div className="flex justify-center p-10"><Loader2 className="animate-spin h-8 w-8" /></div>
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
            <Button variant="outline" asChild>
                <Link href={`/dashboard/teaching/courses/${courseData.id}`}>
                    <ArrowLeft className="mr-2"/>Voltar para o curso {courseData.name}
                </Link>
            </Button>
            <Card>
                <CardHeader>
                    <CardTitle>Turma: {classData.name}</CardTitle>
                    <CardDescription>Curso: {courseData.name}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="students">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="students"><Users className="mr-2"/>Alunos</TabsTrigger>
                            <TabsTrigger value="grades"><GraduationCap className="mr-2"/>Notas</TabsTrigger>
                            <TabsTrigger value="log"><BookOpen className="mr-2"/>Diário de Classe</TabsTrigger>
                            <TabsTrigger value="materials"><Folder className="mr-2"/>Materiais</TabsTrigger>
                        </TabsList>
                        <TabsContent value="students" className="mt-6">
                            <ClassStudentsManager classData={classData} />
                        </TabsContent>
                         <TabsContent value="grades" className="mt-6">
                             <UnderConstruction pageTitle="Gerenciamento de Notas" pageDescription="Lance e acompanhe as notas e o desempenho dos alunos."/>
                        </TabsContent>
                         <TabsContent value="log" className="mt-6">
                            <div className="text-center py-10">
                                 <p className="text-muted-foreground">O Diário de Classe é acessado pelo professor em sua própria área.</p>
                                 <Button asChild variant="link">
                                    <Link href={`/dashboard/teaching/log/${classId}`}>Ir para o Diário (Visão do Professor)</Link>
                                 </Button>
                            </div>
                        </TabsContent>
                         <TabsContent value="materials" className="mt-6">
                             <UnderConstruction pageTitle="Materiais de Apoio" pageDescription="Faça o upload de arquivos, apostilas e links para os alunos."/>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
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
