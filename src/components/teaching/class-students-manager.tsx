'use client';
import React, { useMemo, useState } from 'react';
import { useVolunteering } from '@/contexts/volunteering-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Loader2, PlusCircle, UserX } from 'lucide-react';
import { EnrollmentDialog } from './enrollment-dialog';

interface ClassStudentsManagerProps {
    classData: any;
}

export function ClassStudentsManager({ classData }: ClassStudentsManagerProps) {
    const { users, isLoading, updateClass } = useVolunteering();
    const [isEnrollmentOpen, setEnrollmentOpen] = useState(false);

    const enrolledStudents = useMemo(() => {
        if (!users || !classData?.students) return [];
        const studentSet = new Set(classData.students);
        return users.filter(u => studentSet.has(u.id));
    }, [users, classData]);
    
    const handleRemoveStudent = async (studentId: string) => {
        if (confirm('Tem certeza que deseja remover este aluno da turma?')) {
            const updatedStudents = classData.students.filter((id: string) => id !== studentId);
            await updateClass(classData.id, { students: updatedStudents });
        }
    };

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
                            enrolledStudents.map(student => {
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
                                            <Button variant="ghost" size="icon" onClick={() => handleRemoveStudent(student.id)}>
                                                <UserX className="size-4 text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
            
            <EnrollmentDialog
                open={isEnrollmentOpen}
                onOpenChange={setEnrollmentOpen}
                initialCourseId={classData?.courseId}
            />
        </>
    );
}
