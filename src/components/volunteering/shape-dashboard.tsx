'use client';

import { useState, useEffect } from 'react';
import {
  ShapeResult,
  QUADRANTE_META,
  HABILIDADES_MAP,
  ShapeQuadrante,
  calculateShapeCompletion,
} from '@/types/shape';
import { DISC_META, DiscMetaItem } from '@/lib/disc-meta';
import { DiscLetter } from '@/lib/disc-questions';
import DiscBarChart from '@/components/volunteering/shape/disc/DiscBarChart';
import DiscProfileBadge from '@/components/volunteering/shape/disc/DiscProfileBadge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Search,
  LayoutGrid,
  List,
  Sparkles,
  User,
  Briefcase,
  Heart,
  Calendar,
  RefreshCw,
  CheckCircle2,
  Clock,
  Compass,
  Settings,
  Plus,
  Trash2,
  Check,
  Save,
  MessageSquare,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import {
  getShapeResults,
  getMinistrySuggestions,
  updateMinistrySuggestions,
} from '@/app/dashboard/volunteering/molde-de-servo/actions';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

const DONS = [
  'Administração', 'Apostolado', 'Artesanato', 'Comunicação Criativa', 'Discernimento',
  'Encorajamento', 'Evangelismo', 'Fé', 'Contribuição', 'Serviço',
  'Hospitalidade', 'Intercessão', 'Conhecimento', 'Liderança', 'Misericórdia',
  'Profecia', 'Pastorado', 'Ensino', 'Sabedoria'
];

type KanbanDiscColumnId = 'D' | 'I' | 'S' | 'C' | 'sem_disc';

interface KanbanDiscColumnMeta {
  id: KanbanDiscColumnId;
  label: string;
  subtitle: string;
  letter: string;
  emoji: string;
  bg: string;
  border: string;
  text: string;
}

const KANBAN_DISC_COLUMNS: KanbanDiscColumnMeta[] = [
  {
    id: 'D',
    letter: 'D',
    label: 'D • Dominância',
    subtitle: 'Executor & Pioneiro',
    emoji: '🔴',
    bg: 'bg-red-50/70',
    border: 'border-red-200',
    text: 'text-red-700',
  },
  {
    id: 'I',
    letter: 'I',
    label: 'I • Influência',
    subtitle: 'Comunicador & Conector',
    emoji: '🟡',
    bg: 'bg-amber-50/70',
    border: 'border-amber-200',
    text: 'text-amber-700',
  },
  {
    id: 'S',
    letter: 'S',
    label: 'S • Estabilidade',
    subtitle: 'Cuidador & Constante',
    emoji: '🟢',
    bg: 'bg-emerald-50/70',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
  },
  {
    id: 'C',
    letter: 'C',
    label: 'C • Conformidade',
    subtitle: 'Analítico & Detalhista',
    emoji: '🔵',
    bg: 'bg-blue-50/70',
    border: 'border-blue-200',
    text: 'text-blue-700',
  },
  {
    id: 'sem_disc',
    letter: '?',
    label: 'Sem DISC / Legado',
    subtitle: 'Em andamento ou modelo anterior',
    emoji: '⚪',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    text: 'text-slate-600',
  },
];

const getItemDiscColumn = (item: ShapeResult): KanbanDiscColumnId => {
  if (item.discPrimary && ['D', 'I', 'S', 'C'].includes(item.discPrimary)) {
    return item.discPrimary as KanbanDiscColumnId;
  }
  return 'sem_disc';
};

