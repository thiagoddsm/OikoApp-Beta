'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Loader2, ArrowRight, CheckCircle, Sparkles, User, Heart, 
  Compass, HandHelping, Users, Waves, GraduationCap, MessageSquare, 
  RefreshCw, ArrowLeft, Church, Home, BookOpen
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { identifyPerson, submitSolicitacao, getConectarOptions, ConectarConfig } from './actions';
import { GooglePlacesAutocomplete } from '@/components/common/google-places-autocomplete';

type Step = 'identify' | 'select_intent' | 'fill_details' | 'success';

interface IntentOption {
  key: 'VISITANDO' | 'GC' | 'CURSOS' | 'BATISMO' | 'MEMBRESIA' | 'VOLUNTARIADO' | 'ACONSELHAMENTO' | 'ATUALIZACAO';
  title: string;
  subtitle: string;
  icon: React.ElementType;
  badgeColor: string;
}

const INTENT_OPTIONS: IntentOption[] = [
  {
    key: 'VISITANDO',
    title: 'Estou visitando a igreja',
    subtitle: 'Primeira vez ou conhecendo nossa comunidade',
    icon: Sparkles,
    badgeColor: 'bg-amber-500/10 text-amber-600 border-amber-200',
  },
  {
    key: 'GC',
    title: 'Quero participar de um GC',
    subtitle: 'Conectar-me a um Grupo de Crescimento / Célula',
    icon: Users,
    badgeColor: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  },
  {
    key: 'CURSOS',
    title: 'Inscrição em Curso ou Evento',
    subtitle: 'Inscrever-me nos cursos, capacitações e eventos da igreja',
    icon: BookOpen,
    badgeColor: 'bg-teal-500/10 text-teal-600 border-teal-200',
  },
  {
    key: 'BATISMO',
    title: 'Quero me batizar',
    subtitle: 'Dar o passo do batismo nas águas',
    icon: Waves,
    badgeColor: 'bg-blue-500/10 text-blue-600 border-blue-200',
  },
  {
    key: 'MEMBRESIA',
    title: 'Fazer o Curso de Membresia',
    subtitle: 'Tornar-me membro ativo da igreja',
    icon: GraduationCap,
    badgeColor: 'bg-indigo-500/10 text-indigo-600 border-indigo-200',
  },
  {
    key: 'VOLUNTARIADO',
    title: 'Quero servir em um ministério',
    subtitle: 'Voluntariar meus dons e talentos na igreja',
    icon: HandHelping,
    badgeColor: 'bg-purple-500/10 text-purple-600 border-purple-200',
  },
  {
    key: 'ACONSELHAMENTO',
    title: 'Preciso de aconselhamento',
    subtitle: 'Atendimento pastoral ou oração individual',
    icon: MessageSquare,
    badgeColor: 'bg-rose-500/10 text-rose-600 border-rose-200',
  },
  {
    key: 'ATUALIZACAO',
    title: 'Atualizar meu cadastro',
    subtitle: 'Manter meus dados e endereço em dia',
    icon: RefreshCw,
    badgeColor: 'bg-slate-500/10 text-slate-600 border-slate-200',
  },
];

