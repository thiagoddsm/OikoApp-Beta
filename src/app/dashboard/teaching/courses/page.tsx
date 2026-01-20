
'use client';

import { CoursesManagement } from '@/components/teaching/courses-management';
import { WaveMusicSchoolPage } from '@/components/teaching/wave/wave-page';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Waves } from 'lucide-react';

export default function CoursesPage() {
  return (
    <Tabs defaultValue="courses" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="courses">
                <BookOpen className="mr-2 size-4" />
                Cursos Gerais
            </TabsTrigger>
            <TabsTrigger value="wave">
                <Waves className="mr-2 size-4" />
                Wave - Escola de Música
            </TabsTrigger>
        </TabsList>
        <TabsContent value="courses" className="mt-6">
            <CoursesManagement />
        </TabsContent>
        <TabsContent value="wave" className="mt-6">
            <WaveMusicSchoolPage />
        </TabsContent>
    </Tabs>
  );
}
