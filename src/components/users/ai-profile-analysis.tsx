'use client';

import React, { useState, useEffect, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, User, Bot, Loader2, Sparkles } from 'lucide-react';
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
    <Button type="submit" size="icon" disabled={pending} className="h-10 w-10 shadow-lg">
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
    </Button>
  );
}

export function AIProfileAnalysis({ userProfile }: { userProfile: any }) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: `Olá! Sou seu assistente de inteligência ministerial. Como posso ajudar você a entender melhor o perfil e a jornada de ${userProfile.name}?`,
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
    
    // Dispara a action no servidor (Genkit)
    formAction(formData);
    setInput(''); 
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
  }, [state, toast]);

  return (
    <div className="flex flex-col h-[65vh] border rounded-2xl overflow-hidden bg-white shadow-inner">
      <div className="bg-primary/5 p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary animate-pulse" />
            <span className="text-xs font-black uppercase tracking-widest text-primary">Análise Predict IBM</span>
        </div>
        <Badge variant="outline" className="text-[10px] font-bold bg-white">POWERED BY GENKIT</Badge>
      </div>

      <ScrollArea className="flex-1 p-6 bg-slate-50/30">
        <div className="space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex items-start gap-3',
                message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
              )}
            >
              <Avatar className={cn("h-9 w-9 border-2", message.sender === 'ai' ? "border-primary/20" : "border-white")}>
                {message.sender === 'ai' ? (
                    <AvatarFallback className="bg-primary text-white"><Bot className="size-5" /></AvatarFallback>
                ) : (
                    <AvatarFallback className="bg-slate-200 text-slate-600"><User className="size-5" /></AvatarFallback>
                )}
              </Avatar>
              <div
                className={cn(
                  'max-w-[85%] md:max-w-[75%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm',
                  message.sender === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-none'
                    : 'bg-white text-slate-800 border rounded-tl-none'
                )}
              >
                <p className="whitespace-pre-wrap">{message.text}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-white">
        <form action={handleFormSubmit} className="flex items-center gap-2 max-w-4xl mx-auto">
          <Input
            name="question"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ex: Qual o melhor ministério para este perfil? ou Ele já concluiu a integração?"
            className="flex-1 h-11 bg-slate-50 border-none focus-visible:ring-primary/20 font-medium"
            autoComplete="off"
          />
           <input type="hidden" name="userId" value={userProfile.id} />
          <SubmitButton />
        </form>
        <p className="text-[9px] text-center text-muted-foreground uppercase font-bold mt-2 tracking-tighter">
            A IA pode cometer erros. Sempre valide as informações com o histórico oficial.
        </p>
      </div>
    </div>
  );
}
