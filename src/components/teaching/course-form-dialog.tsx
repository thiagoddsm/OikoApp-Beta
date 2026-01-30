'use client';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';

export function CourseFormDialog({ open, onOpenChange, existingCourse }) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ministryName, setMinistryName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(existingCourse?.name || '');
      setDescription(existingCourse?.description || '');
      setMinistryName(existingCourse?.ministryName || '');
    }
  }, [open, existingCourse]);

  const handleSave = async () => {
    if (!name.trim() || !ministryName.trim()) {
      toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Nome do curso e ministério são obrigatórios.' });
      return;
    }
    setIsSaving(true);
    const courseData = { name, description, ministryName };

    if (existingCourse) {
      const docRef = doc(firestore, 'courses', existingCourse.id);
      await updateDocumentNonBlocking(docRef, courseData);
      toast({ title: 'Curso atualizado!' });
    } else {
      const collectionRef = collection(firestore, 'courses');
      await addDocumentNonBlocking(collectionRef, courseData);
      toast({ title: 'Curso criado!' });
    }

    setIsSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existingCourse ? 'Editar Curso' : 'Novo Curso'}</DialogTitle>
          <DialogDescription>
            Defina as informações do curso.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="ministryName">Ministério</Label>
            <Input id="ministryName" value={ministryName} onChange={e => setMinistryName(e.target.value)} placeholder="Ex: IBM College" />
          </div>
          <div>
            <Label htmlFor="name">Nome do Curso</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 size-4 animate-spin"/>} Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