export default function ConectarPage() {
  const { toast } = useToast();
  const router = useRouter();

  const [step, setStep] = useState<Step>('identify');
  const [identifier, setIdentifier] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [selectedIntent, setSelectedIntent] = useState<IntentOption | null>(null);

  // Form Fields
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    cpf: '',
    dataNascimento: '',
    idade: '',
    bairro: '',
    estadoCivil: '',
    conjuge: '',
    addressStreet: '',
    addressCep: '',
    comoConheceu: '',
    observacoes: '',
    celulaId: '',
    areaInteresseId: '',
    decisaoProximoPasso: '',
    decisaoPublicaCulto: '',
  });

  // Sub-passo para o formulário de Visitando (Página 1, 2 e 3)
  const [visitorSubStep, setVisitorSubStep] = useState<number>(1);

  const [cells, setCells] = useState<{ id: string; nome: string; leaderName?: string }[]>([]);
  const [areas, setAreas] = useState<{ id: string; name: string }[]>([]);
  const [config, setConfig] = useState<ConectarConfig>({});

  useEffect(() => {
    async function fetchOptions() {
      const res = await getConectarOptions();
      setCells(res.cells || []);
      setAreas(res.areas || []);
      setConfig(res.config || {});
    }
    fetchOptions();
  }, []);

  const handleIdentify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;

    setIsChecking(true);
    const result = await identifyPerson(identifier);
    setIsChecking(false);

    if (result.error) {
      toast({ variant: 'destructive', title: 'Erro', description: result.error });
      return;
    }

    if (result.found && result.userData) {
      setUserId(result.userId);
      setFormData(prev => ({
        ...prev,
        name: result.userData?.name || '',
        phone: result.userData?.phone || (identifier.includes('@') ? '' : identifier),
        email: result.userData?.email || (identifier.includes('@') ? identifier : ''),
        cpf: result.userData?.cpf || '',
        dataNascimento: result.userData?.dataNascimento || '',
        estadoCivil: result.userData?.estadoCivil || '',
        conjuge: result.userData?.conjuge || '',
        addressStreet: result.userData?.addressStreet || '',
        addressCep: result.userData?.addressCep || '',
      }));
      toast({
        title: `Que bom ver você!`,
        description: `Localizamos seu cadastro (${result.userData.name}). Vamos registrar sua solicitação.`
      });
    } else {
      setUserId(undefined);
      setFormData(prev => ({
        ...prev,
        phone: !identifier.includes('@') ? identifier : '',
        email: identifier.includes('@') ? identifier : '',
      }));
      toast({
        title: 'Seja muito bem-vindo(a)!',
        description: 'Não encontramos um cadastro prévio. Preencha seus dados para continuar.'
      });
    }

    setStep('select_intent');
  };

  const handleSelectIntent = (option: IntentOption) => {
    setSelectedIntent(option);

    const emailParam = formData.email || (identifier.includes('@') ? identifier : '');
    const queryEmail = emailParam ? `&email=${encodeURIComponent(emailParam)}` : '';

    // 1. Redirecionamento configurado ou padrão para ATUALIZACAO -> /public/cadastro
    if (option.key === 'ATUALIZACAO') {
      const targetUrl = config.intentRedirects?.ATUALIZACAO || '/public/cadastro';
      router.push(`${targetUrl}${emailParam ? `?email=${encodeURIComponent(emailParam)}` : ''}`);
      return;
    }

    // 2. Redirecionamento configurado ou padrão para CURSOS -> /public/enrollment (Abre o portal público de turmas e cursos)
    if (option.key === 'CURSOS') {
      const baseUrl = config.intentRedirects?.CURSOS || '/public/enrollment';
      const separator = baseUrl.includes('?') ? '&' : '?';
      router.push(`${baseUrl}${emailParam ? `${separator}email=${encodeURIComponent(emailParam)}` : ''}`);
      return;
    }

    // 3. Redirecionamento configurado ou padrão para MEMBRESIA -> /public/enrollment?intent=membresia (Abre direto a turma do PERTENCER)
    if (option.key === 'MEMBRESIA') {
      const baseUrl = config.intentRedirects?.MEMBRESIA || '/public/enrollment';
      const separator = baseUrl.includes('?') ? '&' : '?';
      router.push(`${baseUrl}${separator}intent=membresia${queryEmail}`);
      return;
    }

    // 4. Redirecionamento configurado ou padrão para BATISMO -> /public/enrollment?intent=batismo (Abre direto a turma de BATISMO)
    if (option.key === 'BATISMO') {
      const baseUrl = config.intentRedirects?.BATISMO || '/public/enrollment';
      const separator = baseUrl.includes('?') ? '&' : '?';
      router.push(`${baseUrl}${separator}intent=batismo${queryEmail}`);
      return;
    }

    setStep('fill_details');
  };

  const handleAddressSelect = (place: any) => {
    let cep = '';
    let street = place.formatted_address || '';
    
    if (place.address_components) {
      for (const component of place.address_components) {
        if (component.types.includes('postal_code')) {
          cep = component.long_name.replace(/\D/g, '');
        }
      }
    }
    
    setFormData(prev => ({
      ...prev,
      addressStreet: street,
      addressCep: cep || prev.addressCep
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIntent) return;
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Por favor, informe seu Nome e WhatsApp.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitSolicitacao({
        userId,
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        cpf: formData.cpf,
        dataNascimento: formData.dataNascimento,
        idade: formData.idade,
        bairro: formData.bairro,
        estadoCivil: formData.estadoCivil,
        conjuge: formData.conjuge,
        addressStreet: formData.addressStreet,
        addressCep: formData.addressCep,
        decisaoProximoPasso: formData.decisaoProximoPasso,
        decisaoPublicaCulto: formData.decisaoPublicaCulto,
        intentType: selectedIntent.key,
        intentDetails: {
          bairro: formData.bairro,
          idade: formData.idade,
          decisaoProximoPasso: formData.decisaoProximoPasso,
          decisaoPublicaCulto: formData.decisaoPublicaCulto,
          comoConheceu: formData.comoConheceu,
          observacoes: formData.observacoes,
          celulaId: formData.celulaId,
          areaInteresseId: formData.areaInteresseId,
        },
        entryPoint: 'PORTAL_CONECTAR',
      });

      if (res.success) {
        setStep('success');
      } else {
        toast({ variant: 'destructive', title: 'Erro', description: res.error || 'Falha ao registrar solicitação.' });
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro', description: err.message || 'Ocorreu um erro no envio.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1. Tela de Sucesso
  if (step === 'success') {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6 animate-in zoom-in-95 duration-500 bg-white p-8 md:p-10 rounded-3xl border border-slate-200 shadow-xl">
          <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle size={40} />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">
              Solicitação<br />Recebida!
            </h2>
            <p className="text-slate-600 font-medium text-sm">
              Sua solicitação de <span className="font-bold text-slate-900">"{selectedIntent?.title}"</span> foi registrada com sucesso na Central da Igreja.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left text-xs text-slate-600 space-y-1.5">
            <p className="font-bold text-slate-900 uppercase">Próximos Passos:</p>
            <p>• Um processo ativo foi aberto no sistema.</p>
            <p>• Nossa equipe de líderes entrará em contato em breve via WhatsApp.</p>
          </div>

          <Button onClick={() => window.location.reload()} className="w-full h-12 rounded-xl font-bold text-white shadow-md">
            Voltar ao Início
          </Button>
        </div>
      </main>
    );
  }

  const isCasado = formData.estadoCivil === 'Casado(a)' || formData.estadoCivil === 'União Estável' || formData.estadoCivil === 'casado';

  return (
    <main className="min-h-screen bg-slate-100 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Header Central */}
        <div className="text-center space-y-3 mb-2">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            <Church className="size-4" /> Portal de Conexão
          </div>
          <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">
            Central da Pessoa
          </h1>
          <p className="text-slate-600 text-sm font-medium">
            Sua porta de entrada para a caminhada de integração e comunidade.
          </p>
        </div>

        {/* STEP 1: IDENTIFICATION */}
        {step === 'identify' && (
          <Card className="shadow-xl border-slate-200 border-2 rounded-3xl bg-white overflow-hidden animate-in fade-in duration-300">
            <CardHeader className="bg-slate-50 p-6 md:p-8 border-b text-center">
              <CardTitle className="text-xl font-black uppercase italic tracking-tighter text-slate-900">
                Identificação Inicial
              </CardTitle>
              <CardDescription className="text-slate-600 font-medium text-xs md:text-sm">
                Informe seu WhatsApp ou E-mail para verificarmos se você já possui cadastro.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 md:p-8">
              <form onSubmit={handleIdentify} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="identifier" className="text-xs font-bold text-slate-900 uppercase">
                    E-mail ou WhatsApp (com DDD)
                  </Label>
                  <Input
                    id="identifier"
                    required
                    placeholder="seu@email.com ou (99) 99999-9999"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    className="h-14 rounded-2xl text-lg font-medium border-slate-300 text-slate-900 bg-white shadow-sm"
                  />
                </div>
                <Button 
                  disabled={isChecking || !identifier.trim()} 
                  className="w-full h-14 rounded-2xl font-black text-base uppercase tracking-wider shadow-lg text-white"
                >
                  {isChecking ? <Loader2 className="animate-spin mr-2" /> : <ArrowRight className="mr-2" />}
                  Continuar
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* STEP 2: SELECT INTENT */}
        {step === 'select_intent' && (
          <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-400">
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Pessoa Identificada</p>
                <p className="text-base font-black text-slate-900">{formData.name || identifier}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setStep('identify')} className="text-slate-500 hover:text-slate-900">
                <ArrowLeft className="size-4 mr-1" /> Trocar
              </Button>
            </div>

            <Card className="shadow-xl border-slate-200 rounded-3xl bg-white overflow-hidden">
              <CardHeader className="bg-slate-50 p-6 border-b text-center">
                <CardTitle className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">
                  Como podemos caminhar com você hoje?
                </CardTitle>
                <CardDescription className="text-slate-600 font-medium">
                  Selecione o seu objetivo principal para abrir o formulário correto.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-3">
                {INTENT_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => handleSelectIntent(opt)}
                      className="flex items-start gap-4 p-4 text-left rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-primary/50 transition-all shadow-sm group hover:scale-[1.01]"
                    >
                      <div className={`p-3 rounded-xl ${opt.badgeColor} shrink-0 group-hover:scale-110 transition-transform`}>
                        <Icon className="size-6" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-black text-sm uppercase tracking-tight text-slate-900 group-hover:text-primary transition-colors">
                          {opt.title}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">
                          {opt.subtitle}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        )}

        {/* STEP 3: ADAPTIVE FORM DETAILS */}
        {step === 'fill_details' && selectedIntent && (
          <Card className="shadow-xl border-slate-200 rounded-3xl bg-white overflow-hidden animate-in slide-in-from-bottom-4 duration-400">
            <CardHeader className="bg-slate-50 p-6 border-b flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${selectedIntent.badgeColor}`}>
                  <selectedIntent.icon className="size-6" />
                </div>
                <div>
                  <CardTitle className="text-lg font-black uppercase italic tracking-tighter text-slate-900 leading-none">
                    {selectedIntent.title}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 font-medium">
                    Preencha as informações necessárias para esta solicitação.
                  </CardDescription>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setStep('select_intent')} className="rounded-xl text-xs font-bold">
                <ArrowLeft className="size-3.5 mr-1" /> Alterar Objetivo
              </Button>
            </CardHeader>

            <CardContent className="p-6 md:p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Dados Pessoais Essenciais */}
                {/* ======================================================== */}
                {/* FLUXO ESPECÍFICO: ESTOU VISITANDO A IGREJA (3 PÁGINAS)   */}
                {/* ======================================================== */}
                {selectedIntent.key === 'VISITANDO' ? (
                  <div className="space-y-6">
                    {/* Indicador de Páginas do Visitante */}
                    <div className="flex items-center justify-between border-b pb-4">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center size-6 rounded-full bg-primary text-white text-xs font-black">
                          {visitorSubStep}
                        </span>
                        <span className="text-xs font-black uppercase text-slate-800 tracking-wider">
                          {visitorSubStep === 1 && 'Página 1: Informações de Contato'}
                          {visitorSubStep === 2 && 'Página 2: Mais Detalhes (Decisão)'}
                          {visitorSubStep === 3 && 'Página 3: Finalização e Mensagem'}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-slate-400">
                        Passo {visitorSubStep} de {(formData.decisaoProximoPasso === 'Decidi entregar minha vida a Cristo' || formData.decisaoProximoPasso === 'Estou me reconciliando com Jesus') ? 3 : 2}
                      </span>
                    </div>

                    {/* --- PÁGINA 1: INFORMAÇÕES DE CONTATO --- */}
                    {visitorSubStep === 1 && (
                      <div className="space-y-5 animate-in fade-in duration-300">
                        <div className="p-3.5 bg-amber-500/10 border border-amber-200 rounded-2xl">
                          <p className="text-xs text-amber-900 font-medium leading-relaxed">
                            👋 <em>Este formulário destina-se aos Visitantes da IBManhã e àqueles que se decidiram publicamente em nossos cultos.</em>
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label htmlFor="vis_name" className="text-xs font-bold text-slate-900">Nome *</Label>
                            <Input
                              id="vis_name"
                              required
                              placeholder="Seu nome completo"
                              value={formData.name}
                              onChange={e => setFormData({ ...formData, name: e.target.value })}
                              className="h-11 border-slate-300 text-slate-900 bg-white"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="vis_phone" className="text-xs font-bold text-slate-900">Telefone / WhatsApp *</Label>
                            <Input
                              id="vis_phone"
                              required
                              type="tel"
                              placeholder="(00) 00000-0000"
                              value={formData.phone}
                              onChange={e => setFormData({ ...formData, phone: e.target.value })}
                              className="h-11 border-slate-300 text-slate-900 bg-white"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="vis_bairro" className="text-xs font-bold text-slate-900">Bairro *</Label>
                            <Input
                              id="vis_bairro"
                              required
                              placeholder="Ex: Taquara, Barra, Freguesia..."
                              value={formData.bairro}
                              onChange={e => setFormData({ ...formData, bairro: e.target.value })}
                              className="h-11 border-slate-300 text-slate-900 bg-white"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="vis_idade" className="text-xs font-bold text-slate-900">Idade *</Label>
                            <Input
                              id="vis_idade"
                              required
                              placeholder="Ex: 28"
                              value={formData.idade}
                              onChange={e => setFormData({ ...formData, idade: e.target.value })}
                              className="h-11 border-slate-300 text-slate-900 bg-white"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs font-bold text-slate-900">Estado Civil *</Label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {['Solteiro', 'Casado', 'Divorciado', 'Viúvo', 'União estável'].map((ec) => (
                              <button
                                key={ec}
                                type="button"
                                onClick={() => setFormData({ ...formData, estadoCivil: ec })}
                                className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                                  formData.estadoCivil === ec
                                    ? 'bg-primary text-white border-primary shadow-sm'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                {ec}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2 pt-2">
                          <Label className="text-xs font-bold text-slate-900">Decisão / Próximo Passo *</Label>
                          <div className="space-y-2">
                            {[
                              'Gostaria de participar de um GC',
                              'Estou só visitando a igreja',
                              'Estou procurando uma igreja para congregar',
                              'Decidi entregar minha vida a Cristo',
                              'Estou me reconciliando com Jesus',
                            ].map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setFormData({ ...formData, decisaoProximoPasso: opt })}
                                className={`w-full p-3.5 rounded-2xl border text-xs font-bold text-left flex items-center justify-between transition-all ${
                                  formData.decisaoProximoPasso === opt
                                    ? 'bg-primary/10 border-primary text-primary shadow-xs'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                <span>{opt}</span>
                                {formData.decisaoProximoPasso === opt && (
                                  <CheckCircle className="size-4 text-primary shrink-0 ml-2" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex justify-end pt-4">
                          <Button
                            type="button"
                            onClick={() => {
                              if (!formData.name.trim() || !formData.phone.trim() || !formData.bairro.trim() || !formData.idade.trim() || !formData.estadoCivil || !formData.decisaoProximoPasso) {
                                toast({
                                  variant: 'destructive',
                                  title: 'Campos Obrigatórios',
                                  description: 'Por favor, preencha todos os campos da Página 1 para prosseguir.'
                                });
                                return;
                              }
                              // Se for decisão de entrega/reconciliação, vai para a Página 2 (Mais detalhes).
                              // Caso contrário, pula direto para a Página 3 (Comentários e Finalização).
                              const hasDecisionDetail = formData.decisaoProximoPasso === 'Decidi entregar minha vida a Cristo' || formData.decisaoProximoPasso === 'Estou me reconciliando com Jesus';
                              setVisitorSubStep(hasDecisionDetail ? 2 : 3);
                            }}
                            className="h-12 px-8 rounded-2xl font-black text-sm uppercase tracking-wider text-white gap-2"
                          >
                            Avançar <ArrowRight className="size-4" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* --- PÁGINA 2: MAIS DETALHES (CONDICIONAL) --- */}
                    {visitorSubStep === 2 && (
                      <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                          <h5 className="font-black text-sm text-emerald-950 uppercase tracking-tight flex items-center gap-1.5">
                            <Sparkles className="size-4 text-emerald-600" /> Celebrando sua decisão com Jesus!
                          </h5>
                          <p className="text-xs text-emerald-800 mt-1">
                            Você selecionou: <strong>"{formData.decisaoProximoPasso}"</strong>. Queremos orar e caminhar ao seu lado.
                          </p>
                        </div>

                        <div className="space-y-3">
                          <Label className="text-xs font-bold text-slate-900">
                            Essa pessoa tomou essa decisão publicamente (durante o culto)? *
                          </Label>
                          <div className="grid grid-cols-2 gap-3">
                            {['sim', 'não'].map((resp) => (
                              <button
                                key={resp}
                                type="button"
                                onClick={() => setFormData({ ...formData, decisaoPublicaCulto: resp })}
                                className={`p-4 rounded-2xl border text-sm font-black uppercase text-center transition-all ${
                                  formData.decisaoPublicaCulto === resp
                                    ? 'bg-primary text-white border-primary shadow-md'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                {resp}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setVisitorSubStep(1)}
                            className="h-12 px-6 rounded-2xl font-bold text-xs"
                          >
                            <ArrowLeft className="size-4 mr-1" /> Voltar
                          </Button>
                          <Button
                            type="button"
                            onClick={() => {
                              if (!formData.decisaoPublicaCulto) {
                                toast({
                                  variant: 'destructive',
                                  title: 'Campo Obrigatório',
                                  description: 'Informe se a decisão foi tomada publicamente durante o culto.'
                                });
                                return;
                              }
                              setVisitorSubStep(3);
                            }}
                            className="h-12 px-8 rounded-2xl font-black text-sm uppercase tracking-wider text-white gap-2"
                          >
                            Avançar <ArrowRight className="size-4" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* --- PÁGINA 3: FINALIZAÇÃO (COMENTÁRIOS) --- */}
                    {visitorSubStep === 3 && (
                      <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="space-y-2">
                          <Label htmlFor="vis_comentarios" className="text-xs font-bold text-slate-900">
                            Comentários <span className="text-slate-400 font-normal">(Opcional)</span>
                          </Label>
                          <textarea
                            id="vis_comentarios"
                            rows={4}
                            placeholder="Escreva aqui qualquer mensagem, pedido de oração ou observação para a equipe de acolhimento..."
                            value={formData.observacoes}
                            onChange={e => setFormData({ ...formData, observacoes: e.target.value })}
                            className="w-full p-3.5 rounded-2xl border border-slate-300 text-sm text-slate-900 bg-white focus:ring-2 focus:ring-primary focus:outline-none"
                          />
                        </div>

                        <div className="flex items-center justify-between pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              const hasDecisionDetail = formData.decisaoProximoPasso === 'Decidi entregar minha vida a Cristo' || formData.decisaoProximoPasso === 'Estou me reconciliando com Jesus';
                              setVisitorSubStep(hasDecisionDetail ? 2 : 1);
                            }}
                            className="h-12 px-6 rounded-2xl font-bold text-xs"
                          >
                            <ArrowLeft className="size-4 mr-1" /> Voltar
                          </Button>

                          <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="h-14 px-8 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg text-white gap-2"
                          >
                            {isSubmitting ? <Loader2 className="animate-spin size-4 mr-2" /> : <CheckCircle className="size-4 mr-2" />}
                            Enviar Cadastro de Visitante
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {/* DEMAIS FLUXOS (GC, Voluntariado, etc.) */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 border-b pb-1">
                        1. Dados de Identificação
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="name" className="text-xs font-bold text-slate-900">Nome Completo *</Label>
                          <Input
                            id="name"
                            required
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="h-11 border-slate-300 text-slate-900 bg-white"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="phone" className="text-xs font-bold text-slate-900">WhatsApp (com DDD) *</Label>
                          <Input
                            id="phone"
                            required
                            type="tel"
                            value={formData.phone}
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            className="h-11 border-slate-300 text-slate-900 bg-white"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="email" className="text-xs font-bold text-slate-900">E-mail (Opcional)</Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            className="h-11 border-slate-300 text-slate-900 bg-white"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="dataNascimento" className="text-xs font-bold text-slate-900">Data de Nascimento (Opcional)</Label>
                          <Input
                            id="dataNascimento"
                            type="date"
                            value={formData.dataNascimento}
                            onChange={e => setFormData({ ...formData, dataNascimento: e.target.value })}
                            className="h-11 border-slate-300 text-slate-900 bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Campos Dinâmicos para GC (Estado Civil + Endereço) */}
                    {selectedIntent.key === 'GC' && (
                      <div className="space-y-4 pt-2">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 border-b pb-1">
                          2. Família e Endereço Residencial (Célula/GC)
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label htmlFor="estadoCivil" className="text-xs font-bold text-slate-900">Estado Civil</Label>
                            <Select value={formData.estadoCivil} onValueChange={(v) => setFormData({ ...formData, estadoCivil: v })}>
                              <SelectTrigger className="h-11 border-slate-300 text-slate-900 bg-white">
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Solteiro(a)">Solteiro(a)</SelectItem>
                                <SelectItem value="Casado(a)">Casado(a)</SelectItem>
                                <SelectItem value="União Estável">União Estável</SelectItem>
                                <SelectItem value="Divorciado(a)">Divorciado(a)</SelectItem>
                                <SelectItem value="Viúvo(a)">Viúvo(a)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {isCasado && (
                            <div className="space-y-1.5 animate-in fade-in duration-200">
                              <Label htmlFor="conjuge" className="text-xs font-bold text-slate-900">Nome do Cônjuge</Label>
                              <Input
                                id="conjuge"
                                placeholder="Nome completo do cônjuge"
                                value={formData.conjuge}
                                onChange={e => setFormData({ ...formData, conjuge: e.target.value })}
                                className="h-11 border-slate-300 text-slate-900 bg-white"
                              />
                            </div>
                          )}

                          <div className="space-y-1.5 col-span-1 md:col-span-2">
                            <Label htmlFor="addressStreet" className="text-xs font-bold text-slate-900">Endereço Residencial (Google Maps)</Label>
                            <GooglePlacesAutocomplete
                              defaultValue={formData.addressStreet}
                              onAddressSelect={handleAddressSelect}
                              placeholder="Rua, Nº, Bairro, Cidade - UF"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="addressCep" className="text-xs font-bold text-slate-900">CEP</Label>
                            <Input
                              id="addressCep"
                              placeholder="00000-000"
                              value={formData.addressCep}
                              onChange={e => setFormData({ ...formData, addressCep: e.target.value })}
                              className="h-11 border-slate-300 text-slate-900 bg-white"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="celulaId" className="text-xs font-bold text-slate-900">Preferência por Célula/GC</Label>
                            <Select value={formData.celulaId} onValueChange={(v) => setFormData({ ...formData, celulaId: v })}>
                              <SelectTrigger className="h-11 border-slate-300 text-slate-900 bg-white">
                                <SelectValue placeholder="Selecione um GC (ou indicação automática)..." />
                              </SelectTrigger>
                              <SelectContent>
                                {cells.map(c => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.nome} {c.leaderName ? `(${c.leaderName})` : ''}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Campos Dinâmicos para Voluntariado */}
                    {selectedIntent.key === 'VOLUNTARIADO' && (
                      <div className="space-y-4 pt-2">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 border-b pb-1">
                          2. Área de Ministério
                        </h4>
                        <div className="space-y-2">
                          <Label htmlFor="areaInteresseId" className="text-xs font-bold text-slate-900">Em qual área você gostaria de servir?</Label>
                          <Select value={formData.areaInteresseId} onValueChange={(v) => setFormData({ ...formData, areaInteresseId: v })}>
                            <SelectTrigger className="h-11 border-slate-300 text-slate-900 bg-white">
                              <SelectValue placeholder="Selecione uma área de serviço..." />
                            </SelectTrigger>
                            <SelectContent>
                              {areas.map(a => (
                                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {/* Observações Gerais */}
                    <div className="space-y-2 pt-2">
                      <Label htmlFor="observacoes" className="text-xs font-bold text-slate-900">
                        Alguma observação ou mensagem para a liderança? <span className="text-slate-400 font-normal">(Opcional)</span>
                      </Label>
                      <textarea
                        id="observacoes"
                        rows={3}
                        placeholder="Escreva qualquer detalhe relevante para o seu acompanhamento..."
                        value={formData.observacoes}
                        onChange={e => setFormData({ ...formData, observacoes: e.target.value })}
                        className="w-full p-3 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-14 rounded-2xl font-black text-base uppercase tracking-wider shadow-lg text-white"
                    >
                      {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle className="mr-2" />}
                      Enviar Solicitação
                    </Button>
                  </>
                )}

              </form>
            </CardContent>
          </Card>
        )}

      </div>
    </main>
  );
}
