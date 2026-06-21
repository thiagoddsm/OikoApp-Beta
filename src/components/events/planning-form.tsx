'use client';

import React, { useState, useEffect } from 'react';
import { useFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  Clock, Users, DollarSign, Utensils, FileText, Target, ListChecks, HelpCircle, 
  MapPin, Download, HeartHandshake, Baby, Music, Video, Shield, Coffee, HelpCircle as HelpIcon,
  Sparkles, Check, ChevronRight, Loader2, AlertCircle, Info, Calendar, Plus, Minus, UploadCloud,
  Image, CreditCard
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useVolunteering } from '@/contexts/volunteering-context';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEventsData, useCoursesData, useVolunteeringServiceData } from "@/hooks/useDomainData";

export interface PlanningEvent {
    id: string;
    date?: string;
    ministry: string;
    organizer: string;
    eventName: string;
    category: string;
    recurrence: string;
    recurrenceDetails: any;
    visionAlignment: string;
    phaseAlignment: string;
    smart: Record<string, string>;
    method5w2h: Record<string, string>;
    startDate: string;
    endDate: string;
    timeLoadIn: string;
    timeStart: string;
    timeEnd: string;
    timeLoadOut: string;
    eventType: string;
    space: string;
    externalLocation: string;
    roomLayout: string;
    requiredServiceAreas: { areaId: string; quantity: number }[];
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
    coverImageUrl?: string;
    expectedAttendance?: number;
    hasAlternativeFunding?: boolean;
    alternativeFundingDetails?: string;
    alternativeFundingExpectedAmount?: number;
    acceptPix?: boolean;
    acceptCash?: boolean;
    acceptCard?: boolean;
    acceptInstallments?: boolean;
    maxInstallments?: number;
    installmentsInterestType?: 'com_juros' | 'sem_juros';
    acceptRecurring?: boolean;
    recurringLimitMonth?: string;
    isPublicForRegistration?: boolean;
    requiresBaptism?: boolean;
    requiresActiveService?: boolean;
    requiredCourseId?: string;
    registrationPageType?: 'system' | 'custom_html';
    customHtmlCode?: string;
}

const weekDays = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

// Function to map a service area name to a Lucide icon
function getAreaIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes('mídia') || n.includes('som') || n.includes('transmissão') || n.includes('projeção') || n.includes('foto') || n.includes('luz')) {
    return <Video className="size-5" />;
  }
  if (n.includes('kids') || n.includes('infantil') || n.includes('crianças')) {
    return <Baby className="size-5" />;
  }
  if (n.includes('louvor') || n.includes('música') || n.includes('banda') || n.includes('canto')) {
    return <Music className="size-5" />;
  }
  if (n.includes('recepção') || n.includes('acolhimento') || n.includes('boas') || n.includes('diácono')) {
    return <HeartHandshake className="size-5" />;
  }
  if (n.includes('café') || n.includes('alimentação') || n.includes('cantina') || n.includes('cozinha')) {
    return <Coffee className="size-5" />;
  }
  if (n.includes('segurança') || n.includes('estacionamento') || n.includes('apoio')) {
    return <Shield className="size-5" />;
  }
  return <Users className="size-5" />;
}

