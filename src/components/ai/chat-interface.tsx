
'use client';

import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, User, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'ai';
};

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Olá! Sou seu agente de IA. Como posso ajudar no seu ministério hoje? Você pode me pedir para: Gerar um roteiro para a reunião da célula, criar uma mensagem de acompanhamento para um visitante, ou me perguntar sobre um membro específico.',
      sender: 'ai',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: `Esta é uma resposta simulada para: "${input}". A lógica de IA ainda será implementada.`,
        sender: 'ai',
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-[65vh] border rounded-lg">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex items-start gap-3',
                message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
              )}
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {message.sender === 'user' ? <User /> : <Bot />}
                </AvatarFallback>
              </Avatar>
              <div
                className={cn(
                  'max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-lg',
                  message.sender === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}
              >
                <p className="text-sm">{message.text}</p>
              </div>
            </div>
          ))}
           {isLoading && (
              <div className="flex items-start gap-3 flex-row">
                 <Avatar className="h-8 w-8">
                    <AvatarFallback><Bot /></AvatarFallback>
                </Avatar>
                 <div className="bg-muted p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="h-2 w-2 bg-primary rounded-full animate-pulse delay-0"></span>
                        <span className="h-2 w-2 bg-primary rounded-full animate-pulse delay-150"></span>
                        <span className="h-2 w-2 bg-primary rounded-full animate-pulse delay-300"></span>
                    </div>
                 </div>
              </div>
            )}
        </div>
      </ScrollArea>
      <div className="p-4 border-t">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite sua mensagem..."
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
