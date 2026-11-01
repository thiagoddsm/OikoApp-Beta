'use client';

import React, { useState, useEffect } from 'react';
import { useFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, Timestamp, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader, X } from 'lucide-react';

const horariosCultos = [
  "Domingo - 07:30",
  "Domingo - 10:15",
  "Domingo - 17:30",
  "Domingo - 19:30",
  "Quinta - 20:00",
  "Evento"
];
const opcoesClima = ["Ensolarado", "Nublado", "Chuvoso", "Frio", "Agradável"];

interface RegisterFormProps {
  editingRecord?: any;
  onCancelEdit?: () => void;
}

export function RegisterForm({ editingRecord, onCancelEdit }: RegisterFormProps) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [horario, setHorario] = useState(horariosCultos[0]);
  const [adultos, setAdultos] = useState('');
  const [criancas, setCriancas] = useState('');
  const [servos, setServos] = useState('');
  const [salaVip, setSalaVip] = useState('');
  const [conversoes, setConversoes] = useState('');
  const [reconciliacoes, setReconciliacoes] = useState('');
  const [clima, setClima] = useState(opcoesClima[0]);
  const [feriadoProximo, setFeriadoProximo] = useState(false);
  const [jogoFutebol, setJogoFutebol] = useState(false);
  const [teveApelo, setTeveApelo] = useState(false);
  const [teveCeia, setTeveCeia] = useState(false);
  const [serieMensagem, setSerieMensagem] = useState('');
  const [apresentacaoBebe, setApresentacaoBebe] = useState(false);
  const [observacoes, setObservacoes] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (editingRecord) {
      let dateStr = new Date().toISOString().split('T')[0];
      if (editingRecord.data) {
        if (typeof editingRecord.data.toDate === 'function') {
          dateStr = editingRecord.data.toDate().toISOString().split('T')[0];
        } else if (editingRecord.data.seconds) {
          dateStr = new Date(editingRecord.data.seconds * 1000).toISOString().split('T')[0];
        } else if (typeof editingRecord.data === 'string') {
          dateStr = editingRecord.data.split('T')[0];
        }
      }
      
      setData(dateStr);
      setHorario(editingRecord.horario || horariosCultos[0]);
      setAdultos(editingRecord.adultos !== undefined && editingRecord.adultos !== null ? editingRecord.adultos.toString() : '');
      setCriancas(editingRecord.criancas !== undefined && editingRecord.criancas !== null ? editingRecord.criancas.toString() : '');
      setServos(editingRecord.servos !== undefined && editingRecord.servos !== null ? editingRecord.servos.toString() : '');
      setSalaVip(editingRecord.salaVip !== undefined && editingRecord.salaVip !== null ? editingRecord.salaVip.toString() : '');
      setConversoes(editingRecord.conversoes !== undefined && editingRecord.conversoes !== null ? editingRecord.conversoes.toString() : '');
      setReconciliacoes(editingRecord.reconciliacoes !== undefined && editingRecord.reconciliacoes !== null ? editingRecord.reconciliacoes.toString() : '');
      setClima(editingRecord.clima || opcoesClima[0]);
      setFeriadoProximo(!!editingRecord.feriadoProximo);
      setJogoFutebol(!!editingRecord.jogoFutebol);
      setTeveApelo(!!editingRecord.teveApelo);
      setTeveCeia(!!editingRecord.teveCeia);
      setSerieMensagem(editingRecord.serieMensagem || '');
      setApresentacaoBebe(!!editingRecord.apresentacaoBebe);
      setObservacoes(editingRecord.observacoes || '');
    } else {
      resetForm();
    }
  }, [editingRecord]);

  const toSafeInt = (val: string) => {
    const parsed = parseInt(val, 10);
    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
  };

  const totalCalculado = toSafeInt(adultos) + toSafeInt(criancas) + toSafeInt(servos);

  const resetForm = () => {
    setData(new Date().toISOString().split('T')[0]);
    setHorario(horariosCultos[0]);
    setAdultos('');
    setCriancas('');
    setServos('');
    setSalaVip('');
    setConversoes('');
    setReconciliacoes('');
    setClima(opcoesClima[0]);
    setFeriadoProximo(false);
    setJogoFutebol(false);
    setTeveApelo(false);
    setTeveCeia(false);
    setSerieMensagem('');
    setApresentacaoBebe(false);
    setObservacoes('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !firestore) {
      toast({ title: "Erro", description: "Sessão expirada ou banco inacessível.", variant: "destructive" });
      return;
    }
    if (!adultos || isNaN(Number(adultos))) {
      toast({ title: "Erro de Validação", description: "Por favor, insira um número válido de adultos.", variant: "destructive" });
      return;
    }
    if (!data) {
       toast({ title: "Erro de Validação", description: "Por favor, selecione uma data.", variant: "destructive" });
      return;
    }

    setSalvando(true);
    
    const dateAsTimestamp = Timestamp.fromDate(new Date(`${data}T12:00:00`));
    const payload = {
      data: dateAsTimestamp,
      horario,
      adultos: toSafeInt(adultos),
      criancas: toSafeInt(criancas),
      servos: toSafeInt(servos),
      salaVip: toSafeInt(salaVip),
      conversoes: toSafeInt(conversoes),
      reconciliacoes: toSafeInt(reconciliacoes),
      clima,
      feriadoProximo,
      jogoFutebol,
      teveApelo,
      teveCeia,
      serieMensagem: serieMensagem.trim(),
      apresentacaoBebe,
      observacoes: observacoes.trim(),
      atualizadoEm: Timestamp.now()
    };

    if (editingRecord) {
      const docRef = doc(firestore, 'registros_de_presenca', editingRecord.id);
      updateDocumentNonBlocking(docRef, payload)
        .then(() => {
          toast({ title: "Sucesso!", description: "Registro atualizado com sucesso." });
          if (onCancelEdit) onCancelEdit();
        })
        .catch((err: any) => {
          toast({ title: "Erro ao atualizar", description: err.message, variant: "destructive" });
        })
        .finally(() => setSalvando(false));
    } else {
      const collectionRef = collection(firestore, `registros_de_presenca`);
      addDocumentNonBlocking(collectionRef, {
        ...payload,
        criadoEm: Timestamp.now()
      }).then(() => {
          toast({ title: "Sucesso!", description: "Registro salvo com sucesso." });
          resetForm();
      }).catch((err: any) => {
          toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
      }).finally(() => {
          setSalvando(false);
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {editingRecord && (
        <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-lg animate-in fade-in zoom-in-95">
          <p className="text-sm font-bold text-primary">Editando registro de {data}</p>
          <Button type="button" variant="ghost" size="sm" onClick={onCancelEdit} className="h-8">
            <X className="size-4 mr-1" /> Cancelar Edição
          </Button>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="data">Data</Label>
          <Input id="data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
        </div>
        <div className="space-y-2 lg:col-span-2">
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
        <div className="space-y-2">
          <Label htmlFor="servos">Nº de Servos</Label>
          <Input id="servos" type="number" value={servos} onChange={(e) => setServos(e.target.value)} placeholder="Ex: 20" min="0"/>
        </div>
        <div className="space-y-2">
          <Label htmlFor="salaVip">Nº na Sala VIP</Label>
          <Input id="salaVip" type="number" value={salaVip} onChange={(e) => setSalaVip(e.target.value)} placeholder="Ex: 10" min="0"/>
        </div>
        <div className="space-y-2">
          <Label htmlFor="conversoes">Conversões</Label>
          <Input id="conversoes" type="number" value={conversoes} onChange={(e) => setConversoes(e.target.value)} placeholder="Ex: 5" min="0"/>
        </div>
        <div className="space-y-2">
          <Label htmlFor="reconciliacoes">Reconciliações</Label>
          <Input id="reconciliacoes" type="number" value={reconciliacoes} onChange={(e) => setReconciliacoes(e.target.value)} placeholder="Ex: 10" min="0"/>
        </div>
      </div>

      {/* Banner de Total em Tempo Real */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
          <span>Adultos: <strong className="text-slate-800 dark:text-slate-200">{toSafeInt(adultos)}</strong></span>
          <span>+</span>
          <span>Crianças: <strong className="text-slate-800 dark:text-slate-200">{toSafeInt(criancas)}</strong></span>
          <span>+</span>
          <span>Servos: <strong className="text-indigo-600 dark:text-indigo-400">{toSafeInt(servos)}</strong></span>
        </div>
        <div className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
          Total Geral Presentes: <span className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400">{totalCalculado}</span> pessoas
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
            <Checkbox id="feriadoProximo" checked={feriadoProximo} onCheckedChange={(checked) => setFeriadoProximo(!!checked)} />
            <Label htmlFor="feriadoProximo" className="font-medium">Feriado Próximo?</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="jogoFutebol" checked={jogoFutebol} onCheckedChange={(checked) => setJogoFutebol(!!checked)} />
            <Label htmlFor="jogoFutebol" className="font-medium">Jogo no Horário?</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="apresentacaoBebe" checked={apresentacaoBebe} onCheckedChange={(checked) => setApresentacaoBebe(!!checked)} />
            <Label htmlFor="apresentacaoBebe" className="font-medium">Apresentação de Bebê?</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="teveApelo" checked={teveApelo} onCheckedChange={(checked) => setTeveApelo(!!checked)} />
            <Label htmlFor="teveApelo" className="font-medium">Teve apelo?</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="teveCeia" checked={teveCeia} onCheckedChange={(checked) => setTeveCeia(!!checked)} />
            <Label htmlFor="teveCeia" className="font-medium">Teve ceia?</Label>
          </div>
      </div>
       <div>
          <Label htmlFor="observacoes">Observações Adicionais</Label>
          <Textarea id="observacoes" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Algum evento especial? Visitas? etc."/>
        </div>
      <div className="text-right">
        <Button type="submit" disabled={salvando || !user}>
          {salvando && <Loader className="mr-2 h-4 w-4 animate-spin" />}
          {salvando ? "Salvando..." : (editingRecord ? "Atualizar Registro" : "Salvar Registro")}
        </Button>
      </div>
    </form>
  );
}
