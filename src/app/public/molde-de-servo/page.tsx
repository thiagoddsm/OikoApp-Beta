'use client';

import React, { useState } from 'react';
import Step1Intro, { Step1FormData } from '@/components/volunteering/shape/Step1Intro';
import Step2Abilities from '@/components/volunteering/shape/Step2Abilities';
import Step3Heart from '@/components/volunteering/shape/Step3Heart';
import Step4Gifts from '@/components/volunteering/shape/Step4Gifts';
import Step5Result from '@/components/volunteering/shape/Step5Result';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SHAPE_DATA } from '@/lib/shape-complete-data';

const STEP_SUBTITLES: Record<number, string> = {
  1: 'Dons Espirituais & Início',
  2: 'Habilidades & Talentos',
  3: 'Personalidade & Coração',
  4: 'Inventário de Dons',
  5: 'Cartão do Servo',
};

export default function MoldeDeServoPage() {
  const { toast } = useToast();
  const [step, setStep] = useState(1);

  // Step 1: Identificação
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

  // Step 4: Dons Espirituais
  const [giftAnswers, setGiftAnswers] = useState<Record<string, number>>({});

  const updateFormData = (data: Partial<Step1FormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
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

  const handleNext = () => {
    // Validação Step 1
    if (step === 1) {
      if (!formData.email || (!formData.name && !formData.isMemberIdentified)) {
        toast({
          variant: 'destructive',
          title: 'Identificação necessária',
          description: 'Por favor, busque seu e-mail ou informe seus dados para avançar.',
        });
        return;
      }
    }

    // Validação Step 2
    if (step === 2) {
      if (selectedAbilities.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Selecione suas habilidades',
          description: 'Por favor, selecione pelo menos 1 habilidade para continuar.',
        });
        return;
      }
    }

    // Validação Step 4
    if (step === 4) {
      const answered = Object.keys(giftAnswers).length;
      const total = SHAPE_DATA.giftQuestions.length;
      if (answered < 40) {
        toast({
          variant: 'destructive',
          title: 'Responda mais questões',
          description: `Você respondeu ${answered} de ${total} questões. Responda pelo menos 40 perguntas para calcular o resultado com precisão.`,
        });
        return;
      }
    }

    setStep((s) => Math.min(s + 1, 5));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrev = () => {
    setStep((s) => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F9F8FC] text-slate-900 font-sans selection:bg-[#6750A4] selection:text-white">
      {/* Top Navbar Mobile & Desktop */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-150">
        <div className="max-w-md md:max-w-4xl mx-auto px-4 h-14 sm:h-16 flex items-center justify-between">
          <button
            type="button"
            onClick={handlePrev}
            disabled={step === 1}
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

          <div className="w-9 h-9 rounded-full bg-[#6750A4]/10 text-[#6750A4] flex items-center justify-center font-bold text-xs shrink-0">
            {formData.name ? formData.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
          </div>
        </div>

        {/* Barra de Progresso Superior com indicador "Passo X de 5" */}
        <div className="w-full bg-slate-100 relative h-1">
          <div
            className="h-full bg-[#6750A4] transition-all duration-300 ease-out"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>
        <div className="max-w-md md:max-w-4xl mx-auto px-4 py-1 flex justify-end">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Passo {step} de 5
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
              giftAnswers={giftAnswers}
              onGiftAnswer={handleGiftAnswer}
              onFinish={handleNext}
            />
          )}
          {step === 5 && (
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
      {step < 5 && (
        <footer className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md shadow-[0_-4px_16px_rgba(43,27,84,0.06)] border-t border-slate-150 py-3">
          <div className="max-w-md md:max-w-3xl mx-auto px-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handlePrev}
              disabled={step === 1}
              className={`flex-1 h-12 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-1.5 ${
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
              className="flex-1 h-12 rounded-2xl font-bold text-sm bg-[#523A8C] hover:bg-[#432E75] active:scale-98 text-white shadow-lg shadow-[#523A8C]/20 transition-all flex items-center justify-center gap-1.5"
            >
              Avançar <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
