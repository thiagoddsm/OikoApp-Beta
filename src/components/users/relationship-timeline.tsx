'use client';

import React, { useState, useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase, useDoc, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, Timestamp } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  Loader2, Send, History, MessageSquare, Sparkles, RefreshCw, 
  GraduationCap, HandHelping, Calendar, CheckCircle2, UserCheck, 
  ShieldCheck, Users, Heart, Crown, Plus, ArrowLeft, Paperclip, AtSign
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useCoursesData, useGCData } from "@/hooks/useDomainData";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { EventRegistrationDialog } from '@/components/events/event-registration-dialog';

export type TimelineCategory = 
  | 'TODOS' 
  | 'SITUACAO'
  | 'RELACIONAMENTO'
  | 'LIDERANCA'
  | 'GC'
  | 'VOLUNTARIADO' 
  | 'ENSINO' 
  | 'EVENTOS'
  | 'NOTA' 
  | 'SOLICITACAO';

interface TimelineItem {
  id: string;
  category: TimelineCategory;
  categoryLabel: string;
  title: string;
  subtitle?: string;
  description?: string;
  dotColor: string;
  badgeStyle: string;
  timestamp: Date;
  authorName?: string;
}

const CATEGORY_CONFIG: Record<string, { label: string; dotColor: string; badgeStyle: string; borderAccent?: string }> = {
  SITUACAO: { 
    label: 'Situação', 
    dotColor: 'bg-rose-400', 
    badgeStyle: 'bg-rose-100 text-rose-800 border-rose-200' 
  },
  RELACIONAMENTO: { 
    label: 'Relacionamento', 
    dotColor: 'bg-blue-400', 
    badgeStyle: 'bg-blue-100 text-blue-800 border-blue-200' 
  },
  LIDERANCA: { 
    label: 'Liderança', 
    dotColor: 'bg-indigo-400', 
    badgeStyle: 'bg-indigo-100 text-indigo-800 border-indigo-200' 
  },
  GC: { 
    label: 'GC / Célula', 
    dotColor: 'bg-emerald-400', 
    badgeStyle: 'bg-emerald-100 text-emerald-800 border-emerald-200' 
  },
  VOLUNTARIADO: { 
    label: 'Voluntariado', 
    dotColor: 'bg-amber-400', 
    badgeStyle: 'bg-amber-100 text-amber-800 border-amber-200' 
  },
  ENSINO: { 
    label: 'Ensino', 
    dotColor: 'bg-purple-400', 
    badgeStyle: 'bg-purple-100 text-purple-800 border-purple-200' 
  },
  EVENTOS: { 
    label: 'Eventos', 
    dotColor: 'bg-orange-400', 
    badgeStyle: 'bg-orange-100 text-orange-800 border-orange-200' 
  },
  NOTA: { 
    label: 'Nota', 
    dotColor: 'bg-teal-400', 
    badgeStyle: 'bg-teal-100 text-teal-800 border-teal-200',
    borderAccent: 'border-l-4 border-l-teal-500'
  },
  SOLICITACAO: { 
    label: 'Conectar', 
    dotColor: 'bg-amber-400', 
    badgeStyle: 'bg-amber-100 text-amber-900 border-amber-200' 
  },
};

