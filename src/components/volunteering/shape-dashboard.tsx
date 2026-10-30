'use client';

import { useState, useEffect } from 'react';
import {
  ShapeResult,
  QUADRANTE_META,
  HABILIDADES_MAP,
  ShapeQuadrante,
  calculateShapeCompletion,
} from '@/types/shape';
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

export function ShapeDashboard({ initialResults }: { initialResults: ShapeResult[] }) {
  const { toast } = useToast();
  const [results, setResults] = useState<ShapeResult[]>(initialResults);
  const [search, setSearch] = useState('');
  const [quadranteFilter, setQuadranteFilter] = useState<string>('todos');
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
    const matchQuadrante = quadranteFilter === 'todos' || r.quadrante === quadranteFilter;
    const top1Name = r.top3?.[0]?.nome || r.top3?.[0]?.name;
    const matchDom = domFilter === 'todos' || top1Name === domFilter;
    return matchSearch && matchQuadrante && matchDom;
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

  const kanbanColumns = Object.keys(QUADRANTE_META) as ShapeQuadrante[];

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
        
        <Select value={quadranteFilter} onValueChange={setQuadranteFilter}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Quadrante" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos Quadrantes</SelectItem>
            {kanbanColumns.map(q => (
              <SelectItem key={q} value={q}>{QUADRANTE_META[q]?.label || q}</SelectItem>
            ))}
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {kanbanColumns.map(quadrante => {
            const colItems = filteredResults.filter(r => r.quadrante === quadrante);
            const meta = QUADRANTE_META[quadrante];
            if (!meta) return null;
            return (
              <div key={quadrante} className="flex flex-col gap-4">
                <div className={`p-4 rounded-xl border ${meta.bg} ${meta.border} flex items-center justify-between`}>
                  <div className="flex items-center gap-2 font-medium">
                    <span>{meta.emoji}</span>
                    <span className={meta.color}>{meta.label}</span>
                  </div>
                  <Badge variant="secondary" className="bg-white/50">{colItems.length}</Badge>
                </div>
                
                <div className="space-y-3">
                  {colItems.map(item => {
                    const comp = calculateShapeCompletion(item);
                    const pct = item.completionPercentage ?? comp.percentage;
                    const hasGifts = comp.giftsAnswered > 0 || (item.top3?.[0]?.score ?? 0) > 0;

                    return (
                      <Card 
                        key={item.id} 
                        className="cursor-pointer hover:shadow-md transition-all hover:border-slate-300"
                        onClick={() => setSelectedPerson(item)}
                      >
                        <CardContent className="p-4 space-y-3">
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className={`${meta.bg} ${meta.color} font-bold`}>
                                  {renderInitials(item.nome)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-semibold text-sm line-clamp-1">{item.nome}</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {item.createdAt ? new Date(item.createdAt).toLocaleDateString('pt-BR') : '-'}
                                </p>
                              </div>
                            </div>

                            {item.status === 'in_progress' ? (
                              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 shrink-0 font-bold">
                                {pct}% • Etapa {item.currentStep || 2}/7
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0 font-bold">
                                100% Concluído
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
                            <div className="text-xs text-slate-500">
                              <strong>GC:</strong> {item.gcInfo}
                            </div>
                          )}

                          {item.ministryTarget && (
                            <div className="text-xs text-[#523A8C] font-semibold flex items-center gap-1">
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
                    <div className="text-center text-sm text-slate-400 py-8 border-2 border-dashed rounded-xl border-slate-200">
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
                <TableHead>Quadrante</TableHead>
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
                const meta = QUADRANTE_META[item.quadrante];
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
                            {pct}% • Etapa {item.currentStep || 2}/7
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
                      {meta && (
                        <Badge className={`${meta.bg} ${meta.color} hover:${meta.bg} border-none`}>
                          {meta.emoji} {meta.label}
                        </Badge>
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
                    Em andamento (Etapa {selectedPerson.currentStep || 2} de 7 • {selectedPerson.completionPercentage ?? selectedCompletion.percentage}% preenchido)
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
                        {selectedCompletion.persoDone ? 'Respondido' : `${selectedCompletion.persoAnswered}/14 escalas`}
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

              {/* Personalidade */}
              <section className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <User className="w-5 h-5 text-slate-500" /> Personalidade
                </h3>
                {QUADRANTE_META[selectedPerson.quadrante] && (
                  <div className={`p-4 rounded-xl border ${QUADRANTE_META[selectedPerson.quadrante].bg} ${QUADRANTE_META[selectedPerson.quadrante].border}`}>
                    <div className="flex items-center justify-between gap-2 font-medium mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{QUADRANTE_META[selectedPerson.quadrante].emoji}</span>
                        <span className={`text-lg ${QUADRANTE_META[selectedPerson.quadrante].color}`}>
                          {QUADRANTE_META[selectedPerson.quadrante].label}
                        </span>
                      </div>
                      {!selectedCompletion.persoDone && (
                        <Badge variant="outline" className="text-[10px] bg-white/80 text-amber-700 border-amber-200">
                          Aguardando Aula 2
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium text-slate-600 mt-1">
                      Organização: {Number(selectedPerson.orgScore || 3).toFixed(1)}/5 | Motivação: {Number(selectedPerson.motScore || 3).toFixed(1)}/5
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      * Escala de 1 a 5. <strong>Motivação</strong> mede o foco de Tarefas (1) a Pessoas (5). <strong>Organização</strong> mede de Informal/Espontâneo (1) a Formal/Estruturado (5).
                    </p>
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
                
                {!selectedPerson.aiAnalysis ? (
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
                            Gerado em {new Date(selectedPerson.aiAnalysis.generatedAt).toLocaleString('pt-BR')}
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 text-sm text-slate-700 whitespace-pre-wrap">
                        {selectedPerson.aiAnalysis.resumoServidor}
                      </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-emerald-700">Áreas Recomendadas</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="list-disc pl-4 space-y-1 text-sm text-slate-600">
                            {selectedPerson.aiAnalysis.areasRecomendadas.map((area, i) => <li key={i}>{area}</li>)}
                          </ul>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-blue-700">Próximos Passos</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="list-disc pl-4 space-y-1 text-sm text-slate-600">
                            {selectedPerson.aiAnalysis.proximosPassos.map((passo, i) => <li key={i}>{passo}</li>)}
                          </ul>
                        </CardContent>
                      </Card>
                    </div>
                    
                    {selectedPerson.aiAnalysis.alertas.length > 0 && (
                      <Card className="border-amber-200">
                        <CardHeader className="bg-amber-50 pb-2">
                          <CardTitle className="text-sm text-amber-800">Alertas / Pontos de Atenção</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 text-sm text-amber-900">
                          <ul className="list-disc pl-4 space-y-1">
                            {selectedPerson.aiAnalysis.alertas.map((alerta, i) => <li key={i}>{alerta}</li>)}
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
