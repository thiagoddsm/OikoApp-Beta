'use client';

import React, { useState, useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar, Loader2, Plus, Sparkles, CheckCircle2, UserCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EventRegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  userPhone?: string;
  userEmail?: string;
}

export function EventRegistrationDialog({
  open,
  onOpenChange,
  userId,
  userName,
  userPhone = '',
  userEmail = '',
}: EventRegistrationDialogProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [role, setRole] = useState<'PARTICIPANTE' | 'LIDER_RESPONSAVEL' | 'EQUIPE_APOIO'>('PARTICIPANTE');
  const [checkedIn, setCheckedIn] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Busca eventos estratégicos/conferências/retiros no Firestore
  const eventsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'strategic_events'));
  }, [firestore]);

  const { data: rawEvents, isLoading: loadingEvents } = useCollection<any>(eventsQuery);

  // Fallback de eventos comuns caso não haja eventos estratégicos cadastrados
  const eventsList = useMemo(() => {
    if (rawEvents && rawEvents.length > 0) {
      return rawEvents;
    }
    return [
      { id: 'ibm-camp-2026', title: 'IBM CAMP 2026', category: 'Retiro' },
      { id: 'acampadentro-er-mr', title: 'ACAMPADENTRO DOS ER/MR', category: 'Acampamento' },
      { id: 'gc-no-cinema', title: 'GC NO CINEMA', category: 'Encontro de GC' },
      { id: 'cafe-de-mulheres', title: 'CAFÉ DE MULHERES', category: 'Encontro' },
      { id: 'culto-visao', title: 'CULTO DE VISÃO', category: 'Conferência' },
    ];
  }, [rawEvents]);

  const getEventTitle = (e: any) => {
    if (!e) return 'Evento Especial';
    return (
      e.title || 
      e.name || 
      e.nome || 
      e.titulo || 
      e.eventName || 
      e.eventTitle || 
      (e.category || e.categoria ? `Evento de ${(e.category || e.categoria).toUpperCase()}` : `Evento (${e.id})`)
    );
  };

  const handleRegister = async () => {
    if (!selectedEventId || !firestore || !userId) {
      toast({ variant: 'destructive', title: 'Selecione um evento' });
      return;
    }

    const event = eventsList.find(e => e.id === selectedEventId);
    const eventTitle = getEventTitle(event);

    setIsSubmitting(true);
    try {
      await addDocumentNonBlocking(collection(firestore, 'event_registrations'), {
        eventId: selectedEventId,
        eventTitle: eventTitle,
        userId: userId,
        userMetadata: {
          name: userName,
          phone: userPhone,
          email: userEmail,
        },
        role: role,
        payment: {
          status: 'approved',
          method: 'ISENTO_OU_PRESENCIAL',
          valuePaid: 0,
        },
        attendance: {
          checkedIn: checkedIn,
          checkedInAt: new Date().toISOString(),
        },
        createdAt: Timestamp.now(),
      });

      toast({
        title: "Inscrição em Evento Confirmada!",
        description: `${userName} foi inscrito(a) no evento "${eventTitle}" com sucesso.`,
      });

      onOpenChange(false);
      setSelectedEventId('');
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Erro na Inscrição',
        description: e.message || 'Não foi possível registrar a inscrição.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white space-y-4 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-3 rounded-2xl bg-amber-100 text-amber-800">
              <Calendar className="size-6" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black uppercase italic tracking-tight text-slate-900">
                Inscrever em Evento / Retiro
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 font-medium">
                Vincule {userName} a uma conferência, acampamento ou evento ministerial.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Seletor de Evento */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Selecione o Evento ou Conferência</Label>
            {loadingEvents ? (
              <div className="flex items-center gap-2 p-3 text-xs text-slate-500">
                <Loader2 className="size-4 animate-spin" /> Carregando eventos disponíveis...
              </div>
            ) : (
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">-- Escolha o evento --</option>
                {eventsList.map((e) => {
                  const displayTitle = getEventTitle(e);
                  const categoryLabel = e.category || e.categoria || e.type || '';
                  return (
                    <option key={e.id} value={e.id}>
                      {displayTitle.toUpperCase()} {categoryLabel ? `• ${String(categoryLabel).toUpperCase()}` : ''}
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          {/* Papel / Função no Evento */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Papel / Função da Pessoa no Evento</Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRole('PARTICIPANTE')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                  role === 'PARTICIPANTE'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Participante
              </button>
              <button
                type="button"
                onClick={() => setRole('LIDER_RESPONSAVEL')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                  role === 'LIDER_RESPONSAVEL'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Líder Responsável
              </button>
              <button
                type="button"
                onClick={() => setRole('EQUIPE_APOIO')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                  role === 'EQUIPE_APOIO'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Equipe / Apoio
              </button>
            </div>
          </div>

          {/* Status da Presença / Check-in */}
          <div className="space-y-1.5 pt-1">
            <Label className="text-xs font-bold text-slate-700">Status da Presença / Participação</Label>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <input
                type="checkbox"
                id="checkedInToggle"
                checked={checkedIn}
                onChange={(e) => setCheckedIn(e.target.checked)}
                className="size-4 rounded text-primary focus:ring-primary cursor-pointer"
              />
              <label htmlFor="checkedInToggle" className="text-xs font-bold text-slate-800 cursor-pointer">
                Confirmar Presença / Realizado (Check-in concluído)
              </label>
            </div>
          </div>

          <div className="flex gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full h-11 rounded-xl text-xs font-bold"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleRegister}
              disabled={isSubmitting || !selectedEventId}
              className="w-full h-11 rounded-xl text-xs font-bold text-white shadow-sm"
            >
              {isSubmitting ? <Loader2 className="size-4 animate-spin mr-1" /> : <CheckCircle2 className="size-4 mr-1" />}
              Confirmar Inscrição
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
