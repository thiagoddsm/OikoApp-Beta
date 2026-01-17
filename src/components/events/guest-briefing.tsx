'use client';
import React, { useState } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function GuestBriefingGenerator({ event }: { event: any }) { 
    const [guestName, setGuestName] = useState('');
    const [guestRole, setGuestRole] = useState('');
    const [roomDetails, setRoomDetails] = useState({ floor: '', room: '', kit: '' });

    // Estado do Formulário Logístico
    const [logistics, setLogistics] = useState({
        driverName: "Uber VIP / Voluntário João",
        driverPhone: "(21) 99999-9999",
        pickupTime: "08:00",
        pickupLoc: "Aeroporto SDU / Sua Residência",
        arrivalTime: "09:30",
        lunchTime: "12:30",
        lunchLoc: "Restaurante da Igreja (Área VIP)",
        snackTime: "16:00",
        snackLoc: "Sala dos Preletores (2º Andar)",
        workshopTime: "14:00",
        dinnerTime: "19:00",
        dinnerLoc: "Pizzaria Local (Pós-evento)"
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLogistics({ ...logistics, [e.target.name]: e.target.value });
    };

    const handleRoomDetailsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setRoomDetails({ ...roomDetails, [e.target.name]: e.target.value });
    };

    const printPDF = () => {
        window.print();
    };
    
    const eventDate = event?.date ? new Date(event.date + 'T12:00:00') : null;
    const formattedDay = eventDate ? format(eventDate, 'dd') : 'DD';
    const formattedMonth = eventDate ? format(eventDate, 'MMM', { locale: ptBR }).toUpperCase() : 'MÊS';

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
                             <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2 text-sm"><MapPin className="w-4 h-4"/> Local da Oficina/Palestra</h3>
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
                            <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2 text-sm"><Car className="w-4 h-4"/> Transporte</h3>
                            <div className="grid grid-cols-2 gap-2 mb-2">
                                <Input type="time" name="pickupTime" value={logistics.pickupTime} onChange={handleChange} />
                                <Input type="text" name="driverName" value={logistics.driverName} onChange={handleChange} placeholder="Nome Motorista" />
                            </div>
                            <Input type="text" name="pickupLoc" value={logistics.pickupLoc} onChange={handleChange} placeholder="Local de Busca" />
                        </div>
                        <div className="space-y-4">
                            <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2 text-sm"><Utensils className="w-4 h-4"/> Alimentação</h3>
                            <div className="space-y-2">
                                <Input type="text" name="lunchLoc" value={logistics.lunchLoc} onChange={handleChange} placeholder="Local do Almoço" />
                                <Input type="text" name="snackLoc" value={logistics.snackLoc} onChange={handleChange} placeholder="Local do Lanche" />
                            </div>
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
                            
                            {[
                                { icon: Car, color: 'purple', title: "Transporte & Pickup", time: logistics.pickupTime, details: `Motorista: ${logistics.driverName}\nLocal: ${logistics.pickupLoc}` },
                                { icon: MapPin, color: 'blue', title: "Chegada ao Evento", time: logistics.arrivalTime, details: "Recepção VIP e Credenciamento." },
                                { icon: Utensils, color: 'green', title: "Almoço", time: logistics.lunchTime, details: `Local: ${logistics.lunchLoc}` },
                                { icon: Mic, color: 'primary', title: `Sua Participação: ${guestRole}`, time: logistics.workshopTime, details: `Local: ${roomDetails.floor} - ${roomDetails.room}\nSetup: ${roomDetails.kit}`, highlight: true },
                                { icon: Coffee, color: 'orange', title: "Coffee Break", time: logistics.snackTime, details: `Local: ${logistics.snackLoc}` },
                                { icon: Utensils, color: 'slate', title: "Jantar / Encerramento", time: logistics.dinnerTime, details: `Local: ${logistics.dinnerLoc}` }
                            ].map((item, index) => {
                                const Icon = item.icon;
                                const isEven = index % 2 !== 0;
                                const colorClass = {
                                    purple: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200' },
                                    blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
                                    green: { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-200' },
                                    orange: { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200' },
                                    slate: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
                                    primary: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20' },
                                }[item.color] || { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' };

                                return (
                                <div key={index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active mb-8">
                                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border border-white ${item.highlight ? 'w-12 h-12 bg-primary' : colorClass.bg} shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 print:border-gray-200`}>
                                        <Icon className={`${item.highlight ? 'text-white w-6 h-6' : `${colorClass.text} w-5 h-5`}`} />
                                    </div>
                                    <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] ${item.highlight ? `${colorClass.bg} p-6 border-2 ${colorClass.border}` : 'bg-white p-4 border'} rounded-lg shadow-sm md:ml-6 md:group-odd:mr-6 md:group-odd:ml-0 print:border-gray-300 print:shadow-none`}>
                                        <div className="flex items-center justify-between space-x-2 mb-1">
                                            <div className={`font-bold ${item.highlight ? 'text-primary text-lg' : 'text-slate-900'}`}>{item.title}</div>
                                            <time className="font-mono text-sm font-bold text-primary">{item.time}</time>
                                        </div>
                                        <div className={`whitespace-pre-line text-sm ${item.highlight ? 'text-primary/90' : 'text-slate-600'}`}>{item.details}</div>
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
