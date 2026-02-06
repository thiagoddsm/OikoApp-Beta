'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc } from '@/firebase';
import { Loader2, ArrowLeft, BookOpen, Users, User, FileText, ClipboardCheck, Folder, Inbox } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VolunteeringProvider } from '@/contexts/volunteering-context';
import { CourseDetailsForm } from '@/components/teaching/course-details-form';
import { CourseClassesManager } from '@/components/teaching/course-classes-manager';
import { CourseTeachersManager } from '@/components/teaching/course-teachers-manager';
import { EnrollmentRequestsList } from '@/components/teaching/enrollment-requests-list';
import { UnderConstruction } from '@/components/common/under-construction';
import Link from 'next/link';

type Course = {
  id: string;
  name: string;
  description: string;
  ministryName: string;
  responsibleId?: string;
  location?: string;
  defaultDay?: string;
  defaultTime?: string;
  teacherIds?: string[];
  type?: 'basic' | 'complete';
};

function CourseDetailPageContent() {
    const params = useParams();
    const router = useRouter();
    const courseId = params.courseId as string;
    
    const { data: course, isLoading } = useDoc<Course>(courseId ? `courses/${courseId}` : null);

    if (isLoading) {
        return <div className="flex justify-center p-10"><Loader2 className="animate-spin h-8 w-8" /></div>
    }

    if (!course) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Curso não encontrado</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>O curso que você está procurando não existe ou foi removida.</p>
                     <Button onClick={() => router.back()} className="mt-4"><ArrowLeft className="mr-2"/>Voltar</Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            <Button variant="outline" asChild>
                <Link href="/dashboard/teaching/courses">
                    <ArrowLeft className="mr-2 h-4 w-4"/>Voltar para todos os cursos
                </Link>
            </Button>
            <Card>
                <CardHeader>
                    <CardTitle>{course.name}</CardTitle>
                    <CardDescription>{course.ministryName} - {course.description}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="general">
                        <TabsList className="grid w-full grid-cols-7">
                            <TabsTrigger value="general"><BookOpen className="mr-2 size-4"/>Geral</TabsTrigger>
                            <TabsTrigger value="requests"><Inbox className="mr-2 size-4"/>Solicitações</TabsTrigger>
                            <TabsTrigger value="classes"><Users className="mr-2 size-4"/>Turmas</TabsTrigger>
                            <TabsTrigger value="teachers"><User className="mr-2 size-4"/>Professores</TabsTrigger>
                            <TabsTrigger value="syllabus"><FileText className="mr-2 size-4"/>Ementa</TabsTrigger>
                            <TabsTrigger value="assessments"><ClipboardCheck className="mr-2 size-4"/>Avaliações</TabsTrigger>
                            <TabsTrigger value="materials"><Folder className="mr-2 size-4"/>Materiais</TabsTrigger>
                        </TabsList>
                        <TabsContent value="general" className="mt-6">
                            <CourseDetailsForm course={course} />
                        </TabsContent>
                        <TabsContent value="requests" className="mt-6">
                            <EnrollmentRequestsList courseId={course.id} />
                        </TabsContent>
                        <TabsContent value="classes" className="mt-6">
                            <CourseClassesManager course={course} />
                        </TabsContent>
                         <TabsContent value="teachers" className="mt-6">
                            <CourseTeachersManager course={course} />
                        </TabsContent>
                         <TabsContent value="syllabus" className="mt-6">
                            <UnderConstruction pageTitle="Ementa do Curso" pageDescription="Adicione e organize as aulas e o conteúdo programático do curso."/>
                        </TabsContent>
                         <TabsContent value="assessments" className="mt-6">
                             <UnderConstruction pageTitle="Avaliações" pageDescription="Crie e gerencie as avaliações, provas e trabalhos do curso."/>
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


export default function CourseDetailPage() {
    return (
        <VolunteeringProvider>
            <CourseDetailPageContent />
        </VolunteeringProvider>
    )
}
