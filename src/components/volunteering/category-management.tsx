'use client';
import React, { useState } from 'react';
import { useVolunteering, type ReservationCategory } from '@/contexts/volunteering-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, PlusCircle, Trash2, Tag } from 'lucide-react';
import { DeleteConfirmationDialog } from '@/components/structure/delete-confirmation-dialog';

export function CategoryManagement() {
  const { reservationCategories, isLoading, addReservationCategory, deleteReservationCategory } = useVolunteering();
  const [newCatName, setNewCatName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const [selectedCat, setSelectedCat] = useState<ReservationCategory | null>(null);

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    setIsSaving(true);
    await addReservationCategory({ name: newCatName });
    setNewCatName('');
    setIsSaving(false);
  };

  const handleDelete = (cat: ReservationCategory) => {
    setSelectedCat(cat);
    setDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (selectedCat) {
      deleteReservationCategory(selectedCat.id);
      setDeleteOpen(false);
      setSelectedCat(null);
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
                <TableHead className="text-right w-[100px]">Ações</TableHead>
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
                reservationCategories.map((cat) => (
                  <TableRow key={cat.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-semibold text-slate-700">{cat.name}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(cat)} className="hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
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
