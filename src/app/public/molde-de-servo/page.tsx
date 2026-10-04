'use client';

import React, { useState } from 'react';
import Step1Intro, { Step1FormData } from '@/components/volunteering/shape/Step1Intro';
import Step2Abilities from '@/components/volunteering/shape/Step2Abilities';
import Step3Heart from '@/components/volunteering/shape/Step3Heart';
import Step4Gifts from '@/components/volunteering/shape/Step4Gifts';
import Step5Result from '@/components/volunteering/shape/Step5Result';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SHAPE_DATA } from '@/lib/shape-complete-data';

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
          description: 'Por favor, busque seu e-mail ou preencha seus dados para avançar.',
        });
        return;
      }
    }

    // Validação Step 2 (pelo menos 1 habilidade selecionada)
    if (step === 2) {
      if (selectedAbilities.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Selecione suas habilidades',
          description: 'Por favor, marque pelo menos 1 habilidade para continuar.',
        });
        return;
      }
    }

    // Validação Step 4 (verificar se respondeu pelo menos 80% do inventário para ter precisão estatística)
    if (step === 4) {
      const answered = Object.keys(giftAnswers).length;
      const total = SHAPE_DATA.giftQuestions.length;
      if (answered < 50) {
        toast({
          variant: 'destructive',
          title: 'Responda mais perguntas',
          description: `Você respondeu ${answered} de ${total} perguntas. Responda mais questões para calcular seus dons com fidelidade.`,
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
    <div className="min-h-screen flex flex-col bg-slate-50 selection:bg-primary selection:text-white">
      {/* Top Header com Barra de Progresso */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur shadow-sm border-b">
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>
        <div className="h-16 max-w-4xl mx-auto px-4 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-bold text-foreground tracking-tight">Molde de Servo</span>
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider hidden sm:block font-semibold">
              OikoSHAPE • Avaliação Vocacional
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
              Etapa {step} de 5
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 w-full pt-20 pb-28">
        <div className="max-w-4xl mx-auto px-4 py-4">
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

      {/* Footer Fixo de Navegação */}
      {step < 5 && (
        <footer className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur shadow-[0_-4px_12px_rgba(0,0,0,0.05)] border-t">
          <div className="h-20 max-w-4xl mx-auto px-4 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={handlePrev}
              disabled={step === 1}
              className="gap-2 font-bold text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Button>
            <Button
              onClick={handleNext}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-6 shadow-md"
            >
              Continuar <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </footer>
      )}
    </div>
  );
}
