
'use client';
import React, { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useVolunteering } from '@/contexts/volunteering-context';
import { useFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, ArrowLeft, BookOpen, Star } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';

export default function PedagogicalLogPage() {
    const params = useParams();
    const router = useRouter();
    const classId = params.classId as string;
    const { 
        classes, 
        courses, 
        users, 
        pedagogicalLogs, 
        addPedagogicalLog, 
        isLoading 
    } = useVolunteering();
    
    const [contentTaught, setContentTaught] = useState('');
    const [observations, setObservations] = useState('');
    const [performance, setPerformance] = useState(3); // Default to 3 stars
    const [isSaving, setIsSaving] = useState(false);

    const classData = useMemo(() => classes.find(c => c.id === classId), [classes, classId]);
    const courseData = useMemo(() => classData ? courses.find(c => c.id === classData.courseId) : null, [classData, courses]);
    const teacherData = useMemo(() => classData ? users.find(u => u.id === classData.teacherId) : null, [classData, users]);
    const classLogs = useMemo(() => pedagogicalLogs.filter(log => log.classId === classId).sort((a,b) => b.date.toMillis() - a.date.toMillis()), [pedagogicalLogs, classId]);

    const handleSaveLog = async () => {
        if (!contentTaught.trim()) {
            alert('O conteúdo ensinado é obrigatório.');
            return;
        }
        setIsSaving(true);
        await addPedagogicalLog({
            classId,
            date: Timestamp.now() as any, // Cast to any to satisfy the type
            content_taught: contentTaught,
            student_performance: performance,
            observations,
        });
        setContentTaught('');
        setObservations('');
        setPerformance(3);
        setIsSaving(false);
    };

    if (isLoading) {
        return <div className="flex h-64 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!classData) {
        return <p>Turma não encontrada.</p>;
    }

    return (
        <div className="space-y-6">
            <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para o Painel
            </Button>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BookOpen />Diário de Classe: {classData.name}</CardTitle>
                    <CardDescription>
                        Curso: {courseData?.name || '...'} | Professor(a): {teacherData?.name || '...'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Form for new log */}
                    <div className="md:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Registrar Aula de Hoje</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label htmlFor="content">Conteúdo Ensinado</Label>
                                    <Input id="content" value={contentTaught} onChange={e => setContentTaught(e.target.value)} placeholder="Ex: Escalas maiores, inversão de acordes..." />
                                </div>
                                <div>
                                    <Label htmlFor="observations">Observações Pedagógicas</Label>
                                    <Textarea id="observations" value={observations} onChange={e => setObservations(e.target.value)} placeholder="Ex: Aluno X teve dificuldade com o ritmo. Reforçar na próxima aula."/>
                                </div>
                                <div className="space-y-2">
                                    <Label>Desempenho Geral da Turma</Label>
                                    <div className="flex items-center gap-1">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <Star
                                                key={star}
                                                className={`cursor-pointer transition-colors ${performance >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 hover:text-gray-400'}`}
                                                onClick={() => setPerformance(star)}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <Button onClick={handleSaveLog} disabled={isSaving}>
                                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Salvar Registro
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                    
                    {/* List of past logs */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Histórico de Aulas</h3>
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                            {classLogs.length === 0 ? (
                                <p className="text-muted-foreground text-sm p-4 text-center">Nenhum registro encontrado para esta turma.</p>
                            ) : (
                                classLogs.map(log => (
                                    <div key={log.id} className="p-4 border rounded-lg bg-muted/50">
                                        <p className="font-bold text-sm">{format(log.date.toDate(), 'dd/MM/yyyy', { locale: ptBR })}</p>
                                        <p className="text-sm mt-2">{log.content_taught}</p>
                                        {log.observations && <p className="text-xs italic text-muted-foreground mt-1">"{log.observations}"</p>}
                                        <div className="flex items-center gap-1 mt-2">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} className={`h-3 w-3 ${i < log.student_performance ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
