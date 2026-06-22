'use client';

import React, { useState } from 'react';
import { useVolunteering, type ReservationCategory } from '@/contexts/volunteering-context';
import { useFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, PlusCircle, Trash2, Tag, Pencil, Check, X } from 'lucide-react';
import { DeleteConfirmationDialog } from '@/components/structure/delete-confirmation-dialog';
import { useToast } from '@/hooks/use-toast';
import { useEventsData } from "@/hooks/useDomainData";

export function CategoryManagement() {
    const { events, reservations, rooms, strategicEvents, reservationCategories } = useEventsData();

  const { isLoading, addReservationCategory, deleteReservationCategory } = useVolunteering();
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [newCatName, setNewCatName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const [selectedCat, setSelectedCat] = useState<ReservationCategory | null>(null);

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isEditingSaving, setIsEditingSaving] = useState(false);

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    setIsSaving(true);
    try {
      await addReservationCategory({ name: newCatName.trim() });
      setNewCatName('');
      toast({
        title: "Categoria Criada",
        description: "Nova categoria adicionada com sucesso.",
      });
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Erro ao criar",
        description: "Não foi possível criar a categoria.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEdit = (cat: ReservationCategory) => {
    setEditingId(cat.id);
    setEditingName(cat.name);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleSaveEdit = async (catId: string) => {
    if (!editingName.trim() || !firestore) return;
    setIsEditingSaving(true);
    try {
      const docRef = doc(firestore, 'reservation_categories', catId);
      await updateDoc(docRef, { name: editingName.trim() });
      toast({
        title: "Categoria Atualizada",
        description: "Nome da categoria alterado com sucesso.",
      });
      setEditingId(null);
      setEditingName('');
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: "Não foi possível renomear a categoria.",
      });
    } finally {
      setIsEditingSaving(false);
    }
  };

  const handleDelete = (cat: ReservationCategory) => {
    setSelectedCat(cat);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedCat) {
      try {
        await deleteReservationCategory(selectedCat.id);
        toast({
          title: "Categoria Removida",
          description: "A categoria foi removida com sucesso.",
        });
      } catch (err) {
        console.error(err);
      } finally {
        setDeleteOpen(false);
        setSelectedCat(null);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-end gap-2 bg-muted/20 p-4 rounded-lg border border-dashed">
            <div className="flex-1">
                <label htmlFor="new-category" className="text-xs font-bold uppercase text-muted-foreground ml-1 mb-1 block flex items-center gap-2">
                    <Tag className="size-3" /> Nova Categoria
                </label>
                <Input
                    id="new-category"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="Ex: Ação Social, Escola de Líderes..."
                    className="bg-background"
                />
            </div>
            <Button onClick={handleAddCategory} disabled={isSaving || !newCatName.trim()}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PlusCircle className="mr-2 h-4 w-4" />}
                Cadastrar
            </Button>
        </div>

        <div className="rounded-xl border shadow-sm bg-white overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Nome da Categoria</TableHead>
                <TableHead className="text-right w-[150px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reservationCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="h-32 text-center text-muted-foreground">
                    Nenhuma categoria cadastrada.
                  </TableCell>
                </TableRow>
              ) : (
                reservationCategories.map((cat) => {
                  const isEditing = editingId === cat.id;

                  return (
                    <TableRow key={cat.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-semibold text-slate-700 py-3">
                        {isEditing ? (
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="h-8 max-w-sm"
                            autoFocus
                          />
                        ) : (
                          cat.name
                        )}
                      </TableCell>
                      <TableCell className="text-right py-3">
                        {isEditing ? (
                          <div className="flex justify-end gap-1.5">
                            <Button 
                              variant="outline" 
                              size="icon" 
                              onClick={() => handleSaveEdit(cat.id)}
                              disabled={isEditingSaving || !editingName.trim()}
                              className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              title="Salvar"
                            >
                              {isEditingSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            </Button>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              onClick={handleCancelEdit}
                              disabled={isEditingSaving}
                              className="h-7 w-7 text-slate-500 hover:text-slate-600 hover:bg-slate-100"
                              title="Cancelar"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1.5">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleStartEdit(cat)}
                              className="h-7 w-7 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                              title="Editar"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDelete(cat)}
                              className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                              title="Excluir"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
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
      
      {selectedCat && (
        <DeleteConfirmationDialog
            open={isDeleteOpen}
            onOpenChange={setDeleteOpen}
            onConfirm={confirmDelete}
            itemName={selectedCat.name}
            itemType="Categoria"
        />
      )}
    </>
  );
}
