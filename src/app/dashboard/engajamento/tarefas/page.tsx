'use client';

import React, { useState, useMemo } from 'react';
import { useCollection, useMemoFirebase, useFirebase } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CheckSquare, Search, Filter, Loader2, CheckCircle2, Clock, 
  MessageCircle, ExternalLink, User, AlertCircle, Sparkles, Waves, 
  Users, GraduationCap, HandHelping, MessageSquare 
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

interface PastoralTask {
  id: string;
  personId: string;
  personName: string;
  personPhone?: string;
  solicitacaoId?: string;
  title: string;
  description: string;
  category: string;
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDA';
  priority: string;
  dueDate: any;
  createdAt: any;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  GC: Users,
  BATISMO: Waves,
  MEMBRESIA: GraduationCap,
  VOLUNTARIADO: HandHelping,
  ACONSELHAMENTO: MessageSquare,
  VISITANDO: Sparkles,
};

const CATEGORY_COLORS: Record<string, string> = {
  GC: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  BATISMO: 'bg-blue-100 text-blue-700 border-blue-200',
  MEMBRESIA: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  VOLUNTARIADO: 'bg-purple-100 text-purple-700 border-purple-200',
  ACONSELHAMENTO: 'bg-rose-100 text-rose-700 border-rose-200',
  VISITANDO: 'bg-amber-100 text-amber-700 border-amber-200',
};

