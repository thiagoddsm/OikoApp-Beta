'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Play, Square, CheckCircle, XCircle, Clock, BookOpen, Paperclip, Plus, Trash2, Youtube, FileText, Music, Link as LinkIcon, Loader2 } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { SessionAttachment, AttachmentType } from '@/lib/programs/types';

interface ClassSessionModalProps {
  session: any;
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

export function ClassSessionModal({ session, isOpen, onClose, onRefresh }: ClassSessionModalProps) {
  const { firestore } = useFirebase();
  const [loading, setLoading] = useState(false);

  // Form states for Diary & Attendance
  const [content, setContent] = useState(session?.diary?.content || '');
  const [exercises, setExercises] = useState(session?.diary?.exercises || '');
  const [notes, setNotes] = useState(session?.diary?.notes || '');
  const [nextActivity, setNextActivity] = useState(session?.diary?.nextActivity || '');

  const [attendanceStatus, setAttendanceStatus] = useState<'present' | 'student_absent' | 'teacher_absent' | 'rescheduled'>(
    session?.attendance?.status || 'present'
  );

  // Homework attachments
  const [homeworkTitle, setHomeworkTitle] = useState(session?.diary?.homework?.title || '');
  const [attachments, setAttachments] = useState<SessionAttachment[]>(session?.diary?.homework?.attachments || []);
  
  const [newAttType, setNewAttType] = useState<AttachmentType>('youtube');
  const [newAttTitle, setNewAttTitle] = useState('');
  const [newAttUrl, setNewAttUrl] = useState('');

  if (!session) return null;

  const isFinished = session.status === 'finished';
  const isInProgress = session.status === 'in_progress';

  // 1. ▶️ Start Session
  const handleStartSession = async () => {
    if (!firestore) return;
    setLoading(true);
    try {
      const nowIso = new Date().toISOString();
      const sessionRef = doc(firestore, 'learning_sessions', session.id);
      await setDoc(sessionRef, {
        status: 'in_progress',
        startedAt: nowIso,
        updatedAt: nowIso
      }, { merge: true });

      toast({ title: '▶️ Aula Iniciada!', description: 'O tempo de atendimento está sendo contado.' });
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Erro', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  // 2. ⏹️ Finish Session & Open/Save Diary & Attendance
  const handleFinishAndSave = async () => {
    if (!firestore) return;
    setLoading(true);
    try {
      const nowIso = new Date().toISOString();
      
      // Calculate duration if startedAt exists
      let durationMinutes = session.durationMinutes || 50;
      if (session.startedAt) {
        const start = new Date(session.startedAt).getTime();
        const end = new Date(nowIso).getTime();
        durationMinutes = Math.max(1, Math.round((end - start) / (1000 * 60)));
      }

      const isDiaryFilled = Boolean(content.trim() && exercises.trim());

      const updateData: any = {
        status: 'finished',
        endedAt: session.endedAt || nowIso,
        durationMinutes,
        diaryCompleted: isDiaryFilled,
        attendanceCompleted: true,
        hasHomework: attachments.length > 0,
        hasMakeup: attendanceStatus === 'student_absent' || attendanceStatus === 'teacher_absent',
        attendance: {
          status: attendanceStatus,
          updatedAt: nowIso
        },
        diary: {
          content: content.trim(),
          exercises: exercises.trim(),
          notes: notes.trim(),
          nextActivity: nextActivity.trim(),
          homework: {
            title: homeworkTitle.trim() || 'Tarefa para Casa',
            attachments
          },
          updatedAt: nowIso
        },
        updatedAt: nowIso
      };

      const sessionRef = doc(firestore, 'learning_sessions', session.id);
      await setDoc(sessionRef, updateData, { merge: true });

      // Check if makeup class needs to be generated automatically
      if (attendanceStatus === 'student_absent' || attendanceStatus === 'teacher_absent') {
        const makeupRef = doc(firestore, 'wave_makeups', `${session.id}_makeup`);
        await setDoc(makeupRef, {
          id: `${session.id}_makeup`,
          originalSessionId: session.id,
          studentId: session.studentId || session.studentIds?.[0] || 'aluno',
          teacherId: session.teacherId,
          reason: attendanceStatus === 'student_absent' ? 'student_absent' : 'teacher_absent',
          status: 'pending',
          createdAt: nowIso
        }, { merge: true });
        toast({ title: '🔄 Pendência de Reposição Criada', description: 'A aula foi adicionada ao Painel de Reposições.' });
      }

      toast({ 
        title: isDiaryFilled ? '✅ Aula Concluída!' : '⚠️ Salvo como Pendente de Diário', 
        description: isDiaryFilled ? 'Diário e presença gravados com sucesso!' : 'Preencha o conteúdo ministrado para quitar o diário.' 
      });

      if (onRefresh) onRefresh();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Erro', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleAddAttachment = () => {
    if (!newAttTitle.trim() || !newAttUrl.trim()) return;
    const item: SessionAttachment = {
      id: String(Date.now()),
      type: newAttType,
      title: newAttTitle.trim(),
      url: newAttUrl.trim()
    };
    setAttachments(prev => [...prev, item]);
    setNewAttTitle('');
    setNewAttUrl('');
  };

  const handleRemoveAttachment = (idx: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-bold text-slate-800">
                {session.title || 'Sessão de Música'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Data: <strong>{session.date}</strong> às <strong>{session.startTime}</strong> • Aluno: <strong>{session.studentName || 'Aluno Wave'}</strong>
              </DialogDescription>
            </div>
            <div>
              {session.status === 'scheduled' && <Badge variant="outline" className="text-slate-600">Agendada</Badge>}
              {session.status === 'in_progress' && <Badge className="bg-amber-500 text-white animate-pulse">Em Andamento ▶️</Badge>}
              {session.status === 'finished' && session.diaryCompleted && <Badge className="bg-emerald-600 text-white">Finalizada ✅</Badge>}
              {session.status === 'finished' && !session.diaryCompleted && <Badge className="bg-amber-100 text-amber-800 border-amber-300">Pendente de Diário ⚠️</Badge>}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Action Bar (Start / Stop Timer) */}
          <div className="p-4 rounded-xl border bg-slate-50 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-700">Controle Operacional da Aula</p>
              <p className="text-[11px] text-slate-500">
                {isInProgress ? 'Aula iniciada! Registre os conteúdos e finalize ao terminar.' : isFinished ? `Aula finalizada. Duração total: ${session.durationMinutes || 50} min.` : 'Clique em iniciar quando o aluno chegar.'}
              </p>
            </div>
            <div>
              {session.status === 'scheduled' && (
                <Button onClick={handleStartSession} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-xs font-bold gap-2">
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />} Iniciar Aula
                </Button>
              )}
              {session.status === 'in_progress' && (
                <Button onClick={handleFinishAndSave} disabled={loading} className="bg-red-600 hover:bg-red-700 text-xs font-bold gap-2">
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <Square className="size-4" />} Finalizar Aula
                </Button>
              )}
            </div>
          </div>

          {/* Section 1: Presença & Faltas */}
          <div className="space-y-3">
            <Label className="text-xs font-black uppercase text-slate-500 tracking-wider">Controle de Presença</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Button
                type="button"
                variant={attendanceStatus === 'present' ? 'default' : 'outline'}
                onClick={() => setAttendanceStatus('present')}
                className={attendanceStatus === 'present' ? 'bg-emerald-600 text-white h-9 text-xs' : 'h-9 text-xs'}
              >
                <CheckCircle className="size-3.5 mr-1.5" /> Presente
              </Button>

              <Button
                type="button"
                variant={attendanceStatus === 'student_absent' ? 'default' : 'outline'}
                onClick={() => setAttendanceStatus('student_absent')}
                className={attendanceStatus === 'student_absent' ? 'bg-red-600 text-white h-9 text-xs' : 'h-9 text-xs'}
              >
                <XCircle className="size-3.5 mr-1.5" /> Falta Aluno
              </Button>

              <Button
                type="button"
                variant={attendanceStatus === 'teacher_absent' ? 'default' : 'outline'}
                onClick={() => setAttendanceStatus('teacher_absent')}
                className={attendanceStatus === 'teacher_absent' ? 'bg-orange-600 text-white h-9 text-xs' : 'h-9 text-xs'}
              >
                <XCircle className="size-3.5 mr-1.5" /> Falta Prof.
              </Button>

              <Button
                type="button"
                variant={attendanceStatus === 'rescheduled' ? 'default' : 'outline'}
                onClick={() => setAttendanceStatus('rescheduled')}
                className={attendanceStatus === 'rescheduled' ? 'bg-indigo-600 text-white h-9 text-xs' : 'h-9 text-xs'}
              >
                <Clock className="size-3.5 mr-1.5" /> Remarcada
              </Button>
            </div>
          </div>

          {/* Section 2: Diário de Classe (Pedagógico) */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center gap-2">
              <BookOpen className="size-4 text-indigo-600" />
              <Label className="text-xs font-black uppercase text-slate-700 tracking-wider">Diário de Classe (Obrigatório)</Label>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-xs font-bold text-slate-700">Conteúdo Ministrado *</Label>
                <Textarea 
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Ex: Escala de Dó Maior, Posições do Dedilhado, Leitura de Cifra..."
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Exercícios Passados *</Label>
                <Textarea 
                  value={exercises}
                  onChange={e => setExercises(e.target.value)}
                  placeholder="Ex: Treino com Metrônomo a 80 BPM por 15 minutos diários..."
                  className="mt-1 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold text-slate-700">Observações Pedagógicas</Label>
                  <Input 
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Evolução, dificuldades, postura..."
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-700">Próxima Atividade (Opcional)</Label>
                  <Input 
                    value={nextActivity}
                    onChange={e => setNextActivity(e.target.value)}
                    placeholder="Conteúdo previsto para próxima semana..."
                    className="mt-1 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Tarefas para Casa (Homework & Anexos) */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center gap-2">
              <Paperclip className="size-4 text-indigo-600" />
              <Label className="text-xs font-black uppercase text-slate-700 tracking-wider">Tarefas para Casa & Material de Apoio</Label>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-xs font-bold text-slate-700">Título da Tarefa</Label>
                <Input 
                  value={homeworkTitle}
                  onChange={e => setHomeworkTitle(e.target.value)}
                  placeholder="Ex: Estudo Prático de Campo Harmônico"
                  className="mt-1 text-xs"
                />
              </div>

              {/* Add Attachment Row */}
              <div className="p-3 border rounded-xl bg-slate-50 space-y-3">
                <span className="text-[11px] font-bold text-slate-500 block">Adicionar Anexo / Mídia</span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <Select value={newAttType} onValueChange={(val: any) => setNewAttType(val)}>
                    <SelectTrigger className="h-8 text-xs bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="youtube">YouTube (Vídeo)</SelectItem>
                      <SelectItem value="pdf">PDF (Partitura/Cifra)</SelectItem>
                      <SelectItem value="audio">Áudio (Playback/MP3)</SelectItem>
                      <SelectItem value="link">Link Externo / Drive</SelectItem>
                    </SelectContent>
                  </Select>

                  <Input 
                    value={newAttTitle}
                    onChange={e => setNewAttTitle(e.target.value)}
                    placeholder="Título (Ex: Vídeo de Apoio)"
                    className="h-8 text-xs bg-white"
                  />

                  <Input 
                    value={newAttUrl}
                    onChange={e => setNewAttUrl(e.target.value)}
                    placeholder="Link URL..."
                    className="h-8 text-xs bg-white"
                  />

                  <Button type="button" size="sm" onClick={handleAddAttachment} className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="size-3.5 mr-1" /> Adicionar
                  </Button>
                </div>
              </div>

              {/* List of attachments */}
              {attachments.length > 0 && (
                <div className="space-y-1.5">
                  {attachments.map((att, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg border bg-white text-xs">
                      <div className="flex items-center gap-2">
                        {att.type === 'youtube' && <Youtube className="size-4 text-red-500" />}
                        {att.type === 'pdf' && <FileText className="size-4 text-blue-500" />}
                        {att.type === 'audio' && <Music className="size-4 text-purple-500" />}
                        {att.type === 'link' && <LinkIcon className="size-4 text-slate-500" />}
                        <span className="font-bold text-slate-700">{att.title}</span>
                        <span className="text-[10px] text-slate-400 truncate max-w-xs">{att.url}</span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveAttachment(idx)} className="h-6 w-6 text-red-500 hover:bg-red-50">
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-3 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Cancelar
          </Button>
          <Button size="sm" onClick={handleFinishAndSave} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-xs font-bold">
            {loading ? <Loader2 className="size-4 animate-spin mr-1" /> : <CheckCircle className="size-4 mr-1" />}
            Salvar Diário e Presença
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
