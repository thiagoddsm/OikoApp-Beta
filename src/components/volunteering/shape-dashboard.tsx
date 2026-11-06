'use client';

import { useState, useEffect } from 'react';
import {
  ShapeResult,
  QUADRANTE_META,
  HABILIDADES_MAP,
  ShapeQuadrante,
  MinistryProfile,
  calculateShapeCompletion,
} from '@/types/shape';
import { DISC_META, DISC_BLINDSPOT_META, DiscMetaItem } from '@/lib/disc-meta';
import { DiscLetter } from '@/lib/disc-questions';
import { QUADRANT_BY_DISC } from '@/lib/disc';
import { calculateMinistryFit, MinistryFitResult } from '@/lib/ministry-benchmarks';
import DiscBarChart from '@/components/volunteering/shape/disc/DiscBarChart';
import DiscProfileBadge from '@/components/volunteering/shape/disc/DiscProfileBadge';
import { DiscDetailedReport } from '@/components/volunteering/shape/disc/DiscDetailedReport';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  Users,
  BarChart3,
  TrendingUp,
  HelpCircle,
  FileQuestion,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Target,
  Edit3,
  Info,
} from 'lucide-react';
import {
  getShapeResults,
  getMinistrySuggestions,
  updateMinistrySuggestions,
  getMinistryProfiles,
  updateMinistryProfiles,
} from '@/app/dashboard/volunteering/molde-de-servo/actions';
import { DEFAULT_MINISTRY_PROFILES } from '@/lib/ministry-benchmarks';
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

export type KanbanQuadrantColumnId = 
  | 'Tarefas / Formal' 
  | 'Tarefas / Informal' 
  | 'Pessoas / Formal' 
  | 'Pessoas / Informal' 
  | 'sem_quadrante';

export interface KanbanQuadrantColumnMeta {
  id: KanbanQuadrantColumnId;
  label: string;
  axis: string;
  subtitle: string;
  discEquiv: string;
  emoji: string;
  bg: string;
  border: string;
  text: string;
}

export const KANBAN_QUADRANT_COLUMNS: KanbanQuadrantColumnMeta[] = [
  {
    id: 'Tarefas / Formal',
    label: 'Tarefas / Formal',
    axis: 'Foco em Tarefas • Formal',
    subtitle: 'Processos, Excelência & Método',
    discEquiv: 'Equiv. DISC: C (Conformidade)',
    emoji: '🎯',
    bg: 'bg-blue-50/70',
    border: 'border-blue-200',
    text: 'text-blue-700',
  },
  {
    id: 'Tarefas / Informal',
    label: 'Tarefas / Informal',
    axis: 'Foco em Tarefas • Informal',
    subtitle: 'Ação Rápida, Metas & Pioneirismo',
    discEquiv: 'Equiv. DISC: D (Dominância)',
    emoji: '⚡',
    bg: 'bg-amber-50/70',
    border: 'border-amber-200',
    text: 'text-amber-700',
  },
  {
    id: 'Pessoas / Formal',
    label: 'Pessoas / Formal',
    axis: 'Foco em Pessoas • Formal',
    subtitle: 'Acolhimento Estruturado & Constância',
    discEquiv: 'Equiv. DISC: S (Estabilidade)',
    emoji: '❤️',
    bg: 'bg-rose-50/70',
    border: 'border-rose-200',
    text: 'text-rose-700',
  },
  {
    id: 'Pessoas / Informal',
    label: 'Pessoas / Informal',
    axis: 'Foco em Pessoas • Informal',
    subtitle: 'Relacionamento, Conexão & Espontaneidade',
    discEquiv: 'Equiv. DISC: I (Influência)',
    emoji: '🤝',
    bg: 'bg-emerald-50/70',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
  },
  {
    id: 'sem_quadrante',
    label: 'Aguardando Avaliação',
    axis: 'Pendente',
    subtitle: 'Em andamento ou sem classificação',
    discEquiv: 'Pendente preenchimento',
    emoji: '⚪',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    text: 'text-slate-600',
  },
];

export const normalizeQuadrant = (val?: string | null): KanbanQuadrantColumnId => {
  if (!val) return 'sem_quadrante';
  const clean = val.toLowerCase().replace(/\s+/g, ' ');
  if (clean.includes('taref') && clean.includes('informal')) return 'Tarefas / Informal';
  if (clean.includes('taref') && clean.includes('formal')) return 'Tarefas / Formal';
  if (clean.includes('pesso') && clean.includes('informal')) return 'Pessoas / Informal';
  if (clean.includes('pesso') && clean.includes('formal')) return 'Pessoas / Formal';
  return 'sem_quadrante';
};

export const getItemQuadrantColumn = (item: ShapeResult): KanbanQuadrantColumnId => {
  // 1. Tentar ler o quadrante direto do item (normalizado)
  const norm = normalizeQuadrant(item.quadrante);
  if (norm !== 'sem_quadrante') {
    return norm;
  }

  // 2. Se não tiver, derivar via DISC Primário
  if (item.discPrimary && QUADRANT_BY_DISC[item.discPrimary as DiscLetter]) {
    return QUADRANT_BY_DISC[item.discPrimary as DiscLetter] as KanbanQuadrantColumnId;
  }

  // 3. Se tiver scores antigos de personalidade motScore e orgScore
  if (typeof (item as any).motScore === 'number' && typeof (item as any).orgScore === 'number') {
    const mot = (item as any).motScore >= 3.0 ? 'Pessoas' : 'Tarefas';
    const org = (item as any).orgScore >= 3.0 ? 'Formal' : 'Informal';
    return `${mot} / ${org}` as KanbanQuadrantColumnId;
  }

  return 'sem_quadrante';
};

