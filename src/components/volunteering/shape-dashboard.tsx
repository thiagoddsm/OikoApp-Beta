'use client';

import { useState } from 'react';
import { ShapeResult, QUADRANTE_META, HABILIDADES_MAP, ShapeQuadrante } from '@/types/shape';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, LayoutGrid, List, Sparkles, User, Briefcase, Heart, Calendar, RefreshCw } from 'lucide-react';
import { getShapeResults } from '@/app/dashboard/volunteering/molde-de-servo/actions';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const DONS = [
  'Administração', 'Apostolado', 'Artesanato', 'Comunicação Criativa', 'Discernimento',
  'Encorajamento', 'Evangelismo', 'Fé', 'Contribuição', 'Serviço',
  'Hospitalidade', 'Intercessão', 'Conhecimento', 'Liderança', 'Misericórdia',
  'Profecia', 'Pastorado', 'Ensino', 'Sabedoria'
];

export function ShapeDashboard({ initialResults }: { initialResults: ShapeResult[] }) {
  const [results, setResults] = useState<ShapeResult[]>(initialResults);
  const [search, setSearch] = useState('');
  const [quadranteFilter, setQuadranteFilter] = useState<string>('todos');
  const [domFilter, setDomFilter] = useState<string>('todos');
  const [habilidadeFilter, setHabilidadeFilter] = useState<string>('todos');
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  
  const [selectedPerson, setSelectedPerson] = useState<ShapeResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  

  const filteredResults = results.filter(r => {
    const matchSearch = r.nome.toLowerCase().includes(search.toLowerCase()) || r.email.toLowerCase().includes(search.toLowerCase());
    const matchQuadrante = quadranteFilter === 'todos' || r.quadrante === quadranteFilter;
    const matchDom = domFilter === 'todos' || r.top3?.[0]?.nome === domFilter;
    return matchSearch && matchQuadrante && matchDom;
  });

  
  const HEART_LABELS: Record<string, string> = {
    h1: 'O que me impulsiona',
    h2: 'Quem eu quero alcançar',
    h3: 'Necessidades que amo suprir',
    h4: 'Causa que mais me engaja',
    h5: 'Maior sonho para o Reino'
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

  const renderInitials = (name: string) => name.substring(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
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
                  {colItems.map(item => (
                    <Card 
                      key={item.id} 
                      className="cursor-pointer hover:shadow-md transition-all hover:border-slate-300"
                      onClick={() => setSelectedPerson(item)}
                    >
                      <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between items-start">
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
                                {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          </div>
                        </div>

                        {item.gcInfo && (
                          <div className="text-xs text-slate-500">
                            <strong>GC:</strong> {item.gcInfo}
                          </div>
                        )}

                        <div className="flex flex-wrap gap-1 mt-2">
                          {item.top3?.map((dom, i) => (
                            <Badge key={i} variant="outline" className="text-[10px] py-0 px-1.5 h-5 bg-slate-50">
                              {dom.nome}
                            </Badge>
                          ))}
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
                  ))}
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
                <TableHead>Quadrante</TableHead>
                <TableHead>Top 1 Dom</TableHead>
                <TableHead>Habilidades</TableHead>
                <TableHead>GC</TableHead>
                <TableHead>Data</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResults.map(item => {
                const meta = QUADRANTE_META[item.quadrante];
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.nome}</TableCell>
                    <TableCell>
                      {meta && (
                        <Badge className={`${meta.bg} ${meta.color} hover:${meta.bg} border-none`}>
                          {meta.emoji} {meta.label}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{item.top3?.[0]?.nome}</TableCell>
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
                    <TableCell>{new Date(item.createdAt).toLocaleDateString('pt-BR')}</TableCell>
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
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum resultado encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog Detalhes */}
      <Dialog open={!!selectedPerson} onOpenChange={(open) => !open && setSelectedPerson(null)}>
        {selectedPerson && (
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">{selectedPerson.nome}</DialogTitle>
              <DialogDescription className="flex flex-wrap gap-x-4 gap-y-2 mt-2">
                <span><strong>Email:</strong> {selectedPerson.email}</span>
                {selectedPerson.telefone && <span><strong>Tel:</strong> {selectedPerson.telefone}</span>}
                {selectedPerson.gcInfo && <span><strong>GC:</strong> {selectedPerson.gcInfo}</span>}
                {selectedPerson.formacao && <span><strong>Formação:</strong> {selectedPerson.formacao}</span>}
                  {selectedPerson.profissao && <span><strong>Profissão:</strong> {selectedPerson.profissao}</span>}
                <span><strong>Data:</strong> {new Date(selectedPerson.createdAt).toLocaleDateString('pt-BR')}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              
              {/* Personalidade */}
              <section className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <User className="w-5 h-5 text-slate-500" /> Personalidade
                </h3>
                {QUADRANTE_META[selectedPerson.quadrante] && (
                  <div className={`p-4 rounded-xl border ${QUADRANTE_META[selectedPerson.quadrante].bg} ${QUADRANTE_META[selectedPerson.quadrante].border}`}>
                    <div className="flex items-center gap-2 font-medium mb-2">
                      <span className="text-2xl">{QUADRANTE_META[selectedPerson.quadrante].emoji}</span>
                      <span className={`text-lg ${QUADRANTE_META[selectedPerson.quadrante].color}`}>
                        {QUADRANTE_META[selectedPerson.quadrante].label}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-600 mt-1">
                      Organização: {Number(selectedPerson.orgScore).toFixed(1)}/5 | Motivação: {Number(selectedPerson.motScore).toFixed(1)}/5
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {selectedPerson.top3?.map((dom, i) => (
                    <Card key={i} className="bg-slate-50">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-bold flex justify-between">
                          {dom.nome}
                          <Badge variant="secondary">{dom.score}pts</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 text-xs text-slate-500">
                        {dom.desc || 'Sem descrição.'}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>

              {/* Habilidades */}
              <section className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-slate-500" /> Habilidades Profissionais
                </h3>
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
    </div>
  );
}



