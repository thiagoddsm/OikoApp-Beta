'use client';

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Rocket, Loader2, CheckCircle2, ArrowRight, AlertCircle, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { promoteClassCohort } from '@/lib/services/progression-engine';
import { AcademicEnrollment } from '@/lib/programs/enrollment-types';

interface ClassPromotionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentClass: {
    id: string;
    name: string;
    courseId: string;
    students?: string[];
  } | null;
  allClasses: {
    id: string;
    name: string;
    courseId: string;
    students?: string[];
  }[];
  allCourses: {
    id: string;
    name: string;
  }[];
}

export function ClassPromotionDialog({
  open,
  onOpenChange,
  currentClass,
  allClasses,
  allCourses
}: ClassPromotionDialogProps) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();

  const [targetClassId, setTargetClassId] = useState<string>('');
  const [observation, setObservation] = useState<string>('');
  const [isPromoting, setIsPromoting] = useState<boolean>(false);

  // Available target classes (excluding current class)
  const availableTargetClasses = useMemo(() => {
    if (!currentClass) return [];
    return allClasses.filter(c => c.id !== currentClass.id);
  }, [currentClass, allClasses]);

  const targetClass = useMemo(() => {
    return allClasses.find(c => c.id === targetClassId);
  }, [allClasses, targetClassId]);

  const targetCourse = useMemo(() => {
    if (!targetClass) return null;
    return allCourses.find(c => c.id === targetClass.courseId);
  }, [allCourses, targetClass]);

  const handlePromote = async () => {
    if (!currentClass || !targetClassId || !targetClass || !firestore || !user) {
      toast({
        variant: 'destructive',
        title: 'Selecione a turma de destino',
        description: 'Escolha para qual turma os alunos promovidos serão transferidos.'
      });
      return;
    }

    const studentIds = currentClass.students || [];
    if (studentIds.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Turma Vazia',
        description: 'Não há alunos matriculados nesta turma para promover.'
      });
      return;
    }

    try {
      setIsPromoting(true);

      // Create synthetic enrollments for current students if not existent yet
      const dummyEnrollments: AcademicEnrollment[] = studentIds.map((sId, idx) => ({
        id: `enr_curr_${sId}_${currentClass.id}`,
        studentId: sId,
        studentName: `Aluno ${idx + 1}`,
        studentEmail: '',
        programId: 'dis',
        courseId: currentClass.courseId,
        classId: currentClass.id,
        status: 'ativa',
        enrolledAt: new Date().toISOString(),
        events: []
      }));

      const result = promoteClassCohort({
        currentEnrollments: dummyEnrollments,
        targetClassId: targetClass.id,
        targetCourseId: targetClass.courseId,
        targetClassName: targetClass.name,
        promotedByUserId: user.uid,
        promotedByUserName: user.displayName || user.email || 'Coordenador',
        observation: observation || `Promoção da turma ${currentClass.name} para ${targetClass.name}`
      });

      // Update target class with new student IDs in Firestore
      const updatedTargetStudents = Array.from(new Set([...(targetClass.students || []), ...studentIds]));
      await setDocumentNonBlocking(doc(firestore, 'classes', targetClass.id), {
        students: updatedTargetStudents
      }, { merge: true });

      // Save generated academic enrollments in Firestore
      for (const enr of result.newEnrollments) {
        await setDocumentNonBlocking(doc(firestore, 'academic_enrollments', enr.id), enr, { merge: true });
      }

      toast({
        title: 'Turma Promovida com Sucesso! 🚀',
        description: `${result.promotedCount} alunos foram promovidos de ${currentClass.name} para ${targetClass.name}.`
      });

      onOpenChange(false);
      setTargetClassId('');
      setObservation('');
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro na Promoção',
        description: err.message || 'Falha ao promover alunos da turma.'
      });
    } finally {
      setIsPromoting(false);
    }
  };

  if (!currentClass) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-black">
            <Rocket className="size-6 text-indigo-600" />
            Promover Turma Inteira (Próximo Nível)
          </DialogTitle>
          <DialogDescription>
            Migre todos os alunos da turma <strong className="text-slate-800 dark:text-slate-200">{currentClass.name}</strong> para o próximo nível/semestre com histórico mantido.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* Summary Box */}
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-indigo-600" />
              <span className="font-bold text-slate-700 dark:text-slate-300">Alunos a Promover:</span>
            </div>
            <Badge className="bg-indigo-600 text-white font-bold">{currentClass.students?.length || 0} alunos</Badge>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-slate-500">Turma de Destino (Próximo Nível)</Label>
            <Select value={targetClassId} onValueChange={setTargetClassId}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Selecione a turma de destino..." />
              </SelectTrigger>
              <SelectContent>
                {availableTargetClasses.map(cls => {
                  const crs = allCourses.find(c => c.id === cls.courseId);
                  return (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name} ({crs?.name || 'Curso'}) — {cls.students?.length || 0} alunos
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {targetClass && (
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border text-xs space-y-1">
              <p className="text-slate-500">Resumo da Transição:</p>
              <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                <span>{currentClass.name}</span>
                <ArrowRight className="size-3.5 text-indigo-500" />
                <span className="text-indigo-600 dark:text-indigo-400">{targetClass.name}</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-slate-500">Observações de Promoção (Opcional)</Label>
            <Textarea 
              placeholder="Ex: Alunos promovidos após conclusão do semestre 2026/1 com 100% de aproveitamento." 
              value={observation} 
              onChange={e => setObservation(e.target.value)} 
              rows={3} 
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button 
            onClick={handlePromote} 
            disabled={isPromoting || !targetClassId} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5"
          >
            {isPromoting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Promovendo...
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4" /> Confirmar Promoção da Turma
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