export function EventPlanningForm({ existingEvent = null }: { existingEvent?: PlanningEvent | null }) {
  const { firestore, storage } = useFirebase();
    const { events, reservations, rooms, strategicEvents, reservationCategories } = useEventsData();
    const { courses, classes, enrollmentRequests, pedagogicalLogs, theoflixCourses } = useCoursesData();
    const { serviceAreas, teams, savedSchedules } = useVolunteeringServiceData();

  const { toast } = useToast();
  const [uploadingCover, setUploadingCover] = useState(false);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !storage) return;

    setUploadingCover(true);
    const fileRef = ref(storage, `event-covers/${Date.now()}_${file.name}`);
    try {
      const snapshot = await uploadBytes(fileRef, file);
      const url = await getDownloadURL(snapshot.ref);
      setFormData(prev => ({ ...prev, coverImageUrl: url }));
      toast({ title: 'Sucesso!', description: 'Imagem de capa carregada com sucesso.' });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({ title: 'Erro no upload', description: error.message || 'Erro ao enviar imagem.', variant: 'destructive' });
    } finally {
      setUploadingCover(false);
    }
  };

  const allRooms = React.useMemo(() => {
    const list = [...rooms];
    if (!list.some(r => r.name.toLowerCase() === 'online')) {
      list.push({ id: 'online_room', name: 'Online' } as any);
    }
    return list;
  }, [rooms]);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Simplified Form state that maps to backend strategic/SMART/5W2H schemas
  const [formData, setFormData] = useState({
    ministry: '',
    organizer: 'IBM',
    eventName: '',
    category: '',
    recurrence: 'unico',
    recurrenceDetails: { type: 'semanal', endDate: '', dayOfWeek: '' },
    
    // Simplified Practical Plan fields
    importance: '', // Maps to visionAlignment & method5w2h.why
    whatWeWillDo: '', // Maps to smart.specific, method5w2h.what
    whatWeNeed: '', // Maps to smart.achievable, method5w2h.how
    
    startDate: '',
    endDate: '',
    timeStart: '',
    timeEnd: '',
    
    eventType: 'interno',
    space: '',
    externalLocation: '',
    roomLayout: 'padrao',
    requiredServiceAreas: [] as { areaId: string; quantity: number }[],
    
    hasFood: 'nao',
    kitchenResponsible: '',
    
    isPaid: 'gratuito',
    fixedCosts: '', // "Custo Total do Evento"
    variableCostPerPerson: '',
    ticketPrice: '', // "Preço Cobrado por Pessoa"
    
    coverImageUrl: '',
    expectedAttendance: '',
    hasAlternativeFunding: false,
    alternativeFundingDetails: '',
    alternativeFundingExpectedAmount: '',
    acceptPix: false,
    acceptCash: false,
    acceptCard: false,
    acceptInstallments: false,
    maxInstallments: '12',
    installmentsInterestType: 'sem_juros' as 'com_juros' | 'sem_juros',
    acceptRecurring: false,
    recurringLimitMonth: '',

    isPublicForRegistration: false,
    requiresBaptism: false,
    requiresActiveService: false,
    requiredCourseId: '',
    registrationPageType: 'system',
    customHtmlCode: '',
  });

  // Load existing event data & map technical fields to simplified fields
  useEffect(() => {
    if (existingEvent) {
      setFormData({
        ministry: existingEvent.ministry || '',
        organizer: existingEvent.organizer || 'IBM',
        eventName: existingEvent.eventName || '',
        category: existingEvent.category || '',
        recurrence: existingEvent.recurrence || 'unico',
        recurrenceDetails: existingEvent.recurrenceDetails || { type: 'semanal', endDate: '', dayOfWeek: '' },
        
        importance: existingEvent.visionAlignment || existingEvent.method5w2h?.why || '',
        whatWeWillDo: existingEvent.method5w2h?.what || existingEvent.smart?.specific || '',
        whatWeNeed: existingEvent.method5w2h?.how || existingEvent.smart?.achievable || '',
        
        startDate: existingEvent.startDate || existingEvent.date || '',
        endDate: existingEvent.endDate || existingEvent.startDate || existingEvent.date || '',
        timeStart: existingEvent.timeStart || '',
        timeEnd: existingEvent.timeEnd || '',
        
        eventType: existingEvent.eventType || 'interno',
        space: existingEvent.space || '',
        externalLocation: existingEvent.externalLocation || '',
        roomLayout: existingEvent.roomLayout || 'padrao',
        requiredServiceAreas: existingEvent.requiredServiceAreas || [],
        
        hasFood: existingEvent.hasFood || 'nao',
        kitchenResponsible: existingEvent.kitchenResponsible || '',
        
        isPaid: existingEvent.isPaid || 'gratuito',
        fixedCosts: existingEvent.fixedCosts?.toString() || '',
        variableCostPerPerson: existingEvent.variableCostPerPerson?.toString() || '',
        ticketPrice: existingEvent.ticketPrice?.toString() || '',
        
        coverImageUrl: existingEvent.coverImageUrl || '',
        expectedAttendance: existingEvent.expectedAttendance?.toString() || '',
        hasAlternativeFunding: existingEvent.hasAlternativeFunding || false,
        alternativeFundingDetails: existingEvent.alternativeFundingDetails || '',
        alternativeFundingExpectedAmount: existingEvent.alternativeFundingExpectedAmount?.toString() || '',
        acceptPix: existingEvent.acceptPix || false,
        acceptCash: existingEvent.acceptCash || false,
        acceptCard: existingEvent.acceptCard || false,
        acceptInstallments: existingEvent.acceptInstallments || false,
        maxInstallments: existingEvent.maxInstallments?.toString() || '12',
        installmentsInterestType: existingEvent.installmentsInterestType || 'sem_juros',
        acceptRecurring: existingEvent.acceptRecurring || false,
        recurringLimitMonth: existingEvent.recurringLimitMonth || '',

        isPublicForRegistration: existingEvent.isPublicForRegistration || false,
        requiresBaptism: existingEvent.requiresBaptism || false,
        requiresActiveService: existingEvent.requiresActiveService || false,
        requiredCourseId: existingEvent.requiredCourseId || '',
        registrationPageType: existingEvent.registrationPageType || 'system',
        customHtmlCode: existingEvent.customHtmlCode || '',
      });
    }
  }, [existingEvent]);

  // Handle standard input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRadioChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRecurrenceChange = (e: any) => {
    const name = e.target ? e.target.name : e.name;
    const value = e.target ? e.target.value : e.value;
    setFormData(prev => ({
      ...prev,
      recurrenceDetails: { ...prev.recurrenceDetails, [name]: value }
    }));
  };

  // Visual Ministry Team Quantity Change handlers
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

  const handleQuantityChange = (areaId: string, increment: boolean) => {
    setFormData(prev => ({
      ...prev,
      requiredServiceAreas: prev.requiredServiceAreas.map(a => {
        if (a.areaId === areaId) {
          const newQty = increment ? a.quantity + 1 : Math.max(1, a.quantity - 1);
          return { ...a, quantity: newQty };
        }
        return a;
      })
    }));
  };

  // Submit and map simplified fields back to technical Firestore schemas
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!firestore) {
      toast({ title: 'Erro', description: 'Banco de dados não disponível.', variant: 'destructive' });
      setLoading(false);
      return;
    }

    const fixed = parseFloat(formData.fixedCosts) || 0;
    const price = parseFloat(formData.ticketPrice) || 0;
    const variable = parseFloat(formData.variableCostPerPerson) || 0;

    // Automatic break-even calculation
    const breakEven = (price > variable) ? Math.ceil(fixed / (price - variable)) : 0;

    // ── backend mapping logic ──────────────────────────────────────
    const mappedSmart = {
      specific: formData.whatWeWillDo,
      measurable: `Público-alvo e engajamento: ${formData.whatWeWillDo.substring(0, 100)}...`,
      achievable: `Recursos mapeados: ${formData.whatWeNeed.substring(0, 100)}...`,
      relevant: formData.importance,
      timeBound: `${formData.startDate} das ${formData.timeStart} às ${formData.timeEnd}`,
    };

    const mapped5w2h = {
      what: formData.whatWeWillDo,
      why: formData.importance,
      who: formData.ministry,
      where: formData.eventType === 'interno' ? formData.space : formData.externalLocation,
      when: `${formData.startDate} (${formData.timeStart} - ${formData.timeEnd})`,
      how: formData.whatWeNeed,
      howMuch: formData.isPaid === 'pago' ? `Custo Total: R$ ${fixed}` : 'Gratuito (Subvenção)',
    };

    const dataToSave = {
      ministry: formData.ministry,
      organizer: formData.organizer,
      eventName: formData.eventName,
      category: formData.category,
      recurrence: formData.recurrence,
      recurrenceDetails: formData.recurrence,
      
      visionAlignment: formData.importance,
      phaseAlignment: `Identidade e maturidade da igreja: ${formData.importance.substring(0, 100)}...`,
      
      smart: mappedSmart,
      method5w2h: mapped5w2h,
      
      startDate: formData.startDate,
      endDate: formData.endDate || formData.startDate,
      timeStart: formData.timeStart,
      timeEnd: formData.timeEnd,
      
      // Auto-set logistics markers behind the scenes
      timeLoadIn: formData.timeStart,
      timeLoadOut: formData.timeEnd,
      
      eventType: formData.eventType,
      space: formData.space,
      externalLocation: formData.externalLocation,
      roomLayout: formData.roomLayout,
      requiredServiceAreas: formData.requiredServiceAreas,
      
      hasFood: formData.hasFood,
      kitchenResponsible: formData.hasFood === 'sim' ? formData.kitchenResponsible : '',
      
      isPaid: formData.isPaid,
      fixedCosts: fixed,
      variableCostPerPerson: variable,
      ticketPrice: price,
      breakEvenAnalysis: breakEven,

      coverImageUrl: formData.coverImageUrl,
      expectedAttendance: parseInt(formData.expectedAttendance) || 0,
      hasAlternativeFunding: formData.hasAlternativeFunding,
      alternativeFundingDetails: formData.hasAlternativeFunding ? formData.alternativeFundingDetails : '',
      alternativeFundingExpectedAmount: formData.hasAlternativeFunding ? (parseFloat(formData.alternativeFundingExpectedAmount) || 0) : 0,
      acceptPix: formData.acceptPix,
      acceptCash: formData.acceptCash,
      acceptCard: formData.acceptCard,
      acceptInstallments: formData.acceptInstallments,
      maxInstallments: formData.acceptInstallments ? (parseInt(formData.maxInstallments) || 12) : null,
      installmentsInterestType: formData.acceptInstallments ? formData.installmentsInterestType : null,
      acceptRecurring: formData.acceptRecurring,
      recurringLimitMonth: formData.acceptRecurring ? formData.recurringLimitMonth : null,
      
      isPublicForRegistration: formData.isPublicForRegistration,
      requiresBaptism: formData.requiresBaptism,
      requiresActiveService: formData.requiresActiveService,
      requiredCourseId: formData.requiredCourseId,
      registrationPageType: formData.registrationPageType,
      customHtmlCode: formData.customHtmlCode,
    };

    try {
      if (existingEvent) {
        const docRef = doc(firestore, "strategic_events", existingEvent.id);
        await updateDocumentNonBlocking(docRef, dataToSave);
        toast({ title: 'Sucesso!', description: 'O evento foi atualizado.' });
      } else {
        const collectionRef = collection(firestore, "strategic_events");
        await addDocumentNonBlocking(collectionRef, {
          ...dataToSave,
          submittedAt: serverTimestamp(),
          status: 'analise_estrategica'
        });
        setSuccess(true);
        window.scrollTo(0, 0);
        toast({ title: 'Sucesso!', description: 'Sua solicitação de evento foi protocolada.' });
      }
    } catch (error) {
      console.error("Erro:", error);
      toast({ title: 'Erro ao Submeter', description: 'Por favor, tente novamente.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
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
    const titleLines = doc.splitTextToSize(`Planejamento de Evento: ${formData.eventName}`, 180);
    doc.text(titleLines, margin, y);
    y += (titleLines.length * 7) + 3;

    doc.setFontSize(12);
    doc.text(`Solicitante: ${formData.ministry} (${formData.organizer})`, margin, y);
    y += 7;
    doc.text(`Categoria: ${formData.category}`, margin, y);
    y += 10;

    y = addSection('Por que este evento é importante para o ministério:', formData.importance, y);
    y = addSection('Plano Prático (O que faremos):', formData.whatWeWillDo, y);
    y = addSection('Recursos Necessários:', formData.whatWeNeed, y);

    const eventStartDate = formData.startDate ? format(new Date(formData.startDate + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A';
    doc.text(`Data: ${eventStartDate} (${formData.timeStart} - ${formData.timeEnd})`, margin, y);
    y += 10;

    doc.save(`evento_${formData.eventName.replace(/\s+/g, '_')}.pdf`);
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto bg-slate-950 border border-slate-800 rounded-2xl p-12 text-center shadow-2xl mt-12 text-white">
        <div className="w-20 h-20 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
          <Sparkles className="size-10 animate-pulse" />
        </div>
        <h2 className="text-3xl font-extrabold text-white mb-3">Solicitação Protocolada!</h2>
        <p className="text-slate-400 text-sm mb-8 leading-relaxed">
          Obrigado por planejar com excelência. Sua solicitação foi enviada para o Conselho Administrativo e a Governança Geral da IBM. Você receberá atualizações no seu painel.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <Button onClick={() => setSuccess(false)} variant="outline" className="border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white">
            Criar Outra Solicitação
          </Button>
          <Button asChild className="bg-blue-600 hover:bg-blue-500">
            <a href="/dashboard/events">Ir para Painel de Eventos</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-slate-950 border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden text-white font-sans antialiased">
      
      {/* Visual Header */}
      <div className="relative bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-800/60 py-10 px-8 text-center overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="relative z-10 space-y-2">
          <span className="bg-blue-950 text-blue-300 border border-blue-800/50 text-[10px] font-black px-3.5 py-1 rounded-full uppercase tracking-wider">
            IBM Eventos
          </span>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            {existingEvent ? 'Editar Planejamento' : 'Planejar Novo Evento'}
          </h1>
          <p className="text-slate-400 max-w-xl mx-auto text-xs sm:text-sm leading-relaxed">
            Compartilhe a visão do seu evento. Cuidamos do suporte tecnológico e infraestrutura para que você foque no ministério.
          </p>
        </div>

        {existingEvent && (
          <Button 
            onClick={handleGeneratePdf} 
            variant="outline" 
            size="sm" 
            className="absolute top-4 right-4 bg-slate-900 border-slate-800 text-xs font-bold gap-2 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <Download className="size-3.5" /> PDF
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-6 sm:p-10 space-y-10">

        {/* Section 1: Identidade */}
        <section className="space-y-6">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800/80">
            <Info className="size-5 text-blue-400" />
            <h2 className="text-lg font-bold text-slate-100">Identidade do Evento</h2>
          </div>

          {/* Upload de Imagem de Capa do Evento */}
          <div className="space-y-2">
            <Label className="text-slate-350 text-xs uppercase tracking-wider font-bold">Imagem de Capa do Evento (Upload)</Label>
            {formData.coverImageUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-850 bg-slate-950 aspect-[21/9] flex items-center justify-center group">
                <img src={formData.coverImageUrl} alt="Capa do Evento" className="object-cover w-full h-full" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="font-bold text-xs"
                    onClick={() => setFormData(prev => ({ ...prev, coverImageUrl: '' }))}
                  >
                    Remover Capa
                  </Button>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-850 hover:border-blue-500/50 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-950/40 relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={uploadingCover}
                />
                <div className="space-y-2">
                  {uploadingCover ? (
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                      <span className="text-xs">Subindo imagem...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <UploadCloud className="h-8 w-8 text-slate-500" />
                      <span className="text-xs font-bold text-slate-300">Escolha uma imagem para a capa</span>
                      <span className="text-[10px] text-slate-500">Recomendado: proporção paisagem (ex. 1200x500)</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <Label htmlFor="ministry" className="text-slate-300 text-xs uppercase tracking-wider font-bold">Nome do Ministério / Solicitante</Label>
              <Input required id="ministry" name="ministry" value={formData.ministry} onChange={handleChange} placeholder="Ex: Louvor, Jovens, Missões..." className="bg-slate-950 border-slate-800 focus-visible:ring-blue-500" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs uppercase tracking-wider font-bold">Tipo de Organização</Label>
              <RadioGroup value={formData.organizer} onValueChange={(v) => handleRadioChange('organizer', v)} className="flex gap-6 mt-3">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="IBM" id="org_ibm" className="text-blue-500 focus:ring-blue-500" />
                  <Label htmlFor="org_ibm" className="font-medium text-sm cursor-pointer text-slate-200">Interno (IBM)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Externo" id="org_externo" className="text-blue-500 focus:ring-blue-500" />
                  <Label htmlFor="org_externo" className="font-medium text-sm cursor-pointer text-slate-200">Externo / Parceria</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="eventName" className="text-slate-300 text-xs uppercase tracking-wider font-bold">Nome do Evento</Label>
              <Input required id="eventName" name="eventName" value={formData.eventName} onChange={handleChange} placeholder="Ex: IBM Camp, Conexão Louvor, Vigília..." className="bg-slate-950 border-slate-800 focus-visible:ring-blue-500" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="category" className="text-slate-300 text-xs uppercase tracking-wider font-bold">Categoria</Label>
              <Select required name="category" value={formData.category} onValueChange={(v) => setFormData(p => ({...p, category: v}))}>
                <SelectTrigger id="category" className="bg-slate-950 border-slate-800">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-850 text-white">
                  <SelectItem value="adoracao">Adoração e Liturgia</SelectItem>
                  <SelectItem value="educacao">Educação e Discipulado</SelectItem>
                  <SelectItem value="koinonia">Comunhão e Koinonia</SelectItem>
                  <SelectItem value="outreach">Evangelismo e Missões</SelectItem>
                  <SelectItem value="adm">Administrativo e Governança</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expectedAttendance" className="text-slate-300 text-xs uppercase tracking-wider font-bold">Público Esperado (Número de Pessoas)</Label>
              <Input required type="number" id="expectedAttendance" name="expectedAttendance" value={formData.expectedAttendance} onChange={handleChange} placeholder="Ex: 150" className="bg-slate-950 border-slate-800 focus-visible:ring-blue-500" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs uppercase tracking-wider font-bold">Frequência</Label>
            <RadioGroup value={formData.recurrence} onValueChange={(v) => handleRadioChange('recurrence', v)} className="flex gap-6 mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="unico" id="r_unico" className="text-blue-500" />
                <Label htmlFor="r_unico" className="font-medium text-sm cursor-pointer">Único</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="recorrente" id="r_recorrente" className="text-blue-500" />
                <Label htmlFor="r_recorrente" className="font-medium text-sm cursor-pointer">Temporada (Recorrente)</Label>
              </div>
            </RadioGroup>
          </div>

          {formData.recurrence === 'recorrente' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-slate-800 bg-slate-950/40 rounded-xl">
              <div className="space-y-1.5">
                <Label htmlFor="recurrenceType" className="text-xs text-slate-400">Intervalo</Label>
                <Select required={formData.recurrence === 'recorrente'} name="type" value={formData.recurrenceDetails.type} onValueChange={(v) => handleRecurrenceChange({name: 'type', value: v})}>
                  <SelectTrigger id="recurrenceType" className="bg-slate-950 border-slate-800"><SelectValue/></SelectTrigger>
                  <SelectContent className="bg-slate-900 text-white border-slate-800">
                    <SelectItem value="semanal">Semanal</SelectItem>
                    <SelectItem value="quinzenal">Quinzenal</SelectItem>
                    <SelectItem value="mensal">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dayOfWeek" className="text-xs text-slate-400">Dia da Semana</Label>
                <Select required={formData.recurrence === 'recorrente'} name="dayOfWeek" value={formData.recurrenceDetails.dayOfWeek} onValueChange={(v) => handleRecurrenceChange({name: 'dayOfWeek', value: v})}>
                  <SelectTrigger id="dayOfWeek" className="bg-slate-950 border-slate-800"><SelectValue placeholder="Selecione..."/></SelectTrigger>
                  <SelectContent className="bg-slate-900 text-white border-slate-800">
                    {weekDays.map(day => <SelectItem key={day} value={day}>{day}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endDate" className="text-xs text-slate-400">Data Final da Temporada</Label>
                <Input required={formData.recurrence === 'recorrente'} type="date" name="endDate" value={formData.recurrenceDetails.endDate} onChange={handleRecurrenceChange} className="bg-slate-950 border-slate-800" />
              </div>
            </div>
          )}
        </section>

        {/* Section 2: Proposta e Importância */}
        <section className="space-y-6 bg-slate-950/40 p-6 rounded-2xl border border-slate-800/80">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-850">
            <Sparkles className="size-5 text-blue-400" />
            <h2 className="text-lg font-bold text-slate-100">Coração & Propósito</h2>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="importance" className="text-slate-300 text-xs uppercase tracking-wider font-bold">Por que este evento é importante para o seu ministério?</Label>
            <Textarea required id="importance" name="importance" rows={3} value={formData.importance} onChange={handleChange} placeholder="Descreva de forma simples o motivo por trás deste evento e o impacto espiritual e de comunhão esperado..." className="bg-slate-950 border-slate-850 text-white placeholder-slate-600 focus-visible:ring-blue-500" />
          </div>
        </section>

        {/* Section 3: Plano Prático */}
        <section className="space-y-6">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800/80">
            <ListChecks className="size-5 text-blue-400" />
            <h2 className="text-lg font-bold text-slate-100">Plano Prático</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="whatWeWillDo" className="text-slate-300 text-xs uppercase tracking-wider font-bold">O que faremos?</Label>
              <Textarea required id="whatWeWillDo" name="whatWeWillDo" rows={3} value={formData.whatWeWillDo} onChange={handleChange} placeholder="Como será o evento na prática? Detalhe o fluxo básico de horários e a programação principal..." className="bg-slate-950 border-slate-800 focus-visible:ring-blue-500" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="whatWeNeed" className="text-slate-300 text-xs uppercase tracking-wider font-bold">O que precisamos? (Cadeiras, Som, Limpeza)</Label>
              <Textarea required id="whatWeNeed" name="whatWeNeed" rows={2} value={formData.whatWeNeed} onChange={handleChange} placeholder="Liste os equipamentos de som, projeção, cadeiras, mesas, púlpito e recursos operacionais necessários..." className="bg-slate-950 border-slate-800 focus-visible:ring-blue-500" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fixedCosts" className="text-slate-300 text-xs uppercase tracking-wider font-bold">Qual o orçamento previsto? (Custo total estimado)</Label>
              <Input 
                id="fixedCosts" 
                name="fixedCosts" 
                type="number" 
                value={formData.fixedCosts} 
                onChange={handleChange} 
                placeholder="Ex: 500.00" 
                className="bg-slate-950 border-slate-800 focus-visible:ring-blue-500" 
              />
            </div>
          </div>
        </section>

        {/* Section 4: Cronograma e Local */}
        <section className="space-y-6">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800/80">
            <Calendar className="size-5 text-blue-400" />
            <h2 className="text-lg font-bold text-slate-100">Cronograma & Local</h2>
          </div>

          <div className="bg-slate-950/40 p-5 border border-slate-850 rounded-2xl space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="startDate" className="text-xs text-slate-400 uppercase tracking-wider font-bold">Data do Evento</Label>
                <Input id="startDate" type="date" required name="startDate" value={formData.startDate} onChange={handleChange} className="bg-slate-950 border-slate-800 focus-visible:ring-blue-500" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="timeStart" className="text-xs text-slate-400 uppercase tracking-wider font-bold">Horário de Início</Label>
                <Input id="timeStart" type="time" required name="timeStart" value={formData.timeStart} onChange={handleChange} className="bg-slate-950 border-slate-800 focus-visible:ring-blue-500" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="timeEnd" className="text-xs text-slate-400 uppercase tracking-wider font-bold">Horário de Término</Label>
                <Input id="timeEnd" type="time" required name="timeEnd" value={formData.timeEnd} onChange={handleChange} className="bg-slate-950 border-slate-800 focus-visible:ring-blue-500" />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs uppercase tracking-wider font-bold">Onde será realizado o evento?</Label>
              <RadioGroup value={formData.eventType} onValueChange={(v) => handleRadioChange('eventType', v)} className="flex gap-6 mt-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="interno" id="loc_int" className="text-blue-500" />
                  <Label htmlFor="loc_int" className="font-medium text-sm cursor-pointer text-slate-200">IBM (Espaço Físico / Online)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="externo" id="loc_ext" className="text-blue-500" />
                  <Label htmlFor="loc_ext" className="font-medium text-sm cursor-pointer text-slate-200">Local Externo</Label>
                </div>
              </RadioGroup>
            </div>

            {formData.eventType === 'interno' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-slate-850 bg-slate-950/40 rounded-xl">
                <div className="space-y-1.5">
                  <Label htmlFor="space" className="text-xs text-slate-400">Ambiente Solicitado</Label>
                  <Select name="space" value={formData.space} onValueChange={(v) => setFormData(p => ({...p, space: v}))}>
                    <SelectTrigger id="space" className="bg-slate-950 border-slate-800"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent className="bg-slate-900 text-white border-slate-800">
                      {allRooms.map(room => (
                        <SelectItem key={room.id} value={room.name}>{room.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="roomLayout" className="text-xs text-slate-400">Organização da Sala</Label>
                  <Select name="roomLayout" value={formData.roomLayout} onValueChange={(v) => setFormData(p => ({...p, roomLayout: v}))}>
                    <SelectTrigger id="roomLayout" className="bg-slate-950 border-slate-800"><SelectValue placeholder="Padrão" /></SelectTrigger>
                    <SelectContent className="bg-slate-900 text-white border-slate-800">
                      <SelectItem value="padrao">Padrão / Cadeiras Fixas</SelectItem>
                      <SelectItem value="auditorio">Auditório (Cadeiras enfileiradas)</SelectItem>
                      <SelectItem value="banquete">Banquete (Módulos / Mesas)</SelectItem>
                      <SelectItem value="limpo">Espaço Vazio / Limpo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="p-4 border border-slate-850 bg-slate-950/40 rounded-xl space-y-1.5">
                <Label htmlFor="externalLocation" className="text-xs text-slate-400">Endereço / Local Externo</Label>
                <Input id="externalLocation" name="externalLocation" value={formData.externalLocation} onChange={handleChange} placeholder="Ex: Chácara Recanto Feliz, Rua Principal, 450" className="bg-slate-950 border-slate-800" />
              </div>
            )}
          </div>
        </section>

        {/* Section 5: Equipes de Serviço (Visual Selection) */}
        <section className="space-y-6 bg-slate-950/40 p-6 rounded-2xl border border-slate-800/80">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-850">
            <Users className="size-5 text-blue-400" />
            <h2 className="text-lg font-bold text-slate-100">Equipes de Serviço (Mão de Obra)</h2>
          </div>

          <div className="space-y-3">
            <Label className="text-slate-350 text-xs">Marque as equipes necessárias para dar suporte ao evento:</Label>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {serviceAreas.map(area => {
                const selected = formData.requiredServiceAreas.find(ra => ra.areaId === area.id);
                const isSelected = !!selected;

                return (
                  <div 
                    key={area.id} 
                    className={cn(
                      "p-3.5 rounded-xl border flex items-center justify-between transition-all select-none",
                      isSelected 
                        ? "bg-blue-950/20 border-blue-500/40 text-white" 
                        : "bg-slate-950/30 border-slate-850 text-slate-400 hover:border-slate-800"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Checkbox
                        id={`area-${area.id}`}
                        checked={isSelected}
                        onCheckedChange={(checked) => handleAreaChange(area.id, !!checked)}
                        className="border-slate-700 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                      />
                      <label htmlFor={`area-${area.id}`} className="flex items-center gap-2 text-xs font-semibold cursor-pointer truncate">
                        {getAreaIcon(area.name)}
                        <span className="truncate">{area.name}</span>
                      </label>
                    </div>

                    {isSelected && (
                      <div className="flex items-center gap-1.5 bg-slate-950/60 p-0.5 rounded-lg border border-slate-800">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5 rounded text-slate-400 hover:text-white"
                          onClick={() => handleQuantityChange(area.id, false)}
                        >
                          <Minus className="h-2.5 w-2.5" />
                        </Button>
                        <span className="text-[11px] font-black w-4 text-center text-slate-200">{selected.quantity}</span>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5 rounded text-slate-400 hover:text-white"
                          onClick={() => handleQuantityChange(area.id, true)}
                        >
                          <Plus className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Section 6: Alimentação e Limpeza */}
        <section className="space-y-6">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800/80">
            <Utensils className="size-5 text-blue-400" />
            <h2 className="text-lg font-bold text-slate-100">Alimentação & Limpeza</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-slate-350 text-xs font-bold uppercase tracking-wider block">O evento terá algum tipo de alimentação?</Label>
              <RadioGroup value={formData.hasFood} onValueChange={(v) => handleRadioChange('hasFood', v)} className="flex gap-6 mt-1">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sim" id="food_yes" className="text-blue-500" />
                  <Label htmlFor="food_yes" className="font-medium text-sm cursor-pointer">Sim</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="nao" id="food_no" className="text-blue-500" />
                  <Label htmlFor="food_no" className="font-medium text-sm cursor-pointer">Não</Label>
                </div>
              </RadioGroup>
            </div>

            {formData.hasFood === 'sim' && (
              <div className="p-4 border border-red-950/20 bg-red-950/10 rounded-xl space-y-3 animate-fadeIn">
                <div className="flex items-center gap-2 text-red-300 text-xs font-bold">
                  <AlertCircle className="size-4 shrink-0 text-red-400" />
                  Regra Administrativa: Obrigatório indicar um responsável pela conservação e limpeza.
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="kitchenResponsible" className="text-xs text-slate-300">Responsável pela Conservação & Limpeza</Label>
                  <Input 
                    required={formData.hasFood === 'sim'} 
                    id="kitchenResponsible" 
                    name="kitchenResponsible" 
                    value={formData.kitchenResponsible} 
                    onChange={handleChange} 
                    placeholder="Nome da pessoa responsável pela limpeza do espaço pós-evento..." 
                    className="bg-slate-950 border-slate-850 focus-visible:ring-red-500" 
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Section 7: Financeiro Simplificado */}
        <section className="space-y-6 bg-slate-950/40 p-6 rounded-2xl border border-slate-800/80">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-850">
            <DollarSign className="size-5 text-blue-400" />
            <h2 className="text-lg font-bold text-slate-100">Financeiro & Inscrições</h2>
          </div>

          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs uppercase tracking-wider font-bold">Cobrança de Ingressos</Label>
              <RadioGroup value={formData.isPaid} onValueChange={(v) => handleRadioChange('isPaid', v)} className="flex gap-6 mt-1">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="gratuito" id="pay_free" className="text-blue-500" />
                  <Label htmlFor="pay_free" className="font-medium text-sm cursor-pointer">Evento Gratuito (Membros)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pago" id="pay_paid" className="text-blue-500" />
                  <Label htmlFor="pay_paid" className="font-medium text-sm cursor-pointer">Evento Pago (Inscrição)</Label>
                </div>
              </RadioGroup>
            </div>

            {formData.isPaid === 'pago' && (
              <div className="space-y-6 p-4 border border-slate-800 bg-slate-950/40 rounded-xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="ticketPrice" className="text-xs text-slate-400">Preço da Inscrição (Preço por pessoa)</Label>
                    <Input 
                      required={formData.isPaid === 'pago'}
                      id="ticketPrice" 
                      name="ticketPrice" 
                      type="number"
                      value={formData.ticketPrice} 
                      onChange={handleChange} 
                      placeholder="Ex: 50.00"
                      className="bg-slate-950 border-slate-800 focus-visible:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Outras Formas de Captação */}
                <div className="space-y-3 pt-4 border-t border-slate-850">
                  <Label className="text-slate-300 text-xs font-bold uppercase tracking-wider block">Haverá outras formas de captação de recursos?</Label>
                  <RadioGroup 
                    value={formData.hasAlternativeFunding ? 'sim' : 'nao'} 
                    onValueChange={(v) => setFormData(p => ({ ...p, hasAlternativeFunding: v === 'sim' }))} 
                    className="flex gap-6 mt-1"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="sim" id="funding_yes" className="text-blue-500" />
                      <Label htmlFor="funding_yes" className="font-medium text-sm cursor-pointer text-slate-200">Sim</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="nao" id="funding_no" className="text-blue-500" />
                      <Label htmlFor="funding_no" className="font-medium text-sm cursor-pointer text-slate-200">Não</Label>
                    </div>
                  </RadioGroup>

                  {formData.hasAlternativeFunding && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-slate-800/60 bg-slate-950/60 rounded-xl animate-fadeIn">
                      <div className="space-y-1.5">
                        <Label htmlFor="alternativeFundingDetails" className="text-xs text-slate-400">Quais formas de captação?</Label>
                        <Textarea 
                          required={formData.hasAlternativeFunding}
                          id="alternativeFundingDetails"
                          name="alternativeFundingDetails"
                          value={formData.alternativeFundingDetails}
                          onChange={handleChange}
                          placeholder="Ex: Patrocínios locais, venda de camisetas, cantina voluntária..."
                          rows={2}
                          className="bg-slate-950 border-slate-800 text-xs focus-visible:ring-blue-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="alternativeFundingExpectedAmount" className="text-xs text-slate-400">Valor esperado para conseguir (R$)</Label>
                        <Input 
                          required={formData.hasAlternativeFunding}
                          id="alternativeFundingExpectedAmount"
                          name="alternativeFundingExpectedAmount"
                          type="number"
                          value={formData.alternativeFundingExpectedAmount}
                          onChange={handleChange}
                          placeholder="Ex: 1500.00"
                          className="bg-slate-950 border-slate-800 focus-visible:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Configuração de Formas de Pagamento */}
                <div className="space-y-4 pt-4 border-t border-slate-850">
                  <Label className="text-slate-350 text-xs font-bold uppercase tracking-wider block">Formas de Pagamento Aceitas</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl border border-slate-850 bg-slate-950/20 flex items-center space-x-2.5">
                      <Checkbox 
                        id="acceptPix" 
                        checked={formData.acceptPix} 
                        onCheckedChange={(c) => setFormData(p => ({ ...p, acceptPix: !!c }))}
                        className="border-slate-700 data-[state=checked]:bg-blue-500"
                      />
                      <label htmlFor="acceptPix" className="text-xs font-semibold cursor-pointer text-slate-200">PIX</label>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-850 bg-slate-950/20 flex items-center space-x-2.5">
                      <Checkbox 
                        id="acceptCash" 
                        checked={formData.acceptCash} 
                        onCheckedChange={(c) => setFormData(p => ({ ...p, acceptCash: !!c }))}
                        className="border-slate-700 data-[state=checked]:bg-blue-500"
                      />
                      <label htmlFor="acceptCash" className="text-xs font-semibold cursor-pointer text-slate-200">Dinheiro / À vista</label>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-850 bg-slate-950/20 flex items-center space-x-2.5">
                      <Checkbox 
                        id="acceptCard" 
                        checked={formData.acceptCard} 
                        onCheckedChange={(c) => setFormData(p => ({ ...p, acceptCard: !!c }))}
                        className="border-slate-700 data-[state=checked]:bg-blue-500"
                      />
                      <label htmlFor="acceptCard" className="text-xs font-semibold cursor-pointer text-slate-200">Cartão de Crédito</label>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-850 bg-slate-950/20 flex items-center space-x-2.5">
                      <Checkbox 
                        id="acceptInstallments" 
                        checked={formData.acceptInstallments} 
                        onCheckedChange={(c) => setFormData(p => ({ ...p, acceptInstallments: !!c }))}
                        className="border-slate-700 data-[state=checked]:bg-blue-500"
                      />
                      <label htmlFor="acceptInstallments" className="text-xs font-semibold cursor-pointer text-slate-200">Parcelado</label>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-850 bg-slate-950/20 flex items-center space-x-2.5">
                      <Checkbox 
                        id="acceptRecurring" 
                        checked={formData.acceptRecurring} 
                        onCheckedChange={(c) => setFormData(p => ({ ...p, acceptRecurring: !!c }))}
                        className="border-slate-700 data-[state=checked]:bg-blue-500"
                      />
                      <label htmlFor="acceptRecurring" className="text-xs font-semibold cursor-pointer text-slate-200">Recorrência (Mensalidade)</label>
                    </div>
                  </div>

                  {/* Parcelamento extra fields */}
                  {formData.acceptInstallments && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-slate-800 bg-slate-950/60 rounded-xl animate-fadeIn">
                      <div className="space-y-1.5">
                        <Label htmlFor="maxInstallments" className="text-xs text-slate-400">Número Máximo de Vezes</Label>
                        <Select 
                          value={formData.maxInstallments} 
                          onValueChange={(v) => setFormData(p => ({ ...p, maxInstallments: v }))}
                        >
                          <SelectTrigger id="maxInstallments" className="bg-slate-950 border-slate-800">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-800 text-white">
                            {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                              <SelectItem key={n} value={n.toString()}>{n}x</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-400 block mb-1">Tipo de Juros</Label>
                        <RadioGroup 
                          value={formData.installmentsInterestType} 
                          onValueChange={(v: any) => setFormData(p => ({ ...p, installmentsInterestType: v }))} 
                          className="flex gap-6 mt-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="sem_juros" id="int_free" className="text-blue-500" />
                            <Label htmlFor="int_free" className="font-medium text-xs cursor-pointer text-slate-200">Sem Juros</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="com_juros" id="int_charged" className="text-blue-500" />
                            <Label htmlFor="int_charged" className="font-medium text-xs cursor-pointer text-slate-200">Com Juros</Label>
                          </div>
                        </RadioGroup>
                      </div>
                    </div>
                  )}

                  {/* Recorrência extra fields */}
                  {formData.acceptRecurring && (
                    <div className="p-4 border border-slate-800 bg-slate-950/60 rounded-xl animate-fadeIn space-y-2">
                      <Label htmlFor="recurringLimitMonth" className="text-xs text-slate-400">Até qual mês cobrar (Limite)?</Label>
                      <Input 
                        id="recurringLimitMonth" 
                        name="recurringLimitMonth"
                        type="month"
                        value={formData.recurringLimitMonth}
                        onChange={handleChange}
                        className="bg-slate-950 border-slate-800 max-w-xs focus-visible:ring-blue-500"
                      />
                      <p className="text-[10px] text-slate-500">
                        A recorrência expirará e deixará de cobrar automaticamente no mês indicado.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Section 8: Divulgação & Portaria */}
        <section className="space-y-6">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800/80">
            <Shield className="size-5 text-blue-400" />
            <h2 className="text-lg font-bold text-slate-100">Divulgação & Portaria (Inscrições)</h2>
          </div>

          <div className="space-y-5">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isPublicForRegistration"
                checked={formData.isPublicForRegistration}
                onCheckedChange={(checked) => setFormData(p => ({ ...p, isPublicForRegistration: !!checked }))}
                className="border-slate-700 data-[state=checked]:bg-blue-500"
              />
              <Label htmlFor="isPublicForRegistration" className="font-bold cursor-pointer text-slate-200">Divulgar na página pública para inscrições</Label>
            </div>

            {formData.isPublicForRegistration && (
              <div className="bg-slate-950/40 p-5 rounded-2xl border border-slate-800 space-y-5">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Info className="size-3.5 text-blue-400" /> Regras de Portaria (Pré-requisitos)
                </h4>
                
                <div className="space-y-3 text-sm">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="requiresBaptism"
                      checked={formData.requiresBaptism}
                      onCheckedChange={(checked) => setFormData(p => ({ ...p, requiresBaptism: !!checked }))}
                    />
                    <Label htmlFor="requiresBaptism" className="font-normal cursor-pointer text-slate-300">Exigir que o participante seja batizado nas águas</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="requiresActiveService"
                      checked={formData.requiresActiveService}
                      onCheckedChange={(checked) => setFormData(p => ({ ...p, requiresActiveService: !!checked }))}
                    />
                    <Label htmlFor="requiresActiveService" className="font-normal cursor-pointer text-slate-300">Exigir que o participante atue em alguma equipe de voluntários (Serviço Ativo)</Label>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <Label htmlFor="requiredCourseId" className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Exigir conclusão de curso na Escola Lumine</Label>
                    <Select
                      value={formData.requiredCourseId || 'none'}
                      onValueChange={(val) => setFormData(p => ({ ...p, requiredCourseId: val === 'none' ? '' : val }))}
                    >
                      <SelectTrigger id="requiredCourseId" className="bg-slate-950 border-slate-800">
                        <SelectValue placeholder="Selecione um curso (opcional)" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-white">
                        <SelectItem value="none">Nenhum curso (Livre)</SelectItem>
                        {(courses || []).map(course => (
                          <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Custom Page Type */}
                <div className="space-y-3 pt-4 border-t border-slate-850">
                  <Label className="text-xs text-slate-405 font-bold uppercase tracking-wider block">Tipo de Página de Inscrição</Label>
                  <div className="flex flex-col sm:flex-row gap-4 mt-2">
                    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer text-slate-200">
                      <input
                        type="radio"
                        name="registrationPageType"
                        value="system"
                        checked={formData.registrationPageType !== 'custom_html'}
                        onChange={() => setFormData(p => ({ ...p, registrationPageType: 'system' }))}
                        className="text-blue-500 focus:ring-blue-500"
                      />
                      Sistema Oiko Padrão (PIX checkout)
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer text-slate-200">
                      <input
                        type="radio"
                        name="registrationPageType"
                        value="custom_html"
                        checked={formData.registrationPageType === 'custom_html'}
                        onChange={() => setFormData(p => ({ ...p, registrationPageType: 'custom_html' }))}
                        className="text-blue-500 focus:ring-blue-500"
                      />
                      Página Própria / HTML Customizado (embed iframe etc)
                    </label>
                  </div>

                  {formData.registrationPageType === 'custom_html' && (
                    <div className="space-y-2 pt-2 animate-fadeIn">
                      <Label htmlFor="customHtmlCode" className="text-[10px] text-slate-450 uppercase font-black">Código HTML Customizado</Label>
                      <Textarea
                        id="customHtmlCode"
                        placeholder="Cole aqui o formulário Google Forms (iframe), Typeform, Sympla ou código próprio..."
                        value={formData.customHtmlCode || ''}
                        onChange={(e) => setFormData(p => ({ ...p, customHtmlCode: e.target.value }))}
                        className="font-mono text-xs min-h-[150px] bg-slate-950 border-slate-800 text-white placeholder-slate-700"
                      />
                      <p className="text-[10px] text-slate-500">
                        O código inserido acima será incorporado diretamente no modal quando um membro se inscrever na página pública.
                      </p>
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        </section>

        {/* Submit actions */}
        <div className="pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row gap-3">
          <Button 
            type="submit" 
            disabled={loading} 
            className="w-full sm:w-auto sm:min-w-[200px] bg-blue-600 hover:bg-blue-500 text-white font-bold h-11 text-sm shadow-lg shadow-blue-900/20"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {existingEvent ? 'Salvar Alterações' : 'Protocolar Evento'}
          </Button>
          
          {existingEvent && (
            <Button 
              type="button" 
              onClick={handleGeneratePdf} 
              variant="outline"
              className="border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white h-11 text-xs font-bold gap-2"
            >
              <Download className="size-4" /> Download PDF
            </Button>
          )}
        </div>

      </form>
    </div>
  );
}
