
'use client';
import React, { useState } from 'react';
import { useFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import { Clock, Users, Layout, DollarSign, Utensils, FileText, ShieldAlert, Target, ListChecks } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';


export function EventPlanningForm() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Estado Unificado
  const [formData, setFormData] = useState({
    requesterName: '',
    ministry: '',
    eventName: '',
    category: '',
    recurrence: 'unico',
    recurrenceStart: '',
    recurrenceEnd: '',
    visionAlignment: '',
    smart: { specific: '', measurable: '', achievable: '', relevant: '', timeBound: '' },
    method5w2h: { what: '', why: '', who: '', where: '', when: '', how: '', howMuch: '' },
    targetAudience: [],
    capacityMinimum: '',
    capacityExpected: '',
    capacityMax: '',
    date: '',
    timeLoadIn: '',
    timeStart: '',
    timeEnd: '',
    timeLoadOut: '',
    space: '',
    roomLayout: '',
    hasFood: 'nao',
    foodType: '',
    kitchenResponsible: '',
    isPaid: 'gratuito',
    budgetExpenses: '',
    ticketPrice: '',
    breakEvenAnalysis: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNestedChange = (e: React.ChangeEvent<HTMLInputElement>, parent: 'smart' | 'method5w2h') => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [name]: value
      }
    }));
  };
  
  const handleRadioChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!firestore) {
        toast({ title: 'Erro', description: 'Banco de dados não disponível.', variant: 'destructive'});
        setLoading(false);
        return;
    }

    try {
      const collectionRef = collection(firestore, "strategic_events");
      await addDocumentNonBlocking(collectionRef, {
        ...formData,
        submittedAt: serverTimestamp(),
        status: 'analise_estrategica'
      });
      setSuccess(true);
      window.scrollTo(0, 0);
      toast({ title: 'Sucesso!', description: 'Sua solicitação de evento foi protocolada.'});
    } catch (error) {
      console.error("Erro:", error);
      toast({ title: 'Erro ao Submeter', description: 'Por favor, tente novamente.', variant: 'destructive'});
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[70vh] bg-emerald-50 flex items-center justify-center p-6 rounded-lg">
        <div className="bg-white p-8 rounded-xl shadow-2xl text-center max-w-lg border-t-8 border-emerald-600">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="text-emerald-600" size={32} />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Solicitação Protocolada</h2>
          <p className="text-gray-600 mb-6">
            Seu planejamento estratégico foi enviado para a liderança.
          </p>
          <Button onClick={() => window.location.reload()} className="bg-emerald-600 hover:bg-emerald-700">
            Nova Solicitação
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 -m-6 font-sans">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        
        <div className="bg-slate-800 py-10 px-8 text-center relative overflow-hidden">
          <div className="relative z-10">
            <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest">Sistema de Governança</span>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mt-4 mb-2">Solicitação de Evento</h1>
            <p className="text-slate-300 max-w-2xl mx-auto text-sm">
              Alinhamento Estratégico • Planejamento Tático • Excelência Operacional
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 md:p-12 space-y-12">

          <section>
            <div className="flex items-center gap-3 mb-6 pb-2 border-b border-gray-200">
              <div className="bg-blue-100 p-2 rounded-lg text-blue-700"><FileText size={24} /></div>
              <h2 className="text-2xl font-bold text-gray-800">1. Identidade do Evento</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <Label htmlFor="ministry">Ministério Solicitante</Label>
                <Input required id="ministry" name="ministry" value={formData.ministry} onChange={handleChange} />
              </div>
              <div>
                <Label htmlFor="eventName">Nome do Evento</Label>
                <Input required id="eventName" name="eventName" value={formData.eventName} onChange={handleChange} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="category">Categoria Taxonômica</Label>
                <Select required name="category" value={formData.category} onValueChange={(v) => setFormData(p => ({...p, category: v}))}>
                  <SelectTrigger id="category"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="adoracao">Adoração e Liturgia</SelectItem>
                    <SelectItem value="educacao">Educação e Discipulado</SelectItem>
                    <SelectItem value="koinonia">Comunhão e Koinonia</SelectItem>
                    <SelectItem value="outreach">Evangelismo e Missões</SelectItem>
                    <SelectItem value="adm">Administrativo e Governança</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Recorrência</Label>
                 <RadioGroup value={formData.recurrence} onValueChange={(v) => handleRadioChange('recurrence', v)} className="flex gap-4 mt-2">
                    <div className="flex items-center space-x-2"><RadioGroupItem value="unico" id="r_unico" /><Label htmlFor="r_unico">Evento Único</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="recorrente" id="r_recorrente" /><Label htmlFor="r_recorrente">Temporada</Label></div>
                </RadioGroup>
              </div>
            </div>
          </section>

          <section className="bg-slate-50 p-6 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-200">
              <div className="bg-indigo-100 p-2 rounded-lg text-indigo-700"><Target size={24} /></div>
              <h2 className="text-2xl font-bold text-gray-800">2. Planejamento Tático</h2>
            </div>

            <div className="mb-6">
               <Label htmlFor="visionAlignment">Alinhamento com a Visão (Justificativa)</Label>
               <Textarea required id="visionAlignment" name="visionAlignment" rows={2} value={formData.visionAlignment} onChange={handleChange} placeholder="Como este evento contribui para o tema do ano ou crescimento das células?"></Textarea>
            </div>

            <div className="bg-white p-5 rounded-lg border border-indigo-100 shadow-sm mb-8">
              <h3 className="font-bold text-indigo-800 mb-4 flex items-center gap-2"><ListChecks size={18}/> Metas SMART</h3>
              <div className="space-y-3">
                 {Object.keys(formData.smart).map(key => (
                     <div key={key} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                        <Label className="text-xs font-bold uppercase text-indigo-600 md:text-right px-2">{key.charAt(0).toUpperCase()} - {key}</Label>
                        <Input type="text" name={key} value={formData.smart[key]} onChange={(e) => handleNestedChange(e, 'smart')} className="md:col-span-3 bg-indigo-50/30" />
                     </div>
                 ))}
              </div>
            </div>

             <div className="bg-white p-5 rounded-lg border border-emerald-100 shadow-sm">
              <h3 className="font-bold text-emerald-800 mb-4 flex items-center gap-2"><Layout size={18}/> Plano de Ação (5W2H)</h3>
              <div className="space-y-3">
                 {Object.keys(formData.method5w2h).map(key => (
                     <div key={key} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                        <Label className="text-xs font-bold uppercase text-emerald-700 md:text-right px-2">{key}</Label>
                        <Input type="text" name={key} value={formData.method5w2h[key]} onChange={(e) => handleNestedChange(e, 'method5w2h')} className="md:col-span-3 bg-emerald-50/30" placeholder={key === 'howMuch' ? 'Custo estimado' : ''} />
                     </div>
                 ))}
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-6 pb-2 border-b border-gray-200">
              <div className="bg-indigo-100 p-2 rounded-lg text-indigo-700"><Clock size={24} /></div>
              <h2 className="text-2xl font-bold text-gray-800">3. Matriz Logística</h2>
            </div>
            <div className="mb-8">
              <Label className="block text-sm font-bold text-gray-700 mb-2">Cronograma Operacional (4 Marcos)</Label>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end bg-gray-50 p-4 rounded-lg border border-gray-200">
                 <div className="md:col-span-1"><Label className="text-xs text-gray-500 block mb-1">Data</Label><Input type="date" required name="date" value={formData.date} onChange={handleChange}/></div>
                 <div><Label className="text-xs font-bold text-indigo-600 block mb-1">1. Load-in (Equipe)</Label><Input type="time" required name="timeLoadIn" value={formData.timeLoadIn} onChange={handleChange} className="border-indigo-200" /></div>
                 <div><Label className="text-xs font-bold text-green-600 block mb-1">2. Início do Evento</Label><Input type="time" required name="timeStart" value={formData.timeStart} onChange={handleChange} className="border-green-200" /></div>
                 <div><Label className="text-xs font-bold text-gray-600 block mb-1">3. Término</Label><Input type="time" required name="timeEnd" value={formData.timeEnd} onChange={handleChange} className="border-gray-200" /></div>
                 <div><Label className="text-xs font-bold text-red-600 block mb-1">4. Desocupação</Label><Input type="time" required name="timeLoadOut" value={formData.timeLoadOut} onChange={handleChange} className="border-red-200" /></div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <Label htmlFor="space">Ambiente Solicitado</Label>
                    <Select name="space" value={formData.space} onValueChange={(v) => setFormData(p => ({...p, space: v}))}><SelectTrigger id="space"><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent><SelectItem value="santuario">Santuário Principal</SelectItem><SelectItem value="salao">Salão Social</SelectItem><SelectItem value="externo">Externo (Fora da Igreja)</SelectItem></SelectContent></Select>
                </div>
                <div>
                    <Label htmlFor="roomLayout">Layout da Sala</Label>
                    <Select name="roomLayout" value={formData.roomLayout} onValueChange={(v) => setFormData(p => ({...p, roomLayout: v}))}><SelectTrigger id="roomLayout"><SelectValue placeholder="Padrão" /></SelectTrigger><SelectContent><SelectItem value="padrao">Padrão</SelectItem><SelectItem value="auditorio">Auditório</SelectItem><SelectItem value="banquete">Banquete (Mesas)</SelectItem><SelectItem value="limpo">Espaço Livre</SelectItem></SelectContent></Select>
                </div>
            </div>
             <div className="bg-orange-50 p-6 rounded-xl border border-orange-200 mt-6">
                <div className="flex items-center gap-2 mb-4"><Utensils className="text-orange-600" size={20} /><h3 className="font-bold text-orange-900">Alimentação</h3></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <Label>Haverá Comida?</Label>
                         <RadioGroup value={formData.hasFood} onValueChange={(v) => handleRadioChange('hasFood', v)} className="flex items-center gap-4 mt-2">
                            <div className="flex items-center space-x-2"><RadioGroupItem value="sim" id="food_sim" /><Label htmlFor="food_sim">Sim</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="nao" id="food_nao" /><Label htmlFor="food_nao">Não</Label></div>
                        </RadioGroup>
                    </div>
                    {formData.hasFood === 'sim' && (<>
                        <div>
                            <Label className="text-xs font-bold text-orange-800 uppercase">Origem</Label>
                             <Select name="foodType" value={formData.foodType} onValueChange={(v) => setFormData(p => ({...p, foodType: v}))}><SelectTrigger><SelectValue placeholder="Selecione..."/></SelectTrigger><SelectContent><SelectItem value="interno">Preparo Interno</SelectItem><SelectItem value="terceirizado">Buffet</SelectItem><SelectItem value="potluck">Junta-Pratos</SelectItem></SelectContent></Select>
                        </div>
                        <div>
                            <Label className="text-xs font-bold text-orange-800 uppercase">Responsável Limpeza</Label>
                            <Input type="text" name="kitchenResponsible" value={formData.kitchenResponsible} onChange={handleChange} />
                        </div>
                    </>)}
                </div>
             </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-6 pb-2 border-b border-gray-200">
              <div className="bg-emerald-100 p-2 rounded-lg text-emerald-700"><DollarSign size={24} /></div>
              <h2 className="text-2xl font-bold text-gray-800">4. Engenharia Financeira</h2>
            </div>
            <RadioGroup value={formData.isPaid} onValueChange={(v) => handleRadioChange('isPaid', v)} className="flex gap-4 mb-4">
                <Label htmlFor="paid_nao" className={cn("flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 flex-1", formData.isPaid === 'gratuito' && 'bg-slate-100 border-slate-400')}><RadioGroupItem value="gratuito" id="paid_nao" className="mr-2"/>Subsidiado (Gratuito)</Label>
                <Label htmlFor="paid_sim" className={cn("flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 flex-1", formData.isPaid === 'pago' && 'bg-slate-100 border-slate-400')}><RadioGroupItem value="pago" id="paid_sim" className="mr-2"/>Autossustentável (Pago)</Label>
            </RadioGroup>
            {formData.isPaid === 'pago' && (
                <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-200 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                         <Label htmlFor="budgetExpenses">Despesas Estimadas (Lista)</Label>
                         <Textarea id="budgetExpenses" name="budgetExpenses" rows={3} value={formData.budgetExpenses} onChange={handleChange} placeholder="Som, Decor, Comida..."></Textarea>
                    </div>
                    <div className="space-y-4">
                        <div><Label htmlFor="ticketPrice">Valor Inscrição (R$)</Label><Input id="ticketPrice" type="number" name="ticketPrice" value={formData.ticketPrice} onChange={handleChange} /></div>
                        <div><Label htmlFor="breakEvenAnalysis">Ponto de Equilíbrio (Qtd Pessoas)</Label><Input id="breakEvenAnalysis" type="number" name="breakEvenAnalysis" value={formData.breakEvenAnalysis} onChange={handleChange} placeholder="Mínimo para pagar a conta" /></div>
                    </div>
                </div>
            )}
          </section>

          <div className="pt-6 border-t border-gray-200">
            <Button type="submit" disabled={loading} size="lg" className="w-full md:w-auto md:min-w-[300px]">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Protocolar Solicitação
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
