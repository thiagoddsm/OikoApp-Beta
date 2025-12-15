"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createFollowUpTasks, type State } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, AlertCircle, Loader, MessageSquare, Calendar } from "lucide-react";
import { Logo } from "@/components/icons";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : null}
      Gerar Tarefas
    </Button>
  );
}

export default function NewMemberPage() {
  const initialState: State = { message: null, errors: {} };
  const [state, dispatch] = useActionState(createFollowUpTasks, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if (state.message) {
      if (state.tasks) {
        toast({
          title: "Sucesso!",
          description: state.message,
          variant: "default",
        });
      } else {
        toast({
          title: "Erro",
          description: state.message,
          variant: "destructive",
        });
      }
    }
  }, [state, toast]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-2xl">
         <div className="flex justify-center items-center gap-2 mb-6">
            <Logo className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold font-headline">OikoApp</h1>
        </div>
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Registrar Novo Visitante</CardTitle>
            <CardDescription>
              Insira as informações do visitante para que nosso assistente de IA gere tarefas de acompanhamento personalizadas para você.
            </CardDescription>
          </CardHeader>
          <form action={dispatch}>
            <CardContent className="grid gap-6">
              <div className="grid gap-2">
                <Label htmlFor="visitorName">Nome do Visitante</Label>
                <Input id="visitorName" name="visitorName" placeholder="Ex: João da Silva" />
                {state.errors?.visitorName && (
                  <p className="text-sm font-medium text-destructive">{state.errors.visitorName}</p>
                )}
              </div>

               <div className="grid gap-3">
                <Label>Origem do Visitante</Label>
                <RadioGroup defaultValue="culto" name="visitorType" className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="culto" id="r-culto" />
                    <Label htmlFor="r-culto">Visitante do Culto (Sala VIP)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="celula" id="r-celula" />
                    <Label htmlFor="r-celula">Visitante de Célula (GC)</Label>
                  </div>
                </RadioGroup>
                 {state.errors?.visitorType && (
                  <p className="text-sm font-medium text-destructive">{state.errors.visitorType}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="leaderName">Seu Nome (Líder)</Label>
                <Input id="leaderName" name="leaderName" placeholder="Ex: Maria Oliveira" />
                 {state.errors?.leaderName && (
                  <p className="text-sm font-medium text-destructive">{state.errors.leaderName}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="leaderPhoneNumber">Seu Telefone (Líder)</Label>
                <Input id="leaderPhoneNumber" name="leaderPhoneNumber" placeholder="Ex: (11) 99999-8888" />
                 {state.errors?.leaderPhoneNumber && (
                  <p className="text-sm font-medium text-destructive">{state.errors.leaderPhoneNumber}</p>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <SubmitButton />
            </CardFooter>
          </form>
        </Card>

        {state.tasks && state.tasks.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-center mb-4 font-headline">Suas Tarefas de Acompanhamento!</h2>
            <div className="grid gap-4">
              {state.tasks.map((task, index) => (
                <Card key={index} className="bg-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <CheckCircle className="h-5 w-5 text-primary" />
                      Tarefa {index + 1}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                      <div className="flex items-start gap-3">
                        <MessageSquare className="h-5 w-5 mt-1 text-muted-foreground shrink-0"/>
                        <p className="text-foreground">{task.message}</p>
                      </div>
                       <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground shrink-0"/>
                        <p className="text-sm text-muted-foreground">
                          <span className="font-semibold text-foreground">Prazo:</span> {task.dueDate}
                        </p>
                      </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {state.message && !state.tasks && (
             <div className="mt-8">
                <Card className="border-destructive bg-destructive/10">
                    <CardHeader className="flex-row items-center gap-3 space-y-0">
                         <AlertCircle className="h-6 w-6 text-destructive" />
                        <CardTitle className="text-destructive">Falha ao Gerar Tarefas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-destructive">{state.message}</p>
                    </CardContent>
                </Card>
            </div>
        )}
      </div>
    </main>
  );
}
