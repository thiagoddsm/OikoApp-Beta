
'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { useVolunteering } from '@/contexts/volunteering-context';
import { useFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Badge } from '@/components/ui/badge';
import { UserCheck, PlusCircle, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function CourseTeachersManager({ course }: { course: any }) {
  const { users, isLoading } = useVolunteering();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  
  // Estado local sincronizado com a prop do curso
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>(course.teacherIds || []);
  const [isSaving, setIsSaving] = useState(false);

  // Sincroniza o estado se o curso mudar (ex: após um save bem sucedido vindo do servidor)
  useEffect(() => {
    if (course.teacherIds) {
        setSelectedTeachers(course.teacherIds);
    }
  }, [course.teacherIds]);

  const availableTeachers = useMemo(() => {
      return users.filter(u => u.isTeacher);
  }, [users]);

  const courseTeachers = useMemo(() => {
      return availableTeachers.filter(u => selectedTeachers.includes(u.id));
  }, [availableTeachers, selectedTeachers]);

  const handleTeacherSelectionChange = (teacherId: string, checked: boolean) => {
    setSelectedTeachers((prev: string[]) => {
        if (checked) {
            return [...prev, teacherId];
        } else {
            return prev.filter(id => id !== teacherId);
        }
    });
  };
  
  const handleSave = async () => {
    if (!firestore) return;
    setIsSaving(true);
    const courseDocRef = doc(firestore, 'courses', course.id);
    
    try {
        await updateDocumentNonBlocking(courseDocRef, { teacherIds: selectedTeachers });
        toast({ title: 'Sucesso!', description: 'Corpo docente atualizado para este curso.' });
    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível salvar a lista de professores.' });
    } finally {
        setIsSaving(false);
    }
  };
  
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-4">
              <div>
                  <h3 className="text-lg font-bold">Habilitar Professores</h3>
                  <p className="text-sm text-muted-foreground">Selecione quais professores da base geral estão aptos a lecionar este curso específico.</p>
              </div>
              <Card className="bg-muted/30">
                  <CardContent className="p-4">
                    <ScrollArea className="h-[300px] w-full pr-4">
                        <div className="space-y-3">
                            {availableTeachers.map(teacher => (
                                <div key={teacher.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-background transition-colors">
                                    <Checkbox
                                        id={`teacher-${course.id}-${teacher.id}`}
                                        checked={selectedTeachers.includes(teacher.id)}
                                        onCheckedChange={(checked) => handleTeacherSelectionChange(teacher.id, !!checked)}
                                        disabled={isLoading || isSaving}
                                    />
                                    <Label htmlFor={`teacher-${course.id}-${teacher.id}`} className="flex-1 cursor-pointer flex items-center gap-2">
                                        <Avatar className="h-6 w-6">
                                            <AvatarFallback className="text-[10px]">{teacher.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm font-medium">{teacher.name}</span>
                                    </Label>
                                </div>
                            ))}
                            {availableTeachers.length === 0 && <p className="text-xs text-muted-foreground italic text-center py-4">Nenhum professor habilitado no sistema.</p>}
                        </div>
                    </ScrollArea>
                  </CardContent>
              </Card>
              <Button onClick={handleSave} disabled={isSaving} className="w-full">
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <UserCheck className="mr-2 h-4 w-4"/>}
                  Salvar Seleção
              </Button>
          </div>

          <div className="lg:col-span-2">
              <h3 className="text-lg font-bold mb-4">Corpo Docente Ativo</h3>
              <div className="rounded-lg border overflow-hidden">
                  <Table>
                      <TableHeader className="bg-muted/50">
                          <TableRow>
                              <TableHead>Professor</TableHead>
                              <TableHead>Especialidade</TableHead>
                              <TableHead className="text-right">Status</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {courseTeachers.length === 0 ? (
                              <TableRow>
                                  <TableCell colSpan={3} className="h-32 text-center text-muted-foreground italic">
                                      Nenhum professor vinculado a este curso ainda.
                                  </TableCell>
                              </TableRow>
                          ) : (
                              courseTeachers.map(teacher => {
                                  const avatar = PlaceHolderImages.find(p => p.id === 'avatar-2');
                                  return (
                                      <TableRow key={teacher.id}>
                                          <TableCell>
                                              <div className="flex items-center gap-3">
                                                  <Avatar className="h-9 w-9">
                                                      <AvatarImage src={avatar?.imageUrl} />
                                                      <AvatarFallback>{teacher.name.charAt(0)}</AvatarFallback>
                                                  </Avatar>
                                                  <div>
                                                      <p className="font-bold text-sm">{teacher.name}</p>
                                                      <p className="text-[10px] text-muted-foreground uppercase">{teacher.email || 'Sem e-mail'}</p>
                                                  </div>
                                              </div>
                                          </TableCell>
                                          <TableCell>
                                              <Badge variant="secondary" className="text-[10px] uppercase font-black">Titular</Badge>
                                          </TableCell>
                                          <TableCell className="text-right">
                                              <Badge className="bg-green-100 text-green-800 border-green-200">Disponível</Badge>
                                          </TableCell>
                                      </TableRow>
                                  )
                              })
                          )}
                      </TableBody>
                  </Table>
              </div>
          </div>
      </div>
    </div>
  );
}
