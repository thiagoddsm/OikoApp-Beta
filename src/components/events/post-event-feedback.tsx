'use client';

import React, { useState, useEffect } from 'react';
import { useFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  HeartHandshake, 
  Trophy, 
  AlertTriangle, 
  DollarSign, 
  MessageSquare, 
  Save, 
  Loader2,
  CalendarCheck
} from 'lucide-react';

interface PostEventFeedbackProps {
  event: any;
}

export function PostEventFeedback({ event }: PostEventFeedbackProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    actualAttendance: '',
    actualConversions: '',
    highlights: '',
    challenges: '',
    financialSummary: '',
    generalNotes: '',
  });

  useEffect(() => {
    if (event?.postEventFeedback) {
      const fb = event.postEventFeedback;
      setFormData({
        actualAttendance: fb.actualAttendance?.toString() || '',
        actualConversions: fb.actualConversions?.toString() || '',
        highlights: fb.highlights || '',
        challenges: fb.challenges || '',
        financialSummary: fb.financialSummary || '',
        generalNotes: fb.generalNotes || '',
      });
    }
  }, [event]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !event?.id) return;

    setIsSaving(true);
    const eventRef = doc(firestore, 'strategic_events', event.id);

    const feedbackData = {
      actualAttendance: parseInt(formData.actualAttendance) || 0,
      actualConversions: parseInt(formData.actualConversions) || 0,
      highlights: formData.highlights,
      challenges: formData.challenges,
      financialSummary: formData.financialSummary,
      generalNotes: formData.generalNotes,
      submittedAt: Timestamp.now(),
    };

    try {
      await updateDocumentNonBlocking(eventRef, {
        postEventFeedback: feedbackData
      });
      toast({
        title: "Feedback Registrado!",
        description: "As observações de pós-evento foram salvas com sucesso.",
      });
    } catch (error) {
      console.error("Error saving post-event feedback:", error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: "Não foi possível registrar o feedback agora.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isEventPast = event?.date ? new Date(event.date + 'T23:59:59') < new Date() : false;

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {!isEventPast && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-start gap-3 mb-4">
          <CalendarCheck className="size-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 font-medium leading-relaxed">
            Este evento ainda não aconteceu. Você pode preencher este formulário antecipadamente ou aguardar a conclusão para registrar os dados reais.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="size-5 text-primary" />
              Indicadores Reais
            </CardTitle>
            <CardDescription>Quantitativos observados no dia.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="actualAttendance">Público Total (Real)</Label>
              <Input 
                id="actualAttendance" 
                name="actualAttendance" 
                type="number" 
                value={formData.actualAttendance} 
                onChange={handleInputChange} 
                placeholder="Ex: 157"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="actualConversions">Decisões / Conversões</Label>
              <Input 
                id="actualConversions" 
                name="actualConversions" 
                type="number" 
                value={formData.actualConversions} 
                onChange={handleInputChange} 
                placeholder="Ex: 12"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="size-5 text-emerald-600" />
              Fechamento Financeiro
            </CardTitle>
            <CardDescription>Resumo de entradas e saídas finais.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="financialSummary">Resumo Financeiro</Label>
              <Textarea 
                id="financialSummary" 
                name="financialSummary" 
                rows={4}
                value={formData.financialSummary} 
                onChange={handleInputChange} 
                placeholder="Ex: O evento gerou R$ 2.000 de lucro. Custos de buffet foram menores que o planejado..."
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="size-5 text-primary" />
            Análise Qualitativa (Feedback)
          </CardTitle>
          <CardDescription>Relatório de lições aprendidas e experiências.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="highlights" className="text-emerald-700 flex items-center gap-2">
                <Trophy className="size-4" /> Pontos Fortes (Destaques)
              </Label>
              <Textarea 
                id="highlights" 
                name="highlights" 
                rows={5}
                value={formData.highlights} 
                onChange={handleInputChange} 
                placeholder="O que funcionou muito bem? O que devemos repetir?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="challenges" className="text-red-700 flex items-center gap-2">
                <AlertTriangle className="size-4" /> Desafios (O que melhorar)
              </Label>
              <Textarea 
                id="challenges" 
                name="challenges" 
                rows={5}
                value={formData.challenges} 
                onChange={handleInputChange} 
                placeholder="Quais foram os problemas enfrentados? O que faríamos diferente?"
              />
            </div>
          </div>
          <div className="space-y-2 pt-4 border-t">
            <Label htmlFor="generalNotes">Notas Finais e Sugestões</Label>
            <Textarea 
              id="generalNotes" 
              name="generalNotes" 
              rows={3}
              value={formData.generalNotes} 
              onChange={handleInputChange} 
              placeholder="Outras observações relevantes da equipe ou participantes..."
            />
          </div>
        </CardContent>
        <CardFooter className="bg-muted/30 border-t py-4 flex justify-end">
          <Button type="submit" disabled={isSaving} className="font-bold">
            {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
            Salvar Feedback Pós-Evento
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}