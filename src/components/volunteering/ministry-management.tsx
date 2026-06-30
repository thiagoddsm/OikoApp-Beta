'use client';
import React, { useState } from 'react';
import { useVolunteering } from '@/contexts/volunteering-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { useEventsData } from "@/hooks/useDomainData";
import { useToast } from '@/hooks/use-toast';
import { DeleteConfirmationDialog } from '@/components/structure/delete-confirmation-dialog';

export function MinistryManagement() {
  const { ministries } = useEventsData();
  const { addMinistry, updateMinistry, deleteMinistry, isLoading } = useVolunteering();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      if (editingId) {
        await updateMinistry(editingId, { name: name.trim(), color });
        toast({ title: 'Ministério atualizado', description: `O ministério "${name}" foi salvo com sucesso.` });
      } else {
        await addMinistry({ name: name.trim(), color });
        toast({ title: 'Ministério adicionado', description: `O ministério "${name}" foi cadastrado com sucesso.` });
      }
      setName('');
      setColor('#3B82F6');
      setEditingId(null);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao salvar ministério' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (min: any) => {
    setEditingId(min.id);
    setName(min.name);
    setColor(min.color || '#3B82F6');
  };

  const handleCancel = () => {
    setEditingId(null);
    setName('');
    setColor('#3B82F6');
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMinistry(deleteTarget.id);
      toast({ title: 'Ministério excluído', description: `O ministério "${deleteTarget.name}" foi removido.` });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao excluir' });
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Formulário */}
      <Card className="lg:col-span-1 border shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary">
            {editingId ? 'Editar Ministério' : 'Novo Ministério'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="min-name">Nome do Ministério</Label>
              <Input
                id="min-name"
                placeholder="Ex: Gleed, Homens, Mulheres..."
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="min-color">Cor da Badge (Estilo)</Label>
              <div className="flex gap-2">
                <Input
                  id="min-color"
                  type="color"
                  className="w-12 h-10 p-1 cursor-pointer shrink-0 rounded-lg"
                  value={color}
                  onChange={e => setColor(e.target.value)}
                />
                <Input
                  type="text"
                  placeholder="#000000"
                  className="font-mono text-xs uppercase"
                  value={color}
                  onChange={e => setColor(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" className="flex-1" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : editingId ? <Check className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                {editingId ? 'Salvar' : 'Adicionar'}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={handleCancel}>
                  <X className="size-4" />
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Lista */}
      <div className="lg:col-span-2 rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Cor</TableHead>
              <TableHead className="text-right w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ministries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground italic">
                  Nenhum ministério cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              ministries.map((min: any) => (
                <TableRow key={min.id}>
                  <TableCell className="font-bold text-slate-800">{min.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="size-4 rounded-full border shadow-sm" style={{ backgroundColor: min.color || '#3B82F6' }} />
                      <span className="font-mono text-xs text-muted-foreground uppercase">{min.color || '#3B82F6'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => handleEdit(min)}>
                      <Pencil className="size-4 text-muted-foreground hover:text-primary" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => setDeleteTarget(min)}>
                      <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {deleteTarget && (
        <DeleteConfirmationDialog
          open={!!deleteTarget}
          onOpenChange={open => !open && setDeleteTarget(null)}
          onConfirm={confirmDelete}
          itemName={deleteTarget.name}
          itemType="Ministério"
        />
      )}
    </div>
  );
}

// Wrapper Card imports
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
