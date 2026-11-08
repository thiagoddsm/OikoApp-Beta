'use client';

import React, { useState } from 'react';
import { ShapeResult } from '@/types/shape';
import {
  ShapeAssistantMessage,
  ShapeAssistantResponse,
  ShapeCandidateRecommendation,
} from '@/app/api/ai/shape-assistant/route';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Sparkles,
  Send,
  Bot,
  User,
  ChevronDown,
  ChevronUp,
  Award,
  AlertCircle,
  MessageSquare,
  ExternalLink,
  Filter,
  X,
  RefreshCw,
  CheckCircle2,
  Briefcase,
  Target,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ConversationTurn {
  id: string;
  userQuery: string;
  response: ShapeAssistantResponse;
  createdAt: string;
}

interface ShapeAiAssistantProps {
  results: ShapeResult[];
  onSelectPerson: (person: ShapeResult) => void;
  activeAiFilterIds: string[] | null;
  onApplyAiFilterIds: (ids: string[] | null) => void;
}

const QUICK_PROMPTS = [
  {
    label: '📋 Administração do Retiro de Carnaval',
    prompt:
      'Preciso de uma pessoa que seja boa em tarefas, organizada, para poder atuar na área da administração do retiro de carnaval.',
  },
  {
    label: '🤝 Liderança de Recepção & Acolhimento',
    prompt:
      'Preciso de alguém muito acolhedor, comunicativo, focado em pessoas, com dom de hospitalidade ou encorajamento para recepcionar visitantes.',
  },
  {
    label: '📊 Tesouraria, Planilhas & Finanças',
    prompt:
      'Quem na base tem formação ou trabalho na área financeira/contábil/administrativa, perfil analítico (DISC C / Tarefas Formal) e habilidade com controle de dados e orçamento?',
  },
  {
    label: '🎬 Equipe de Mídia, Vídeo & Design',
    prompt:
      'Busco voluntários com habilidades em fotografia, edição de vídeo, áudio, design gráfico ou redes sociais e comunicação criativa.',
  },
  {
    label: '🎓 Ensino Bíblico & Discipulado',
    prompt:
      'Quem possui dom de Ensino, Sabedoria ou Pastorado combinados com boa comunicação ou formação em educação para dar aula ou discipular?',
  },
];

