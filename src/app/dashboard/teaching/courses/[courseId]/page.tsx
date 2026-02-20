'use client';

import React, { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useFirebase } from '@/firebase';
import { 
  Loader2, ArrowLeft, BookOpen, Users, User, FileText, 
  ClipboardCheck, Folder, Inbox, GraduationCap, TrendingUp,
  LayoutDashboard, PlusCircle, UserPlus, Waves, Lightbulb, School, HandHelping,
  CheckCircle2
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VolunteeringProvider, useVolunteering } from '@/contexts/volunteering-context';
import { CourseDetailsForm } from '@/components/teaching/course-details-form';
import { CourseClassesManager } from '@/components/teaching/course-classes-manager';
import { CourseTeachersManager } from '@/components/teaching/course-teachers-manager';
import { EnrollmentRequestsList } from '@/components/teaching/enrollment-requests-list';
import { StudentsManagement } from '@/components/teaching/students-management';
import { CourseAttendanceMatrix } from '@/components/teaching/course-attendance-matrix';
import { CourseSyllabusManager } from '@/components/teaching/course-syllabus-manager';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
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
  type?: 'trilho' | 'eletivo';
  syllabus?: { id: string; title: string; description: string }[];
};

function CourseDetailPageContent() {
    const params = useParams();
    const router = useRouter();
    const courseId = params.courseId as string;
    const { classes, enrollmentRequests, users, isLoading: isContextLoading } = useVolunteering();
    const [activeTab, setActiveTab] = useState('overview');
    
    const { data: course, isLoading: isCourseLoading } = useDoc<Course>(courseId ? `courses/${courseId}` : null);

    const isLoading = isCourseLoading || isContextLoading;

    // --- KPIs Calculations ---
    const courseClasses = useMemo(() => classes.filter(c => c.courseId === courseId), [classes, courseId]);
    const pendingRequests = useMemo(() => enrollmentRequests.filter(r => r.courseId === courseId && r.status === 'pending'), [enrollmentRequests, courseId]);
    
    const courseStudentsCount = useMemo(() => {
        const studentSet = new Set<string>();
        courseClasses.forEach(c => c.students?.forEach(s => studentSet.add(s)));
        return studentSet.size;
    }, [courseClasses]);

    const courseTeachersCount = useMemo(() => {
        return course?.teacherIds?.length || 0;
    }, [course?.teacherIds]);

    const getMinistryIcon = (name: string) => {
        const n = name?.toLowerCase() || '';
        if (n.includes('wave')) return Waves;
        if (n === 'dis') return HandHelping;
        if (n.includes('lumine')) return Lightbulb;
        if (n.includes('college') || n.includes('escola')) return School;
        return BookOpen;
    };

    if (isLoading) {
        return <div className="flex justify-center p-10"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
    }

    if (!course) {
        return (
            <Card>
                <CardHeader><CardTitle>Curso não encontrado</CardTitle></CardHeader>
                <CardContent>
                    <p>O curso que você está procurando não existe ou foi removida.</p>
                     <Button onClick={() => router.back()} className="mt-4"><ArrowLeft className="mr-2"/>Voltar</Button>
                </CardContent>
            </Card>
        )
    }

    const MinistryIcon = getMinistryIcon(course.ministryName);

    const kpis = [
        { id: 'students', title: "Alunos Ativos", value: courseStudentsCount, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
        { id: 'requests', title: "Pendentes", value: pendingRequests.length, icon: Inbox, color: "text-amber-600", bg: "bg-amber-50" },
        { id: 'classes', title: "Turmas", value: courseClasses.length, icon: School, color: "text-purple-600", bg: "bg-purple-50" },
        { id: 'teachers', title: "Professores", value: courseTeachersCount, icon: GraduationCap, color: "text-green-600", bg: "bg-green-50" },
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <Button variant="outline" size="sm" asChild>
                    <Link href="/dashboard/teaching/courses">
                        <ArrowLeft className="mr-2 h-4 w-4"/>Voltar
                    </Link>
                </Button>
                <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="px-3 py-1 font-bold">{course.ministryName}</Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map((kpi) => (
                    <button 
                        key={kpi.id} 
                        onClick={() => setActiveTab(kpi.id === 'requests' ? 'requests' : kpi.id === 'classes' ? 'classes' : kpi.id === 'students' ? 'students' : kpi.id === 'teachers' ? 'teachers' : activeTab)}
                        className="text-left transition-all hover:scale-105 active:scale-95 outline-none"
                    >
                        <Card className={cn("h-full border-none shadow-sm", activeTab === kpi.id ? "ring-2 ring-primary" : "")}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{kpi.title}</CardTitle>
                                <div className={cn("p-2 rounded-lg", kpi.bg, kpi.color)}>
                                    <kpi.icon className="h-4 w-4" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-black">{kpi.value}</div>
                            </CardContent>
                        </Card>
                    </button>
                ))}
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl text-primary">
                        <MinistryIcon size={32} />
                    </div>
                    <div>
                        <CardTitle className="text-2xl font-black">{course.name}</CardTitle>
                        <CardDescription>{course.description}</CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <div className="overflow-x-auto pb-2">
                            <TabsList className="flex h-auto justify-start bg-muted/50 p-1 mb-8 min-w-max">
                                <TabsTrigger value="overview"><LayoutDashboard className="mr-2 size-4"/>Geral</TabsTrigger>
                                <TabsTrigger value="attendance"><CheckCircle2 className="mr-2 size-4"/>Frequência & Aprovação</TabsTrigger>
                                <TabsTrigger value="requests">Solicitações {pendingRequests.length > 0 && <Badge className="ml-2 h-4 px-1">{pendingRequests.length}</Badge>}</TabsTrigger>
                                <TabsTrigger value="students">Alunos</TabsTrigger>
                                <TabsTrigger value="classes">Turmas</TabsTrigger>
                                <TabsTrigger value="teachers">Professores</TabsTrigger>
                                <TabsTrigger value="syllabus">Ementa</TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="overview" className="mt-0 animate-in fade-in-50 duration-300">
                            <CourseDetailsForm course={course} />
                        </TabsContent>

                        <TabsContent value="attendance" className="mt-0 animate-in fade-in-50 duration-300">
                            <CourseAttendanceMatrix courseId={course.id} />
                        </TabsContent>

                        <TabsContent value="requests" className="mt-0 animate-in slide-in-from-left-4 duration-300">
                            <EnrollmentRequestsList courseId={course.id} />
                        </TabsContent>

                        <TabsContent value="students" className="mt-0 animate-in slide-in-from-left-4 duration-300">
                            <StudentsManagement filterCourseIds={[course.id]} />
                        </TabsContent>

                        <TabsContent value="classes" className="mt-0 animate-in slide-in-from-left-4 duration-300">
                            <CourseClassesManager course={course} />
                        </TabsContent>

                        <TabsContent value="teachers" className="mt-0 animate-in slide-in-from-left-4 duration-300">
                            <CourseTeachersManager course={course} />
                        </TabsContent>

                        <TabsContent value="syllabus" className="mt-0 animate-in slide-in-from-left-4 duration-300">
                            <CourseSyllabusManager course={course} />
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
