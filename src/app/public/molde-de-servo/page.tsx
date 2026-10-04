'use client';
import { useState } from 'react';
import Step1Intro from '@/components/volunteering/shape/Step1Intro';
import Step2Abilities from '@/components/volunteering/shape/Step2Abilities';
import Step3Heart from '@/components/volunteering/shape/Step3Heart';
import Step4Gifts from '@/components/volunteering/shape/Step4Gifts';
import Step5Result from '@/components/volunteering/shape/Step5Result';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export default function MoldeDeServoPage() {
  const [step, setStep] = useState(1);

  const handleNext = () => setStep(s => Math.min(s + 1, 5));
  const handlePrev = () => setStep(s => Math.max(s - 1, 1));

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur shadow-sm border-b">
        <div className="h-1 bg-muted">
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${(step / 5) * 100}%` }} />
        </div>
        <div className="h-16 max-w-4xl mx-auto px-4 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-semibold text-foreground">Molde de Servo</span>
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider hidden sm:block">Avaliação Vocacional</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-bold">
              Etapa {step} de 5
            </div>
          </div>
        </div>
      </header>
      
      <main className="flex-1 w-full pt-16 pb-24">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {step === 1 && <Step1Intro />}
          {step === 2 && <Step2Abilities />}
          {step === 3 && <Step3Heart />}
          {step === 4 && <Step4Gifts />}
          {step === 5 && <Step5Result />}
        </div>
      </main>

      {step < 5 && (
        <footer className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur shadow-[0_-4px_12px_rgba(0,0,0,0.05)] border-t">
          <div className="h-20 max-w-4xl mx-auto px-4 flex items-center justify-between">
            <Button variant="ghost" onClick={handlePrev} disabled={step === 1} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Button>
            <Button onClick={handleNext} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
              Continuar <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </footer>
      )}
    </div>
  );
}
