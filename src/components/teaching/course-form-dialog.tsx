'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, GraduationCap, Music2, BookOpen, Hand, HeartHandshake, PlayCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, doc } from 'firebase/firestore';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTeachingPrograms } from '@/hooks/useTeachingPrograms';
import { Badge } from '@/components/ui/badge';

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Music2, BookOpen, Hand, HeartHandshake, PlayCircle, GraduationCap,
};

interface CourseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingCourse?: any;
}

export function CourseFormDialog({ open, onOpenChange, existingCourse }: CourseFormDialogProps) {
  const { firestore, storage } = useFirebase();
  const { toast } = useToast();
  const { programs } = useTeachingPrograms();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [simultaneousClasses, setSimultaneousClasses] = useState(false);
  const [whatsappGroupPicture, setWhatsappGroupPicture] = useState('');
  const [billingMethod, setBillingMethod] = useState<'manual' | 'asaas'>('manual');
  const [isUploadingPic, setIsUploadingPic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Resolve the programId stored in the course back to a program entry
  const initialProgramId = useMemo(() => {
    if (!existingCourse || !programs.length) return '';
    // Try to match by programId, schoolId or ministryName against available programs
    return programs.find(p =>
      p.id === existingCourse.programId ||
      p.slug === existingCourse.schoolId ||
      p.name.toLowerCase() === (existingCourse.ministryName || '').toLowerCase() ||
      p.slug.toLowerCase() === (existingCourse.ministryName || '').toLowerCase()
    )?.id || '';
  }, [existingCourse, programs]);

  useEffect(() => {
    if (open) {
      setName(existingCourse?.name || '');
      setDescription(existingCourse?.description || '');
      setSelectedProgramId(initialProgramId);
      setSimultaneousClasses(existingCourse?.simultaneousClasses || false);
      setWhatsappGroupPicture(existingCourse?.whatsappGroupPicture || '');
      setBillingMethod(existingCourse?.billingMethod || 'manual');
    }
  }, [open, existingCourse, initialProgramId]);

  const selectedProgram = useMemo(
    () => programs.find(p => p.id === selectedProgramId) || null,
    [programs, selectedProgramId]
  );

  const handleSave = async () => {
    if (!name.trim() || !selectedProgramId) {
      toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Nome do curso e programa são obrigatórios.' });
      return;
    }
    setIsSaving(true);

    const courseData = {
      name,
      description,
      // Three fields for 100% matching compatibility across the system:
      ministryName: selectedProgram!.name,   // used by courses-management grouping
      programId: selectedProgram!.id,         // used by [programSlug]/page first check
      schoolId: selectedProgram!.slug,        // used by [programSlug]/page second check
      simultaneousClasses,
      whatsappGroupPicture,
      billingMethod,
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
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existingCourse ? 'Editar Curso' : 'Novo Curso'}</DialogTitle>
          <DialogDescription>
            Defina as informações do curso e vincule-o a um programa de ensino.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">

          {/* Program Select */}
          <div className="space-y-2">
            <Label htmlFor="program">Programa de Ensino</Label>
            <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
              <SelectTrigger id="program" className="h-10">
                <SelectValue placeholder="Selecione o programa..." />
              </SelectTrigger>
              <SelectContent>
                {programs.map(p => {
                  const Icon = ICON_MAP[p.icon] || GraduationCap;
                  return (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <span
                          className="flex h-5 w-5 items-center justify-center rounded-md text-white shrink-0"
                          style={{ backgroundColor: p.color || '#6366f1' }}
                        >
                          <Icon className="h-3 w-3" />
                        </span>
                        <span className="font-medium">{p.name}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {/* Capabilities preview of selected program */}
            {selectedProgram && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedProgram.capabilities?.map(cap => (
                  <Badge key={cap} variant="secondary" className="text-[10px] uppercase tracking-wide">
                    {cap === 'financial' ? '💰 Financeiro'
                      : cap === 'electronic_point' ? '📍 Ponto Eletrônico'
                      : cap === 'replacement_queue' ? '🔄 Reposições'
                      : cap === 'room_allocation' ? '🏫 Salas'
                      : cap === 'materials' ? '📚 Materiais'
                      : cap === 'certificates' ? '🎓 Certificados'
                      : cap === 'quizzes' ? '✅ Quizzes'
                      : cap === 'streaming' ? '▶️ Streaming'
                      : cap}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Course Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Curso</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Somos Um" />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Descreva o objetivo do curso..." />
          </div>

          {/* WhatsApp Group Picture */}
          <div className="space-y-2">
            <Label htmlFor="whatsappGroupPicture" className="text-sm font-bold">Imagem Padrão do Grupo do WhatsApp</Label>
            <div className="flex items-center gap-3">
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
              <div className="flex items-center gap-2 mt-1">
                <img src={whatsappGroupPicture} alt="Preview" className="h-10 w-10 object-cover rounded-md border" />
                <span className="text-[10px] text-emerald-600 font-bold uppercase">✓ Imagem Vinculada ao Curso</span>
              </div>
            )}
          </div>

          {/* Simultaneous Classes */}
          <div className="flex items-center justify-between gap-4 p-4 border rounded-lg bg-slate-50/50 dark:bg-slate-900/30">
            <div className="space-y-0.5">
              <Label className="text-sm font-bold">Turmas Simultâneas</Label>
              <p className="text-[10px] text-muted-foreground italic">
                Permite que este curso tenha turmas rodando simultaneamente em dias diferentes e habilita a reposição cruzada de faltas.
              </p>
            </div>
            <Switch checked={simultaneousClasses} onCheckedChange={setSimultaneousClasses} />
          </div>

          {/* Billing Method */}
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
          <Button onClick={handleSave} disabled={isSaving || !selectedProgramId}>
            {isSaving && <Loader2 className="mr-2 size-4 animate-spin"/>} Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
