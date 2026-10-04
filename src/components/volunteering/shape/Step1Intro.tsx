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
  Phone, 
  RotateCcw,
  ShieldCheck,
  Globe,
  Heart,
  Wrench,
  Compass,
  FileText,
  Quote
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { lookupMemberByEmail } from '@/app/public/molde-de-servo/actions';
import { useToast } from '@/hooks/use-toast';

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

interface Step1IntroProps {
  formData: Step1FormData;
  updateFormData: (data: Partial<Step1FormData>) => void;
  onNext: () => void;
}

export default function Step1Intro({ formData, updateFormData, onNext }: Step1IntroProps) {
  const { toast } = useToast();
  const [emailInput, setEmailInput] = useState(formData.email || '');
  const [isSearching, setIsSearching] = useState(false);
  const [lookupDone, setLookupDone] = useState(!!formData.isMemberIdentified || !!formData.name);
  const [foundMember, setFoundMember] = useState<{
    userId: string;
    realName: string;
    maskedName: string;
    realPhone: string;
    maskedPhone: string;
    gcId: string;
    gcName: string;
  } | null>(formData.userId ? {
    userId: formData.userId,
    realName: formData.name,
    maskedName: formData.name,
    realPhone: formData.phone,
    maskedPhone: formData.phone,
    gcId: formData.gcId,
    gcName: formData.gcName,
  } : null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!emailInput || !emailInput.includes('@')) {
      toast({
        variant: 'destructive',
        title: 'E-mail inválido',
        description: 'Por favor, digite um e-mail válido para busca.',
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
        toast({
          title: `Olá, ${res.maskedName}! 🎉`,
          description: 'Localizamos seu cadastro de membro com sucesso.',
        });
      } else {
        setFoundMember(null);
        updateFormData({
          email: emailInput.toLowerCase().trim(),
          userId: null,
          isMemberIdentified: false,
        });
        toast({
          title: 'E-mail não cadastrado',
          description: 'Informe seu nome e WhatsApp para continuar.',
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
    if (!formData.email || (!formData.name && !formData.isMemberIdentified)) {
      if (!lookupDone) {
        handleSearch();
        return;
      }
      toast({
        variant: 'destructive',
        title: 'Identificação necessária',
        description: 'Preencha seus dados para começar.',
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
            PASSO 1 DE 5 • INÍCIO
          </span>
        </div>
        <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
          Etapa 1/5
        </span>
      </div>

      {/* 2. Hero Card Principal */}
      <div className="bg-white rounded-3xl p-6 border border-slate-150 shadow-sm flex flex-col gap-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#EDE8F5] text-[#523A8C] rounded-full text-[11px] font-bold uppercase tracking-wider w-max">
          ⏱️ ETAPA INICIAL • 15 MIN
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-[#1E113F] tracking-tight leading-snug">
          Descubra o seu Molde de Servo
        </h1>

        <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
          Você foi planejado de forma única pelo Criador. Compreenda claramente seus dons espirituais, paixões e temperamento para servir com alegria genuína e propósito eterno (1 Coríntios 12).
        </p>

        {/* Social Proof / Avatars */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-100 mt-1">
          <div className="flex -space-x-1.5">
            {['GS', 'MF', 'AL'].map((initials, i) => (
              <div
                key={i}
                className="w-6 h-6 rounded-full bg-[#6750A4] text-white flex items-center justify-center font-bold text-[9px] border-2 border-white ring-1 ring-slate-100"
              >
                {initials}
              </div>
            ))}
          </div>
          <span className="text-[11px] font-bold text-slate-500">
            +140 servos moldados neste mês
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

      {/* 4. Jornada S.H.A.P.E. (5 Pilares de Alinhamento) */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-black uppercase text-[#1E113F] tracking-wide">
            Jornada S.H.A.P.E.
          </span>
          <span className="text-[11px] font-bold text-[#523A8C]">
            5 Pilares de Alinhamento
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* S */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-150 shadow-sm flex flex-col justify-between h-24">
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded-lg bg-[#EDE8F5] text-[#523A8C] flex items-center justify-center font-black text-xs">
                S
              </span>
              <Globe className="w-4 h-4 text-[#523A8C]/60" />
            </div>
            <div>
              <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider block">
                SPIRITUAL GIFTS
              </span>
              <h4 className="text-xs font-black text-slate-800 leading-tight">
                Dons Espirituais
              </h4>
            </div>
          </div>

          {/* H */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-150 shadow-sm flex flex-col justify-between h-24">
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-black text-xs">
                H
              </span>
              <Heart className="w-4 h-4 text-rose-500/60" />
            </div>
            <div>
              <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider block">
                HEART
              </span>
              <h4 className="text-xs font-black text-slate-800 leading-tight">
                Coração & Paixão
              </h4>
            </div>
          </div>

          {/* A */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-150 shadow-sm flex flex-col justify-between h-24">
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-black text-xs">
                A
              </span>
              <Wrench className="w-4 h-4 text-amber-500/60" />
            </div>
            <div>
              <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider block">
                ABILITIES
              </span>
              <h4 className="text-xs font-black text-slate-800 leading-tight">
                Habilidades Naturais
              </h4>
            </div>
          </div>

          {/* P */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-150 shadow-sm flex flex-col justify-between h-24">
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs">
                P
              </span>
              <Compass className="w-4 h-4 text-blue-500/60" />
            </div>
            <div>
              <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider block">
                PERSONALITY
              </span>
              <h4 className="text-xs font-black text-slate-800 leading-tight">
                Personalidade
              </h4>
            </div>
          </div>
        </div>

        {/* E */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-150 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-xs">
              E
            </span>
            <div>
              <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider block">
                EXPERIENCES
              </span>
              <h4 className="text-xs font-black text-slate-800 leading-tight">
                Experiências de Vida
              </h4>
            </div>
          </div>
          <FileText className="w-4 h-4 text-emerald-500/60" />
        </div>
      </div>

      {/* 5. Dados do Servo / Identificação */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-150 shadow-sm flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <div className="w-7 h-7 rounded-lg bg-[#EDE8F5] text-[#523A8C] flex items-center justify-center">
            <User className="w-4 h-4" />
          </div>
          <h3 className="font-extrabold text-sm sm:text-base text-[#1E113F]">
            Dados do Servo
          </h3>
        </div>

        {!lookupDone ? (
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email-search-mobile" className="text-xs font-bold text-slate-700">
                E-mail Principal <span className="text-rose-500">*</span>
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
              <span>Localizar Cadastro</span>
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
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Membro Confirmado
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
          </div>
        ) : (
          <div className="space-y-3.5 animate-in fade-in">
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs font-medium flex items-center justify-between">
              <span>E-mail não cadastrado. Preencha seus dados:</span>
              <button type="button" onClick={handleResetSearch} className="font-bold underline text-amber-900 ml-2">
                Alterar
              </button>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                Nome Completo <span className="text-rose-500">*</span>
              </Label>
              <Input
                required
                placeholder="Ex: Ana Clara Silva"
                value={formData.name}
                onChange={(e) => updateFormData({ name: e.target.value })}
                className="h-11 rounded-xl bg-slate-50 border-slate-200 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                WhatsApp <span className="text-rose-500">*</span>
              </Label>
              <Input
                required
                type="tel"
                placeholder="(21) 99999-9999"
                value={formData.phone}
                onChange={(e) => updateFormData({ phone: e.target.value })}
                className="h-11 rounded-xl bg-slate-50 border-slate-200 text-sm"
              />
            </div>
          </div>
        )}

        {/* LGPD Badge */}
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center gap-2.5 text-[11px] text-slate-500 mt-1">
          <ShieldCheck className="w-4 h-4 text-[#523A8C] shrink-0" />
          <span>
            Ambiente seguro. <strong>Protegido pela LGPD</strong> • Seus dados são confidenciais e para pastoreio.
          </span>
        </div>

        {/* CTA Começar Descoberta Vocacional */}
        <button
          type="button"
          onClick={handleStartDiscovery}
          className="w-full h-13 py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider bg-[#523A8C] hover:bg-[#432E75] active:scale-98 text-white shadow-xl shadow-[#523A8C]/25 transition-all flex items-center justify-center gap-2 mt-2"
        >
          <span>Começar Descoberta Vocacional</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
