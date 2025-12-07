
"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, AlertCircle, Loader, MessageSquare, Calendar } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking, errorEmitter, FirestorePermissionError } from "@/firebase";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { collection, query, doc, getDoc, Timestamp } from "firebase/firestore";
import { generateNewMemberFollowUpTasks } from "@/ai/flows/new-member-follow-up-tasks";

type UserType = {
  id: string;
  name: string;
  phone?: string;
  hierarchy?: {
    role?: string;
  }
};

type CellType = {
  id: string;
  nome: string;
};

export default function NewMemberPage() {
  const { user, firestore, isUserLoading } = useFirebase();
  const { toast } = useToast();
  
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [responsibleUserId, setResponsibleUserId] = useState('');
  const [visitorType, setVisitorType] = useState('culto');
  const [cellId, setCellId] = useState('');

  const [isPending, startTransition] = useTransition();
  const [tasks, setTasks] = useState<{ message: string; dueDate: string; }[] | null>(null);
  const [error, setError] = useState<string | null>(null);


  // 1. Fetch all users
  const usersQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, "users")) : null),
    [firestore]
  );
  const { data: allUsers, isLoading: isLoadingUsers } = useCollection<UserType>(usersQuery);
  
  // 2. Fetch all cells
  const cellsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, "cells")) : null),
    [firestore]
  );
  const { data: allCells, isLoading: isLoadingCells } = useCollection<CellType>(cellsQuery);

  // 3. Filter to get only leaders
  const leaders = useMemo(() => {
    if (!allUsers) return [];
    return allUsers.filter(u => u.hierarchy?.role && u.hierarchy.role !== 'membro');
  }, [allUsers]);

  // 4. Set the default responsible user to the logged-in user if they are a leader
  useEffect(() => {
    if (user && leaders.length > 0) {
      const loggedInLeader = leaders.find(leader => leader.id === user.uid);
      if (loggedInLeader) {
        setResponsibleUserId(loggedInLeader.id);
      }
    }
  }, [user, leaders]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setTasks(null);

    startTransition(async () => {
      if (!firestore) {
        setError("O serviço de banco de dados não está disponível.");
        return;
      }
      
      const responsibleUserDocRef = doc(firestore, 'users', responsibleUserId);
      
      try {
        const responsibleUserDoc = await getDoc(responsibleUserDocRef).catch(serverError => {
            const permissionError = new FirestorePermissionError({
              path: responsibleUserDocRef.path,
              operation: 'get',
            });
            errorEmitter.emit('permission-error', permissionError);
            throw new Error("Erro de permissão ao buscar dados do responsável.");
        });

        if (!responsibleUserDoc.exists()) {
          setError("Erro: O usuário responsável selecionado não foi encontrado.");
          toast({ title: "Erro", description: "O usuário responsável selecionado não foi encontrado.", variant: "destructive" });
          return;
        }

        const responsibleUser = responsibleUserDoc.data() as UserType;

        // Save new user
        const usersCollection = collection(firestore, 'users');
        const newUser = {
            name: visitorName,
            phone: visitorPhone,
            email: '',
            hierarchy: {
                role: 'membro',
                celulaId: cellId || null,
            },
            integrationStatus: visitorType === 'culto' ? 'visitante_culto' : 'visitante_celula',
            createdAt: Timestamp.now()
        };
        
        await addDocumentNonBlocking(usersCollection, newUser);

        const aiPayload = {
          visitorName: visitorName,
          visitorType: visitorType as 'culto' | 'celula',
          responsibleName: responsibleUser.name || 'Líder',
          responsiblePhoneNumber: responsibleUser.phone || 'N/A',
        };

        const result = await generateNewMemberFollowUpTasks(aiPayload);
        
        if (result && result.followUpTasks) {
          setTasks(result.followUpTasks);
          toast({ title: "Sucesso!", description: 'Pessoa registrada e tarefas de acompanhamento geradas com sucesso!' });
        } else {
          setError('Pessoa registrada, mas não foi possível gerar as tarefas. A resposta da IA estava vazia.');
          toast({ title: "Aviso", description: 'Pessoa registrada, mas não foi possível gerar as tarefas. A resposta da IA estava vazia.', variant: "destructive" });
        }

      } catch (e: any) {
        // Errors emitted by FirestorePermissionError will be caught here if they are thrown
        // The global listener will also catch it and show the overlay
        setError(e.message || "Ocorreu um erro desconhecido.");
        console.error("Form submission error:", e);
      }
    });
  };
  
  const isLoading = isUserLoading || isLoadingUsers || isLoadingCells;

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-2xl">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Registrar Nova Pessoa (Discípulo)</CardTitle>
            <CardDescription>
              Insira as informações do visitante ou novo convertido. O sistema salvará o contato e nosso assistente de IA irá gerar tarefas de acompanhamento.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="grid gap-6">
              <div className="grid gap-2">
                <Label htmlFor="visitorName">Nome do Discípulo</Label>
                <Input id="visitorName" name="visitorName" placeholder="Ex: João da Silva" value={visitorName} onChange={(e) => setVisitorName(e.target.value)} required />
              </div>

               <div className="grid gap-3">
                <Label>Origem do Contato</Label>
                <RadioGroup name="visitorType" value={visitorType} onValueChange={setVisitorType} className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="culto" id="r-culto" />
                    <Label htmlFor="r-culto">Visitante do Culto (Sala VIP)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="celula" id="r-celula" />
                    <Label htmlFor="r-celula">Visitante de Célula (GC)</Label>
                  </div>
                </RadioGroup>
              </div>
              
              {visitorType === 'celula' && (
                <div className="grid gap-2">
                    <Label htmlFor="cellId">Célula Visitada</Label>
                    <Select name="cellId" value={cellId} onValueChange={setCellId} disabled={isLoading}>
                        <SelectTrigger>
                            <SelectValue placeholder={isLoading ? "Carregando células..." : "Selecione uma célula"} />
                        </SelectTrigger>
                        <SelectContent>
                            {allCells?.map((cell) => (
                                <SelectItem key={cell.id} value={cell.id}>
                                    {cell.nome}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
              )}
              
              <div className="grid gap-2">
                <Label htmlFor="visitorPhone">Telefone do Discípulo (com DDD)</Label>
                <Input id="visitorPhone" name="visitorPhone" placeholder="Ex: (11) 99999-8888" value={visitorPhone} onChange={(e) => setVisitorPhone(e.target.value)} required/>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="responsibleUserId">Responsável pelo Contato</Label>
                 <Select name="responsibleUserId" value={responsibleUserId} onValueChange={setResponsibleUserId} disabled={isLoading} required>
                    <SelectTrigger>
                        <SelectValue placeholder={isLoading ? "Carregando líderes..." : "Selecione um responsável"} />
                    </SelectTrigger>
                    <SelectContent>
                        {leaders.map((leader) => (
                            <SelectItem key={leader.id} value={leader.id}>
                                {leader.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>

            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isPending || isLoading}>
                {isPending ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : null}
                Gerar Tarefas e Salvar Pessoa
              </Button>
            </CardFooter>
          </form>
        </Card>

        {tasks && tasks.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-center mb-4 font-headline">Suas Tarefas de Acompanhamento!</h2>
            <div className="grid gap-4">
              {tasks.map((task, index) => (
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

        {error && (
             <div className="mt-8">
                <Card className="border-destructive bg-destructive/10">
                    <CardHeader className="flex-row items-center gap-3 space-y-0">
                         <AlertCircle className="h-6 w-6 text-destructive" />
                        <CardTitle className="text-destructive">Ocorreu um erro</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-destructive">{error}</p>
                    </CardContent>
                </Card>
            </div>
        )}
      </div>
    </div>
  );
}
