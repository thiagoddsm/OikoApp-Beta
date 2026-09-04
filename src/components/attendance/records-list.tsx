'use client';
import React, { useState, useMemo } from 'react';
import { doc } from 'firebase/firestore';
import { useFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, Pencil } from 'lucide-react';

interface ConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

function ConfirmationModal({ open, onOpenChange, onConfirm }: ConfirmationModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Excluir</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface RecordsListProps {
  registros: any[];
  loading: boolean;
  onEdit: (reg: any) => void;
}

export function RecordsList({ registros, loading, onEdit }: RecordsListProps) {
  const { firestore } = useFirebase();
  const [modalOpen, setModalOpen] = useState(false);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);

  const handleDeleteClick = (id: string) => {
    setIdToDelete(id);
    setModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!idToDelete || !firestore) return;
    const docRef = doc(firestore, `registros_de_presenca`, idToDelete);
    deleteDocumentNonBlocking(docRef);
    setModalOpen(false);
    setIdToDelete(null);
  };

  const formatarData = (timestamp: any) => {
    if (!timestamp?.seconds) return '-';
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('pt-BR', {timeZone: 'UTC'});
  };

  const registrosOrdenados = useMemo(() => {
    if (!registros) return [];
    return [...registros].sort((a, b) => {
      const dataA = a.data?.seconds || 0;
      const dataB = b.data?.seconds || 0;
      return dataB - dataA;
    });
  }, [registros]);

  if (loading) {
    return <p className="text-center text-muted-foreground mt-10">Carregando registros...</p>;
  }

  if (registros.length === 0) {
    return <p className="text-center text-muted-foreground mt-10">Nenhum registro encontrado.</p>;
  }

  return (
    <div className="mt-8">
       <ConfirmationModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onConfirm={handleConfirmDelete}
      />
      <h2 className="text-xl font-bold mb-4">Registros Salvos</h2>
      <div className="rounded-lg border">
        <div className="overflow-x-auto w-full">
<Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Horário</TableHead>
              <TableHead>Adultos</TableHead>
              <TableHead>Crianças</TableHead>
              <TableHead>Servos</TableHead>
              <TableHead>Sala VIP</TableHead>
              <TableHead className="text-emerald-600">Conversões</TableHead>
              <TableHead className="text-sky-600">Reconciliações</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Série</TableHead>
              <TableHead>Contexto</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registrosOrdenados.map(reg => (
              <TableRow key={reg.id}>
                <TableCell className="font-medium">{formatarData(reg.data)}</TableCell>
                <TableCell>{reg.horario.split(' - ')[1]}</TableCell>
                <TableCell>{reg.adultos}</TableCell>
                <TableCell>{reg.criancas || 0}</TableCell>
                <TableCell className="font-medium text-indigo-600">{reg.servos || 0}</TableCell>
                <TableCell>{reg.salaVip || 0}</TableCell>
                <TableCell className="font-semibold text-emerald-600">{reg.conversoes || 0}</TableCell>
                <TableCell className="font-semibold text-sky-600">{reg.reconciliacoes || 0}</TableCell>
                <TableCell className="font-semibold text-primary">{(reg.adultos || 0) + (reg.criancas || 0) + (reg.servos || 0)}</TableCell>
                <TableCell className="truncate max-w-xs">{reg.serieMensagem || "-"}</TableCell>
                <TableCell className="space-x-1 space-y-1">
                  {reg.feriadoProximo && <Badge variant="outline">Feriado</Badge>}
                  {reg.jogoFutebol && <Badge variant="outline">Jogo</Badge>}
                  {reg.apresentacaoBebe && <Badge variant="outline">Bebê</Badge>}
                  {reg.teveApelo && <Badge variant="outline" className="bg-purple-50 border-purple-200 text-purple-700">Apelo</Badge>}
                  {reg.teveCeia && <Badge variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-700">Ceia</Badge>}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(reg)} title="Editar">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(reg.id)} title="Excluir">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
</div>
      </div>
    </div>
  );
}
