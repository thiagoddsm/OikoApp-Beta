'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  DOMINIOS_DIAGNOSTICO,
  ESCALA_AVALIACAO,
  FUNCOES_IGREJA,
  PORTES_IGREJA,
  calcularResultadosDiagnostico,
  type IdentificacaoIgreja,
  TODAS_AS_QUESTOES,
} from '@/lib/diagnostico-rede-data';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  Church,
  User,
  Mail,
  Phone,
  MapPin,
  Building2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Printer,
  Share2,
  Sparkles,
  BookOpen,
  Award,
  ShieldCheck,
  TrendingUp,
  RefreshCw,
  HelpCircle,
  ChevronDown,
} from 'lucide-react';
import { salvarDiagnostico } from './actions';

const PASTORES_LISTA = [
  'Pr. Diego',
  'Pr. Thiago',
  'Pr. Leo',
  'Pr. José Ricardo',
  'Pr. Hugo Campos',
];

const STORAGE_KEY = 'ibmanha-diagnostico-v1';

export default function DiagnosticoRedePage() {
  const [etapa, setEtapa] = useState<number>(0);
  const [salvando, setSalvando] = useState(false);
  const [salvoNoBanco, setSalvoNoBanco] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Etapa 0: Identificação
  const [identificacao, setIdentificacao] = useState<IdentificacaoIgreja>({
    igreja_nome: '',
    pastor_nome: '',
    email: '',
    telefone: '',
    funcao_igreja: 'pastor_senior',
    cidade: '',
    uf: '',
    porte_igreja: '51_150',
  });

  // Respostas (idQuestao => 1..5)
  const [respostas, setRespostas] = useState<Record<string, number>>({});

  // Carregar do localStorage ao montar
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.identificacao) setIdentificacao(parsed.identificacao);
        if (parsed.respostas) setRespostas(parsed.respostas);
        if (typeof parsed.etapa === 'number' && parsed.etapa < 7) {
          setEtapa(parsed.etapa);
        }
      }
    } catch (e) {
      console.warn('Não foi possível ler do localStorage:', e);
    }
  }, []);

  // Salvar no localStorage sempre que houver alteração
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          identificacao,
          respostas,
          etapa,
          updatedAt: new Date().toISOString(),
        })
      );
    } catch (e) {
      // Ignora erro de quota de storage
    }
  }, [identificacao, respostas, etapa]);

  // Respostas por domínio
  const respostasPorDominio = useMemo(() => {
    return DOMINIOS_DIAGNOSTICO.map((d) => {
      const questoes = d.principios.flatMap((p) => p.questoes);
      const respondidas = questoes.filter((q) => respostas[q.id] !== undefined).length;
      return {
        id: d.id,
        nome: d.nome,
        total: questoes.length,
        respondidas,
        completo: respondidas === questoes.length,
      };
    });
  }, [respostas]);

  const totalRespondidas = Object.keys(respostas).length;
  const progressoGeral = Math.round((totalRespondidas / TODAS_AS_QUESTOES.length) * 100);

  // Validação da Etapa 0
  const etapa0Valida = useMemo(() => {
    return (
      identificacao.igreja_nome.trim().length >= 2 &&
      identificacao.pastor_nome.trim().length >= 2 &&
      identificacao.telefone.replace(/\D/g, '').length >= 8 &&
      identificacao.cidade.trim().length >= 2 &&
      identificacao.uf.trim().length === 2 &&
      identificacao.funcao_igreja &&
      identificacao.porte_igreja
    );
  }, [identificacao]);

  // Domínio atual nas etapas 1 a 5
  const dominioAtual = useMemo(() => {
    if (etapa >= 1 && etapa <= 5) {
      return DOMINIOS_DIAGNOSTICO[etapa - 1];
    }
    return null;
  }, [etapa]);

  const dominioAtualRespondidas = useMemo(() => {
    if (!dominioAtual) return 0;
    const ids = dominioAtual.principios.flatMap((p) => p.questoes.map((q) => q.id));
    return ids.filter((id) => respostas[id] !== undefined).length;
  }, [dominioAtual, respostas]);

  const dominioAtualCompleto = dominioAtualRespondidas === 15;

  // Cálculo dos Resultados (para etapas 6 e 7)
  const resultados = useMemo(() => {
    return calcularResultadosDiagnostico(respostas);
  }, [respostas]);

  // Dados para o RadarChart
  const radarData = useMemo(() => {
    return resultados.dominios.map((d) => ({
      dominio: d.nome.split(' & ')[0],
      score: d.score,
      fullMark: 100,
    }));
  }, [resultados]);

  // Ação de Responder Questão
  const handleResponder = (questaoId: string, valor: number) => {
    setRespostas((prev) => ({
      ...prev,
      [questaoId]: valor,
    }));
  };

  // Submissão Final
  const handleFinalizarDiagnostico = async () => {
    setSalvando(true);
    try {
      const res = await salvarDiagnostico(identificacao, respostas, resultados);
      if (res.success) {
        setSalvoNoBanco(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSalvando(false);
      setEtapa(7); // Vai para a tela de resultado
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleReiniciar = () => {
    if (confirm('Deseja iniciar um novo diagnóstico? As respostas atuais serão reiniciadas.')) {
      localStorage.removeItem(STORAGE_KEY);
      setRespostas({});
      setEtapa(0);
      setSalvoNoBanco(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCompartilharWhatsApp = () => {
    const texto = `*Diagnóstico Institucional - ${identificacao.igreja_nome}*\n` +
      `Pastor: ${identificacao.pastor_nome}\n` +
      `Índice de Prevalência: ${resultados.scoreGlobal}%\n` +
      `Status: ${resultados.statusIgreja.nome}\n\n` +
      `Acesse: https://ibmanha.com.br/diagnostico`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      {/* Top Header Institucional */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-sm print:hidden">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center font-black text-slate-950 text-sm shadow-md">
              IBM
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                Igreja Batista da Manhã
              </div>
              <h1 className="text-sm font-bold text-white tracking-tight">
                Diagnóstico Institucional de Saúde da Igreja
              </h1>
            </div>
          </div>

          {etapa > 0 && etapa < 7 && (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-[10px] font-bold text-slate-400">Progresso Geral</span>
                <span className="text-xs font-black text-amber-400">
                  {totalRespondidas}/75 ({progressoGeral}%)
                </span>
              </div>
              <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-300"
                  style={{ width: `${progressoGeral}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Conteúdo Central */}
      <main className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
        {/* ============================================================== */}
        {/* ETAPA 0: IDENTIFICAÇÃO                                         */}
        {/* ============================================================== */}
        {etapa === 0 && (
          <div className="space-y-6">
            {/* Banner de Introdução */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-700/60 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 space-y-3">
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Como está a saúde real da sua igreja hoje?
                </h2>
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
                  Este diagnóstico avalia a sua congregação através de <strong>25 princípios bíblicos e práticos</strong> divididos em 5 domínios fundamentais. Ao final, você receberá um relatório com métricas exatas e um plano de ação pastoral personalizado.
                </p>
                <div className="flex flex-wrap gap-4 pt-2 text-xs font-semibold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 75 afirmações objetivas
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> ~10 minutos para responder
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Relatório e Gráfico Radar
                  </span>
                </div>
              </div>
            </div>

            {/* Formulário de Identificação */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-lg font-extrabold text-slate-900">
                  Dados de Identificação
                </h3>
                <p className="text-xs text-slate-500">
                  Preencha as informações da sua igreja e ministério para iniciarmos.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nome da Igreja */}
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Church className="w-4 h-4 text-slate-400" /> Nome da Igreja *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Igreja Batista da Manhã"
                    value={identificacao.igreja_nome}
                    onChange={(e) =>
                      setIdentificacao((prev) => ({ ...prev, igreja_nome: e.target.value }))
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition-all"
                  />
                </div>

                {/* Pastor Principal */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-slate-400" /> Nome do Pastor Principal *
                  </label>
                  <div className="relative">
                    <select
                      required
                      value={identificacao.pastor_nome}
                      onChange={(e) =>
                        setIdentificacao((prev) => ({ ...prev, pastor_nome: e.target.value }))
                      }
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition-all bg-white text-slate-800 appearance-none cursor-pointer pr-10"
                    >
                      <option value="">Selecione o pastor principal...</option>
                      {PASTORES_LISTA.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Telefone / WhatsApp */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-slate-400" /> Telefone / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="(00) 90000-0000"
                    value={identificacao.telefone}
                    onChange={(e) =>
                      setIdentificacao((prev) => ({ ...prev, telefone: e.target.value }))
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition-all"
                  />
                </div>

                {/* E-mail */}
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-slate-400" /> E-mail para envio do diagnóstico
                  </label>
                  <input
                    type="email"
                    placeholder="pastor@suaigreja.com.br"
                    value={identificacao.email}
                    onChange={(e) =>
                      setIdentificacao((prev) => ({ ...prev, email: e.target.value }))
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition-all"
                  />
                </div>

                {/* Cidade */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-slate-400" /> Cidade *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: São Gonçalo"
                    value={identificacao.cidade}
                    onChange={(e) =>
                      setIdentificacao((prev) => ({ ...prev, cidade: e.target.value }))
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition-all"
                  />
                </div>

                {/* UF */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    Estado (UF) *
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    required
                    placeholder="RJ"
                    value={identificacao.uf}
                    onChange={(e) =>
                      setIdentificacao((prev) => ({
                        ...prev,
                        uf: e.target.value.toUpperCase().slice(0, 2),
                      }))
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none text-sm uppercase transition-all"
                  />
                </div>

                {/* Sua Função */}
                <div className="sm:col-span-2 space-y-2">
                  <label className="text-xs font-bold text-slate-700">
                    Sua Função na Igreja *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {FUNCOES_IGREJA.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() =>
                          setIdentificacao((prev) => ({ ...prev, funcao_igreja: f.id }))
                        }
                        className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-center ${
                          identificacao.funcao_igreja === f.id
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Porte da Igreja */}
                <div className="sm:col-span-2 space-y-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-slate-400" /> Porte da Igreja (Membresia) *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {PORTES_IGREJA.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() =>
                          setIdentificacao((prev) => ({ ...prev, porte_igreja: p.id }))
                        }
                        className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-center ${
                          identificacao.porte_igreja === p.id
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Botão de Iniciar */}
              <div className="pt-4">
                <button
                  type="button"
                  disabled={!etapa0Valida}
                  onClick={() => {
                    setEtapa(1);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg ${
                    etapa0Valida
                      ? 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-slate-900 text-white hover:opacity-95 cursor-pointer shadow-indigo-600/20 active:scale-98'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  }`}
                >
                  Iniciar Diagnóstico ({totalRespondidas > 0 ? `Continuar ${totalRespondidas}/75` : 'Passo 1 de 5'}) <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* ETAPAS 1 a 5: DOMÍNIOS TEMÁTICOS                               */}
        {/* ============================================================== */}
        {etapa >= 1 && etapa <= 5 && dominioAtual && (
          <div className="space-y-6">
            {/* Header do Domínio */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-black uppercase tracking-wider">
                    Domínio {etapa} de 5
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    5 princípios • 15 afirmações
                  </span>
                </div>
                <div className="text-xs font-extrabold text-slate-600">
                  Respondidas neste domínio:{' '}
                  <span className={dominioAtualCompleto ? 'text-emerald-600' : 'text-indigo-600'}>
                    {dominioAtualRespondidas}/15
                  </span>
                </div>
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  {dominioAtual.nome}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                  {dominioAtual.subtitulo}
                </p>
              </div>

              {/* Barra de Progresso deste Domínio */}
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${(dominioAtualRespondidas / 15) * 100}%` }}
                />
              </div>

              {/* Guia de Escala Rápida */}
              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-indigo-500" /> Escala:
                </span>
                <span className="font-medium"><strong>1:</strong> Não está indo bem</span>
                <span className="font-medium"><strong>2:</strong> Abaixo do esperado</span>
                <span className="font-medium"><strong>3:</strong> Em desenvolvimento</span>
                <span className="font-medium"><strong>4:</strong> Está indo bem</span>
                <span className="font-medium"><strong>5:</strong> Excelente</span>
              </div>
            </div>

            {/* Princípios e Questões */}
            <div className="space-y-6">
              {dominioAtual.principios.map((principio) => (
                <div
                  key={principio.numero}
                  className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center">
                        P{principio.numero}
                      </span>
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                        {principio.nome}
                      </h3>
                    </div>
                  </div>

                  {/* 3 Questões do Princípio */}
                  <div className="space-y-4">
                    {principio.questoes.map((questao, qIdx) => {
                      const respostaAtual = respostas[questao.id];
                      const respondida = respostaAtual !== undefined;

                      return (
                        <div
                          key={questao.id}
                          className={`p-4 rounded-2xl border transition-all ${
                            respondida
                              ? 'border-emerald-200 bg-emerald-50/20 shadow-xs'
                              : 'border-slate-200/80 bg-white'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <p className="text-xs sm:text-sm font-bold text-slate-800 leading-snug">
                              <span className="text-slate-400 font-bold mr-1.5">
                                #{qIdx + 1}
                              </span>
                              {questao.texto}
                            </p>
                            {respondida && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            )}
                          </div>

                          {/* 5 Botões Likert */}
                          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                            {ESCALA_AVALIACAO.map((opcao) => {
                              const isSelected = respostaAtual === opcao.valor;
                              return (
                                <button
                                  key={opcao.valor}
                                  type="button"
                                  onClick={() => handleResponder(questao.id, opcao.valor)}
                                  className={`py-2 px-1 rounded-xl text-center border transition-all flex flex-col items-center justify-center gap-0.5 ${
                                    isSelected
                                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-200'
                                      : 'bg-slate-50 text-slate-700 border-slate-200/90 hover:bg-slate-100 active:scale-95'
                                  }`}
                                >
                                  <span className="text-sm sm:text-base font-black">{opcao.valor}</span>
                                  <span className="hidden sm:flex text-[10.5px] font-bold leading-tight text-center px-0.5 min-h-[24px] items-center justify-center">
                                    {opcao.shortLabel}
                                  </span>
                                  <span className="sm:hidden flex text-[8.5px] font-bold leading-tight text-center px-0.5 min-h-[20px] items-center justify-center">
                                    {opcao.mobileLabel}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Navegação Inferior */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 flex items-center justify-between gap-3 sticky bottom-4 shadow-lg z-30">
              <button
                type="button"
                onClick={() => {
                  setEtapa((prev) => prev - 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Voltar
              </button>

              <div className="text-center text-xs font-extrabold text-slate-600">
                {dominioAtualRespondidas < 15 ? (
                  <span className="text-amber-600 font-bold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Faltam {15 - dominioAtualRespondidas} perguntas
                  </span>
                ) : (
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Domínio completo!
                  </span>
                )}
              </div>

              <button
                type="button"
                disabled={!dominioAtualCompleto}
                onClick={() => {
                  setEtapa((prev) => prev + 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                  dominioAtualCompleto
                    ? 'bg-slate-900 text-white hover:bg-slate-800 cursor-pointer shadow-md'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                {etapa === 5 ? 'Revisar e Finalizar' : 'Próximo Domínio'} <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* ETAPA 6: REVISÃO ANTES DO RESULTADO                            */}
        {/* ============================================================== */}
        {etapa === 6 && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <span className="px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-xs font-black uppercase tracking-wider">
                  Etapa de Revisão
                </span>
                <h2 className="text-2xl font-black text-slate-900 mt-2">
                  Tudo pronto para gerar o diagnóstico!
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Revise o preenchimento dos 5 domínios da <strong>{identificacao.igreja_nome}</strong> antes de processar os cálculos.
                </p>
              </div>

              {/* Status dos Domínios */}
              <div className="space-y-3">
                {respostasPorDominio.map((dom, idx) => (
                  <div
                    key={dom.id}
                    className="p-4 rounded-2xl border border-slate-200 flex items-center justify-between gap-3 bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
                          dom.completo
                            ? 'bg-emerald-600 text-white'
                            : 'bg-amber-500 text-slate-950'
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                          {dom.nome}
                        </h4>
                        <span className="text-[11px] text-slate-500">
                          {dom.respondidas} de {dom.total} afirmações respondidas
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setEtapa(idx + 1);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline"
                    >
                      {dom.completo ? 'Editar' : 'Completar'}
                    </button>
                  </div>
                ))}
              </div>

              {/* Resumo dos Dados */}
              <div className="bg-slate-100/70 rounded-2xl p-4 text-xs space-y-1.5 text-slate-700">
                <div className="font-black uppercase tracking-wider text-slate-500 text-[10px]">
                  Dados Cadastrais:
                </div>
                <div><strong>Igreja:</strong> {identificacao.igreja_nome} ({identificacao.cidade} - {identificacao.uf})</div>
                <div><strong>Pastor:</strong> {identificacao.pastor_nome} • {identificacao.telefone}</div>
              </div>

              {/* Botão de Finalizar */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEtapa(5)}
                  className="px-5 py-3.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" /> Voltar ao Domínio 5
                </button>

                <button
                  type="button"
                  disabled={totalRespondidas < 75 || salvando}
                  onClick={handleFinalizarDiagnostico}
                  className={`flex-1 py-4 rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition-all ${
                    totalRespondidas === 75
                      ? 'bg-gradient-to-r from-emerald-600 via-emerald-700 to-slate-900 text-white hover:opacity-95 cursor-pointer shadow-emerald-600/25 active:scale-98'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  }`}
                >
                  {salvando ? (
                    'Processando diagnóstico...'
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" /> Gerar Diagnóstico Oficial
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* ETAPA 7: RESULTADO FINAL & PLANO DE AÇÃO                       */}
        {/* ============================================================== */}
        {etapa === 7 && (
          <div ref={printRef} className="space-y-6">
            {/* Barra de Ações (Oculta na Impressão) */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 print:hidden">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Diagnóstico gerado com sucesso!
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center gap-1.5 hover:bg-slate-800 transition-all shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" /> Imprimir / PDF
                </button>
                <button
                  type="button"
                  onClick={handleCompartilharWhatsApp}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 hover:bg-emerald-700 transition-all shadow-sm"
                >
                  <Share2 className="w-3.5 h-3.5" /> WhatsApp
                </button>
                <button
                  type="button"
                  onClick={handleReiniciar}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100 transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Novo
                </button>
              </div>
            </div>

            {/* Cabeçalho do Relatório */}
            <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                    Relatório Oficial • Igreja Batista da Manhã
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {new Date().toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  {identificacao.igreja_nome}
                </h2>
                <p className="text-xs sm:text-sm text-slate-300">
                  Pastor Principal: <strong>{identificacao.pastor_nome}</strong> • {identificacao.cidade} - {identificacao.uf}
                </p>
              </div>
            </div>

            {/* Card Principal: Índice Global e Status */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div className="md:col-span-1 flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border border-slate-200/80 text-center">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                  Índice de Prevalência
                </span>
                <div className="text-5xl sm:text-6xl font-black text-slate-900 tracking-tight">
                  {resultados.scoreGlobal}%
                </div>
                <div
                  className={`mt-3 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border ${resultados.statusIgreja.cor} ${resultados.statusIgreja.bg} ${resultados.statusIgreja.border}`}
                >
                  Igreja em {resultados.statusIgreja.nome}
                </div>
              </div>

              <div className="md:col-span-2 space-y-3">
                <div className="text-xs font-black uppercase tracking-wider text-indigo-600">
                  Diagnóstico Pastoral Geral
                </div>
                <p className="text-sm text-slate-700 leading-relaxed font-medium">
                  {resultados.statusIgreja.descricao}
                </p>

                {/* Mensagem Pastoral de Abertura */}
                <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-xs sm:text-sm text-indigo-950 space-y-1.5">
                  <div className="font-extrabold text-indigo-900 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    Palavra Pastoral: {resultados.mensagens.titulo}
                  </div>
                  <p className="italic text-slate-700 leading-relaxed">
                    &ldquo;{resultados.mensagens.abertura}&rdquo;
                  </p>
                </div>
              </div>
            </div>

            {/* Gráfico Radar & Comparativo dos 5 Domínios */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  Mapeamento dos 5 Domínios Institucionais
                </h3>
                <p className="text-xs text-slate-500">
                  Visualização equilibrada da saúde ministerial da igreja.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                {/* Radar Chart */}
                <div className="w-full h-72 sm:h-80 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="dominio" tick={{ fill: '#475569', fontSize: 11, fontWeight: 700 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#cbd5e1" />
                      <Radar
                        name="Pontuação"
                        dataKey="score"
                        stroke="#4f46e5"
                        fill="#6366f1"
                        fillOpacity={0.45}
                      />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* Lista dos 5 Domínios com Barras */}
                <div className="space-y-3.5">
                  {resultados.dominios.map((dom) => {
                    let corBarra = 'bg-indigo-600';
                    let corBadge = 'bg-indigo-50 text-indigo-700';
                    let statusLabel = 'Em desenvolvimento';

                    if (dom.score >= 90) {
                      corBarra = 'bg-emerald-500';
                      corBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                      statusLabel = 'Celebração (≥90)';
                    } else if (dom.score >= 75) {
                      corBarra = 'bg-indigo-600';
                      corBadge = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                      statusLabel = 'Saudável (75-89)';
                    } else if (dom.score >= 60) {
                      corBarra = 'bg-amber-500';
                      corBadge = 'bg-amber-50 text-amber-800 border-amber-200';
                      statusLabel = 'Ajuste fino (60-74)';
                    } else {
                      corBarra = 'bg-rose-500';
                      corBadge = 'bg-rose-50 text-rose-700 border-rose-200';
                      statusLabel = 'Alerta (<60)';
                    }

                    return (
                      <div key={dom.id} className="p-3.5 rounded-2xl border border-slate-200/90 bg-slate-50/50 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-black text-slate-800">{dom.nome}</span>
                          <span className="font-black text-slate-900 text-sm">{dom.score}%</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${corBarra} rounded-full transition-all duration-500`}
                            style={{ width: `${dom.score}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${corBadge}`}>
                            {statusLabel}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {dom.subtitulo}
                          </span>
                        </div>

                        {/* Alerta de Insight se score < 60 */}
                        {dom.score < 60 && (
                          <div className="mt-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-[11px] leading-snug flex items-start gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                            <span>{dom.insightBaixo}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Plano de Ação Pastoral: Os Princípios que Mais Precisam de Atenção */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <span className="px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-[10px] font-black uppercase tracking-wider">
                  Prioridade para os Próximos 90 Dias
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-2">
                  Plano de Ação Pastoral por Princípio
                </h3>
                <p className="text-xs text-slate-500">
                  Prescrição prática baseada nas menores pontuações identificadas na sua igreja.
                </p>
              </div>

              <div className="space-y-4">
                {resultados.principios
                  .sort((a, b) => a.score - b.score)
                  .slice(0, 5)
                  .map((principio, idx) => (
                    <div
                      key={principio.numero}
                      className="p-5 rounded-2xl border border-slate-200/90 bg-slate-50 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          <h4 className="text-sm font-extrabold text-slate-900">
                            Princípio {principio.numero}: {principio.nome}
                          </h4>
                        </div>
                        <span
                          className={`text-xs font-black px-2.5 py-1 rounded-full ${
                            principio.score < 60
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          Score: {principio.score}%
                        </span>
                      </div>

                      <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-700 leading-relaxed">
                        <strong className="text-indigo-900 block mb-1">O que fazer na prática:</strong>
                        {principio.planoAcao}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Mensagem de Encerramento Pastoral */}
            <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 border border-indigo-900/40 text-center space-y-3">
              <Award className="w-8 h-8 text-amber-400 mx-auto" />
              <h3 className="text-lg font-black text-white">
                Para a {identificacao.igreja_nome}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto italic leading-relaxed">
                &ldquo;{resultados.mensagens.encerramento}&rdquo;
              </p>
              <div className="pt-2 text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                Igreja Batista da Manhã
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
