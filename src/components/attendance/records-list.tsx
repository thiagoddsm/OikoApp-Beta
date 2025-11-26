// src/components/attendance/records-list.tsx
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
import { Trash2 } from 'lucide-react';

function ConfirmationModal({ open, onOpenChange, onConfirm }) {
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

export function RecordsList({ registros, loading }) {
  const { firestore, user } = useFirebase();
  const [modalOpen, setModalOpen] = useState(false);
  const [idToDelete, setIdToDelete] = useState(null);

  const handleDeleteClick = (id) => {
    setIdToDelete(id);
    setModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!idToDelete || !user) return;
    const docRef = doc(firestore, `cultos/${user.uid}/registros`, idToDelete);
    deleteDocumentNonBlocking(docRef);
    setModalOpen(false);
    setIdToDelete(null);
  };

  const formatarData = (dataStr) => {
    if (!dataStr) return '-';
    const [ano, mes, dia] = dataStr.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  const registrosOrdenados = useMemo(() => {
    if (!registros) return [];
    return [...registros].sort((a, b) => {
      const dataA = new Date(a.data);
      const dataB = new Date(b.data);
      return dataB.getTime() - dataA.getTime();
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Horário</TableHead>
              <TableHead>Adultos</TableHead>
              <TableHead>Crianças</TableHead>
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
                <TableCell className="font-semibold text-primary">{reg.adultos + (reg.criancas || 0)}</TableCell>
                <TableCell className="truncate max-w-xs">{reg.serieMensagem || "-"}</TableCell>
                <TableCell className="space-x-1">
                  {reg.feriadoProximo && <Badge variant="outline">Feriado</Badge>}
                  {reg.jogoFutebol && <Badge variant="outline">Jogo</Badge>}
                  {reg.apresentacaoBebe && <Badge variant="outline">Bebê</Badge>}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(reg.id)} title="Excluir">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
