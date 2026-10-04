'use client';

import React, { useState, useEffect } from 'react';
import { 
  Compass, 
  User, 
  Mail, 
  Users, 
  HeartHandshake, 
  ArrowRight, 
  Lightbulb, 
  Search, 
  Loader2, 
  CheckCircle2, 
  Sparkles, 
  Info,
  Phone,
  RotateCcw
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { lookupMemberByEmail, getPublicGCs } from '@/app/public/molde-de-servo/actions';
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
  
  const [gcs, setGcs] = useState<Array<{ id: string; name: string; leaders: string; neighborhood: string }>>([]);
  const [loadingGCs, setLoadingGCs] = useState(true);

  // Carrega lista pública de GCs
  useEffect(() => {
    async function loadGCs() {
      try {
        const list = await getPublicGCs();
        setGcs(list || []);
      } catch (e) {
        console.error('Erro ao carregar GCs:', e);
      } finally {
        setLoadingGCs(false);
      }
    }
    loadGCs();
  }, []);

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
          description: 'Preencha seus dados abaixo para iniciar sua jornada.',
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

  const handleGcChange = (val: string) => {
    if (val === 'sem-gc') {
      updateFormData({ gcId: 'sem-gc', gcName: 'Ainda não faço parte de um GC' });
    } else {
      const selected = gcs.find(g => g.id === val);
      updateFormData({
        gcId: val,
        gcName: selected ? `${selected.name} (${selected.leaders})` : val,
      });
    }
  };

  return (
    <div className="flex flex-col w-full gap-8">
      {/* Banner Superior de Boas-Vindas */}
      <div className="relative overflow-hidden rounded-3xl bg-card border shadow-sm p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white shadow-lg shrink-0">
            <Compass className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-[11px] text-primary uppercase font-bold tracking-wider">
                Etapa 1 • Identificação
              </span>
              <span className="text-xs text-muted-foreground">• Tempo estimado: 15 min</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Descubra o seu Molde de Servo
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base max-w-2xl leading-relaxed">
              Você foi criado com uma assinatura singular. Deus entrelaçou seus dons, paixões e história para cumprir um propósito no Corpo de Cristo.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Painel Principal de Identificação */}
        <div className="lg:col-span-8 bg-card rounded-3xl p-6 sm:p-8 border shadow-sm flex flex-col gap-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold">Identificação do Membro</h2>
                <p className="text-xs sm:text-sm text-muted-foreground">Localize seu cadastro através do seu e-mail</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
              Passo 1/5
            </span>
          </div>

          {/* 1. BUSCA POR E-MAIL */}
          {!lookupDone ? (
            <form onSubmit={handleSearch} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email-search" className="text-sm font-semibold flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-primary" />
                  E-mail Principal <span className="text-destructive">*</span>
                </Label>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1">
                    <Input
                      id="email-search"
                      type="email"
                      required
                      placeholder="seu.email@exemplo.com"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="h-12 text-base rounded-xl pl-4"
                      autoFocus
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isSearching || !emailInput}
                    className="h-12 px-6 rounded-xl font-bold bg-primary hover:bg-primary/90 text-white shadow-md flex items-center justify-center gap-2"
                  >
                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    <span>Buscar Cadastro</span>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground pl-1">
                  Digite o e-mail que você utiliza na igreja para identificarmos seu cadastro automaticamente.
                </p>
              </div>
            </form>
          ) : foundMember ? (
            /* 2. MEMBRO ENCONTRADO */
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
              <div className="p-5 sm:p-6 bg-primary/5 rounded-2xl border-2 border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-md shrink-0">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider mb-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Cadastro Localizado
                    </div>
                    <h3 className="text-lg font-black text-foreground">
                      {foundMember.maskedName || formData.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {foundMember.maskedPhone || formData.phone || formData.email}
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetSearch}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground gap-1 h-9 rounded-xl"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Trocar e-mail
                </Button>
              </div>

              {/* Campos adicionais após localização */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Grupo de Conexão / GC
                  </Label>
                  <Select
                    value={formData.gcId || 'sem-gc'}
                    onValueChange={handleGcChange}
                  >
                    <SelectTrigger className="h-12 rounded-xl">
                      <Users className="w-4 h-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder={loadingGCs ? "Carregando GCs..." : "Selecione seu GC"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sem-gc">Ainda não participo de GC</SelectItem>
                      {gcs.map((gc) => (
                        <SelectItem key={gc.id} value={gc.id}>
                          {gc.name} ({gc.neighborhood || gc.leaders})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Ministério de Maior Interesse
                  </Label>
                  <div className="relative">
                    <HeartHandshake className="absolute left-3.5 top-3.5 w-5 h-5 text-muted-foreground" />
                    <Input
                      className="pl-10 h-12 rounded-xl text-sm"
                      placeholder="Ex: Louvor, Acolhimento, Mídia..."
                      value={formData.targetMinistry}
                      onChange={(e) => updateFormData({ targetMinistry: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* 3. MEMBRO NÃO CADASTRADO (PREENCHIMENTO COMPLETO) */
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between gap-3 text-amber-700 dark:text-amber-400">
                <div className="flex items-center gap-2.5">
                  <Info className="w-5 h-5 shrink-0" />
                  <span className="text-xs sm:text-sm font-medium">
                    E-mail <strong>{emailInput}</strong> não encontrado. Preencha seus dados para continuar.
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetSearch}
                  className="text-xs text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 h-8 rounded-lg"
                >
                  Alterar
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-sm font-semibold">
                    Nome Completo <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 w-5 h-5 text-muted-foreground" />
                    <Input
                      required
                      className="pl-10 h-12 rounded-xl"
                      placeholder="Ex: Carlos Eduardo Silva"
                      value={formData.name}
                      onChange={(e) => updateFormData({ name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-sm font-semibold">
                    WhatsApp para Contato <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3.5 w-5 h-5 text-muted-foreground" />
                    <Input
                      required
                      type="tel"
                      className="pl-10 h-12 rounded-xl"
                      placeholder="(21) 99999-9999"
                      value={formData.phone}
                      onChange={(e) => updateFormData({ phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Grupo de Conexão / GC
                  </Label>
                  <Select
                    value={formData.gcId || 'sem-gc'}
                    onValueChange={handleGcChange}
                  >
                    <SelectTrigger className="h-12 rounded-xl">
                      <Users className="w-4 h-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder={loadingGCs ? "Carregando GCs..." : "Selecione seu GC"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sem-gc">Ainda não participo de GC</SelectItem>
                      {gcs.map((gc) => (
                        <SelectItem key={gc.id} value={gc.id}>
                          {gc.name} ({gc.neighborhood || gc.leaders})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Ministério de Maior Interesse
                  </Label>
                  <div className="relative">
                    <HeartHandshake className="absolute left-3.5 top-3.5 w-5 h-5 text-muted-foreground" />
                    <Input
                      className="pl-10 h-12 rounded-xl text-sm"
                      placeholder="Ex: Louvor, Acolhimento, Mídia..."
                      value={formData.targetMinistry}
                      onChange={(e) => updateFormData({ targetMinistry: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Card Lateral de Orientações */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="rounded-3xl bg-card p-6 flex flex-col gap-4 border shadow-sm">
            <div className="flex items-center gap-2 text-primary font-bold">
              <Lightbulb className="w-5 h-5" />
              <span>Dica para sua avaliação</span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Responda com honestidade baseando-se em quem você <em>é de fato</em> no dia a dia, e não no que pensa que <em>deveria ser</em>. O Corpo funciona melhor quando cada membro expressa sua autenticidade.
            </p>
          </div>

          <div className="rounded-3xl bg-primary/5 p-6 border border-primary/20 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
              <span>Visão Bíblica</span>
            </div>
            <blockquote className="text-sm font-semibold italic text-foreground leading-snug">
              “Há diferentes tipos de dons, mas o Espírito é o mesmo.”
            </blockquote>
            <span className="text-xs text-muted-foreground font-medium">1 Coríntios 12:4</span>
          </div>
        </div>
      </div>
    </div>
  );
}
