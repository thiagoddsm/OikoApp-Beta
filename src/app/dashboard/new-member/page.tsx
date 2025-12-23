
"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Loader } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useFirebase, useCollection, addDocumentNonBlocking } from "@/firebase";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { collection, Timestamp } from "firebase/firestore";

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

const integrationStatusOptions = [
  { id: 'visitante_nao_crente', title: 'Visitante (Não Crente)' },
  { id: 'novo_convertido', title: 'Novo Convertido' },
  { id: 'recem_chegado', title: 'Recém Chegado (de outra igreja)' },
  { id: 'em_discipulado_td', title: 'Em Discipulado (TD)' },
  { id: 'batizado_transferido', title: 'Batizado/Transferido' },
  { id: 'em_gc', title: 'Participando de GC' },
  { id: 'curso_membros', title: 'Fazendo Curso de Membros' },
  { id: 'servindo', title: 'Servindo em Ministério' },
  { id: 'lider_gc', title: 'Líder de GC' }
];

export default function NewMemberPage() {
  const { user, firestore, isUserLoading } = useFirebase();
  const { toast } = useToast();
  
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [responsibleUserId, setResponsibleUserId] = useState('');
  const [integrationStatus, setIntegrationStatus] = useState('visitante_nao_crente');
  const [cellId, setCellId] = useState('');

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const { data: allUsers, isLoading: isLoadingUsers } = useCollection<UserType>("users");
  const { data: allCells, isLoading: isLoadingCells } = useCollection<CellType>("cells");

  const leaders = useMemo(() => {
    if (!allUsers) return [];
    const leaderRoles = ['lider_gc', 'lider_area', 'lider_rede', 'pastor', 'admin'];
    return allUsers.filter(u => u.hierarchy?.role && leaderRoles.includes(u.hierarchy.role));
  }, [allUsers]);

  useEffect(() => {
    if (user && leaders.length > 0) {
      const loggedInLeader = leaders.find(leader => leader.id === user.uid);
      if (loggedInLeader) {
        setResponsibleUserId(loggedInLeader.id);
      }
    }
  }, [user, leaders]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!firestore) {
      setError("O serviço de banco de dados não está disponível.");
      return;
    }

    startTransition(async () => {
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
            integrationStatus: integrationStatus,
            createdAt: Timestamp.now()
        };
        
        addDocumentNonBlocking(usersCollection, newUser);

        toast({ title: "Sucesso!", description: 'Nova pessoa registrada com sucesso!' });
        
        // Reset form
        setVisitorName('');
        setVisitorPhone('');
        setCellId('');
        setIntegrationStatus('visitante_nao_crente');

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
            <CardTitle>Registrar Nova Pessoa (Jornada)</CardTitle>
            <CardDescription>
              Insira as informações e o estágio da jornada do novo membro.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="grid gap-6">
              <div className="grid gap-2">
                <Label htmlFor="visitorName">Nome do Discípulo</Label>
                <Input id="visitorName" name="visitorName" placeholder="Ex: João da Silva" value={visitorName} onChange={(e) => setVisitorName(e.target.value)} required />
              </div>

               <div className="grid gap-2">
                <Label htmlFor="integrationStatus">Estágio na Jornada</Label>
                <Select name="integrationStatus" value={integrationStatus} onValueChange={setIntegrationStatus} required>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione o estágio atual" />
                    </SelectTrigger>
                    <SelectContent>
                        {integrationStatusOptions.map((status) => (
                            <SelectItem key={status.id} value={status.id}>
                                {status.title}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>

              
              {(integrationStatus === 'em_gc' || integrationStatus === 'lider_gc') && (
                <div className="grid gap-2">
                    <Label htmlFor="cellId">Célula (GC)</Label>
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
