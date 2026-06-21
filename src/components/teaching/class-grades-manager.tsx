
'use client';
import React, { useState, useMemo } from 'react';
import { useVolunteering, type Class, type User } from '@/contexts/volunteering-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Save, Loader2, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useMembersData } from "@/hooks/useDomainData";

export function ClassGradesManager({ classData }: { classData: Class }) {
    const { users } = useMembersData();

    const { updateClass } = useVolunteering();
    const { toast } = useToast();
    const [newAssessment, setNewAssessment] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const enrolledStudents = useMemo(() => {
        if (!users || !classData?.students) return [];
        const studentSet = new Set(classData.students);
        return users.filter(u => studentSet.has(u.id));
    }, [users, classData]);

    const assessments = useMemo(() => {
        if (!classData.grades) return [];
        return Array.from(new Set(classData.grades.map(g => g.assessmentName)));
    }, [classData.grades]);

    const handleAddAssessment = () => {
        if (!newAssessment.trim()) return;
        if (assessments.includes(newAssessment.trim())) {
            toast({ variant: 'destructive', title: 'Já existe uma avaliação com este nome.' });
            return;
        }
        
        const newGrades = [...(classData.grades || [])];
        enrolledStudents.forEach(student => {
            newGrades.push({ studentId: student.id, assessmentName: newAssessment.trim(), grade: 0 });
        });

        updateClass(classData.id, { grades: newGrades });
        setNewAssessment('');
    };

    const handleGradeChange = (studentId: string, assessmentName: string, value: string) => {
        const numericGrade = parseFloat(value) || 0;
        const newGrades = classData.grades?.map(g => 
            (g.studentId === studentId && g.assessmentName === assessmentName)
                ? { ...g, grade: numericGrade }
                : g
        ) || [];
        
        updateClass(classData.id, { grades: newGrades });
    };

    const handleRemoveAssessment = (assessmentName: string) => {
        if (confirm(`Remover avaliação "${assessmentName}" e todas as notas associadas?`)) {
            const newGrades = classData.grades?.filter(g => g.assessmentName !== assessmentName) || [];
            updateClass(classData.id, { grades: newGrades });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-end gap-2">
                <div className="flex-1 max-w-xs">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Nova Avaliação</label>
                    <Input 
                        placeholder="Ex: Prova 1, Trabalho..." 
                        value={newAssessment}
                        onChange={e => setNewAssessment(e.target.value)}
                    />
                </div>
                <Button onClick={handleAddAssessment} disabled={!newAssessment.trim()}>
                    <PlusCircle className="mr-2 size-4" /> Criar Coluna
                </Button>
            </div>

            <div className="rounded-md border bg-background overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="min-w-[200px]">Aluno</TableHead>
                            {assessments.map(assessment => (
                                <TableHead key={assessment} className="text-center min-w-[120px]">
                                    <div className="flex flex-col items-center gap-1">
                                        <span className="font-bold text-primary">{assessment}</span>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleRemoveAssessment(assessment)}>
                                            <Trash2 className="size-3" />
                                        </Button>
                                    </div>
                                </TableHead>
                            ))}
                            <TableHead className="text-center font-bold text-slate-900">Média</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {enrolledStudents.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={assessments.length + 2} className="h-24 text-center">Nenhum aluno matriculado.</TableCell>
                            </TableRow>
                        ) : (
                            enrolledStudents.map(student => {
                                let totalGrades = 0;
                                return (
                                    <TableRow key={student.id}>
                                        <TableCell className="font-medium">{student.name}</TableCell>
                                        {assessments.map(assessment => {
                                            const gradeEntry = classData.grades?.find(g => g.studentId === student.id && g.assessmentName === assessment);
                                            const grade = gradeEntry?.grade || 0;
                                            totalGrades += grade;
                                            return (
                                                <TableCell key={assessment} className="text-center">
                                                    <Input 
                                                        type="number" 
                                                        step="0.1" 
                                                        min="0" 
                                                        max="10"
                                                        className="w-20 mx-auto text-center font-bold"
                                                        value={grade}
                                                        onChange={e => handleGradeChange(student.id, assessment, e.target.value)}
                                                    />
                                                </TableCell>
                                            );
                                        })}
                                        <TableCell className="text-center font-black text-primary">
                                            {assessments.length > 0 ? (totalGrades / assessments.length).toFixed(1) : '-'}
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
