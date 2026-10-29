'use client';

import React, { useState } from 'react';
import Step1Intro, { Step1FormData, SavedShapeProgress } from '@/components/volunteering/shape/Step1Intro';
import Step2Abilities from '@/components/volunteering/shape/Step2Abilities';
import Step3Heart from '@/components/volunteering/shape/Step3Heart';
import Step4Gifts, { GIFT_PARTS_RANGES } from '@/components/volunteering/shape/Step4Gifts';
import Step5Result from '@/components/volunteering/shape/Step5Result';
import { ArrowLeft, ArrowRight, User, Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SHAPE_DATA } from '@/lib/shape-complete-data';
import { saveShapeStepProgress } from './actions';

const TOTAL_STEPS = 7;

const STEP_SUBTITLES: Record<number, string> = {
  1: 'Identificação do Aluno',
  2: 'Habilidades & Disponibilidade',
  3: 'Coração & Personalidade',
  4: 'Inventário de Dons (Parte 1 de 3)',
  5: 'Inventário de Dons (Parte 2 de 3)',
  6: 'Inventário de Dons (Parte 3 de 3)',
  7: 'Cartão do Servo • Resultado',
};

export default function MoldeDeServoPage() {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isSavingStep, setIsSavingStep] = useState(false);

  // Step 1: Identificação (vinculada obrigatoriamente a um userId)
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

  // Step 2: Habilidades & Experiências
  const [selectedAbilities, setSelectedAbilities] = useState<string[]>([]);
  const [experiences, setExperiences] = useState<Record<string, string>>({});
  const [availability, setAvailability] = useState<string[]>([]);

  // Step 3: Coração & Personalidade
  const [heartAnswers, setHeartAnswers] = useState<Record<string, string>>({});
  const [personalityAnswers, setPersonalityAnswers] = useState<Record<string, number>>({});

  // Steps 4, 5 e 6: Dons Espirituais (133 questões divididas em 3 páginas)
  const [giftAnswers, setGiftAnswers] = useState<Record<string, number>>({});

  const updateFormData = (data: Partial<Step1FormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const handleRestoreProgress = (progress: SavedShapeProgress, jumpToStep = false) => {
    if (progress.abilities) setSelectedAbilities(progress.abilities);
    if (progress.availability) setAvailability(progress.availability);
    if (progress.experiences) setExperiences(progress.experiences);
    if (progress.heart) setHeartAnswers(progress.heart);
    if (progress.personality) setPersonalityAnswers(progress.personality);
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

  const handlePersonalityChange = (id: string, value: number) => {
    setPersonalityAnswers((prev) => ({ ...prev, [id]: value }));
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

    // Validação Step 1: Obrigatório possuir userId do sistema
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

    // Validação e Salvamento Step 2: Habilidades & Disponibilidade
    if (step === 2) {
      if (selectedAbilities.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Selecione suas habilidades',
          description: 'Por favor, selecione pelo menos 1 habilidade para salvar e continuar.',
        });
        return;
      }

      const ok = await persistCurrentProgress(3, false);
      if (ok) {
        toast({
          title: 'Etapa salva! 💾',
          description: 'Suas habilidades e disponibilidade foram salvas com sucesso.',
        });
        setStep(3);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    // Validação e Salvamento Step 3: Coração & Personalidade
    if (step === 3) {
      const ok = await persistCurrentProgress(4, false);
      if (ok) {
        toast({
          title: 'Etapa salva! 💾',
          description: 'Suas respostas de Coração e Personalidade foram salvas.',
        });
        setStep(4);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    // Validação e Salvamento Steps 4, 5 e 6: Dons Espirituais (Partes 1, 2 e 3)
    if (step === 4 || step === 5 || step === 6) {
      const partNum = (step - 3) as 1 | 2 | 3;
      const range = GIFT_PARTS_RANGES[partNum];
      const partQuestions = SHAPE_DATA.giftQuestions.slice(range.start, range.end);
      const unansweredInPart = partQuestions.filter((q) => giftAnswers[q.id] === undefined);

      if (unansweredInPart.length > 0) {
        // Mesmo faltando perguntas na página, salvamos o rascunho atual para não perder nada!
        await persistCurrentProgress(step, false);

        toast({
          variant: 'destructive',
          title: `Faltam ${unansweredInPart.length} questões nesta página`,
          description: `Suas respostas já marcadas foram salvas! Responda as questões restantes desta parte para avançar.`,
        });

        const firstMissingEl = document.getElementById(`gift-question-${unansweredInPart[0].id}`);
        if (firstMissingEl) {
          firstMissingEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }

      const isFinalGiftPart = step === 6;
      const nextStepNum = step + 1;
      const ok = await persistCurrentProgress(nextStepNum, isFinalGiftPart);

      if (ok) {
        toast({
          title: isFinalGiftPart
            ? 'Molde de Servo concluído! 🎉'
            : `Parte ${partNum} de 3 salva com sucesso! 💾`,
          description: isFinalGiftPart
            ? 'Seu Cartão do Servo foi gerado e vinculado ao seu perfil.'
            : 'Progresso gravado. Vamos para a próxima parte dos dons!',
        });
        setStep(nextStepNum);
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
    if (step === 1) return 'Avançar';
    if (step === 2) return 'Salvar Habilidades e Avançar';
    if (step === 3) return 'Salvar Coração e Avançar';
    if (step === 4) return 'Salvar Parte 1 e Avançar';
    if (step === 5) return 'Salvar Parte 2 e Avançar';
    if (step === 6) return 'Finalizar e Gerar Cartão';
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

        {/* Barra de Progresso Superior com indicador "Passo X de 7" */}
        <div className="w-full bg-slate-100 relative h-1">
          <div
            className="h-full bg-[#6750A4] transition-all duration-300 ease-out"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
        <div className="max-w-md md:max-w-4xl mx-auto px-4 py-1 flex items-center justify-between">
          <span className="text-[10px] font-medium text-emerald-700">
            {formData.userId ? '✓ Vinculado ao seu cadastro' : 'Identifique-se para iniciar'}
          </span>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Passo {step} de {TOTAL_STEPS}
          </span>
        </div>
      </header>

      {/* Conteúdo Principal Adaptado ao Mobile & Desktop */}
      <main className="flex-1 w-full pt-20 sm:pt-24 pb-28">
        <div className="max-w-md md:max-w-3xl mx-auto px-4 sm:px-6">
          {step === 1 && (
            <Step1Intro
              formData={formData}
              updateFormData={updateFormData}
              onNext={handleNext}
              onRestoreProgress={handleRestoreProgress}
            />
          )}
          {step === 2 && (
            <Step2Abilities
              selectedAbilities={selectedAbilities}
              onToggleAbility={handleToggleAbility}
              experiences={experiences}
              onExperienceChange={handleExperienceChange}
              availability={availability}
              onToggleAvailability={handleToggleAvailability}
            />
          )}
          {step === 3 && (
            <Step3Heart
              heartAnswers={heartAnswers}
              onHeartChange={handleHeartChange}
              personalityAnswers={personalityAnswers}
              onPersonalityChange={handlePersonalityChange}
            />
          )}
          {step === 4 && (
            <Step4Gifts
              partNumber={1}
              giftAnswers={giftAnswers}
              onGiftAnswer={handleGiftAnswer}
            />
          )}
          {step === 5 && (
            <Step4Gifts
              partNumber={2}
              giftAnswers={giftAnswers}
              onGiftAnswer={handleGiftAnswer}
            />
          )}
          {step === 6 && (
            <Step4Gifts
              partNumber={3}
              giftAnswers={giftAnswers}
              onGiftAnswer={handleGiftAnswer}
            />
          )}
          {step === 7 && (
            <Step5Result
              formData={formData}
              selectedAbilities={selectedAbilities}
              experiences={experiences}
              heartAnswers={heartAnswers}
              personalityAnswers={personalityAnswers}
              giftAnswers={giftAnswers}
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
