'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { FileText, Download, Folder, BookOpen, Layers, PlusCircle, ExternalLink, Video, Music, FileArchive } from 'lucide-react';

export interface TeachingMaterialItem {
  id: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileType: 'pdf' | 'video' | 'audio' | 'link' | 'archive';
  level: 'program' | 'course' | 'class' | 'lesson';
  levelName: string;
  createdAt: string;
}

interface HierarchicalMaterialsManagerProps {
  programName?: string;
  courseName?: string;
  className?: string;
  lessonName?: string;
  materials?: TeachingMaterialItem[];
  canManage?: boolean;
}

export function HierarchicalMaterialsManager({
  programName = 'Programa de Ensino',
  courseName = 'Curso Atual',
  className = 'Turma Ativa',
  lessonName = 'Aula Específica',
  materials = [],
  canManage = false
}: HierarchicalMaterialsManagerProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'program' | 'course' | 'class' | 'lesson'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMaterials = materials.filter(item => {
    const matchesTab = activeTab === 'all' || item.level === activeTab;
    const matchesQuery = !searchQuery || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesQuery;
  });

  const getIconForType = (type: TeachingMaterialItem['fileType']) => {
    switch (type) {
      case 'video': return <Video className="size-4 text-rose-500" />;
      case 'audio': return <Music className="size-4 text-purple-500" />;
      case 'archive': return <FileArchive className="size-4 text-amber-500" />;
      case 'link': return <ExternalLink className="size-4 text-blue-500" />;
      default: return <FileText className="size-4 text-indigo-500" />;
    }
  };

  const getBadgeForLevel = (level: TeachingMaterialItem['level']) => {
    switch (level) {
      case 'program': return <Badge className="bg-slate-800 text-white">Programa</Badge>;
      case 'course': return <Badge className="bg-indigo-600 text-white">Curso/Trilha</Badge>;
      case 'class': return <Badge className="bg-purple-600 text-white">Turma</Badge>;
      case 'lesson': return <Badge className="bg-emerald-600 text-white">Aula</Badge>;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg font-black flex items-center gap-2">
            <Folder className="size-5 text-indigo-600" />
            Materiais Didáticos & Apostilas
          </CardTitle>
          <CardDescription className="text-xs">
            Acervo hierárquico organizado por Programa, Curso, Turma e Aula.
          </CardDescription>
        </div>
        {canManage && (
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 font-bold gap-1 text-xs">
            <PlusCircle className="size-4" /> Anexar Material
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full sm:w-auto">
            <TabsList className="grid grid-cols-5 text-xs h-9">
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="program">Programa</TabsTrigger>
              <TabsTrigger value="course">Curso</TabsTrigger>
              <TabsTrigger value="class">Turma</TabsTrigger>
              <TabsTrigger value="lesson">Aula</TabsTrigger>
            </TabsList>
          </Tabs>

          <Input
            placeholder="Buscar apostila ou material..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="h-9 w-full sm:w-64 text-xs"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {filteredMaterials.map(mat => (
            <div key={mat.id} className="p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl flex items-start justify-between gap-3 transition-all hover:border-indigo-300">
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border shadow-sm shrink-0">
                  {getIconForType(mat.fileType)}
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs font-bold truncate text-slate-800 dark:text-slate-200">{mat.title}</h4>
                    {getBadgeForLevel(mat.level)}
                  </div>
                  {mat.description && (
                    <p className="text-[11px] text-muted-foreground line-clamp-1">{mat.description}</p>
                  )}
                  <span className="text-[10px] text-slate-400 block">{mat.levelName}</span>
                </div>
              </div>

              <Button size="sm" variant="outline" asChild className="shrink-0 h-8 text-xs font-bold">
                <a href={mat.fileUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="size-3.5 mr-1 text-indigo-600" /> Abrir
                </a>
              </Button>
            </div>
          ))}

          {filteredMaterials.length === 0 && (
            <div className="col-span-full py-8 text-center text-xs text-muted-foreground italic border border-dashed rounded-xl">
              Nenhum material didático cadastrado para este nível.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
