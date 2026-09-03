'use client';
import React, { useState, useEffect } from 'react';
import {
  Car,
  Clock,
  MapPin,
  Utensils,
  Mic,
  ShieldCheck,
  Download,
  User,
  Coffee,
  PlusCircle,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const categoryConfig: Record<string, { icon: React.ElementType; color: string }> = {
    'Transporte': { icon: Car, color: 'purple' },
    'Alimentação': { icon: Utensils, color: 'green' },
    'Ação': { icon: Mic, color: 'primary' },
    'Logística': { icon: MapPin, color: 'blue' },
    'Pausa': { icon: Coffee, color: 'orange' },
    'Default': { icon: Clock, color: 'slate' }
};

const initialTimelineItems = [
    { id: '1', time: '08:00', category: 'Transporte', title: "Transporte & Pickup", details: "Motorista: Uber VIP / Voluntário João\nLocal: Aeroporto SDU" },
    { id: '2', time: '09:30', category: 'Logística', title: "Chegada ao Evento", details: "Recepção VIP e Credenciamento." },
    { id: '3', time: '12:30', category: 'Alimentação', title: "Almoço", details: "Local: Restaurante da Igreja (Área VIP)" },
    { id: '4', time: '14:00', category: 'Ação', title: "Sua Participação", details: "Local: Auditório Principal\nSetup: Microfone, Projetor, Água" },
    { id: '5', time: '16:00', category: 'Pausa', title: "Coffee Break", details: "Local: Sala dos Preletores (2º Andar)" },
    { id: '6', time: '19:00', category: 'Alimentação', title: "Jantar / Encerramento", details: "Local: Pizzaria Local (Pós-evento)" },
];


export function GuestBriefingGenerator({ event }: { event: any }) { 
    const [guestName, setGuestName] = useState('');
    const [guestRole, setGuestRole] = useState('');
    const [roomDetails, setRoomDetails] = useState({ floor: '', room: '', kit: '' });
    const [timelineItems, setTimelineItems] = useState(initialTimelineItems);

     // Update the main "Action" item when guestRole or roomDetails change
    useEffect(() => {
        setTimelineItems(prevItems => {
            return prevItems.map(item => {
                if (item.category === 'Ação') {
                    const details = [
                        (roomDetails.floor || roomDetails.room) ? `Local: ${roomDetails.floor} - ${roomDetails.room}` : '',
                        roomDetails.kit ? `Setup: ${roomDetails.kit}` : ''
                    ].filter(Boolean).join('\n');

                    return {
                        ...item,
                        title: guestRole ? `Sua Participação: ${guestRole}` : 'Sua Participação',
                        details: details || 'Detalhes da participação a serem definidos.'
                    };
                }
                return item;
            });
        });
    }, [guestRole, roomDetails]);


    const handleTimelineChange = (id: string, field: string, value: string) => {
        setTimelineItems(prevItems => 
            prevItems.map(item => (item.id === id ? { ...item, [field]: value } : item))
        );
    };

    const handleRoomDetailsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setRoomDetails(prev => ({ ...prev, [name]: value }));
    };

    const addTimelineItem = () => {
        const newItem = {
            id: crypto.randomUUID(),
            time: '20:00',
            category: 'Default',
            title: 'Novo Item',
            details: 'Responsável: \nInformações: '
        };
        setTimelineItems(prev => [...prev, newItem]);
    };

    const deleteTimelineItem = (id: string) => {
        setTimelineItems(prev => prev.filter(item => item.id !== id));
    };

    const printPDF = () => {
        window.print();
    };
    
    const rawEventDate = event?.startDate || event?.date || event?.eventDate;
    const eventDate = rawEventDate ? new Date(rawEventDate.includes('T') ? rawEventDate : `${rawEventDate}T12:00:00`) : null;
    const formattedDay = eventDate && !isNaN(eventDate.getTime()) ? format(eventDate, 'dd') : 'DD';
    const formattedMonth = eventDate && !isNaN(eventDate.getTime()) ? format(eventDate, 'MMM', { locale: ptBR }).toUpperCase() : 'MÊS';

    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-gray-100 font-sans text-gray-800 -m-6">
            {/* Estilos Globais para Impressão */}
            <style>{`
                @media print {
                    @page { margin: 0; size: A4; }
                    body { background: white; -webkit-print-color-adjust: exact; }
                    .no-print { display: none !important; }
                    .print-area { 
                        display: block !important; 
                        width: 100%; 
                        height: 100%; 
                        position: absolute; 
                        top: 0; 
                        left: 0; 
                        margin: 0; 
                        padding: 0;
                        overflow: visible;
                        background: white;
                    }
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                }
                .font-serif { font-family: 'Playfair Display', serif; }
            `}</style>

            {/* --- BARRA LATERAL (Formulário) --- */}
            <div className="w-full md:w-1/3 bg-white p-6 shadow-xl z-10 overflow-y-auto h-screen no-print border-r border-gray-200">
                <Card className="border-none shadow-none">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                             <ShieldCheck className="text-primary w-6 h-6" />
                            Gestor VIP
                        </CardTitle>
                        <CardDescription>Gere o roteiro do convidado</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                         <div className="space-y-4">
                            <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2 text-sm"><User className="w-4 h-4"/> Convidado</h3>
                            <div>
                                <Label>Nome do Convidado</Label>
                                <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Ex: Pr. Cláudio Duarte" />
                            </div>
                            <div>
                                <Label>Papel/Oficina do Convidado</Label>
                                <Input value={guestRole} onChange={(e) => setGuestRole(e.target.value)} placeholder="Ex: Preletor Principal" />
                            </div>
                        </div>
                        
                        <div className="space-y-4">
                             <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2 text-sm"><MapPin className="w-4 h-4"/> Local da Atividade Principal</h3>
                             <div>
                                <Label>Andar/Setor</Label>
                                <Input name="floor" value={roomDetails.floor} onChange={handleRoomDetailsChange} placeholder="Ex: 3º Andar" />
                            </div>
                             <div>
                                <Label>Sala</Label>
                                <Input name="room" value={roomDetails.room} onChange={handleRoomDetailsChange} placeholder="Ex: Auditório Principal" />
                            </div>
                             <div>
                                <Label>Kit de Sala</Label>
                                <Input name="kit" value={roomDetails.kit} onChange={handleRoomDetailsChange} placeholder="Ex: 1 Microfone, Projetor, Água" />
                            </div>
                        </div>
                        
                         <div className="space-y-4">
                            <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2 text-sm"><Clock className="w-4 h-4"/> Linha do Tempo Logística</h3>
                            {timelineItems.map(item => (
                                <div key={item.id} className="p-3 border rounded-lg space-y-2 bg-slate-50 relative group">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <Label htmlFor={`time-${item.id}`} className="text-xs">Horário</Label>
                                            <Input id={`time-${item.id}`} type="time" value={item.time} onChange={(e) => handleTimelineChange(item.id, 'time', e.target.value)} />
                                        </div>
                                        <div>
                                            <Label htmlFor={`category-${item.id}`} className="text-xs">Categoria</Label>
                                            <Select value={item.category} onValueChange={(v) => handleTimelineChange(item.id, 'category', v)}>
                                                <SelectTrigger id={`category-${item.id}`}><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {Object.keys(categoryConfig).map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div>
                                        <Label htmlFor={`title-${item.id}`} className="text-xs">Título/Ação</Label>
                                        <Input id={`title-${item.id}`} value={item.title} onChange={(e) => handleTimelineChange(item.id, 'title', e.target.value)} />
                                    </div>
                                     <div>
                                        <Label htmlFor={`details-${item.id}`} className="text-xs">Detalhes (Responsável, Local, etc.)</Label>
                                        <Textarea id={`details-${item.id}`} value={item.details} onChange={(e) => handleTimelineChange(item.id, 'details', e.target.value)} rows={3} />
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 text-destructive opacity-50 group-hover:opacity-100" onClick={() => deleteTimelineItem(item.id)}>
                                        <Trash2 className="w-4 h-4"/>
                                    </Button>
                                </div>
                            ))}
                             <Button type="button" variant="outline" className="w-full" onClick={addTimelineItem}>
                                <PlusCircle className="mr-2 w-4 h-4" /> Adicionar Item
                             </Button>
                        </div>

                         <Button 
                            onClick={printPDF}
                            className="w-full mt-6"
                            disabled={!guestName}
                        >
                            <Download className="w-5 h-5 mr-2" /> Salvar PDF / Imprimir
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* --- ÁREA DE PREVIEW (O Documento Real) --- */}
            <div className="w-full md:w-2/3 bg-gray-100 p-8 overflow-y-auto h-screen flex justify-center items-start print-area">
                {guestName ? (
                    <div className="bg-white w-full max-w-[210mm] min-h-[297mm] shadow-2xl p-12 relative print:shadow-none print:w-full print:max-w-none print:h-auto print:p-8">
                        <div className="flex justify-between items-start border-b-2 border-primary pb-6 mb-8">
                            <div>
                                <h1 className="text-4xl font-serif font-bold text-gray-900 tracking-tight">Roteiro do Convidado</h1>
                                <p className="text-primary font-medium text-lg mt-1">{event?.eventName || 'Nome do Evento'}</p>
                            </div>
                            <div className="text-right">
                                <div className="bg-gray-900 text-white px-4 py-2 rounded-lg inline-block">
                                    <span className="text-xs uppercase tracking-widest font-bold block opacity-70">DATA</span>
                                    <span className="text-xl font-bold">{formattedDay} {formattedMonth}</span>
                                </div>
                            </div>
                        </div>

                        <div className="mb-10">
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">Olá, {guestName}!</h2>
                            <p className="text-gray-600 leading-relaxed">
                                Estamos muito felizes com sua presença. Preparamos este roteiro para que seu dia seja tranquilo e você possa focar no que faz de melhor. Qualquer dúvida, nossa equipe de concierge está à disposição.
                            </p>
                        </div>
                        
                         <div className="space-y-0 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                            
                            {timelineItems.map((item, index) => {
                                const config = categoryConfig[item.category] || categoryConfig.Default;
                                const Icon = config.icon;
                                const isEven = index % 2 !== 0;
                                const isHighlight = item.category === 'Ação';
                                
                                const colorClass = {
                                    purple: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200' },
                                    blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
                                    green: { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-200' },
                                    orange: { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200' },
                                    slate: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
                                    primary: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20' },
                                }[config.color] || { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' };

                                return (
                                <div key={item.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active mb-8">
                                    <div className={cn(`flex items-center justify-center rounded-full border border-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 print:border-gray-200`, isHighlight ? 'w-12 h-12 bg-primary' : `w-10 h-10 ${colorClass.bg}`)}>
                                        <Icon className={cn(isHighlight ? 'text-white w-6 h-6' : `${colorClass.text} w-5 h-5`)} />
                                    </div>
                                    <div className={cn(`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] rounded-lg shadow-sm md:ml-6 md:group-odd:mr-6 md:group-odd:ml-0 print:border-gray-300 print:shadow-none`, isHighlight ? `${colorClass.bg} p-6 border-2 ${colorClass.border}` : 'bg-white p-4 border')}>
                                        <div className="flex items-center justify-between space-x-2 mb-1">
                                            <div className={cn('font-bold', isHighlight ? 'text-primary text-lg' : 'text-slate-900')}>{item.title}</div>
                                            <time className="font-mono text-sm font-bold text-primary">{item.time}</time>
                                        </div>
                                        <div className={cn('whitespace-pre-line text-sm', isHighlight ? 'text-primary/90' : 'text-slate-600')}>{item.details}</div>
                                    </div>
                                </div>
                                )
                            })}
                        </div>


                        <div className="mt-16 border-t border-gray-200 pt-6 flex justify-between items-center text-xs text-gray-500">
                            <div>
                                <p className="font-bold text-gray-800 mb-1">CONTATOS DE EMERGÊNCIA (Produção)</p>
                                <p>Guilherme (Logística): (21) 99999-9999</p>
                                <p>Seu Nome (Gestor): (21) 98888-8888</p>
                            </div>
                            <div className="text-right">
                                <p>The School, São Gonçalo - RJ</p>
                                <p>criativamenteibm.com.br</p>
                            </div>
                        </div>

                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <User className="w-16 h-16 mb-4 opacity-50"/>
                        <p className="text-lg font-medium">Digite o nome de um convidado para começar</p>
                        <p className="text-sm">O roteiro aparecerá aqui pronto para impressão.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
