'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { listarDiagnosticos, type DiagnosticoItem } from './actions';
import {
  DOMINIOS_DIAGNOSTICO,
  ESCALA_AVALIACAO,
  calcularResultadosDiagnostico,
} from '@/lib/diagnostico-rede-data';
import {
  Church,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Eye,
  Search,
  ExternalLink,
  Copy,
  Printer,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  X,
  Share2,
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

  const filtrados = useMemo(() => {
    if (!busca.trim()) return diagnosticos;
    const term = busca.toLowerCase();
    return diagnosticos.filter(
      (d) =>
        d.identificacao.igreja_nome?.toLowerCase().includes(term) ||
        d.identificacao.pastor_nome?.toLowerCase().includes(term) ||
        d.identificacao.cidade?.toLowerCase().includes(term)
    );
  }, [diagnosticos, busca]);

  const copiarLinkPublico = () => {
    const url = 'https://ibmanha.com.br/diagnostico';
    navigator.clipboard.writeText(url);
    toast({
      title: 'Link copiado!',
      description: 'O link do formulário público foi copiado para a área de transferência.',
    });
  };

  // Resultados recalculados para o item selecionado (caso falte algum campo de display)
  const detalhesSelecionado = useMemo(() => {
    if (!selecionado) return null;
    return calcularResultadosDiagnostico(selecionado.respostas || {});
  }, [selecionado]);

  const radarData = useMemo(() => {
    if (!detalhesSelecionado) return [];
    return detalhesSelecionado.dominios.map((d) => ({
      dominio: d.nome.split(' & ')[0],
      score: d.score,
      fullMark: 100,
    }));
  }, [detalhesSelecionado]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-[10px] font-black uppercase tracking-wider">
              Gestão Ministerial
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            Diagnósticos de Igrejas
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Acompanhe as respostas e o índice de saúde das igrejas que preencheram o diagnóstico institucional.
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

      {/* Cards de Métricas Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Total de Diagnósticos
            </span>
            <div className="text-3xl font-black text-slate-900 mt-1">
              {diagnosticos.length}
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
            <Church className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Média de Prevalência
            </span>
            <div className="text-3xl font-black text-slate-900 mt-1">
              {diagnosticos.length > 0
                ? Math.round(
                    diagnosticos.reduce((acc, d) => acc + (d.resultados?.scoreGlobal || 0), 0) /
                      diagnosticos.length
                  )
                : 0}
              %
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Link de Divulgação
            </span>
            <div className="text-sm font-bold text-indigo-600 truncate mt-1">
              ibmanha.com.br/diagnostico
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Barra de Busca */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200/90 shadow-xs flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400 ml-2" />
        <input
          type="text"
          placeholder="Buscar por nome da igreja, pastor ou cidade..."
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

      {/* Lista de Diagnósticos */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs font-bold">
          Carregando diagnósticos recebidos...
        </div>
      ) : filtrados.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
          <Church className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-extrabold text-slate-800">
            Nenhum diagnóstico encontrado
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Compartilhe o link <strong>ibmanha.com.br/diagnostico</strong> com pastores e líderes para coletar as primeiras respostas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtrados.map((item) => {
            const score = item.resultados?.scoreGlobal ?? 0;
            const status = item.resultados?.statusIgreja?.nome || 'Desenvolvimento';
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
                    <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      Pr. {item.identificacao.pastor_nome}
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
                    {item.identificacao.email && (
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{item.identificacao.email}</span>
                      </div>
                    )}
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
                    <Eye className="w-3.5 h-3.5" /> Ver Respostas (75)
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Detalhamento Completo */}
      {selecionado && detalhesSelecionado && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col">
            {/* Top Modal Header */}
            <div className="p-6 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur-sm z-10 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-500">
                  Detalhamento de Respostas
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
                  Pontuação dos 5 Domínios
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
                              const rotulo = ESCALA_AVALIACAO.find((e) => e.valor === valor)?.label || '';

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
                                    className={`shrink-0 px-2 py-0.5 rounded-md font-black text-[11px] ${
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
