'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, HandHelping, Calendar, UserCheck, AlertTriangle } from 'lucide-react';
import { useDoc, useFirebase } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { submitCheckIn } from './actions';

export default function PublicCheckInPage() {
    const { firestore } = useFirebase();

    // Read query parameters manually to support client-side hydration
    const [areaId, setAreaId] = useState<string | null>(null);
    const [dateParam, setDateParam] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            setAreaId(params.get('areaId'));
            setDateParam(params.get('date'));
        }
    }, []);

    // Format Date (YYYY-MM-DD) into pt-BR (DD/MM/YYYY)
    const formattedDate = useMemo(() => {
        if (!dateParam) return '';
        const [year, month, day] = dateParam.split('-');
        return `${day}/${month}/${year}`;
    }, [dateParam]);

    // Retrieve saved schedule for this area and month
    const selectedMonthString = useMemo(() => {
        if (!dateParam) return '';
        return dateParam.substring(0, 7); // YYYY-MM
    }, [dateParam]);

    const scheduleId = `${areaId}_${selectedMonthString}`;
    
    // Fetch data using hooks
    const { data: schedule, isLoading: isScheduleLoading } = useDoc<any>(areaId && selectedMonthString ? `saved_schedules/${scheduleId}` : null);
    const { data: areaObj, isLoading: isAreaLoading } = useDoc<any>(areaId ? `areas_of_service/${areaId}` : null);
    
    // Fetch all users to map IDs to names
    const [usersList, setUsersList] = useState<any[]>([]);
    const [isUsersLoading, setIsUsersLoading] = useState(true);

    useEffect(() => {
        if (!firestore) return;
        getDocs(collection(firestore, 'users'))
            .then(snap => {
                const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setUsersList(list);
            })
            .catch(err => console.error("Error loading users:", err))
            .finally(() => setIsUsersLoading(false));
    }, [firestore]);

    const userMap = useMemo(() => new Map(usersList.map(u => [u.id, u.name])), [usersList]);

    // Filter items matching the selected date
    const dayScheduleItems = useMemo(() => {
        if (!schedule?.schedule) return [];
        return schedule.schedule.filter((item: any) => item.date === formattedDate);
    }, [schedule, formattedDate]);

    // Check-in flow state
    const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const handleConfirmCheckin = async () => {
        if (selectedItemIndex === null || !areaId || !selectedMonthString || !dateParam) return;
        
        const item = dayScheduleItems[selectedItemIndex];
        if (!item || !item.memberIds || item.memberIds.length === 0) return;

        setIsSubmitting(true);
        setErrorMessage('');

        const res = await submitCheckIn({
            areaId,
            month: selectedMonthString,
            eventName: item.eventName,
            date: item.date,
            slotIndex: item.slotIndex || 0,
            memberId: item.memberIds[0]
        });

        setIsSubmitting(false);

        if (res.success) {
            setIsSuccess(true);
        } else {
            setErrorMessage(res.error || 'Ocorreu um erro ao registrar a presença.');
        }
    };

    const isLoading = isScheduleLoading || isAreaLoading || isUsersLoading;

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50/50 p-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                <p className="text-xs text-slate-500 font-medium">Carregando portal de check-in...</p>
            </div>
        );
    }

    if (!areaId || !dateParam || !schedule) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50/50 p-4">
                <Card className="max-w-md w-full rounded-2xl shadow-md border-slate-150">
                    <CardHeader className="text-center">
                        <AlertTriangle className="size-12 text-red-500 mx-auto mb-2" />
                        <CardTitle className="text-lg">Link Inválido</CardTitle>
                        <CardDescription>
                            Este link de check-in não é válido ou a escala ainda não foi gerada para esta data.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

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
                                <span>{areaObj?.name} — {formattedDate}</span>
                            </CardDescription>
                        </CardHeader>
                        
                        <CardContent className="py-6 space-y-6">
                            {dayScheduleItems.length === 0 ? (
                                <p className="text-center text-slate-400 italic text-sm py-4">Não há voluntários escalados para hoje nesta área.</p>
                            ) : selectedItemIndex === null ? (
                                <div className="space-y-3">
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-2">Quem está servindo hoje?</span>
                                    {dayScheduleItems.map((item: any, idx: number) => {
                                        const hasVolunteers = item.memberIds?.length > 0;
                                        const volunteerName = hasVolunteers ? userMap.get(item.memberIds[0]) : null;
                                        const checkInKey = `${item.date}_${item.eventName}_${item.slotIndex || 0}`;
                                        const checkIn = schedule?.checkIns?.[checkInKey];
                                        const isAlreadyCheckedIn = checkIn?.status === 'present';

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
                                                        {volunteerName || 'Vaga Aberta'}
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
                                            {userMap.get(dayScheduleItems[selectedItemIndex].memberIds[0])}
                                        </p>
                                        <div className="pt-2 border-t border-slate-200 flex justify-between text-xs text-slate-500">
                                            <span>Culto/Evento:</span>
                                            <strong className="text-slate-700">{dayScheduleItems[selectedItemIndex].eventName}</strong>
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
