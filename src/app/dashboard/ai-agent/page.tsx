
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, MessageSquare, Wrench, BrainCircuit } from 'lucide-react';
import { ChatInterface } from '@/components/ai/chat-interface';
import { UnderConstruction } from '@/components/common/under-construction';

export default function AiAgentPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="size-6 text-primary" />
          Agente de IA para Líderes
        </CardTitle>
        <CardDescription>
          Seu assistente pessoal para o ministério. Peça sugestões, gere relatórios e receba lembretes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="chat">
              <MessageSquare className="mr-2 size-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="prompts">
              <Wrench className="mr-2 size-4" />
              Configurações
            </TabsTrigger>
            <TabsTrigger value="knowledge">
              <BrainCircuit className="mr-2 size-4" />
              Base de Conhecimento
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="chat" className="mt-6">
            <ChatInterface />
          </TabsContent>

          <TabsContent value="prompts" className="mt-6">
            <UnderConstruction 
              pageTitle="Configuração de Prompts"
              pageDescription="Personalize as instruções e a personalidade do seu Agente de IA para melhor se adequar à cultura da sua igreja."
            />
          </TabsContent>

          <TabsContent value="knowledge" className="mt-6">
             <UnderConstruction 
              pageTitle="Base de Conhecimento"
              pageDescription="Alimente a IA com documentos, manuais e planilhas para que ela tenha mais contexto sobre seu ministério."
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