export function ShapeDashboard({ initialResults }: { initialResults: ShapeResult[] }) {
  const { toast } = useToast();
  const [results, setResults] = useState<ShapeResult[]>(initialResults);
  const [search, setSearch] = useState('');
  const [discFilter, setDiscFilter] = useState<string>('todos');
  const [quadranteFilter, setQuadranteFilter] = useState<string>('todos');
  const [domFilter, setDomFilter] = useState<string>('todos');
  const [view, setView] = useState<'kanban' | 'list' | 'teams'>('kanban');
  const [kanbanMode, setKanbanMode] = useState<'disc' | 'quadrantes'>('disc');

  // Estados do Raio-X de Equipes (Team Analytics)
  const [teamFilterType, setTeamFilterType] = useState<'ministry' | 'gc'>('ministry');
  const [selectedTeamName, setSelectedTeamName] = useState<string>('todos');
  
  const [selectedPerson, setSelectedPerson] = useState<ShapeResult | null>(null);
  const [showPastorFullDiscModal, setShowPastorFullDiscModal] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal de edição de áreas sugeridas & perfis vocacionais
  const [isMinistryConfigOpen, setIsMinistryConfigOpen] = useState(false);
  const [ministryProfiles, setMinistryProfiles] = useState<MinistryProfile[]>([]);
  const [newMinistryInput, setNewMinistryInput] = useState('');
  const [isSavingMinistries, setIsSavingMinistries] = useState(false);
  const [expandedMinistryId, setExpandedMinistryId] = useState<string | null>(null);

  useEffect(() => {
    getMinistryProfiles().then((profiles) => {
      if (profiles && profiles.length > 0) {
        setMinistryProfiles(profiles);
      }
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
    if (ministryProfiles.some((m) => m.nome.toLowerCase() === trimmed.toLowerCase())) {
      toast({
        variant: 'destructive',
        title: 'Área já cadastrada',
        description: 'Essa opção já consta na lista de ministérios.',
      });
      return;
    }
    const newId = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const newProf: MinistryProfile = {
      id: newId,
      nome: trimmed,
      descricao: '',
      expectativas: '',
      discRecomendado: [],
      quadranteRecomendado: 'Tarefas / Formal',
      donsRecomendados: [],
      habilidadesRecomendadas: '',
    };
    setMinistryProfiles((prev) => [newProf, ...prev]);
    setExpandedMinistryId(newId);
    setNewMinistryInput('');
  };

  const handleRemoveMinistry = (idToRemove: string) => {
    setMinistryProfiles((prev) => prev.filter((p) => p.id !== idToRemove));
    if (expandedMinistryId === idToRemove) setExpandedMinistryId(null);
  };

  const handleUpdateProfileField = (id: string, field: keyof MinistryProfile, value: any) => {
    setMinistryProfiles((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const handleToggleDisc = (id: string, letter: 'D' | 'I' | 'S' | 'C') => {
    setMinistryProfiles((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const current = p.discRecomendado || [];
        const next = current.includes(letter)
          ? current.filter((l) => l !== letter)
          : [...current, letter];
        return { ...p, discRecomendado: next };
      })
    );
  };

  const handleToggleDom = (id: string, dom: string) => {
    setMinistryProfiles((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const current = p.donsRecomendados || [];
        const next = current.includes(dom)
          ? current.filter((d) => d !== dom)
          : [...current, dom];
        return { ...p, donsRecomendados: next };
      })
    );
  };

  const handleSaveMinistries = async () => {
    setIsSavingMinistries(true);
    try {
      const res = await updateMinistryProfiles(ministryProfiles);
      if (res.success) {
        toast({
          title: 'Perfis Vocacionais atualizados com sucesso! 🎉',
          description: 'As descrições, expectativas, perfis DISC e dons das áreas foram salvos.',
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
    
    // Filtro DISC
    const itemDiscCol = getItemDiscColumn(r);
    const matchDisc = discFilter === 'todos' || itemDiscCol === discFilter;

    // Filtro Quadrante
    const itemQuadCol = getItemQuadrantColumn(r);
    const matchQuad = quadranteFilter === 'todos' || itemQuadCol === quadranteFilter;

    const top1Name = r.top3?.[0]?.nome || r.top3?.[0]?.name;
    const matchDom = domFilter === 'todos' || top1Name === domFilter;
    return matchSearch && matchDisc && matchQuad && matchDom;
  });

  // Equipes disponíveis (Ministérios e GCs) para o Team Analytics
  const availableMinistries = Array.from(
    new Set(results.map((r) => r.ministryTarget).filter((m): m is string => !!m && m.trim().length > 0))
  ).sort();

  const availableGCs = Array.from(
    new Set(results.map((r) => r.gcInfo).filter((g): g is string => !!g && g.trim().length > 0))
  ).sort();

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

  const formatAiAnalysis = (ai: any) => {
    if (!ai) return null;
    let {
      resumoServidor = '',
      areasRecomendadas = [],
      comoComunicar = [],
      comoGerenciar = [],
      evitar = [],
      perguntasEntrevista = [],
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
          if (Array.isArray(parsed.perguntasEntrevista) && parsed.perguntasEntrevista.length > 0) {
            perguntasEntrevista = parsed.perguntasEntrevista;
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
      perguntasEntrevista: Array.isArray(perguntasEntrevista) ? perguntasEntrevista : [],
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
        
        {view === 'kanban' && kanbanMode === 'quadrantes' ? (
          <Select value={quadranteFilter} onValueChange={setQuadranteFilter}>
            <SelectTrigger className="w-full md:w-[240px]">
              <SelectValue placeholder="Filtrar por Quadrante" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Quadrantes</SelectItem>
              <SelectItem value="Tarefas / Formal">🎯 Tarefas / Formal (C)</SelectItem>
              <SelectItem value="Tarefas / Informal">⚡ Tarefas / Informal (D)</SelectItem>
              <SelectItem value="Pessoas / Formal">❤️ Pessoas / Formal (S)</SelectItem>
              <SelectItem value="Pessoas / Informal">🤝 Pessoas / Informal (I)</SelectItem>
              <SelectItem value="sem_quadrante">⚪ Aguardando Avaliação</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Select value={discFilter} onValueChange={setDiscFilter}>
            <SelectTrigger className="w-full md:w-[220px]">
              <SelectValue placeholder="Perfil DISC" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Perfis DISC</SelectItem>
              <SelectItem value="D">🔴 D • Dominância</SelectItem>
              <SelectItem value="I">🟡 I • Influência</SelectItem>
              <SelectItem value="S">🟢 S • Estabilidade</SelectItem>
              <SelectItem value="C">🔵 C • Conformidade</SelectItem>
              <SelectItem value="sem_disc">⚪ Sem DISC / Legado</SelectItem>
            </SelectContent>
          </Select>
        )}

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

        <div className="flex bg-slate-100 p-1 rounded-xl">
          <Button 
            variant={view === 'kanban' && kanbanMode === 'disc' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => { setView('kanban'); setKanbanMode('disc'); }}
            className="text-xs font-bold gap-1.5"
            title="Kanban por Fatores DISC (D, I, S, C)"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Kanban DISC</span>
          </Button>
          <Button 
            variant={view === 'kanban' && kanbanMode === 'quadrantes' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => { setView('kanban'); setKanbanMode('quadrantes'); }}
            className="text-xs font-bold gap-1.5"
            title="Kanban por Eixos: Tarefas/Pessoas e Formal/Informal"
          >
            <Compass className="w-3.5 h-3.5 text-indigo-500" />
            <span>Kanban Tarefas/Pessoas</span>
          </Button>
          <Button 
            variant={view === 'list' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => setView('list')}
            className="text-xs font-bold gap-1.5"
          >
            <List className="w-3.5 h-3.5" />
            <span>Lista</span>
          </Button>
          <Button 
            variant={view === 'teams' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => setView('teams')}
            className="text-xs font-bold gap-1.5"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Raio-X de Equipes</span>
          </Button>
        </div>
      </div>

      {/* View Kanban */}
      {view === 'kanban' && (
        <div className="space-y-4">
          {/* Header explicativo do modo Kanban ativo */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                kanbanMode === 'disc' 
                  ? 'bg-red-50 text-red-600 border border-red-200' 
                  : 'bg-indigo-50 text-indigo-600 border border-indigo-200'
              }`}>
                {kanbanMode === 'disc' ? '🎯' : '🧭'}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-extrabold text-slate-900">
                    {kanbanMode === 'disc' ? 'Quadro Kanban DISC' : 'Quadro Kanban Tarefas / Pessoas (Formal x Informal)'}
                  </h3>
                  <Badge variant="outline" className={`text-[10px] font-bold ${
                    kanbanMode === 'disc' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  }`}>
                    {kanbanMode === 'disc' ? '4 Fatores Comportamentais (D, I, S, C)' : '4 Quadrantes de Personalidade SHAPE'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {kanbanMode === 'disc' 
                    ? 'Distribuição dos membros pelos 4 fatores comportamentais do inventário DISC (Dominância, Influência, Estabilidade e Conformidade).'
                    : 'Distribuição pelos eixos clássicos do SHAPE: Foco em Tarefas ou Pessoas (Motivação) e Abordagem Formal ou Informal (Organização).'}
                </p>
              </div>
            </div>

            {/* Alternador de modo Kanban */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-auto">
              <Button
                variant={kanbanMode === 'disc' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setKanbanMode('disc')}
                className="text-xs font-bold gap-1.5 h-8 rounded-lg shadow-none"
              >
                <span>🎯</span>
                <span>Kanban DISC</span>
              </Button>
              <Button
                variant={kanbanMode === 'quadrantes' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setKanbanMode('quadrantes')}
                className="text-xs font-bold gap-1.5 h-8 rounded-lg shadow-none"
              >
                <span>🧭</span>
                <span>Tarefas / Pessoas</span>
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-start min-w-[1100px]">
            {(kanbanMode === 'disc' ? KANBAN_DISC_COLUMNS : KANBAN_QUADRANT_COLUMNS).map(col => {
              const colItems = filteredResults.filter(r => 
                kanbanMode === 'disc' 
                  ? getItemDiscColumn(r) === col.id 
                  : getItemQuadrantColumn(r) === col.id
              );
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
                      {'discEquiv' in col && col.discEquiv && (
                        <p className="text-[9px] text-slate-400 font-semibold truncate mt-0.5">
                          {col.discEquiv}
                        </p>
                      )}
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
                            {/* Cabeçalho do Card: Avatar + Nome sem espremer */}
                            <div className="space-y-2">
                              <div className="flex items-start gap-2.5">
                                <Avatar className="h-9 w-9 shrink-0 mt-0.5">
                                  <AvatarFallback className={`${col.bg} ${col.text} font-black text-xs border ${col.border}`}>
                                    {renderInitials(item.nome)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                  <h4 
                                    className="font-bold text-sm text-slate-900 leading-tight break-words line-clamp-2 hover:text-[#523A8C] transition-colors"
                                    title={item.nome}
                                  >
                                    {item.nome || 'Sem Nome'}
                                  </h4>
                                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                                    <Calendar className="w-2.5 h-2.5 shrink-0" />
                                    <span>{item.createdAt ? new Date(item.createdAt).toLocaleDateString('pt-BR') : '-'}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Status / Progresso Badge */}
                              <div className="flex items-center justify-between gap-1">
                                {item.status === 'in_progress' ? (
                                  <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-200 font-bold px-2 py-0.5">
                                    ⏳ {pct}% • Etapa {item.currentStep || 2}/8
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700 border-emerald-200 font-bold px-2 py-0.5">
                                    ✓ 100% Concluído
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Badge de Perfil no Card (Contextual por modo) */}
                            <div className="pt-0.5">
                              {kanbanMode === 'quadrantes' ? (
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between gap-1 flex-wrap">
                                    <Badge variant="outline" className={`text-[10px] font-bold border ${col.border} ${col.bg} ${col.text}`}>
                                      {col.emoji} {col.label}
                                    </Badge>
                                    {item.discPrimary ? (
                                      <Badge variant="secondary" className="text-[9px] bg-slate-100 text-slate-700 font-extrabold px-1.5 py-0">
                                        DISC: {item.discProfile || item.discPrimary}
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-[9px] text-slate-500 bg-slate-50 border-slate-200">
                                        Legado
                                      </Badge>
                                    )}
                                  </div>
                                  {item.discScores ? (
                                    <DiscBarChart
                                      scores={item.discScores as any}
                                      compact
                                      className="w-full pt-1"
                                    />
                                  ) : (typeof (item as any).motScore === 'number' && typeof (item as any).orgScore === 'number') ? (
                                    <p className="text-[10px] text-slate-500 font-medium">
                                      Mot: {(item as any).motScore >= 3 ? 'Pessoas' : 'Tarefas'} ({Number((item as any).motScore).toFixed(1)}) • Org: {(item as any).orgScore >= 3 ? 'Formal' : 'Informal'} ({Number((item as any).orgScore).toFixed(1)})
                                    </p>
                                  ) : null}
                                </div>
                              ) : (
                                item.discPrimary ? (
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
                                )
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
          </div>
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

      {/* View Raio-X de Equipes (Team Analytics) */}
      {view === 'teams' && (() => {
        const teamMembers = results.filter((r) => {
          if (teamFilterType === 'ministry') {
            return selectedTeamName === 'todos' ? !!r.ministryTarget : r.ministryTarget === selectedTeamName;
          } else {
            return selectedTeamName === 'todos' ? !!r.gcInfo : r.gcInfo === selectedTeamName;
          }
        });

        const total = teamMembers.length;
        const countD = teamMembers.filter((r) => r.discPrimary === 'D').length;
        const countI = teamMembers.filter((r) => r.discPrimary === 'I').length;
        const countS = teamMembers.filter((r) => r.discPrimary === 'S').length;
        const countC = teamMembers.filter((r) => r.discPrimary === 'C').length;
        const countSemDisc = teamMembers.filter((r) => !r.discPrimary).length;

        const pctD = total > 0 ? Math.round((countD / total) * 100) : 0;
        const pctI = total > 0 ? Math.round((countI / total) * 100) : 0;
        const pctS = total > 0 ? Math.round((countS / total) * 100) : 0;
        const pctC = total > 0 ? Math.round((countC / total) * 100) : 0;

        // Mapa de Dons Coletivos da Equipe
        const giftCountMap: Record<string, { name: string; count: number; totalScore: number }> = {};
        teamMembers.forEach((m) => {
          (m.top3 || []).forEach((g) => {
            const name = g.nome || g.name || g.id;
            if (!name) return;
            if (!giftCountMap[name]) giftCountMap[name] = { name, count: 0, totalScore: 0 };
            giftCountMap[name].count += 1;
            giftCountMap[name].totalScore += g.score || 0;
          });
        });

        const topTeamGifts = Object.values(giftCountMap).sort((a, b) => b.count - a.count || b.totalScore - a.totalScore).slice(0, 4);

        // Diagnóstico Inteligente de Balanceamento
        const diagnostics: Array<{ type: 'warning' | 'alert' | 'success'; title: string; desc: string }> = [];

        if (total >= 2) {
          if (pctD >= 40) {
            diagnostics.push({
              type: 'warning',
              title: 'Atenção à Disputa de Comando (D alto)',
              desc: `${pctD}% do time possui perfil Executor (D). É crucial definir claramente os papéis e quem lidera cada frente para evitar sobreposição de autoridade.`,
            });
          } else if (countD === 0 && total >= 3) {
            diagnostics.push({
              type: 'alert',
              title: 'Falta de Impulso Executor (Sem D)',
              desc: 'Não há voluntários com perfil D primário. O time pode ter facilidade em sonhar e acolher, mas enfrentar lentidão na tomada de decisões difíceis e execução sob pressão.',
            });
          }

          if (pctI >= 45) {
            diagnostics.push({
              type: 'warning',
              title: 'Energia Social Alta (I alto)',
              desc: `${pctI}% do time possui perfil Comunicador (I). Ambiente caloroso e excelente para contato com pessoas, mas atenção para não dispersar prazos e reuniões.`,
            });
          }

          if (countS === 0 && total >= 3) {
            diagnostics.push({
              type: 'alert',
              title: 'Carência de Cuidador e Constância (Sem S)',
              desc: 'Nenhum membro possui perfil S como dominante. Há risco de sobrecarga em tarefas rotineiras de bastidores e falta de acompanhamento de longo prazo.',
            });
          }

          if (countC === 0 && total >= 3) {
            diagnostics.push({
              type: 'alert',
              title: 'Carência de Detalhe e Processos (Sem C)',
              desc: 'O time é muito voltado a pessoas e ação, mas carece de perfil analítico para checagem de regras, checklists e relatórios.',
            });
          }

          if (diagnostics.length === 0) {
            diagnostics.push({
              type: 'success',
              title: 'Equipe Bem Balanceada e Complementar',
              desc: 'Esta equipe possui uma distribuição saudável entre iniciativa, comunicação, sustentação e qualidade técnica.',
            });
          }
        }

        return (
          <div className="space-y-6">
            {/* Header e Seletores do Raio-X */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#EDE8F5] text-[#523A8C] flex items-center justify-center font-bold">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Raio-X Coletivo de Equipes & Ministérios
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  Analise o balanceamento comportamental, riscos de atrito e abundância de dons em cada equipe.
                </p>
              </div>

              {/* Controles de Filtro de Time */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setTeamFilterType('ministry');
                      setSelectedTeamName('todos');
                    }}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      teamFilterType === 'ministry'
                        ? 'bg-white text-[#523A8C] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Por Ministério
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTeamFilterType('gc');
                      setSelectedTeamName('todos');
                    }}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      teamFilterType === 'gc'
                        ? 'bg-white text-[#523A8C] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Por GC (Pequeno Grupo)
                  </button>
                </div>

                <Select value={selectedTeamName} onValueChange={setSelectedTeamName}>
                  <SelectTrigger className="w-[200px] h-9 text-xs rounded-xl font-bold">
                    <SelectValue placeholder="Selecione o grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">
                      {teamFilterType === 'ministry' ? 'Todos os Ministérios' : 'Todos os GCs'}
                    </SelectItem>
                    {(teamFilterType === 'ministry' ? availableMinistries : availableGCs).map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {total === 0 ? (
              <div className="bg-white p-12 rounded-2xl border-2 border-dashed border-slate-200 text-center space-y-2">
                <Users className="w-8 h-8 text-slate-300 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700">Nenhum voluntário encontrado neste grupo</h4>
                <p className="text-xs text-slate-400">
                  Os voluntários são vinculados a este painel conforme selecionam sua área em "Onde sente que Deus está te chamando para servir".
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Grid Superior: Distribuição DISC e Diagnóstico */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  {/* Card 1: Distribuição Comportamental da Equipe */}
                  <Card className="lg:col-span-1 rounded-2xl border-slate-200 shadow-sm">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-[#523A8C]" /> Distribuição DISC do Time
                        </CardTitle>
                        <Badge variant="secondary" className="font-extrabold text-xs">
                          {total} {total === 1 ? 'servo' : 'servos'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2.5">
                        {/* D */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-extrabold text-red-700 flex items-center gap-1.5">
                              🔴 D • Dominância (Executor)
                            </span>
                            <span className="font-black text-slate-700">
                              {countD} ({pctD}%)
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${pctD}%` }} />
                          </div>
                        </div>

                        {/* I */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-extrabold text-amber-700 flex items-center gap-1.5">
                              🟡 I • Influência (Comunicador)
                            </span>
                            <span className="font-black text-slate-700">
                              {countI} ({pctI}%)
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pctI}%` }} />
                          </div>
                        </div>

                        {/* S */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-extrabold text-emerald-700 flex items-center gap-1.5">
                              🟢 S • Estabilidade (Cuidador)
                            </span>
                            <span className="font-black text-slate-700">
                              {countS} ({pctS}%)
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pctS}%` }} />
                          </div>
                        </div>

                        {/* C */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-extrabold text-blue-700 flex items-center gap-1.5">
                              🔵 C • Conformidade (Analítico)
                            </span>
                            <span className="font-black text-slate-700">
                              {countC} ({pctC}%)
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pctC}%` }} />
                          </div>
                        </div>
                      </div>

                      {countSemDisc > 0 && (
                        <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-100">
                          * {countSemDisc} {countSemDisc === 1 ? 'membro ainda não realizou' : 'membros ainda não realizaram'} o DISC nesta equipe.
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Card 2: Diagnóstico Inteligente de Balanceamento */}
                  <Card className="lg:col-span-2 rounded-2xl border-slate-200 shadow-sm flex flex-col justify-between">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
                        <AlertTriangle className="w-4 h-4 text-amber-600" /> Diagnóstico Pastoral de Dinâmica de Equipe
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 flex-1">
                      {diagnostics.map((diag, i) => (
                        <div
                          key={i}
                          className={`p-3.5 rounded-xl border flex items-start gap-2.5 ${
                            diag.type === 'warning'
                              ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                              : diag.type === 'alert'
                              ? 'bg-blue-50/70 border-blue-200 text-blue-950'
                              : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                          }`}
                        >
                          <span className="text-base shrink-0 mt-0.5">
                            {diag.type === 'warning' ? '⚠️' : diag.type === 'alert' ? 'ℹ️' : '✨'}
                          </span>
                          <div className="space-y-0.5 min-w-0">
                            <h5 className="font-black text-xs">{diag.title}</h5>
                            <p className="text-xs leading-relaxed opacity-90">{diag.desc}</p>
                          </div>
                        </div>
                      ))}

                      {/* Forças de Dons da Equipe */}
                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        <span className="text-xs font-extrabold text-slate-700 block">
                          Dons Espirituais Mais Abundantes no Grupo:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {topTeamGifts.map((tg, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="bg-slate-50 border-slate-200 text-slate-800 text-xs py-1 px-2.5 gap-1.5 font-bold"
                            >
                              <Sparkles className="w-3 h-3 text-[#523A8C]" />
                              <span>{tg.name}</span>
                              <span className="text-[10px] text-slate-400">({tg.count} membros)</span>
                            </Badge>
                          ))}
                          {topTeamGifts.length === 0 && (
                            <span className="text-xs text-slate-400 italic">Dons pendentes de preenchimento.</span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Tabela dos Voluntários da Equipe */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#523A8C]" /> Membros do Grupo ({teamMembers.length})
                    </h4>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Servo(a)</TableHead>
                        <TableHead>Perfil DISC</TableHead>
                        <TableHead>Dom Principal</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teamMembers.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="font-bold text-xs sm:text-sm">
                            <div className="flex items-center gap-2.5">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-slate-100 text-[#523A8C] font-black text-xs">
                                  {renderInitials(m.nome)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="leading-tight">{m.nome}</p>
                                <p className="text-[10px] text-slate-400">{m.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {m.discPrimary ? (
                              <DiscProfileBadge primary={m.discPrimary as any} secondary={m.discSecondary as any} />
                            ) : (
                              <span className="text-xs text-slate-400 italic">Sem DISC</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-slate-700">
                            {m.top3?.[0]?.nome || m.top3?.[0]?.name || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold ${
                                m.status === 'completed'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {m.status === 'completed' ? '100% Concluído' : 'Em andamento'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedPerson(m)} className="text-xs font-bold">
                              Ver Ficha
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        );
      })()}

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
                        Pontuação nas 4 Dimensões (Total 12 perguntas • 120 pts):
                      </span>
                      <DiscBarChart scores={selectedPerson.discScores as any} />
                    </div>

                    {/* Mapeamento de Ponto Cego (Vulnerabilidade DISC) */}
                    {selectedPerson.discLowest && DISC_BLINDSPOT_META[selectedPerson.discLowest] && (
                      <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl space-y-1.5 mt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold uppercase text-rose-800 flex items-center gap-1.5">
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" /> Ponto Cego / Menor Afinidade: {selectedPerson.discLowest} ({selectedPerson.discLowestScore ?? 'Baixo'} pts)
                          </span>
                          <Badge variant="outline" className="text-[9px] bg-white text-rose-700 border-rose-300 font-bold">
                            Atenção Pastoral
                          </Badge>
                        </div>
                        <h5 className="text-xs font-bold text-rose-950">
                          {DISC_BLINDSPOT_META[selectedPerson.discLowest].title}
                        </h5>
                        <p className="text-xs text-rose-900/90 leading-relaxed">
                          <strong>O que evitar delegar: </strong>
                          {DISC_BLINDSPOT_META[selectedPerson.discLowest].avoidDelegating}
                        </p>
                        <p className="text-[11px] text-rose-800/80 italic">
                          <strong>Dupla complementar recomendada: </strong>
                          {DISC_BLINDSPOT_META[selectedPerson.discLowest].idealPartner}
                        </p>
                      </div>
                    )}

                    {selectedPerson.quadrante && QUADRANTE_META[selectedPerson.quadrante] && (
                      <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                        Equivalente no modelo anterior: {QUADRANTE_META[selectedPerson.quadrante].emoji} {QUADRANTE_META[selectedPerson.quadrante].label}
                      </p>
                    )}

                    {/* Botão Pastoral: Relatório Comportamental Completo */}
                    <div className="pt-3 border-t border-slate-100">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowPastorFullDiscModal(true)}
                        className="w-full bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 hover:from-purple-100 hover:to-indigo-100 text-[#523A8C] border-purple-200 text-xs font-bold gap-2 py-2.5 shadow-none"
                      >
                        <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>Abrir Diagnóstico Comportamental Completo & Liderança (Estilo CIS Assessment)</span>
                      </Button>
                    </div>
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

              {/* Match Score Vocacional por Lógica Fuzzy (IA Simbólica) */}
              {selectedPerson.discScores && (() => {
                const ministryFits = calculateMinistryFit(selectedPerson.discScores, selectedPerson.top3 || []).slice(0, 3);
                return (
                  <section className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <h3 className="font-semibold text-lg flex items-center gap-2 text-slate-900">
                        <Compass className="w-5 h-5 text-[#523A8C]" /> Áreas de Maior Aderência (Fuzzy Match)
                      </h3>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full w-fit">
                        Cálculo Simbólico (DISC + Dons)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {ministryFits.map((fit, idx) => (
                        <Card key={idx} className="rounded-2xl border-slate-200 overflow-hidden shadow-xs hover:border-[#523A8C]/30 transition-all">
                          <CardHeader className="p-3.5 pb-2 bg-slate-50 border-b border-slate-100">
                            <div className="flex items-center justify-between">
                              <span className="text-xl">{fit.benchmark.icon}</span>
                              <Badge className="bg-[#523A8C] text-white text-[10px] font-black">
                                {fit.fitPercentage}% Fit
                              </Badge>
                            </div>
                            <CardTitle className="text-xs font-bold text-slate-900 mt-1 leading-snug">
                              {fit.benchmark.name}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-3.5 space-y-2">
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] text-slate-500">
                                <span>Aderência Comportamental</span>
                                <span className="font-bold text-slate-700">{fit.discFitPercentage}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${fit.discFitPercentage}%` }} />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] text-slate-500">
                                <span>Aderência de Dons</span>
                                <span className="font-bold text-slate-700">{fit.giftsFitPercentage}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${fit.giftsFitPercentage}%` }} />
                              </div>
                            </div>

                            {fit.reasons.length > 0 && (
                              <p className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-100">
                                "{fit.reasons[0]}"
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </section>
                );
              })()}

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

                    {/* Roteiro Sugerido para Entrevista Pastoral */}
                    {activeAiAnalysis.perguntasEntrevista && activeAiAnalysis.perguntasEntrevista.length > 0 && (
                      <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-purple-50/30">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-indigo-900 flex items-center gap-1.5 font-bold">
                            <MessageSquare className="w-4 h-4 text-indigo-600" /> Roteiro Sugerido para Entrevista Pastoral
                          </CardTitle>
                          <p className="text-xs text-indigo-700/80">
                            3 perguntas personalizadas cruzando Dons, Paixões e Perfil Comportamental para aprofundar no bate-papo de alinhamento:
                          </p>
                        </CardHeader>
                        <CardContent className="space-y-3 pt-1">
                          {activeAiAnalysis.perguntasEntrevista.map((item: any, i: number) => (
                            <div key={i} className="p-3 bg-white rounded-lg border border-indigo-100 shadow-sm space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                                  {i + 1}
                                </span>
                                <Badge variant="outline" className="text-[10px] bg-indigo-50/80 text-indigo-700 border-indigo-200 font-semibold">
                                  {item.topico || `Pergunta ${i + 1}`}
                                </Badge>
                              </div>
                              <p className="text-xs sm:text-sm font-medium text-slate-800 italic pl-7">
                                "{item.pergunta}"
                              </p>
                              {item.objetivoPastoral && (
                                <p className="text-[11px] text-slate-500 pl-7 flex items-center gap-1">
                                  <span className="font-semibold text-indigo-600">🎯 Objetivo:</span> {item.objetivoPastoral}
                                </p>
                              )}
                            </div>
                          ))}
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

      {/* Modal de Configuração de Sugestões de Ministérios & Perfis Vocacionais */}
      <Dialog open={isMinistryConfigOpen} onOpenChange={setIsMinistryConfigOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-2xl">
          <div className="p-6 pb-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-purple-50/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#523A8C]/10 border border-[#523A8C]/20 flex items-center justify-center text-[#523A8C] shrink-0">
                <Compass className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                  Áreas de Serviço & Perfis Vocacionais
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Descreva o que é cada área de serviço, o que espera dos voluntários e configure o perfil ideal (DISC, dons e personalidade).
                </DialogDescription>
              </div>
            </div>

            {/* Input para adicionar nova opção */}
            <div className="flex gap-2 pt-4">
              <Input
                placeholder="Nome da nova área (Ex: Diaconia, Segurança, Teatro, Boas-Vindas...)"
                value={newMinistryInput}
                onChange={(e) => setNewMinistryInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddMinistry();
                  }
                }}
                className="h-10 text-xs rounded-xl bg-white"
              />
              <Button
                type="button"
                onClick={handleAddMinistry}
                className="bg-[#523A8C] hover:bg-[#432E75] text-white text-xs font-bold rounded-xl h-10 px-4 shrink-0 gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" /> Nova Área
              </Button>
            </div>
          </div>

          {/* Lista de Ministérios com Accordion Expansível */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {ministryProfiles.map((prof, idx) => {
              const isExpanded = expandedMinistryId === prof.id;
              return (
                <div 
                  key={prof.id || idx}
                  className={`rounded-2xl border transition-all ${
                    isExpanded 
                      ? 'border-[#523A8C]/40 bg-purple-50/15 shadow-sm' 
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  {/* Cabeçalho do Card */}
                  <div 
                    className="p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none"
                    onClick={() => setExpandedMinistryId(isExpanded ? null : prof.id)}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
                      <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 font-extrabold text-[11px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-extrabold text-sm text-slate-900 truncate">
                        {prof.nome}
                      </span>

                      {/* Resumo rápido do perfil */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {prof.discRecomendado && prof.discRecomendado.length > 0 && (
                          <div className="flex items-center gap-0.5">
                            {prof.discRecomendado.map(d => (
                              <span 
                                key={d}
                                className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                                  d === 'D' ? 'bg-red-100 text-red-700' :
                                  d === 'I' ? 'bg-amber-100 text-amber-700' :
                                  d === 'S' ? 'bg-emerald-100 text-emerald-700' :
                                  'bg-blue-100 text-blue-700'
                                }`}
                              >
                                {d}
                              </span>
                            ))}
                          </div>
                        )}

                        {prof.quadranteRecomendado && (
                          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            {prof.quadranteRecomendado}
                          </span>
                        )}

                        {prof.donsRecomendados && prof.donsRecomendados.length > 0 && (
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                            {prof.donsRecomendados.length} dons
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedMinistryId(isExpanded ? null : prof.id)}
                        className="h-8 px-2.5 text-xs font-bold text-slate-600 gap-1 rounded-xl"
                      >
                        {isExpanded ? (
                          <>
                            <span>Recolher</span>
                            <ChevronUp className="w-3.5 h-3.5" />
                          </>
                        ) : (
                          <>
                            <span>Editar Perfil</span>
                            <ChevronDown className="w-3.5 h-3.5" />
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveMinistry(prof.id)}
                        className="h-8 w-8 text-slate-400 hover:text-red-600 rounded-xl"
                        title="Excluir Área"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Detalhes Expansíveis */}
                  {isExpanded && (
                    <div className="p-4 pt-1 border-t border-slate-100 space-y-4 text-xs">
                      {/* Nome da Área */}
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 flex items-center gap-1.5">
                          Nome da Área
                        </label>
                        <Input
                          value={prof.nome}
                          onChange={(e) => handleUpdateProfileField(prof.id, 'nome', e.target.value)}
                          className="h-9 text-xs rounded-xl bg-white"
                        />
                      </div>

                      {/* 1. O que é a Área */}
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 flex items-center justify-between">
                          <span>O que é esta Área (Propósito & Atividades)</span>
                          <span className="text-[10px] text-slate-400 font-normal">Aparece para o aluno no Molde de Servo</span>
                        </label>
                        <Textarea
                          rows={2}
                          placeholder="Ex: Condução congregacional da igreja no louvor e adoração através da música, arranjos e comunhão no altar..."
                          value={prof.descricao}
                          onChange={(e) => handleUpdateProfileField(prof.id, 'descricao', e.target.value)}
                          className="text-xs rounded-xl bg-white resize-none"
                        />
                      </div>

                      {/* 2. O que esperamos das pessoas */}
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 flex items-center justify-between">
                          <span>O que esperamos dos voluntários (Expectativas & Compromisso)</span>
                          <span className="text-[10px] text-slate-400 font-normal">Pontualidade, frequência, postura e rotina</span>
                        </label>
                        <Textarea
                          rows={2}
                          placeholder="Ex: Pontualidade nos ensaios às quintas, consagração espiritual, alinhamento pastoral e postura humilde de servo..."
                          value={prof.expectativas}
                          onChange={(e) => handleUpdateProfileField(prof.id, 'expectativas', e.target.value)}
                          className="text-xs rounded-xl bg-white resize-none"
                        />
                      </div>

                      {/* 3. Perfil Comportamental Ideal (DISC) */}
                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-700 flex items-center justify-between">
                          <span>Perfil Comportamental Ideal (DISC)</span>
                          <span className="text-[10px] text-slate-400 font-normal">Clique para ativar os fatores prioritários</span>
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { key: 'D', label: '🔴 D • Dominância', desc: 'Executor & Pioneiro' },
                            { key: 'I', label: '🟡 I • Influência', desc: 'Comunicador & Conector' },
                            { key: 'S', label: '🟢 S • Estabilidade', desc: 'Cuidador & Constante' },
                            { key: 'C', label: '🔵 C • Conformidade', desc: 'Analítico & Detalhista' },
                          ].map((item) => {
                            const active = (prof.discRecomendado || []).includes(item.key as any);
                            return (
                              <button
                                key={item.key}
                                type="button"
                                onClick={() => handleToggleDisc(prof.id, item.key as any)}
                                className={`p-2.5 rounded-xl border text-left transition-all ${
                                  active
                                    ? 'border-[#523A8C] bg-[#523A8C]/10 text-[#523A8C] shadow-xs'
                                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                                }`}
                              >
                                <p className="font-extrabold text-xs">{item.label}</p>
                                <p className="text-[10px] text-slate-500 mt-0.5">{item.desc}</p>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 4. Quadrante Clássico Recomendado */}
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">
                          Quadrante Clássico de Personalidade (SHAPE)
                        </label>
                        <Select
                          value={prof.quadranteRecomendado || 'Tarefas / Formal'}
                          onValueChange={(val) => handleUpdateProfileField(prof.id, 'quadranteRecomendado', val)}
                        >
                          <SelectTrigger className="h-9 text-xs rounded-xl bg-white">
                            <SelectValue placeholder="Selecione o quadrante" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Tarefas / Formal">🎯 Tarefas / Formal (Processos & Estrutura)</SelectItem>
                            <SelectItem value="Tarefas / Informal">⚡ Tarefas / Informal (Ação Rápida & Metas)</SelectItem>
                            <SelectItem value="Pessoas / Formal">❤️ Pessoas / Formal (Acolhimento & Método)</SelectItem>
                            <SelectItem value="Pessoas / Informal">🤝 Pessoas / Informal (Relacionamento & Espontâneo)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* 5. Dons Espirituais Recomendados */}
                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-700 flex items-center justify-between">
                          <span>Dons Espirituais Recomendados</span>
                          <span className="text-[10px] text-slate-400 font-normal">Selecione os dons que combinam com este ministério</span>
                        </label>
                        <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl border border-slate-200 bg-white max-h-36 overflow-y-auto">
                          {DONS.map((dom) => {
                            const isDomActive = (prof.donsRecomendados || []).includes(dom);
                            return (
                              <button
                                key={dom}
                                type="button"
                                onClick={() => handleToggleDom(prof.id, dom)}
                                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                                  isDomActive
                                    ? 'bg-[#523A8C] text-white border-[#523A8C] shadow-xs'
                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {isDomActive && <Check className="w-3 h-3 inline mr-1" />}
                                {dom}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 6. Habilidades e Requisitos Específicos */}
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">
                          Habilidades / Requisitos Práticos
                        </label>
                        <Input
                          value={prof.habilidadesRecomendadas || ''}
                          onChange={(e) => handleUpdateProfileField(prof.id, 'habilidadesRecomendadas', e.target.value)}
                          placeholder="Ex: Canto, instrumento, facilidade com softwares de projeção, didática infantil..."
                          className="h-9 text-xs rounded-xl bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {ministryProfiles.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <Compass className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600">Nenhuma área cadastrada</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Clique em "Nova Área" acima para começar.</p>
              </div>
            )}
          </div>

          <DialogFooter className="p-4 px-6 border-t border-slate-100 bg-slate-50 gap-2 sm:gap-0">
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
              className="bg-[#523A8C] hover:bg-[#432E75] text-white text-xs font-bold rounded-xl gap-1.5 shadow-sm"
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

      {/* Modal Pastoral: Relatório Comportamental Completo Estilo CIS Assessment */}
      <Dialog open={showPastorFullDiscModal} onOpenChange={setShowPastorFullDiscModal}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 rounded-3xl">
          <DialogHeader className="pb-2 border-b border-slate-100">
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" /> Relatório Comportamental Completo & Estilos de Liderança
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Mapeamento aprofundado com base nos 120 pontos do inventário DISC de {selectedPerson?.nome}
            </DialogDescription>
          </DialogHeader>

          {selectedPerson && selectedPerson.discPrimary && selectedPerson.discScores && (
            <div className="py-2">
              <DiscDetailedReport
                scores={selectedPerson.discScores as any}
                primary={selectedPerson.discPrimary as any}
                secondary={selectedPerson.discSecondary as any}
                lowest={selectedPerson.discLowest as any}
                personName={selectedPerson.nome || 'Servo(a)'}
              />
            </div>
          )}

          <DialogFooter className="pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPastorFullDiscModal(false)}
              className="text-xs font-bold rounded-xl"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