export function ShapeDashboard({ initialResults }: { initialResults: ShapeResult[] }) {
  const { toast } = useToast();
  const [results, setResults] = useState<ShapeResult[]>(initialResults);
  const [search, setSearch] = useState('');
  const [discFilter, setDiscFilter] = useState<string>('todos');
  const [domFilter, setDomFilter] = useState<string>('todos');
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  
  const [selectedPerson, setSelectedPerson] = useState<ShapeResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal de edição de áreas sugeridas ("Onde Deus está te chamando para servir")
  const [isMinistryConfigOpen, setIsMinistryConfigOpen] = useState(false);
  const [ministryList, setMinistryList] = useState<string[]>([]);
  const [newMinistryInput, setNewMinistryInput] = useState('');
  const [isSavingMinistries, setIsSavingMinistries] = useState(false);

  useEffect(() => {
    getMinistrySuggestions().then((list) => {
      if (list && list.length > 0) setMinistryList(list);
    });
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const fresh = await getShapeResults();
      setResults(fresh);
    } catch (e) {
      console.error('Erro ao atualizar:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAddMinistry = () => {
    const trimmed = newMinistryInput.trim();
    if (!trimmed) return;
    if (ministryList.some((m) => m.toLowerCase() === trimmed.toLowerCase())) {
      toast({
        variant: 'destructive',
        title: 'Área já cadastrada',
        description: 'Essa opção já consta na lista de sugestões.',
      });
      return;
    }
    setMinistryList((prev) => [...prev, trimmed]);
    setNewMinistryInput('');
  };

  const handleRemoveMinistry = (indexToRemove: number) => {
    setMinistryList((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSaveMinistries = async () => {
    setIsSavingMinistries(true);
    try {
      const res = await updateMinistrySuggestions(ministryList);
      if (res.success) {
        toast({
          title: 'Áreas atualizadas com sucesso! 🎉',
          description: 'As novas opções já estão disponíveis para os alunos no Molde de Servo.',
        });
        setIsMinistryConfigOpen(false);
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro ao salvar',
          description: res.error || 'Não foi possível salvar as alterações.',
        });
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro de conexão',
        description: 'Tente novamente.',
      });
    } finally {
      setIsSavingMinistries(false);
    }
  };

  const filteredResults = results.filter(r => {
    const matchSearch = (r.nome || '').toLowerCase().includes(search.toLowerCase()) || (r.email || '').toLowerCase().includes(search.toLowerCase());
    const itemCol = getItemDiscColumn(r);
    const matchDisc = discFilter === 'todos' || itemCol === discFilter;
    const top1Name = r.top3?.[0]?.nome || r.top3?.[0]?.name;
    const matchDom = domFilter === 'todos' || top1Name === domFilter;
    return matchSearch && matchDisc && matchDom;
  });

  const HEART_LABELS: Record<string, string> = {
    h1: 'O que me impulsiona',
    h2: 'Quem eu quero alcançar',
    h3: 'Necessidades que amo suprir',
    h4: 'Causa que mais me engaja',
    h5: 'Maior sonho para o Reino',
    q0: 'O que me impulsiona a servir',
    q1: 'Quem eu tenho mais paixão por alcançar',
    q2: 'Necessidades que amo suprir',
    q3: 'Causa que mais me engaja',
    q4: 'Maior sonho para o Reino',
  };

  const kanbanColumns = KANBAN_DISC_COLUMNS;

  const formatAiAnalysis = (ai: any) => {
    if (!ai) return null;
    let {
      resumoServidor = '',
      areasRecomendadas = [],
      comoComunicar = [],
      comoGerenciar = [],
      evitar = [],
      alertas = [],
      proximosPassos = [],
      generatedAt,
    } = ai;

    // Se o resumoServidor veio com JSON bruto embutido, extrai os campos automaticamente
    if ((areasRecomendadas.length === 0 || proximosPassos.length === 0) && resumoServidor.includes('{')) {
      const firstBrace = resumoServidor.indexOf('{');
      const lastBrace = resumoServidor.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        try {
          const jsonStr = resumoServidor.substring(firstBrace, lastBrace + 1);
          const parsed = JSON.parse(jsonStr);
          if (parsed.resumoServidor) resumoServidor = parsed.resumoServidor;
          if (Array.isArray(parsed.areasRecomendadas) && parsed.areasRecomendadas.length > 0) {
            areasRecomendadas = parsed.areasRecomendadas;
          }
          if (Array.isArray(parsed.comoComunicar) && parsed.comoComunicar.length > 0) {
            comoComunicar = parsed.comoComunicar;
          }
          if (Array.isArray(parsed.comoGerenciar) && parsed.comoGerenciar.length > 0) {
            comoGerenciar = parsed.comoGerenciar;
          }
          if (Array.isArray(parsed.evitar) && parsed.evitar.length > 0) {
            evitar = parsed.evitar;
          }
          if (Array.isArray(parsed.alertas) && parsed.alertas.length > 0) {
            alertas = parsed.alertas;
          }
          if (Array.isArray(parsed.proximosPassos) && parsed.proximosPassos.length > 0) {
            proximosPassos = parsed.proximosPassos;
          }
        } catch (e) {
          console.error('Erro ao normalizar JSON da IA:', e);
        }
      }
    }

    return {
      resumoServidor,
      areasRecomendadas: Array.isArray(areasRecomendadas) ? areasRecomendadas : [],
      comoComunicar: Array.isArray(comoComunicar) ? comoComunicar : [],
      comoGerenciar: Array.isArray(comoGerenciar) ? comoGerenciar : [],
      evitar: Array.isArray(evitar) ? evitar : [],
      alertas: Array.isArray(alertas) ? alertas : [],
      proximosPassos: Array.isArray(proximosPassos) ? proximosPassos : [],
      generatedAt,
    };
  };

  const handleGenerateAI = async () => {
    if (!selectedPerson) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/ai/analyze-shape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resultId: selectedPerson.id, shapeData: selectedPerson }),
      });
      const data = await res.json();
      if (data.success) {
        const updated = { ...selectedPerson, aiAnalysis: data.analysis };
        setSelectedPerson(updated);
        setResults(prev => prev.map(r => r.id === updated.id ? updated : r));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderInitials = (name: string) => (name || 'U').substring(0, 2).toUpperCase();

  const selectedCompletion = selectedPerson ? calculateShapeCompletion(selectedPerson) : null;
  const activeAiAnalysis = selectedPerson ? formatAiAnalysis(selectedPerson.aiAnalysis) : null;

  return (
    <div className="space-y-6">
      {/* Top Banner & Botão de Configuração das Áreas */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-[#EDE8F5] text-[#523A8C] flex items-center justify-center shrink-0">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 leading-tight">
              Áreas de Chamado Ministerial
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Defina as opções exibidas para o aluno em "Onde você sente que Deus está te chamando para servir?"
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={() => setIsMinistryConfigOpen(true)}
          className="bg-[#523A8C] hover:bg-[#432E75] text-white text-xs font-bold rounded-xl h-9 gap-1.5 shadow-sm"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Editar Áreas de Serviço</span>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Buscar por nome ou e-mail..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <Select value={discFilter} onValueChange={setDiscFilter}>
          <SelectTrigger className="w-full md:w-[220px]">
            <SelectValue placeholder="Perfil DISC" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Perfis</SelectItem>
            <SelectItem value="D">🔴 D • Dominância</SelectItem>
            <SelectItem value="I">🟡 I • Influência</SelectItem>
            <SelectItem value="S">🟢 S • Estabilidade</SelectItem>
            <SelectItem value="C">🔵 C • Conformidade</SelectItem>
            <SelectItem value="sem_disc">⚪ Sem DISC / Legado</SelectItem>
          </SelectContent>
        </Select>

        <Select value={domFilter} onValueChange={setDomFilter}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Dom Dominante" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Dons</SelectItem>
            {DONS.map(dom => (
              <SelectItem key={dom} value={dom}>{dom}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="h-9 gap-1.5 text-xs font-bold text-slate-700 rounded-xl"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Atualizar</span>
        </Button>

        <div className="flex bg-slate-100 p-1 rounded-lg">
          <Button 
            variant={view === 'kanban' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => setView('kanban')}
          >
            <LayoutGrid className="w-4 h-4 mr-2" /> Kanban
          </Button>
          <Button 
            variant={view === 'list' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => setView('list')}
          >
            <List className="w-4 h-4 mr-2" /> Lista
          </Button>
        </div>
      </div>

      {/* View Kanban */}
      {view === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-start">
          {kanbanColumns.map(col => {
            const colItems = filteredResults.filter(r => getItemDiscColumn(r) === col.id);
            return (
              <div key={col.id} className="flex flex-col gap-3 min-w-0">
                <div className={`p-3.5 rounded-2xl border ${col.bg} ${col.border} flex items-center justify-between`}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-black text-xs">
                      <span>{col.emoji}</span>
                      <span className={col.text}>{col.label}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                      {col.subtitle}
                    </p>
                  </div>
                  <Badge variant="secondary" className="bg-white/90 text-slate-700 font-extrabold text-[11px] shrink-0 ml-1">
                    {colItems.length}
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  {colItems.map(item => {
                    const comp = calculateShapeCompletion(item);
                    const pct = item.completionPercentage ?? comp.percentage;
                    const hasGifts = comp.giftsAnswered > 0 || (item.top3?.[0]?.score ?? 0) > 0;

                    return (
                      <Card 
                        key={item.id} 
                        className="cursor-pointer hover:shadow-md transition-all hover:border-slate-300 rounded-2xl border-slate-200"
                        onClick={() => setSelectedPerson(item)}
                      >
                        <CardContent className="p-3.5 space-y-3">
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Avatar className="h-9 w-9 shrink-0">
                                <AvatarFallback className={`${col.bg} ${col.text} font-black text-xs border ${col.border}`}>
                                  {renderInitials(item.nome)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="font-bold text-xs sm:text-sm text-slate-900 truncate">{item.nome}</p>
                                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Calendar className="w-2.5 h-2.5" />
                                  {item.createdAt ? new Date(item.createdAt).toLocaleDateString('pt-BR') : '-'}
                                </p>
                              </div>
                            </div>

                            {item.status === 'in_progress' ? (
                              <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-200 shrink-0 font-bold px-1.5 py-0">
                                {pct}% • Etapa {item.currentStep || 2}/8
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0 font-bold px-1.5 py-0">
                                100% Concluído
                              </Badge>
                            )}
                          </div>

                          {/* Badge de Perfil DISC no Card */}
                          <div className="pt-0.5">
                            {item.discPrimary ? (
                              <div className="space-y-1.5">
                                <DiscProfileBadge
                                  primary={item.discPrimary as any}
                                  secondary={item.discSecondary as any}
                                />
                                {item.discScores && (
                                  <DiscBarChart
                                    scores={item.discScores as any}
                                    compact
                                    className="w-full pt-1"
                                  />
                                )}
                              </div>
                            ) : item.quadrante && QUADRANTE_META[item.quadrante] ? (
                              <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600 border-slate-200 font-medium">
                                Legado • {QUADRANTE_META[item.quadrante].emoji} {QUADRANTE_META[item.quadrante].label}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-dashed border-amber-200">
                                Aguardando DISC (Aula 2)
                              </Badge>
                            )}
                          </div>

                          {/* Mini barra de progresso do card */}
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-[10px] text-slate-500">
                              <span>Preenchimento</span>
                              <span className="font-bold text-slate-700">{pct}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  pct >= 100 ? 'bg-emerald-500' : pct >= 70 ? 'bg-indigo-500' : 'bg-amber-500'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>

                          {item.gcInfo && (
                            <div className="text-[11px] text-slate-500 truncate">
                              <strong>GC:</strong> {item.gcInfo}
                            </div>
                          )}

                          {item.ministryTarget && (
                            <div className="text-[11px] text-[#523A8C] font-semibold flex items-center gap-1">
                              <Compass className="w-3 h-3 shrink-0" />
                              <span className="truncate">Área: {item.ministryTarget}</span>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-1 mt-2">
                            {hasGifts ? (
                              item.top3?.map((dom, i) => (
                                <Badge key={i} variant="outline" className="text-[10px] py-0 px-1.5 h-5 bg-slate-50">
                                  {dom.nome || dom.name} ({dom.score}pts)
                                </Badge>
                              ))
                            ) : (
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-5 bg-slate-50 text-slate-400 border-dashed">
                                Dons pendentes ({comp.giftsAnswered}/133)
                              </Badge>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-1 mt-2">
                            {(item.habilidades || []).slice(0, 3).map((habId, i) => {
                              const oldHab = HABILIDADES_MAP[habId];
                              const label = oldHab ? `${oldHab.icon} ${oldHab.nome}` : habId;
                              return (
                                <Badge key={i} variant="secondary" className="text-[10px] py-0 px-1.5 h-5 bg-slate-100 text-slate-600 truncate max-w-full">
                                  {label}
                                </Badge>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {colItems.length === 0 && (
                    <div className="text-center text-xs text-slate-400 py-8 border-2 border-dashed rounded-2xl border-slate-200">
                      Nenhum resultado
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View Lista */}
      {view === 'list' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Progresso / Status</TableHead>
                <TableHead>Perfil DISC / Personalidade</TableHead>
                <TableHead>Top 1 Dom</TableHead>
                <TableHead>Área Sentida</TableHead>
                <TableHead>Habilidades</TableHead>
                <TableHead>GC</TableHead>
                <TableHead>Data</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResults.map(item => {
                const meta = item.quadrante ? QUADRANTE_META[item.quadrante] : null;
                const comp = calculateShapeCompletion(item);
                const pct = item.completionPercentage ?? comp.percentage;
                const hasGifts = comp.giftsAnswered > 0 || (item.top3?.[0]?.score ?? 0) > 0;

                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.nome}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 min-w-[130px]">
                        {item.status === 'in_progress' ? (
                          <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 w-fit font-bold">
                            {pct}% • Etapa {item.currentStep || 2}/8
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 w-fit font-bold">
                            100% Concluído
                          </Badge>
                        )}
                        <div className="w-28 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              pct >= 100 ? 'bg-emerald-500' : pct >= 70 ? 'bg-indigo-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.discPrimary ? (
                        <DiscProfileBadge
                          primary={item.discPrimary as any}
                          secondary={item.discSecondary as any}
                        />
                      ) : meta ? (
                        <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-700 border-slate-300">
                          Legado • {meta.emoji} {meta.label}
                        </Badge>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Pendente (Aula 2)</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {hasGifts ? (
                        <span className="font-semibold text-xs">
                          {item.top3?.[0]?.nome || item.top3?.[0]?.name} ({item.top3?.[0]?.score}pts)
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Pendente ({comp.giftsAnswered}/133)</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.ministryTarget ? (
                        <Badge variant="secondary" className="text-[10px] bg-purple-50 text-[#523A8C] border-purple-200 font-bold">
                          {item.ministryTarget}
                        </Badge>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 text-lg">
                        {(item.habilidades || []).slice(0, 3).map((habId, i) => {
                          const oldHab = HABILIDADES_MAP[habId];
                          const label = oldHab ? `${oldHab.icon} ${oldHab.nome}` : habId;
                          return (
                            <Badge key={i} variant="secondary" className="text-[10px] truncate max-w-[150px]">
                              {label}
                            </Badge>
                          );
                        })}
                      </div>
                    </TableCell>
                    <TableCell>{item.gcInfo || '-'}</TableCell>
                    <TableCell>{item.createdAt ? new Date(item.createdAt).toLocaleDateString('pt-BR') : '-'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedPerson(item)}>
                        Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredResults.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Nenhum resultado encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog Detalhes do Aluno */}
      <Dialog open={!!selectedPerson} onOpenChange={(open) => !open && setSelectedPerson(null)}>
        {selectedPerson && selectedCompletion && (
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                {selectedPerson.userId && (
                  <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-700">
                    ID Vinculado: {selectedPerson.userId}
                  </Badge>
                )}
                {selectedPerson.status === 'in_progress' ? (
                  <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 font-bold">
                    Em andamento (Etapa {selectedPerson.currentStep || 2} de 8 • {selectedPerson.completionPercentage ?? selectedCompletion.percentage}% preenchido)
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 font-bold">
                    100% Concluído
                  </Badge>
                )}
              </div>
              <DialogTitle className="text-2xl">{selectedPerson.nome}</DialogTitle>
              <DialogDescription className="flex flex-wrap gap-x-4 gap-y-2 mt-2">
                <span><strong>Email:</strong> {selectedPerson.email}</span>
                {selectedPerson.telefone && <span><strong>Tel:</strong> {selectedPerson.telefone}</span>}
                {selectedPerson.gcInfo && <span><strong>GC:</strong> {selectedPerson.gcInfo}</span>}
                {selectedPerson.formacao && <span><strong>Formação:</strong> {selectedPerson.formacao}</span>}
                {selectedPerson.profissao && <span><strong>Profissão:</strong> {selectedPerson.profissao}</span>}
                {selectedPerson.createdAt && <span><strong>Data:</strong> {new Date(selectedPerson.createdAt).toLocaleDateString('pt-BR')}</span>}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              {/* Card de Progresso do Preenchimento (%) */}
              <section className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    Progresso do Formulário S.H.A.P.E.
                  </span>
                  <span className="text-sm font-black text-indigo-700">
                    {selectedPerson.completionPercentage ?? selectedCompletion.percentage}% preenchido
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      (selectedPerson.completionPercentage ?? selectedCompletion.percentage) >= 100
                        ? 'bg-emerald-500'
                        : (selectedPerson.completionPercentage ?? selectedCompletion.percentage) >= 70
                        ? 'bg-indigo-600'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${selectedPerson.completionPercentage ?? selectedCompletion.percentage}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div className="bg-white border border-slate-200/80 rounded-lg p-2.5 flex items-center gap-2">
                    {selectedCompletion.heartDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-700 truncate">Coração (Aula 1)</p>
                      <p className="text-[10px] text-slate-500">{selectedCompletion.heartAnswered}/5 questões</p>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200/80 rounded-lg p-2.5 flex items-center gap-2">
                    {selectedCompletion.giftsDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-700 truncate">Dons (Aula 1)</p>
                      <p className="text-[10px] text-slate-500">{selectedCompletion.giftsAnswered}/133 questões</p>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200/80 rounded-lg p-2.5 flex items-center gap-2">
                    {selectedCompletion.persoDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-700 truncate">Personalidade (Aula 2)</p>
                      <p className="text-[10px] text-slate-500">
                        {selectedPerson.discPrimary
                          ? `DISC ${selectedPerson.discPrimary}${selectedPerson.discSecondary || ''}`
                          : selectedCompletion.persoDone
                          ? 'Respondido (Legado)'
                          : `${selectedCompletion.persoAnswered}/12 questões`}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200/80 rounded-lg p-2.5 flex items-center gap-2">
                    {selectedCompletion.abilitiesDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-700 truncate">Habilidades (Aula 2)</p>
                      <p className="text-[10px] text-slate-500">{selectedCompletion.abilitiesCount} selecionadas</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Área Sentida / Chamado de Serviço */}
              {selectedPerson.ministryTarget && (
                <section className="p-4 bg-purple-50/70 rounded-xl border border-purple-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#523A8C] text-white flex items-center justify-center shrink-0">
                      <Compass className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold uppercase text-[#523A8C] tracking-wider block">
                        Onde sente que Deus está chamando para servir
                      </span>
                      <p className="text-sm font-extrabold text-[#1E113F] mt-0.5">
                        {selectedPerson.ministryTarget}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-white text-[#523A8C] border-purple-200 text-xs font-bold">
                    Indicação do Membro
                  </Badge>
                </section>
              )}

              {/* Personalidade - DISC com Fallback Legado */}
              <section className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <User className="w-5 h-5 text-slate-500" /> Personalidade Comportamental
                </h3>

                {selectedPerson.discPrimary && selectedPerson.discScores ? (
                  <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="space-y-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                          Perfil DISC Mapeado
                        </span>
                        <div className="flex items-center gap-2 flex-wrap">
                          <DiscProfileBadge
                            primary={selectedPerson.discPrimary as any}
                            secondary={selectedPerson.discSecondary as any}
                            strength={selectedPerson.discStrength}
                            tie={selectedPerson.discTie}
                            detailed
                          />
                          {selectedPerson.discTie && (
                            <Badge variant="outline" className="text-[10px] text-indigo-700 bg-indigo-50 border-indigo-200 font-bold">
                              Desempate sob pressão
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <span className="text-xs text-slate-500">Intensidade:</span>
                        <span className="text-xs font-black text-slate-800 ml-1">
                          {selectedPerson.discStrength === 'marked'
                            ? 'Muito Marcada'
                            : selectedPerson.discStrength === 'defined'
                            ? 'Marcada'
                            : 'Equilibrada'}
                        </span>
                      </div>
                    </div>

                    {DISC_META[selectedPerson.discPrimary as DiscLetter] && (
                      <div className="space-y-2">
                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                          {DISC_META[selectedPerson.discPrimary as DiscLetter].description}
                        </p>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 text-xs">
                          <strong className="text-slate-800">Ambiente de serviço ideal: </strong>
                          <span className="text-slate-600">
                            {DISC_META[selectedPerson.discPrimary as DiscLetter].serviceStyle}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Gráfico de barras DISC */}
                    <div className="pt-2">
                      <span className="text-xs font-bold text-slate-700 block mb-2">
                        Pontuação nas 4 Dimensões (Total 12 perguntas):
                      </span>
                      <DiscBarChart scores={selectedPerson.discScores as any} />
                    </div>

                    {selectedPerson.quadrante && QUADRANTE_META[selectedPerson.quadrante] && (
                      <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                        Equivalente no modelo anterior: {QUADRANTE_META[selectedPerson.quadrante].emoji} {QUADRANTE_META[selectedPerson.quadrante].label}
                      </p>
                    )}
                  </div>
                ) : selectedPerson.quadrante && QUADRANTE_META[selectedPerson.quadrante] ? (
                  <div className={`p-4 rounded-xl border ${QUADRANTE_META[selectedPerson.quadrante].bg} ${QUADRANTE_META[selectedPerson.quadrante].border}`}>
                    <div className="flex items-center justify-between gap-2 font-medium mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{QUADRANTE_META[selectedPerson.quadrante].emoji}</span>
                        <span className={`text-lg ${QUADRANTE_META[selectedPerson.quadrante].color}`}>
                          {QUADRANTE_META[selectedPerson.quadrante].label}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-white/90 text-slate-700 border-slate-200 font-bold">
                        Perfil Legado (Escalas O/E)
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-slate-600 mt-1">
                      Organização: {Number(selectedPerson.orgScore || 3).toFixed(1)}/5 | Motivação: {Number(selectedPerson.motScore || 3).toFixed(1)}/5
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      * Avaliado no formato anterior de 14 perguntas lineares. O aluno pode refazer apenas o inventário DISC de 12 perguntas a qualquer momento pelo Molde de Servo.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center text-xs text-slate-500">
                    Perfil Comportamental DISC ainda não preenchido (etapa da Aula 2).
                  </div>
                )}
              </section>

              {/* Dons */}
              <section className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-slate-500" /> Top 3 Dons Espirituais
                </h3>
                {selectedCompletion.giftsAnswered === 0 && (selectedPerson.top3?.[0]?.score ?? 0) === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center text-sm text-slate-500">
                    Inventário de Dons Espirituais ainda não respondido ({selectedCompletion.giftsAnswered}/133 questões). Os dons serão calculados quando o aluno avançar pelas etapas 3, 4 e 5 da Aula 1.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {selectedPerson.top3?.map((dom, i) => (
                      <Card key={i} className="bg-slate-50">
                        <CardHeader className="p-4 pb-2">
                          <CardTitle className="text-sm font-bold flex justify-between">
                            {dom.nome || dom.name}
                            <Badge variant="secondary">{dom.score}pts</Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 text-xs text-slate-500">
                          {dom.desc || 'Sem descrição.'}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </section>

              {/* Habilidades */}
              <section className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-slate-500" /> Habilidades Profissionais
                </h3>
                {(selectedPerson.habilidades || []).length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Nenhuma habilidade selecionada ainda (etapa da Aula 2).</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(selectedPerson.habilidades || []).map((habId, i) => {
                      const oldHab = HABILIDADES_MAP[habId];
                      const label = oldHab ? `${oldHab.icon} ${oldHab.nome}` : habId;
                      return (
                        <Badge key={i} variant="outline" className="px-3 py-1.5 text-sm bg-white">
                          {label}
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Experiências e Disponibilidade */}
              {selectedPerson.experiencias && Object.keys(selectedPerson.experiencias).length > 0 && (
                <section className="space-y-3">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-slate-500" /> Experiência & Disponibilidade
                  </h3>
                  <div className="space-y-4 bg-slate-50 p-4 rounded-xl">
                    {selectedPerson.experiencias['exp1'] && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 mb-1">Formação e Atuação Profissional</p>
                        <p className="text-sm text-slate-800">{selectedPerson.experiencias['exp1']}</p>
                      </div>
                    )}
                    {selectedPerson.experiencias['exp2'] && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 mb-1">Experiência Anterior em Ministério</p>
                        <p className="text-sm text-slate-800">{selectedPerson.experiencias['exp2']}</p>
                      </div>
                    )}
                    {selectedPerson.experiencias['availability'] && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 mb-1">Disponibilidade</p>
                        <p className="text-sm text-slate-800">{selectedPerson.experiencias['availability']}</p>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Coração */}
              {selectedPerson.coracao && Object.keys(selectedPerson.coracao).length > 0 && (
                <section className="space-y-3">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Heart className="w-5 h-5 text-slate-500" /> Coração & Sonhos
                  </h3>
                  <div className="space-y-4 bg-slate-50 p-4 rounded-xl">
                    {Object.entries(selectedPerson.coracao).map(([pergunta, resposta], i) => (
                      <div key={i}>
                        <p className="text-xs font-semibold text-slate-500 mb-1">{HEART_LABELS[pergunta] || pergunta}</p>
                        <p className="text-sm text-slate-800 italic">"{resposta}"</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* IA */}
              <section className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-500" /> Análise por IA
                </h3>
                
                {!activeAiAnalysis ? (
                  <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-xl text-center space-y-4">
                    <p className="text-indigo-800 text-sm">
                      Gere uma análise personalizada de recomendações de serviço para este membro, baseada em todo o seu perfil S.H.A.P.E.
                    </p>
                    <Button 
                      onClick={handleGenerateAI} 
                      disabled={isAnalyzing}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      {isAnalyzing ? 'Analisando...' : '✨ Gerar Análise Ministerial'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Card className="border-indigo-200">
                      <CardHeader className="bg-indigo-50 rounded-t-xl pb-3">
                        <CardTitle className="text-sm text-indigo-800 flex justify-between items-center">
                          Resumo do Servidor
                          <span className="text-xs font-normal text-indigo-400">
                            Gerado em {new Date(activeAiAnalysis.generatedAt).toLocaleString('pt-BR')}
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 text-sm text-slate-700 whitespace-pre-wrap">
                        {activeAiAnalysis.resumoServidor}
                      </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-emerald-700 flex items-center gap-1.5">
                            <Compass className="w-4 h-4" /> Áreas Recomendadas
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="list-disc pl-4 space-y-1 text-xs sm:text-sm text-slate-600">
                            {activeAiAnalysis.areasRecomendadas.map((area: string, i: number) => <li key={i}>{area}</li>)}
                          </ul>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-blue-700 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" /> Próximos Passos Pastorais
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="list-disc pl-4 space-y-1 text-xs sm:text-sm text-slate-600">
                            {activeAiAnalysis.proximosPassos.map((passo: string, i: number) => <li key={i}>{passo}</li>)}
                          </ul>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Guia Pastoral de Liderança (DISC + Dons) */}
                    {(activeAiAnalysis.comoComunicar.length > 0 || activeAiAnalysis.comoGerenciar.length > 0) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {activeAiAnalysis.comoComunicar.length > 0 && (
                          <Card className="border-purple-200 bg-purple-50/30">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm text-[#523A8C] flex items-center gap-1.5 font-bold">
                                <MessageSquare className="w-4 h-4" /> Como a Liderança Deve se Comunicar
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ul className="list-disc pl-4 space-y-1.5 text-xs text-slate-700">
                                {activeAiAnalysis.comoComunicar.map((item: string, i: number) => (
                                  <li key={i} className="leading-snug">{item}</li>
                                ))}
                              </ul>
                            </CardContent>
                          </Card>
                        )}

                        {activeAiAnalysis.comoGerenciar.length > 0 && (
                          <Card className="border-indigo-200 bg-indigo-50/30">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm text-indigo-800 flex items-center gap-1.5 font-bold">
                                <Briefcase className="w-4 h-4" /> Melhores Práticas de Gestão
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ul className="list-disc pl-4 space-y-1.5 text-xs text-slate-700">
                                {activeAiAnalysis.comoGerenciar.map((item: string, i: number) => (
                                  <li key={i} className="leading-snug">{item}</li>
                                ))}
                              </ul>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    )}

                    {/* O que Evitar com Este Perfil */}
                    {activeAiAnalysis.evitar.length > 0 && (
                      <Card className="border-rose-200 bg-rose-50/40">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-rose-800 flex items-center gap-1.5 font-bold">
                            <ShieldAlert className="w-4 h-4 text-rose-600" /> O que Evitar com Este Perfil (Gatilhos de Atrito)
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="list-disc pl-4 space-y-1.5 text-xs text-rose-900">
                            {activeAiAnalysis.evitar.map((item: string, i: number) => (
                              <li key={i} className="leading-snug">{item}</li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                    
                    {activeAiAnalysis.alertas.length > 0 && (
                      <Card className="border-amber-200">
                        <CardHeader className="bg-amber-50 pb-2">
                          <CardTitle className="text-sm text-amber-800 flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4" /> Alertas / Pontos de Atenção
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 text-xs sm:text-sm text-amber-900">
                          <ul className="list-disc pl-4 space-y-1">
                            {activeAiAnalysis.alertas.map((alerta: string, i: number) => <li key={i}>{alerta}</li>)}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </section>

            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Modal de Configuração de Sugestões de Ministérios */}
      <Dialog open={isMinistryConfigOpen} onOpenChange={setIsMinistryConfigOpen}>
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Compass className="w-5 h-5 text-[#523A8C]" />
              Editar Áreas de Serviço Sugeridas
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Essas são as opções de botões rápidos que aparecem no Cartão do Servo do aluno na pergunta:
              <br />
              <strong className="text-slate-700">"Onde você sente que Deus está te chamando para servir?"</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Input para adicionar nova opção */}
            <div className="flex gap-2">
              <Input
                placeholder="Ex: Diaconia, Segurança, Teatro..."
                value={newMinistryInput}
                onChange={(e) => setNewMinistryInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddMinistry();
                  }
                }}
                className="h-10 text-xs rounded-xl"
              />
              <Button
                type="button"
                onClick={handleAddMinistry}
                className="bg-[#523A8C] hover:bg-[#432E75] text-white text-xs font-bold rounded-xl h-10 px-4 shrink-0 gap-1.5"
              >
                <Plus className="w-4 h-4" /> Adicionar
              </Button>
            </div>

            {/* Lista das opções atuais */}
            <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
              {ministryList.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
                >
                  <span className="text-xs font-bold text-slate-800">{item}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveMinistry(idx)}
                    className="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-white transition-colors"
                    title="Remover"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {ministryList.length === 0 && (
                <p className="text-xs text-center text-slate-400 py-4 italic">
                  Nenhuma sugestão cadastrada.
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsMinistryConfigOpen(false)}
              disabled={isSavingMinistries}
              className="text-xs rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSaveMinistries}
              disabled={isSavingMinistries}
              className="bg-[#523A8C] hover:bg-[#432E75] text-white text-xs font-bold rounded-xl gap-1.5"
            >
              {isSavingMinistries ? (
                <span>Salvando...</span>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Alterações</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
