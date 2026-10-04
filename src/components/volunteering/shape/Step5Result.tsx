'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { 
  BadgeCheck, 
  Copy, 
  Send, 
  Star, 
  Sparkles, 
  Heart, 
  Briefcase, 
  Sliders, 
  Check, 
  Share2, 
  UserCheck, 
  ArrowRight,
  Layers,
  Zap,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { SHAPE_DATA } from '@/lib/shape-complete-data';
import { submitShapeAssessment } from '@/app/public/molde-de-servo/actions';
import { Step1FormData } from './Step1Intro';

interface Step5ResultProps {
  formData: Step1FormData;
  selectedAbilities: string[];
  experiences: Record<string, string>;
  heartAnswers: Record<string, string>;
  personalityAnswers: Record<string, number>;
  giftAnswers: Record<string, number>;
}

export default function Step5Result({
  formData,
  selectedAbilities = [],
  experiences = {},
  heartAnswers = {},
  personalityAnswers = {},
  giftAnswers = {},
}: Step5ResultProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

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
      }))
      .sort((a, b) => b.score - a.score);

    return {
      topGifts: sorted.slice(0, 3),
      allGiftScores: scores,
    };
  }, [giftAnswers]);

  // 2. CÁLCULO DA PERSONALIDADE / QUADRANTE
  const { quadrant, quadTitle, quadDesc, quadIcon, orgLabel, motLabel, orgAvg, motAvg } = useMemo(() => {
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
      title = 'Executor Metódico';
      desc = 'Focado em processos, analítico, busca excelência e organiza tarefas com início, meio e fim.';
      icon = Layers;
    } else if (motResult === 'Tarefas' && orgResult === 'Informal') {
      title = 'Resolutivo Dinâmico';
      desc = 'Pragmático, rápido e adaptável. Brilha resolvendo problemas na hora e montando estruturas práticas.';
      icon = Zap;
    } else if (motResult === 'Pessoas' && orgResult === 'Formal') {
      title = 'Cuidado Estável';
      desc = 'Pastoral, acolhedor, fiel aos processos. Excelente no discipulado contínuo e consolidação 1 a 1.';
      icon = Heart;
    } else {
      title = 'Conector Espontâneo';
      desc = 'Extrovertido, inspirador e criativo. Perfeito para integração, quebra-gelo e acolhimento vibrante.';
      icon = Sparkles;
    }

    return {
      quadrant: `${motResult} / ${orgResult}`,
      quadTitle: title,
      quadDesc: desc,
      quadIcon: icon,
      orgLabel: orgResult,
      motLabel: motResult,
      orgAvg: orgAverage,
      motAvg: motAverage,
    };
  }, [personalityAnswers]);

  // 3. SALVAR RESULTADOS NO BANCO AUTOMATICAMENTE
  useEffect(() => {
    let isMounted = true;

    async function autoSave() {
      if (savedId || isSaving) return;
      setIsSaving(true);
      try {
        const res = await submitShapeAssessment({
          userId: formData.userId,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          gcId: formData.gcId,
          gcName: formData.gcName,
          targetMinistry: formData.targetMinistry,
          abilities: selectedAbilities,
          heart: heartAnswers,
          personality: personalityAnswers,
          gifts: allGiftScores,
          quadrant,
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

    autoSave();
    return () => {
      isMounted = false;
    };
  }, []);

  // 4. TEXTO DE COMPARTILHAMENTO (WHATSAPP)
  const whatsappSummaryText = useMemo(() => {
    const giftsList = topGifts.map((g, i) => `${i + 1}º ${g.name} (${g.score} pts)`).join('\n');
    const abilitiesList = selectedAbilities.length > 0 ? selectedAbilities.slice(0, 5).join(', ') : 'Não informado';
    
    return `*MOLDE DE SERVO (S.H.A.P.E.) — IGREJA BATISTA DA MANHÃ* 🏛️
👤 *Servo(a):* ${formData.name || 'Membro'}
📍 *GC:* ${formData.gcName || 'Não informado'}
🎯 *Ministério de Interesse:* ${formData.targetMinistry || 'Geral'}

✨ *TOP 3 DONS ESPIRITUAIS:*
${giftsList}

🧠 *TEMPERAMENTO OPERACIONAL:*
${quadTitle} (${motLabel} + ${orgLabel})
_${quadDesc}_

🛠️ *HABILIDADES:* ${abilitiesList}

_Avaliação concluída no OikoApp • Conectando dons e propósitos no Reino!_`;
  }, [formData, topGifts, quadTitle, motLabel, orgLabel, quadDesc, selectedAbilities]);

  const handleCopy = () => {
    navigator.clipboard.writeText(whatsappSummaryText);
    setCopied(true);
    toast({
      title: 'Resumo Copiado!',
      description: 'Você pode colar diretamente no WhatsApp do seu líder ou pastor.',
    });
    setTimeout(() => setCopied(false), 3000);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(whatsappSummaryText);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const QuadIcon = quadIcon;

  return (
    <div className="flex flex-col items-center gap-8 text-center pb-12">
      {/* Header do Resultado */}
      <div className="flex flex-col items-center gap-2.5 max-w-xl">
        <Badge
          variant="secondary"
          className="px-4 py-1.5 gap-2 uppercase tracking-wide bg-primary/10 text-primary font-bold"
        >
          <BadgeCheck className="w-4 h-4" /> Avaliação Concluída com Sucesso
        </Badge>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
          Aqui está o seu <span className="text-primary">Cartão do Servo</span>
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
          Sua síntese ministerial foi gerada a partir dos seus dons dominantes, perfil de personalidade e paixões declaradas.
        </p>
      </div>

      {/* CARTÃO DO SERVO */}
      <div className="w-full max-w-2xl bg-card rounded-3xl overflow-hidden shadow-2xl border text-left flex flex-col">
        {/* Cabeçalho do Cartão */}
        <div className="bg-gradient-to-br from-primary via-[#533d8b] to-accent p-6 sm:p-8 text-white relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10 flex items-center justify-between mb-6">
            <span className="text-[11px] font-black uppercase tracking-wider bg-black/20 px-3 py-1 rounded-full backdrop-blur">
              Molde de Servo • S.H.A.P.E.
            </span>
            <span className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full flex items-center gap-1.5 backdrop-blur">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Certificado Ativo
            </span>
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/15 border-2 border-white/30 flex items-center justify-center backdrop-blur shadow-inner shrink-0">
              <UserCheck className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <div className="flex flex-col text-center sm:text-left">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/70">
                Identidade Ministerial
              </span>
              <h2 className="text-2xl sm:text-3xl font-black leading-tight text-white">
                {formData.name || 'Servo(a) de Deus'}
              </h2>
              <p className="text-xs sm:text-sm text-white/90 mt-0.5">
                {formData.gcName || 'Igreja Batista da Manhã'}
              </p>
            </div>
          </div>
        </div>

        {/* Corpo do Cartão */}
        <div className="p-6 sm:p-8 flex flex-col gap-6 bg-card">
          {/* 1. QUADRANTE DE TEMPERAMENTO */}
          <div className="p-5 rounded-2xl bg-primary/5 border border-primary/20 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 mt-0.5">
              <QuadIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-foreground">
                  {quadTitle}
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {motLabel} + {orgLabel}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                {quadDesc}
              </p>
            </div>
          </div>

          {/* 2. TOP 3 DONS */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-5 h-5 text-amber-500 fill-current" />
              <h3 className="font-bold text-base text-foreground">Top 3 Dons Espirituais Dominantes</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {topGifts.map((g, i) => {
                const colors = [
                  'bg-primary/10 border-primary/30 text-primary',
                  'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400',
                  'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400',
                ];
                const badgeLabels = ['1º Lugar', '2º Lugar', '3º Lugar'];

                return (
                  <div
                    key={g.id}
                    className="p-4 rounded-2xl border shadow-sm flex flex-col justify-between bg-card"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${colors[i]}`}>
                          {badgeLabels[i]}
                        </span>
                        <span className="text-xs font-black text-muted-foreground">
                          {g.score} pts
                        </span>
                      </div>
                      <h4 className="font-bold text-sm sm:text-base text-foreground mt-1">
                        {g.name}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {g.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. HABILIDADES SELECIONADAS */}
          {selectedAbilities.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <Briefcase className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm text-foreground">Habilidades em Destaque</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedAbilities.map((ab) => (
                  <Badge
                    key={ab}
                    variant="outline"
                    className="text-xs font-semibold px-3 py-1 bg-muted/30"
                  >
                    {ab}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* 4. CORAÇÃO */}
          {heartAnswers['q0'] && (
            <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20">
              <div className="flex items-center gap-2 text-rose-600 mb-1">
                <Heart className="w-4 h-4 fill-current" />
                <h4 className="font-bold text-xs uppercase tracking-wider">Paixão & Sonho para o Reino</h4>
              </div>
              <p className="text-xs sm:text-sm text-foreground/80 italic leading-relaxed">
                "{heartAnswers['q0']}"
              </p>
            </div>
          )}
        </div>
      </div>

      {/* BOTÕES DE AÇÃO */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-2xl">
        <Button
          type="button"
          variant="outline"
          onClick={handleCopy}
          className="flex-1 h-12 rounded-2xl gap-2 font-bold text-sm border-primary/30 hover:bg-primary/5 text-primary"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copiado!' : 'Copiar para WhatsApp'}
        </Button>

        <Button
          type="button"
          onClick={handleShareWhatsApp}
          className="flex-1 h-12 rounded-2xl gap-2 font-bold text-sm bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-md"
        >
          <Send className="w-4 h-4" /> Enviar ao Líder de GC
        </Button>
      </div>
    </div>
  );
}
