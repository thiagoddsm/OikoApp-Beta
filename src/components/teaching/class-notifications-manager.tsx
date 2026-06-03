'use client';
import React, { useMemo, useState, useRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseISO, addWeeks, addMonths, isBefore } from 'date-fns';
import { useVolunteering, getModuleIndexForDate, type Class, type User, type Course } from '@/contexts/volunteering-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Loader2, Send, Filter, CheckCircle2, XCircle, AlertCircle, Clock, Rocket, History, Pause, Play, Ban } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
    createCampaign,
    processCampaign,
    pauseCampaign,
    cancelCampaign,
    type NotificationCampaign,
} from '@/lib/notification-campaigns';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface ClassNotificationsManagerProps {
    classData: Class;
    courseData: Course;
}

// ─── Painel de Campanhas ─────────────────────────────────────────────────────
function CampaignsPanel({ classId, onResume }: { classId: string; onResume: (campaignId: string) => void }) {
    const { firestore } = useFirebase();
    const campaignsQuery = useMemoFirebase(() =>
        firestore ? query(
            collection(firestore, 'notification_campaigns'),
            where('classId', '==', classId)
        ) : null,
        [firestore, classId]
    );
    const { data: rawCampaigns = [], isLoading } = useCollection<NotificationCampaign>(campaignsQuery);

    // Ordenar no cliente para evitar índice composto no Firestore
    const campaigns = useMemo(
        () => (Array.isArray(rawCampaigns) ? [...rawCampaigns] : []).sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)),
        [rawCampaigns]
    );

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    if (campaigns.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2 border-2 border-dashed rounded-xl">
                <History className="size-8 opacity-30" />
                <p className="text-sm">Nenhuma campanha enviada para esta turma.</p>
            </div>
        );
    }

    const statusConfig: Record<string, { label: string; color: string }> = {
        pending:   { label: 'Aguardando', color: 'bg-slate-100 text-slate-700 border-slate-200' },
        running:   { label: 'Enviando...', color: 'bg-blue-100 text-blue-700 border-blue-200' },
        paused:    { label: 'Pausado', color: 'bg-amber-100 text-amber-700 border-amber-200' },
        done:      { label: 'Concluído', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
        cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-700 border-red-200' },
        error:     { label: 'Erro', color: 'bg-red-100 text-red-700 border-red-200' },
    };

    return (
        <div className="space-y-4">
            {campaigns.map(c => {
                const cfg = statusConfig[c.status] || statusConfig.pending;
                const pct = c.totalCount > 0 ? Math.round(((c.sentCount + c.failedCount) / c.totalCount) * 100) : 0;
                const canResume = c.status === 'paused' || c.status === 'pending';

                return (
                    <div key={c.id} className="border rounded-xl p-4 space-y-3 bg-card shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant="outline" className={cn("text-[10px] h-5", cfg.color)}>
                                        {cfg.label}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                        {c.createdAt?.toDate
                                            ? format(c.createdAt.toDate(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                                            : '—'}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 italic line-clamp-2">
                                    {c.messageTemplate}
                                </p>
                            </div>
                            <div className="flex gap-2 shrink-0">
                                {canResume && (
                                    <Button size="sm" variant="outline" onClick={() => onResume(c.id)} className="h-8 gap-1.5 text-emerald-600 border-emerald-300 hover:bg-emerald-50">
                                        <Play className="size-3" /> Retomar
                                    </Button>
                                )}
                                {c.status === 'running' && (
                                    <Button size="sm" variant="outline" onClick={() => pauseCampaign(c.id)} className="h-8 gap-1.5 text-amber-600 border-amber-300 hover:bg-amber-50">
                                        <Pause className="size-3" /> Pausar
                                    </Button>
                                )}
                                {(c.status === 'running' || c.status === 'paused') && (
                                    <Button size="sm" variant="outline" onClick={() => cancelCampaign(c.id)} className="h-8 gap-1.5 text-red-600 border-red-300 hover:bg-red-50">
                                        <Ban className="size-3" />
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Barra de progresso */}
                        <div className="space-y-1">
                            <Progress value={pct} className="h-2" />
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                                <span>
                                    <span className="text-emerald-600 font-bold">{c.sentCount}</span> enviadas ·{' '}
                                    <span className="text-red-500 font-bold">{c.failedCount}</span> falhas ·{' '}
                                    {c.totalCount - c.sentCount - c.failedCount} pendentes
                                </span>
                                <span className="font-bold">{pct}%</span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function ClassNotificationsManager({ classData, courseData }: ClassNotificationsManagerProps) {
    const { users, isLoading } = useVolunteering();
    const { toast } = useToast();

    const [targetFilter, setTargetFilter] = useState('all');
    const [messageText, setMessageText] = useState('Olá {{nome}},\n\nPassando para informar que da turma {{turma}}...');
    const [isCreating, setIsCreating] = useState(false);
    const [activeTab, setActiveTab] = useState<'compose' | 'campaigns'>('compose');

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const insertTag = (tag: string) => {
        const textarea = textareaRef.current;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = messageText;
            const before = text.substring(0, start);
            const after = text.substring(end, text.length);
            setMessageText(before + tag + after);
            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + tag.length, start + tag.length);
            }, 0);
        } else {
            setMessageText(prev => prev + tag);
        }
    };

    // Estado de progresso da campanha em execução
    const [runningCampaignId, setRunningCampaignId] = useState<string | null>(null);
    const [progress, setProgress] = useState({ sent: 0, total: 0 });
    const isRunning = !!runningCampaignId;

    const minAttendanceApproval = courseData.minAttendanceApproval || 75;
    const isActuallyExtra = (record: any) => record.date.includes('T') || record.isRepositionOnly;

    const sortedAttendance = useMemo(() => {
        const attendance = classData.attendance || [];
        if (!classData.startDate) return [...attendance].sort((a, b) => a.date.localeCompare(b.date));

        const validDatesForThisClass = new Set<string>();
        const repoOnlyDates = new Set<string>(
            (classData.extraSessions || []).filter((s: any) => s.isRepositionOnly).map((s: any) => `${s.date}T${s.startTime}`)
        );
        const allExtraSessionDates = new Set<string>(
            (classData.extraSessions || []).map((s: any) => `${s.date}T${s.startTime}`)
        );

        const start = parseISO(classData.startDate);
        const end = classData.endDate ? parseISO(classData.endDate) : addMonths(start, 6);
        const holidaySet = new Set<string>(classData.holidayDates || []);
        const overrides = classData.scheduleOverrides || {};

        // 1. Gerar datas regulares pelo cronograma
        if (classData.frequency === 'pontual') {
            validDatesForThisClass.add(classData.startDate);
        } else if (classData.frequency) {
            let current = start;
            let safe = 0;
            while (safe++ < 200) {
                const dStr = format(current, 'yyyy-MM-dd');
                if (!holidaySet.has(dStr) && !overrides[dStr]?.isCancelled) {
                    validDatesForThisClass.add(dStr);
                } else if (overrides[dStr] && !overrides[dStr]?.isCancelled) {
                    validDatesForThisClass.add(dStr);
                }
                current = addWeeks(current, classData.frequency === 'quinzenal' ? 2 : 1);
                if (isBefore(end, current)) break;
            }
        }

        // 2. Overrides que caem fora da recorrência normal
        Object.keys(overrides).forEach(dStr => {
            if (!overrides[dStr]?.isCancelled) {
                validDatesForThisClass.add(dStr);
            }
        });

        // 3. Sessões extras (aulas adicionais, NÃO reposições)
        (classData.extraSessions || []).forEach((s: any) => {
            if (!s.isRepositionOnly) {
                validDatesForThisClass.add(`${s.date}T${s.startTime}`);
            }
        });

        // 4. Filtrar attendance da mesma forma que o cronograma
        return [...attendance]
            .filter(r => {
                // Ignorar reposições estritas (não contam como aula regular)
                if (repoOnlyDates.has(r.date) || r.isRepositionOnly) return false;

                // Se é uma data com horário (aula extra) e não está na lista de extras atual → fantasma
                if (r.date.includes('T') && !allExtraSessionDates.has(r.date)) return false;

                // Se a turma tem cronograma, a data deve estar no conjunto de datas válidas do cronograma
                if (classData.startDate && !validDatesForThisClass.has(r.date)) return false;

                return true;
            })
            .sort((a, b) => a.date.localeCompare(b.date));
    }, [classData]);

    const studentStatuses = useMemo(() => {
        const students = (classData.students || [])
            .map(id => users.find(u => u.id === id))
            .filter(Boolean) as User[];
        const totalClassesTaken = sortedAttendance.filter(a => !isActuallyExtra(a)).length;

        return students.map(student => {
            let presentCount = 0;
            const missedLessons: string[] = [];
            let lessonCounter = 0;

            sortedAttendance.forEach((record) => {
                const isExtra = isActuallyExtra(record);
                const isPresent = record.presentStudentIds?.includes(student.id) || record.onlineStudentIds?.includes(student.id);
                if (!isExtra) {
                    lessonCounter++;
                    if (isPresent) presentCount++;
                    else missedLessons.push(`Aula ${lessonCounter}`);
                }
            });

            const attendancePercent = totalClassesTaken > 0 ? (presentCount / totalClassesTaken) * 100 : 100;

            return {
                id: student.id,
                name: student.name,
                email: student.email,
                phone: student.phone || '',
                hasPhone: !!student.phone,
                attendancePercent,
                is100Percent: attendancePercent >= 100,
                missedLessons,
            };
        });
    }, [users, classData, sortedAttendance]);

    const filteredStudents = useMemo(() => {
        if (targetFilter === 'all') return studentStatuses;
        if (targetFilter === 'perfect') return studentStatuses.filter(s => s.is100Percent);
        if (targetFilter === 'absent') return studentStatuses.filter(s => !s.is100Percent);
        if (targetFilter.startsWith('date-absent-')) {
            const targetDate = targetFilter.replace('date-absent-', '');
            const record = sortedAttendance.find(r => r.date === targetDate);
            if (!record) return [];
            return studentStatuses.filter(s => !record.presentStudentIds?.includes(s.id) && !record.onlineStudentIds?.includes(s.id));
        }
        return studentStatuses.filter(s => s.id === targetFilter);
    }, [targetFilter, studentStatuses, sortedAttendance]);

    const handleCreateCampaign = async () => {
        const recipients = filteredStudents.filter(s => s.hasPhone);
        if (recipients.length === 0) {
            toast({ variant: 'destructive', title: 'Nenhum destinatário válido', description: 'Nenhum aluno no filtro selecionado possui número de telefone.' });
            return;
        }
        if (!messageText.trim()) {
            toast({ variant: 'destructive', title: 'Mensagem vazia', description: 'Por favor, escreva uma mensagem antes de continuar.' });
            return;
        }
        if (!confirm(`Criar campanha e enviar para ${recipients.length} aluno(s) em lotes de 8? O envio será gradual e pode ser pausado.`)) return;

        setIsCreating(true);
        try {
            const campaignRecipients = recipients.map(s => {
                const firstName = s.name.split(' ')[0];
                const faltasText = s.missedLessons.length > 0 ? s.missedLessons.join(', ') : 'Nenhuma falta';
                return {
                    userId: s.id,
                    name: s.name,
                    phone: s.phone,
                    personalizedMessage: messageText
                        .replace(/\{\{nome\}\}/gi, firstName)
                        .replace(/\{nome\}/gi, firstName)
                        .replace(/\[Nome\]/gi, firstName)
                        .replace(/\{\{turma\}\}/gi, classData.name || '')
                        .replace(/\{turma\}/gi, classData.name || '')
                        .replace(/\[Turma\]/gi, classData.name || '')
                        .replace(/\{\{faltas\}\}/gi, faltasText)
                        .replace(/\{faltas\}/gi, faltasText)
                        .replace(/\[Faltas\]/gi, faltasText),
                };
            });

            const campaignId = await createCampaign({
                classId: classData.id,
                className: classData.name || 'Turma',
                messageTemplate: messageText,
                targetFilter,
                recipients: campaignRecipients,
            });

            toast({ title: 'Campanha criada!', description: 'O envio começará automaticamente. Acompanhe na aba "Campanhas".' });
            setActiveTab('campaigns');
            setRunningCampaignId(campaignId);
            setProgress({ sent: 0, total: recipients.length });

            // Processar em segundo plano
            processCampaign(campaignId, (sent, total) => {
                setProgress({ sent, total });
            }).then(() => {
                setRunningCampaignId(null);
                toast({ title: '✅ Campanha concluída!', description: `Mensagens enviadas com sucesso.` });
            }).catch(err => {
                setRunningCampaignId(null);
                console.error('Erro na campanha:', err);
                toast({ variant: 'destructive', title: 'Erro na campanha', description: 'Verifique os logs e retome na aba Campanhas.' });
            });

        } catch (err) {
            console.error(err);
            toast({ variant: 'destructive', title: 'Erro ao criar campanha', description: 'Tente novamente.' });
        } finally {
            setIsCreating(false);
        }
    };

    const handleResumeCampaign = async (campaignId: string) => {
        if (isRunning) {
            toast({ variant: 'destructive', title: 'Já há uma campanha em execução' });
            return;
        }
        setRunningCampaignId(campaignId);
        processCampaign(campaignId, (sent, total) => {
            setProgress({ sent, total });
        }).then(() => {
            setRunningCampaignId(null);
            toast({ title: '✅ Campanha concluída!' });
        }).catch(() => {
            setRunningCampaignId(null);
        });
    };

    if (isLoading) return <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>;

    return (
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
            <div className="flex items-center justify-between mb-4">
                <TabsList>
                    <TabsTrigger value="compose"><Send className="size-4 mr-2" />Compor</TabsTrigger>
                    <TabsTrigger value="campaigns">
                        <History className="size-4 mr-2" />Campanhas
                        {isRunning && (
                            <span className="ml-2 inline-flex items-center gap-1 text-xs text-blue-600 font-bold">
                                <Loader2 className="size-3 animate-spin" />
                                {progress.sent}/{progress.total}
                            </span>
                        )}
                    </TabsTrigger>
                </TabsList>
                {isRunning && (
                    <div className="text-xs text-muted-foreground flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
                        <Loader2 className="size-3 animate-spin text-blue-500" />
                        Enviando em lotes... {progress.sent}/{progress.total}
                    </div>
                )}
            </div>

            {/* ABA: COMPOR */}
            <TabsContent value="compose">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1 space-y-6">
                        <div className="space-y-4 bg-muted/30 p-4 rounded-xl border">
                            <div>
                                <h3 className="font-bold flex items-center gap-2 mb-2">
                                    <Filter className="size-4" /> Público-Alvo
                                </h3>
                                <Select value={targetFilter} onValueChange={setTargetFilter} disabled={isCreating || isRunning}>
                                    <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos os Alunos</SelectItem>
                                        <SelectItem value="perfect">Alunos 100% de Presença</SelectItem>
                                        <SelectItem value="absent">Alunos com Faltas (Geral)</SelectItem>

                                        {sortedAttendance.length > 0 && (
                                            <>
                                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-slate-50 mt-2 mb-1">
                                                    Faltantes por Data
                                                </div>
                                                {(() => {
                                                    let regularCounter = 0;
                                                    const isActuallyExtra = (record: any) => record.date.includes('T') || record.isRepositionOnly;
                                                    return sortedAttendance.map((record) => {
                                                        const isExtra = isActuallyExtra(record);
                                                        if (!isExtra) regularCounter++;
                                                        const label = isExtra ? `Reposição` : `Aula ${regularCounter}`;
                                                        const dateLabel = record.date.includes('T')
                                                            ? record.date.split('T')[0].split('-').reverse().slice(0, 2).join('/')
                                                            : record.date.split('-').reverse().slice(0, 2).join('/');
                                                        return (
                                                            <SelectItem key={record.date} value={`date-absent-${record.date}`}>
                                                                {label} ({dateLabel})
                                                            </SelectItem>
                                                        );
                                                    });
                                                })()}
                                            </>
                                        )}

                                        {studentStatuses.length > 0 && (
                                            <>
                                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-slate-50 mt-2 mb-1">
                                                    Envio Individual
                                                </div>
                                                {studentStatuses.map(student => (
                                                    <SelectItem key={student.id} value={student.id}>{student.name}</SelectItem>
                                                ))}
                                            </>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="pt-2">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-bold flex items-center gap-2">
                                        <Send className="size-4" /> Mensagem
                                    </h3>
                                    <div className="flex gap-1">
                                        <Button type="button" size="sm" variant="outline" className="text-[9px] h-5 px-1.5 font-bold" onClick={() => insertTag('{{nome}}')}>+ Aluno</Button>
                                        <Button type="button" size="sm" variant="outline" className="text-[9px] h-5 px-1.5 font-bold" onClick={() => insertTag('{{turma}}')}>+ Turma</Button>
                                        <Button type="button" size="sm" variant="outline" className="text-[9px] h-5 px-1.5 font-bold" onClick={() => insertTag('{{faltas}}')}>+ Faltas</Button>
                                    </div>
                                </div>
                                <Textarea
                                    ref={textareaRef}
                                    rows={8}
                                    value={messageText}
                                    onChange={e => setMessageText(e.target.value)}
                                    disabled={isCreating || isRunning}
                                    className="bg-white resize-none text-sm"
                                    placeholder="Escreva sua mensagem aqui..."
                                />
                                <p className="text-xs text-muted-foreground mt-2 italic space-y-1">
                                    <span>Variáveis disponíveis:</span><br />
                                    <span className="font-semibold text-primary">{"{{nome}}"}</span> - Nome do aluno.<br />
                                    <span className="font-semibold text-primary">{"{{turma}}"}</span> - Nome da turma.<br />
                                    <span className="font-semibold text-primary">{"{{faltas}}"}</span> - Aulas que o aluno faltou.
                                </p>
                            </div>

                            {/* Informativo de lotes */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700 space-y-1">
                                <p className="font-bold flex items-center gap-1.5"><Rocket className="size-3.5" /> Envio em Lotes Inteligente</p>
                                <p>Enviará <strong>8 mensagens por lote</strong> com <strong>18s de pausa</strong> entre lotes. Você pode fechar a tela, pausar ou cancelar a qualquer momento pela aba Campanhas.</p>
                            </div>

                            <Button
                                onClick={handleCreateCampaign}
                                disabled={isCreating || isRunning || filteredStudents.filter(s => s.hasPhone).length === 0}
                                className="w-full bg-emerald-600 hover:bg-emerald-700"
                            >
                                {isCreating ? (
                                    <><Loader2 className="mr-2 size-4 animate-spin" /> Criando Campanha...</>
                                ) : (
                                    <><Rocket className="mr-2 size-4" /> Criar Campanha ({filteredStudents.filter(s => s.hasPhone).length} aluno(s))</>
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Tabela de destinatários */}
                    <div className="md:col-span-2">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold">Resumo de Destinatários ({filteredStudents.length})</h3>
                            <Badge variant="outline" className="bg-slate-50">
                                {filteredStudents.filter(s => !s.hasPhone).length} sem WhatsApp
                            </Badge>
                        </div>

                        <div className="rounded-md border bg-card overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead>Aluno</TableHead>
                                        <TableHead className="text-center">Frequência</TableHead>
                                        <TableHead className="text-center">Status</TableHead>
                                        <TableHead className="text-center">WhatsApp</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredStudents.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">Nenhum aluno atende a este filtro.</TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredStudents.map((student) => {
                                            const avatar = PlaceHolderImages.find(p => p.id === 'avatar-1');
                                            return (
                                                <TableRow key={student.id}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-8 w-8">
                                                                {avatar && <AvatarImage src={avatar.imageUrl} alt={student.name} />}
                                                                <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex flex-col">
                                                                <span className="font-medium text-sm">{student.name}</span>
                                                                <span className="text-xs text-muted-foreground">{student.email || '-'}</span>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center font-bold">{student.attendancePercent.toFixed(0)}%</TableCell>
                                                    <TableCell className="text-center">
                                                        {student.is100Percent ? (
                                                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-300">100% Presença</Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="bg-red-50 text-red-800 border-red-200">Possui Faltas</Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {student.hasPhone ? (
                                                            <CheckCircle2 className="size-4 text-emerald-500 mx-auto" />
                                                        ) : (
                                                            <span title="Sem telefone">
                                                                <AlertCircle className="size-4 text-amber-500 mx-auto" />
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>
            </TabsContent>

            {/* ABA: CAMPANHAS */}
            <TabsContent value="campaigns">
                <CampaignsPanel classId={classData.id} onResume={handleResumeCampaign} />
            </TabsContent>
        </Tabs>
    );
}
