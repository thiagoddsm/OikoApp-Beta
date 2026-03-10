
'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useFirebase, useDoc } from '@/firebase';
import { setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { doc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

// --- ICONS (SVG Paths for lightweight icons) ---
const Icon = ({ name, size = 20, className = "" }: { name: string; size?: number; className?: string }) => {
    const paths: Record<string, React.ReactNode> = {
        edit: <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />,
        play_arrow: <path d="m5 3 14 9-14 9V3z" />,
        pause: <path d="M6 4h4v16H6zm8 0h4v16h-4z" />,
        description: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></>,
        add: <path d="M12 5v14M5 12h14" />,
        delete: <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />,
        error: <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>,
        print: <><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></>,
        save: <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></>,
        skip_next: <><polygon points="5 4 15 12 5 20 5 4" /><line x1="19" y1="5" x2="19" y2="19" /></>
    };
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
            {paths[name] || <circle cx="12" cy="12" r="10" />}
        </svg>
    );
};


const BRIEFING_DOC_ID = 'current_briefing'; // Using a fixed ID for the single briefing document

export default function CoordenadorPage() {
    const { firestore } = useFirebase();
    const { data: state, isLoading: isBriefingLoading } = useDoc<any>(`briefings/${BRIEFING_DOC_ID}`);
    const [activeTab, setActiveTab] = useState('planning');
    const [now, setNow] = useState(new Date());

     const briefingDocRef = useMemo(
        () => firestore ? doc(firestore, 'briefings', BRIEFING_DOC_ID) : null,
        [firestore]
    );

    useEffect(() => {
        const timerId = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);
    
    const calculateStartTimes = useCallback((items: any[], start: string) => {
        let curr = new Date(`1970-01-01T${start || '00:00'}:00`);
        return items.map(it => {
            const st = isNaN(curr.getTime()) ? '--:--' : curr.toTimeString().slice(0, 5);
            curr.setMinutes(curr.getMinutes() + (Number(it.duration) || 0));
            return { ...it, startTime: st };
        });
    }, []);

    const handleCultInfo = (f: string, v: string) => {
        if (!briefingDocRef || !state) return;
        const newInfo = { ...state.cultInfo, [f]: v };
        if (f === 'startTime') {
            const newItems = calculateStartTimes(state.items, v);
            updateDocumentNonBlocking(briefingDocRef, { cultInfo: newInfo, items: newItems });
        } else {
            updateDocumentNonBlocking(briefingDocRef, { cultInfo: newInfo });
        }
    };
    
     const handleNext = () => {
        if (!state || !briefingDocRef || state.liveState.currentItemIndex >= state.items.length - 1) return;
        const nextIdx = state.liveState.currentItemIndex + 1;
        const newItems = state.items.map((it: any, idx: number) => idx === state.liveState.currentItemIndex ? { ...it, completed: true } : it);
        updateDocumentNonBlocking(briefingDocRef, {
            items: newItems,
            liveState: { ...state.liveState, currentItemIndex: nextIdx, isRunning: true, itemStartTime: Date.now(), accumulatedTime: 0 }
        });
    };

    const toggleTimer = () => {
        if (!state || !briefingDocRef) return;
        const itemStartTime = state.liveState.itemStartTime;
        if (state.liveState.isRunning) {
            const elapsed = itemStartTime ? (Date.now() - itemStartTime) / 1000 : 0;
            updateDocumentNonBlocking(briefingDocRef, {
                liveState: { ...state.liveState, isRunning: false, accumulatedTime: state.liveState.accumulatedTime + elapsed, itemStartTime: null }
            });
        } else {
            updateDocumentNonBlocking(briefingDocRef, { liveState: { ...state.liveState, isRunning: true, itemStartTime: Date.now() } });
        }
    };
    
    const formatTime = (s: number) => {
        const abs = Math.abs(Math.floor(s));
        return `${s < 0 ? '-' : ''}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
    };

    const TimerLogic = ({ duration, liveState }: { duration: number; liveState: any }) => {
        const [elapsed, setElapsed] = useState(liveState.accumulatedTime);
        useEffect(() => {
            if (!liveState.isRunning || !liveState.itemStartTime) {
                setElapsed(liveState.accumulatedTime);
                return;
            }
            const i = setInterval(() => {
                setElapsed(liveState.accumulatedTime + (Date.now() - liveState.itemStartTime) / 1000);
            }, 200);
            return () => clearInterval(i);
        }, [liveState.isRunning, liveState.itemStartTime, liveState.accumulatedTime]);
        
        const remaining = (duration * 60) - elapsed;
        return <>{formatTime(remaining)}</>;
    };

    const PaperView = ({ state }: { state: any }) => {
        if (!state) return null;
        const { cultInfo, staff, items, obsDepartamentos } = state;
        return (
            <div className="paper-view font-sans">
                <div className="flex justify-between items-start border-b-4 border-slate-900 pb-6 mb-8 text-slate-900">
                    <div className="flex-1">
                        <h1 className="text-4xl font-serif font-bold uppercase tracking-tight leading-tight">{cultInfo.titulo}</h1>
                        <p className="text-xl text-slate-600 italic font-serif mt-1">{cultInfo.tema}</p>
                    </div>
                    <div className="text-right">
                        <div className="bg-slate-900 text-white px-4 py-1 mb-2 font-bold uppercase tracking-widest text-[10px] inline-block">Briefing de Evento</div>
                        <div className="text-xl font-bold">{cultInfo.date ? new Date(cultInfo.date + 'T00:00:00').toLocaleDateString('pt-BR') : ''}</div>
                        <div className="text-lg text-slate-500">{cultInfo.startTime}h • {cultInfo.local || 'Auditório'}</div>
                    </div>
                </div>

                <div className="grid grid-cols-12 gap-8 mb-10 text-slate-900">
                    <div className="col-span-4 space-y-6">
                        <section>
                            <h3 className="font-black uppercase text-[10px] text-slate-400 mb-3 border-b border-slate-100 pb-1">Responsáveis</h3>
                            <div className="space-y-2 text-sm">
                                <p><strong className="text-slate-400 uppercase text-[10px]">Mensagem:</strong> {cultInfo.pregador || '-'}</p>
                                <p><strong className="text-slate-400 uppercase text-[10px]">Direção:</strong> {cultInfo.dirigente || '-'}</p>
                            </div>
                        </section>
                        <section>
                            <h3 className="font-black uppercase text-[10px] text-slate-400 mb-3 border-b border-slate-100 pb-1 text-slate-900">Equipe Técnica</h3>
                            <div className="space-y-1 text-sm">
                                {Object.entries(staff).map(([k, v]) => (
                                    <p key={k}><strong className="capitalize text-slate-400 text-[10px] uppercase">{k}:</strong> {String(v || '-')}</p>
                                ))}
                            </div>
                        </section>
                    </div>

                    <div className="col-span-8">
                        <h3 className="font-black uppercase text-[10px] text-slate-400 mb-4 border-b border-slate-100 pb-1 tracking-widest">Liturgia Minuto a Minuto</h3>
                        <div className="space-y-4">
                            {items.map((it: any, i: number) => (
                                <div key={it.id} className="flex gap-4 items-start border-b border-slate-50 pb-2">
                                    <span className="font-mono font-bold text-slate-300 w-12 text-sm">{it.startTime}</span>
                                    <div className="flex-1">
                                        <div className="flex justify-between">
                                            <span className="font-bold text-slate-800">{it.title}</span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">{it.responsible || 'Equipa'}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 italic mt-0.5">{it.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-lg border border-slate-100 text-slate-900">
                    {Object.entries(obsDepartamentos).map(([k, v]) => v && (
                        <div key={k} className="text-xs">
                            <strong className="uppercase text-slate-400 mb-1 block text-[10px] tracking-widest">{k}</strong>
                            <p className="text-slate-600 whitespace-pre-line leading-relaxed">{String(v)}</p>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    if (isBriefingLoading) {
        return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin" /></div>
    }

    if (!state) {
        return (
            <div className="flex items-center justify-center h-screen flex-col gap-4">
                <p>Nenhum briefing encontrado. Criando um novo...</p>
                 <Button onClick={() => {
                     const defaultState = {
                        items: [ { id: '1', title: 'Cronômetro', duration: 5, responsible: 'Mídia', description: 'Contagem regressiva visual', colors: { item: '#334155' }, technical: { lighting: 'Pre-show', sound: 'Background', projection: 'Timer 5min' }, completed: false }, ],
                        cultInfo: { titulo: 'Novo Culto', tema: 'Tema do Culto', date: new Date().toISOString().split('T')[0], startTime: '19:30', pregador: '', dirigente: '', local: 'Templo Sede' },
                        staff: { coordenador: '', som: '', projecao: '', iluminacao: '', transmissao: '', recepcao: '' },
                        obsDepartamentos: { midia: '', musica: '', staff: '', diaconato: '' },
                        liveState: { currentItemIndex: 0, isRunning: false, itemStartTime: null, accumulatedTime: 0, alert: null }
                    };
                    if(briefingDocRef) setDocumentNonBlocking(briefingDocRef, defaultState);
                }}>Criar Briefing Padrão</Button>
            </div>
        )
    }

    const currentItem = state.items[state.liveState.currentItemIndex];
    const nextItem = state.items[state.liveState.currentItemIndex + 1];

    return (
        <>
        <style>{`
            body { font-family: 'Inter', sans-serif; background-color: #020617; color: #f8fafc; }
            .font-mono { font-family: 'JetBrains Mono', monospace; }
            .font-serif { font-family: 'Playfair Display', serif; }
            .glass { background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.05); }
            @media screen {
                .paper-view { width: 210mm; min-height: 297mm; background: white; color: #0f172a; box-shadow: 0 0 50px rgba(0,0,0,0.5); margin: 2rem auto; padding: 20mm; border-radius: 4px; }
            }
            @media print {
                .no-print { display: none !important; }
                body { background: white; color: black; }
                .paper-view { width: 100%; margin: 0; box-shadow: none; padding: 10mm; }
            }
            .timer-display { font-size: clamp(3rem, 12vw, 10rem); font-weight: 900; line-height: 1; }
            input[type="color"] { -webkit-appearance: none; border: none; width: 28px; height: 28px; cursor: pointer; background: transparent; }
            input[type="color"]::-webkit-color-swatch { border-radius: 6px; border: 2px solid rgba(255,255,255,0.1); }
            .no-scrollbar::-webkit-scrollbar { display: none; }
            @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
        `}</style>
        <div className="min-h-screen flex flex-col h-screen overflow-hidden">
             <nav className="glass h-16 shrink-0 flex items-center justify-between px-6 z-50 no-print shadow-2xl">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Icon name="description" className="text-white" size={24} />
                    </div>
                    <div>
                        <h1 className="text-lg font-black uppercase tracking-tighter leading-none">Briefing Pro</h1>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Visão do Coordenador</p>
                    </div>
                </div>

                <div className="flex bg-slate-900/50 p-1 rounded-2xl border border-white/5">
                    {[{ id: 'planning', label: 'Planejamento', icon: 'edit' }, { id: 'live', label: 'Ao Vivo', icon: 'play_arrow' }, { id: 'roteiro', label: 'Roteiro', icon: 'description' }].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-6 py-2 rounded-xl flex items-center gap-2 text-xs font-black uppercase transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-xl scale-105' : 'text-slate-500 hover:text-slate-300'}`}>
                            <Icon name={tab.icon} size={14} /> {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right mr-2 hidden md:block">
                        <div className="text-xl font-mono font-bold text-indigo-400 leading-none">{now.toLocaleTimeString('pt-BR')}</div>
                        <div className="text-[10px] text-slate-600 font-bold uppercase">Relógio Local</div>
                    </div>
                </div>
            </nav>

             <main className="flex-1 overflow-y-auto no-scrollbar relative p-4 md:p-8">
                {activeTab === 'planning' && (
                    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in no-print">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-2 glass p-8 rounded-[2.5rem] space-y-6">
                                <h2 className="text-2xl font-black mb-6">Informações Gerais</h2>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="text-[10px] font-black text-slate-500 uppercase block mb-1 tracking-widest">Título</label>
                                        <input className="w-full bg-slate-800/50 border border-white/5 p-3 rounded-xl focus:border-indigo-500 outline-none font-bold text-slate-100" value={state.cultInfo.titulo} onChange={e => handleCultInfo('titulo', e.target.value)} />
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="text-[10px] font-black text-slate-500 uppercase block mb-1 tracking-widest">Início</label>
                                        <input type="time" className="w-full bg-slate-800/50 border border-white/5 p-3 rounded-xl text-indigo-400 font-mono font-bold" value={state.cultInfo.startTime} onChange={e => handleCultInfo('startTime', e.target.value)} />
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="text-[10px] font-black text-slate-500 uppercase block mb-1 tracking-widest">Direção</label>
                                        <input className="w-full bg-slate-800/50 border border-white/5 p-3 rounded-xl" value={state.cultInfo.dirigente} onChange={e => handleCultInfo('dirigente', e.target.value)} />
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="text-[10px] font-black text-slate-500 uppercase block mb-1 tracking-widest">Mensagem</label>
                                        <input className="w-full bg-slate-800/50 border border-white/5 p-3 rounded-xl" value={state.cultInfo.pregador} onChange={e => handleCultInfo('pregador', e.target.value)} />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="glass p-8 rounded-[2.5rem]">
                                <h2 className="text-lg font-black mb-6 uppercase text-slate-500 tracking-widest">Escala Técnica</h2>
                                <div className="space-y-4">
                                    {Object.keys(state.staff).map(role => (
                                        <div key={role} className="flex flex-col">
                                            <label className="text-[10px] font-bold text-slate-600 uppercase mb-1 tracking-wider">{role}</label>
                                            <input className="bg-transparent border-b border-white/10 text-sm py-1 outline-none focus:border-indigo-500 text-slate-300" value={state.staff[role]} onChange={e => { if(briefingDocRef) updateDocumentNonBlocking(briefingDocRef, { staff: {...state.staff, [role]: e.target.value}})}} placeholder="Responsável" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="glass p-8 rounded-[2.5rem]">
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-2xl font-black">Ordem de Liturgia</h2>
                                <button onClick={() => {
                                    if(!briefingDocRef) return;
                                    const newItem = { id: crypto.randomUUID(), title: 'Novo Momento', duration: 10, responsible: '', description: '', colors: { item: '#4f46e5' }, technical: { lighting: '', sound: '', projection: '' }, completed: false };
                                    const newItems = calculateStartTimes([...state.items, newItem], state.cultInfo.startTime);
                                    updateDocumentNonBlocking(briefingDocRef, { items: newItems });
                                }} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-black text-xs uppercase flex items-center gap-2 hover:bg-indigo-500 transition-all">
                                    <Icon name="add" size={14} /> Adicionar
                                </button>
                            </div>

                            <div className="space-y-4">
                                {state.items.map((it: any, idx: number) => (
                                    <div key={it.id} className="p-6 bg-slate-950/40 rounded-3xl border border-white/5 hover:border-white/10 transition-colors group relative">
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                                            <div className="md:col-span-1 text-center">
                                                <span className="text-xs font-mono font-bold text-indigo-500 block mb-2">{it.startTime}</span>
                                                <input type="color" value={it.colors.item} onChange={e => { if(briefingDocRef) updateDocumentNonBlocking(briefingDocRef, { items: state.items.map((x: any) => x.id === it.id ? { ...x, colors: { ...x.colors, item: e.target.value } } : x) })}} title="Cor Identificadora" />
                                            </div>
                                            <div className="md:col-span-4">
                                                <input className="w-full bg-transparent text-xl font-black outline-none text-slate-100" value={it.title} onChange={e => { if(briefingDocRef) updateDocumentNonBlocking(briefingDocRef, { items: state.items.map((x: any) => x.id === it.id ? { ...x, title: e.target.value } : x) })}} />
                                                <input className="w-full bg-transparent text-xs font-bold text-slate-500 outline-none uppercase mt-1" placeholder="RESPONSÁVEL" value={it.responsible} onChange={e => { if(briefingDocRef) updateDocumentNonBlocking(briefingDocRef, { items: state.items.map((x: any) => x.id === it.id ? { ...x, responsible: e.target.value } : x) })}} />
                                            </div>
                                            <div className="md:col-span-1">
                                                <div className="flex items-center gap-2 bg-black/40 p-2 rounded-xl border border-white/5">
                                                    <input type="number" className="bg-transparent w-8 text-center font-bold text-sm text-indigo-400" value={it.duration} onChange={e => {
                                                         if(!briefingDocRef) return;
                                                         const newItems = state.items.map((x: any) => x.id === it.id ? { ...x, duration: Number(e.target.value) } : x);
                                                         updateDocumentNonBlocking(briefingDocRef, { items: calculateStartTimes(newItems, state.cultInfo.startTime) });
                                                    }} />
                                                    <span className="text-[9px] font-black text-slate-600 uppercase">min</span>
                                                </div>
                                            </div>
                                            <div className="md:col-span-5 grid grid-cols-3 gap-2">
                                                {['lighting', 'sound', 'projection'].map(techKey => (
                                                    <input key={techKey} placeholder={techKey.toUpperCase()} className="bg-white/5 border border-white/5 rounded-lg p-2 text-[10px] outline-none focus:border-indigo-500/50 text-slate-400" value={it.technical[techKey]} onChange={e => { if(briefingDocRef) updateDocumentNonBlocking(briefingDocRef, { items: state.items.map((x: any) => x.id === it.id ? { ...x, technical: { ...x.technical, [techKey]: e.target.value } } : x) })}} title={techKey.toUpperCase()} />
                                                ))}
                                            </div>
                                            <div className="md:col-span-1 text-right">
                                                <button onClick={() => { if(briefingDocRef) updateDocumentNonBlocking(briefingDocRef, { items: calculateStartTimes(state.items.filter((x: any) => x.id !== it.id), state.cultInfo.startTime) })}} className="p-2 text-slate-700 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                                    <Icon name="delete" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
                
                {activeTab === 'live' && (
                     <div className="max-w-7xl mx-auto h-full flex flex-col gap-8 no-print animate-fade-in">
                        <div className="grid grid-cols-12 gap-8 flex-1">
                            <div className="col-span-12 lg:col-span-8 glass p-8 md:p-12 rounded-[3.5rem] flex flex-col justify-between border-2 border-white/5 relative overflow-hidden shadow-2xl">
                                <div className="flex justify-between items-start">
                                    <div className="animate-fade-in" key={currentItem?.id}>
                                        <span className="bg-indigo-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase mb-4 inline-block shadow-lg">Ativo</span>
                                        <h2 className="text-4xl md:text-6xl font-black leading-tight text-white tracking-tight">{currentItem?.title || 'FIM DO EVENTO'}</h2>
                                        <p className="text-xl md:text-2xl text-slate-400 font-medium italic mt-2">{currentItem?.responsible || '-'}</p>
                                    </div>
                                    <div className="flex gap-4">
                                        <button onClick={toggleTimer} className={`p-6 rounded-3xl transition-all shadow-2xl hover:scale-105 active:scale-95 ${state.liveState.isRunning ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'}`}>
                                            <Icon name={state.liveState.isRunning ? 'pause' : 'play_arrow'} size={40} />
                                        </button>
                                        <button onClick={handleNext} className="p-6 bg-indigo-600 text-white rounded-3xl hover:bg-indigo-500 hover:scale-105 active:scale-95 shadow-2xl">
                                            <Icon name="skip_next" size={40} />
                                        </button>
                                    </div>
                                </div>

                                <div className="text-center py-6 md:py-10">
                                    <div className={`timer-display font-mono tracking-tighter text-emerald-500`}>
                                        <TimerLogic duration={currentItem?.duration || 0} liveState={state.liveState} />
                                    </div>
                                    <p className="text-slate-600 font-black uppercase tracking-[0.5em] text-xs md:text-sm mt-4">Tempo Restante</p>
                                </div>

                                <div className="bg-white/5 p-6 rounded-3xl border border-white/5 text-slate-300 mt-4">
                                    <h4 className="text-[10px] font-black uppercase text-indigo-400 mb-2 tracking-widest">Notas Atuais</h4>
                                    <p className="text-lg md:text-xl font-medium leading-relaxed italic">"{currentItem?.description || 'Prosseguir conforme planejado.'}"</p>
                                </div>
                            </div>

                            <div className="col-span-12 lg:col-span-4 flex flex-col gap-6 text-slate-200">
                                <div className="glass p-8 rounded-[2.5rem] flex-1 border border-white/5">
                                    <h3 className="text-slate-500 font-black text-xs uppercase tracking-widest mb-10">Escala Técnica Ativa</h3>
                                    <div className="space-y-12">
                                        {[
                                            { l: 'Iluminação', v: currentItem?.technical?.lighting, c: currentItem?.colors?.item },
                                            { l: 'Projeção', v: currentItem?.technical?.projection, c: '#0ea5e9' },
                                            { l: 'Sonoplastia', v: currentItem?.technical?.sound, c: null }
                                        ].map((t, i) => (
                                            <div key={i} className="flex gap-6 items-start">
                                                {t.c ? (
                                                    <div className="w-14 h-14 rounded-2xl border-4 border-white/10 shrink-0 shadow-2xl" style={{backgroundColor: t.c}}></div>
                                                ) : (
                                                    <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center shrink-0 border border-white/5 text-slate-600"><Icon name="description" size={28}/></div>
                                                )}
                                                <div className="min-w-0">
                                                    <span className="text-slate-600 font-black text-[10px] uppercase block tracking-widest mb-1">{t.l}</span>
                                                    <p className="text-xl font-bold truncate text-slate-200">{t.v || '-'}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-amber-500/10 border border-amber-500/10 p-8 rounded-[2.5rem] h-1/3 shadow-xl">
                                    <span className="text-amber-500 font-black text-[10px] uppercase tracking-widest mb-4 block">A Seguir</span>
                                    {nextItem ? (
                                        <div className="animate-fade-in">
                                            <h4 className="text-2xl md:text-3xl font-black leading-tight text-slate-100">{nextItem.title}</h4>
                                            <p className="text-slate-500 text-sm mt-1 uppercase font-bold">{nextItem.responsible || '-'}</p>
                                        </div>
                                    ) : <p className="text-slate-700 italic font-bold">Agenda Concluída</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'roteiro' && (
                    <div className="animate-fade-in no-scrollbar overflow-y-auto pb-20">
                        <div className="max-w-[210mm] mx-auto">
                            <PaperView state={state} />
                            <div className="flex justify-center mt-12 no-print">
                                <button onClick={() => window.print()} className="bg-white text-slate-900 px-10 py-5 rounded-2xl font-black flex items-center gap-3 shadow-2xl hover:scale-105 transition-transform">
                                    <Icon name="print" /> IMPRIMIR ROTEIRO / PDF
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {state.liveState.alert && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 w-[95%] max-w-4xl bg-red-600 text-white p-10 rounded-[3rem] shadow-[0_0_120px_rgba(220,38,38,0.6)] z-[100] flex items-center gap-10 animate-bounce border-8 border-white/20">
                    <div className="p-5 bg-white/20 rounded-full shrink-0">
                        <Icon name="error" size={60} />
                    </div>
                    <div>
                        <span className="text-xs font-black uppercase tracking-[0.5em] opacity-70">Mensagem da Direção</span>
                        <h2 className="text-4xl md:text-6xl font-black uppercase leading-tight mt-2">{state.liveState.alert.message}</h2>
                    </div>
                </div>
            )}
            
            <div className="fixed bottom-8 right-8 no-print group">
                <button onClick={() => {
                    const msg = prompt("Mensagem para a equipe:");
                    if (msg && briefingDocRef) {
                        updateDocumentNonBlocking(briefingDocRef, { liveState: { ...state.liveState, alert: { message: msg, time: Date.now() } } });
                        setTimeout(() => { if(briefingDocRef) updateDocumentNonBlocking(briefingDocRef, { liveState: { ...state.liveState, alert: null } }) }, 10000);
                    }
                }} className="w-16 h-16 bg-red-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all">
                    <Icon name="error" size={32} />
                </button>
            </div>
        </div>
        </>
    );
};
