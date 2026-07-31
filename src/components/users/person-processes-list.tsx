'use client';

import React, { useState } from 'react';
import { useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Loader2, RefreshCw, CheckCircle, Clock, Waves, Users, 
  GraduationCap, HandHelping, MessageSquare, Sparkles, FileText, ChevronDown, ChevronUp 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PersonProcessesListProps {
  userId: string;
}

const PROCESS_ICONS: Record<string, React.ElementType> = {
  GC: Users,
  BATISMO: Waves,
  MEMBRESIA: GraduationCap,
  VOLUNTARIADO: HandHelping,
  ACONSELHAMENTO: MessageSquare,
  GERAL: Sparkles,
};

const PROCESS_COLORS: Record<string, string> = {
  GC: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  BATISMO: 'bg-blue-100 text-blue-700 border-blue-200',
  MEMBRESIA: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  VOLUNTARIADO: 'bg-purple-100 text-purple-700 border-purple-200',
  ACONSELHAMENTO: 'bg-rose-100 text-rose-700 border-rose-200',
  GERAL: 'bg-amber-100 text-amber-700 border-amber-200',
};

export function PersonProcessesList({ userId }: PersonProcessesListProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [expandedProcessId, setExpandedProcessId] = useState<string | null>(null);

  const processesQuery = useMemoFirebase(() => {
    if (!firestore || !userId) return null;
    return query(collection(firestore, 'users', userId, 'processos'));
  }, [firestore, userId]);

  const { data: processes, isLoading } = useCollection<any>(processesQuery);

  const handleUpdateStage = async (processId: string, nextStage: string, isFinal = false) => {
    if (!firestore || !userId) return;
    try {
      const procRef = doc(firestore, 'users', userId, 'processos', processId);
      await updateDoc(procRef, {
        currentStage: nextStage,
        status: isFinal ? 'COMPLETED' : 'ACTIVE',
        updatedAt: new Date(),
      });
      toast({
        title: "Processo Atualizado",
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

  const toggleExpand = (processId: string) => {
    setExpandedProcessId(prev => prev === processId ? null : processId);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin size-6 text-primary" />
      </div>
    );
  }

  if (!processes || processes.length === 0) {
    return (
      <div className="p-8 text-center border-2 border-dashed rounded-2xl bg-muted/20 space-y-2">
        <Clock className="size-8 mx-auto text-muted-foreground" />
        <h4 className="font-bold text-slate-800 text-sm">Nenhum Processo Ativo</h4>
        <p className="text-xs text-muted-foreground">
          Esta pessoa ainda não possui processos ativos iniciados pelo Portal de Conexão.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-black uppercase italic tracking-tight text-slate-900">
          Processos em Andamento ({processes.length})
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {processes.map((proc) => {
          const Icon = PROCESS_ICONS[proc.processType] || Sparkles;
          const badgeStyle = PROCESS_COLORS[proc.processType] || 'bg-slate-100 text-slate-700';
          const isExpanded = expandedProcessId === proc.id;
          const details = proc.details || {};
          const hasDetails = Object.keys(details).length > 0;

          return (
            <Card key={proc.id} className="border border-slate-200 shadow-sm bg-white hover:shadow-md transition-shadow">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl border ${badgeStyle}`}>
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-900 leading-none">
                      {proc.title}
                    </CardTitle>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Tipo: <span className="font-semibold uppercase">{proc.processType}</span>
                    </p>
                  </div>
                </div>
                <Badge variant={proc.status === 'COMPLETED' ? 'default' : 'secondary'} className="text-[10px] uppercase font-bold">
                  {proc.status === 'COMPLETED' ? 'Concluído' : 'Ativo'}
                </Badge>
              </CardHeader>

              <CardContent className="p-4 pt-2 space-y-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Etapa Atual:</span>
                  <span className="font-bold text-slate-900 uppercase tracking-tight">{proc.currentStage}</span>
                </div>

                {/* Botão para Expandir Observações / Detalhes */}
                <Button 
                  type="button"
                  variant="ghost" 
                  size="sm" 
                  onClick={() => toggleExpand(proc.id)}
                  className="w-full text-xs font-bold text-slate-600 hover:text-slate-900 justify-between h-8 px-2 bg-slate-50/50 rounded-lg border border-slate-100"
                >
                  <span className="flex items-center gap-1.5">
                    <FileText className="size-3.5 text-slate-400" />
                    Observações e Respostas
                  </span>
                  {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                </Button>

                {/* Painel Expansível de Detalhes */}
                {isExpanded && (
                  <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 text-xs space-y-2 animate-in fade-in duration-200">
                    <p className="font-bold text-amber-900 uppercase text-[10px] border-b border-amber-200 pb-1">
                      Informações Enviadas no Formulário:
                    </p>

                    {details.observacoes && (
                      <div>
                        <span className="font-bold text-amber-800">Mensagem / Observação:</span>
                        <p className="text-slate-700 mt-0.5 whitespace-pre-wrap">{details.observacoes}</p>
                      </div>
                    )}

                    {details.comoConheceu && (
                      <div>
                        <span className="font-bold text-amber-800">Como conheceu a igreja:</span>
                        <p className="text-slate-700">{details.comoConheceu}</p>
                      </div>
                    )}

                    {details.celulaId && (
                      <div>
                        <span className="font-bold text-amber-800">Célula Escolhida:</span>
                        <p className="text-slate-700">ID: {details.celulaId}</p>
                      </div>
                    )}

                    {details.areaInteresseId && (
                      <div>
                        <span className="font-bold text-amber-800">Área de Interesse:</span>
                        <p className="text-slate-700">ID: {details.areaInteresseId}</p>
                      </div>
                    )}

                    {!hasDetails && !details.observacoes && (
                      <p className="text-amber-800 italic">
                        Solicitação registrada via Portal de Conexão. Sem observações adicionais gravadas.
                      </p>
                    )}
                  </div>
                )}

                {proc.status === 'ACTIVE' && (
                  <div className="flex gap-2 pt-1">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleUpdateStage(proc.id, 'EM_ACOMPANHAMENTO')}
                      className="w-full text-xs font-bold h-8 rounded-lg"
                    >
                      Acompanhar
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={() => handleUpdateStage(proc.id, 'CONCLUIDO', true)}
                      className="w-full text-xs font-bold h-8 rounded-lg text-white"
                    >
                      <CheckCircle className="size-3.5 mr-1" /> Concluir
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
