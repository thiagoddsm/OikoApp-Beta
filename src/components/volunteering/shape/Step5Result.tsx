'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { 
  BadgeCheck, 
  Send, 
  Star, 
  Sparkles, 
  Heart, 
  Check, 
  Share2, 
  UserCheck, 
  Layers,
  Zap,
  Compass,
  Download,
  MessageSquare,
  Users,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { SHAPE_DATA } from '@/lib/shape-complete-data';
import { submitShapeAssessment, getMinistrySuggestions } from '@/app/public/molde-de-servo/actions';
import { Step1FormData } from './Step1Intro';
import { calculateDisc, DISC_TOTAL, type DiscLetter } from '@/lib/disc';
import { DISC_META, DISC_BLINDSPOT_META } from '@/lib/disc-meta';
import { calculateMinistryFit } from '@/lib/ministry-benchmarks';
import DiscBarChart from './disc/DiscBarChart';
import DiscProfileBadge from './disc/DiscProfileBadge';

interface Step5ResultProps {
  formData: Step1FormData;
  selectedAbilities: string[];
  experiences: Record<string, string>;
  heartAnswers: Record<string, string>;
  personalityAnswers?: Record<string, number>;
  discAnswers?: Record<string, DiscLetter[]> | Record<string, any>;
  giftAnswers: Record<string, number>;
  onRetakeDisc?: () => void;
}

const BIBLICAL_REFERENCES: Record<string, string> = {
  'Administração': '1 Coríntios 12:28',
  'Apostolado': 'Efésios 4:11',
  'Artesanato': 'Êxodo 31:3',
  'Comunicação Criativa': 'Salmos 150:3',
  'Discernimento': '1 Coríntios 12:10',
  'Encorajamento': 'Romanos 12:8',
  'Evangelismo': 'Efésios 4:11',
  'Fé': '1 Coríntios 12:9',
  'Contribuição': 'Romanos 12:8',
  'Serviço': 'Romanos 12:7',
  'Hospitalidade': '1 Pedro 4:9',
  'Intercessão': 'Colossenses 4:12',
  'Conhecimento': '1 Coríntios 12:8',
  'Liderança': 'Romanos 12:8',
  'Misericórdia': 'Romanos 12:8',
  'Profecia': '1 Coríntios 12:10',
  'Pastorado': 'Efésios 4:11',
  'Ensino': 'Romanos 12:7',
  'Sabedoria': 'Tiago 1:5',
};

