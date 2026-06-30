'use client';

import React, { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  WorshipItem,
  WorshipItemType,
  computeScheduledTimes,
  formatDuration,
  parseDurationToSeconds,
  generateItemId,
} from '@/contexts/worship-context';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  GripVertical,
  Music,
  AlignLeft,
  Heading2,
  Trash2,
  ChevronDown,
  ChevronRight,
  Clock,
  Plus,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';

// ─── Color config (PCS row colors) ────────────────────────────────────────────

const COLOR_MAP: Record<string, { bg: string; border: string; dot: string }> = {
  none:   { bg: 'bg-transparent',       border: 'border-transparent',       dot: 'bg-slate-300' },
  purple: { bg: 'bg-purple-50',         border: 'border-purple-200',         dot: 'bg-purple-500' },
  blue:   { bg: 'bg-blue-50',           border: 'border-blue-200',           dot: 'bg-blue-500' },
  green:  { bg: 'bg-emerald-50',        border: 'border-emerald-200',        dot: 'bg-emerald-500' },
  yellow: { bg: 'bg-yellow-50',         border: 'border-yellow-200',         dot: 'bg-yellow-400' },
  red:    { bg: 'bg-red-50',            border: 'border-red-200',            dot: 'bg-red-500' },
  gray:   { bg: 'bg-slate-100',         border: 'border-slate-200',          dot: 'bg-slate-500' },
};

// ─── Single sortable row ───────────────────────────────────────────────────────

interface SortableItemProps {
  item: WorshipItem & { scheduledTime?: string };
  onChange: (id: string, patch: Partial<WorshipItem>) => void;
  onDelete: (id: string) => void;
  isEditing?: boolean;
}

