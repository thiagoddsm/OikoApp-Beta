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
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, doc } from 'firebase/firestore';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CourseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingCourse?: any;
}

export function CourseFormDialog({ open, onOpenChange, existingCourse }: CourseFormDialogProps) {
  const { firestore, storage } = useFirebase();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ministryName, setMinistryName] = useState('');
  const [simultaneousClasses, setSimultaneousClasses] = useState(false);
  const [whatsappGroupPicture, setWhatsappGroupPicture] = useState('');
  const [billingMethod, setBillingMethod] = useState<'manual' | 'asaas'>('manual');
  const [isUploadingPic, setIsUploadingPic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(existingCourse?.name || '');
      setDescription(existingCourse?.description || '');
      setMinistryName(existingCourse?.ministryName || '');
      setSimultaneousClasses(existingCourse?.simultaneousClasses || false);
      setWhatsappGroupPicture(existingCourse?.whatsappGroupPicture || '');
      setBillingMethod(existingCourse?.billingMethod || 'manual');
    }
  }, [open, existingCourse]);

  const handleSave = async () => {
    if (!name.trim() || !ministryName.trim()) {
      toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Nome do curso e ministério são obrigatórios.' });
      return;
    }
    setIsSaving(true);
    const courseData = { 
      name, 
      description, 
      ministryName, 
      simultaneousClasses,
      whatsappGroupPicture,
      billingMethod
    };

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
          <div>
            <Label htmlFor="whatsappGroupPicture" className="text-sm font-bold">Imagem Padrão do Grupo do WhatsApp</Label>
            <div className="flex items-center gap-3 mt-1">
              <Input 
                id="whatsappGroupPicture" 
                type="file" 
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && storage) {
                    setIsUploadingPic(true);
                    const storageRef = ref(storage, `course-group-presets/${Date.now()}-${file.name}`);
                    const uploadTask = uploadBytesResumable(storageRef, file);
                    uploadTask.on('state_changed', null, (err) => {
                      console.error(err);
                      setIsUploadingPic(false);
                      toast({ variant: 'destructive', title: 'Erro de upload', description: 'Não foi possível carregar a imagem.' });
                    }, async () => {
                      const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                      setWhatsappGroupPicture(downloadURL);
                      setIsUploadingPic(false);
                      toast({ title: 'Imagem carregada!', description: 'Imagem padrão do grupo configurada.' });
                    });
                  }
                }}
                className="cursor-pointer"
              />
              {isUploadingPic && <Loader2 className="h-4 w-4 animate-spin text-emerald-600 shrink-0" />}
            </div>
            {whatsappGroupPicture && (
              <div className="mt-2 flex items-center gap-2">
                <img src={whatsappGroupPicture} alt="Preview" className="h-10 w-10 object-cover rounded-md border" />
                <span className="text-[10px] text-emerald-600 font-bold uppercase">✓ Imagem Vinculada ao Curso</span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-4 p-4 border rounded-lg bg-slate-50/50">
              <div className="space-y-0.5">
                  <Label className="text-sm font-bold flex items-center gap-2">
                      Turmas Simultâneas
                  </Label>
                  <p className="text-[10px] text-muted-foreground italic">
                    Permite que este curso tenha turmas rodando simultaneamente em dias diferentes e habilita a reposição cruzada de faltas.
                  </p>
              </div>
              <Switch 
                checked={simultaneousClasses} 
                onCheckedChange={setSimultaneousClasses} 
              />
          </div>
          <div className="space-y-2">
              <Label htmlFor="billingMethod">Método de Faturamento</Label>
              <Select value={billingMethod} onValueChange={(v: any) => setBillingMethod(v)}>
                  <SelectTrigger id="billingMethod" className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="manual">Manual (Pix / Caixa Interno)</SelectItem>
                      <SelectItem value="asaas">Automático (Asaas Integrado)</SelectItem>
                  </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground italic">
                Define se as faturas serão gerenciadas de forma manual pela secretaria ou integradas com o Asaas.
              </p>
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
