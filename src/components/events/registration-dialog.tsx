'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, doc, setDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { useVolunteering } from '@/contexts/volunteering-context';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, AlertTriangle, QrCode, Copy, Check, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useMembersData, useCoursesData } from "@/hooks/useDomainData";

interface RegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: {
    id: string;
    eventName: string;
    isPaid?: string;
    ticketPrice?: number;
    requiresBaptism?: boolean;
    requiresActiveService?: boolean;
    requiredCourseId?: string;
    registrationPageType?: 'system' | 'custom_html';
    customHtmlCode?: string;
  };
}

export function RegistrationDialog({ open, onOpenChange, event }: RegistrationDialogProps) {
  const { firestore, user } = useFirebase();
    const { users } = useMembersData();
    const { courses, classes, enrollmentRequests, pedagogicalLogs, theoflixCourses } = useCoursesData();

  const { toast } = useToast();

  const [companionName, setCompanionName] = useState('');
  const [step, setStep] = useState<'details' | 'payment' | 'success'>('details');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [registrationId, setRegistrationId] = useState('');

  // 1. Get logged-in user profile from our list
  const memberData = useMemo(() => {
    if (!user || !users) return null;
    return users.find(u => u.id === user.uid) || null;
  }, [user, users]);

  // 2. Technical course progress check
  const isCourseCompleted = useMemo(() => {
    if (!event.requiredCourseId || !user) return false;
    const memberId = user.uid;

    // Check if approved in journey
    if (memberData?.journey?.courseStatus?.[event.requiredCourseId] === 'approved') {
      return true;
    }

    // Otherwise calculate class attendance
    const courseClasses = classes.filter(c => c.courseId === event.requiredCourseId);
    if (courseClasses.length === 0) return false;

    const allAttendanceDates = new Set<string>();
    const studentAttendedDates = new Set<string>();

    courseClasses.forEach(cls => {
      cls.attendance?.forEach(att => {
        allAttendanceDates.add(`${cls.id}-${att.date}`);
        const isPresent = att.presentStudentIds?.includes(memberId) || att.onlineStudentIds?.includes(memberId);
        if (isPresent) {
          studentAttendedDates.add(`${cls.id}-${att.date}`);
        }
      });
    });

    const totalCount = allAttendanceDates.size || courseClasses.length;
    const attendedCount = studentAttendedDates.size;

    return totalCount > 0 && attendedCount >= totalCount;
  }, [classes, event.requiredCourseId, user, memberData]);

  // 3. Evaluate Gates
  const gateValidation = useMemo(() => {
    const validations = {
      baptism: { ok: true, required: !!event.requiresBaptism },
      activeService: { ok: true, required: !!event.requiresActiveService },
      course: { ok: true, required: !!event.requiredCourseId, name: '' }
    };

    if (!user) {
      return { ok: false, validations, message: 'Você precisa estar logado para se inscrever.' };
    }

    if (event.requiresBaptism) {
      const isBaptized = memberData?.batizado === 'sim' || !!memberData?.dataBatismo || !!(memberData as any)?.churchData?.baptismDate;
      validations.baptism.ok = isBaptized;
    }

    if (event.requiresActiveService) {
      const isServing = memberData?.serviceStatus === 'serving' || !!memberData?.serviceAreaId;
      validations.activeService.ok = isServing;
    }

    if (event.requiredCourseId) {
      const courseObj = courses.find(c => c.id === event.requiredCourseId);
      validations.course.name = courseObj?.name || 'Curso Lumine';
      validations.course.ok = isCourseCompleted;
    }

    const failed = Object.values(validations).filter(v => v.required && !v.ok);
    const ok = failed.length === 0;

    return {
      ok,
      validations,
      message: ok ? 'Todos os critérios atendidos' : 'Você não atende aos pré-requisitos para este evento.'
    };
  }, [event, user, memberData, courses, isCourseCompleted]);

  // Reset steps on open
  useEffect(() => {
    if (open) {
      setStep('details');
      setCompanionName('');
      setCopied(false);
      setRegistrationId('');
    }
  }, [open]);

  const pixKey = "pix.ibmcamp.com.br";
  const pixCode = useMemo(() => {
    const priceStr = (event.ticketPrice || 0).toFixed(2);
    return `00020101021226830014br.gov.bcb.pix2561${pixKey}/oiko/event/${event.id}520400005303986540${priceStr.length}${priceStr}5802BR5915Igreja Batista6009Sao Paulo62070503ibm6304abcd`;
  }, [event]);

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixCode);
    setCopied(true);
    toast({
      title: "Chave Copiada",
      description: "Código Pix Copia e Cola copiado para a área de transferência.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegisterDetails = async () => {
    if (!user || !firestore) return;
    if (!gateValidation.ok) {
      toast({
        variant: "destructive",
        title: "Requisitos Pendentes",
        description: "Você não cumpre os pré-requisitos necessários para este evento.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const isPaid = event.isPaid === 'pago';
      const initialPaymentStatus = isPaid ? 'pending' : 'approved';

      const regData = {
        eventId: event.id,
        userId: user.uid,
        userMetadata: {
          name: memberData?.name || user.displayName || 'Membro IBM',
          email: memberData?.email || user.email || '',
          phone: memberData?.phone || '',
          gcId: memberData?.gcId || ''
        },
        payment: {
          status: initialPaymentStatus,
          method: isPaid ? 'pix' : 'free',
          valuePaid: isPaid ? (event.ticketPrice || 0) : 0,
          paidAt: isPaid ? null : Timestamp.now(),
          transactionId: isPaid ? `pix_${Math.random().toString(36).substring(2, 11)}` : 'free'
        },
        attendance: {
          checkedIn: false,
          checkedInAt: null,
          checkedInBy: null
        },
        companionName: companionName.trim(),
        createdAt: Timestamp.now()
      };

      const docRef = await addDoc(collection(firestore, 'event_registrations'), regData);
      setRegistrationId(docRef.id);

      if (isPaid) {
        setStep('payment');
      } else {
        setStep('success');
      }
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Erro ao se inscrever",
        description: "Ocorreu um erro ao processar sua inscrição. Tente novamente.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSimulatePayment = async () => {
    if (!registrationId || !firestore) return;
    setIsSubmitting(true);
    try {
      const regDocRef = doc(firestore, 'event_registrations', registrationId);
      await setDoc(regDocRef, {
        payment: {
          status: 'approved',
          paidAt: Timestamp.now()
        }
      }, { merge: true });

      setStep('success');
      toast({
        title: "Pagamento Confirmado",
        description: "Sua inscrição foi confirmada com sucesso via PIX!",
      });
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Erro na simulação",
        description: "Não foi possível confirmar o pagamento simulado.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("bg-slate-900 border-slate-800 text-white", event.registrationPageType === 'custom_html' && gateValidation.ok ? "sm:max-w-3xl" : "sm:max-w-md")}>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Inscrição: {event.eventName}
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs">
            {event.registrationPageType === 'custom_html' && gateValidation.ok
              ? "Preencha a ficha de inscrição abaixo para completar sua participação."
              : (step === 'details' && "Verifique os pré-requisitos e preencha os dados para inscrição.")}
            {event.registrationPageType !== 'custom_html' && step === 'payment' && "Realize o pagamento via PIX para confirmar sua vaga."}
            {event.registrationPageType !== 'custom_html' && step === 'success' && "Parabéns! Sua inscrição está confirmada."}
          </DialogDescription>
        </DialogHeader>

        {gateValidation.ok && event.registrationPageType === 'custom_html' ? (
          <div className="py-2">
            <div 
              className="w-full overflow-auto max-h-[70vh] rounded-lg border border-slate-800 bg-white text-black p-2 min-h-[450px]"
              dangerouslySetInnerHTML={{ __html: event.customHtmlCode || '' }} 
            />
          </div>
        ) : (
          <>
            {step === 'details' && (
          <div className="space-y-4 py-3">
            {/* Gates Check Panel */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Info className="size-3.5 text-blue-400" /> Pré-requisitos de Acesso
              </h4>

              <div className="space-y-2">
                {event.requiresBaptism && (
                  <div className={cn(
                    "flex items-center justify-between p-2 rounded-lg text-xs border",
                    gateValidation.validations.baptism.ok 
                      ? "bg-emerald-950/20 border-emerald-800/40 text-emerald-300" 
                      : "bg-red-950/20 border-red-800/40 text-red-300"
                  )}>
                    <span>💧 Batismo nas Águas</span>
                    <Badge className={gateValidation.validations.baptism.ok ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}>
                      {gateValidation.validations.baptism.ok ? "Atendido" : "Pendente"}
                    </Badge>
                  </div>
                )}

                {event.requiresActiveService && (
                  <div className={cn(
                    "flex items-center justify-between p-2 rounded-lg text-xs border",
                    gateValidation.validations.activeService.ok 
                      ? "bg-emerald-950/20 border-emerald-800/40 text-emerald-300" 
                      : "bg-red-950/20 border-red-800/40 text-red-300"
                  )}>
                    <span>🛠️ Voluntariado (Serviço Ativo)</span>
                    <Badge className={gateValidation.validations.activeService.ok ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}>
                      {gateValidation.validations.activeService.ok ? "Atendido" : "Pendente"}
                    </Badge>
                  </div>
                )}

                {event.requiredCourseId && (
                  <div className={cn(
                    "flex items-center justify-between p-2 rounded-lg text-xs border",
                    gateValidation.validations.course.ok 
                      ? "bg-emerald-950/20 border-emerald-800/40 text-emerald-300" 
                      : "bg-red-950/20 border-red-800/40 text-red-300"
                  )}>
                    <span className="truncate">🎓 {gateValidation.validations.course.name}</span>
                    <Badge className={gateValidation.validations.course.ok ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}>
                      {gateValidation.validations.course.ok ? "Concluído" : "Exigido"}
                    </Badge>
                  </div>
                )}

                {!event.requiresBaptism && !event.requiresActiveService && !event.requiredCourseId && (
                  <p className="text-xs text-slate-400 italic">Inscrição livre sem restrições de ministério.</p>
                )}
              </div>
            </div>

            {gateValidation.ok ? (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="companionName" className="text-xs text-slate-400">Nome do Acompanhante (Opcional)</Label>
                  <Input
                    id="companionName"
                    value={companionName}
                    onChange={(e) => setCompanionName(e.target.value)}
                    placeholder="Se for levar cônjuge ou convidado..."
                    className="bg-slate-950 border-slate-800 text-white placeholder-slate-600 focus-visible:ring-blue-500"
                  />
                </div>

                <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800 flex justify-between items-center">
                  <span className="text-xs text-slate-400">Valor da Inscrição:</span>
                  <span className="font-bold text-sm text-amber-400">
                    {event.isPaid === 'pago' ? `R$ ${event.ticketPrice?.toFixed(2)}` : 'Gratuito'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-red-950/20 border border-red-900/30 text-red-300 rounded-lg flex gap-2 items-start text-xs">
                <AlertTriangle className="size-4 shrink-0 text-red-400 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Acesso Restrito</p>
                  <p className="leading-relaxed">
                    Você não atende aos pré-requisitos oficiais exigidos para este evento. Caso ache que é um erro, entre em contato com a governança da igreja.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'payment' && (
          <div className="space-y-4 py-3 text-center flex flex-col items-center">
            <div className="bg-white p-3 rounded-xl inline-flex items-center justify-center">
              {/* Styled Mock QR Code using CSS grid */}
              <div className="size-40 bg-slate-100 flex items-center justify-center border border-slate-200 rounded relative group">
                <QrCode className="size-36 text-slate-900" />
                <div className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold p-4">
                  Escaneie no App do seu Banco
                </div>
              </div>
            </div>

            <div className="w-full text-left space-y-2">
              <Label className="text-xs text-slate-400">Código Copia e Cola</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={pixCode}
                  className="bg-slate-950 border-slate-800 text-white text-xs select-all focus-visible:ring-transparent h-9"
                />
                <Button size="icon" onClick={handleCopyPix} className="bg-slate-800 hover:bg-slate-700 shrink-0 h-9 w-9">
                  {copied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4 text-slate-300" />}
                </Button>
              </div>
            </div>

            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 w-full flex items-center justify-between text-xs">
              <div className="text-left">
                <p className="text-slate-400">Valor Total</p>
                <p className="font-black text-amber-400 text-base mt-0.5">R$ {event.ticketPrice?.toFixed(2)}</p>
              </div>
              <Badge className="bg-blue-950 text-blue-300 border-blue-800 text-[10px]">
                Aguardando Pix...
              </Badge>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="space-y-6 py-6 text-center flex flex-col items-center justify-center">
            <div className="size-16 rounded-full bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center text-emerald-400 animate-bounce">
              <CheckCircle2 className="size-10" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-white">Inscrição Confirmada!</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                Tudo pronto! Sua vaga para o evento <span className="font-bold text-slate-200">"{event.eventName}"</span> está garantida. Um comprovante digital foi gerado na governança.
              </p>
            </div>

            <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/80 w-full max-w-sm text-xs text-left space-y-2.5">
              <div className="flex justify-between">
                <span className="text-slate-400">ID da Inscrição:</span>
                <span className="font-mono text-slate-200 font-bold">{registrationId.substring(0, 10)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status do Pagamento:</span>
                <span className="font-bold text-emerald-400">Confirmado (Aprovado)</span>
              </div>
              {companionName && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Acompanhante:</span>
                  <span className="font-bold text-slate-300">{companionName}</span>
                </div>
              )}
          </div>
        </div>
      )}
    </>
  )}

        <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-2">
          {event.registrationPageType === 'custom_html' && gateValidation.ok ? (
            <DialogClose asChild>
              <Button variant="outline" className="border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white w-full">
                Fechar
              </Button>
            </DialogClose>
          ) : (
            <>
              {step === 'details' && (
                <>
                  <DialogClose asChild>
                    <Button variant="outline" className="border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white w-full sm:w-auto">
                      Cancelar
                    </Button>
                  </DialogClose>
                  {gateValidation.ok && (
                    <Button 
                      onClick={handleRegisterDetails} 
                      disabled={isSubmitting}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-bold w-full sm:w-auto shadow-lg shadow-blue-900/20"
                    >
                      {isSubmitting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                      {event.isPaid === 'pago' ? 'Ir para Pagamento' : 'Confirmar Inscrição'}
                    </Button>
                  )}
                </>
              )}

              {step === 'payment' && (
                <>
                  <Button 
                    variant="outline" 
                    onClick={() => setStep('details')}
                    className="border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white w-full sm:w-auto"
                  >
                    Voltar
                  </Button>
                  <Button 
                    onClick={handleSimulatePayment} 
                    disabled={isSubmitting}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold w-full sm:w-auto shadow-lg shadow-emerald-900/20"
                  >
                    {isSubmitting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                    Confirmar Pagamento (Simular)
                  </Button>
                </>
              )}

              {step === 'success' && (
                <Button 
                  onClick={() => onOpenChange(false)}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold w-full"
                >
                  Concluir
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