function SortableRow({ item, onChange, onDelete }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const [notesOpen, setNotesOpen] = useState(!!item.notes);
  const [durationInput, setDurationInput] = useState(item.durationSeconds ? formatDuration(item.durationSeconds) : '');
  const [colorMenuOpen, setColorMenuOpen] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  const colorConf = COLOR_MAP[item.color || 'none'];
  const isHeader = item.type === 'header';
  const isSong = item.type === 'song';

  const handleDurationBlur = () => {
    const secs = parseDurationToSeconds(durationInput);
    onChange(item.id, { durationSeconds: secs });
  };

  if (isHeader) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="flex items-center gap-2 px-2 py-2 bg-slate-100 border border-slate-200 rounded-md mt-4 first:mt-0 select-none"
      >
        <button
          className="text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <Heading2 className="h-4 w-4 text-slate-500 shrink-0" />
        <input
          className="flex-1 bg-transparent font-bold text-sm text-slate-700 uppercase tracking-wider focus:outline-none"
          value={item.title}
          onChange={e => onChange(item.id, { title: e.target.value })}
          placeholder="Título do cabeçalho..."
        />
        <button
          onClick={() => onDelete(item.id)}
          className="text-slate-400 hover:text-red-500 transition-colors ml-auto"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group border-b border-slate-100 last:border-b-0',
        colorConf.bg
      )}
    >
      <div className="flex items-start gap-2 px-2 py-3">
        {/* Drag handle */}
        <button
          className="mt-0.5 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing touch-none flex-shrink-0"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Duration */}
        <div className="flex flex-col items-center w-12 shrink-0 mt-0.5">
          {item.durationSeconds ? (
            <input
              className="w-12 text-center text-sm font-mono text-slate-500 bg-transparent focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary/30 rounded px-0.5"
              value={durationInput}
              onChange={e => setDurationInput(e.target.value)}
              onBlur={handleDurationBlur}
              placeholder="0:00"
              title="Duração (M:SS)"
            />
          ) : (
            <input
              className="w-12 text-center text-sm text-slate-300 bg-transparent focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary/30 rounded px-0.5"
              value={durationInput}
              onChange={e => setDurationInput(e.target.value)}
              onBlur={handleDurationBlur}
              placeholder="0:00"
              title="Duração (M:SS)"
            />
          )}
          {item.scheduledTime && (
            <span className="text-[10px] text-slate-400 mt-0.5">{item.scheduledTime}</span>
          )}
        </div>

        {/* Icon */}
        <div className="mt-1 shrink-0">
          {isSong
            ? <Music className="h-3.5 w-3.5 text-violet-500" />
            : <AlignLeft className="h-3.5 w-3.5 text-slate-400" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 w-full">
            <input
              className={cn(
                "flex-1 bg-transparent font-semibold text-sm focus:outline-none",
                isSong ? "text-slate-800" : "text-slate-700"
              )}
              value={item.title}
              onChange={e => onChange(item.id, { title: e.target.value })}
              placeholder={isSong ? "Nome da música..." : "Descrição do item..."}
            />
            {isSong && item.key && (
              <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                {item.key}
              </span>
            )}
          </div>

          {/* Subtítulo do artista para músicas */}
          {isSong && item.arrangement && (
            <p className="text-[11px] text-slate-400 font-medium leading-tight mt-0.5">
              {item.arrangement}
            </p>
          )}

          {/* Song metadata row */}
          {isSong && (
            <div className="flex items-center gap-3 mt-1.5">
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Tom:</span>
                <input
                  className="w-12 text-xs bg-transparent text-slate-600 focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary/20 rounded px-1 py-0.5 font-bold"
                  value={item.key || ""}
                  onChange={e => onChange(item.id, { key: e.target.value })}
                  placeholder="Ex: G"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase">BPM:</span>
                <input
                  className="w-12 text-xs bg-transparent text-slate-600 focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary/20 rounded px-1 py-0.5 font-mono"
                  value={item.bpm ? String(item.bpm) : ""}
                  onChange={e => onChange(item.id, { bpm: parseInt(e.target.value) || undefined })}
                  placeholder="70"
                  type="number"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Artista/Arranjo:</span>
                <input
                  className="w-32 text-xs bg-transparent text-slate-600 focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary/20 rounded px-1 py-0.5 font-medium"
                  value={item.arrangement || ""}
                  onChange={e => onChange(item.id, { arrangement: e.target.value })}
                  placeholder="Ex: Elevation Worship"
                />
              </div>
            </div>
          )}

          {/* Notes */}
          {notesOpen && (
            <textarea
              className="w-full mt-1.5 text-xs text-slate-500 bg-white/70 border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
              rows={2}
              value={item.notes || ''}
              onChange={e => onChange(item.id, { notes: e.target.value })}
              placeholder="Adicionar notas para a equipe..."
            />
          )}
        </div>

        {/* Actions (visible on hover) */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
          {/* Color dot */}
          <div className="relative">
            <button
              onClick={() => setColorMenuOpen(v => !v)}
              className={cn('w-3 h-3 rounded-full border', colorConf.dot, 'hover:scale-125 transition-transform')}
              title="Cor da linha"
            />
            {colorMenuOpen && (
              <div className="absolute right-0 top-5 z-50 bg-white border border-slate-200 rounded-lg shadow-lg p-2 flex gap-1.5">
                {Object.entries(COLOR_MAP).map(([key, conf]) => (
                  <button
                    key={key}
                    onClick={() => { onChange(item.id, { color: key as any }); setColorMenuOpen(false); }}
                    className={cn('w-4 h-4 rounded-full border-2', conf.dot, item.color === key ? 'border-slate-800' : 'border-transparent')}
                    title={key}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Notes toggle */}
          <button
            onClick={() => setNotesOpen(v => !v)}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            title="Notas"
          >
            {notesOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>

          {/* Delete */}
          <button
            onClick={() => onDelete(item.id)}
            className="text-slate-400 hover:text-red-500 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Editor ──────────────────────────────────────────────────────────────

interface WorshipPlanEditorProps {
  items: WorshipItem[];
  startTime: string;
  onItemsChange: (items: WorshipItem[]) => void;
  readOnly?: boolean;
}

export function WorshipPlanEditor({ items, startTime, onItemsChange, readOnly = false }: WorshipPlanEditorProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const enriched = computeScheduledTimes(items, startTime || '09:00');

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex(i => i.id === active.id);
    const newIdx = items.findIndex(i => i.id === over.id);
    const reordered = arrayMove(items, oldIdx, newIdx).map((item, idx) => ({ ...item, order: idx }));
    onItemsChange(reordered);
  }, [items, onItemsChange]);

  const handleChange = useCallback((id: string, patch: Partial<WorshipItem>) => {
    onItemsChange(items.map(item => item.id === id ? { ...item, ...patch } : item));
  }, [items, onItemsChange]);

  const handleDelete = useCallback((id: string) => {
    onItemsChange(items.filter(item => item.id !== id).map((item, idx) => ({ ...item, order: idx })));
  }, [items, onItemsChange]);

  const addItem = useCallback((type: WorshipItemType) => {
    const newItem: WorshipItem = {
      id: generateItemId(),
      type,
      order: items.length,
      title: type === 'header' ? 'NOVO BLOCO' : type === 'song' ? 'Nova Música' : 'Novo Item',
      durationSeconds: type === 'header' ? undefined : type === 'song' ? 270 : 300,
      color: 'none',
    };
    onItemsChange([...items, newItem]);
  }, [items, onItemsChange]);

  const totalSeconds = items.reduce((acc, item) => acc + (item.durationSeconds || 0), 0);
  const totalDuration = totalSeconds > 0 ? (() => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}min` : `${m} min`;
  })() : null;

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">
        {/* Toolbar */}
        {!readOnly && (
          <div className="flex items-center gap-2 p-3 border-b border-slate-200 bg-white sticky top-0 z-10">
            <span className="text-xs text-slate-500 font-medium mr-1">Adicionar:</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => addItem('header')}
                >
                  <Heading2 className="h-3.5 w-3.5" />
                  Cabeçalho
                  <kbd className="ml-1 text-[10px] bg-slate-100 px-1 rounded">H</kbd>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Adicionar cabeçalho de seção</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => addItem('item')}
                >
                  <AlignLeft className="h-3.5 w-3.5" />
                  Item
                  <kbd className="ml-1 text-[10px] bg-slate-100 px-1 rounded">I</kbd>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Adicionar item (anúncio, oração, pregação...)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs border-violet-200 text-violet-700 hover:bg-violet-50"
                  onClick={() => addItem('song')}
                >
                  <Music className="h-3.5 w-3.5" />
                  Música
                  <kbd className="ml-1 text-[10px] bg-violet-100 px-1 rounded">S</kbd>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Adicionar música ao culto</TooltipContent>
            </Tooltip>

            <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              <span>{totalDuration ? `Duração total: ${totalDuration}` : 'Sem itens'}</span>
            </div>
          </div>
        )}

        {/* Item list */}
        <div className="flex-1 overflow-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
              <AlignLeft className="h-10 w-10 text-slate-300 mb-3" />
              <p className="font-medium text-slate-600">Ordem de culto vazia</p>
              <p className="text-sm mt-1">Use os botões acima para montar a estrutura do culto,<br />ou importe um template existente.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={enriched.map(i => i.id)} strategy={verticalListSortingStrategy}>
                  <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 bg-white">
                    {enriched.map(item => (
                      <SortableRow
                        key={item.id}
                        item={item}
                        onChange={handleChange}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              {totalDuration && (
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg font-black text-xs text-slate-700 uppercase tracking-wider">
                  <span>Duração total do culto</span>
                  <span className="text-sm font-black text-primary">{totalDuration}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
