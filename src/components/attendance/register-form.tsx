// src/components/attendance/register-form.tsx
'use client';

import React, { useState } from 'react';
import { useFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader } from 'lucide-react';

const horariosCultos = [
  "Domingo - 07:30",
  "Domingo - 10:15",
  "Domingo - 17:30",
  "Domingo - 19:30",
  "Quinta - 20:00"
];
const opcoesClima = ["Ensolarado", "Nublado", "Chuvoso", "Frio", "Agradável"];

export function RegisterForm() {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [horario, setHorario] = useState(horariosCultos[0]);
  const [adultos, setAdultos] = useState('');
  const [criancas, setCriancas] = useState('');
  const [clima, setClima] = useState(opcoesClima[0]);
  const [feriadoProximo, setFeriadoProximo] = useState(false);
  const [jogoFutebol, setJogoFutebol] = useState(false);
  const [serieMensagem, setSerieMensagem] = useState('');
  const [apresentacaoBebe, setApresentacaoBebe] = useState(false);
  const [observacoes, setObservacoes] = useState('');
  const [salvando, setSalvando] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: "Erro", description: "Usuário não autenticado.", variant: "destructive" });
      return;
    }
    if (!adultos || isNaN(Number(adultos))) {
      toast({ title: "Erro de Validação", description: "Por favor, insira um número válido de adultos.", variant: "destructive" });
      return;
    }
    if (criancas && isNaN(Number(criancas))) {
      toast({ title: "Erro de Validação", description: "Por favor, insira um número válido de crianças.", variant: "destructive" });
      return;
    }
    if (!data) {
       toast({ title: "Erro de Validação", description: "Por favor, selecione uma data.", variant: "destructive" });
      return;
    }

    setSalvando(true);
    
    // The time should be set to noon to avoid timezone issues when converting back.
    const dateAsTimestamp = Timestamp.fromDate(new Date(`${data}T12:00:00`));

    const collectionRef = collection(firestore, `cultos/${user.uid}/registros`);
    addDocumentNonBlocking(collectionRef, {
      data: dateAsTimestamp,
      horario,
      adultos: Number(adultos),
      criancas: Number(criancas || 0),
      clima,
      feriadoProximo,
      jogoFutebol,
      serieMensagem,
      apresentacaoBebe,
      observacoes,
      criadoEm: Timestamp.now()
    }).then(() => {
        toast({ title: "Sucesso!", description: "Registro salvo com sucesso." });
        // Reset form
        setData(new Date().toISOString().split('T')[0]);
        setHorario(horariosCultos[0]);
        setAdultos('');
        setCriancas('');
        setClima(opcoesClima[0]);
        setFeriadoProximo(false);
        setJogoFutebol(false);
        setSerieMensagem('');
        setApresentacaoBebe(false);
        setObservacoes('');
    }).catch(error => {
        // Error is handled globally by non-blocking update
        console.error("Erro ao salvar registro: ", error);
    }).finally(() => {
        setSalvando(false);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="data">Data</Label>
          <Input id="data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="horario">Horário do Culto</Label>
          <Select value={horario} onValueChange={setHorario}>
              <SelectTrigger id="horario">
                  <SelectValue />
              </SelectTrigger>
              <SelectContent>
                  {horariosCultos.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
              </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="adultos">Nº de Adultos</Label>
          <Input id="adultos" type="number" value={adultos} onChange={(e) => setAdultos(e.target.value)} placeholder="Ex: 150" required min="0"/>
        </div>
        <div className="space-y-2">
          <Label htmlFor="criancas">Nº de Crianças</Label>
          <Input id="criancas" type="number" value={criancas} onChange={(e) => setCriancas(e.target.value)} placeholder="Ex: 30" min="0"/>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
            <Label htmlFor="serieMensagem">Série de Mensagem</Label>
            <Input id="serieMensagem" value={serieMensagem} onChange={(e) => setSerieMensagem(e.target.value)} placeholder="Ex: Família"/>
        </div>
        <div className="space-y-2">
          <Label htmlFor="clima">Clima</Label>
            <Select value={clima} onValueChange={setClima}>
                <SelectTrigger id="clima">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {opcoesClima.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="flex items-center space-x-2">
            <Checkbox id="feriadoProximo" checked={feriadoProximo} onCheckedChange={setFeriadoProximo as (checked: boolean) => void} />
            <Label htmlFor="feriadoProximo" className="font-medium">Feriado Próximo?</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="jogoFutebol" checked={jogoFutebol} onCheckedChange={setJogoFutebol as (checked: boolean) => void} />
            <Label htmlFor="jogoFutebol" className="font-medium">Jogo no Horário?</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="apresentacaoBebe" checked={apresentacaoBebe} onCheckedChange={setApresentacaoBebe as (checked: boolean) => void} />
            <Label htmlFor="apresentacaoBebe" className="font-medium">Apresentação de Bebê?</Label>
          </div>
      </div>
       <div>
          <Label htmlFor="observacoes">Observações Adicionais</Label>
          <Textarea id="observacoes" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Algum evento especial? Visitas? etc."/>
        </div>
      <div className="text-right">
        <Button type="submit" disabled={salvando || !user}>
          {salvando && <Loader className="mr-2 h-4 w-4 animate-spin" />}
          {salvando ? "Salvando..." : "Salvar Registro"}
        </Button>
      </div>
    </form>
  );
}
