'use client';

import React, { useState, useMemo } from 'react';
import { useCollection, useMemoFirebase, useFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { 
  CheckSquare, Search, Filter, Loader2, CheckCircle2, Clock, 
  MessageCircle, ExternalLink, User, AlertCircle, Sparkles, Waves, 
  Users, GraduationCap, HandHelping, MessageSquare, Eye, Info, Phone, Mail, MapPin, Heart
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
  personEmail?: string;
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
  const [selectedTask, setSelectedTask] = useState<PastoralTask | null>(null);

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
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: e.message || "Falha ao alterar status da tarefa.",
      });
    }
  };

  const parseTaskDetails = (desc: string) => {
    if (!desc) return { text: '', json: {} };
    try {
      const jsonMatch = desc.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const cleanedText = desc.replace(jsonMatch[0], '').trim();
        return { text: cleanedText, json: parsed };
      }
    } catch (e) {
      // Ignora erro
    }
    return { text: desc, json: {} };
  };

  const formatTaskDescription = (desc: string) => {
    const { text, json } = parseTaskDetails(desc);
    const parts: string[] = [];
    if (text) parts.push(text);
    if (json.observacoes) parts.push(`Observação: "${json.observacoes}"`);
    if (json.comoConheceu) parts.push(`Como conheceu: ${json.comoConheceu}`);
    if (json.atendimentoDesejado) parts.push(`Atendimento: ${json.atendimentoDesejado}`);
    return parts.length > 0 ? parts.join('\n') : desc;
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <Badge className="bg-purple-100 text-purple-700 border-purple-200 mb-2 font-bold">
            <CheckSquare className="size-3 mr-1" /> GESTÃO DE TAREFAS PASTORAIS
          </Badge>
          <h1 className="text-2xl md:text-3xl font-black uppercase italic tracking-tight text-slate-900">
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
              <Card 
                key={task.id} 
                className="border border-slate-200 shadow-sm bg-white hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between group cursor-pointer"
                onClick={() => setSelectedTask(task)}
              >
                <CardHeader className="p-5 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl border ${badgeStyle} shrink-0 group-hover:scale-105 transition-transform`}>
                        <Icon className="size-5" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-black uppercase tracking-tight text-slate-900 leading-tight group-hover:text-primary transition-colors flex items-center gap-1.5">
                          {task.personName}
                          <Eye className="size-3.5 opacity-0 group-hover:opacity-100 text-primary transition-opacity" />
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

                <CardContent className="p-5 pt-0 space-y-4 flex-1 flex flex-col justify-between" onClick={(e) => e.stopPropagation()}>
                  <div className="space-y-2 cursor-pointer" onClick={() => setSelectedTask(task)}>
                    <p className="text-xs text-slate-600 font-medium whitespace-pre-wrap line-clamp-3 bg-slate-50 p-3 rounded-xl border border-slate-100 hover:bg-slate-100/60 transition-colors">
                      {formatTaskDescription(task.description)}
                    </p>

                    {task.createdAt && (
                      <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                        <Clock className="size-3" /> 
                        Criado {task.createdAt?.toDate ? formatDistanceToNow(task.createdAt.toDate(), { addSuffix: true, locale: ptBR }) : 'recentemente'}
                      </p>
                    )}
                  </div>

                  {/* Ações Rápidas */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="grid grid-cols-3 gap-1.5">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => setSelectedTask(task)}
                        className="text-xs font-bold h-9 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50"
                        title="Ver Detalhes Completos"
                      >
                        <Eye className="size-3.5 mr-1" /> Detalhes
                      </Button>

                      {cleanPhone ? (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => window.open(`https://wa.me/55${cleanPhone}`, '_blank')}
                          className="text-xs font-bold h-9 rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                          title="Abrir WhatsApp"
                        >
                          <MessageCircle className="size-3.5 mr-1 text-emerald-600" /> Whats
                        </Button>
                      ) : <div />}

                      <Link href={`/dashboard/people/${task.personId}`} className="w-full">
                        <Button size="sm" variant="outline" className="w-full text-xs font-bold h-9 rounded-xl">
                          <User className="size-3.5 mr-1" /> Ficha
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
                          className="w-full text-xs font-bold h-9 rounded-xl bg-purple-600 hover:bg-purple-700 text-white"
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

      {/* MODAL DE DETALHES COMPLETOS DO CARD / SOLICITAÇÃO */}
      {selectedTask && (
        <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
          <DialogContent className="sm:max-w-lg rounded-3xl p-6 bg-white space-y-4 max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl border ${CATEGORY_COLORS[selectedTask.category] || 'bg-slate-100'}`}>
                    {React.createElement(CATEGORY_ICONS[selectedTask.category] || Sparkles, { className: "size-6" })}
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-black uppercase italic tracking-tight text-slate-900">
                      {selectedTask.personName}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500 font-bold uppercase">
                      Solicitação: {selectedTask.category}
                    </DialogDescription>
                  </div>
                </div>
                <Badge 
                  variant={selectedTask.status === 'CONCLUIDA' ? 'default' : selectedTask.status === 'EM_ANDAMENTO' ? 'secondary' : 'outline'}
                  className="text-[10px] font-bold uppercase px-3 py-1 rounded-full"
                >
                  {selectedTask.status === 'CONCLUIDA' ? 'Concluída' : selectedTask.status === 'EM_ANDAMENTO' ? 'Em Andamento' : 'Pendente'}
                </Badge>
              </div>
            </DialogHeader>

            <div className="space-y-4 pt-1">
              {/* Informações de Contato */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                {selectedTask.personPhone && (
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <Phone className="size-4 text-emerald-600 shrink-0" />
                    <span>{selectedTask.personPhone}</span>
                  </div>
                )}
                {selectedTask.personEmail && (
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 truncate">
                    <Mail className="size-4 text-slate-500 shrink-0" />
                    <span className="truncate">{selectedTask.personEmail}</span>
                  </div>
                )}
                {selectedTask.createdAt && (
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500 col-span-full">
                    <Clock className="size-4 text-slate-400 shrink-0" />
                    <span>
                      Recebido em {selectedTask.createdAt?.toDate ? format(selectedTask.createdAt.toDate(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'Data recente'}
                    </span>
                  </div>
                )}
              </div>

              {/* Detalhes Extraídos do Formulário */}
              {(() => {
                const { text, json } = parseTaskDetails(selectedTask.description);

                return (
                  <div className="space-y-3">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-400">Conteúdo do Pedido</p>

                    {text && (
                      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs text-slate-800 font-medium leading-relaxed">
                        {text}
                      </div>
                    )}

                    {json.observacoes && (
                      <div className="bg-purple-50/70 p-3.5 rounded-2xl border border-purple-100 space-y-1">
                        <p className="text-[10px] font-black uppercase text-purple-700">Mensagem / Observação da Pessoa:</p>
                        <p className="text-xs text-slate-900 font-medium italic">"{json.observacoes}"</p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {json.atendimentoDesejado && (
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Atendimento</span>
                          <span className="font-bold text-slate-800">{json.atendimentoDesejado}</span>
                        </div>
                      )}

                      {json.comoConheceu && (
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Como Conheceu</span>
                          <span className="font-bold text-slate-800">{json.comoConheceu}</span>
                        </div>
                      )}

                      {json.estadoCivil && (
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2">
                          <Heart className="size-4 text-pink-500 shrink-0" />
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Estado Civil</span>
                            <span className="font-bold text-slate-800">{json.estadoCivil.toUpperCase()} {json.conjuge ? `(Cônjuge: ${json.conjuge})` : ''}</span>
                          </div>
                        </div>
                      )}

                      {json.bairro && (
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2">
                          <MapPin className="size-4 text-amber-500 shrink-0" />
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Bairro / Cidade</span>
                            <span className="font-bold text-slate-800">{json.bairro} {json.cidade ? `- ${json.cidade}` : ''}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Ações Principais no Rodapé do Modal */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
                {selectedTask.personPhone && (
                  <Button 
                    onClick={() => window.open(`https://wa.me/55${selectedTask.personPhone?.replace(/\D/g, '')}`, '_blank')}
                    className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm"
                  >
                    <MessageCircle className="size-4 mr-2" /> Abrir no WhatsApp
                  </Button>
                )}

                <Link href={`/dashboard/people/${selectedTask.personId}`} className="w-full">
                  <Button variant="outline" className="w-full h-11 rounded-xl text-xs font-bold">
                    <User className="size-4 mr-2" /> Abrir Ficha Completa
                  </Button>
                </Link>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
