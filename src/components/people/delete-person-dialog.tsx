'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertTriangle, Loader2, Trash2, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase/provider';
import { softDeletePerson } from '@/app/dashboard/people/actions';

interface DeletePersonDialogProps {
  person: {
    id: string;
    name: string;
    email?: string;
    phone?: string | number;
    avatar?: string;
    photoURL?: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function DeletePersonDialog({
  person,
  isOpen,
  onClose,
  onSuccess,
}: DeletePersonDialogProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !person) return null;

  const handleDelete = async () => {
    if (user?.uid === person.id) {
      toast({
        variant: 'destructive',
        title: 'Ação Bloqueada',
        description: 'Você não pode excluir o seu próprio cadastro.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await softDeletePerson(person.id, user?.uid);
      if (res.success) {
        toast({
          title: 'Cadastro Movidinho para a Lixeira 🗑️',
          description: `O cadastro de ${person.name} foi movido para a Lixeira e pode ser restaurado a qualquer momento.`,
        });
        if (onSuccess) onSuccess();
        onClose();
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro ao excluir',
          description: res.error || 'Não foi possível excluir o cadastro.',
        });
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro de conexão',
        description: err.message || 'Ocorreu um erro ao processar a exclusão.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const initials = person.name
    ? person.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isSubmitting) onClose(); }}>
      <DialogContent className="sm:max-w-md rounded-3xl p-6 border-slate-200">
        <DialogHeader className="space-y-3 text-center sm:text-left">
          <div className="size-12 rounded-2xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mx-auto sm:mx-0 shadow-inner">
            <AlertTriangle size={24} />
          </div>
          <div>
            <DialogTitle className="text-xl font-black uppercase italic tracking-tight text-slate-900 dark:text-white">
              Excluir Cadastro?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium">
              Confirme a exclusão do cadastro abaixo. O registro será movido para a <strong>Lixeira</strong>.
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Card do Membro */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <Avatar className="size-12 border-2 border-white shadow-sm">
            <AvatarImage src={person.photoURL || person.avatar} alt={person.name} />
            <AvatarFallback className="bg-primary/10 text-primary font-black text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-0.5 overflow-hidden">
            <p className="font-black text-sm text-slate-900 dark:text-slate-100 truncate">
              {person.name}
            </p>
            {person.email && (
              <p className="text-xs text-slate-500 truncate">{person.email}</p>
            )}
          </div>
        </div>

        {/* Informação sobre Restauração */}
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-xs text-amber-700 dark:text-amber-300">
          <ShieldAlert className="size-4 shrink-0 mt-0.5 text-amber-600" />
          <span>
            Nenhum dado será perdido permanentemente. Você poderá <strong>restaurar</strong> este contato a qualquer momento através do filtro de <strong>Lixeira</strong>.
          </span>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={onClose}
            className="w-full sm:w-auto rounded-xl font-bold text-xs h-11"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isSubmitting}
            onClick={handleDelete}
            className="w-full sm:w-auto rounded-xl font-black uppercase tracking-wider text-xs h-11 bg-rose-600 hover:bg-rose-700 text-white shadow-md gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Excluindo...
              </>
            ) : (
              <>
                <Trash2 size={16} /> Mover para Lixeira
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
