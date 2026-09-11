'use client';
import React, { useMemo, useState, useEffect } from 'react';
import { useVolunteering, type Class, type User } from '@/contexts/volunteering-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Loader2, PlusCircle, UserX } from 'lucide-react';
import { EnrollmentDialog } from './enrollment-dialog';
import { useMembersData } from "@/hooks/useDomainData";
import { useFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface ClassStudentsManagerProps {
    classData: Class;
}

export function ClassStudentsManager({ classData }: ClassStudentsManagerProps) {
    const { firestore } = useFirebase();
    const { users, isLoading: isUsersLoading } = useMembersData();
    const { isLoading: isContextLoading, updateClass } = useVolunteering();
    const [fallbackStudents, setFallbackStudents] = useState<User[]>([]);
    const [isFallbackLoading, setIsFallbackLoading] = useState(false);
    const [isEnrollmentOpen, setEnrollmentOpen] = useState(false);

    // Fallback resiliente: busca diretamente os alunos da turma se a lista global ainda não tiver
    useEffect(() => {
        if (!firestore || !classData?.students || classData.students.length === 0) {
            setFallbackStudents([]);
            return;
        }

        const studentIds = classData.students;
        if (users && users.length > 0) {
            const hasAny = studentIds.some(id => users.some(u => u.id === id));
            if (hasAny) {
                setFallbackStudents([]);
                return;
            }
        }

        let isCancelled = false;
        setIsFallbackLoading(true);

        const fetchDirect = async () => {
            try {
                const promises = studentIds.map(id => getDoc(doc(firestore, 'users', id)));
                const snaps = await Promise.all(promises);
                if (isCancelled) return;
                const loaded: User[] = [];
                snaps.forEach(s => {
                    if (s.exists()) {
                        loaded.push({ ...(s.data() as any), id: s.id });
                    }
                });
                setFallbackStudents(loaded);
            } catch (err) {
                console.error("Erro ao buscar alunos diretamente:", err);
            } finally {
                if (!isCancelled) setIsFallbackLoading(false);
            }
        };

        fetchDirect();
        return () => { isCancelled = true; };
    }, [firestore, classData?.students, users]);

    const enrolledStudents = useMemo(() => {
        const studentSet = new Set(classData?.students || []);
        if (studentSet.size === 0) return [];

        const pool = (users && users.length > 0) ? users : fallbackStudents;
        const students = pool.filter(u => studentSet.has(u.id));
        // ORDENANDO ALUNOS POR NOME
        students.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));
        return students;
    }, [users, fallbackStudents, classData]);
    
    const handleRemoveStudent = async (studentId: string) => {
        if (confirm('Tem certeza que deseja remover este aluno da turma?')) {
            const updatedStudents = (classData.students || []).filter((id: string) => id !== studentId);
            await updateClass(classData.id, { students: updatedStudents });

            if (classData.whatsappGroupId) {
                fetch('/api/notifications/groups/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        classId: classData.id,
                        students: updatedStudents
                    })
                }).catch(err => console.error('Failed to sync WhatsApp group:', err));
            }
        }
    };

    const isLoading = isContextLoading || (isUsersLoading && enrolledStudents.length === 0 && (classData?.students?.length || 0) > 0) || isFallbackLoading;

    if (isLoading) {
        return <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>;
    }
    
    return (
        <>
            <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-muted-foreground">
                    {enrolledStudents.length} aluno(s) matriculado(s) nesta turma.
                </p>
                <Button size="sm" onClick={() => setEnrollmentOpen(true)}>
                    <PlusCircle className="mr-2 size-4" /> Matricular Aluno
                </Button>
            </div>
            <div className="rounded-md border">
                <div className="overflow-x-auto w-full">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Aluno</TableHead>
                                <TableHead>Contato</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {enrolledStudents.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center">Nenhum aluno matriculado.</TableCell>
                                </TableRow>
                            ) : (
                                enrolledStudents.map((student: User) => {
                                    const avatar = PlaceHolderImages.find(p => p.id === 'avatar-1');
                                    return (
                                        <TableRow key={student.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-9 w-9">
                                                        {avatar && <AvatarImage src={avatar.imageUrl} alt={student.name} />}
                                                        <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="font-medium">{student.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{student.email || student.phone || '-'}</TableCell>
                                            <TableCell className="text-right">
                                                <Button 
                                                  variant="ghost" 
                                                  size="icon" 
                                                  onClick={() => handleRemoveStudent(student.id)}
                                                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                  title="Remover Matrícula"
                                                >
                                                    <UserX className="size-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
            
            <EnrollmentDialog
                open={isEnrollmentOpen}
                onOpenChange={setEnrollmentOpen}
                initialCourseId={classData?.courseId}
            />
        </>
    );
}
