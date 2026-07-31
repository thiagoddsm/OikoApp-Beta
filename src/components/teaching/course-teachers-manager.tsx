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
import { Badge } from '@/components/ui/badge';
import { UserCheck, PlusCircle, Loader2, ShieldAlert, GraduationCap, HandHelping, Save } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useMembersData } from "@/hooks/useDomainData";

export function CourseTeachersManager({ course }: { course: any }) {
  const { users } = useMembersData();
  const { isLoading } = useVolunteering();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  
  // Estado local para professores e equipe de apoio/secretários
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>(course.teacherIds || []);
  const [selectedSupportTeam, setSelectedSupportTeam] = useState<string[]>(course.supportTeamIds || course.supportTeam || []);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (course.teacherIds) {
      setSelectedTeachers(course.teacherIds);
    }
    if (course.supportTeamIds || course.supportTeam) {
      setSelectedSupportTeam(course.supportTeamIds || course.supportTeam || []);
    }
  }, [course.teacherIds, course.supportTeamIds, course.supportTeam]);

  // Professores disponíveis (usuários com flag isTeacher ou todos os membros cadastrados)
  const availableTeachers = useMemo(() => {
    const teacherUsers = users.filter(u => u.isTeacher || u.role === 'teacher' || u.roles?.includes('teacher'));
    return teacherUsers.length > 0 ? teacherUsers : users;
  }, [users]);

  // Equipe de apoio / Secretários (todos os membros disponíveis)
  const availableSupportUsers = useMemo(() => {
    return users;
  }, [users]);

  const courseTeachers = useMemo(() => {
    return users.filter(u => selectedTeachers.includes(u.id));
  }, [users, selectedTeachers]);

  const courseSupportTeam = useMemo(() => {
    return users.filter(u => selectedSupportTeam.includes(u.id));
  }, [users, selectedSupportTeam]);

  const handleTeacherSelectionChange = (teacherId: string, checked: boolean) => {
    setSelectedTeachers((prev: string[]) => {
      if (checked) return [...prev, teacherId];
      return prev.filter(id => id !== teacherId);
    });
  };

  const handleSupportSelectionChange = (userId: string, checked: boolean) => {
    setSelectedSupportTeam((prev: string[]) => {
      if (checked) return [...prev, userId];
      return prev.filter(id => id !== userId);
    });
  };
  
  const handleSave = async () => {
    if (!firestore) return;
    setIsSaving(true);
    const courseDocRef = doc(firestore, 'courses', course.id);
    
    try {
      await updateDocumentNonBlocking(courseDocRef, { 
        teacherIds: selectedTeachers,
        supportTeamIds: selectedSupportTeam,
        supportTeam: selectedSupportTeam,
      });
      toast({ title: 'Sucesso!', description: 'Professores e Equipe de Apoio do curso salvos com sucesso.' });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível salvar a equipe do curso.' });
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-lg font-black uppercase italic tracking-tight text-slate-900 flex items-center gap-2">
            <GraduationCap className="size-5 text-purple-600" /> Corpo Docente & Secretária do Curso
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Gerencie os professores habilitados e a equipe de apoio/secretários responsáveis pelas turmas.
          </p>
        </div>

        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm h-10 px-5"
        >
          {isSaving ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <Save className="size-4 mr-1.5" />}
          Salvar Equipe do Curso
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Painel 1: Seleção de Professores */}
        <Card className="border border-slate-200 shadow-sm bg-white rounded-2xl">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black uppercase text-slate-900 flex items-center gap-1.5">
                  <GraduationCap className="size-4 text-purple-600" /> Professores do Curso
                </h4>
                <p className="text-[11px] text-slate-500">Selecione quem pode ministrar este curso.</p>
              </div>
              <Badge className="bg-purple-100 text-purple-800 font-bold text-xs">
                {selectedTeachers.length} Selecionados
              </Badge>
            </div>

            <ScrollArea className="h-[250px] w-full pr-3 border border-slate-100 rounded-xl p-2 bg-slate-50/50">
              <div className="space-y-2">
                {availableTeachers.map(teacher => (
                  <div key={teacher.id} className="flex items-center space-x-3 p-2 rounded-xl bg-white border border-slate-100 hover:border-slate-200 transition-colors">
                    <Checkbox
                      id={`teacher-${course.id}-${teacher.id}`}
                      checked={selectedTeachers.includes(teacher.id)}
                      onCheckedChange={(checked) => handleTeacherSelectionChange(teacher.id, !!checked)}
                      disabled={isLoading || isSaving}
                    />
                    <Label htmlFor={`teacher-${course.id}-${teacher.id}`} className="flex-1 cursor-pointer flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[10px] font-bold bg-purple-100 text-purple-800">{teacher.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-bold text-slate-800">{teacher.name}</span>
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Painel 2: Seleção de Equipe de Apoio / Secretários do Curso */}
        <Card className="border border-slate-200 shadow-sm bg-white rounded-2xl">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black uppercase text-slate-900 flex items-center gap-1.5">
                  <HandHelping className="size-4 text-emerald-600" /> Secretários & Equipe de Apoio
                </h4>
                <p className="text-[11px] text-slate-500">Voluntários e secretários que dão suporte operacional.</p>
              </div>
              <Badge className="bg-emerald-100 text-emerald-800 font-bold text-xs">
                {selectedSupportTeam.length} Selecionados
              </Badge>
            </div>

            <ScrollArea className="h-[250px] w-full pr-3 border border-slate-100 rounded-xl p-2 bg-slate-50/50">
              <div className="space-y-2">
                {availableSupportUsers.map(support => (
                  <div key={support.id} className="flex items-center space-x-3 p-2 rounded-xl bg-white border border-slate-100 hover:border-slate-200 transition-colors">
                    <Checkbox
                      id={`support-${course.id}-${support.id}`}
                      checked={selectedSupportTeam.includes(support.id)}
                      onCheckedChange={(checked) => handleSupportSelectionChange(support.id, !!checked)}
                      disabled={isLoading || isSaving}
                    />
                    <Label htmlFor={`support-${course.id}-${support.id}`} className="flex-1 cursor-pointer flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[10px] font-bold bg-emerald-100 text-emerald-800">{support.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-bold text-slate-800">{support.name}</span>
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Resumo da Equipe Ativa no Curso */}
      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">Resumo da Equipe Vinculada ao Curso</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-purple-700 uppercase">Professores Cadastrados ({courseTeachers.length}):</p>
            {courseTeachers.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Nenhum professor selecionado.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {courseTeachers.map(t => (
                  <Badge key={t.id} className="bg-purple-100 text-purple-900 border-purple-200 font-bold text-[11px] px-2.5 py-1">
                    {t.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-bold text-emerald-700 uppercase">Secretários & Apoio ({courseSupportTeam.length}):</p>
            {courseSupportTeam.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Nenhum secretário de apoio selecionado.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {courseSupportTeam.map(s => (
                  <Badge key={s.id} className="bg-emerald-100 text-emerald-900 border-emerald-200 font-bold text-[11px] px-2.5 py-1">
                    {s.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
