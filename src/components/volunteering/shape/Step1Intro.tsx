'use client';

import React, { useState } from 'react';
import {
  User,
  Mail,
  ArrowRight,
  Search,
  Loader2,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Globe,
  Heart,
  Wrench,
  Compass,
  FileText,
  Quote,
  AlertCircle,
  RotateCcw,
  BookmarkCheck,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { lookupMemberByEmail } from '@/app/public/molde-de-servo/actions';
import { useToast } from '@/hooks/use-toast';
import type { DiscLetter } from '@/lib/disc-questions';

export interface Step1FormData {
  email: string;
  name: string;
  phone: string;
  gcId: string;
  gcName: string;
  targetMinistry: string;
  userId: string | null;
  isMemberIdentified: boolean;
}

export interface SavedShapeProgress {
  id: string;
  status: 'in_progress' | 'completed';
  currentStep: number;
  completionPercentage?: number;
  abilities: string[];
  availability: string[];
  experiences: Record<string, string>;
  heart: Record<string, string>;
  personality: Record<string, number>;
  gifts: Record<string, number>;
  discAnswers?: Record<string, DiscLetter[]> | Record<string, string>;
  discScores?: Record<string, number>;
  discPrimary?: string;
  discSecondary?: string;
  hasLegacyPersonality?: boolean;
  legacyQuadrante?: string | null;
  targetMinistry: string;
}

interface Step1IntroProps {
  formData: Step1FormData;
  updateFormData: (data: Partial<Step1FormData>) => void;
  onNext: () => void;
  onRestoreProgress?: (progress: SavedShapeProgress, jumpToStep?: boolean) => void;
}

export default function Step1Intro({
  formData,
  updateFormData,
  onNext,
  onRestoreProgress,
}: Step1IntroProps) {
  const { toast } = useToast();
  const [emailInput, setEmailInput] = useState(formData.email || '');
  const [isSearching, setIsSearching] = useState(false);
  const [lookupDone, setLookupDone] = useState(!!formData.isMemberIdentified && !!formData.userId);
  const [savedProgress, setSavedProgress] = useState<SavedShapeProgress | null>(null);
  const [foundMember, setFoundMember] = useState<{
    userId: string;
    realName: string;
    maskedName: string;
    realPhone: string;
    maskedPhone: string;
    gcId: string;
    gcName: string;
  } | null>(
    formData.userId
      ? {
          userId: formData.userId,
          realName: formData.name,
          maskedName: formData.name,
          realPhone: formData.phone,
          maskedPhone: formData.phone,
          gcId: formData.gcId,
          gcName: formData.gcName,
        }
      : null
  );

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!emailInput || !emailInput.includes('@')) {
      toast({
        variant: 'destructive',
        title: 'E-mail inválido',
        description: 'Por favor, digite o e-mail utilizado na sua inscrição.',
      });
      return;
    }

    setIsSearching(true);
    try {
      const res = await lookupMemberByEmail(emailInput);
      setLookupDone(true);

      if (res.found && res.userId) {
        setFoundMember({
          userId: res.userId,
          realName: res.realName,
          maskedName: res.maskedName,
          realPhone: res.realPhone,
          maskedPhone: res.maskedPhone,
          gcId: res.gcId || '',
          gcName: res.gcName || '',
        });
        updateFormData({
          email: emailInput.toLowerCase().trim(),
          name: res.realName,
          phone: res.realPhone,
          userId: res.userId,
          gcId: res.gcId || formData.gcId,
          gcName: res.gcName || formData.gcName,
          isMemberIdentified: true,
        });

        if (res.savedProgress) {
          setSavedProgress(res.savedProgress);
          if (onRestoreProgress) {
            onRestoreProgress(res.savedProgress, false);
          }
          toast({
            title: `Bem-vindo de volta, ${res.maskedName}! 🎉`,
            description: `Progresso de ${res.savedProgress.completionPercentage ?? 0}% carregado com sucesso.`,
          });
        } else {
          setSavedProgress(null);
          toast({
            title: `Olá, ${res.maskedName}! 🎉`,
            description: 'Localizamos seu cadastro no sistema com sucesso.',
          });
        }
      } else {
        setFoundMember(null);
        setSavedProgress(null);
        updateFormData({
          email: emailInput.toLowerCase().trim(),
          name: '',
          phone: '',
          userId: null,
          isMemberIdentified: false,
        });
        toast({
          variant: 'destructive',
          title: 'Cadastro não localizado',
          description: 'Verifique se digitou o mesmo e-mail usado na sua inscrição no curso.',
        });
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro na busca',
        description: 'Não foi possível consultar o cadastro. Tente novamente.',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleResetSearch = () => {
    setLookupDone(false);
    setFoundMember(null);
    setSavedProgress(null);
    setEmailInput('');
    updateFormData({
      email: '',
      name: '',
      phone: '',
      userId: null,
      isMemberIdentified: false,
    });
  };

  const handleStartDiscovery = () => {
    if (!formData.userId || !formData.isMemberIdentified) {
      if (!lookupDone && emailInput) {
        handleSearch();
        return;
      }
      toast({
        variant: 'destructive',
        title: 'Identificação obrigatória',
        description: 'Localize seu cadastro de aluno/membro pelo e-mail antes de iniciar.',
      });
      return;
    }
    onNext();
  };

  return (
    <div className="flex flex-col w-full gap-5 pb-4">
      {/* 1. Header Badges */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-[#EDE8F5] text-[#523A8C] flex items-center justify-center font-black text-[11px]">
            1
          </span>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#523A8C]">
            PASSO 1 DE 8 • IDENTIFICAÇÃO
          </span>
        </div>
        <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
          Etapa 1/8
        </span>
      </div>

      {/* 2. Hero Card Principal */}
      <div className="bg-white rounded-3xl p-6 border border-slate-150 shadow-sm flex flex-col gap-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#EDE8F5] text-[#523A8C] rounded-full text-[11px] font-bold uppercase tracking-wider w-max">
          📘 AULA 1 & 📗 AULA 2 • SALVAMENTO POR ETAPA
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-[#1E113F] tracking-tight leading-snug">
          Descubra o seu Molde de Servo
        </h1>

        <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
          Você foi planejado de forma única pelo Criador. Na <strong>Aula 1</strong> mapeamos seu Coração e seus Dons Espirituais; na <strong>Aula 2</strong> alinhamos sua Personalidade e Habilidades para gerar seu Cartão do Servo.
        </p>

        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 mt-1">
          <BookmarkCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-[11px] font-bold text-slate-600">
            Suas respostas são salvas a cada avanço — você pode concluir a Aula 1 hoje e retomar na Aula 2!
          </span>
        </div>
      </div>

      {/* 3. Versículo Card */}
      <div className="bg-[#EDE8F5]/60 rounded-2xl p-4 border border-[#523A8C]/15 flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-[#523A8C] text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
          <Quote className="w-4 h-4 fill-current" />
        </div>
        <div className="flex flex-col">
          <p className="text-xs sm:text-sm text-[#2B1B54] italic font-medium leading-snug">
            “Há diferentes tipos de dons, mas o Espírito é o mesmo. Há diferentes formas de servir, mas o Senhor é o mesmo.”
          </p>
          <span className="text-[10px] font-bold text-[#523A8C] mt-1 uppercase tracking-wider">
            1 Coríntios 12:4-5
          </span>
        </div>
      </div>

      {/* 4. Jornada S.H.A.P.E. (Ordem das Aulas) */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-black uppercase text-[#1E113F] tracking-wide">
            Roteiro por Aula
          </span>
          <span className="text-[11px] font-bold text-[#523A8C]">
            5 Pilares S.H.A.P.E.
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* H - Aula 1 */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-150 shadow-sm flex flex-col justify-between h-24">
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-black text-xs">
                H
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">
                Aula 1 • Passo 2
              </span>
            </div>
            <div>
              <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider block">
                HEART
              </span>
              <h4 className="text-xs font-black text-slate-800 leading-tight">
                Coração & Sonho
              </h4>
            </div>
          </div>

          {/* S - Aula 1 */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-150 shadow-sm flex flex-col justify-between h-24">
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded-lg bg-[#EDE8F5] text-[#523A8C] flex items-center justify-center font-black text-xs">
                S
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">
                Aula 1 • Passos 3–5
              </span>
            </div>
            <div>
              <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider block">
                SPIRITUAL GIFTS
              </span>
              <h4 className="text-xs font-black text-slate-800 leading-tight">
                Inventário de Dons (3 partes)
              </h4>
            </div>
          </div>

          {/* P - Aula 2 */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-150 shadow-sm flex flex-col justify-between h-24">
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs">
                P
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                Aula 2 • Passo 6
              </span>
            </div>
            <div>
              <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider block">
                PERSONALITY
              </span>
              <h4 className="text-xs font-black text-slate-800 leading-tight">
                Perfil DISC (12 itens)
              </h4>
            </div>
          </div>

          {/* A & E - Aula 2 */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-150 shadow-sm flex flex-col justify-between h-24">
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-black text-xs">
                A+E
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                Aula 2 • Passo 7
              </span>
            </div>
            <div>
              <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider block">
                ABILITIES & EXP
              </span>
              <h4 className="text-xs font-black text-slate-800 leading-tight">
                Habilidades & Rotina
              </h4>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Dados do Servo / Identificação Obrigatória */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-150 shadow-sm flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <div className="w-7 h-7 rounded-lg bg-[#EDE8F5] text-[#523A8C] flex items-center justify-center">
            <User className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-[#1E113F] leading-tight">
              Identificação do Aluno / Membro
            </h3>
            <p className="text-[11px] text-slate-500">
              Utilize o mesmo e-mail cadastrado na sua inscrição do curso
            </p>
          </div>
        </div>

        {!lookupDone ? (
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email-search-mobile" className="text-xs font-bold text-slate-700">
                E-mail Cadastrado <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <Input
                  id="email-search-mobile"
                  type="email"
                  required
                  placeholder="seuemail@exemplo.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="h-12 pl-10 rounded-2xl bg-slate-50 border-slate-200 text-sm font-medium focus-visible:ring-[#523A8C]"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSearching || !emailInput}
              className="w-full h-12 rounded-2xl font-bold bg-[#523A8C] hover:bg-[#432E75] text-white shadow-md flex items-center justify-center gap-2 text-sm"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Localizar Meu Cadastro</span>
            </Button>
          </form>
        ) : foundMember ? (
          <div className="space-y-4 animate-in fade-in">
            <div className="p-4 bg-[#EDE8F5]/60 rounded-2xl border border-[#523A8C]/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#523A8C] text-white flex items-center justify-center font-bold text-sm shadow-sm">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1 text-[10px] font-extrabold uppercase text-[#523A8C]">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Cadastro Vinculado
                  </div>
                  <h4 className="font-extrabold text-sm text-[#1E113F]">
                    {foundMember.maskedName || formData.name}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {foundMember.maskedPhone || formData.phone || formData.email}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetSearch}
                className="text-xs font-bold text-[#523A8C] hover:underline p-1"
              >
                Trocar
              </button>
            </div>

            {/* Banner de Progresso Salvo (Retomada com % de preenchimento) */}
            {savedProgress && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookmarkCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-xs font-black text-emerald-950 uppercase tracking-wide">
                      {savedProgress.status === 'completed'
                        ? 'Avaliação 100% Concluída!'
                        : savedProgress.currentStep >= 7
                        ? 'Perfil DISC Concluído! Pronto para o Passo 7 (Habilidades)'
                        : savedProgress.currentStep >= 6
                        ? 'Aula 1 Concluída! Pronto para a Aula 2 (DISC)'
                        : `Progresso Salvo (Etapa ${savedProgress.currentStep} de 8)`}
                    </span>
                  </div>
                  <span className="text-xs font-black text-emerald-700 bg-white px-2.5 py-0.5 rounded-full border border-emerald-200">
                    {savedProgress.completionPercentage ?? 0}% preenchido
                  </span>
                </div>

                {/* Barra de Progresso Salvo */}
                <div className="w-full bg-emerald-200/60 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${savedProgress.completionPercentage ?? 0}%` }}
                  />
                </div>

                <p className="text-xs text-emerald-800 leading-relaxed">
                  {savedProgress.status === 'completed'
                    ? 'Suas respostas já estão salvas. Você pode visualizar seu Cartão do Servo ou revisar suas respostas.'
                    : savedProgress.currentStep >= 6
                    ? 'Você já concluiu o Coração e os 133 itens do Inventário de Dons (Aula 1). Agora você pode avançar direto para o Inventário DISC e Habilidades (Aula 2)!'
                    : `Você já respondeu ${Object.keys(savedProgress.gifts || {}).length}/133 questões de dons. Continue exatamente de onde parou!`}
                </p>

                {onRestoreProgress && savedProgress.currentStep > 1 && (
                  <button
                    type="button"
                    onClick={() => onRestoreProgress(savedProgress, true)}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                  >
                    <span>
                      {savedProgress.status === 'completed'
                        ? 'Ver Meu Cartão do Servo (Resultado)'
                        : savedProgress.currentStep >= 7
                        ? 'Ir para a Aula 2 (Passo 7: Habilidades & Experiências)'
                        : savedProgress.currentStep >= 6
                        ? 'Ir direto para a Aula 2 (Passo 6: Perfil DISC)'
                        : `Continuar da Etapa ${savedProgress.currentStep}`}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handleStartDiscovery}
              className="w-full h-13 py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider bg-[#523A8C] hover:bg-[#432E75] active:scale-98 text-white shadow-xl shadow-[#523A8C]/25 transition-all flex items-center justify-center gap-2"
            >
              <span>
                {savedProgress ? 'Revisar desde a Aula 1 (Passo 2)' : 'Iniciar Aula 1 (Coração & Dons)'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in">
            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 text-rose-900 space-y-2">
              <div className="flex items-center gap-2 font-extrabold text-xs text-rose-700 uppercase tracking-wide">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Cadastro Prévio Necessário</span>
              </div>
              <p className="text-xs leading-relaxed text-rose-800">
                Não encontramos nenhum aluno ou membro cadastrado com o e-mail{' '}
                <strong>{emailInput}</strong>.
              </p>
              <p className="text-[11px] text-rose-700/90 leading-relaxed">
                Para preencher o Molde de Servo, é imprescindível estar inscrito no curso / cadastrado no sistema da igreja. Verifique se digitou o e-mail corretamente ou tente outro e-mail que você utiliza.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleResetSearch}
              className="w-full h-11 rounded-2xl font-bold text-xs border-slate-300 text-slate-700 flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Tentar Outro E-mail</span>
            </Button>
          </div>
        )}

        {/* LGPD Badge */}
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center gap-2.5 text-[11px] text-slate-500 mt-1">
          <ShieldCheck className="w-4 h-4 text-[#523A8C] shrink-0" />
          <span>
            Ambiente seguro. <strong>Protegido pela LGPD</strong> • Seus dados são vinculados ao seu cadastro pastoral.
          </span>
        </div>
      </div>
    </div>
  );
}
