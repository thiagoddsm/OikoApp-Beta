'use client';
import React, { useState, useMemo } from 'react';
import { useFirebase } from '@/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  MessageSquare,
  History,
  User,
  Zap,
  HeartHandshake,
  HandHelping,
  CalendarDays,
  Church,
  GraduationCap,
  CheckCircle,
  MapPin,
  Send,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { CATEGORY_CONFIG, type TimelineCategory } from '@/lib/timeline';
import { useTimelinePermission } from '@/hooks/use-timeline-permission';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type Note = {
  id: string;
  authorId: string;
  type: 'user' | 'system';
  content: string;
  createdAt: any;
  // Campos da Linha do Tempo (opcionais — retrocompatível)
  category?: TimelineCategory;
  entityTitle?: string;
  eventDescription?: string;
  statusBadge?: string;
  eventDate?: any;
  source?: 'automatic' | 'manual' | 'migrated';
};

interface FollowUpTimelineProps {
  memberId: string;
  memberName: string;
  initialNotes: Note[];
  onNoteAdded?: () => void;
}

// ─── Mapa de ícones por categoria ─────────────────────────────────────────────

const CATEGORY_ICONS: Record<TimelineCategory, React.ElementType> = {
  gc: HeartHandshake,
  volunteering: HandHelping,
  event: CalendarDays,
  ecclesiastical_status: Church,
  teaching: GraduationCap,
  decision: CheckCircle,
  followup_note: MessageSquare,
  origin: MapPin,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDate(value: any): Date {
  if (!value) return new Date();
  if (value?.toDate) return value.toDate();
  if (value instanceof Date) return value;
  return new Date(value);
}

const ALL_FILTER = 'all';

const FILTER_OPTIONS: { id: string; label: string }[] = [
  { id: ALL_FILTER, label: 'Todos' },
  { id: 'gc', label: 'GC' },
  { id: 'volunteering', label: 'Voluntariado' },
  { id: 'event', label: 'Eventos' },
  { id: 'teaching', label: 'Ensino' },
  { id: 'ecclesiastical_status', label: 'Situação Eclesiástica' },
  { id: 'decision', label: 'Decisões' },
  { id: 'followup_note', label: 'Follow-up' },
  { id: 'origin', label: 'Origem' },
];

// ─── Componente de item de evento rico ────────────────────────────────────────

function TimelineEventCard({ note }: { note: Note }) {
  const category = note.category ?? 'followup_note';
  const config = CATEGORY_CONFIG[category];
  const Icon = CATEGORY_ICONS[category];

  // Data a exibir: eventDate (data real do evento) ou createdAt
  const displayDate = toDate(note.eventDate ?? note.createdAt);

  const isRichEvent = !!note.category && !!note.entityTitle;

  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-all hover:shadow-md',
        config.bgColor,
        config.borderColor,
      )}
    >
      {/* Cabeçalho: categoria + data */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={cn('p-1.5 rounded-lg bg-white/70', config.color)}>
            <Icon className="size-3.5" />
          </div>
          <span className={cn('text-[11px] font-black uppercase tracking-wider', config.color)}>
            {config.label}
          </span>
          {note.source === 'automatic' && (
            <span className="text-[9px] font-bold text-muted-foreground/70 uppercase tracking-wider">
              · Sistema
            </span>
          )}
        </div>
        <span className="text-[11px] text-muted-foreground font-semibold">
          {format(displayDate, "dd/MM/yyyy", { locale: ptBR })}
        </span>
      </div>

      {/* Corpo: evento rico */}
      {isRichEvent ? (
        <div className="space-y-1">
          <p className="text-xs font-black text-slate-800 uppercase tracking-tight">
            {note.entityTitle}
          </p>
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-slate-700">{note.eventDescription}</p>
            {note.statusBadge && (
              <Badge
                variant="outline"
                className={cn(
                  'text-[9px] font-black uppercase px-1.5 border-0 h-4',
                  config.bgColor.replace('bg-', 'bg-opacity-100 bg-'),
                  config.color,
                )}
              >
                {note.statusBadge}
              </Badge>
            )}
          </div>
          {note.content && (
            <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">{note.content}</p>
          )}
        </div>
      ) : (
        // Nota de follow-up pura (sem categoria rica)
        <div className="flex items-start gap-3">
          <div>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.content}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────────

export function FollowUpTimeline({
  memberId,
  memberName,
  initialNotes,
  onNoteAdded,
}: FollowUpTimelineProps) {
  const { user: currentUser, firestore } = useFirebase();
  const { toast } = useToast();
  const [newNote, setNewNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>(ALL_FILTER);

  const permission = useTimelinePermission(memberId);

  // Ordenar por data real do evento (eventDate ?? createdAt), mais recente primeiro
  const sortedNotes = useMemo(() => {
    return [...initialNotes].sort((a, b) => {
      const da = toDate(a.eventDate ?? a.createdAt);
      const db = toDate(b.eventDate ?? b.createdAt);
      return db.getTime() - da.getTime();
    });
  }, [initialNotes]);

  // Filtrar por categoria
  const filteredNotes = useMemo(() => {
    if (activeFilter === ALL_FILTER) return sortedNotes;
    return sortedNotes.filter(
      (n) => (n.category ?? 'followup_note') === activeFilter,
    );
  }, [sortedNotes, activeFilter]);

  const handleAddNote = async () => {
    if (!newNote.trim() || !currentUser || !firestore) return;
    setIsSaving(true);
    try {
      const notesRef = collection(firestore, `users/${memberId}/notes`);
      await addDoc(notesRef, {
        authorId: currentUser.uid,
        type: 'user' as const,
        content: newNote,
        createdAt: Timestamp.now(),
        category: 'followup_note' as TimelineCategory,
        entityTitle: 'Follow-up Manual',
        eventDescription: 'ANOTAÇÃO DO LÍDER',
        source: 'manual' as const,
      });
      toast({ title: 'Anotação salva!' });
      setNewNote('');
      onNoteAdded?.();
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: 'Tente novamente em instantes.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Se o usuário não tem permissão de ver (e não é loading), não renderizar
  if (!permission.isLoading && !permission.canView) {
    return null;
  }

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="border-b bg-slate-50/50 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <History className="size-5 text-primary" />
            Linha do Tempo
            {sortedNotes.length > 0 && (
              <Badge variant="secondary" className="font-black text-xs ml-1">
                {sortedNotes.length}
              </Badge>
            )}
          </CardTitle>
        </div>

        {/* Filtros por categoria */}
        {sortedNotes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setActiveFilter(opt.id)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-[11px] font-bold transition-all border',
                  activeFilter === opt.id
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-primary/40 hover:text-primary',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-5 space-y-4">
        {/* Área de nova nota — apenas para líderes acima do membro */}
        {permission.canAddManualEvent && (
          <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarImage src={currentUser?.photoURL || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary">
                <User className="size-4" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <Textarea
                placeholder={`Adicione uma anotação de follow-up sobre ${memberName}...`}
                className="min-h-[72px] text-sm resize-none bg-white"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleAddNote}
                  disabled={isSaving || !newNote.trim()}
                  className="font-bold"
                >
                  {isSaving ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-3.5 w-3.5" />
                  )}
                  Salvar Anotação
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Lista de eventos */}
        {permission.isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filteredNotes.length > 0 ? (
          <div className="relative">
            {/* Linha vertical */}
            <div className="absolute left-[18px] top-2 bottom-2 w-px bg-slate-200" />
            <div className="space-y-3">
              {filteredNotes.map((note) => (
                <div key={note.id} className="flex gap-4 items-start">
                  {/* Bolinha na linha do tempo */}
                  <div
                    className={cn(
                      'shrink-0 mt-4 size-3 rounded-full ring-4 ring-white z-10',
                      note.category
                        ? CATEGORY_CONFIG[note.category].bgColor.replace('/50', '')
                        : 'bg-slate-300',
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <TimelineEventCard note={note} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <History className="mx-auto h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm font-semibold">
              {activeFilter !== ALL_FILTER
                ? 'Nenhum evento nessa categoria.'
                : 'Nenhum evento registrado ainda.'}
            </p>
            {activeFilter !== ALL_FILTER && (
              <button
                onClick={() => setActiveFilter(ALL_FILTER)}
                className="mt-2 text-xs text-primary hover:underline font-bold"
              >
                Ver todos os eventos
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
