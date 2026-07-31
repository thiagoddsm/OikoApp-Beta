'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useCollection, updateDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { collectionGroup, query, where, doc, updateDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Loader2, Search, Filter, RefreshCw, Users, Waves, 
  GraduationCap, HandHelping, MessageSquare, Sparkles, CheckCircle2, 
  ArrowRight, UserCheck, Calendar, ExternalLink, FileText, ChevronDown, ChevronUp 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMembersData } from '@/hooks/useDomainData';

type ProcessType = 'TODOS' | 'GC' | 'BATISMO' | 'VOLUNTARIADO' | 'MEMBRESIA' | 'ACONSELHAMENTO' | 'GERAL';

const PROCESS_TYPE_LABELS: Record<ProcessType, { label: string; icon: React.ElementType; color: string }> = {
  TODOS: { label: 'Todos os Processos', icon: Filter, color: 'bg-slate-100 text-slate-700 border-slate-200' },
  GC: { label: 'Células / GC', icon: Users, color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  BATISMO: { label: 'Batismo nas Águas', icon: Waves, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  VOLUNTARIADO: { label: 'Voluntariado / Serviço', icon: HandHelping, color: 'bg-purple-100 text-purple-700 border-purple-200' },
  MEMBRESIA: { label: 'Curso de Membresia', icon: GraduationCap, color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  ACONSELHAMENTO: { label: 'Aconselhamento', icon: MessageSquare, color: 'bg-rose-100 text-rose-700 border-rose-200' },
  GERAL: { label: 'Acolhimento Geral', icon: Sparkles, color: 'bg-amber-100 text-amber-700 border-amber-200' },
};

export default function GestaoProcessosPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const { users } = useMembersData();

  const [selectedType, setSelectedType] = useState<ProcessType>('TODOS');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'COMPLETED' | 'ALL'>('ACTIVE');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedProcId, setExpandedProcId] = useState<string | null>(null);

  // Busca todos os processos da subcoleção "processos" no Firestore
  const processesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collectionGroup(firestore, 'processos'));
  }, [firestore]);

  const { data: rawProcesses, isLoading } = useCollection<any>(processesQuery);

  // Mapa de usuários para lookup rápido de Nome/Telefone por personId
  const usersMap = useMemo(() => {
    const map = new Map<string, any>();
    if (users) {
      users.forEach(u => map.set(u.id, u));
    }
    return map;
  }, [users]);

  // Filtragem dos processos
  const filteredProcesses = useMemo(() => {
    if (!rawProcesses) return [];
    return rawProcesses.filter(proc => {
      // Filtro por Tipo
      if (selectedType !== 'TODOS' && proc.processType !== selectedType) {
        return false;
      }
      // Filtro por Status
      if (statusFilter !== 'ALL' && proc.status !== statusFilter) {
        return false;
      }
      // Filtro por Nome da Pessoa
      if (searchTerm.trim()) {
        const person = usersMap.get(proc.personId);
        const personName = (person?.name || '').toLowerCase();
        const procTitle = (proc.title || '').toLowerCase();
        const search = searchTerm.toLowerCase();
        if (!personName.includes(search) && !procTitle.includes(search)) {
          return false;
        }
      }
      return true;
    });
  }, [rawProcesses, selectedType, statusFilter, searchTerm, usersMap]);

  // Ação de avançar etapa ou concluir processo
  const handleUpdateStage = async (personId: string, processId: string, nextStage: string, isFinal = false) => {
    if (!firestore || !personId || !processId) return;
    try {
      const procRef = doc(firestore, 'users', personId, 'processos', processId);
      await updateDoc(procRef, {
        currentStage: nextStage,
        status: isFinal ? 'COMPLETED' : 'ACTIVE',
        updatedAt: new Date(),
      });
      toast({
        title: "Processo Atualizado!",
        description: `Etapa alterada para "${nextStage}".`,
      });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: e.message || "Não foi possível atualizar o processo.",
      });
    }
  };

  const toggleExpand = (procId: string) => {
    setExpandedProcId(prev => prev === procId ? null : procId);
  };

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-6">
      
      {/* Header da Página */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            <RefreshCw className="size-3.5" /> Gestão de Engajamento
          </div>
          <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-tight text-slate-900 leading-none">
            Fila de Processos Ativos
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Acompanhe e movimente o progresso das pessoas nas trilhas ministeriais iniciadas pelo Portal de Conexão.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
            <Input
              placeholder="Buscar por nome..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 h-10 rounded-xl text-xs font-medium border-slate-200"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="h-10 px-3 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-700 cursor-pointer focus:outline-none"
          >
            <option value="ACTIVE">Processos Ativos</option>
            <option value="COMPLETED">Concluídos</option>
            <option value="ALL">Todos os Status</option>
          </select>
        </div>
      </div>

      {/* Tabs / Seletor de Tipo de Processo */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {(Object.keys(PROCESS_TYPE_LABELS) as ProcessType[]).map((typeKey) => {
          const config = PROCESS_TYPE_LABELS[typeKey];
          const Icon = config.icon;
          const isSelected = selectedType === typeKey;

          return (
            <button
              key={typeKey}
              onClick={() => setSelectedType(typeKey)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap border ${
                isSelected 
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icon className="size-4" />
              <span>{config.label}</span>
              {isSelected && (
                <Badge variant="secondary" className="ml-1 text-[10px] h-5 px-1.5 bg-white/20 text-white font-bold border-none">
                  {filteredProcesses.length}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Lista de Cards de Processos */}
      {filteredProcesses.length === 0 ? (
        <Card className="border-2 border-dashed rounded-3xl bg-slate-50/50 p-12 text-center space-y-3">
          <RefreshCw className="size-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">Nenhum processo encontrado</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Não há processos ativos correspondentes aos filtros selecionados neste momento.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProcesses.map((proc) => {
            const person = usersMap.get(proc.personId);
            const personName = person?.name || 'Pessoa não identificada';
            const personPhone = person?.phone || 'Sem contato';
            const typeConfig = PROCESS_TYPE_LABELS[proc.processType as ProcessType] || PROCESS_TYPE_LABELS.GERAL;
            const Icon = typeConfig.icon;
            const isExpanded = expandedProcId === proc.id;
            const details = proc.details || {};
            const hasDetails = Object.keys(details).length > 0;

            return (
              <Card key={proc.id} className="border border-slate-200 rounded-2xl shadow-sm bg-white hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <CardHeader className="p-4 pb-3 border-b flex flex-row items-center justify-between bg-slate-50/50 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-10 ring-2 ring-slate-100">
                        <AvatarFallback className="font-black text-sm bg-primary/10 text-primary">
                          {personName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <Link 
                          href={`/dashboard/people/${proc.personId}`}
                          className="font-bold text-sm text-slate-900 hover:text-primary transition-colors flex items-center gap-1.5 group"
                        >
                          <span className="truncate max-w-[160px]">{personName}</span>
                          <ExternalLink className="size-3 text-slate-400 group-hover:text-primary shrink-0" />
                        </Link>
                        <p className="text-[11px] text-slate-500 font-medium">{personPhone}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-[10px] font-bold uppercase ${typeConfig.color}`}>
                      <Icon className="size-3 mr-1" />
                      {proc.processType}
                    </Badge>
                  </CardHeader>

                  <CardContent className="p-4 space-y-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Título do Processo</p>
                      <p className="text-sm font-black text-slate-900 leading-tight mt-0.5">{proc.title}</p>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium">Etapa Atual:</span>
                      <span className="font-black text-slate-900 uppercase tracking-tight">{proc.currentStage}</span>
                    </div>

                    {/* Botão para Ver Observações e Respostas */}
                    <Button 
                      type="button"
                      variant="ghost" 
                      size="sm" 
                      onClick={() => toggleExpand(proc.id)}
                      className="w-full text-xs font-bold text-slate-600 hover:text-slate-900 justify-between h-8 px-2 bg-slate-50/50 rounded-lg border border-slate-100"
                    >
                      <span className="flex items-center gap-1.5">
                        <FileText className="size-3.5 text-slate-400" />
                        Ver Observações e Respostas
                      </span>
                      {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                    </Button>

                    {/* Painel Expansível */}
                    {isExpanded && (
                      <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 text-xs space-y-2 animate-in fade-in duration-200">
                        <p className="font-bold text-amber-900 uppercase text-[10px] border-b border-amber-200 pb-1">
                          Respostas Enviadas pela Pessoa:
                        </p>

                        {details.observacoes && (
                          <div>
                            <span className="font-bold text-amber-800">Mensagem / Observação:</span>
                            <p className="text-slate-700 mt-0.5 whitespace-pre-wrap">{details.observacoes}</p>
                          </div>
                        )}

                        {details.comoConheceu && (
                          <div>
                            <span className="font-bold text-amber-800">Como conheceu:</span>
                            <p className="text-slate-700">{details.comoConheceu}</p>
                          </div>
                        )}

                        {!hasDetails && !details.observacoes && (
                          <p className="text-amber-800 italic">
                            Solicitação iniciada pelo Portal de Conexão. Sem mensagens adicionais gravadas.
                          </p>
                        )}
                      </div>
                    )}

                  </CardContent>
                </div>

                {/* Footer de Ações do Processo */}
                <div className="p-4 pt-0 space-y-2">
                  {proc.status === 'ACTIVE' ? (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateStage(proc.personId, proc.id, 'EM_ACOMPANHAMENTO')}
                        className="w-full h-9 rounded-xl text-xs font-bold text-slate-700"
                      >
                        Acompanhar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleUpdateStage(proc.personId, proc.id, 'CONCLUIDO', true)}
                        className="w-full h-9 rounded-xl text-xs font-bold text-white shadow-sm"
                      >
                        <CheckCircle2 className="size-3.5 mr-1" /> Concluir
                      </Button>
                    </div>
                  ) : (
                    <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl text-center text-xs font-bold flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="size-4" /> Processo Concluído
                    </div>
                  )}
                </div>

              </Card>
            );
          })}
      </div>
    )}
    </div>
  );
}
