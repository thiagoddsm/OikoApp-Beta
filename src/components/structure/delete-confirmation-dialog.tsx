
'use client';

import React from 'react';
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
import { Button } from "@/components/ui/button";

interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  itemName: string;
  itemType: string;
}

export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  itemName,
  itemType,
}: DeleteConfirmationDialogProps) {
  
  const getWarningMessage = () => {
    switch (itemType) {
      case 'Rede':
        return (
          <>
            <br/><br/>
            <strong className="text-destructive">ATENÇÃO:</strong> Todas as áreas dentro desta rede também serão excluídas. As células dentro dessas áreas ficarão sem uma área pai.
          </>
        );
      case 'Área':
         return (
          <>
            <br/><br/>
            <strong>Atenção:</strong> As células dentro desta área não serão excluídas, mas ficarão sem uma área pai.
          </>
        );
      case 'Área de Serviço':
        return (
          <>
            <br/><br/>
            <strong>Atenção:</strong> As equipes associadas a esta área não serão excluídas, mas o vínculo será removido.
          </>
        )
      default:
        return null;
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. Isso excluirá permanentemente o item <span className="font-bold">{itemType}: {itemName}</span>.
            {getWarningMessage()}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline">Cancelar</Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button variant="destructive" onClick={onConfirm}>
              Sim, excluir
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
