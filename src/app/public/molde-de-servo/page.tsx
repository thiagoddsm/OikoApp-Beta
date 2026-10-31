'use client';

import React, { useState } from 'react';
import Step1Intro, { Step1FormData, SavedShapeProgress } from '@/components/volunteering/shape/Step1Intro';
import Step2Abilities from '@/components/volunteering/shape/Step2Abilities';
import Step3Heart from '@/components/volunteering/shape/Step3Heart';
import Step4Gifts, { GIFT_PARTS_RANGES } from '@/components/volunteering/shape/Step4Gifts';
import Step5Result from '@/components/volunteering/shape/Step5Result';
import Step6Disc from '@/components/volunteering/shape/Step6Disc';
import { ArrowLeft, ArrowRight, User, Loader2, Save, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SHAPE_DATA } from '@/lib/shape-complete-data';
import { calculateShapeCompletion } from '@/types/shape';
import { DISC_TOTAL, sanitizeDiscAnswers, type DiscLetter } from '@/lib/disc';
import { DISC_QUESTIONS } from '@/lib/disc-questions';
import { saveShapeStepProgress } from './actions';

const TOTAL_STEPS = 8;

const STEP_SUBTITLES: Record<number, string> = {
  1: 'Identificação do Aluno',
  2: '📘 Aula 1 • Coração & Sonho Ministerial',
  3: '📘 Aula 1 • Dons Espirituais (Parte 1 de 3)',
  4: '📘 Aula 1 • Dons Espirituais (Parte 2 de 3)',
  5: '📘 Aula 1 • Dons Espirituais (Parte 3 de 3)',
  6: '📗 Aula 2 • Perfil DISC (Parte A)',
  7: '📗 Aula 2 • Habilidades & Disponibilidade (Parte B)',
  8: '✨ Cartão do Servo • Resultado',
};

