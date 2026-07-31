'use client';

import React, { useState, useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, History, MessageSquare, Sparkles, RefreshCw, Waves, Users, GraduationCap, HandHelping, Calendar, CheckCircle2, User } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface TimelineItem {
  id: string;
  category: 'SOLICITACAO' | 'PROCESSO' | 'NOTA' | 'CURSO_EVENTO';
  title: string;
  description?: string;
  icon: React.ElementType;
  color: string;
  timestamp: Date;
  authorName?: string;
}

const CATEGORY_ICONS: Record<string, { icon: React.ElementType; color: string; badge: string }> = {
  SOLICITACAO: { icon: Sparkles, color: 'bg-amber-500 text-white', badge: 'bg-amber-100 text-amber-700' },
  PROCESSO: { icon: RefreshCw, color: 'bg-primary text-white', badge: 'bg-primary/10 text-primary' },
  NOTA: { icon: MessageSquare, color: 'bg-emerald-500 text-white', badge: 'bg-emerald-100 text-emerald-700' },
  CURSO_EVENTO: { icon: GraduationCap, color: 'bg-purple-500 text-white', badge: 'bg-purple-100 text-purple-700' },
};

export function RelationshipTimeline({ userId, personName }: { userId: string; personName: string }) {
  const { firestore, user: currentUser } = useFirebase();
  const { toast } = useToast();
  const [newNote, setNewNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // 1. Query Anotações (member_notes)
  const notesQuery = useMemoFirebase(() => {
    if (!firestore || !userId) return null;
    return query(
      collection(firestore, 'member_notes'),
      where('memberId', '==', userId)
    );
  }, [firestore, userId]);

  // 2. Query Solicitações (solicitacoes)
  const solicitacoesQuery = useMemoFirebase(() => {
    if (!firestore || !userId) return null;
    return query(
      collection(firestore, 'solicitacoes'),
      where('personId', '==', userId)
    );
  }, [firestore, userId]);

  // 3. Query Processos (users/{userId}/processos)
  const processosQuery = useMemoFirebase(() => {
    if (!firestore || !userId) return null;
    return query(collection(firestore, 'users', userId, 'processos'));
  }, [firestore, userId]);

  const { data: notes, isLoading: loadingNotes } = useCollection<any>(notesQuery);
  const { data: solicitacoes, isLoading: loadingSolicitacoes } = useCollection<any>(solicitacoesQuery);
  const { data: processos, isLoading: loadingProcessos } = useCollection<any>(processosQuery);

  // Unificação e ordenação cronológica de todos os eventos da história da pessoa
  const timelineItems = useMemo(() => {
    const items: TimelineItem[] = [];

    // Adicionar Solicitações
    if (solicitacoes) {
      solicitacoes.forEach(sol => {
        const date = sol.createdAt?.toDate ? sol.createdAt.toDate() : new Date(sol.createdAt || Date.now());
        items.push({
          id: `sol-${sol.id}`,
          category: 'SOLICITACAO',
          title: `Solicitação: ${sol.intentType}`,
          description: `Gatilho registrado via ${sol.entryPoint || 'Portal de Conexão'}.`,
          icon: Sparkles,
          color: CATEGORY_ICONS.SOLICITACAO.color,
          timestamp: date,
        });
      });
    }

    // Adicionar Processos
    if (processos) {
      processos.forEach(proc => {
        const date = proc.startedAt?.toDate ? proc.startedAt.toDate() : new Date(proc.startedAt || Date.now());
        items.push({
          id: `proc-${proc.id}`,
          category: 'PROCESSO',
          title: `Processo Iniciado: ${proc.title}`,
          description: `Etapa atual: ${proc.currentStage} | Status: ${proc.status === 'COMPLETED' ? 'Concluído' : 'Ativo'}`,
          icon: RefreshCw,
          color: CATEGORY_ICONS.PROCESSO.color,
          timestamp: date,
        });
      });
    }

    // Adicionar Anotações Pastoral
    if (notes) {
      notes.forEach(note => {
        const date = note.createdAt?.toDate ? note.createdAt.toDate() : new Date(note.createdAt || Date.now());
        items.push({
          id: `note-${note.id}`,
          category: 'NOTA',
          title: 'Anotação / Ponto de Contato',
          description: note.content,
          icon: MessageSquare,
          color: CATEGORY_ICONS.NOTA.color,
          timestamp: date,
          authorName: note.authorName || 'Liderança',
        });
      });
    }

    // Ordenar do mais recente para o mais antigo
    return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [solicitacoes, processos, notes]);

  const handleAddNote = async () => {
    if (!newNote.trim() || !currentUser || !firestore) return;

    setIsSaving(true);
    try {
      await addDocumentNonBlocking(collection(firestore, 'member_notes'), {
        memberId: userId,
        authorId: currentUser.uid,
        authorName: currentUser.displayName || 'Líder',
        content: newNote,
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

  const isLoading = loadingNotes || loadingSolicitacoes || loadingProcessos;

  return (
    <Card className="border-none shadow-sm bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-black uppercase italic tracking-tight text-slate-900">
          <History className="text-primary size-5" /> Timeline de Relacionamento
        </CardTitle>
        <CardDescription className="text-slate-500 font-medium text-xs">
          A história completa da caminhada, solicitações e processos de {personName} na igreja.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Formulário para adicionar nova anotação pastoral */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
          <Textarea
            placeholder={`Registrar ponto de contato ou anotação pastoral sobre ${personName}...`}
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="bg-white border-slate-200 text-slate-900 text-xs min-h-[70px] rounded-xl focus:ring-primary"
          />
          <div className="flex justify-end">
            <Button 
              onClick={handleAddNote} 
              disabled={isSaving || !newNote.trim()}
              className="h-9 px-4 rounded-xl text-xs font-bold text-white shadow-sm"
            >
              {isSaving ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : <Send className="mr-2 size-3.5" />}
              Salvar na Timeline
            </Button>
          </div>
        </div>

        {/* Renderização da Linha do Tempo */}
        <div className="relative pl-6 space-y-6">
          <div className="absolute left-3 top-3 bottom-3 w-0.5 bg-slate-200 -translate-x-1/2" />

          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="animate-spin size-6 text-primary" />
            </div>
          ) : timelineItems.length === 0 ? (
            <div className="text-center py-8 text-slate-400 space-y-2">
              <History className="mx-auto size-8 opacity-40" />
              <p className="text-xs font-bold text-slate-700">Nenhum evento registrado ainda.</p>
              <p className="text-[11px]">As solicitações do portal e novos processos aparecerão automaticamente nesta linha do tempo.</p>
            </div>
          ) : (
            timelineItems.map((item) => {
              const Icon = item.icon;
              const catConfig = CATEGORY_ICONS[item.category] || CATEGORY_ICONS.NOTA;

              return (
                <div key={item.id} className="relative flex items-start gap-4 group">
                  {/* Ponto / Ícone na linha */}
                  <div className={`size-7 rounded-full ${catConfig.color} flex items-center justify-center shrink-0 shadow-sm z-10 -ml-6 border-2 border-white`}>
                    <Icon className="size-3.5" />
                  </div>

                  {/* Card do Evento */}
                  <div className="flex-1 bg-slate-50 p-4 rounded-2xl border border-slate-200 hover:border-primary/40 transition-colors space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-black uppercase tracking-tight text-slate-900">{item.title}</h4>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {format(item.timestamp, "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>

                    {item.description && (
                      <p className="text-xs text-slate-600 font-medium whitespace-pre-wrap leading-relaxed">
                        {item.description}
                      </p>
                    )}

                    {item.authorName && (
                      <p className="text-[10px] text-slate-400 italic pt-1">
                        Registrado por: {item.authorName}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
