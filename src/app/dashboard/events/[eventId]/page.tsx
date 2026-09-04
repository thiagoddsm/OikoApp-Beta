'use client';

import { EventPlanningForm } from '@/components/events/planning-form';
import { GuestBriefingGenerator } from '@/components/events/guest-briefing';
import { PostEventFeedback } from '@/components/events/post-event-feedback';
import { EventRegistrationsTab } from '@/components/events/event-registrations-tab';
import { VolunteeringProvider } from '@/contexts/volunteering-context';
import { useParams } from 'next/navigation';
import { useDoc } from '@/firebase';
import { Loader2, FileText, UserCheck, MessageSquare, Users, Share2, ExternalLink, Link as LinkIcon, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { slugify } from '@/lib/slug-utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PlanningEvent } from '@/components/events/planning-form';

// Define the type for the event data, matching the Firestore structure
type StrategicEvent = {
  id: string;
  eventName: string;
  isPaid?: string;
  ticketPrice?: number;
  [key: string]: any; 
};

export default function EventDetailPage() {
    const params = useParams();
    const eventId = params.eventId as string;

    const { data: eventData, isLoading } = useDoc<StrategicEvent>(eventId ? `strategic_events/${eventId}` : null);
    
    if (isLoading) {
        return (
            <div className="flex h-64 w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!eventData) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Evento não encontrado</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>O evento que você está tentando visualizar não foi encontrado ou foi removido.</p>
                </CardContent>
            </Card>
        )
    }
    
    const { toast } = useToast();
    const planningEvent = eventData as unknown as PlanningEvent;
    const targetSlug = eventData.slug || slugify(eventData.eventName || '') || eventId;

    return (
        <VolunteeringProvider>
          {eventData.isPublicForRegistration && (
            <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-slate-50 border border-blue-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0">
                  <LinkIcon className="size-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">Inscrições Públicas Ativas</span>
                    <Badge variant="outline" className="text-[10px] bg-blue-100 text-blue-700 border-blue-200">
                      /inscricao/{targetSlug}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500">Divulgue este link direto no WhatsApp, redes sociais e folhetos.</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const fullUrl = `${window.location.origin}/inscricao/${targetSlug}`;
                    navigator.clipboard.writeText(fullUrl);
                    toast({ title: 'Link Copiado!', description: fullUrl });
                  }}
                  className="text-xs font-bold gap-1.5 h-8 bg-white border-slate-200 hover:bg-slate-50"
                >
                  <Share2 className="size-3.5 text-blue-600" /> Copiar Link
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    const fullUrl = `${window.location.origin}/inscricao/${targetSlug}`;
                    const msg = encodeURIComponent(`Olá! Faça sua inscrição para *${eventData.eventName}* pelo link oficial:\n\n👉 ${fullUrl}`);
                    window.open(`https://wa.me/?text=${msg}`, '_blank');
                  }}
                  className="text-xs font-bold gap-1.5 h-8 bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  <MessageCircle className="size-3.5" /> WhatsApp
                </Button>
                <a href={`/inscricao/${targetSlug}`} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="ghost" className="text-xs font-bold text-slate-600 h-8">
                    <ExternalLink className="size-3.5 mr-1" /> Ver Página
                  </Button>
                </a>
              </div>
            </div>
          )}

          <Tabs defaultValue="planning" className="w-full">
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
                    <TabsTrigger value="planning">
                        <FileText className="mr-2 size-4" />
                        Planejamento Estratégico
                    </TabsTrigger>
                    <TabsTrigger value="registrations">
                        <Users className="mr-2 size-4" />
                        Inscrições
                    </TabsTrigger>
                    <TabsTrigger value="guest_briefing">
                        <UserCheck className="mr-2 size-4" />
                        Briefing Convidado
                    </TabsTrigger>
                    <TabsTrigger value="post_event">
                        <MessageSquare className="mr-2 size-4" />
                        Pós-Evento
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="planning" className="mt-6">
                     <EventPlanningForm existingEvent={planningEvent} />
                </TabsContent>
                <TabsContent value="registrations" className="mt-6">
                     <EventRegistrationsTab 
                        eventId={eventId} 
                        eventPrice={eventData.ticketPrice}
                        isPaid={eventData.isPaid === 'pago'}
                     />
                </TabsContent>
                <TabsContent value="guest_briefing" className="mt-6">
                     <GuestBriefingGenerator event={eventData} />
                </TabsContent>
                <TabsContent value="post_event" className="mt-6">
                     <PostEventFeedback event={eventData} />
                </TabsContent>
            </Tabs>
        </VolunteeringProvider>
    );
}
