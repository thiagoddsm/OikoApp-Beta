'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { listarDiagnosticos, type DiagnosticoItem } from './actions';
import {
  DOMINIOS_DIAGNOSTICO,
  ESCALA_AVALIACAO,
  calcularResultadosDiagnostico,
  PASTORES_OFICIAIS,
  normalizarPastorNome,
} from '@/lib/diagnostico-rede-data';
import {
  Church,
  User,
  Phone,
  MapPin,
  Calendar,
  Eye,
  Search,
  ExternalLink,
  Copy,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  X,
  Share2,
  Users,
  BarChart3,
  Award,
  Filter,
} from 'lucide-react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { useToast } from '@/hooks/use-toast';

export default function DiagnosticosDashboardPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [diagnosticos, setDiagnosticos] = useState<DiagnosticoItem[]>([]);
  const [busca, setBusca] = useState('');
  const [pastorFiltro, setPastorFiltro] = useState<string>('todos');
  const [abaAtiva, setAbaAtiva] = useState<'lista' | 'comparativo'>('lista');
  const [selecionado, setSelecionado] = useState<DiagnosticoItem | null>(null);

  const carregar = async () => {
    setLoading(true);
    const res = await listarDiagnosticos();
    if (res.success) {
      setDiagnosticos(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    carregar();
  }, []);

  // Diagnósticos enriquecidos com cálculos e pastor normalizado
  const diagnosticosComCalculo = useMemo(() => {
    return diagnosticos.map((item) => {
      const pastorNormalizado = normalizarPastorNome(item.identificacao.pastor_nome);
      const calc = calcularResultadosDiagnostico(item.respostas || {});
      return {
        ...item,
        identificacao: {
          ...item.identificacao,
          pastor_nome: pastorNormalizado,
        },
        calculado: calc,
      };
    });
  }, [diagnosticos]);

  // Lista filtrada por pastor e busca
  const filtrados = useMemo(() => {
    return diagnosticosComCalculo.filter((d) => {
      const matchPastor =
        pastorFiltro === 'todos' || d.identificacao.pastor_nome === pastorFiltro;
      if (!matchPastor) return false;

      if (!busca.trim()) return true;
      const term = busca.toLowerCase();
      return (
        d.identificacao.igreja_nome?.toLowerCase().includes(term) ||
        d.identificacao.pastor_nome?.toLowerCase().includes(term) ||
        d.identificacao.cidade?.toLowerCase().includes(term)
      );
    });
  }, [diagnosticosComCalculo, pastorFiltro, busca]);

  // Estatísticas do Pastor Selecionado (ou Geral)
  const analisePastor = useMemo(() => {
    const lista =
      pastorFiltro === 'todos'
        ? diagnosticosComCalculo
        : diagnosticosComCalculo.filter(
            (d) => d.identificacao.pastor_nome === pastorFiltro
          );

    const total = lista.length;
    if (total === 0) return null;

    const mediaGlobal = Math.round(
      lista.reduce((acc, d) => acc + d.calculado.scoreGlobal, 0) / total
    );

    // Média de cada um dos 5 domínios
    const mediasDominios = DOMINIOS_DIAGNOSTICO.map((dom) => {
      const sumDom = lista.reduce((acc, d) => {
        const domCalc = d.calculado.dominios.find((cd) => cd.id === dom.id);
        return acc + (domCalc ? domCalc.score : 0);
      }, 0);
      return {
        id: dom.id,
        nome: dom.nome,
        nomeCurto: dom.nome.split(' & ')[0],
        score: Math.round(sumDom / total),
      };
    });

    const ordenados = [...mediasDominios].sort((a, b) => b.score - a.score);
    const melhorDominio = ordenados[0];
    const piorDominio = ordenados[ordenados.length - 1];

    const radar = mediasDominios.map((d) => ({
      dominio: d.nomeCurto,
      score: d.score,
      fullMark: 100,
    }));

    return {
      total,
      mediaGlobal,
      mediasDominios,
      melhorDominio,
      piorDominio,
      radar,
    };
  }, [diagnosticosComCalculo, pastorFiltro]);

  // Comparativo consolidado entre todos os 5 pastores oficiais
  const comparativoPastores = useMemo(() => {
    return PASTORES_OFICIAIS.map((pastorNome) => {
      const lista = diagnosticosComCalculo.filter(
        (d) => d.identificacao.pastor_nome === pastorNome
      );
      const total = lista.length;

      if (total === 0) {
        return {
          nome: pastorNome,
          total: 0,
          mediaGlobal: 0,
          dominios: DOMINIOS_DIAGNOSTICO.map((dom) => ({ id: dom.id, score: 0 })),
        };
      }

      const mediaGlobal = Math.round(
        lista.reduce((acc, d) => acc + d.calculado.scoreGlobal, 0) / total
      );

      const dominios = DOMINIOS_DIAGNOSTICO.map((dom) => {
        const sumDom = lista.reduce((acc, d) => {
          const domCalc = d.calculado.dominios.find((cd) => cd.id === dom.id);
          return acc + (domCalc ? domCalc.score : 0);
        }, 0);
        return {
          id: dom.id,
          score: Math.round(sumDom / total),
        };
      });

      return {
        nome: pastorNome,
        total,
        mediaGlobal,
        dominios,
      };
    });
  }, [diagnosticosComCalculo]);

  const copiarLinkPublico = () => {
    const url = 'https://ibmanha.com.br/diagnostico';
    navigator.clipboard.writeText(url);
    toast({
      title: 'Link copiado!',
      description: 'O link do formulário público foi copiado para a área de transferência.',
    });
  };

  // Detalhes do item selecionado para o modal
  const detalhesSelecionado = useMemo(() => {
    if (!selecionado) return null;
    return calcularResultadosDiagnostico(selecionado.respostas || {});
  }, [selecionado]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-[10px] font-black uppercase tracking-wider">
              Gestão Ministerial • Igreja Batista da Manhã
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            Diagnósticos de Igrejas
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Acompanhe o índice de saúde, filtre por pastor e compare as médias dos 5 domínios ministeriais.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copiarLinkPublico}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-2 shadow-xs transition-all"
          >
            <Copy className="w-3.5 h-3.5" /> Copiar Link Público
          </button>
          <a
            href="/diagnostico"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Abrir Formulário
          </a>
        </div>
      </div>

      {/* FILTRO DE PASTORES (BARRA SUPERIOR) */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs space-y-2">
        <div className="flex items-center justify-between px-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-indigo-600" /> Filtrar por Pastor Avaliador:
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setAbaAtiva('lista')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                abaAtiva === 'lista'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Visão Detalhada
            </button>
            <button
              type="button"
              onClick={() => setAbaAtiva('comparativo')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                abaAtiva === 'comparativo'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Comparativo Geral (5 Pastores)
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => setPastorFiltro('todos')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all border ${
              pastorFiltro === 'todos'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Todos os Pastores ({diagnosticos.length})
          </button>

          {PASTORES_OFICIAIS.map((pNome) => {
            const count = diagnosticosComCalculo.filter(
              (d) => d.identificacao.pastor_nome === pNome
            ).length;
            const isSelected = pastorFiltro === pNome;

            return (
              <button
                key={pNome}
                type="button"
                onClick={() => setPastorFiltro(pNome)}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all border flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>{pNome}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* PAINEL DE ANÁLISE E MÉDIAS DO PASTOR SELECIONADO */}
      {analisePastor && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600">
                {pastorFiltro === 'todos'
                  ? 'Média Geral Consolidada'
                  : `Análise de Respostas: ${pastorFiltro}`}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                {pastorFiltro === 'todos'
                  ? 'Todas as Avaliações Registradas'
                  : `Perfil Avaliativo de ${pastorFiltro}`}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-bold">
                {analisePastor.total} {analisePastor.total === 1 ? 'avaliação' : 'avaliações'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            {/* Score Médio Geral */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 text-center flex flex-col items-center justify-center space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Índice de Prevalência Médio
              </span>
              <div className="text-5xl font-black text-slate-900 tracking-tight">
                {analisePastor.mediaGlobal}%
              </div>
              <div
                className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border ${
                  analisePastor.mediaGlobal >= 71
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : analisePastor.mediaGlobal >= 41
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                {analisePastor.mediaGlobal >= 71
                  ? 'Prevalecente'
                  : analisePastor.mediaGlobal >= 41
                  ? 'Desenvolvimento'
                  : 'Sobrevivência'}
              </div>

              {/* Destaque Maior e Menor */}
              <div className="w-full pt-4 mt-2 border-t border-slate-200/60 grid grid-cols-2 gap-2 text-left text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block">Ponto Mais Forte</span>
                  <strong className="text-emerald-700 block truncate">
                    {analisePastor.melhorDominio.nomeCurto} ({analisePastor.melhorDominio.score}%)
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block">Mais Desafiador</span>
                  <strong className="text-rose-700 block truncate">
                    {analisePastor.piorDominio.nomeCurto} ({analisePastor.piorDominio.score}%)
                  </strong>
                </div>
              </div>
            </div>

            {/* Radar Chart Consolidado */}
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={analisePastor.radar}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis
                    dataKey="dominio"
                    tick={{ fill: '#475569', fontSize: 11, fontWeight: 700 }}
                  />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#cbd5e1" />
                  <Radar
                    name="Média"
                    dataKey="score"
                    stroke="#4f46e5"
                    fill="#6366f1"
                    fillOpacity={0.45}
                  />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Barras de Médias dos 5 Domínios */}
            <div className="space-y-2.5">
              {analisePastor.mediasDominios.map((d) => (
                <div key={d.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-slate-700">{d.nome}</span>
                    <span className="font-black text-slate-900">{d.score}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        d.score >= 75
                          ? 'bg-emerald-500'
                          : d.score >= 60
                          ? 'bg-indigo-600'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${d.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 1: VISÃO DE LISTA DE DIAGNÓSTICOS                          */}
      {/* ============================================================== */}
      {abaAtiva === 'lista' && (
        <div className="space-y-4">
          {/* Barra de Busca Livre */}
          <div className="bg-white rounded-2xl p-3 border border-slate-200/90 shadow-xs flex items-center gap-3">
            <Search className="w-4 h-4 text-slate-400 ml-2" />
            <input
              type="text"
              placeholder="Buscar por nome da igreja ou cidade..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="flex-1 bg-transparent text-xs sm:text-sm outline-none placeholder:text-slate-400"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca('')}
                className="text-xs text-slate-400 hover:text-slate-600 mr-2"
              >
                Limpar
              </button>
            )}
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs font-bold">
              Carregando diagnósticos recebidos...
            </div>
          ) : filtrados.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
              <Church className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-extrabold text-slate-800">
                Nenhum diagnóstico para o filtro selecionado
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {pastorFiltro !== 'todos'
                  ? `O ${pastorFiltro} ainda não possui avaliações registradas.`
                  : 'Nenhum resultado corresponde à sua busca.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtrados.map((item) => {
                const score = item.calculado.scoreGlobal;
                const status = item.calculado.statusIgreja.nome;
                const dataStr = item.createdAt
                  ? new Date(item.createdAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Data recente';

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {dataStr}
                        </span>
                        <span
                          className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                            score >= 71
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : score >= 41
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {status} ({score}%)
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-black text-slate-900 leading-tight">
                          {item.identificacao.igreja_nome}
                        </h3>
                        <p className="text-xs text-slate-600 font-bold mt-1 flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-indigo-600" />
                          {item.identificacao.pastor_nome}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            {item.identificacao.cidade} - {item.identificacao.uf}
                          </span>
                        </div>
                        {item.identificacao.telefone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{item.identificacao.telefone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-[11px] pt-0.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Avaliação Anônima & Secreta</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                      {item.identificacao.telefone && (
                        <a
                          href={`https://wa.me/55${item.identificacao.telefone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all font-bold text-xs flex items-center justify-center"
                          title="Conversar no WhatsApp"
                        >
                          <Share2 className="w-4 h-4" />
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => setSelecionado(item)}
                        className="flex-1 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5" /> Ver Gabarito (75)
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 2: COMPARATIVO GERAL ENTRE OS 5 PASTORES                   */}
      {/* ============================================================== */}
      {abaAtiva === 'comparativo' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              Comparativo Consolidado entre os Pastores
            </h3>
            <p className="text-xs text-slate-500">
              Média geral e desempenho avaliado em cada um dos 5 domínios institucionais.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-black uppercase text-[10px]">
                  <th className="py-3 px-3">Pastor</th>
                  <th className="py-3 px-3 text-center">Avaliações</th>
                  <th className="py-3 px-3 text-center">Média Geral</th>
                  <th className="py-3 px-3 text-center">Fundamentos</th>
                  <th className="py-3 px-3 text-center">Liderança</th>
                  <th className="py-3 px-3 text-center">Espiritualidade</th>
                  <th className="py-3 px-3 text-center">Comunidade</th>
                  <th className="py-3 px-3 text-center">Missão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {comparativoPastores.map((pastor) => (
                  <tr
                    key={pastor.nome}
                    className="hover:bg-slate-50/80 cursor-pointer transition-all"
                    onClick={() => {
                      setPastorFiltro(pastor.nome);
                      setAbaAtiva('lista');
                    }}
                  >
                    <td className="py-3.5 px-3">
                      <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-indigo-600" /> {pastor.nome}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 font-bold text-slate-700">
                        {pastor.total}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full font-black ${
                          pastor.mediaGlobal >= 71
                            ? 'bg-emerald-100 text-emerald-800'
                            : pastor.mediaGlobal >= 41
                            ? 'bg-amber-100 text-amber-800'
                            : pastor.total > 0
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {pastor.total > 0 ? `${pastor.mediaGlobal}%` : '—'}
                      </span>
                    </td>
                    {pastor.dominios.map((dom) => (
                      <td key={dom.id} className="py-3.5 px-3 text-center">
                        <span
                          className={`font-bold ${
                            pastor.total === 0
                              ? 'text-slate-300'
                              : dom.score >= 75
                              ? 'text-emerald-600'
                              : dom.score >= 60
                              ? 'text-indigo-600'
                              : 'text-amber-600'
                          }`}
                        >
                          {pastor.total > 0 ? `${dom.score}%` : '—'}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Detalhamento Completo (Gabarito das 75 Afirmações) */}
      {selecionado && detalhesSelecionado && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col">
            {/* Top Modal Header */}
            <div className="p-6 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur-sm z-10 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-500">
                  Gabarito de Respostas do Pastor
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  {selecionado.identificacao.igreja_nome}
                </h2>
                <p className="text-xs text-slate-500">
                  Pastor: <strong>{selecionado.identificacao.pastor_nome}</strong> • {selecionado.identificacao.cidade} - {selecionado.identificacao.uf}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelecionado(null)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-6 space-y-6">
              {/* Resumo do Score */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center bg-slate-50 p-5 rounded-2xl border border-slate-200/80">
                <div className="text-center sm:text-left">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Índice de Prevalência
                  </span>
                  <div className="text-4xl font-black text-slate-900 mt-0.5">
                    {detalhesSelecionado.scoreGlobal}%
                  </div>
                  <div className="text-xs font-extrabold text-indigo-600 mt-1">
                    {detalhesSelecionado.statusIgreja.nome}
                  </div>
                </div>

                <div className="sm:col-span-2 text-xs text-slate-600 leading-relaxed font-medium">
                  {detalhesSelecionado.statusIgreja.descricao}
                </div>
              </div>

              {/* Radar dos 5 Domínios */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                  Pontuação dos 5 Domínios nesta Avaliação
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                  {detalhesSelecionado.dominios.map((dom) => (
                    <div key={dom.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="font-extrabold text-slate-700 line-clamp-1">{dom.nome}</div>
                      <div className="text-lg font-black text-indigo-600 mt-1">{dom.score}%</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* TODAS AS 75 PERGUNTAS E RESPOSTAS */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-base font-extrabold text-slate-900">
                    Gabarito Completo das 75 Afirmações
                  </h3>
                  <span className="text-xs text-slate-400 font-bold">
                    Escala de 1 (Crítico) a 5 (Excelente)
                  </span>
                </div>

                {DOMINIOS_DIAGNOSTICO.map((dominio) => (
                  <div
                    key={dominio.id}
                    className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-black text-slate-900">
                        {dominio.nome}
                      </h4>
                      <span className="text-xs font-black text-indigo-600">
                        Score: {detalhesSelecionado.dominios.find((d) => d.id === dominio.id)?.score}%
                      </span>
                    </div>

                    <div className="space-y-3">
                      {dominio.principios.map((principio) => (
                        <div
                          key={principio.numero}
                          className="bg-white rounded-xl p-3 border border-slate-200/80 space-y-2"
                        >
                          <div className="text-xs font-bold text-slate-800">
                            Princípio {principio.numero}: {principio.nome}
                          </div>

                          <div className="space-y-1.5">
                            {principio.questoes.map((q, idx) => {
                              const valor = selecionado.respostas[q.id] || 1;
                              const rotulo =
                                ESCALA_AVALIACAO.find((e) => e.valor === valor)?.shortLabel || '';

                              return (
                                <div
                                  key={q.id}
                                  className="flex items-center justify-between gap-3 text-xs p-2 rounded-lg bg-slate-50 border border-slate-100"
                                >
                                  <span className="text-slate-700 font-medium leading-snug">
                                    <span className="text-slate-400 font-bold mr-1">#{idx + 1}</span>
                                    {q.texto}
                                  </span>

                                  <span
                                    className={`shrink-0 px-2.5 py-0.5 rounded-md font-black text-[11px] ${
                                      valor >= 4
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : valor === 3
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-rose-100 text-rose-800'
                                    }`}
                                  >
                                    Nota {valor} • {rotulo}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-3xl flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelecionado(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
