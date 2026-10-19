'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Sparkles,
  PlusCircle,
  Trash2,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  MessageSquare,
  RotateCcw,
  Save,
  Loader2,
  AlertCircle,
  HelpCircle,
  Tag,
  KeyRound
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Course, CourseQuizQuestion } from '@/domain/course';
import { getSeedQuestionsForCourseLesson } from '@/lib/teaching/quiz-seed-data';

export interface LessonQuizEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: Course | any;
  lessonNumber: number;
  lessonTitle?: string;
  syllabusId?: string;
  onSaved?: (questions: CourseQuizQuestion[], enabled: boolean) => void;
}

export function LessonQuizEditorModal({
  open,
  onOpenChange,
  course,
  lessonNumber,
  lessonTitle,
  syllabusId,
  onSaved
}: LessonQuizEditorModalProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [questions, setQuestions] = useState<CourseQuizQuestion[]>([]);
  const [isEnabled, setIsEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const displayTitle = useMemo(() => {
    if (lessonTitle && lessonTitle.trim()) return lessonTitle;
    if (course?.syllabus && Array.isArray(course.syllabus)) {
      const target = syllabusId 
        ? course.syllabus.find((s: any) => s.id === syllabusId) 
        : course.syllabus[lessonNumber - 1];
      if (target?.title) return target.title;
    }
    return `Aula ${lessonNumber}`;
  }, [lessonTitle, course?.syllabus, syllabusId, lessonNumber]);

  // Carrega as perguntas salvas ou aplica o seed pré-carregado
  useEffect(() => {
    if (!open) return;

    // 1. Tenta carregar do map lessonQuizzes[lessonNumber]
    const quizFromMap = course?.lessonQuizzes?.[String(lessonNumber)] || course?.lessonQuizzes?.[lessonNumber];
    
    // 2. Tenta carregar do syllabus
    let quizFromSyllabus = null;
    if (course?.syllabus && Array.isArray(course.syllabus)) {
      const target = syllabusId 
        ? course.syllabus.find((s: any) => s.id === syllabusId) 
        : course.syllabus[lessonNumber - 1];
      if (target?.quiz) quizFromSyllabus = target.quiz;
    }

    const activeQuiz = quizFromMap || quizFromSyllabus;

    if (activeQuiz && Array.isArray(activeQuiz.questions) && activeQuiz.questions.length > 0) {
      setQuestions(JSON.parse(JSON.stringify(activeQuiz.questions)));
      setIsEnabled(activeQuiz.enabled !== false);
    } else {
      // Pré-carregamento inteligente (Seed) para Aulas 1 e 2 do Apoiar ou novo array vazio
      const seed = getSeedQuestionsForCourseLesson(course?.id, course?.name, lessonNumber);
      if (seed.length > 0) {
        setQuestions(seed);
        setIsEnabled(true);
      } else {
        setQuestions([]);
        setIsEnabled(true);
      }
    }
  }, [open, course, lessonNumber, syllabusId]);

  // Manipuladores de Pergunta
  const handleAddQuestion = (type: 'multiple_choice' | 'discursive') => {
    const nextId = questions.length > 0 ? Math.max(...questions.map(q => q.id || 0)) + 1 : 1;
    if (type === 'multiple_choice') {
      const newQ: CourseQuizQuestion = {
        id: nextId,
        type: 'multiple_choice',
        category: 'Conteúdo da Aula',
        question: '',
        correct: '',
        distractors: ['', '', ''],
        feedback: ''
      };
      setQuestions(prev => [...prev, newQ]);
    } else {
      const newQ: CourseQuizQuestion = {
        id: nextId,
        type: 'discursive',
        category: 'Reflexão & Ação Pastoral',
        question: '',
        keywords: [],
        feedback: ''
      };
      setQuestions(prev => [...prev, newQ]);
    }
  };

  const handleUpdateQuestion = (index: number, updates: Partial<CourseQuizQuestion>) => {
    setQuestions(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const handleDeleteQuestion = (index: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;

    setQuestions(prev => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  const handleRestoreDefaults = () => {
    const seed = getSeedQuestionsForCourseLesson(course?.id, course?.name, lessonNumber);
    if (seed.length > 0) {
      setQuestions(seed);
      toast({
        title: "Perguntas Restauradas",
        description: `As ${seed.length} perguntas padrão desta aula foram recarregadas no editor.`
      });
    } else {
      toast({
        variant: "destructive",
        title: "Sem Perguntas Padrão",
        description: "Não há gabarito pré-definido para esta aula. Crie perguntas livremente."
      });
    }
  };

  // Salvar no Firestore
  const handleSave = async () => {
    if (!course?.id) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Curso não identificado.' });
      return;
    }

    if (!firestore) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Conexão com Firestore indisponível.' });
      return;
    }

    // Validação básica
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) {
        toast({
          variant: 'destructive',
          title: `Pergunta ${i + 1} incompleta`,
          description: 'O enunciado da pergunta não pode ficar em branco.'
        });
        return;
      }
      if (q.type === 'multiple_choice') {
        if (!q.correct?.trim()) {
          toast({
            variant: 'destructive',
            title: `Pergunta ${i + 1} incompleta`,
            description: 'Informe a alternativa correta da pergunta de múltipla escolha.'
          });
          return;
        }
      }
    }

    setIsSaving(true);
    try {
      // Higieniza IDs sequenciais para exibição consistente
      const cleanQuestions = questions.map((q, idx) => ({
        ...q,
        id: idx + 1,
        distractors: q.type === 'multiple_choice' ? (q.distractors || []).map(d => d.trim()).filter(Boolean) : []
      }));

      const courseDocRef = doc(firestore, 'courses', course.id);
      const payload: Record<string, any> = {
        [`lessonQuizzes.${lessonNumber}`]: {
          enabled: isEnabled,
          title: displayTitle,
          questions: cleanQuestions,
          updatedAt: new Date().toISOString()
        }
      };

      // Se o curso tem syllabus, atualiza também a ementa correspondente
      if (course?.syllabus && Array.isArray(course.syllabus)) {
        const updatedSyllabus = course.syllabus.map((m: any, idx: number) => {
          const isTarget = syllabusId ? m.id === syllabusId : (idx + 1 === lessonNumber);
          if (isTarget) {
            return {
              ...m,
              quiz: {
                enabled: isEnabled,
                questions: cleanQuestions
              }
            };
          }
          return m;
        });
        payload.syllabus = updatedSyllabus;
      }

      await updateDocumentNonBlocking(courseDocRef, payload);

      toast({
        title: "Questionário Salvo!",
        description: `O questionário da Aula ${lessonNumber} (${cleanQuestions.length} perguntas) foi salvo com sucesso no Firestore.`
      });

      if (onSaved) {
        onSaved(cleanQuestions, isEnabled);
      }

      onOpenChange(false);
    } catch (err: any) {
      console.error("Erro ao salvar questionário da aula:", err);
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: err?.message || "Não foi possível salvar o questionário no banco de dados."
      });
    } finally {
      setIsSaving(false);
    }
  };

  const hasSeedAvailable = useMemo(() => {
    const seed = getSeedQuestionsForCourseLesson(course?.id, course?.name, lessonNumber);
    return seed.length > 0;
  }, [course?.id, course?.name, lessonNumber]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-slate-50 border-purple-200">
        {/* Cabeçalho */}
        <DialogHeader className="p-5 pb-4 bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg bg-white/20 text-white">
                  <Sparkles className="size-4" />
                </span>
                <DialogTitle className="text-lg font-black text-white tracking-tight">
                  Questionário da Aula {lessonNumber}: {displayTitle}
                </DialogTitle>
                <Badge className="bg-purple-900/60 text-purple-200 border-purple-400/30 text-[10px] font-bold">
                  {questions.length} {questions.length === 1 ? 'pergunta' : 'perguntas'}
                </Badge>
              </div>
              <DialogDescription className="text-xs text-purple-100/90 leading-relaxed max-w-2xl">
                Configure as perguntas, alternativas corretas e reflexões pastorais para a chamada via celular nesta aula.
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">
              <input
                id="modal-quiz-enable-toggle"
                type="checkbox"
                checked={isEnabled}
                onChange={e => setIsEnabled(e.target.checked)}
                className="size-4 rounded border-white/40 text-purple-600 focus:ring-purple-400"
              />
              <Label htmlFor="modal-quiz-enable-toggle" className="text-xs font-bold text-white cursor-pointer select-none">
                {isEnabled ? 'Quiz Ativo' : 'Quiz Pausado'}
              </Label>
            </div>
          </div>
        </DialogHeader>

        {/* Barra de Ações Rápidas */}
        <div className="bg-white px-5 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => handleAddQuestion('multiple_choice')}
              className="h-8 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
            >
              <PlusCircle className="size-3.5 mr-1.5" />
              + Múltipla Escolha
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAddQuestion('discursive')}
              className="h-8 text-xs font-bold border-purple-200 text-purple-900 hover:bg-purple-50"
            >
              <MessageSquare className="size-3.5 mr-1.5 text-purple-600" />
              + Discursiva / Reflexão
            </Button>
          </div>

          {hasSeedAvailable && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRestoreDefaults}
              className="h-8 text-[11px] font-semibold text-slate-600 hover:text-purple-700 hover:bg-purple-50"
            >
              <RotateCcw className="size-3 mr-1 text-slate-500" />
              Carregar Perguntas Padrão
            </Button>
          )}
        </div>

        {/* Lista de Perguntas (Scrollável) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {questions.length === 0 ? (
            <div className="text-center py-12 px-4 border-2 border-dashed border-slate-300 rounded-2xl bg-white space-y-3">
              <div className="size-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mx-auto">
                <HelpCircle className="size-6" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm">Nenhuma pergunta nesta aula ainda</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Adicione perguntas de múltipla escolha ou discursivas com feedback pastoral para que os alunos respondam pelo celular.
              </p>
              <div className="flex justify-center gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={() => handleAddQuestion('multiple_choice')}
                  className="h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold"
                >
                  <PlusCircle className="size-3.5 mr-1.5" />
                  Criar Primeira Pergunta
                </Button>
              </div>
            </div>
          ) : (
            questions.map((q, idx) => {
              const isMultiple = q.type === 'multiple_choice';

              return (
                <Card
                  key={idx}
                  className="border-slate-200 shadow-sm bg-white hover:border-purple-300 transition-all overflow-hidden"
                >
                  {/* Cabeçalho da Pergunta */}
                  <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                        PERGUNTA {idx + 1}
                      </span>

                      {/* Seletor de Tipo */}
                      <select
                        value={q.type}
                        onChange={e => {
                          const newType = e.target.value as 'multiple_choice' | 'discursive';
                          if (newType === 'discursive') {
                            handleUpdateQuestion(idx, {
                              type: 'discursive',
                              correct: undefined,
                              distractors: undefined,
                              keywords: q.keywords || []
                            });
                          } else {
                            handleUpdateQuestion(idx, {
                              type: 'multiple_choice',
                              correct: q.correct || '',
                              distractors: q.distractors?.length === 3 ? q.distractors : ['', '', '']
                            });
                          }
                        }}
                        className="text-[10px] font-bold uppercase bg-white border border-slate-200 text-slate-700 rounded px-2 py-1 shadow-sm"
                      >
                        <option value="multiple_choice">Múltipla Escolha</option>
                        <option value="discursive">Discursiva / Reflexão Pastoral</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-500 hover:text-purple-700"
                        onClick={() => handleMoveQuestion(idx, 'up')}
                        disabled={idx === 0}
                      >
                        <ChevronUp className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-500 hover:text-purple-700"
                        onClick={() => handleMoveQuestion(idx, 'down')}
                        disabled={idx === questions.length - 1}
                      >
                        <ChevronDown className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteQuestion(idx)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  <CardContent className="p-4 space-y-3.5">
                    {/* Categoria / Etiqueta e Enunciado */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
                          <Tag className="size-2.5 text-purple-600" /> Categoria / Tag
                        </Label>
                        <Input
                          placeholder="Ex: Ponto de Partida, Visão Bíblica..."
                          value={q.category || ''}
                          onChange={e => handleUpdateQuestion(idx, { category: e.target.value })}
                          className="h-8 text-xs font-semibold"
                        />
                      </div>
                      <div className="sm:col-span-2 space-y-1">
                        <Label className="text-[10px] font-bold uppercase text-slate-500">
                          Enunciado da Pergunta *
                        </Label>
                        <Input
                          placeholder="Digite aqui a pergunta que o aluno verá no celular..."
                          value={q.question}
                          onChange={e => handleUpdateQuestion(idx, { question: e.target.value })}
                          className="h-8 text-xs font-bold text-slate-900"
                        />
                      </div>
                    </div>

                    {/* Bloco Múltipla Escolha */}
                    {isMultiple ? (
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-black uppercase text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="size-3 text-emerald-600" />
                            Alternativa Correta (Gabarito) *
                          </Label>
                          <Input
                            placeholder="Resposta correta esperada..."
                            value={q.correct || ''}
                            onChange={e => handleUpdateQuestion(idx, { correct: e.target.value })}
                            className="h-8 text-xs font-semibold bg-emerald-50/50 border-emerald-300 text-emerald-950 focus:border-emerald-500"
                          />
                        </div>

                        <div className="space-y-1 pt-1">
                          <Label className="text-[10px] font-bold uppercase text-slate-500">
                            3 Alternativas Incorretas (Distratores)
                          </Label>
                          <div className="space-y-1.5">
                            {[0, 1, 2].map(distIdx => {
                              const dists = q.distractors || ['', '', ''];
                              return (
                                <Input
                                  key={distIdx}
                                  placeholder={`Alternativa incorreta ${distIdx + 1}...`}
                                  value={dists[distIdx] || ''}
                                  onChange={e => {
                                    const nextDists = [...(q.distractors || ['', '', ''])];
                                    nextDists[distIdx] = e.target.value;
                                    handleUpdateQuestion(idx, { distractors: nextDists });
                                  }}
                                  className="h-8 text-xs text-slate-700 bg-slate-50 border-slate-200"
                                />
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Bloco Discursiva / Reflexão */
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
                            <KeyRound className="size-2.5 text-purple-600" />
                            Palavras-chave Esperadas (Opcional, separadas por vírgula)
                          </Label>
                          <Input
                            placeholder="Ex: escuta, ouvir, orar, café, amigo, cuidado, apoiar"
                            value={(q.keywords || []).join(', ')}
                            onChange={e => {
                              const raw = e.target.value;
                              const parsed = raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
                              handleUpdateQuestion(idx, { keywords: parsed });
                            }}
                            className="h-8 text-xs font-semibold text-slate-700 bg-slate-50"
                          />
                          <p className="text-[10px] text-muted-foreground italic">
                            Se preenchido, o sistema verifica com inteligência empática se o aluno mencionou esses conceitos na reflexão.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Feedback Pastoral Pós-resposta */}
                    <div className="space-y-1 pt-2 border-t border-slate-100">
                      <Label className="text-[10px] font-bold uppercase text-purple-700 flex items-center gap-1">
                        <Sparkles className="size-2.5 text-purple-600" />
                        Feedback Pastoral Pós-resposta (Exibido na tela do aluno após responder)
                      </Label>
                      <Textarea
                        rows={2}
                        placeholder="Ex: Perfeito! No Reino de Deus, o supervisor não opera por auditoria e cobrança fria; sua missão é dar sustento e alívio pastoral..."
                        value={q.feedback || ''}
                        onChange={e => handleUpdateQuestion(idx, { feedback: e.target.value })}
                        className="text-xs text-slate-800 bg-purple-50/40 border-purple-200 focus:border-purple-400"
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Rodapé com Salvar */}
        <DialogFooter className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-muted-foreground">
            {questions.length > 0 ? (
              <span>Total de <strong>{questions.length}</strong> {questions.length === 1 ? 'desafio configurado' : 'desafios configurados'}</span>
            ) : (
              <span>Nenhuma alteração pendente</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="h-9 text-xs font-semibold"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="h-9 text-xs font-bold bg-purple-700 hover:bg-purple-800 text-white shadow-sm"
            >
              {isSaving ? (
                <>
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  Salvando no Firestore...
                </>
              ) : (
                <>
                  <Save className="size-3.5 mr-1.5" />
                  Salvar Questionário no Firestore
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