export default function TarefasPastoraisPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const tasksQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'pastoral_tasks'));
  }, [firestore]);

  const { data: rawTasks, isLoading } = useCollection<PastoralTask>(tasksQuery);

  const filteredTasks = useMemo(() => {
    if (!rawTasks) return [];
    
    return rawTasks.filter(t => {
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (categoryFilter !== 'ALL' && t.category !== categoryFilter) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const nameMatch = (t.personName || '').toLowerCase().includes(term);
        const titleMatch = (t.title || '').toLowerCase().includes(term);
        return nameMatch || titleMatch;
      }
      return true;
    }).sort((a, b) => {
      const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
      const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
      return timeB - timeA;
    });
  }, [rawTasks, statusFilter, categoryFilter, searchTerm]);

  const handleUpdateStatus = async (taskId: string, newStatus: 'EM_ANDAMENTO' | 'CONCLUIDA') => {
    if (!firestore) return;
    try {
      const ref = doc(firestore, 'pastoral_tasks', taskId);
      await updateDoc(ref, {
        status: newStatus,
        updatedAt: new Date(),
      });
      toast({
        title: "Status Atualizado",
        description: `Tarefa alterada para "${newStatus === 'CONCLUIDA' ? 'Concluída' : 'Em Andamento'}".`,
      });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: e.message || "Falha ao alterar status da tarefa.",
      });
    }
  };

  const formatTaskDescription = (desc: string) => {
    if (!desc) return '';
    try {
      const jsonMatch = desc.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        let cleanedText = desc.replace(jsonMatch[0], '').trim();
        const parts: string[] = [];
        if (cleanedText) parts.push(cleanedText);
        if (parsed.observacoes) parts.push(`Observação: "${parsed.observacoes}"`);
        if (parsed.comoConheceu) parts.push(`Como conheceu: ${parsed.comoConheceu}`);
        if (parsed.atendimentoDesejado) parts.push(`Tipo de Atendimento: ${parsed.atendimentoDesejado}`);
        return parts.join('\n');
      }
    } catch (e) {
      // Ignora erro de sintaxe e mantém texto original
    }
    return desc;
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            <CheckSquare className="size-4" /> Gestão de Tarefas Pastorais
          </div>
          <h1 className="text-3xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">
            Fila de Acompanhamento
          </h1>
          <p className="text-slate-600 text-sm font-medium mt-1">
            Tarefas geradas automaticamente pelas solicitações enviadas no Portal /conectar.
          </p>
        </div>
      </div>

      {/* Filtros e Busca */}
      <Card className="border border-slate-200 shadow-sm bg-white">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              placeholder="Buscar por nome da pessoa..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 bg-white border-slate-200 h-10 text-xs text-slate-900"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-white border-slate-200 h-10 text-xs text-slate-900">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os Status</SelectItem>
              <SelectItem value="PENDENTE">Pendentes</SelectItem>
              <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
              <SelectItem value="CONCLUIDA">Concluídas</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="bg-white border-slate-200 h-10 text-xs text-slate-900">
              <SelectValue placeholder="Categoria de Solicitação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas as Categorias</SelectItem>
              <SelectItem value="GC">GC / Célula</SelectItem>
              <SelectItem value="BATISMO">Batismo</SelectItem>
              <SelectItem value="MEMBRESIA">Membresia</SelectItem>
              <SelectItem value="VOLUNTARIADO">Voluntariado</SelectItem>
              <SelectItem value="ACONSELHAMENTO">Aconselhamento</SelectItem>
              <SelectItem value="VISITANDO">Visitante</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Lista de Tarefas */}
      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="animate-spin size-8 text-primary" />
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed rounded-3xl bg-white space-y-3">
          <CheckSquare className="size-10 mx-auto text-slate-300" />
          <h3 className="text-lg font-black uppercase text-slate-800">Nenhuma Tarefa Encontrada</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Novas solicitações no portal `/conectar` criarão automaticamente tarefas de atendimento nesta fila.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map(task => {
            const Icon = CATEGORY_ICONS[task.category] || Sparkles;
            const badgeStyle = CATEGORY_COLORS[task.category] || 'bg-slate-100 text-slate-700 border-slate-200';
            const cleanPhone = (task.personPhone || '').replace(/\D/g, '');

            return (
              <Card key={task.id} className="border border-slate-200 shadow-sm bg-white hover:shadow-md transition-shadow flex flex-col justify-between">
                <CardHeader className="p-5 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl border ${badgeStyle} shrink-0`}>
                        <Icon className="size-5" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-black uppercase tracking-tight text-slate-900 leading-tight">
                          {task.personName}
                        </CardTitle>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                          {task.category}
                        </p>
                      </div>
                    </div>

                    <Badge 
                      variant={task.status === 'CONCLUIDA' ? 'default' : task.status === 'EM_ANDAMENTO' ? 'secondary' : 'outline'}
                      className="text-[9px] font-bold uppercase shrink-0"
                    >
                      {task.status === 'CONCLUIDA' ? 'Concluída' : task.status === 'EM_ANDAMENTO' ? 'Em Andamento' : 'Pendente'}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-5 pt-0 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <p className="text-xs text-slate-600 font-medium whitespace-pre-wrap line-clamp-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {formatTaskDescription(task.description)}
                    </p>

                    {task.createdAt && (
                      <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                        <Clock className="size-3" /> 
                        Criado {task.createdAt?.toDate ? formatDistanceToNow(task.createdAt.toDate(), { addSuffix: true, locale: ptBR }) : 'recentemente'}
                      </p>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex gap-2">
                      {cleanPhone && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => window.open(`https://wa.me/55${cleanPhone}`, '_blank')}
                          className="w-full text-xs font-bold h-9 rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        >
                          <MessageCircle className="size-3.5 mr-1.5 text-emerald-600" /> WhatsApp
                        </Button>
                      )}

                      <Link href={`/dashboard/people/${task.personId}`} className="w-full">
                        <Button size="sm" variant="outline" className="w-full text-xs font-bold h-9 rounded-xl">
                          <User className="size-3.5 mr-1.5" /> Ficha
                        </Button>
                      </Link>
                    </div>

                    {task.status !== 'CONCLUIDA' && (
                      <div className="flex gap-2">
                        {task.status === 'PENDENTE' && (
                          <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={() => handleUpdateStatus(task.id, 'EM_ANDAMENTO')}
                            className="w-full text-xs font-bold h-9 rounded-xl"
                          >
                            Iniciar Acompanhamento
                          </Button>
                        )}

                        <Button 
                          size="sm" 
                          onClick={() => handleUpdateStatus(task.id, 'CONCLUIDA')}
                          className="w-full text-xs font-bold h-9 rounded-xl text-white"
                        >
                          <CheckCircle2 className="size-3.5 mr-1.5" /> Concluir
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

    </div>
  );
}
