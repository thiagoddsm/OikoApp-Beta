
"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Loader } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking, errorEmitter, FirestorePermissionError } from "@/firebase";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { collection, query, doc, getDoc, Timestamp } from "firebase/firestore";

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
  const [error, setError] = useState<string | null>(null);

  const usersQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, "users")) : null),
    [firestore]
  );
  const { data: allUsers, isLoading: isLoadingUsers } = useCollection<UserType>(usersQuery);
  
  const cellsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, "cells")) : null),
    [firestore]
  );
  const { data: allCells, isLoading: isLoadingCells } = useCollection<CellType>(cellsQuery);

  const leaders = useMemo(() => {
    if (!allUsers) return [];
    return allUsers.filter(u => u.hierarchy?.role && u.hierarchy.role !== 'membro');
  }, [allUsers]);

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

    startTransition(async () => {
      if (!firestore) {
        setError("O serviço de banco de dados não está disponível.");
        return;
      }
      
      try {
        const usersCollection = collection(firestore, 'users');
        const newUser = {
            name: visitorName,
            phone: visitorPhone,
            email: '',
            hierarchy: {
                role: 'membro',
                celulaId: cellId || null,
                supervisorId: responsibleUserId || null,
            },
            integrationStatus: visitorType === 'culto' ? 'visitante_culto' : 'visitante_celula',
            createdAt: Timestamp.now()
        };
        
        await addDocumentNonBlocking(usersCollection, newUser);

        toast({ title: "Sucesso!", description: 'Nova pessoa registrada com sucesso!' });
        
        // Reset form
        setVisitorName('');
        setVisitorPhone('');
        setCellId('');
        setVisitorType('culto');


      } catch (e: any) {
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
              Insira as informações do visitante ou novo convertido para salvá-lo em sua base de dados.
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
                Salvar Pessoa
              </Button>
            </CardFooter>
          </form>
        </Card>

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
