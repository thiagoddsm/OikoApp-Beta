'use client';
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, HandHelping, Calendar, UserCheck, AlertTriangle, UserPlus, ArrowLeft } from 'lucide-react';
import { getPublicCheckInData, submitCheckIn } from './actions';

export default function PublicCheckInPage() {
    const [areaId, setAreaId] = useState<string | null>(null);
    const [dateParam, setDateParam] = useState<string | null>(null);

    const [loading, setLoading] = useState(true);
    const [checkInData, setCheckInData] = useState<any>(null);
    const [loadError, setLoadError] = useState('');

    // Flow states
    const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
    const [isAvulsoMode, setIsAvulsoMode] = useState(false);
    const [selectedAvulsoMemberId, setSelectedAvulsoMemberId] = useState<string>('');
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const loadData = (aId: string, dt: string) => {
        setLoading(true);
        getPublicCheckInData(aId, dt)
            .then(res => {
                if (res.success && res.data) {
                    setCheckInData(res.data);
                } else {
                    setLoadError(res.error || 'Erro ao carregar escala.');
                }
            })
            .catch(err => {
                console.error(err);
                setLoadError('Erro ao carregar dados do servidor.');
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const aId = params.get('areaId');
            const dt = params.get('date');
            setAreaId(aId);
            setDateParam(dt);

            if (aId && dt) {
                loadData(aId, dt);
            } else {
                setLoading(false);
            }
        }
    }, []);

    const handleConfirmCheckin = async () => {
        if (!areaId || !checkInData || !dateParam) return;
        
        let memberId = '';
        let eventName = 'Serviço Voluntário Extra';
        let slotIndex = -1;

        if (isAvulsoMode) {
            memberId = selectedAvulsoMemberId;
            if (!memberId) {
                setErrorMessage('Por favor, selecione seu nome.');
                return;
            }
        } else {
            if (selectedItemIndex === null) return;
            const item = checkInData.slots[selectedItemIndex];
            if (!item || !item.volunteerId) return;
            memberId = item.volunteerId;
            eventName = item.eventName;
            slotIndex = item.slotIndex;
        }

        setIsSubmitting(true);
        setErrorMessage('');

        const res = await submitCheckIn({
            areaId,
            month: checkInData.monthString,
            eventName,
            date: checkInData.date,
            slotIndex,
            memberId,
            isAvulso: isAvulsoMode
        });

        setIsSubmitting(false);

        if (res.success) {
            setIsSuccess(true);
        } else {
            setErrorMessage(res.error || 'Ocorreu um erro ao registrar a presença.');
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50/50 p-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                <p className="text-xs text-slate-500 font-medium">Carregando portal de check-in...</p>
            </div>
        );
    }

    if (!areaId || !dateParam || loadError || !checkInData) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50/50 p-4">
                <Card className="max-w-md w-full rounded-2xl shadow-md border-slate-150 bg-white">
                    <CardHeader className="text-center">
                        <AlertTriangle className="size-12 text-red-500 mx-auto mb-2" />
                        <CardTitle className="text-lg">Link Inválido</CardTitle>
                        <CardDescription>
                            {loadError || 'Este link de check-in não é válido ou os parâmetros estão incorretos.'}
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    const hasSlots = checkInData.slots && checkInData.slots.length > 0;

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50/50 p-4">
            <Card className="max-w-md w-full rounded-3xl shadow-xl border-slate-150 overflow-hidden bg-white">
                {isSuccess ? (
                    <CardContent className="py-12 text-center space-y-4">
                        <div className="size-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-100 animate-bounce">
                            <CheckCircle className="size-12 text-emerald-500" />
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-xl font-black text-slate-800">Presença Confirmada!</h2>
                            <p className="text-sm text-slate-500">Obrigado por servir hoje na casa do Senhor!</p>
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-250 hover:bg-emerald-100 text-[10px] py-1 px-3">
                            Check-in Realizado ✅
                        </Badge>
                        <div className="pt-4">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-xs h-8"
                                onClick={() => {
                                    setIsSuccess(false);
                                    setSelectedItemIndex(null);
                                    setIsAvulsoMode(false);
                                    setSelectedAvulsoMemberId('');
                                    loadData(areaId, dateParam);
                                }}
                            >
                                Fazer outro Check-in
                            </Button>
                        </div>
                    </CardContent>
                ) : (
                    <>
                        <CardHeader className="bg-gradient-to-br from-primary/5 to-purple-50 pb-6 text-center border-b border-slate-100">
                            <div className="size-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                                <HandHelping className="size-6 text-primary" />
                            </div>
                            <CardTitle className="text-lg font-black text-slate-800">Check-in de Voluntários</CardTitle>
                            <CardDescription className="flex items-center justify-center gap-1.5 text-xs text-slate-500 font-bold mt-1">
                                <Calendar className="size-3.5" />
                                <span>{checkInData.areaName} — {checkInData.date}</span>
                            </CardDescription>
                        </CardHeader>
                        
                        <CardContent className="py-6 space-y-6">
                            {selectedItemIndex === null && !isAvulsoMode ? (
                                <div className="space-y-4">
                                    {hasSlots ? (
                                        <div className="space-y-3">
                                            <span className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-2">Quem está servindo hoje?</span>
                                            {checkInData.slots.map((item: any, idx: number) => {
                                                const hasVolunteers = !!item.volunteerId;
                                                const isAlreadyCheckedIn = item.checkInStatus === 'present';

                                                return (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        disabled={!hasVolunteers || isAlreadyCheckedIn}
                                                        onClick={() => setSelectedItemIndex(idx)}
                                                        className={`w-full p-4 border rounded-2xl flex items-center justify-between text-left transition-all ${
                                                            isAlreadyCheckedIn 
                                                                ? 'bg-emerald-50/30 border-emerald-150 cursor-not-allowed opacity-80' 
                                                                : hasVolunteers
                                                                    ? 'border-slate-200 hover:border-primary hover:bg-primary/5 active:scale-[0.99] cursor-pointer'
                                                                    : 'bg-slate-25/20 border-slate-150 cursor-not-allowed opacity-50'
                                                        }`}
                                                    >
                                                        <div className="space-y-1 pr-4">
                                                            <p className="text-xs font-bold text-slate-700">{item.eventName}</p>
                                                            <p className="text-xs text-slate-500 font-bold">
                                                                {item.volunteerName || 'Vaga Aberta'}
                                                            </p>
                                                        </div>
                                                        {isAlreadyCheckedIn ? (
                                                            <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-bold border-emerald-200">Presente</Badge>
                                                        ) : hasVolunteers ? (
                                                            <span className="text-[10px] font-bold text-primary flex items-center gap-1">Check-in →</span>
                                                        ) : (
                                                            <Badge variant="outline" className="text-slate-400 border-slate-250 text-[10px]">Vago</Badge>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-center py-4 space-y-2">
                                            <p className="text-slate-500 text-xs font-medium">Nenhuma escala oficial foi programada ou salva para hoje.</p>
                                            <p className="text-[10px] text-slate-400">Você ainda pode realizar o check-in extra abaixo.</p>
                                        </div>
                                    )}

                                    <div className="pt-2 border-t border-slate-100">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="w-full h-10 text-xs font-bold rounded-2xl"
                                            onClick={() => setIsAvulsoMode(true)}
                                        >
                                            <UserPlus className="size-4 mr-2" />
                                            {hasSlots ? 'Não estou na lista (Check-in Extra)' : 'Fazer Check-in Extra'}
                                        </Button>
                                    </div>
                                </div>
                            ) : isAvulsoMode ? (
                                <div className="space-y-5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Check-in Extra</span>
                                        <button 
                                            type="button" 
                                            onClick={() => {
                                                setIsAvulsoMode(false);
                                                setSelectedAvulsoMemberId('');
                                                setErrorMessage('');
                                            }}
                                            className="text-xs font-bold text-slate-500 flex items-center gap-1 hover:text-slate-800"
                                        >
                                            <ArrowLeft className="size-3" /> Voltar
                                        </button>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="vol-select">Procure seu nome na lista</Label>
                                        <Select 
                                            value={selectedAvulsoMemberId} 
                                            onValueChange={(val) => {
                                                setSelectedAvulsoMemberId(val);
                                                setErrorMessage('');
                                            }}
                                        >
                                            <SelectTrigger id="vol-select" className="bg-white h-11 rounded-2xl">
                                                <SelectValue placeholder="Selecione seu nome..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {checkInData.areaVolunteers?.map((v: any) => (
                                                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {errorMessage && (
                                        <p className="text-xs text-red-500 font-semibold bg-red-50 p-3 rounded-xl border border-red-150">
                                            ⚠️ {errorMessage}
                                        </p>
                                    )}

                                    <Button
                                        type="button"
                                        disabled={isSubmitting || !selectedAvulsoMemberId}
                                        onClick={handleConfirmCheckin}
                                        className="w-full h-11 text-xs font-bold rounded-2xl"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Registrando...
                                            </>
                                        ) : (
                                            <>
                                                <UserCheck className="size-4.5 mr-2" /> Confirmar Minha Presença
                                            </>
                                        )}
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    <div className="bg-slate-50 border rounded-2xl p-4 space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Voluntário</span>
                                            <button 
                                                type="button" 
                                                onClick={() => setSelectedItemIndex(null)}
                                                className="text-xs font-bold text-slate-500 hover:text-slate-800"
                                            >
                                                Alterar
                                            </button>
                                        </div>
                                        <p className="text-sm font-bold text-slate-800">
                                            {checkInData.slots[selectedItemIndex!].volunteerName}
                                        </p>
                                        <div className="pt-2 border-t border-slate-200 flex justify-between text-xs text-slate-500">
                                            <span>Culto/Evento:</span>
                                            <strong className="text-slate-700">{checkInData.slots[selectedItemIndex!].eventName}</strong>
                                        </div>
                                    </div>

                                    {errorMessage && (
                                        <p className="text-xs text-red-500 font-semibold bg-red-50 p-3 rounded-xl border border-red-150">
                                            ⚠️ {errorMessage}
                                        </p>
                                    )}

                                    <Button
                                        type="button"
                                        disabled={isSubmitting}
                                        onClick={handleConfirmCheckin}
                                        className="w-full h-11 text-xs font-bold rounded-2xl"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Confirmando...
                                            </>
                                        ) : (
                                            <>
                                                <UserCheck className="size-4.5 mr-2" /> Confirmar Minha Presença
                                            </>
                                        )}
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </>
                )}
            </Card>
        </div>
    );
}
