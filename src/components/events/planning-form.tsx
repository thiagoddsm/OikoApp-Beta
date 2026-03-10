
'use client';
import React, { useState, useEffect } from 'react';
import { useFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp, doc } from 'firebase/firestore';
import { Clock, Users, Layout, DollarSign, Utensils, FileText, ShieldAlert, Target, ListChecks, HelpCircle, Building, MapPin, Download, Megaphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Link from 'next/link';
import { useVolunteering } from '@/contexts/volunteering-context';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';

interface PlanningEvent {
    id: string;
    ministry: string;
    organizer: string;
    eventName: string;
    category: string;
    recurrence: string;
    recurrenceDetails: any;
    visionAlignment: string;
    phaseAlignment: string;
    smart: any;
    method5w2h: any;
    startDate: string;
    endDate: string;
    date?: string;
    timeLoadIn: string;
    timeStart: string;
    timeEnd: string;
    timeLoadOut: string;
    eventType: string;
    space: string;
    externalLocation: string;
    roomLayout: string;
    requiredServiceAreas: any[];
    hasFood: string;
    foodType: string;
    kitchenResponsible: string;
    isPaid: string;
    fixedCosts: number;
    variableCostPerPerson: number;
    ticketPrice: number;
    breakEvenAnalysis: number;
    designSupportNeeded: boolean;
    designRequests: string[];
    marketingSupportNeeded: boolean;
    logisticsNotes: string;
    serviceTeamsNotes: string;
    financialsNotes: string;
    marketingNotes: string;
}

const smartMappings: Record<string, { label: string; placeholder: string }> = {
  specific: { label: "Específico (S)", placeholder: "Ex: Treinar 20 novos voluntários para a equipe de mídia." },
  measurable: { label: "Mensurável (M)", placeholder: "Ex: Atingir 80% de aprovação no teste final." },
  achievable: { label: "Alcançável (A)", placeholder: "Ex: Sim, temos 3 instrutores, material e sala disponível." },
  relevant: { label: "Relevante (R)", placeholder: "Ex: Para suprir a alta demanda de voluntários para a Páscoa." },
  timeBound: { label: "Temporal (T)", placeholder: "Ex: Treinamento concluído até 15 de Março." }
};

const method5w2hMappings: Record<string, { label: string; placeholder: string }> = {
  what: { label: "What (O Quê?)", placeholder: "Ex: Realizar a Conferência de Mulheres 2025." },
  why: { label: "Why (Por Quê?)", placeholder: "Ex: Fortalecer a comunhão e o ensino bíblico para mulheres." },
  who: { label: "Who (Quem?)", placeholder: "Ex: Pastora Maria (coord.), Ana (logística), Equipe de Louvor." },
  where: { label: "Where (Onde?)", placeholder: "Ex: Templo Sede e Salão Social." },
  when: { label: "When (Quando?)", placeholder: "Ex: 10 a 12 de Outubro, das 19h às 22h." },
  how: { label: "How (Como?)", placeholder: "Ex: Definir preletoras, abrir inscrições, divulgar nas redes, etc." },
  howMuch: { label: "How Much (Quanto?)", placeholder: "Ex: R$ 15.000,00" }
};

const timeTooltips = {
  timeLoadIn: "Acesso da equipe: Horário que a equipe precisa chegar para montar som, luz, decoração, etc.",
  timeStart: "Início para o público: Horário que as portas abrem e os convidados podem entrar.",
  timeEnd: "Término para o público: Horário que a última parte do evento se encerra para os participantes.",
  timeLoadOut: "Desocupação total: Horário que o local deve estar completamente vazio e limpo pela equipe."
};

const weekDays = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

const designOptions = [
    { id: 'design-stories', label: 'Stories' },
    { id: 'design-feed', label: 'Feed' },
    { id: 'design-thumb', label: 'Thumb' },
    { id: 'design-projecao', label: 'Projeção' },
    { id: 'design-carrossel', label: 'Carrossel' },
    { id: 'design-reels', label: 'Reels' },
    { id: 'design-video', label: 'Vídeo' },
    { id: 'design-folheto', label: 'Folheto' },
    { id: 'design-banner', label: 'Banner' },
];


export function EventPlanningForm({ existingEvent = null }: { existingEvent?: PlanningEvent | null }) {
  const { firestore } = useFirebase();
  const { rooms, areas } = useVolunteering();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    ministry: '',
    organizer: 'IBM',
    eventName: '',
    category: '',
    recurrence: 'unico',
    recurrenceDetails: {
        type: 'semanal',
        endDate: '',
        dayOfWeek: ''
    },
    visionAlignment: '',
    phaseAlignment: '',
    smart: { specific: '', measurable: '', achievable: '', relevant: '', timeBound: '' } as Record<string, string>,
    method5w2h: { what: '', why: '', who: '', where: '', when: '', how: '', howMuch: '' } as Record<string, string>,
    startDate: '',
    endDate: '',
    timeLoadIn: '',
    timeStart: '',
    timeEnd: '',
    timeLoadOut: '',
    eventType: 'interno',
    space: '',
    externalLocation: '',
    roomLayout: '',
    requiredServiceAreas: [] as { areaId: string; quantity: number }[],
    hasFood: 'nao',
    foodType: '',
    kitchenResponsible: '',
    isPaid: 'gratuito',
    fixedCosts: '',
    variableCostPerPerson: '',
    ticketPrice: '',
    breakEvenAnalysis: '',
    designSupportNeeded: 'nao',
    designRequests: [] as string[],
    marketingSupportNeeded: 'nao',
    logisticsNotes: '',
    serviceTeamsNotes: '',
    financialsNotes: '',
    marketingNotes: '',
  });

  useEffect(() => {
    if (existingEvent) {
      setFormData({
        ministry: existingEvent.ministry || '',
        organizer: existingEvent.organizer || 'IBM',
        eventName: existingEvent.eventName || '',
        category: existingEvent.category || '',
        recurrence: existingEvent.recurrence || 'unico',
        recurrenceDetails: existingEvent.recurrenceDetails || { type: 'semanal', endDate: '', dayOfWeek: '' },
        visionAlignment: existingEvent.visionAlignment || '',
        phaseAlignment: existingEvent.phaseAlignment || '',
        smart: existingEvent.smart || { specific: '', measurable: '', achievable: '', relevant: '', timeBound: '' },
        method5w2h: existingEvent.method5w2h || { what: '', why: '', who: '', where: '', when: '', how: '', howMuch: '' },
        startDate: existingEvent.startDate || existingEvent.date || '',
        endDate: existingEvent.endDate || existingEvent.startDate || existingEvent.date || '',
        timeLoadIn: existingEvent.timeLoadIn || '',
        timeStart: existingEvent.timeStart || '',
        timeEnd: existingEvent.timeEnd || '',
        timeLoadOut: existingEvent.timeLoadOut || '',
        eventType: existingEvent.eventType || 'interno',
        space: existingEvent.space || '',
        externalLocation: existingEvent.externalLocation || '',
        roomLayout: existingEvent.roomLayout || '',
        requiredServiceAreas: existingEvent.requiredServiceAreas || [],
        hasFood: existingEvent.hasFood || 'nao',
        foodType: existingEvent.foodType || '',
        kitchenResponsible: existingEvent.kitchenResponsible || '',
        isPaid: existingEvent.isPaid || 'gratuito',
        fixedCosts: existingEvent.fixedCosts?.toString() || '',
        variableCostPerPerson: existingEvent.variableCostPerPerson?.toString() || '',
        ticketPrice: existingEvent.ticketPrice?.toString() || '',
        breakEvenAnalysis: existingEvent.breakEvenAnalysis?.toString() || '',
        designSupportNeeded: existingEvent.designSupportNeeded ? 'sim' : 'nao',
        designRequests: existingEvent.designRequests || [],
        marketingSupportNeeded: existingEvent.marketingSupportNeeded ? 'sim' : 'nao',
        logisticsNotes: existingEvent.logisticsNotes || '',
        serviceTeamsNotes: existingEvent.serviceTeamsNotes || '',
        financialsNotes: existingEvent.financialsNotes || '',
        marketingNotes: existingEvent.marketingNotes || '',
      });
    }
  }, [existingEvent]);


  useEffect(() => {
    const fixed = parseFloat(formData.fixedCosts) || 0;
    const variable = parseFloat(formData.variableCostPerPerson) || 0;
    const price = parseFloat(formData.ticketPrice) || 0;

    if (price > variable) {
        const breakEven = Math.ceil(fixed / (price - variable));
        setFormData(prev => ({...prev, breakEvenAnalysis: isFinite(breakEven) ? breakEven.toString() : ''}));
    } else {
        setFormData(prev => ({...prev, breakEvenAnalysis: ''}));
    }

  }, [formData.fixedCosts, formData.variableCostPerPerson, formData.ticketPrice]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNestedChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, parent: 'smart' | 'method5w2h') => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [name]: value
      }
    }));
  };
  
  const handleRadioChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRecurrenceChange = (e: React.ChangeEvent<HTMLInputElement> | {name: string, value: string}) => {
    const { name, value } = 'target' in e ? e.target : e;
    setFormData(prev => ({
      ...prev,
      recurrenceDetails: {
        ...prev.recurrenceDetails,
        [name]: value
      }
    }));
  };

  const handleAreaChange = (areaId: string, checked: boolean) => {
    setFormData(prev => {
        const existing = prev.requiredServiceAreas;
        if (checked) {
            return { ...prev, requiredServiceAreas: [...existing, { areaId, quantity: 1 }] };
        } else {
            return { ...prev, requiredServiceAreas: existing.filter(a => a.areaId !== areaId) };
        }
    });
  };
  
  const handleDesignRequestChange = (item: string, checked: boolean) => {
    setFormData(prev => {
        const currentRequests = prev.designRequests || [];
        if (checked) {
            return { ...prev, designRequests: [...currentRequests, item] };
        } else {
            return { ...prev, designRequests: currentRequests.filter(req => req !== item) };
        }
    });
  };

  const handleQuantityChange = (areaId: string, increment: boolean) => {
    setFormData(prev => ({
        ...prev,
        requiredServiceAreas: prev.requiredServiceAreas.map(a => {
            if (a.areaId === areaId) {
                const newQuantity = increment ? a.quantity + 1 : Math.max(1, a.quantity - 1);
                return { ...a, quantity: newQuantity };
            }
            return a;
        })
    }));
  };
  
  const handleGeneratePdf = () => {
    if (!existingEvent) return;

    const doc = new jsPDF();
    const margin = 15;
    let y = 20;

    const addSection = (title: string, content: string, startY: number) => {
        const titleLines = doc.splitTextToSize(title, 180);
        const contentLines = doc.splitTextToSize(content || '-', 180);
        const height = (titleLines.length + contentLines.length) * 5 + 10;
        
        if (startY + height > 280) {
            doc.addPage();
            startY = 20;
        }

        doc.setFontSize(11);
        doc.setTextColor(40);
        doc.text(titleLines, margin, startY);
        startY += titleLines.length * 5 + 1;
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(contentLines, margin, startY);
        startY += contentLines.length * 5;
        
        return startY + 5;
    };
    
    doc.setFontSize(18);
    const titleLines = doc.splitTextToSize(`Planejamento Estratégico: ${formData.eventName}`, 180);
    doc.text(titleLines, margin, y);
    y += (titleLines.length * 7) + 3;

    doc.setFontSize(12);
    doc.text(`Solicitante: ${formData.ministry} (${formData.organizer})`, margin, y);
    y += 7;
    doc.text(`Categoria: ${formData.category}`, margin, y);
    y += 7;
    
    const eventStartDate = formData.startDate ? format(new Date(formData.startDate + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A';
    const eventEndDate = formData.endDate ? format(new Date(formData.endDate + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A';
    const dateText = eventStartDate === eventEndDate ? eventStartDate : `${eventStartDate} a ${eventEndDate}`;
    doc.text(`Data do Evento: ${dateText}`, margin, y);
    y += 10;

    (doc as any).autoTable({
        startY: y,
        head: [['Metas SMART', 'Descrição']],
        body: Object.entries(formData.smart).map(([key, value]) => [smartMappings[key]?.label || key, value || '-']),
        theme: 'grid'
    });
    y = (doc as any).autoTable.previous.finalY + 10;
    
    (doc as any).autoTable({
        startY: y,
        head: [['Plano de Ação (5W2H)', 'Descrição']],
        body: Object.entries(formData.method5w2h).map(([key, value]) => [method5w2hMappings[key]?.label || key, value || '-']),
        theme: 'grid'
    });
    y = (doc as any).autoTable.previous.finalY + 10;

    doc.setFontSize(14);
    doc.text('Detalhes Logísticos', margin, y);
    y += 8;
    const logisticDetails = [
      ['Horário de Montagem (Load-in)', formData.timeLoadIn || '-'],
      ['Horário de Início (Público)', formData.timeStart || '-'],
      ['Horário de Término (Público)', formData.timeEnd || '-'],
      ['Horário de Desocupação (Load-out)', formData.timeLoadOut || '-'],
      ['Local', formData.eventType === 'interno' ? formData.space : formData.externalLocation],
      ['Layout da Sala', formData.roomLayout || '-'],
      ['Alimentação', `${formData.hasFood === 'sim' ? 'Sim' : 'Não'} (${formData.foodType || 'N/A'})`],
    ];
    (doc as any).autoTable({
        startY: y,
        body: logisticDetails,
        theme: 'grid'
    });
    y = (doc as any).autoTable.previous.finalY;
    if (formData.logisticsNotes) y = addSection('Observações de Logística:', formData.logisticsNotes, y);
    y += 10;


    doc.setFontSize(14);
    doc.text('Equipes de Serviço Demandadas', margin, y);
    y += 8;
    if (formData.requiredServiceAreas.length > 0) {
        const serviceAreasBody = formData.requiredServiceAreas.map(req => {
            const area = areas.find(a => a.id === req.areaId);
            return [area ? area.name : req.areaId, req.quantity.toString()];
        });
        (doc as any).autoTable({
            startY: y,
            head: [['Área de Serviço', 'Voluntários Necessários']],
            body: serviceAreasBody,
            theme: 'grid'
        });
        y = (doc as any).autoTable.previous.finalY;
    } else {
        doc.setFontSize(10);
        doc.text('Nenhuma equipe de serviço demandada.', margin, y);
        y += 7;
    }
    if (formData.serviceTeamsNotes) y = addSection('Observações sobre Equipes:', formData.serviceTeamsNotes, y);
    y += 10;


    doc.setFontSize(14);
    doc.text('Análise Financeira', margin, y);
    y += 8;
    const financeDetails = [
        ['Modelo', formData.isPaid === 'pago' ? 'Autossustentável (Pago)' : 'Subsidiado (Gratuito)'],
        ['Custos Fixos', `R$ ${formData.fixedCosts || '0'}`],
        ['Custo por Pessoa', `R$ ${formData.variableCostPerPerson || '0'}`],
        ['Valor da Inscrição', `R$ ${formData.ticketPrice || '0'}`],
        ['Ponto de Equilíbrio', `${formData.breakEvenAnalysis || '0'} pessoas`],
    ];
    (doc as any).autoTable({ startY: y, body: financeDetails, theme: 'grid' });
    y = (doc as any).autoTable.previous.finalY;
    if (formData.financialsNotes) y = addSection('Observações Financeiras:', formData.financialsNotes, y);
    y += 10;


    doc.setFontSize(14);
    doc.text('Comunicação & Marketing', margin, y);
    y += 8;
    const marketingDetails = [
        ['Apoio de Design', formData.designSupportNeeded === 'sim' ? 'Sim' : 'Não'],
        ['Itens de Design', formData.designSupportNeeded === 'sim' ? (formData.designRequests.join(', ') || 'Nenhum') : 'N/A'],
        ['Planejamento de Marketing', formData.marketingSupportNeeded === 'sim' ? 'Sim' : 'Não'],
    ];
    (doc as any).autoTable({ startY: y, body: marketingDetails, theme: 'grid' });
    y = (doc as any).autoTable.previous.finalY;
    if (formData.marketingNotes) y = addSection('Observações de Marketing:', formData.marketingNotes, y);


    doc.save(`evento_${formData.eventName.replace(/\s+/g, '_')}.pdf`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!firestore) {
        toast({ title: 'Erro', description: 'Banco de dados não disponível.', variant: 'destructive'});
        setLoading(false);
        return;
    }

    const dataToSave = {
      ...formData,
      designSupportNeeded: formData.designSupportNeeded === 'sim',
      designRequests: formData.designSupportNeeded === 'sim' ? formData.designRequests : [],
      marketingSupportNeeded: formData.marketingSupportNeeded === 'sim',
      method5w2h: {
          ...formData.method5w2h,
          where: formData.eventType === 'interno' ? formData.space : formData.externalLocation,
      },
      fixedCosts: parseFloat(formData.fixedCosts) || 0,
      variableCostPerPerson: parseFloat(formData.variableCostPerPerson) || 0,
      ticketPrice: parseFloat(formData.ticketPrice) || 0,
      breakEvenAnalysis: parseInt(formData.breakEvenAnalysis, 10) || 0,
    };


    try {
      if (existingEvent) {
          const docRef = doc(firestore, "strategic_events", existingEvent.id);
          await updateDocumentNonBlocking(docRef, dataToSave);
          toast({ title: 'Sucesso!', description: 'O evento foi atualizado.'});
      } else {
        const collectionRef = collection(firestore, "strategic_events");
        await addDocumentNonBlocking(collectionRef, {
          ...dataToSave,
          submittedAt: serverTimestamp(),
          status: 'analise_estrategica'
        });
        setSuccess(true);
        window.scrollTo(0, 0);
        toast({ title: 'Sucesso!', description: 'Sua solicitação de evento foi protocolada.'});
      }
    } catch (error) {
      console.error("Erro:", error);
      toast({ title: 'Erro ao Submeter', description: 'Por favor, tente novamente.', variant: 'destructive'});
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[70vh] bg-emerald-50 flex items-center justify-center p-6 rounded-lg">
        <div className="bg-white p-8 rounded-xl shadow-2xl text-center max-w-lg border-t-8 border-emerald-600">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="text-emerald-600" size={32} />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Solicitação Protocolada</h2>
          <p className="text-gray-600 mb-6">
            Seu planejamento estratégico foi enviado para a liderança para análise. Você pode acompanhar o status na tela de eventos.
          </p>
          <div className="flex justify-center gap-4">
            <Button onClick={() => window.location.reload()} variant="outline">
              Novo Planejamento
            </Button>
            <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
              <Link href="/dashboard/events">
                Ver Todos Eventos
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 -m-6 font-sans">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        
        <div className="bg-slate-800 py-10 px-8 text-center relative overflow-hidden">
          <div className="relative z-10">
            <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest">Sistema de Governança</span>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mt-4 mb-2">Solicitação de Evento</h1>
            <p className="text-slate-300 max-w-2xl mx-auto text-sm">
              Alinhamento Estratégico • Planejamento Tático • Excelência Operacional
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 md:p-12 space-y-12">

          <section>
            <div className="flex items-center gap-3 mb-6 pb-2 border-b border-gray-200">
              <div className="bg-blue-100 p-2 rounded-lg text-blue-700"><FileText size={24} /></div>
              <h2 className="text-2xl font-bold text-gray-800">1. Identidade do Evento</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <Label htmlFor="ministry">Solicitante</Label>
                <Input required id="ministry" name="ministry" value={formData.ministry} onChange={handleChange} />
              </div>
               <div>
                <Label>Organizador</Label>
                <RadioGroup value={formData.organizer} onValueChange={(v) => handleRadioChange('organizer', v)} className="flex gap-4 mt-2">
                    <div className="flex items-center space-x-2"><RadioGroupItem value="IBM" id="org_ibm" /><Label htmlFor="org_ibm">IBM (Interno)</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="Externo" id="org_externo" /><Label htmlFor="org_externo">Externo</Label></div>
                </RadioGroup>
              </div>
               <div>
                <Label htmlFor="eventName">Nome do Evento</Label>
                <Input required id="eventName" name="eventName" value={formData.eventName} onChange={handleChange} />
              </div>
               <div>
                <Label htmlFor="category">Categoria</Label>
                <Select required name="category" value={formData.category} onValueChange={(v) => setFormData(p => ({...p, category: v}))}>
                  <SelectTrigger id="category"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="adoracao">Adoração e Liturgia</SelectItem>
                    <SelectItem value="educacao">Educação e Discipulado</SelectItem>
                    <SelectItem value="koinonia">Comunhão e Koinonia</SelectItem>
                    <SelectItem value="outreach">Evangelismo e Missões</SelectItem>
                    <SelectItem value="adm">Administrativo e Governança</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label>Recorrência</Label>
                 <RadioGroup value={formData.recurrence} onValueChange={(v) => handleRadioChange('recurrence', v)} className="flex gap-4 mt-2">
                    <div className="flex items-center space-x-2"><RadioGroupItem value="unico" id="r_unico" /><Label htmlFor="r_unico">Evento Único</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="recorrente" id="r_recorrente" /><Label htmlFor="r_recorrente">Temporada</Label></div>
                </RadioGroup>
              </div>
            </div>
             {formData.recurrence === 'recorrente' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4 p-4 border rounded-md bg-slate-50">
                    <div>
                        <Label htmlFor="recurrenceType">Tipo de Recorrência</Label>
                        <Select required={formData.recurrence === 'recorrente'} name="type" value={formData.recurrenceDetails.type} onValueChange={(v) => handleRecurrenceChange({name: 'type', value: v})}>
                            <SelectTrigger id="recurrenceType"><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="semanal">Semanal</SelectItem>
                                <SelectItem value="quinzenal">Quinzenal</SelectItem>
                                <SelectItem value="mensal">Mensal</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="dayOfWeek">Dia da Semana</Label>
                        <Select required={formData.recurrence === 'recorrente'} name="dayOfWeek" value={formData.recurrenceDetails.dayOfWeek} onValueChange={(v) => handleRecurrenceChange({name: 'dayOfWeek', value: v})}>
                             <SelectTrigger id="dayOfWeek"><SelectValue placeholder="Selecione..."/></SelectTrigger>
                             <SelectContent>
                                {weekDays.map(day => <SelectItem key={day} value={day}>{day}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="endDate">Data Final da Temporada</Label>
                        <Input required={formData.recurrence === 'recorrente'} type="date" name="endDate" value={formData.recurrenceDetails.endDate} onChange={handleRecurrenceChange} />
                    </div>
                </div>
            )}
          </section>

          <section className="bg-slate-50 p-6 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-200">
              <div className="bg-indigo-100 p-2 rounded-lg text-indigo-700"><Target size={24} /></div>
              <h2 className="text-2xl font-bold text-gray-800">2. Planejamento Tático</h2>
            </div>

            <div className="mb-6">
               <Label htmlFor="visionAlignment">Alinhamento com a Visão (Justificativa)</Label>
               <Textarea required id="visionAlignment" name="visionAlignment" rows={2} value={formData.visionAlignment} onChange={handleChange} placeholder="Como este evento contribui para o tema do ano ou crescimento das células?"></Textarea>
            </div>

            <div className="mb-8">
               <Label htmlFor="phaseAlignment">Alinhamento com a Fase da Igreja</Label>
               <Textarea required id="phaseAlignment" name="phaseAlignment" rows={2} value={formData.phaseAlignment} onChange={handleChange} placeholder="Como este evento se encaixa na fase atual da igreja?"></Textarea>
            </div>

            <div className="bg-white p-5 rounded-lg border border-indigo-100 shadow-sm mb-8">
              <h3 className="font-bold text-indigo-800 mb-4 flex items-center gap-2"><ListChecks size={18}/> Metas SMART (Seja Inteligente)</h3>
              <div className="space-y-3">
                 {Object.entries(smartMappings).map(([key, { label, placeholder }]) => (
                     <div key={key} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                        <Label className="text-xs font-bold uppercase text-indigo-600 md:text-right px-2">{label}</Label>
                        <Input type="text" name={key} placeholder={placeholder} value={formData.smart[key] || ''} onChange={(e) => handleNestedChange(e, 'smart')} className="md:col-span-3 bg-indigo-50/30" />
                     </div>
                 ))}
              </div>
            </div>

             <div className="bg-white p-5 rounded-lg border border-emerald-100 shadow-sm">
              <h3 className="font-bold text-emerald-800 mb-4 flex items-center gap-2"><Layout size={18}/> Plano de Ação (5W2H)</h3>
              <div className="space-y-3">
                 {Object.entries(method5w2hMappings).map(([key, { label, placeholder }]) => (
                     <div key={key} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-start">
                        <Label className="text-xs font-bold uppercase text-emerald-700 md:text-right px-2 pt-2">{label}</Label>
                        <Textarea name={key} placeholder={placeholder} value={formData.method5w2h[key] || ''} onChange={(e) => handleNestedChange(e, 'method5w2h')} className="md:col-span-3 bg-emerald-50/30" rows={3}/>
                     </div>
                 ))}
              </div>
            </div>
          </section>

          <section>
            <TooltipProvider>
                <div className="flex items-center gap-3 mb-6 pb-2 border-b border-gray-200">
                  <div className="bg-indigo-100 p-2 rounded-lg text-indigo-700"><Clock size={24} /></div>
                  <h2 className="text-2xl font-bold text-gray-800">3. Matriz Logística</h2>
                </div>
                <div className="mb-8">
                  <Label className="block text-sm font-bold text-gray-700 mb-2">Cronograma Operacional (Datas e Marcos)</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="startDate">Data de Início</Label>
                                <Input id="startDate" type="date" required name="startDate" value={formData.startDate} onChange={handleChange} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="timeLoadIn" className="flex items-center gap-1 text-xs font-bold text-indigo-600">
                                        1. Load-In
                                        <Tooltip><TooltipTrigger asChild><button type="button"><HelpCircle className="size-3 text-gray-400" /></button></TooltipTrigger><TooltipContent><p>{timeTooltips.timeLoadIn}</p></TooltipContent></Tooltip>
                                    </Label>
                                    <Input id="timeLoadIn" type="time" required name="timeLoadIn" value={formData.timeLoadIn} onChange={handleChange} className="border-indigo-200" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="timeStart" className="flex items-center gap-1 text-xs font-bold text-green-600">
                                        2. Start
                                        <Tooltip><TooltipTrigger asChild><button type="button"><HelpCircle className="size-3 text-gray-400" /></button></TooltipTrigger><TooltipContent><p>{timeTooltips.timeStart}</p></TooltipContent></Tooltip>
                                    </Label>
                                    <Input id="timeStart" type="time" required name="timeStart" value={formData.timeStart} onChange={handleChange} className="border-green-200" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="endDate">Data de Término</Label>
                                <Input id="endDate" type="date" required name="endDate" value={formData.endDate} onChange={handleChange} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="timeEnd" className="flex items-center gap-1 text-xs font-bold text-gray-600">
                                        3. End
                                        <Tooltip><TooltipTrigger asChild><button type="button"><HelpCircle className="size-3 text-gray-400" /></button></TooltipTrigger><TooltipContent><p>{timeTooltips.timeEnd}</p></TooltipContent></Tooltip>
                                    </Label>
                                    <Input id="timeEnd" type="time" required name="timeEnd" value={formData.timeEnd} onChange={handleChange} className="border-gray-200" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="timeLoadOut" className="flex items-center gap-1 text-xs font-bold text-red-600">
                                        4. Load-Out
                                        <Tooltip><TooltipTrigger asChild><button type="button"><HelpCircle className="size-3 text-gray-400" /></button></TooltipTrigger><TooltipContent><p>{timeTooltips.timeLoadOut}</p></TooltipContent></Tooltip>
                                    </Label>
                                    <Input id="timeLoadOut" type="time" required name="timeLoadOut" value={formData.timeLoadOut} onChange={handleChange} className="border-red-200" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mb-6">
                    <Label className="font-bold">Local do Evento</Label>
                    <RadioGroup value={formData.eventType} onValueChange={(v) => handleRadioChange('eventType', v)} className="flex gap-4 mt-2">
                        <Label htmlFor="type_interno" className={cn("flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 flex-1", formData.eventType === 'interno' && 'bg-slate-100 border-slate-400')}>
                            <RadioGroupItem value="interno" id="type_interno" className="mr-2"/>
                            <Building className="mr-2 size-4 text-slate-600" />
                            Interno (na Igreja)
                        </Label>
                        <Label htmlFor="type_externo" className={cn("flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 flex-1", formData.eventType === 'externo' && 'bg-slate-100 border-slate-400')}>
                            <RadioGroupItem value="externo" id="type_externo" className="mr-2"/>
                            <MapPin className="mr-2 size-4 text-slate-600" />
                            Externo
                        </Label>
                    </RadioGroup>
                </div>
                
                {formData.eventType === 'interno' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-b-lg border-x border-b">
                        <div>
                            <Label htmlFor="space">Ambiente Solicitado</Label>
                            <Select name="space" value={formData.space} onValueChange={(v) => setFormData(p => ({...p, space: v}))}>
                                <SelectTrigger id="space"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                <SelectContent>
                                    {rooms.map(room => (
                                        <SelectItem key={room.id} value={room.name}>{room.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="roomLayout">Layout da Sala</Label>
                            <Select name="roomLayout" value={formData.roomLayout} onValueChange={(v) => setFormData(p => ({...p, roomLayout: v}))}><SelectTrigger id="roomLayout"><SelectValue placeholder="Padrão" /></SelectTrigger><SelectContent><SelectItem value="padrao">Padrão</SelectItem><SelectItem value="auditorio">Auditório</SelectItem><SelectItem value="banquete">Banquete (Mesas)</SelectItem><SelectItem value="limpo">Espaço Livre</SelectItem></SelectContent></Select>
                        </div>
                    </div>
                ) : (
                     <div className="bg-slate-50 p-4 rounded-b-lg border-x border-b">
                        <Label htmlFor="externalLocation">Localização do Evento Externo</Label>
                        <Input id="externalLocation" name="externalLocation" value={formData.externalLocation} onChange={handleChange} placeholder="Ex: Chácara Recanto Feliz, Rua das Flores, 123" />
                    </div>
                )}

                 <div className="bg-orange-50 p-6 rounded-xl border border-orange-200 mt-6">
                    <div className="flex items-center gap-2 mb-4"><Utensils className="text-orange-600" size={20} /><h3 className="font-bold text-orange-900">Alimentação</h3></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <Label>Haverá Comida?</Label>
                             <RadioGroup value={formData.hasFood} onValueChange={(v) => handleRadioChange('hasFood', v)} className="flex items-center gap-4 mt-2">
                                <div className="flex items-center space-x-2"><RadioGroupItem value="sim" id="food_sim" /><Label htmlFor="food_sim">Sim</Label></div>
                                <div className="flex items-center space-x-2"><RadioGroupItem value="nao" id="food_nao" /><Label htmlFor="food_nao">Não</Label></div>
                            </RadioGroup>
                        </div>
                        {formData.hasFood === 'sim' && (<>
                            <div>
                                <Label className="text-xs font-bold text-orange-800 uppercase">Origem</Label>
                                 <Select name="foodType" value={formData.foodType} onValueChange={(v) => setFormData(p => ({...p, foodType: v}))}><SelectTrigger><SelectValue placeholder="Selecione..."/></SelectTrigger><SelectContent><SelectItem value="interno">Preparo Interno</SelectItem><SelectItem value="terceirizado">Buffet</SelectItem><SelectItem value="potluck">Junta-Pratos</SelectItem></SelectContent></Select>
                            </div>
                            <div>
                                <Label className="text-xs font-bold text-orange-800 uppercase">Responsável Limpeza</Label>
                                <Input type="text" name="kitchenResponsible" value={formData.kitchenResponsible} onChange={handleChange} />
                            </div>
                        </>)}
                    </div>
                 </div>
                 <div className="mt-4">
                    <Label htmlFor="logisticsNotes">Observações sobre Logística</Label>
                    <Textarea id="logisticsNotes" name="logisticsNotes" value={formData.logisticsNotes} onChange={handleChange} placeholder="Observações gerais sobre horários, locais, alimentação, etc." />
                </div>
            </TooltipProvider>
          </section>

           <section>
                <div className="flex items-center gap-3 mb-6 pb-2 border-b border-gray-200">
                    <div className="bg-orange-100 p-2 rounded-lg text-orange-700"><Users size={24} /></div>
                    <h2 className="text-2xl font-bold text-gray-800">4. Equipes de Serviço</h2>
                </div>
                <div>
                    <Label>Áreas de Serviço Demandadas</Label>
                    <p className="text-sm text-muted-foreground mb-2">Selecione as áreas necessárias e a quantidade de voluntários para cada.</p>
                    <ScrollArea className="h-60 w-full rounded-md border p-4">
                        <div className="space-y-4">
                            {areas.map(area => {
                                const isSelected = formData.requiredServiceAreas.some(ra => ra.areaId === area.id);
                                const selectedArea = formData.requiredServiceAreas.find(ra => ra.areaId === area.id);
                                return (
                                    <div key={area.id} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Checkbox
                                                id={`area-${area.id}`}
                                                checked={isSelected}
                                                onCheckedChange={(checked) => handleAreaChange(area.id, !!checked)}
                                            />
                                            <Label htmlFor={`area-${area.id}`}>{area.name}</Label>
                                        </div>
                                        {isSelected && (
                                            <div className="flex items-center gap-2">
                                                <Button type="button" variant="outline" size="icon" className="h-6 w-6" onClick={() => handleQuantityChange(area.id, false)}><Minus className="h-3 w-3"/></Button>
                                                <span className="font-bold w-4 text-center">{selectedArea?.quantity}</span>
                                                <Button type="button" variant="outline" size="icon" className="h-6 w-6" onClick={() => handleQuantityChange(area.id, true)}><Plus className="h-3 w-3"/></Button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </ScrollArea>
                </div>
                 <div className="mt-4">
                    <Label htmlFor="serviceTeamsNotes">Observações sobre Equipes</Label>
                    <Textarea id="serviceTeamsNotes" name="serviceTeamsNotes" value={formData.serviceTeamsNotes} onChange={handleChange} placeholder="Alguma necessidade específica de perfil, uniforme, etc?" />
                </div>
            </section>

          <section>
            <div className="flex items-center gap-3 mb-6 pb-2 border-b border-gray-200">
              <div className="bg-emerald-100 p-2 rounded-lg text-emerald-700"><DollarSign size={24} /></div>
              <h2 className="text-2xl font-bold text-gray-800">5. Engenharia Financeira</h2>
            </div>
            <RadioGroup value={formData.isPaid} onValueChange={(v) => handleRadioChange('isPaid', v)} className="flex gap-4 mb-4">
                <Label htmlFor="paid_nao" className={cn("flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 flex-1", formData.isPaid === 'gratuito' && 'bg-slate-100 border-slate-400')}><RadioGroupItem value="gratuito" id="paid_nao" className="mr-2"/>Subsidiado (Gratuito)</Label>
                <Label htmlFor="paid_sim" className={cn("flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 flex-1", formData.isPaid === 'pago' && 'bg-slate-100 border-slate-400')}><RadioGroupItem value="pago" id="paid_sim" className="mr-2"/>Autossustentável (Pago)</Label>
            </RadioGroup>
            {formData.isPaid === 'pago' && (
                <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-200 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div><Label htmlFor="fixedCosts">Custos Fixos Totais (R$)</Label><Input id="fixedCosts" type="number" name="fixedCosts" value={formData.fixedCosts} onChange={handleChange} placeholder="Soma de todos os custos que não mudam com o nº de pessoas"/></div>
                        <div><Label htmlFor="variableCostPerPerson">Custo Variável por Pessoa (R$)</Label><Input id="variableCostPerPerson" type="number" name="variableCostPerPerson" value={formData.variableCostPerPerson} onChange={handleChange} placeholder="Custo do kit, alimentação, etc."/></div>
                    </div>
                    <div className="space-y-4">
                        <div><Label htmlFor="ticketPrice">Valor da Inscrição (R$)</Label><Input id="ticketPrice" type="number" name="ticketPrice" value={formData.ticketPrice} onChange={handleChange} /></div>
                        <div>
                            <Label htmlFor="breakEvenAnalysis">Ponto de Equilíbrio (Qtd. Pessoas)</Label>
                            <Input id="breakEvenAnalysis" type="number" name="breakEvenAnalysis" value={formData.breakEvenAnalysis} disabled className="font-bold bg-white" />
                            <p className="text-xs text-muted-foreground mt-1">Nº de inscrições para cobrir os custos.</p>
                        </div>
                    </div>
                </div>
            )}
             <div className="mt-4">
                <Label htmlFor="financialsNotes">Observações Financeiras</Label>
                <Textarea id="financialsNotes" name="financialsNotes" value={formData.financialsNotes} onChange={handleChange} placeholder="Justificativa de custos, necessidade de patrocínio, etc." />
            </div>
          </section>
          
          <section>
            <div className="flex items-center gap-3 mb-6 pb-2 border-b border-gray-200">
              <div className="bg-rose-100 p-2 rounded-lg text-rose-700"><Megaphone size={24} /></div>
              <h2 className="text-2xl font-bold text-gray-800">6. Comunicação & Marketing</h2>
            </div>

            <div className="space-y-6">
              <div>
                <Label className="font-bold">Precisa de apoio da equipe de design?</Label>
                <RadioGroup value={formData.designSupportNeeded} onValueChange={(v) => handleRadioChange('designSupportNeeded', v)} className="flex gap-4 mt-2">
                    <div className="flex items-center space-x-2"><RadioGroupItem value="sim" id="design_sim" /><Label htmlFor="design_sim">Sim</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="nao" id="design_nao" /><Label htmlFor="design_nao">Não</Label></div>
                </RadioGroup>
              </div>

              {formData.designSupportNeeded === 'sim' && (
                  <div className="bg-rose-50 p-4 rounded-lg border border-rose-100">
                      <Label className="font-semibold text-rose-800">Quais itens de design você precisa?</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                          {designOptions.map(item => (
                              <div key={item.id} className="flex items-center space-x-2">
                                  <Checkbox
                                      id={item.id}
                                      checked={formData.designRequests.includes(item.label)}
                                      onCheckedChange={(checked) => handleDesignRequestChange(item.label, !!checked)}
                                  />
                                  <Label htmlFor={item.id} className="font-normal">{item.label}</Label>
                              </div>
                          ))}
                      </div>
                  </div>
              )}

              <div>
                  <Label className="font-bold">Precisa de planejamento de marketing? <span className="text-sm text-muted-foreground font-normal">(para eventos grandes)</span></Label>
                  <RadioGroup value={formData.marketingSupportNeeded} onValueChange={(v) => handleRadioChange('marketingSupportNeeded', v)} className="flex gap-4 mt-2">
                      <div className="flex items-center space-x-2"><RadioGroupItem value="sim" id="marketing_sim" /><Label htmlFor="marketing_sim">Sim</Label></div>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="nao" id="marketing_nao" /><Label htmlFor="marketing_nao">Não</Label></div>
                  </RadioGroup>
              </div>
            </div>
             <div className="mt-4">
                <Label htmlFor="marketingNotes">Observações sobre Comunicação</Label>
                <Textarea id="marketingNotes" name="marketingNotes" value={formData.marketingNotes} onChange={handleChange} placeholder="Público-alvo, canais de divulgação, mensagem principal, etc." />
            </div>
          </section>

          <div className="pt-6 border-t border-gray-200 flex items-center gap-4">
            <Button type="submit" disabled={loading} size="lg" className="w-full md:w-auto md:min-w-[300px]">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {existingEvent ? 'Salvar Alterações' : 'Protocolar Solicitação'}
            </Button>
            {existingEvent && (
                <Button type="button" variant="outline" onClick={handleGeneratePdf} size="lg">
                    <Download className="mr-2 h-4 w-4" />
                    Gerar PDF
                </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