export function ShapeAiAssistant({
  results,
  onSelectPerson,
  activeAiFilterIds,
  onApplyAiFilterIds,
}: ShapeAiAssistantProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(true);
  const [queryInput, setQueryInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [messagesHistory, setMessagesHistory] = useState<ShapeAssistantMessage[]>([]);

  const handleSendQuery = async (customPrompt?: string) => {
    const textToSend = (customPrompt ?? queryInput).trim();
    if (!textToSend || isLoading) return;

    const updatedHistory: ShapeAssistantMessage[] = [
      ...messagesHistory,
      { role: 'user', content: textToSend },
    ];

    setIsLoading(true);
    if (!customPrompt) setQueryInput('');

    try {
      const res = await fetch('/api/ai/shape-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedHistory,
          candidates: results,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Não foi possível processar a consulta com a IA.');
      }

      const aiData: ShapeAssistantResponse = json.data;
      const newTurn: ConversationTurn = {
        id: String(Date.now()),
        userQuery: textToSend,
        response: aiData,
        createdAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };

      setTurns((prev) => [...prev, newTurn]);
      setMessagesHistory([
        ...updatedHistory,
        {
          role: 'assistant',
          content: `${aiData.reply}\nRecomendados: ${(aiData.recommendations || [])
            .map((r) => `${r.nome} (${r.matchScore}%)`)
            .join(', ')}`,
        },
      ]);
    } catch (err: any) {
      console.error('Erro no Consultor IA:', err);
      toast({
        variant: 'destructive',
        title: 'Erro na Consulta de IA',
        description: err.message || 'Tente novamente em alguns instantes.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearConversation = () => {
    setTurns([]);
    setMessagesHistory([]);
    onApplyAiFilterIds(null);
  };

  const findPersonByRecommendation = (rec: ShapeCandidateRecommendation): ShapeResult | undefined => {
    return (
      results.find((r) => r.id === rec.resultId || r.userId === rec.resultId) ||
      results.find((r) => (r.nome || '').toLowerCase().trim() === (rec.nome || '').toLowerCase().trim())
    );
  };

  const handleWhatsAppInvite = (rec: ShapeCandidateRecommendation, person?: ShapeResult) => {
    const defaultMsg = `Olá ${rec.nome.split(' ')[0]}! Paz! Fizemos um mapeamento ministerial no OikoApp e vimos que seu perfil e dons têm tudo a ver com uma demanda especial (${rec.roleSuggestion}). Podemos conversar a respeito?`;
    const msg = rec.suggestedWhatsappMessage || defaultMsg;
    const rawPhone = person?.telefone || '';
    const digits = rawPhone.replace(/\D/g, '');

    if (digits.length >= 10) {
      const fullPhone = digits.startsWith('55') ? digits : `55${digits}`;
      const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      navigator.clipboard.writeText(msg);
      toast({
        title: 'Mensagem copiada!',
        description: 'O telefone deste membro não está cadastrado, mas copiamos o convite personalizado para sua área de transferência.',
      });
    }
  };

  const renderInitials = (name: string) => (name || 'U').substring(0, 2).toUpperCase();

  return (
    <div className="bg-gradient-to-br from-[#1E113F] via-[#2D1B5E] to-[#3B2475] rounded-2xl p-1 shadow-md border border-purple-900/40">
      <div className="bg-white rounded-[14px] overflow-hidden">
        {/* Header do Consultor IA */}
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 bg-gradient-to-r from-[#F7F4FC] via-indigo-50/60 to-purple-50/40 border-b border-purple-100 cursor-pointer"
          onClick={() => setIsOpen((prev) => !prev)}
        >
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#523A8C] to-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                  Consultor IA Conversacional • Varredura S.H.A.P.E. & DISC
                </h3>
                <Badge className="bg-[#523A8C] text-white text-[10px] font-extrabold px-2 py-0">
                  Recrutamento Inteligente
                </Badge>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Descreva a pessoa ou função que você precisa e a IA analisará dons, personalidade (Tarefas/Pessoas • DISC), formação, profissão e habilidades de todos os membros.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {activeAiFilterIds && (
              <Badge
                variant="outline"
                className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-bold gap-1 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onApplyAiFilterIds(null);
                }}
              >
                <Filter className="w-3 h-3" />
                Filtrando {activeAiFilterIds.length} indicados (Limpar)
                <X className="w-3 h-3 ml-0.5" />
              </Badge>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs font-bold text-[#523A8C] hover:bg-purple-100/60 rounded-xl h-8 gap-1"
            >
              {isOpen ? (
                <>
                  <span>Recolher</span>
                  <ChevronUp className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Abrir Consultor IA</span>
                  <ChevronDown className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>

        {isOpen && (
          <div className="p-5 space-y-5">
            {/* Sugestões Rápidas de Prompts */}
            <div className="space-y-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Exemplos de demandas (clique para preencher ou digite a sua abaixo):
              </span>
              <div className="flex flex-wrap gap-2">
                {QUICK_PROMPTS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={isLoading}
                    onClick={() => {
                      setQueryInput(item.prompt);
                    }}
                    className="text-left text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-[#EDE8F5] text-slate-700 hover:text-[#523A8C] border border-slate-200 hover:border-purple-200 transition-all"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Histórico de Conversa com a IA */}
            {turns.length > 0 && (
              <div className="space-y-6 border-t border-slate-100 pt-4">
                {turns.map((turn, tIdx) => {
                  const recIds = (turn.response.recommendations || [])
                    .map((rec) => findPersonByRecommendation(rec)?.id)
                    .filter((id): id is string => !!id);

                  const isFilteringThisTurn =
                    activeAiFilterIds &&
                    recIds.length > 0 &&
                    recIds.every((id) => activeAiFilterIds.includes(id));

                  return (
                    <div key={turn.id} className="space-y-4">
                      {/* Mensagem do Usuário */}
                      <div className="flex items-start justify-end gap-2.5">
                        <div className="bg-[#523A8C] text-white px-4 py-3 rounded-2xl rounded-tr-xs max-w-2xl shadow-xs">
                          <div className="flex items-center justify-between gap-4 mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-200">
                              Sua Demanda Ministerial
                            </span>
                            <span className="text-[10px] text-purple-200/80">{turn.createdAt}</span>
                          </div>
                          <p className="text-xs sm:text-sm leading-relaxed font-medium">
                            "{turn.userQuery}"
                          </p>
                        </div>
                        <div className="w-8 h-8 rounded-xl bg-purple-100 text-[#523A8C] flex items-center justify-center shrink-0 font-bold text-xs">
                          <User className="w-4 h-4" />
                        </div>
                      </div>

                      {/* Resposta da IA */}
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#523A8C] to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                          <Bot className="w-4 h-4 text-amber-300" />
                        </div>

                        <div className="flex-1 min-w-0 space-y-4 bg-slate-50/80 border border-slate-200/90 rounded-2xl rounded-tl-xs p-4 sm:p-5">
                          {/* Banner do Perfil Ideal Buscado */}
                          {turn.response.idealProfileSummary && (
                            <div className="flex items-center gap-2 bg-indigo-50/90 border border-indigo-200/80 px-3.5 py-2.5 rounded-xl">
                              <Target className="w-4 h-4 text-indigo-600 shrink-0" />
                              <div className="text-xs text-indigo-950">
                                <strong className="font-extrabold">Critérios da Varredura IA: </strong>
                                <span>{turn.response.idealProfileSummary}</span>
                              </div>
                            </div>
                          )}

                          {/* Parecer Conversacional */}
                          <div className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                            {turn.response.reply}
                          </div>

                          {/* Cards dos Candidatos Recomendados */}
                          {turn.response.recommendations && turn.response.recommendations.length > 0 && (
                            <div className="space-y-3 pt-2">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                                  <Award className="w-4 h-4 text-amber-500" />
                                  Pessoas Mais Compatíveis Encontradas ({turn.response.recommendations.length})
                                </h4>

                                {recIds.length > 0 && (
                                  <Button
                                    type="button"
                                    variant={isFilteringThisTurn ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() =>
                                      onApplyAiFilterIds(isFilteringThisTurn ? null : recIds)
                                    }
                                    className="h-7 text-[11px] font-bold rounded-lg gap-1.5"
                                  >
                                    <Filter className="w-3 h-3" />
                                    {isFilteringThisTurn
                                      ? 'Mostrando apenas estes no Quadro/Lista (Remover filtro)'
                                      : 'Filtrar Quadro/Lista abaixo por estes nomes'}
                                  </Button>
                                )}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                {turn.response.recommendations.map((rec, rIdx) => {
                                  const person = findPersonByRecommendation(rec);
                                  const scoreColor =
                                    rec.matchScore >= 85
                                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                      : rec.matchScore >= 70
                                      ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                                      : 'bg-amber-100 text-amber-800 border-amber-300';

                                  return (
                                    <Card
                                      key={`${turn.id}-rec-${rIdx}`}
                                      className="rounded-2xl border-slate-200 hover:border-[#523A8C]/40 transition-all shadow-xs overflow-hidden flex flex-col justify-between bg-white"
                                    >
                                      <CardContent className="p-4 space-y-3">
                                        {/* Topo do Card: Ranking + Nome + Score */}
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="flex items-center gap-2.5 min-w-0">
                                            <Avatar className="h-9 w-9 shrink-0 border border-purple-200">
                                              <AvatarFallback className="bg-[#EDE8F5] text-[#523A8C] font-black text-xs">
                                                {renderInitials(rec.nome)}
                                              </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                              <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-slate-900 text-white">
                                                  #{rIdx + 1}
                                                </span>
                                                <h5 className="font-extrabold text-sm text-slate-900 truncate">
                                                  {rec.nome}
                                                </h5>
                                              </div>
                                              <p className="text-[11px] font-bold text-[#523A8C] truncate mt-0.5">
                                                {rec.roleSuggestion}
                                              </p>
                                            </div>
                                          </div>

                                          <Badge
                                            variant="outline"
                                            className={`font-black text-[11px] shrink-0 ${scoreColor}`}
                                          >
                                            {rec.matchScore}% Match
                                          </Badge>
                                        </div>

                                        {/* Info Complementar (GC / Profissão se disponível no objeto) */}
                                        {person && (person.gcInfo || person.profissao || person.formacao) && (
                                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-lg">
                                            {person.gcInfo && (
                                              <span>
                                                <strong>GC:</strong> {person.gcInfo}
                                              </span>
                                            )}
                                            {(person.profissao || person.formacao) && (
                                              <span className="flex items-center gap-1">
                                                <Briefcase className="w-3 h-3 text-slate-400" />
                                                {[person.profissao, person.formacao].filter(Boolean).join(' • ')}
                                              </span>
                                            )}
                                          </div>
                                        )}

                                        {/* Tags de Destaque (Highlights) */}
                                        {Array.isArray(rec.highlights) && rec.highlights.length > 0 && (
                                          <div className="flex flex-wrap gap-1">
                                            {rec.highlights.map((tag, hIdx) => (
                                              <Badge
                                                key={hIdx}
                                                variant="secondary"
                                                className="text-[10px] bg-purple-50 text-[#523A8C] border border-purple-200/70 font-semibold px-2 py-0.5"
                                              >
                                                {tag}
                                              </Badge>
                                            ))}
                                          </div>
                                        )}

                                        {/* Justificativa da IA */}
                                        <div className="text-xs text-slate-700 leading-relaxed bg-emerald-50/40 border border-emerald-100 p-2.5 rounded-xl">
                                          <strong className="text-emerald-900 block text-[10px] uppercase tracking-wider mb-0.5">
                                            ✓ Por que se encaixa na sua demanda:
                                          </strong>
                                          {rec.whyFits}
                                        </div>

                                        {/* Dica Pastoral ou Ponto de Atenção */}
                                        {rec.cautionOrTip && (
                                          <div className="text-[11px] text-amber-900 bg-amber-50/70 border border-amber-200/70 p-2.5 rounded-xl flex items-start gap-1.5">
                                            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                            <div>
                                              <strong className="font-bold">Dica Pastoral: </strong>
                                              <span>{rec.cautionOrTip}</span>
                                            </div>
                                          </div>
                                        )}

                                        {/* Botões de Ação */}
                                        <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                                          {person && (
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="sm"
                                              onClick={() => onSelectPerson(person)}
                                              className="flex-1 h-8 text-xs font-bold rounded-xl gap-1.5 border-slate-200 hover:bg-slate-50"
                                            >
                                              <ExternalLink className="w-3.5 h-3.5 text-[#523A8C]" />
                                              <span>Ver Ficha S.H.A.P.E.</span>
                                            </Button>
                                          )}
                                          <Button
                                            type="button"
                                            size="sm"
                                            onClick={() => handleWhatsAppInvite(rec, person)}
                                            className="flex-1 h-8 text-xs font-bold rounded-xl gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                                          >
                                            <MessageSquare className="w-3.5 h-3.5" />
                                            <span>Convidar no WhatsApp</span>
                                          </Button>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Barra de Digitação Conversacional */}
            <div className="space-y-2.5">
              <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-end">
                <div className="relative flex-1">
                  <Textarea
                    placeholder='Ex: "Preciso de uma pessoa que seja boa em tarefas, organizada, para atuar na área da administração do retiro de carnaval..."'
                    value={queryInput}
                    onChange={(e) => setQueryInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendQuery();
                      }
                    }}
                    disabled={isLoading}
                    rows={2}
                    className="resize-none rounded-xl border-slate-200 focus-visible:ring-[#523A8C] text-xs sm:text-sm pr-4 py-2.5 min-h-[62px]"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {turns.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClearConversation}
                      disabled={isLoading}
                      className="h-[62px] px-3.5 rounded-xl text-xs font-bold text-slate-600 border-slate-200"
                      title="Limpar histórico de conversa"
                    >
                      <RefreshCw className="w-4 h-4 sm:mr-1.5" />
                      <span className="hidden sm:inline">Nova Consulta</span>
                    </Button>
                  )}

                  <Button
                    type="button"
                    onClick={() => handleSendQuery()}
                    disabled={isLoading || !queryInput.trim()}
                    className="h-[62px] px-5 rounded-xl bg-gradient-to-r from-[#523A8C] to-indigo-600 hover:from-[#432E75] hover:to-indigo-700 text-white font-extrabold text-xs sm:text-sm gap-2 shadow-sm flex-1 sm:flex-initial"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                        <span>Varrendo Perfis...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 text-amber-300" />
                        <span>{turns.length > 0 ? 'Perguntar / Refinar' : 'Buscar Perfis com IA'}</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span>
                  💡 Pressione <strong>Enter</strong> para enviar. Você pode fazer perguntas seguidas para refinar os candidatos!
                </span>
                <span>Base analisada: {results.length} membros</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
