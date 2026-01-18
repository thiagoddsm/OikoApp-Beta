'use client';

import React, { useState, useEffect } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, User, Bot, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAIAnalysis, type AIState } from '@/app/dashboard/people/[userId]/actions';
import { useToast } from '@/hooks/use-toast';

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'ai';
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="icon" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
    </Button>
  );
}


export function AIProfileAnalysis({ userProfile }) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: `Olá! Sou seu assistente de IA. O que você gostaria de saber sobre o perfil de ${userProfile.name}?`,
      sender: 'ai',
    },
  ]);
  const [input, setInput] = useState('');

  const initialState: AIState = { message: null, analysis: null, error: null };
  const [state, formAction] = useActionState(getAIAnalysis, initialState);
  
  const handleFormSubmit = (formData: FormData) => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
    };
    setMessages(prev => [...prev, userMessage]);
    
    // Call the server action
    formAction(formData);

    setInput(''); // Clear input after sending
  };
  
   useEffect(() => {
    if (state.analysis) {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: state.analysis,
        sender: 'ai',
      };
      setMessages(prev => [...prev, aiResponse]);
    } else if (state.error) {
      toast({
        variant: 'destructive',
        title: 'Erro na Análise',
        description: state.error,
      });
    }
  }, [state]);


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
                <p className="text-sm whitespace-pre-wrap">{message.text}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="p-4 border-t">
        <form action={handleFormSubmit} className="flex items-center gap-2">
          <Input
            name="question"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte sobre este perfil..."
          />
           <input type="hidden" name="userId" value={userProfile.id} />
          <SubmitButton />
        </form>
      </div>
    </div>
  );
}
