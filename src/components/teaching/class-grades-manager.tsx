
'use client';
import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useVolunteering, type Class, type User } from '@/contexts/volunteering-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Save, Loader2, Trash2, AlertTriangle, Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useMembersData } from "@/hooks/useDomainData";

export function ClassGradesManager({ classData }: { classData: Class }) {
    const { users } = useMembersData();

    const { updateClass } = useVolunteering();
    const { toast } = useToast();
    const [newAssessment, setNewAssessment] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    // BUG-16 fix: replace confirm() with inline confirmation state
    const [pendingDelete, setPendingDelete] = useState<string | null>(null);
    // BUG-09 fix: local grades state + debounce to avoid a Firestore write on every keystroke
    const [localGrades, setLocalGrades] = useState<typeof classData.grades>(classData.grades);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const enrolledStudents = useMemo(() => {
        if (!users || !classData?.students) return [];
        const studentSet = new Set(classData.students);
        return users.filter(u => studentSet.has(u.id));
    }, [users, classData]);

    const assessments = useMemo(() => {
        if (!localGrades) return [];
        return Array.from(new Set(localGrades.map(g => g.assessmentName)));
    }, [localGrades]);

    // BUG-15 fix: await updateClass and handle errors so the field isn't cleared on failure
    const handleAddAssessment = async () => {
        if (!newAssessment.trim()) return;
        if (assessments.includes(newAssessment.trim())) {
            toast({ variant: 'destructive', title: 'Já existe uma avaliação com este nome.' });
            return;
        }

        const newGrades = [...(localGrades || [])];
        enrolledStudents.forEach(student => {
            newGrades.push({ studentId: student.id, assessmentName: newAssessment.trim(), grade: 0 });
        });

        setIsSaving(true);
        try {
            await updateClass(classData.id, { grades: newGrades });
            setLocalGrades(newGrades);
            setNewAssessment(''); // only clear on success
        } catch {
            toast({ variant: 'destructive', title: 'Erro ao salvar avaliação. Tente novamente.' });
        } finally {
            setIsSaving(false);
        }
    };

    // BUG-09 fix: update local state immediately (responsive UI), debounce Firestore write by 800ms
    const handleGradeChange = useCallback((studentId: string, assessmentName: string, value: string) => {
        const numericGrade = parseFloat(value) || 0;
        const newGrades = (localGrades || []).map(g =>
            (g.studentId === studentId && g.assessmentName === assessmentName)
                ? { ...g, grade: numericGrade }
                : g
        );
        setLocalGrades(newGrades);

        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            updateClass(classData.id, { grades: newGrades });
        }, 800);
    }, [localGrades, classData.id, updateClass]);

    // BUG-16 fix: use inline confirm instead of browser confirm()
    const handleRemoveAssessment = async (assessmentName: string) => {
        if (pendingDelete !== assessmentName) {
            setPendingDelete(assessmentName);
            return;
        }
        // Confirmed
        setPendingDelete(null);
        const newGrades = (localGrades || []).filter(g => g.assessmentName !== assessmentName);
        setLocalGrades(newGrades);
        await updateClass(classData.id, { grades: newGrades });
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
                        onKeyDown={e => e.key === 'Enter' && handleAddAssessment()}
                    />
                </div>
                <Button onClick={handleAddAssessment} disabled={!newAssessment.trim() || isSaving}>
                    {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <PlusCircle className="mr-2 size-4" />}
                    Criar Coluna
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
                                        {pendingDelete === assessment ? (
                                            // Inline confirmation — replaces browser confirm()
                                            <div className="flex items-center gap-1">
                                                <span className="text-[10px] text-destructive font-semibold">Confirmar?</span>
                                                <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => handleRemoveAssessment(assessment)}>
                                                    <Check className="size-3" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setPendingDelete(null)}>
                                                    <X className="size-3" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleRemoveAssessment(assessment)}>
                                                <Trash2 className="size-3" />
                                            </Button>
                                        )}
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
                                            const gradeEntry = localGrades?.find(g => g.studentId === student.id && g.assessmentName === assessment);
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
