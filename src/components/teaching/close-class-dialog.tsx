'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useVolunteering, type Class, type Course } from '@/contexts/volunteering-context';
import { addTimelineEvent } from '@/lib/timeline';
import { useFirebase } from '@/firebase';

interface CloseClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classData: Class;
  courseData: Course;
}

export function CloseClassDialog({ open, onOpenChange, classData, courseData }: CloseClassDialogProps) {
  const { users, updateClass, updateVolunteer } = useVolunteering();
  const { firestore, user: currentUser } = useFirebase();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [studentStatuses, setStudentStatuses] = useState<Record<string, 'approved' | 'rejected' | 'none'>>({});

  const enrolledStudents = useMemo(() => {
    if (!users || !classData?.students) return [];
    const studentSet = new Set(classData.students);
    return users
      .filter(u => studentSet.has(u.id))
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));
  }, [users, classData]);

  // Obter ementa e ocorrências para cálculo rápido de sugestão de aprovação
  const classOccurrences = useMemo(() => {
    if (!classData || !classData.startDate) return [];
    const items: string[] = [];
    const start = new Date(classData.startDate);
    const overrides = classData.scheduleOverrides || {};
    
    if (classData.frequency && classData.frequency !== 'pontual') {
      // Simplificado: buscar as ocorrências já registradas no diário de classe
      classData.attendance?.forEach(a => {
        if (a.date && !items.includes(a.date)) items.push(a.date);
      });
    } else if (classData.frequency === 'pontual') {
      items.push(classData.startDate);
    }
    
    return items;
  }, [classData]);

  const assessments = useMemo(() => {
    if (!classData.grades) return [];
    return Array.from(new Set(classData.grades.map(g => g.assessmentName)));
  }, [classData.grades]);

  // Inicializar sugestão automática
  const studentMetrics = useMemo(() => {
    const metrics: Record<string, { attendancePercent: number; averageGrade: number; suggested: 'approved' | 'rejected' }> = {};
    
    enrolledStudents.forEach(student => {
      // 1. Frequência
      let presentCount = 0;
      let totalClasses = 0;
      classOccurrences.forEach(date => {
        const record = classData.attendance?.find(a => a.date === date);
        if (record) {
          totalClasses++;
          if (record.presentStudentIds?.includes(student.id) || record.onlineStudentIds?.includes(student.id)) {
            presentCount++;
          }
        }
      });
      const attendancePercent = totalClasses > 0 ? (presentCount / totalClasses) * 100 : 100;

      // 2. Média
      let sumGrades = 0;
      let countGrades = 0;
      assessments.forEach(ass => {
        const gradeEntry = classData.grades?.find(g => g.studentId === student.id && g.assessmentName === ass);
        if (gradeEntry) {
          sumGrades += gradeEntry.grade;
          countGrades++;
        }
      });
      const averageGrade = countGrades > 0 ? sumGrades / countGrades : 10; // Se não houver avaliações, assume-se nota cheia

      // Sugestão de status (Frequência >= 75% e Média >= 7.0 como regra geral do sistema)
      const suggested = (attendancePercent >= 75 && averageGrade >= 7.0) ? 'approved' : 'rejected';
      
      metrics[student.id] = {
        attendancePercent,
        averageGrade,
        suggested
      };
    });

    return metrics;
  }, [enrolledStudents, classOccurrences, classData, assessments]);

  // Inicializa o estado com as sugestões automáticas
  React.useEffect(() => {
    if (open && enrolledStudents.length > 0) {
      const initial: Record<string, 'approved' | 'rejected' | 'none'> = {};
      enrolledStudents.forEach(student => {
        initial[student.id] = studentMetrics[student.id]?.suggested || 'approved';
      });
      setStudentStatuses(initial);
    }
  }, [open, enrolledStudents, studentMetrics]);

  const handleStatusChange = (studentId: string, status: 'approved' | 'rejected' | 'none') => {
    setStudentStatuses(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleConfirmClose = async () => {
    setIsSaving(true);
    try {
      // 1. Atualiza os estudantes no banco
      const promises = enrolledStudents.map(async (student) => {
        const status = studentStatuses[student.id];
        if (!status || status === 'none') return;

        // Atualizar perfil
        await updateVolunteer(student.id, {
          [`journey.courseStatus.${courseData.id}`]: status
        });

        // Registrar timeline
        if (firestore) {
          await addTimelineEvent(student.id, firestore, {
            category: 'teaching',
            entityTitle: courseData.name,
            eventDescription: status === 'approved' ? 'APROVADO (Manualmente ao encerrar a turma)' : 'REPROVADO (Manualmente ao encerrar a turma)',
            statusBadge: status === 'approved' ? 'APROVADO' : 'REPROVADO',
            source: 'manual',
            authorId: currentUser?.uid ?? 'system',
            relatedId: courseData.id,
          });
        }
      });

      await Promise.all(promises);

      // 2. Conclui a turma
      await updateClass(classData.id, {
        status: 'completed',
        endDate: classData.endDate || new Date().toISOString().split('T')[0]
      });

      toast({
        title: "Turma Encerrada com Sucesso",
        description: "A turma foi concluída e o status dos alunos foi atualizado nos perfis."
      });
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Erro ao Encerrar Turma",
        description: "Houve um problema técnico ao atualizar os registros."
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 shadow-2xl border-none">
        <DialogHeader className="p-6 border-b bg-muted/20 shrink-0">
          <DialogTitle className="text-xl font-black italic tracking-tighter uppercase text-primary flex items-center gap-2">
            <ShieldCheck className="size-6 text-primary" /> Encerrar Turma
          </DialogTitle>
          <DialogDescription className="text-xs uppercase font-bold text-muted-foreground tracking-widest">
            Defina o status final de aprovação dos alunos e conclua a turma.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
            <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-bold mb-1">Atenção:</p>
              <p>Esta ação marcará a turma como <strong>Concluída</strong> e atualizará o histórico acadêmico dos alunos. Você pode alterar a decisão sugerida para cada aluno abaixo.</p>
            </div>
          </div>

          <div className="rounded-xl border shadow-sm bg-background overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-bold text-slate-800">Aluno</TableHead>
                  <TableHead className="text-center font-bold text-slate-800">Presença</TableHead>
                  <TableHead className="text-center font-bold text-slate-800">Média</TableHead>
                  <TableHead className="text-right font-bold text-slate-800 pr-8">Status Final</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrolledStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground italic">
                      Nenhum aluno matriculado nesta turma.
                    </TableCell>
                  </TableRow>
                ) : (
                  enrolledStudents.map(student => {
                    const metrics = studentMetrics[student.id] || { attendancePercent: 100, averageGrade: 10, suggested: 'approved' };
                    const currentStatus = studentStatuses[student.id] || 'approved';

                    return (
                      <TableRow key={student.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-semibold text-slate-900">{student.name}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={metrics.attendancePercent >= 75 ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold" : "bg-red-50 text-red-700 border-red-200 font-bold"}>
                            {metrics.attendancePercent.toFixed(0)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-bold text-slate-700">
                          {metrics.averageGrade.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right">
                          <RadioGroup 
                            value={currentStatus} 
                            onValueChange={(val: any) => handleStatusChange(student.id, val)}
                            className="flex justify-end gap-4"
                          >
                            <div className="flex items-center space-x-1.5 cursor-pointer">
                              <RadioGroupItem value="approved" id={`aprov-${student.id}`} />
                              <Label htmlFor={`aprov-${student.id}`} className="text-xs font-bold text-emerald-600 cursor-pointer">Aprovado</Label>
                            </div>
                            <div className="flex items-center space-x-1.5 cursor-pointer">
                              <RadioGroupItem value="rejected" id={`reprov-${student.id}`} />
                              <Label htmlFor={`reprov-${student.id}`} className="text-xs font-bold text-red-600 cursor-pointer">Reprovado</Label>
                            </div>
                            <div className="flex items-center space-x-1.5 cursor-pointer">
                              <RadioGroupItem value="none" id={`none-${student.id}`} />
                              <Label htmlFor={`none-${student.id}`} className="text-xs font-bold text-slate-500 cursor-pointer">Sem Alterar</Label>
                            </div>
                          </RadioGroup>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter className="p-6 border-t bg-muted/20 shrink-0">
          <DialogClose asChild>
            <Button variant="outline" className="font-bold">Cancelar</Button>
          </DialogClose>
          <Button 
            onClick={handleConfirmClose} 
            disabled={isSaving || enrolledStudents.length === 0} 
            className="font-black uppercase tracking-widest bg-primary text-white shadow-lg shadow-primary/20"
          >
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
            Encerrar Turma Agora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
