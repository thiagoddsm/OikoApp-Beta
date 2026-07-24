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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, UserPlus, CheckCircle2, ArrowRight, ArrowLeft, GraduationCap, DollarSign, Calendar, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMembersData, useCoursesData } from '@/hooks/useDomainData';
import { useTeachingPrograms } from '@/hooks/useTeachingPrograms';
import { useFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc, collection, writeBatch } from 'firebase/firestore';
import { AcademicEnrollment, AcademicEvent } from '@/lib/programs/enrollment-types';
import { TuitionFee } from '@/lib/finance/financial-plan-types';
import { checkCoursePrerequisitesSatisfied } from '@/lib/services/progression-engine';

interface AcademicEnrollmentWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProgramId?: string;
  defaultCourseId?: string;
}

export function AcademicEnrollmentWizard({
  open,
  onOpenChange,
  defaultProgramId,
  defaultCourseId
}: AcademicEnrollmentWizardProps) {
  const { firestore, user: currentUser } = useFirebase();
  const { toast } = useToast();
  const { users } = useMembersData();
  const { courses, classes } = useCoursesData();
  const { programs } = useTeachingPrograms();

  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form State
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [isNewStudent, setIsNewStudent] = useState<boolean>(false);
  const [newStudentName, setNewStudentName] = useState<string>('');
  const [newStudentEmail, setNewStudentEmail] = useState<string>('');
  const [newStudentCpf, setNewStudentCpf] = useState<string>('');

  const [programId, setProgramId] = useState<string>(defaultProgramId || '');
  const [academicCycle, setAcademicCycle] = useState<string>('Ciclo 2026/2');
  const [courseId, setCourseId] = useState<string>(defaultCourseId || '');
  const [classId, setClassId] = useState<string>('');

  // Financial State
  const [isPaidCourse, setIsPaidCourse] = useState<boolean>(true);
  const [tuitionValue, setTuitionValue] = useState<number>(85);
  const [installments, setInstallments] = useState<number>(6);
  const [dueDay, setDueDay] = useState<number>(10);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [isScholarship, setIsScholarship] = useState<boolean>(false);

  // Derived Options
  const availableCourses = useMemo(() => {
    if (!programId) return courses;
    return courses.filter((c: any) => {
      const p = (c.schoolId || c.programId || c.ministry || '').toLowerCase();
      return p === programId.toLowerCase() || p.includes(programId.toLowerCase());
    });
  }, [courses, programId]);

  const availableClasses = useMemo(() => {
    if (!courseId) return [];
    return classes.filter(c => c.courseId === courseId);
  }, [classes, courseId]);

  const selectedStudent = useMemo(() => {
    return users.find(u => u.id === selectedStudentId);
  }, [users, selectedStudentId]);

  const selectedCourse = useMemo(() => {
    return courses.find(c => c.id === courseId);
  }, [courses, courseId]);

  const selectedClass = useMemo(() => {
    return classes.find(c => c.id === classId);
  }, [classes, classId]);

  // Prerequisite Check
  const prerequisiteStatus = useMemo(() => {
    if (!courseId || !selectedCourse) return { satisfied: true, missingCourseIds: [] };
    const prerequisites = (selectedCourse as any).prerequisites || [];
    return checkCoursePrerequisitesSatisfied({
      studentEnrollments: [],
      prerequisiteCourseIds: prerequisites
    });
  }, [courseId, selectedCourse]);

  const handleNext = () => {
    if (step === 1) {
      if (!isNewStudent && !selectedStudentId) {
        toast({ variant: 'destructive', title: 'Selecione um Aluno', description: 'Escolha um aluno cadastrado ou altere para Novo Aluno.' });
        return;
      }
      if (isNewStudent && !newStudentName) {
        toast({ variant: 'destructive', title: 'Nome Obrigatório', description: 'Digite o nome do novo aluno.' });
        return;
      }
    }
    if (step === 2) {
      if (!courseId) {
        toast({ variant: 'destructive', title: 'Selecione um Curso', description: 'Escolha o curso para matricular.' });
        return;
      }
      if (!classId) {
        toast({ variant: 'destructive', title: 'Selecione uma Turma', description: 'Escolha a turma e horário do aluno.' });
        return;
      }
    }
    setStep(prev => prev + 1);
  };

  const handleBack = () => setStep(prev => Math.max(1, prev - 1));

  const handleCompleteEnrollment = async () => {
    if (!firestore || !currentUser) return;

    try {
      setIsSubmitting(true);
      const batch = writeBatch(firestore);
      const nowIso = new Date().toISOString();

      let studentId = selectedStudentId;
      let studentName = selectedStudent?.name || newStudentName;
      let studentEmail = selectedStudent?.email || newStudentEmail;

      // 1. Create new student profile if necessary
      if (isNewStudent) {
        const newRef = doc(collection(firestore, 'users'));
        studentId = newRef.id;
        batch.set(newRef, {
          id: studentId,
          name: newStudentName,
          email: newStudentEmail,
          cpf: newStudentCpf,
          role: 'aluno',
          createdAt: nowIso
        }, { merge: true });
      }

      // 2. Create Academic Enrollment record
      const enrollmentId = `enr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const initialEvent: AcademicEvent = {
        id: `evt_${Date.now()}`,
        eventType: 'ENROLLED',
        toClassId: classId,
        date: nowIso,
        byUserId: currentUser.uid,
        byUserName: currentUser.displayName || currentUser.email || 'Secretaria',
        observation: `Matrícula efetuada via Wizard de Secretaria`
      };

      const finalTuition = isScholarship ? 0 : Math.max(0, tuitionValue * (1 - discountPercent / 100));

      const enrollment: AcademicEnrollment = {
        id: enrollmentId,
        studentId,
        studentName,
        studentEmail,
        programId: programId || 'general',
        academicCycleId: academicCycle,
        courseId,
        classId,
        status: 'ativa',
        enrolledAt: nowIso,
        financial: {
          tuitionValue: finalTuition,
          discountPercent,
          scholarship: isScholarship,
          paymentDay: dueDay
        },
        events: [initialEvent]
      };

      const enrRef = doc(firestore, 'academic_enrollments', enrollmentId);
      batch.set(enrRef, enrollment, { merge: true });

      // 3. Update class students array in Firestore
      if (selectedClass) {
        const updatedStudents = Array.from(new Set([...(selectedClass.students || []), studentId]));
        const classRef = doc(firestore, 'classes', classId);
        batch.set(classRef, { students: updatedStudents }, { merge: true });
      }

      // 4. Generate Tuition Fees if paid course
      if (isPaidCourse && finalTuition > 0 && !isScholarship) {
        for (let i = 1; i <= installments; i++) {
          const feeId = `fee_${enrollmentId}_${i}`;
          const compDate = new Date();
          compDate.setMonth(compDate.getMonth() + (i - 1));
          const competence = `${compDate.getFullYear()}-${String(compDate.getMonth() + 1).padStart(2, '0')}`;
          const dueDateStr = `${compDate.getFullYear()}-${String(compDate.getMonth() + 1).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;

          const fee: TuitionFee = {
            id: feeId,
            enrollmentId,
            studentId,
            studentName,
            courseName: selectedCourse?.name || 'Curso',
            amount: finalTuition,
            competence,
            dueDate: dueDateStr,
            status: 'em_aberto'
          };
          const feeRef = doc(firestore, 'tuition_fees', feeId);
          batch.set(feeRef, fee, { merge: true });
        }
      }

      // Atomic commit
      await batch.commit();

      toast({
        title: 'Matrícula Efetivada com Sucesso! 🎉',
        description: `Aluno ${studentName} foi matriculado na turma ${selectedClass?.name || ''}.`
      });

      onOpenChange(false);
      // Reset State
      setStep(1);
      setSelectedStudentId('');
      setIsNewStudent(false);
      setNewStudentName('');
      setClassId('');
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro na Matrícula',
        description: err.message || 'Falha ao efetivar a matrícula do aluno.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-black">
            <UserPlus className="size-6 text-indigo-600" />
            Wizard de Matrícula Unificada
          </DialogTitle>
          <DialogDescription>
            Passo {step} de 3 — Fluxo completo de cadastro, vínculo de turma e geração de carnê.
          </DialogDescription>
        </DialogHeader>

        {/* Stepper Header */}
        <div className="flex items-center justify-between border-b pb-3 text-xs font-bold text-slate-500">
          <span className={step === 1 ? 'text-indigo-600 underline' : ''}>1. Aluno</span>
          <ArrowRight className="size-3 text-slate-300" />
          <span className={step === 2 ? 'text-indigo-600 underline' : ''}>2. Curso & Turma</span>
          <ArrowRight className="size-3 text-slate-300" />
          <span className={step === 3 ? 'text-indigo-600 underline' : ''}>3. Financeiro & Efetivação</span>
        </div>

        {/* STEP 1: ALUNO */}
        {step === 1 && (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border">
              <div>
                <p className="text-xs font-bold">Cadastrar Novo Aluno?</p>
                <p className="text-[11px] text-slate-500">Ative para criar o perfil do aluno agora mesmo.</p>
              </div>
              <Switch checked={isNewStudent} onCheckedChange={setIsNewStudent} />
            </div>

            {!isNewStudent ? (
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-500">Selecionar Aluno da Base</Label>
                <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Busque pelo nome ou email do aluno..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.email || u.cpf || 'Sem email'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-600">Nome Completo do Aluno *</Label>
                  <Input placeholder="Ex: Sônia Barros dos Santos" value={newStudentName} onChange={e => setNewStudentName(e.target.value)} className="h-10 text-xs" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-600">Email</Label>
                    <Input placeholder="email@exemplo.com" value={newStudentEmail} onChange={e => setNewStudentEmail(e.target.value)} className="h-10 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-600">CPF</Label>
                    <Input placeholder="000.000.000-00" value={newStudentCpf} onChange={e => setNewStudentCpf(e.target.value)} className="h-10 text-xs" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: CURSO E TURMA */}
        {step === 2 && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-500 uppercase">Programa de Ensino</Label>
                <Select value={programId} onValueChange={setProgramId}>
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue placeholder="Selecione o programa" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map(p => (
                      <SelectItem key={p.id} value={p.slug}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-500 uppercase">Ciclo / Período</Label>
                <Input value={academicCycle} onChange={e => setAcademicCycle(e.target.value)} className="h-10 text-xs font-bold" />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-500 uppercase">Curso *</Label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger className="h-10 text-xs">
                  <SelectValue placeholder="Selecione o curso..." />
                </SelectTrigger>
                <SelectContent>
                  {availableCourses.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-500 uppercase">Turma / Horário *</Label>
              <Select value={classId} onValueChange={setClassId} disabled={!courseId}>
                <SelectTrigger className="h-10 text-xs">
                  <SelectValue placeholder={courseId ? "Selecione a turma..." : "Escolha o curso primeiro"} />
                </SelectTrigger>
                <SelectContent>
                  {availableClasses.map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name} — {cls.dayOfWeek} às {cls.startTime} ({cls.students?.length || 0} alunos)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* STEP 3: FINANCEIRO & CONFIRMAÇÃO */}
        {step === 3 && (
          <div className="space-y-4 py-2">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Curso Com Cobrança Financeira?</p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400">Gera parcelas mensais na coleção de mensalidades.</p>
              </div>
              <Switch checked={isPaidCourse} onCheckedChange={setIsPaidCourse} />
            </div>

            {isPaidCourse && (
              <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-slate-500">Valor Mensal (R$)</Label>
                  <Input type="number" value={tuitionValue} onChange={e => setTuitionValue(Number(e.target.value))} className="h-9 text-xs font-bold" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-slate-500">Parcelas</Label>
                  <Input type="number" value={installments} onChange={e => setInstallments(Number(e.target.value))} className="h-9 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-slate-500">Vencimento (Dia)</Label>
                  <Input type="number" value={dueDay} onChange={e => setDueDay(Number(e.target.value))} className="h-9 text-xs" />
                </div>
              </div>
            )}

            {/* Resumo Final */}
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 text-xs space-y-1">
              <p className="font-bold text-indigo-900 dark:text-indigo-200">Resumo da Matrícula:</p>
              <p><strong className="text-slate-700 dark:text-slate-300">Aluno:</strong> {selectedStudent?.name || newStudentName}</p>
              <p><strong className="text-slate-700 dark:text-slate-300">Curso:</strong> {selectedCourse?.name}</p>
              <p><strong className="text-slate-700 dark:text-slate-300">Turma:</strong> {selectedClass?.name}</p>
              <p><strong className="text-slate-700 dark:text-slate-300">Financeiro:</strong> {isPaidCourse ? `${installments}x de R$ ${tuitionValue.toFixed(2)} (Venc. dia ${dueDay})` : 'Curso Gratuito'}</p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step > 1 && (
            <Button variant="outline" onClick={handleBack} disabled={isSubmitting}>
              <ArrowLeft className="size-4 mr-1" /> Voltar
            </Button>
          )}

          {step < 3 ? (
            <Button onClick={handleNext} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
              Avançar <ArrowRight className="size-4 ml-1" />
            </Button>
          ) : (
            <Button 
              onClick={handleCompleteEnrollment} 
              disabled={isSubmitting} 
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Efetivando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" /> Efetivar Matrícula
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