export function RelationshipTimeline({ userId, personName }: { userId: string; personName: string }) {
  const { firestore, user: currentUser } = useFirebase();
  const { toast } = useToast();
  const { courses } = useCoursesData();
  const { cells } = useGCData();

  const [selectedFilter, setSelectedFilter] = useState<TimelineCategory>('TODOS');
  const [viewMode, setViewMode] = useState<'zigzag' | 'linear'>('zigzag');
  const [newNote, setNewNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isRegisterEventOpen, setIsRegisterEventOpen] = useState(false);

  // Formulário de Novo Marco Histórico Manual (Botão "+")
  const [customTitle, setCustomTitle] = useState('');
  const [customSubtitle, setCustomSubtitle] = useState('');
  const [customCategory, setCustomCategory] = useState<TimelineCategory>('EVENTOS');
  const [customDate, setCustomDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [customDescription, setCustomDescription] = useState('');

  // Documento do Usuário
  const { data: userDoc } = useDoc<any>(firestore && userId ? `users/${userId}` : null);

  // 1. Query Anotações Pastorais (member_notes e users/userId/notes)
  const notesQuery = useMemoFirebase(() => {
    if (!firestore || !userId) return null;
    return query(collection(firestore, 'member_notes'), where('memberId', '==', userId));
  }, [firestore, userId]);

  const userSubNotesQuery = useMemoFirebase(() => {
    if (!firestore || !userId) return null;
    return query(collection(firestore, 'users', userId, 'notes'));
  }, [firestore, userId]);

  // 2. Query Solicitações (solicitacoes)
  const solicitacoesQuery = useMemoFirebase(() => {
    if (!firestore || !userId) return null;
    return query(collection(firestore, 'solicitacoes'), where('personId', '==', userId));
  }, [firestore, userId]);

  // 3. Query Processos (users/{userId}/processos)
  const processosQuery = useMemoFirebase(() => {
    if (!firestore || !userId) return null;
    return query(collection(firestore, 'users', userId, 'processos'));
  }, [firestore, userId]);

  // 4. Query Inscrições em Eventos e Retiros (event_registrations)
  const eventRegistrationsQuery = useMemoFirebase(() => {
    if (!firestore || !userId) return null;
    return query(collection(firestore, 'event_registrations'), where('userId', '==', userId));
  }, [firestore, userId]);

  const { data: notes, isLoading: loadingNotes } = useCollection<any>(notesQuery);
  const { data: userSubNotes } = useCollection<any>(userSubNotesQuery);
  const { data: solicitacoes, isLoading: loadingSolicitacoes } = useCollection<any>(solicitacoesQuery);
  const { data: processos, isLoading: loadingProcessos } = useCollection<any>(processosQuery);
  const { data: eventRegistrations, isLoading: loadingEvents } = useCollection<any>(eventRegistrationsQuery);

  // Unificação e ordenação de todos os eventos da história da pessoa
  const allTimelineItems = useMemo(() => {
    const items: TimelineItem[] = [];

    // A. Situação Eclesiástica do Cadastro
    if (userDoc) {
      if (userDoc.createdAt) {
        const date = userDoc.createdAt?.toDate ? userDoc.createdAt.toDate() : new Date(userDoc.createdAt);
        items.push({
          id: `ecclesia-created`,
          category: 'SITUACAO',
          categoryLabel: 'Situação',
          title: userDoc.integrationStatus === 'membro' ? 'MEMBRO CADASTRADO' : 'PRIMEIRO CADASTRO',
          subtitle: (userDoc.situacaoCaminhada || userDoc.integrationStatus || 'Visitante').toUpperCase(),
          description: `Cadastro oficial registrado na igreja.`,
          dotColor: CATEGORY_CONFIG.SITUACAO.dotColor,
          badgeStyle: CATEGORY_CONFIG.SITUACAO.badgeStyle,
          timestamp: date,
        });
      }

      // Relacionamento / Estado Civil
      if (userDoc.estadoCivil === 'casado' || userDoc.conjuge) {
        items.push({
          id: `ecclesia-casado`,
          category: 'RELACIONAMENTO',
          categoryLabel: 'Relacionamento',
          title: 'CASADO',
          subtitle: userDoc.conjuge ? `CASADO COM ${userDoc.conjuge.toUpperCase()}` : 'ESTADO CIVIL REGISTRADO',
          description: `Vínculo de casamento registrado na ficha familiar.`,
          dotColor: CATEGORY_CONFIG.RELACIONAMENTO.dotColor,
          badgeStyle: CATEGORY_CONFIG.RELACIONAMENTO.badgeStyle,
          timestamp: userDoc.dataCasamento ? parseISO(userDoc.dataCasamento) : new Date(Date.now() - 86400000 * 365),
        });
      }

      // Batismo
      if (userDoc.batizado === 'sim') {
        items.push({
          id: `ecclesia-batismo`,
          category: 'SITUACAO',
          categoryLabel: 'Situação',
          title: 'BATISMO NAS ÁGUAS',
          subtitle: userDoc.dataBatismo ? `REALIZADO EM ${userDoc.dataBatismo}` : 'BATIZADO NAS ÁGUAS',
          description: `Passo da aliança pelo batismo nas águas.`,
          dotColor: CATEGORY_CONFIG.SITUACAO.dotColor,
          badgeStyle: CATEGORY_CONFIG.SITUACAO.badgeStyle,
          timestamp: userDoc.dataBatismo ? parseISO(userDoc.dataBatismo) : new Date(Date.now() - 86400000 * 180),
        });
      }

      // Liderança / Função
      if (userDoc.role === 'leader' || userDoc.isLeader || userDoc.roles?.length > 0) {
        items.push({
          id: `leadership-role`,
          category: 'LIDERANCA',
          categoryLabel: 'Liderança',
          title: (userDoc.cargoLideranca || userDoc.role || 'LÍDER DE GC').toUpperCase(),
          subtitle: 'INICIOU NA LIDERANÇA',
          description: `Nomeação ativa na estrutura de liderança.`,
          dotColor: CATEGORY_CONFIG.LIDERANCA.dotColor,
          badgeStyle: CATEGORY_CONFIG.LIDERANCA.badgeStyle,
          timestamp: new Date(Date.now() - 86400000 * 90),
        });
      }

      // Célula / GC
      if (userDoc.cellId) {
        const cell = cells.find(c => c.id === userDoc.cellId);
        const cellName = (cell as any)?.nome || (cell as any)?.name || `GC - ${userDoc.cellId}`;
        items.push({
          id: `gc-membership`,
          category: 'GC',
          categoryLabel: 'GC / Célula',
          title: cellName.toUpperCase(),
          subtitle: 'INICIOU COMO PARTICIPANTE DO GC',
          description: `Conexão ativa no grupo pequeno / célula.`,
          dotColor: CATEGORY_CONFIG.GC.dotColor,
          badgeStyle: CATEGORY_CONFIG.GC.badgeStyle,
          timestamp: new Date(Date.now() - 86400000 * 60),
        });
      }

      // Voluntariado
      if (userDoc.serviceStatus === 'serving') {
        items.push({
          id: `service-active`,
          category: 'VOLUNTARIADO',
          categoryLabel: 'Voluntariado',
          title: 'MINISTÉRIO / VOLUNTARIADO',
          subtitle: 'INICIOU NO SERVIÇO ATIVO',
          description: `Serviço ativo confirmado nas equipes da igreja.`,
          dotColor: CATEGORY_CONFIG.VOLUNTARIADO.dotColor,
          badgeStyle: CATEGORY_CONFIG.VOLUNTARIADO.badgeStyle,
          timestamp: new Date(Date.now() - 86400000 * 45),
        });
      }
    }

    // B. Solicitações do Portal Conectar
    if (solicitacoes) {
      solicitacoes.forEach(sol => {
        const date = sol.createdAt?.toDate ? sol.createdAt.toDate() : new Date(sol.createdAt || Date.now());
        items.push({
          id: `sol-${sol.id}`,
          category: 'SOLICITACAO',
          categoryLabel: 'Conectar',
          title: `SOLICITAÇÃO: ${sol.intentType}`,
          subtitle: `GATILHO: ${sol.entryPoint || 'PORTAL DE CONEXÃO'}`,
          description: sol.details?.observacoes ? `Mensagem: "${sol.details.observacoes}"` : `Solicitação registrada via portal público.`,
          dotColor: CATEGORY_CONFIG.SOLICITACAO.dotColor,
          badgeStyle: CATEGORY_CONFIG.SOLICITACAO.badgeStyle,
          timestamp: date,
        });
      });
    }

    // C. Processos em Andamento
    if (processos) {
      processos.forEach(proc => {
        const date = proc.startedAt?.toDate ? proc.startedAt.toDate() : new Date(proc.startedAt || Date.now());
        items.push({
          id: `proc-${proc.id}`,
          category: 'GC',
          categoryLabel: 'GC / Célula',
          title: proc.title.toUpperCase(),
          subtitle: `ETAPA ATUAL: ${proc.currentStage}`,
          description: `Status: ${proc.status === 'COMPLETED' ? 'Concluído' : 'Processo Ativo'}`,
          dotColor: CATEGORY_CONFIG.GC.dotColor,
          badgeStyle: CATEGORY_CONFIG.GC.badgeStyle,
          timestamp: date,
        });
      });
    }

    // D. Anotações Pastorais
    const allNotes = [...(notes || []), ...(userSubNotes || [])];
    if (allNotes.length > 0) {
      const seenNoteIds = new Set<string>();
      allNotes.forEach(note => {
        if (seenNoteIds.has(note.id)) return;
        seenNoteIds.add(note.id);
        const date = note.createdAt?.toDate ? note.createdAt.toDate() : new Date(note.createdAt || note.date || Date.now());
        const categoryKey: TimelineCategory = note.category || 'NOTA';

        items.push({
          id: `note-${note.id}`,
          category: CATEGORY_CONFIG[categoryKey] ? categoryKey : 'NOTA',
          categoryLabel: CATEGORY_CONFIG[categoryKey]?.label || 'Nota',
          title: (note.title || 'PONTO DE CONTATO').toUpperCase(),
          subtitle: note.subtitle || (note.authorName ? `LÍDER RESPONSÁVEL: ${note.authorName.toUpperCase()}` : undefined),
          description: note.content || note.text || note.note,
          dotColor: CATEGORY_CONFIG[categoryKey]?.dotColor || CATEGORY_CONFIG.NOTA.dotColor,
          badgeStyle: CATEGORY_CONFIG[categoryKey]?.badgeStyle || CATEGORY_CONFIG.NOTA.badgeStyle,
          timestamp: date,
          authorName: note.authorName || note.author || 'Liderança',
        });
      });
    }

    // E. Histórico de Cursos
    if (userDoc?.journey?.courseStatus) {
      Object.entries(userDoc.journey.courseStatus).forEach(([cId, status]: [string, any]) => {
        const course = courses.find(c => c.id === cId);
        items.push({
          id: `course-${cId}`,
          category: 'ENSINO',
          categoryLabel: 'Ensino',
          title: (course?.name || cId).toUpperCase(),
          subtitle: status === 'approved' ? 'CURSO CONCLUÍDO' : 'EM ANDAMENTO',
          description: `Histórico oficial registrado no módulo de Ensino.`,
          dotColor: CATEGORY_CONFIG.ENSINO.dotColor,
          badgeStyle: CATEGORY_CONFIG.ENSINO.badgeStyle,
          timestamp: new Date(),
        });
      });
    }

    // F. Inscrições em Eventos e Retiros (event_registrations)
    if (eventRegistrations) {
      eventRegistrations.forEach(reg => {
        const date = reg.createdAt?.toDate ? reg.createdAt.toDate() : new Date(reg.createdAt || Date.now());
        const eventTitle = reg.eventTitle || reg.eventName || 'Evento Especial';
        const roleLabel = reg.role === 'LIDER_RESPONSAVEL' ? 'LÍDER RESPONSÁVEL' : reg.role === 'EQUIPE_APOIO' ? 'EQUIPE DE APOIO' : 'PARTICIPANTE';
        const statusLabel = reg.attendance?.checkedIn ? 'PARTICIPOU' : 'INSCRITO';

        items.push({
          id: `event-reg-${reg.id}`,
          category: 'EVENTOS',
          categoryLabel: 'Eventos',
          title: eventTitle.toUpperCase(),
          subtitle: `${roleLabel} • ${statusLabel}`,
          description: `Registro oficial no evento. Pagamento: ${reg.payment?.status === 'approved' ? 'Aprovado' : 'Pendente'}.`,
          dotColor: CATEGORY_CONFIG.EVENTOS.dotColor,
          badgeStyle: CATEGORY_CONFIG.EVENTOS.badgeStyle,
          timestamp: date,
          authorName: reg.userMetadata?.name || personName,
        });
      });
    }

    // Ordenar do mais recente para o mais antigo
    return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [solicitacoes, processos, notes, userSubNotes, userDoc, courses, cells, eventRegistrations, personName]);

  // Filtrar itens pela categoria selecionada
  const filteredItems = useMemo(() => {
    if (selectedFilter === 'TODOS') return allTimelineItems;
    return allTimelineItems.filter(item => item.category === selectedFilter);
  }, [allTimelineItems, selectedFilter]);

  const handleAddNote = async () => {
    if (!newNote.trim() || !currentUser || !firestore) return;

    setIsSaving(true);
    try {
      await addDocumentNonBlocking(collection(firestore, 'member_notes'), {
        memberId: userId,
        authorId: currentUser.uid,
        authorName: currentUser.displayName || 'Líder Pastoral',
        content: newNote,
        category: 'NOTA',
        type: 'note',
        createdAt: Timestamp.now(),
      });
      toast({ title: "Anotação salva na Timeline!" });
      setNewNote('');
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro ao salvar anotação" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCustomEvent = async () => {
    if (!customTitle.trim() || !currentUser || !firestore) return;

    setIsSaving(true);
    try {
      const eventDate = customDate ? parseISO(customDate) : new Date();
      await addDocumentNonBlocking(collection(firestore, 'member_notes'), {
        memberId: userId,
        authorId: currentUser.uid,
        authorName: currentUser.displayName || 'Líder Pastoral',
        title: customTitle,
        subtitle: customSubtitle || `REGISTRADO EM ${format(eventDate, 'dd/MM/yyyy')}`,
        content: customDescription || customTitle,
        category: customCategory,
        createdAt: Timestamp.fromDate(eventDate),
      });

      toast({ title: "Novo Marco Histórico Adicionado!" });
      setIsAddEventOpen(false);
      setCustomTitle('');
      setCustomSubtitle('');
      setCustomDescription('');
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro ao criar marco histórico" });
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = loadingNotes || loadingSolicitacoes || loadingProcessos || loadingEvents;

  // Iniciais do membro para a caixa da anotação estilo Journal
  const initials = personName
    ? personName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'MB';

  return (
    <>
      <div className="max-w-[1000px] mx-auto space-y-6">
        
        {/* Cabeçalho no estilo Ecclesia Modern */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-black italic tracking-tight text-slate-900 leading-none">
              Linha do Tempo
            </h1>
            <p className="text-sm md:text-base text-slate-500 font-medium mt-2">
              Histórico consolidado da caminhada, formações e eventos de{' '}
              <span className="font-bold text-slate-900">{personName}</span>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Segmented Pill Toggle [Zig-Zag] [Linear] */}
            <div className="flex bg-slate-100 rounded-full p-1 border border-slate-200 shadow-inner">
              <button
                type="button"
                onClick={() => setViewMode('zigzag')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                  viewMode === 'zigzag'
                    ? 'bg-white text-slate-900 shadow-sm font-black'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Zig-Zag
              </button>
              <button
                type="button"
                onClick={() => setViewMode('linear')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                  viewMode === 'linear'
                    ? 'bg-white text-slate-900 shadow-sm font-black'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Linear
              </button>
            </div>

            <Button
              size="sm"
              onClick={() => setIsRegisterEventOpen(true)}
              className="h-10 px-4 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm"
            >
              <Calendar className="size-4 mr-1.5" /> Inscrever em Evento
            </Button>

            <Button
              size="sm"
              onClick={() => setIsAddEventOpen(true)}
              className="h-10 px-4 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm"
            >
              <Plus className="size-4 mr-1.5" /> Criar Marco
            </Button>
          </div>
        </header>

        {/* Quick Note Entry - Caixa de Entrada em Estilo Journal */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm relative group hover:shadow-md transition-shadow">
          <div className="flex gap-4">
            <div className="size-10 rounded-full bg-slate-100 text-slate-700 flex shrink-0 items-center justify-center font-black text-xs border border-slate-200">
              {initials}
            </div>
            <div className="flex-1 space-y-3">
              <Textarea
                placeholder={`Adicionar uma nota rápida ao histórico de ${personName}...`}
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-900 focus:border-slate-400 focus:ring-1 focus:ring-slate-300 transition-all outline-none resize-none min-h-[70px]"
              />
              <div className="flex justify-end items-center">
                <Button
                  size="sm"
                  onClick={handleAddNote}
                  disabled={isSaving || !newNote.trim()}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-full text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                >
                  {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                  Salvar na Timeline
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros em Pílulas com Indicadores Coloridos (Dot Indicators) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedFilter('TODOS')}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all border shrink-0 flex items-center gap-2 ${
              selectedFilter === 'TODOS'
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Todos ({allTimelineItems.length})
          </button>

          {(Object.keys(CATEGORY_CONFIG) as TimelineCategory[]).map((catKey) => {
            const config = CATEGORY_CONFIG[catKey];
            const isSelected = selectedFilter === catKey;

            return (
              <button
                key={catKey}
                type="button"
                onClick={() => setSelectedFilter(catKey)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all border shrink-0 flex items-center gap-2 ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className={`size-2 rounded-full ${config.dotColor}`} />
                <span>{config.label}</span>
              </button>
            );
          })}
        </div>

        {/* Container Principal da Linha do Tempo */}
        {isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="animate-spin size-8 text-slate-400" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16 text-slate-400 space-y-2 border-2 border-dashed rounded-3xl bg-slate-50/50">
            <History className="mx-auto size-10 opacity-30" />
            <p className="text-sm font-bold text-slate-700">Nenhum evento registrado nesta categoria</p>
            <p className="text-xs text-slate-500">Selecione "Todos" para visualizar a trajetória completa.</p>
          </div>
        ) : viewMode === 'linear' ? (
          /* MODO LINEAR (Coluna Única alinhada à esquerda) */
          <div className="relative py-4 pl-6 space-y-8">
            <div className="absolute left-3 top-4 bottom-4 w-0.5 bg-slate-200 -translate-x-1/2" />

            {filteredItems.map((item) => {
              const borderAccent = CATEGORY_CONFIG[item.category]?.borderAccent || '';

              return (
                <div key={item.id} className="relative flex items-start gap-4 group">
                  {/* Marcador de Ponto Minimalista (Dot Node) */}
                  <div className="absolute left-3 -translate-x-1/2 top-4 size-8 rounded-full bg-white border-4 border-slate-100 flex items-center justify-center z-10 shadow-sm group-hover:scale-110 transition-transform">
                    <div className={`size-3 rounded-full ${item.dotColor}`} />
                  </div>

                  {/* Card Editorial Clean */}
                  <div className={`flex-1 ml-6 bg-white rounded-3xl border border-slate-200 p-5 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all space-y-2 ${borderAccent}`}>
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full border-none ${item.badgeStyle}`}>
                        {item.categoryLabel}
                      </Badge>
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        {format(item.timestamp, "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">{item.title}</h3>
                      {item.subtitle && (
                        <p className="text-xs font-bold text-slate-500 mt-0.5">{item.subtitle}</p>
                      )}
                    </div>

                    {item.description && (
                      <p className="text-xs text-slate-600 font-medium leading-relaxed pt-1">
                        {item.description}
                      </p>
                    )}

                    {item.authorName && (
                      <p className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-100 mt-2">
                        Responsável: <strong className="text-slate-600 font-bold">{item.authorName}</strong>
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Marcador final "+" */}
            <div className="relative flex items-center justify-start group cursor-pointer pt-2" onClick={() => setIsAddEventOpen(true)}>
              <div className="size-8 rounded-full bg-white border-2 border-slate-200 text-slate-600 hover:border-slate-900 hover:text-slate-900 flex items-center justify-center shrink-0 shadow-sm z-10 -ml-1.5 transition-all">
                <Plus className="size-4" />
              </div>
              <span className="text-xs font-bold text-slate-500 hover:text-slate-900 pl-3">
                Adicionar Marco Histórico
              </span>
            </div>
          </div>
        ) : (
          /* MODO ZIG-ZAG (Colunas Alternadas com Dot Nodes no Eixo Central) */
          <div className="relative py-8 space-y-12">
            {/* Eixo Vertical Central (#e4e2e4) */}
            <div className="absolute left-1/2 top-4 bottom-4 w-0.5 bg-slate-200 -translate-x-1/2" />

            {filteredItems.map((item, index) => {
              const isEven = index % 2 === 0;
              const borderAccent = CATEGORY_CONFIG[item.category]?.borderAccent || '';

              return (
                <div key={item.id} className="relative flex items-center justify-between w-full">
                  {/* Marcador de Ponto Minimalista (Dot Node) no Eixo Central */}
                  <div className="absolute left-1/2 transform -translate-x-1/2 size-8 rounded-full bg-white border-4 border-slate-100 flex items-center justify-center z-10 shadow-sm transition-transform hover:scale-110">
                    <div className={`size-3 rounded-full ${item.dotColor}`} />
                  </div>

                  {/* Lado Esquerdo */}
                  {isEven ? (
                    <div className="w-5/12 pr-8 text-right relative z-10 flex flex-col items-end">
                      <div className={`bg-white rounded-3xl border border-slate-200 p-5 w-full max-w-sm shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all text-left space-y-2 ${borderAccent}`}>
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                            {format(item.timestamp, "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                          <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full border-none ${item.badgeStyle}`}>
                            {item.categoryLabel}
                          </Badge>
                        </div>

                        <div>
                          <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">{item.title}</h3>
                          {item.subtitle && (
                            <p className="text-xs font-bold text-slate-500 mt-0.5">{item.subtitle}</p>
                          )}
                        </div>

                        {item.description && (
                          <p className="text-xs text-slate-600 font-medium leading-relaxed">
                            {item.description}
                          </p>
                        )}

                        {item.authorName && (
                          <p className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-100">
                            Responsável: <strong className="text-slate-600 font-bold">{item.authorName}</strong>
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="w-5/12 pr-8" />
                  )}

                  {/* Lado Direito */}
                  {!isEven ? (
                    <div className="w-5/12 pl-8 relative z-10 flex flex-col items-start">
                      <div className={`bg-white rounded-3xl border border-slate-200 p-5 w-full max-w-sm shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all text-left space-y-2 ${borderAccent}`}>
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                          <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full border-none ${item.badgeStyle}`}>
                            {item.categoryLabel}
                          </Badge>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                            {format(item.timestamp, "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">{item.title}</h3>
                          {item.subtitle && (
                            <p className="text-xs font-bold text-slate-500 mt-0.5">{item.subtitle}</p>
                          )}
                        </div>

                        {item.description && (
                          <p className="text-xs text-slate-600 font-medium leading-relaxed">
                            {item.description}
                          </p>
                        )}

                        {item.authorName && (
                          <p className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-100">
                            Responsável: <strong className="text-slate-600 font-bold">{item.authorName}</strong>
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="w-5/12 pl-8" />
                  )}
                </div>
              );
            })}

            {/* Botão "+" no centro da Timeline */}
            <div className="relative flex justify-center w-full pt-4">
              <button
                type="button"
                onClick={() => setIsAddEventOpen(true)}
                className="size-10 rounded-full bg-white border border-slate-200 text-slate-800 flex items-center justify-center shadow-sm hover:scale-110 hover:border-slate-900 transition-all z-10"
                title="Adicionar Marco Histórico"
              >
                <Plus className="size-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Criação de Marco Histórico Manual (Botão "+") */}
      {isAddEventOpen && (
        <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
          <DialogContent className="sm:max-w-lg rounded-3xl p-6 bg-white space-y-4 max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-black uppercase italic tracking-tight text-slate-900 flex items-center gap-2">
                <Plus className="size-5 text-primary" /> Adicionar Marco Histórico
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 font-medium">
                Registre eventos passados, transferências, casamentos ou marcos na caminhada de {personName}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Categoria do Evento</Label>
                <select
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value as TimelineCategory)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-800 focus:outline-none"
                >
                  {(Object.keys(CATEGORY_CONFIG) as TimelineCategory[]).map(catKey => (
                    <option key={catKey} value={catKey}>
                      {CATEGORY_CONFIG[catKey].label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Título do Marco (ex: ACAMPADENTRO, LÍDER DE GC, DESLIGAMENTO)</Label>
                <Input
                  placeholder="Ex: CULTO DE VISÃO, CASAMENTO..."
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="h-10 rounded-xl border-slate-200 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Subtítulo / Função (Opcional)</Label>
                  <Input
                    placeholder="Ex: LÍDER RESPONSÁVEL..."
                    value={customSubtitle}
                    onChange={(e) => setCustomSubtitle(e.target.value)}
                    className="h-10 rounded-xl border-slate-200 text-xs font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Data da Ocorrência</Label>
                  <Input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="h-10 rounded-xl border-slate-200 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Descrição / Observação Adicional</Label>
                <Textarea
                  placeholder="Detalhes adicionais sobre este acontecimento..."
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  className="min-h-[80px] rounded-xl border-slate-200 text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsAddEventOpen(false)}
                  className="w-full h-11 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleAddCustomEvent} 
                  disabled={isSaving || !customTitle.trim()}
                  className="w-full h-11 rounded-xl text-xs font-bold text-white"
                >
                  {isSaving ? <Loader2 className="size-4 animate-spin mr-1" /> : <Send className="size-4 mr-1" />}
                  Salvar Marco Histórico
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de Inscrição Direta em Eventos / Retiros */}
      {isRegisterEventOpen && (
        <EventRegistrationDialog
          open={isRegisterEventOpen}
          onOpenChange={setIsRegisterEventOpen}
          userId={userId}
          userName={personName}
          userPhone={userDoc?.phone}
          userEmail={userDoc?.email}
        />
      )}
    </>
  );
}