export default function Step5Result({
  formData,
  selectedAbilities = [],
  experiences = {},
  heartAnswers = {},
  personalityAnswers = {},
  discAnswers = {},
  giftAnswers = {},
  onRetakeDisc,
}: Step5ResultProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [directedMinistry, setDirectedMinistry] = useState('');
  const [ministrySuggestions, setMinistrySuggestions] = useState<string[]>([
    'Louvor & Adoração',
    'Ensino & Discipulado',
    'Crianças (OikoKids)',
    'Acolhimento & Recepção',
    'Mídia, Som & Produção',
    'Ação Social & Misericórdia',
    'Liderança de GC',
    'Intercessão & Oração',
    'Gestão & Apoio',
  ]);

  // Carrega opções dinâmicas de ministérios configuradas pelo pastor
  useEffect(() => {
    getMinistrySuggestions().then((sugs) => {
      if (sugs && sugs.length > 0) {
        setMinistrySuggestions(sugs);
      }
    });
  }, []);

  // 1. CÁLCULO DOS DONS
  const { topGifts, allGiftScores } = useMemo(() => {
    const scores: Record<string, number> = {};
    SHAPE_DATA.gifts.forEach((g) => {
      scores[g.id] = 0;
    });

    SHAPE_DATA.giftQuestions.forEach((q) => {
      const ans = giftAnswers[q.id] || 0;
      scores[q.domId] = (scores[q.domId] || 0) + ans;
    });

    const sorted = SHAPE_DATA.gifts
      .map((g) => ({
        id: g.id,
        name: g.name,
        desc: g.desc,
        score: scores[g.id] || 0,
        bibleRef: BIBLICAL_REFERENCES[g.name] || '1 Coríntios 12',
      }))
      .sort((a, b) => b.score - a.score);

    return {
      topGifts: sorted.slice(0, 3),
      allGiftScores: scores,
    };
  }, [giftAnswers]);

  // 2. CÁLCULO DISC (OU FALLBACK LEGADO)
  const discResult = useMemo(() => calculateDisc(discAnswers), [discAnswers]);
  const hasDisc = discResult.discComplete && !!discResult.discPrimary;

  // 2b. CÁLCULO DE ADERÊNCIA VOCACIONAL (MATCH SCORE FUZZY)
  const ministryFits = useMemo(() => {
    if (!hasDisc) return [];
    return calculateMinistryFit(
      discResult.discScores,
      topGifts
    ).slice(0, 3);
  }, [hasDisc, discResult.discScores, topGifts]);

  // Fallback legado (apenas se não tiver DISC completo mas tiver as escalas O/E antigas)
  const legacyFallback = useMemo(() => {
    if (hasDisc) return null;
    let orgSum = 0;
    let motSum = 0;

    SHAPE_DATA.personality.eixo_org.items.forEach((item) => {
      orgSum += personalityAnswers[item.id] !== undefined ? personalityAnswers[item.id] : 3;
    });

    SHAPE_DATA.personality.eixo_mot.items.forEach((item) => {
      motSum += personalityAnswers[item.id] !== undefined ? personalityAnswers[item.id] : 3;
    });

    const orgAverage = orgSum / SHAPE_DATA.personality.eixo_org.items.length;
    const motAverage = motSum / SHAPE_DATA.personality.eixo_mot.items.length;

    const orgResult = orgAverage >= 3.0 ? 'Formal' : 'Informal';
    const motResult = motAverage >= 3.0 ? 'Pessoas' : 'Tarefas';

    let title = '';
    let desc = '';
    let icon = Sparkles;

    if (motResult === 'Tarefas' && orgResult === 'Formal') {
      title = 'Tarefa / Formal';
      desc = 'Prefere saber exatamente os alvos e como realizar a tarefa com processos claros.';
      icon = Layers;
    } else if (motResult === 'Tarefas' && orgResult === 'Informal') {
      title = 'Tarefa / Informal';
      desc = 'Prefere cumprir uma ampla variedade de responsabilidades com flexibilidade.';
      icon = Zap;
    } else if (motResult === 'Pessoas' && orgResult === 'Formal') {
      title = 'Pessoas / Formal';
      desc = 'Prefere interagir com pessoas em situações e ambientes mais estáveis e definidos.';
      icon = Heart;
    } else {
      title = 'Pessoas / Informal';
      desc = 'Prefere responder e relacionar-se com as pessoas de forma espontânea.';
      icon = Sparkles;
    }

    return {
      quadrant: `${motResult} / ${orgResult}`,
      quadTitle: title,
      quadDesc: desc,
      quadIcon: icon,
      orgLabel: orgResult,
      motLabel: motResult,
    };
  }, [hasDisc, personalityAnswers]);

  // 3. SALVAR AUTOMATICAMENTE NO BANCO
  useEffect(() => {
    let isMounted = true;

    async function autoSave() {
      setIsSaving(true);
      try {
        const res = await submitShapeAssessment({
          userId: formData.userId,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          gcId: formData.gcId,
          gcName: formData.gcName,
          targetMinistry: directedMinistry || formData.targetMinistry,
          abilities: selectedAbilities,
          experiences: experiences,
          heart: heartAnswers,
          personality: personalityAnswers,
          discAnswers: discResult.discAnswers,
          gifts: allGiftScores,
          quadrant: discResult.quadrante || legacyFallback?.quadrant || '',
          topGifts,
        });

        if (isMounted && res.success && res.id) {
          setSavedId(res.id);
        }
      } catch (err) {
        console.error('Erro ao registrar avaliação:', err);
      } finally {
        if (isMounted) setIsSaving(false);
      }
    }

    const timer = setTimeout(autoSave, 600);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [directedMinistry]);

  // 4. TEXTO DE COMPARTILHAMENTO (WHATSAPP)
  const whatsappSummaryText = useMemo(() => {
    const giftsList = topGifts.map((g, i) => `${i + 1}º ${g.name} (${g.score} pts)`).join('\n');
    const abilitiesList = selectedAbilities.length > 0 ? selectedAbilities.slice(0, 5).join(', ') : 'Gerais';
    const ministryLine = directedMinistry ? `\n🌱 *Área de Direcionamento Sentida:* ${directedMinistry}` : '';
    
    let discSection = '';
    if (hasDisc && discResult.discPrimary) {
      const p = DISC_META[discResult.discPrimary];
      const s = discResult.discSecondary ? DISC_META[discResult.discSecondary] : null;
      const sText = s ? ` + ${s.name} (${s.letter})` : '';
      discSection = `🧠 *PERFIL COMPORTAMENTAL (DISC):*
${p.name} (${p.letter})${sText}
D: ${discResult.discScores.D} | I: ${discResult.discScores.I} | S: ${discResult.discScores.S} | C: ${discResult.discScores.C}
_${p.description}_`;
    } else if (legacyFallback) {
      discSection = `🧠 *TEMPERAMENTO OPERACIONAL (LEGADO):*
${legacyFallback.quadTitle} (${legacyFallback.motLabel} + ${legacyFallback.orgLabel})
_${legacyFallback.quadDesc}_`;
    }

    return `*MOLDE DE SERVO (S.H.A.P.E.) — IGREJA BATISTA DA MANHÃ* 🏛️
👤 *Servo(a):* ${formData.name || 'Membro'}
📍 *GC:* ${formData.gcName || 'Membro IBM'}${ministryLine}

✨ *TOP 3 DONS ESPIRITUAIS:*
${giftsList}

${discSection}

🛠️ *HABILIDADES:* ${abilitiesList}

_Avaliação concluída no OikoApp • Conectando dons e propósitos no Reino!_`;
  }, [formData, topGifts, hasDisc, discResult, legacyFallback, selectedAbilities, directedMinistry]);

  const handleCopy = () => {
    navigator.clipboard.writeText(whatsappSummaryText);
    setCopied(true);
    toast({
      title: 'Resumo Copiado!',
      description: 'Pronto para colar no WhatsApp do seu líder ou pastor.',
    });
    setTimeout(() => setCopied(false), 3000);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(whatsappSummaryText);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handlePrintPdf = () => {
    window.print();
  };

  const hashId = savedId ? `#SHAPE-${savedId.slice(0, 4).toUpperCase()}-BR` : '#SHAPE-8942-BR';

  return (
    <div className="flex flex-col gap-6 pb-6 animate-in fade-in duration-300">
      {/* 1. Header Badges */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase text-[#523A8C] tracking-wider">
          • MOLDE DE SERVO
        </span>
        <span className="px-2.5 py-1 bg-[#EDE8F5] text-[#523A8C] rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
          <BadgeCheck className="w-3.5 h-3.5" /> Jornada 100% Concluída
        </span>
      </div>

      {/* 2. Título */}
      <div className="flex flex-col gap-1 text-left">
        <h1 className="text-2xl sm:text-3xl font-black text-[#1E113F] tracking-tight">
          Perfil Concluído! 🎉
        </h1>
        <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
          Aqui está o seu <strong>Cartão do Servo</strong> oficial, moldado para servir ao Reino com clareza e dedicação.
        </p>
      </div>

      {/* 3. CARTÃO DO SERVO (MOBILE FRIENDLY) */}
      <div className="bg-white rounded-3xl border border-slate-150 shadow-xl overflow-hidden text-left flex flex-col">
        {/* Cabeçalho Roxo do Cartão */}
        <div className="bg-gradient-to-br from-[#523A8C] to-[#3B2668] p-5 sm:p-6 text-white relative">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[9px] font-black uppercase tracking-widest text-white/70">
              CREDENCIAL DE MINISTÉRIO
            </span>
            <span className="text-[10px] font-bold bg-white/20 px-2.5 py-0.5 rounded-full flex items-center gap-1 backdrop-blur">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Ativo & Certificado
            </span>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center font-black text-xl text-white shadow-inner shrink-0">
              {formData.name ? formData.name.charAt(0).toUpperCase() : <UserCheck className="w-7 h-7" />}
            </div>
            <div className="flex flex-col">
              <h2 className="text-lg sm:text-xl font-black text-white leading-tight">
                {formData.name || 'Servo(a) do Senhor'}
              </h2>
              <p className="text-[11px] text-white/80 mt-0.5">
                {formData.email || 'ibmanha@membro.com'}
              </p>
              <span className="text-[10px] font-bold text-[#E3DCF2] flex items-center gap-1 mt-0.5">
                <Users className="w-3 h-3" /> {formData.gcName || 'Igreja Batista da Manhã'}
              </span>
            </div>
          </div>
        </div>

        {/* Corpo do Cartão */}
        <div className="p-5 sm:p-6 flex flex-col gap-5">
          {/* Perfil Comportamental (DISC ou Legado) */}
          {hasDisc && discResult.discPrimary ? (
            <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-150 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">
                  Perfil Comportamental (DISC)
                </span>
                {onRetakeDisc && (
                  <button
                    type="button"
                    onClick={onRetakeDisc}
                    className="text-[10px] font-bold text-[#523A8C] hover:underline flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Refazer
                  </button>
                )}
              </div>

              <DiscProfileBadge
                primary={discResult.discPrimary}
                secondary={discResult.discSecondary}
                strength={discResult.discStrength}
                tie={discResult.discTie}
                detailed
              />

              <div className="pt-2 border-t border-slate-200/60">
                <span className="text-[9px] font-bold uppercase text-slate-400 block mb-1.5">
                  Distribuição dos 4 fatores
                </span>
                <DiscBarChart
                  scores={discResult.discScores}
                  primary={discResult.discPrimary}
                  secondary={discResult.discSecondary}
                />
              </div>

              {discResult.discLowest && DISC_BLINDSPOT_META[discResult.discLowest] && (
                <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-600 flex items-start gap-1.5">
                  <span className="font-bold text-amber-700 shrink-0">⚠️ Ponto de Atenção:</span>
                  <span>{DISC_BLINDSPOT_META[discResult.discLowest].avoidDelegating}</span>
                </div>
              )}
            </div>
          ) : legacyFallback ? (
            <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-150 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-extrabold uppercase text-amber-600 block -mb-0.5">
                    Quadrante Operacional (Formato Legado)
                  </span>
                  <h3 className="font-extrabold text-sm text-[#1E113F]">
                    {legacyFallback.quadTitle}
                  </h3>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
                    {legacyFallback.motLabel} + {legacyFallback.orgLabel}
                  </span>
                  {onRetakeDisc && (
                    <button
                      type="button"
                      onClick={onRetakeDisc}
                      className="text-[10px] font-bold text-[#523A8C] bg-[#EDE8F5] px-2 py-0.5 rounded-full hover:bg-[#E3DCF2] flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" /> Fazer DISC
                    </button>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-slate-600 leading-relaxed pt-1">
                {legacyFallback.quadDesc}
              </p>
            </div>
          ) : null}

          {/* Top 3 Dons Espirituais */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-xs text-[#1E113F] uppercase tracking-wide flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-current" /> Top 3 Dons Espirituais
              </h3>
              <span className="text-[10px] font-bold text-[#523A8C]">
                Aptidão Divina
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {topGifts.map((g, i) => {
                const rankBadges = ['bg-[#523A8C] text-white', 'bg-[#6750A4] text-white', 'bg-[#8472B0] text-white'];
                return (
                  <div
                    key={g.id}
                    className="p-3 bg-slate-50/80 rounded-xl border border-slate-150 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full ${rankBadges[i]} flex items-center justify-center font-black text-xs shrink-0 shadow-sm`}>
                        {i + 1}º
                      </div>
                      <div className="flex flex-col">
                        <h4 className="font-extrabold text-xs text-slate-900 leading-none">
                          {g.name}
                        </h4>
                        <span className="text-[10px] text-slate-500 italic mt-0.5">
                          📖 {g.bibleRef}
                        </span>
                      </div>
                    </div>

                    <span className="text-xs font-black text-[#523A8C] bg-white px-2 py-0.5 rounded-lg border border-slate-200 shrink-0">
                      {g.score} pts
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top 3 Áreas de Maior Aderência (Match Score Fuzzy) */}
          {ministryFits.length > 0 && (
            <div className="p-4 bg-gradient-to-br from-indigo-50/70 via-purple-50/40 to-slate-50 rounded-2xl border border-indigo-150 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="text-[10px] font-extrabold uppercase text-indigo-950 tracking-wider">
                    Áreas com Maior Sinergia Vocacional
                  </span>
                </div>
                <span className="text-[9px] font-bold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-full">
                  DISC + Dons
                </span>
              </div>

              <div className="space-y-2">
                {ministryFits.map((fit, idx) => {
                  const isTop1 = idx === 0;
                  return (
                    <div
                      key={fit.benchmark.id}
                      className="p-2.5 bg-white/95 rounded-xl border border-indigo-100/80 shadow-xs flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${
                              isTop1 ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {idx + 1}º
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            {fit.benchmark.name}
                          </span>
                        </div>
                        <span className="text-xs font-black text-indigo-700">
                          {fit.fitPercentage}% Fit
                        </span>
                      </div>

                      <div className="w-full h-1.5 bg-slate-150 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all"
                          style={{ width: `${fit.fitPercentage}%` }}
                        />
                      </div>

                      {fit.matchedGifts.length > 0 && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 truncate">
                          <span className="font-semibold text-slate-600">Dons em sinergia:</span>
                          <span className="truncate">{fit.matchedGifts.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Habilidades Validadas */}
          {selectedAbilities.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                HABILIDADES VALIDADAS
              </span>
              <div className="flex flex-wrap gap-1.5">
                {selectedAbilities.map((ab) => (
                  <span
                    key={ab}
                    className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[#EDE8F5] text-[#523A8C]"
                  >
                    {ab}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Onde seu coração arde */}
          {heartAnswers['q0'] && (
            <div className="p-3.5 bg-rose-50/60 rounded-xl border border-rose-100 flex flex-col gap-1">
              <span className="text-[10px] font-extrabold uppercase text-rose-600 flex items-center gap-1">
                <Heart className="w-3 h-3 fill-current" /> ONDE SEU CORAÇÃO ARDE:
              </span>
              <p className="text-[11px] text-slate-700 italic leading-snug">
                "{heartAnswers['q0']}"
              </p>
            </div>
          )}

          {/* Rodapé do Cartão (Hash e Data) */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>{hashId}</span>
            <span>Emitido em {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
          </div>
        </div>
      </div>

      {/* 4. Próximos Passos (Recomendações & Direcionamento) */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-extrabold text-sm text-[#1E113F]">
            Próximos Passos
          </h3>
          <span className="text-[10px] font-bold text-slate-400">
            Recomendações
          </span>
        </div>

        {/* Conversar com Líder */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-150 shadow-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EDE8F5] text-[#523A8C] flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-extrabold text-xs text-slate-900 leading-none">
                Conversar com Líder de GC
              </h4>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                Apresente o cartão ao seu discipulador para orarem juntos sobre o direcionamento prático.
              </p>
            </div>
          </div>
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
            Pendente
          </span>
        </div>

        {/* Direcionamento Escolhido / Sentido */}
        <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-sm flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#523A8C]" />
              <h4 className="font-extrabold text-xs text-slate-900">
                Onde você sente que Deus está te chamando para servir?
              </h4>
            </div>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#EDE8F5] text-[#523A8C]">
              Indicação
            </span>
          </div>

          <p className="text-[11px] text-slate-500 -mt-1">
            Escolha uma sugestão ou escreva abaixo para anexar ao seu cartão:
          </p>

          <div className="flex flex-wrap gap-1.5">
            {ministrySuggestions.map((sug) => {
              const isSelected = directedMinistry === sug;
              return (
                <button
                  type="button"
                  key={sug}
                  onClick={() => setDirectedMinistry(isSelected ? '' : sug)}
                  className={`text-[10px] px-2.5 py-1 rounded-lg border font-bold transition-all ${
                    isSelected
                      ? 'bg-[#523A8C] text-white border-[#523A8C] shadow-sm'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                  {sug}
                </button>
              );
            })}
          </div>

          <Input
            className="h-9 text-xs rounded-xl bg-slate-50 border-slate-200"
            placeholder="Ou digite outra área de vocação..."
            value={directedMinistry}
            onChange={(e) => setDirectedMinistry(e.target.value)}
          />
        </div>
      </div>

      {/* 5. AÇÕES PRINCIPAIS (MOBILE BUTTONS) */}
      <div className="flex flex-col gap-2.5 pt-1">
        <button
          type="button"
          onClick={handleCopy}
          className="w-full h-13 py-3 rounded-2xl font-black text-sm bg-[#523A8C] hover:bg-[#432E75] active:scale-98 text-white shadow-xl shadow-[#523A8C]/25 transition-all flex items-center justify-center gap-2"
        >
          <Share2 className="w-4 h-4" />
          <span>{copied ? 'Resumo Copiado!' : 'Copiar Resumo para WhatsApp'}</span>
        </button>

        <div className="grid grid-cols-2 gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrintPdf}
            className="h-11 rounded-2xl font-bold text-xs border-slate-200 bg-white hover:bg-slate-50 text-slate-700 gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Baixar Cartão (PDF)
          </Button>

          <Button
            type="button"
            onClick={handleShareWhatsApp}
            className="h-11 rounded-2xl font-bold text-xs bg-[#EDE8F5] hover:bg-[#E3DCF2] text-[#523A8C] border border-[#523A8C]/20 gap-1.5"
          >
            <Send className="w-3.5 h-3.5" /> Enviar ao Líder
          </Button>
        </div>
      </div>
    </div>
  );
}