export default function MoldeDeServoPage() {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isSavingStep, setIsSavingStep] = useState(false);
  const [aula1CompletedBanner, setAula1CompletedBanner] = useState(false);

  // Passo 1: Identificação (vinculada obrigatoriamente a um userId)
  const [formData, setFormData] = useState<Step1FormData>({
    email: '',
    name: '',
    phone: '',
    gcId: '',
    gcName: '',
    targetMinistry: '',
    userId: null,
    isMemberIdentified: false,
  });

  // Passo 2 (Aula 1): Coração & Sonho Ministerial
  const [heartAnswers, setHeartAnswers] = useState<Record<string, string>>({});

  // Passos 3, 4 e 5 (Aula 1): Dons Espirituais (133 questões divididas em 3 páginas)
  const [giftAnswers, setGiftAnswers] = useState<Record<string, number>>({});

  // Passo 6 (Aula 2 - 6A): Perfil DISC
  const [discAnswers, setDiscAnswers] = useState<Record<string, DiscLetter[]>>({});
  const [legacyQuadrante, setLegacyQuadrante] = useState<string>('');

  // Passo 7 (Aula 2 - 6B): Habilidades & Disponibilidade
  const [selectedAbilities, setSelectedAbilities] = useState<string[]>([]);
  const [experiences, setExperiences] = useState<Record<string, string>>({});
  const [availability, setAvailability] = useState<string[]>([]);

  // Legado (se o usuário possuir respostas O/E antigas)
  const [personalityAnswers, setPersonalityAnswers] = useState<Record<string, number>>({});

  const completionInfo = calculateShapeCompletion({
    coracao: heartAnswers,
    dom: giftAnswers,
    perso: personalityAnswers,
    discAnswers,
    habilidades: selectedAbilities,
    experiencias: {
      ...experiences,
      availability: availability.join(', '),
    },
    status: step === 8 ? 'completed' : 'in_progress',
  });

  const updateFormData = (data: Partial<Step1FormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const handleRestoreProgress = (progress: SavedShapeProgress, jumpToStep = false) => {
    if (progress.abilities) setSelectedAbilities(progress.abilities);
    if (progress.availability) setAvailability(progress.availability);
    if (progress.experiences) setExperiences(progress.experiences);
    if (progress.heart) setHeartAnswers(progress.heart);
    if (progress.personality) setPersonalityAnswers(progress.personality);
    if (progress.discAnswers) setDiscAnswers(sanitizeDiscAnswers(progress.discAnswers));
    if (progress.legacyQuadrante) setLegacyQuadrante(progress.legacyQuadrante);
    if (progress.gifts) setGiftAnswers(progress.gifts);
    if (progress.targetMinistry) {
      updateFormData({ targetMinistry: progress.targetMinistry });
    }

    if (jumpToStep && progress.currentStep) {
      const target = Math.min(Math.max(progress.currentStep, 2), TOTAL_STEPS);
      setStep(target);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleToggleAbility = (ability: string) => {
    setSelectedAbilities((prev) =>
      prev.includes(ability) ? prev.filter((a) => a !== ability) : [...prev, ability]
    );
  };

  const handleToggleAvailability = (timeSlot: string) => {
    setAvailability((prev) =>
      prev.includes(timeSlot) ? prev.filter((t) => t !== timeSlot) : [...prev, timeSlot]
    );
  };

  const handleExperienceChange = (id: string, value: string) => {
    setExperiences((prev) => ({ ...prev, [id]: value }));
  };

  const handleHeartChange = (index: number, value: string) => {
    setHeartAnswers((prev) => ({ ...prev, [`q${index}`]: value }));
  };

  const handleDiscAnswer = (questionId: string, order: DiscLetter[]) => {
    setDiscAnswers((prev) => ({ ...prev, [questionId]: order }));
  };

  const handleGiftAnswer = (questionId: string, value: number) => {
    setGiftAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const persistCurrentProgress = async (nextStepNumber: number, isCompleted = false) => {
    if (!formData.userId) {
      toast({
        variant: 'destructive',
        title: 'Usuário não identificado',
        description: 'É necessário vincular seu cadastro na Etapa 1 antes de salvar.',
      });
      setStep(1);
      return false;
    }

    setIsSavingStep(true);
    try {
      const res = await saveShapeStepProgress({
        userId: formData.userId,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        gcId: formData.gcId,
        gcName: formData.gcName,
        targetMinistry: formData.targetMinistry,
        abilities: selectedAbilities,
        availability,
        experiences,
        heart: heartAnswers,
        personality: personalityAnswers,
        discAnswers,
        gifts: giftAnswers,
        currentStep: nextStepNumber,
        status: isCompleted ? 'completed' : 'in_progress',
      });

      if (!res.success) {
        toast({
          variant: 'destructive',
          title: 'Erro ao salvar etapa',
          description: res.error || 'Não foi possível salvar seu progresso. Tente novamente.',
        });
        return false;
      }

      return true;
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro de conexão',
        description: 'Verifique sua internet e tente salvar novamente.',
      });
      return false;
    } finally {
      setIsSavingStep(false);
    }
  };

  const handleNext = async () => {
    if (isSavingStep) return;

    // Passo 1: Identificação obrigatória com userId do sistema
    if (step === 1) {
      if (!formData.userId || !formData.isMemberIdentified) {
        toast({
          variant: 'destructive',
          title: 'Identificação obrigatória',
          description: 'Localize seu cadastro de aluno pelo e-mail para iniciar o Molde de Servo.',
        });
        return;
      }
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Passo 2 (Aula 1): Coração & Sonho Ministerial
    if (step === 2) {
      const ok = await persistCurrentProgress(3, false);
      if (ok) {
        toast({
          title: 'Coração & Sonho Ministerial salvos! 💾',
          description: 'Agora vamos para a Parte 1 do Inventário de Dons Espirituais.',
        });
        setStep(3);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    // Passos 3, 4 e 5 (Aula 1): Dons Espirituais (Partes 1, 2 e 3)
    if (step === 3 || step === 4 || step === 5) {
      const partNum = (step - 2) as 1 | 2 | 3;
      const range = GIFT_PARTS_RANGES[partNum];
      const partQuestions = SHAPE_DATA.giftQuestions.slice(range.start, range.end);
      const unansweredInPart = partQuestions.filter((q) => giftAnswers[q.id] === undefined);

      if (unansweredInPart.length > 0) {
        // Salva o rascunho atual mesmo que faltem perguntas na página
        await persistCurrentProgress(step, false);

        toast({
          variant: 'destructive',
          title: `Faltam ${unansweredInPart.length} questões nesta página`,
          description: 'Suas respostas já marcadas foram salvas! Responda as questões restantes desta parte para avançar.',
        });

        const firstMissingEl = document.getElementById(`gift-question-${unansweredInPart[0].id}`);
        if (firstMissingEl) {
          firstMissingEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }

      const isEndOfAula1 = step === 5;
      const nextStepNum = step + 1;
      const ok = await persistCurrentProgress(nextStepNum, false);

      if (ok) {
        if (isEndOfAula1) {
          setAula1CompletedBanner(true);
          toast({
            title: 'Etapa da Aula 1 concluída e salva! 🎉',
            description: 'Seus Dons e Coração foram salvos (70% concluído). Você pode parar por aqui hoje ou seguir para o Perfil DISC da Aula 2!',
          });
        } else {
          toast({
            title: `Parte ${partNum} de 3 salva com sucesso! 💾`,
            description: 'Progresso gravado. Vamos para a próxima página de dons!',
          });
        }
        setStep(nextStepNum);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    // Passo 6 (Aula 2 - 6A): Perfil DISC
    if (step === 6) {
      const unansweredDisc = DISC_QUESTIONS.filter((q) => !discAnswers[q.id] || discAnswers[q.id].length < 4);
      if (unansweredDisc.length > 0) {
        await persistCurrentProgress(step, false);

        toast({
          variant: 'destructive',
          title: `Faltam ${unansweredDisc.length} questões para ordenar no Perfil DISC`,
          description: 'Suas ordens já definidas foram salvas! Ordene as questões restantes para avançar.',
        });

        const firstMissing = document.getElementById(`disc-question-${unansweredDisc[0].id}`);
        if (firstMissing) {
          firstMissing.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }

      const ok = await persistCurrentProgress(7, false);
      if (ok) {
        toast({
          title: 'Perfil DISC salvo com sucesso! 💾',
          description: 'Agora vamos registrar suas Habilidades e Disponibilidade para gerar seu cartão (85% concluído).',
        });
        setStep(7);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    // Passo 7 (Aula 2 - 6B): Habilidades & Disponibilidade -> Finaliza o Molde de Servo (100%)
    if (step === 7) {
      if (selectedAbilities.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Selecione suas habilidades',
          description: 'Por favor, selecione pelo menos 1 habilidade prática na seção 1 antes de gerar seu Cartão do Servo.',
        });
        return;
      }

      const ok = await persistCurrentProgress(8, true);
      if (ok) {
        toast({
          title: 'Molde de Servo 100% concluído! 🎉',
          description: 'Seu Cartão do Servo foi gerado e salvo no seu perfil.',
        });
        setStep(8);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }
  };

  const handlePrev = () => {
    if (isSavingStep) return;
    setStep((s) => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getNextButtonLabel = () => {
    if (isSavingStep) return 'Salvando...';
    if (step === 1) return 'Avançar para Aula 1';
    if (step === 2) return 'Salvar Coração e Ir para Dons';
    if (step === 3) return 'Salvar Parte 1 e Avançar';
    if (step === 4) return 'Salvar Parte 2 e Avançar';
    if (step === 5) return 'Salvar e Concluir Aula 1';
    if (step === 6) return 'Salvar DISC e Ir para Habilidades';
    if (step === 7) return 'Finalizar Aula 2 e Gerar Cartão';
    return 'Avançar';
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F9F8FC] text-slate-900 font-sans selection:bg-[#6750A4] selection:text-white">
      {/* Top Navbar Mobile & Desktop */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-150">
        <div className="max-w-md md:max-w-4xl mx-auto px-4 h-14 sm:h-16 flex items-center justify-between">
          <button
            type="button"
            onClick={handlePrev}
            disabled={step === 1 || isSavingStep}
            className={`p-2 -ml-2 rounded-full transition-colors ${
              step === 1 ? 'opacity-0 pointer-events-none' : 'text-slate-700 hover:bg-slate-100 active:scale-95'
            }`}
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center text-center">
            <span className="font-extrabold text-base sm:text-lg text-[#2B1B54] tracking-tight leading-none">
              Molde de Servo
            </span>
            <span className="text-[11px] font-semibold text-[#6750A4] tracking-tight mt-0.5">
              {STEP_SUBTITLES[step] || 'Avaliação Vocacional'}
            </span>
          </div>

          <div
            className="w-9 h-9 rounded-full bg-[#6750A4]/10 text-[#6750A4] flex items-center justify-center font-bold text-xs shrink-0"
            title={formData.name || 'Aluno'}
          >
            {formData.name ? formData.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
          </div>
        </div>

        {/* Barra de Progresso Superior */}
        <div className="w-full bg-slate-100 relative h-1.5">
          <div
            className="h-full bg-[#6750A4] transition-all duration-300 ease-out"
            style={{ width: `${Math.max(completionInfo.percentage, Math.round((step / TOTAL_STEPS) * 100))}%` }}
          />
        </div>
        <div className="max-w-md md:max-w-4xl mx-auto px-4 py-1 flex items-center justify-between">
          <span className="text-[10px] font-medium text-emerald-700">
            {formData.userId ? `✓ Vinculado • ${completionInfo.percentage}% preenchido` : 'Identifique-se para iniciar'}
          </span>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Passo {step} de {TOTAL_STEPS}
          </span>
        </div>
      </header>

      {/* Conteúdo Principal Adaptado ao Mobile & Desktop */}
      <main className="flex-1 w-full pt-20 sm:pt-24 pb-28">
        <div className="max-w-md md:max-w-3xl mx-auto px-4 sm:px-6">
          {/* Checkpoint Banner quando acaba de concluir a Aula 1 (Passo 5 -> 6) */}
          {step === 6 && aula1CompletedBanner && (
            <div className="mb-6 bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 sm:p-5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-sm font-extrabold text-emerald-950">
                    Parabéns! Você concluiu a etapa da Aula 1 (70% do formulário salvo)
                  </h3>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    Suas respostas de <strong>Coração</strong> e os seus <strong>Dons Espirituais</strong> já estão salvos no seu perfil. Se a sua <strong>Aula 2</strong> for em outro dia, você já pode fechar esta página tranquilamente — quando voltar, basta digitar seu e-mail para continuar direto daqui!
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <Step1Intro
              formData={formData}
              updateFormData={updateFormData}
              onNext={handleNext}
              onRestoreProgress={handleRestoreProgress}
            />
          )}
          {step === 2 && (
            <Step3Heart
              heartAnswers={heartAnswers}
              onHeartChange={handleHeartChange}
            />
          )}
          {step === 3 && (
            <Step4Gifts
              partNumber={1}
              giftAnswers={giftAnswers}
              onGiftAnswer={handleGiftAnswer}
            />
          )}
          {step === 4 && (
            <Step4Gifts
              partNumber={2}
              giftAnswers={giftAnswers}
              onGiftAnswer={handleGiftAnswer}
            />
          )}
          {step === 5 && (
            <Step4Gifts
              partNumber={3}
              giftAnswers={giftAnswers}
              onGiftAnswer={handleGiftAnswer}
            />
          )}
          {step === 6 && (
            <Step6Disc
              discAnswers={discAnswers}
              onDiscAnswer={handleDiscAnswer}
              legacyQuadrante={legacyQuadrante}
            />
          )}
          {step === 7 && (
            <Step2Abilities
              selectedAbilities={selectedAbilities}
              onToggleAbility={handleToggleAbility}
              experiences={experiences}
              onExperienceChange={handleExperienceChange}
              availability={availability}
              onToggleAvailability={handleToggleAvailability}
              giftAnswers={giftAnswers}
            />
          )}
          {step === 8 && (
            <Step5Result
              formData={formData}
              selectedAbilities={selectedAbilities}
              experiences={experiences}
              heartAnswers={heartAnswers}
              personalityAnswers={personalityAnswers}
              discAnswers={discAnswers}
              giftAnswers={giftAnswers}
              onRetakeDisc={() => {
                setStep(6);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )}
        </div>
      </main>

      {/* Bottom Sticky Navigation Bar (Mobile & Desktop) */}
      {step < TOTAL_STEPS && (
        <footer className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md shadow-[0_-4px_16px_rgba(43,27,84,0.06)] border-t border-slate-150 py-3">
          <div className="max-w-md md:max-w-3xl mx-auto px-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handlePrev}
              disabled={step === 1 || isSavingStep}
              className={`w-28 sm:w-36 h-12 rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                step === 1
                  ? 'bg-slate-100 text-slate-300 pointer-events-none'
                  : 'bg-[#EDE8F5] text-[#523A8C] hover:bg-[#E3DCF2] active:scale-98'
              }`}
            >
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={isSavingStep}
              className="flex-1 h-12 rounded-2xl font-bold text-xs sm:text-sm bg-[#523A8C] hover:bg-[#432E75] active:scale-98 text-white shadow-lg shadow-[#523A8C]/20 transition-all flex items-center justify-center gap-2 px-4 disabled:opacity-70"
            >
              {isSavingStep ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  {step > 1 && <Save className="w-4 h-4" />}
                  <span>{getNextButtonLabel()}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
