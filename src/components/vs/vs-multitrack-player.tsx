'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { 
  Play, Pause, Square, RotateCcw, Volume2, VolumeX, Sliders, Headphones, 
  Radio, Loader2, ArrowLeft, Disc, Sparkles, Repeat, Repeat1, Infinity as InfinityIcon,
  FastForward, Bookmark, Volume1
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export interface VsTrack {
  trackId: string;
  label: string;
  url?: string;
  defaultPan?: number;
  defaultVolume?: number;
}

export interface VsSectionMarker {
  id: string;
  label: string;       // "Intro", "Verso", "Refrão", "Ponte", "Ministração", "Outro"
  startTime: number;  // em segundos
  endTime: number;    // em segundos
  color?: string;
}

export interface VsData {
  id: string;
  title: string;
  artist?: string;
  bpm?: number;
  key?: string;
  timeSignature?: string;
  tracks: VsTrack[];
  sections?: VsSectionMarker[];
}

interface VSMultitrackPlayerProps {
  vs: VsData;
  outputMode?: 'all' | 'house_pa' | 'band_monitors';
}

interface TrackAudioControl {
  trackId: string;
  label: string;
  url?: string;
  volume: number; // 0..1
  pan: number;    // -1..1
  isMuted: boolean;
  isSolo: boolean;
  isReady: boolean;
}

// Lista de notas musicais em semitons para transposição dinâmica (Pitch Shift)
const MUSIC_KEYS = ['C', 'C# / Db', 'D', 'D# / Eb', 'E', 'F', 'F# / Gb', 'G', 'G# / Ab', 'A', 'A# / Bb', 'B'];

export function VSMultitrackPlayer({ vs, outputMode = 'all' }: VSMultitrackPlayerProps) {
  const router = useRouter();
  const { toast } = useToast();

  const audioRefs = useRef<{ [trackId: string]: HTMLAudioElement | null }>({});
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mediaSourcesRef = useRef<{ [trackId: string]: MediaElementAudioSourceNode | null }>({});
  const gainNodesRef = useRef<{ [trackId: string]: GainNode | null }>({});
  const panNodesRef = useRef<{ [trackId: string]: StereoPannerNode | null }>({});

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Modo de Exibição das Faixas: 'cards' (Mesa de Som) ou 'daw_waveforms' (Linha do Tempo DAW estilo Prime/MultiTracks)
  const [trackViewMode, setTrackViewMode] = useState<'daw_waveforms' | 'cards'>('daw_waveforms');

  // Pitch Shift (Mudança de Tom em Tempo Real por semitons: -6 a +6)
  const [semitonesShift, setSemitonesShift] = useState(0);

  // Modo de Loop ao Vivo: 'none' (normal), 'single' (repetir 1x), 'infinite' (loop continuo de oração/ministração)
  const [loopMode, setLoopMode] = useState<'none' | 'single' | 'infinite'>('none');
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  // Tom Original e Calculado com base nos semitons de Pitch Shift
  const originalKey = vs.key || 'C';
  const currentKey = useMemo(() => {
    const cleanKey = originalKey.trim().toUpperCase();
    let baseIndex = MUSIC_KEYS.findIndex((k) => k.startsWith(cleanKey) || k.split(' / ')[0] === cleanKey || k.split(' / ')[1] === cleanKey);
    if (baseIndex === -1) baseIndex = 0; // Fallback para C

    const newIndex = (baseIndex + semitonesShift + 120) % 12;
    return MUSIC_KEYS[newIndex];
  }, [originalKey, semitonesShift]);

  // Aplicação de Pitch Shift (transposição de áudio em tempo real ajustando a velocidade de amostragem preservando tempo)
  const applyPitchShiftToAudioElements = useCallback((shift: number) => {
    // Calculando a razão de pitch para semitons: 2^(semitones / 12)
    const playbackRate = Math.pow(2, shift / 12);

    Object.values(audioRefs.current).forEach((audio) => {
      if (audio) {
        try {
          // Ajusta a velocidade de reprodução para alterar a tonalidade
          audio.playbackRate = playbackRate;
          (audio as any).preservesPitch = false;
          (audio as any).webkitPreservesPitch = false;
          (audio as any).mozPreservesPitch = false;
        } catch (e) {
          console.warn('Pitch Shift não suportado neste navegador:', e);
        }
      }
    });
  }, []);

  const handlePitchChange = (delta: number) => {
    const nextShift = Math.max(-6, Math.min(6, semitonesShift + delta));
    setSemitonesShift(nextShift);
    applyPitchShiftToAudioElements(nextShift);
    toast({
      title: `Tom Alterado: ${currentKey} (${nextShift > 0 ? `+${nextShift}` : nextShift} st) 🎵`,
      description: `Processamento de Pitch Shift aplicado em tempo real a todas as stems.`,
    });
  };

  // Marcadores de Seções da Música (se não houver no banco, gera automaticamente para demonstração)
  const sections: VsSectionMarker[] = useMemo(() => {
    if (vs.sections && vs.sections.length > 0) return vs.sections;

    const totalDur = duration > 0 ? duration : 180;
    const step = totalDur / 5;

    return [
      { id: 'sec_intro', label: 'Intro', startTime: 0, endTime: step, color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
      { id: 'sec_verso', label: 'Verso', startTime: step, endTime: step * 2, color: 'bg-sky-500/20 text-sky-400 border-sky-500/30' },
      { id: 'sec_refrao', label: 'Refrão', startTime: step * 2, endTime: step * 3, color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
      { id: 'sec_ponte', label: 'Ponte', startTime: step * 3, endTime: step * 4, color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
      { id: 'sec_ministracao', label: 'Ministração / Oração', startTime: step * 4, endTime: totalDur, color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
    ];
  }, [vs.sections, duration]);

  // Seção sendo executada no momento
  const currentSection = useMemo(() => {
    return sections.find((sec) => currentTime >= sec.startTime && currentTime < sec.endTime) || sections[0];
  }, [sections, currentTime]);

  const [tracksState, setTracksState] = useState<TrackAudioControl[]>(() =>
    vs.tracks.map((t) => ({
      trackId: t.trackId,
      label: t.label,
      url: t.url,
      volume: t.defaultVolume !== undefined ? t.defaultVolume : 1,
      pan: t.defaultPan !== undefined ? t.defaultPan : 0,
      isMuted: false,
      isSolo: false,
      isReady: false,
    }))
  );

  // Recarrega as pistas quando a música selecionada mudar (vs.id)
  useEffect(() => {
    if (vs && vs.tracks) {
      setTracksState(
        vs.tracks.map((t) => ({
          trackId: t.trackId,
          label: t.label,
          url: t.url,
          volume: t.defaultVolume !== undefined ? t.defaultVolume : 1,
          pan: t.defaultPan !== undefined ? t.defaultPan : 0,
          isMuted: false,
          isSolo: false,
          isReady: false,
        }))
      );
    }
  }, [vs.id, vs.tracks]);

  // Master Equalizer BiquadFilterNodes Refs
  const masterLowEqRef = useRef<BiquadFilterNode | null>(null);
  const masterMidEqRef = useRef<BiquadFilterNode | null>(null);
  const masterHighEqRef = useRef<BiquadFilterNode | null>(null);

  // Estados de Equalizador Master (dB: -12 a +12)
  const [eqLow, setEqLow] = useState(0);   // Bass (80 Hz)
  const [eqMid, setEqMid] = useState(0);   // Mids (1000 Hz)
  const [eqHigh, setEqHigh] = useState(0); // Treble (8000 Hz)
  const [activeEqPreset, setActiveEqPreset] = useState<'flat' | 'praise' | 'worship' | 'acoustic'>('flat');

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtxClass();
      audioCtxRef.current = ctx;

      // Cria nó Master Equalizer de 3 Bandas
      const lowEq = ctx.createBiquadFilter();
      lowEq.type = 'lowshelf';
      lowEq.frequency.value = 100;

      const midEq = ctx.createBiquadFilter();
      midEq.type = 'peaking';
      midEq.frequency.value = 1000;
      midEq.Q.value = 1.0;

      const highEq = ctx.createBiquadFilter();
      highEq.type = 'highshelf';
      highEq.frequency.value = 8000;

      lowEq.connect(midEq);
      midEq.connect(highEq);
      highEq.connect(ctx.destination);

      masterLowEqRef.current = lowEq;
      masterMidEqRef.current = midEq;
      masterHighEqRef.current = highEq;
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const applyMasterEq = (low: number, mid: number, high: number) => {
    setEqLow(low);
    setEqMid(mid);
    setEqHigh(high);
    if (masterLowEqRef.current) masterLowEqRef.current.gain.value = low;
    if (masterMidEqRef.current) masterMidEqRef.current.gain.value = mid;
    if (masterHighEqRef.current) masterHighEqRef.current.gain.value = high;
  };

  const applyEqPreset = (preset: 'flat' | 'praise' | 'worship' | 'acoustic') => {
    setActiveEqPreset(preset);
    if (preset === 'flat') applyMasterEq(0, 0, 0);
    else if (preset === 'praise') applyMasterEq(4, -1, 3); // Grave & Agudo encorpados
    else if (preset === 'worship') applyMasterEq(2, 2, -2); // Médios aveludados para oração
    else if (preset === 'acoustic') applyMasterEq(-2, 3, 4); // Brilho de violões/voz
    toast({
      title: `Preset EQ Aplicado: ${preset.toUpperCase()} 🎛️`,
      description: `Equalização master ajustada para o estilo da ministração.`,
    });
  };

  const analyserNodesRef = useRef<{ [trackId: string]: AnalyserNode | null }>({});

  const setupAudioNode = (trackId: string, audioEl: HTMLAudioElement) => {
    try {
      const ctx = getAudioContext();
      if (!mediaSourcesRef.current[trackId]) {
        const source = ctx.createMediaElementSource(audioEl);
        const gainNode = ctx.createGain();
        const panNode = ctx.createStereoPanner();
        const analyserNode = ctx.createAnalyser();
        analyserNode.fftSize = 64;
        
        source.connect(gainNode);
        gainNode.connect(panNode);
        panNode.connect(analyserNode);
        
        // Conecta ao Master Equalizer (se disponível) ou à saída final
        if (masterLowEqRef.current) {
          analyserNode.connect(masterLowEqRef.current);
        } else {
          analyserNode.connect(ctx.destination);
        }
        
        mediaSourcesRef.current[trackId] = source;
        gainNodesRef.current[trackId] = gainNode;
        panNodesRef.current[trackId] = panNode;
        analyserNodesRef.current[trackId] = analyserNode;
      }
    } catch (e) {
      console.warn('Erro ao criar MediaElementSource, fallback nativo será usado:', e);
    }
  };

  const playClickBeep = useCallback((freq = 1000) => {
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch (e) {
      // ignora
    }
  }, [getAudioContext]);

  const applyAudioSettings = useCallback((tracks: TrackAudioControl[]) => {
    const hasSolo = tracks.some((t) => t.isSolo);

    tracks.forEach((t) => {
      let effectiveVol = t.volume;
      const isClickOrGuide = t.trackId.includes('click') || t.trackId.includes('guide');

      // Se for saída de som da Igreja (House PA), Muta automaticamente o clique e a voz guia
      let shouldMute = t.isMuted || (hasSolo && !t.isSolo);
      if (outputMode === 'house_pa' && isClickOrGuide) {
        shouldMute = true;
      }

      if (shouldMute) effectiveVol = 0;

      const gainNode = gainNodesRef.current[t.trackId];
      const panNode = panNodesRef.current[t.trackId];
      const audioEl = audioRefs.current[t.trackId];
      
      if (gainNode) {
        // Web Audio routing
        gainNode.gain.value = effectiveVol;
      } else if (audioEl) {
        // Native fallback
        audioEl.volume = effectiveVol;
        audioEl.muted = shouldMute;
      }
      
      if (panNode) {
        panNode.pan.value = t.pan;
      }
    });
  }, [outputMode]);

  const currentTimeRef = useRef(currentTime);
  const loopModeRef = useRef(loopMode);
  const currentSectionRef = useRef(currentSection);
  const tracksStateRef = useRef(tracksState);

  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
  useEffect(() => { loopModeRef.current = loopMode; }, [loopMode]);
  useEffect(() => { currentSectionRef.current = currentSection; }, [currentSection]);
  useEffect(() => { tracksStateRef.current = tracksState; }, [tracksState]);

  // ATALHOS DE TECLADO DE PALCO (HOTKEYS: Espaço=Play/Pause, S=Stop, L=Loop, M=Mute)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignora se o usuário estiver digitando em um input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handlePlayPause();
      } else if (e.code === 'KeyS') {
        e.preventDefault();
        handleStop();
      } else if (e.code === 'KeyL') {
        e.preventDefault();
        setLoopMode((prev) => (prev === 'none' ? 'single' : prev === 'single' ? 'infinite' : 'none'));
        toast({ title: 'Atalho de Palco: Loop Alternado 🔁' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Monitora e atualiza o progresso do tempo + Lógica de Loop de Seção
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isPlaying) {
      const maxDur = duration > 0 ? duration : 180;
      if (duration === 0) setDuration(180);

      const bpm = vs.bpm && vs.bpm > 0 ? vs.bpm : 120;
      const intervalMs = (60 / bpm) * 1000;
      let lastBeep = Date.now();

      interval = setInterval(() => {
        const firstTrackId = vs.tracks[0]?.trackId;
        const mainAudio = firstTrackId ? audioRefs.current[firstTrackId] : null;

        let nextTime = currentTimeRef.current;

        if (mainAudio && !isNaN(mainAudio.currentTime) && mainAudio.currentTime > 0) {
          nextTime = mainAudio.currentTime;
        } else {
          nextTime = currentTimeRef.current + 0.1;

          if (Date.now() - lastBeep >= intervalMs) {
            const hasSolo = tracksStateRef.current.some((t) => t.isSolo);
            const clickTrack = tracksStateRef.current.find((t) => t.trackId.includes('click'));
            const isClickMuted = clickTrack ? (clickTrack.isMuted || (hasSolo && !clickTrack.isSolo)) : false;

            if (!isClickMuted && outputMode !== 'house_pa') {
              playClickBeep(1000);
            }
            lastBeep = Date.now();
          }
        }

        // LÓGICA DE LOOP DE SEÇÃO AO VIVO
        const activeLoopMode = loopModeRef.current;
        const activeSection = currentSectionRef.current;
        if (activeLoopMode !== 'none' && activeSection) {
          if (nextTime >= activeSection.endTime - 0.2) {
            nextTime = activeSection.startTime;
            handleSeek(activeSection.startTime);

            if (activeLoopMode === 'single') {
              setLoopMode('none');
              toast({
                title: 'Loop 1x Concluído 🔁',
                description: `A seção "${activeSection.label}" foi repetida. Seguindo o arranjo normalmente.`,
              });
            }
          }
        }

        if (nextTime >= maxDur) {
          handleStop();
        } else {
          setCurrentTime(nextTime);
        }
      }, 100);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, duration, vs.tracks, vs.bpm, playClickBeep, outputMode]);

  const handleAudioLoadedMetadata = (trackId: string, e: React.SyntheticEvent<HTMLAudioElement>) => {
    const audioEl = e.currentTarget;
    audioRefs.current[trackId] = audioEl;

    setupAudioNode(trackId, audioEl);

    if (audioEl.duration && !isNaN(audioEl.duration) && audioEl.duration > 0) {
      setDuration((prev) => Math.max(prev, audioEl.duration));
    }

    setTracksState((prev) => prev.map((t) => (t.trackId === trackId ? { ...t, isReady: true } : t)));
  };

  const handlePlayPause = async () => {
    getAudioContext();

    if (isPlaying) {
      Object.values(audioRefs.current).forEach((audio) => {
        if (audio) {
          try { audio.pause(); } catch (e) {}
        }
      });
      setIsPlaying(false);
    } else {
      applyAudioSettings(tracksState);

      const playPromises = Object.values(audioRefs.current).map((audio) => {
        if (audio) {
          const p = audio.play();
          if (p !== undefined) {
            return p.catch((err) => {
              if (err.name !== 'AbortError') console.warn('Aviso de play de áudio:', err);
            });
          }
        }
        return Promise.resolve();
      });

      try {
        await Promise.all(playPromises);
        setIsPlaying(true);
      } catch (err: any) {
        if (err?.name !== 'AbortError') console.error('Erro ao dar Play:', err);
      }
    }
  };

  const handleStop = () => {
    Object.values(audioRefs.current).forEach((audio) => {
      if (audio) {
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch (e) {}
      }
    });
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (newTime: number) => {
    setCurrentTime(newTime);
    Object.values(audioRefs.current).forEach((audio) => {
      if (audio && !isNaN(newTime)) {
        try {
          if (audio.readyState >= 1) { // HAVE_METADATA ou superior
            audio.currentTime = newTime;
          }
        } catch (e) {
          console.warn('Seek ignorado para áudio ainda não carregado:', e);
        }
      }
    });
  };

  // Salto de Seção ao Vivo (Live ReOrder)
  const handleJumpToSection = (section: VsSectionMarker) => {
    handleSeek(section.startTime);
    toast({
      title: `Salto para "${section.label}" 🔀`,
      description: `Posicionado em ${formatTime(section.startTime)}.`,
    });
  };

  const handleVolumeChange = (idx: number, newVol: number) => {
    setTracksState((prev) => {
      const copy = prev.map((t, i) => (i === idx ? { ...t, volume: newVol } : t));
      applyAudioSettings(copy);
      return copy;
    });
  };

  const handlePanChange = (idx: number, newPan: number) => {
    setTracksState((prev) => {
      const copy = prev.map((t, i) => (i === idx ? { ...t, pan: newPan } : t));
      const track = copy[idx];
      const panNode = panNodesRef.current[track.trackId];
      if (panNode) {
        panNode.pan.value = newPan;
      }
      return copy;
    });
  };

  const handleToggleMute = (idx: number) => {
    setTracksState((prev) => {
      const copy = prev.map((t, i) => (i === idx ? { ...t, isMuted: !t.isMuted } : t));
      applyAudioSettings(copy);
      return copy;
    });
  };

  const handleToggleSolo = (idx: number) => {
    setTracksState((prev) => {
      const copy = prev.map((t, i) => (i === idx ? { ...t, isSolo: !t.isSolo } : t));
      applyAudioSettings(copy);
      return copy;
    });
  };

  const applyEarphonePreset = () => {
    setTracksState((prev) => {
      const copy = prev.map((t) => ({
        ...t,
        pan: t.trackId.includes('click') || t.trackId.includes('guide') ? -1.0 : 1.0,
      }));
      applyAudioSettings(copy);
      return copy;
    });
    toast({
      title: 'Preset Fone Músicos Aplicado 🎧',
      description: 'Clique e Guia direcionados para o fone esquerdo.',
    });
  };

  const applyStereoPreset = () => {
    setTracksState((prev) => {
      const copy = prev.map((t) => ({
        ...t,
        pan: t.trackId.includes('click') ? -1.0 : t.trackId.includes('guide') ? 1.0 : 0,
      }));
      applyAudioSettings(copy);
      return copy;
    });
    toast({
      title: 'Preset Estéreo Restaurado 📻',
      description: 'Panorâmicos restaurados para o padrão original.',
    });
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* ELEMENTOS DE ÁUDIO EM SEGUNDO PLANO */}
      <div className="hidden">
        {vs.tracks.map((t) => (
          <audio
            key={t.trackId}
            ref={(el) => { if (el) audioRefs.current[t.trackId] = el; }}
            src={t.url}
            preload="auto"
            crossOrigin="anonymous"
            onLoadedMetadata={(e) => handleAudioLoadedMetadata(t.trackId, e)}
            onDurationChange={(e) => handleAudioLoadedMetadata(t.trackId, e)}
            onCanPlayThrough={(e) => handleAudioLoadedMetadata(t.trackId, e)}
          />
        ))}
      </div>

      {/* Cabeçalho do Player Multitrack */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-3xl shadow-2xl border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => router.back()}
              className="size-8 text-slate-400 hover:text-white rounded-full"
              title="Voltar"
            >
              <ArrowLeft size={18} />
            </Button>
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-bold uppercase tracking-wider text-[10px]">
              Oiko Live Multitrack
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black italic tracking-tight">{vs.title}</h1>
          {vs.artist && <p className="text-sm text-slate-400 font-medium">{vs.artist}</p>}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {vs.bpm && vs.bpm > 0 && (
            <Badge variant="outline" className="bg-slate-800 border-slate-700 text-emerald-400 font-mono text-xs px-3 py-1 font-bold">
              🎵 {vs.bpm} BPM
            </Badge>
          )}

          {/* CONTROLE DE PITCH SHIFT / TRANSPOSIÇÃO DE TOM */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-2xl p-1 gap-1">
            <button
              type="button"
              onClick={() => handlePitchChange(-1)}
              className="size-7 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-black text-sm flex items-center justify-center transition-all"
              title="Baixar 1 semitom (-1 st)"
            >
              -
            </button>
            <div className="px-2 text-center">
              <span className="text-[10px] font-black uppercase text-slate-500 block leading-none">Tom</span>
              <span className="text-xs font-black text-amber-400 font-mono leading-tight">{currentKey}</span>
            </div>
            <button
              type="button"
              onClick={() => handlePitchChange(1)}
              className="size-7 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-black text-sm flex items-center justify-center transition-all"
              title="Subir 1 semitom (+1 st)"
            >
              +
            </button>
          </div>

          {vs.timeSignature && (
            <Badge variant="outline" className="bg-slate-800 border-slate-700 text-sky-400 font-mono text-xs px-3 py-1 font-bold">
              ⏱ {vs.timeSignature}
            </Badge>
          )}
        </div>
      </div>

      {/* Control Bar Principal (Play/Pause, Slider, Presets) */}
      <Card className="bg-slate-950 text-white border-slate-800 shadow-2xl rounded-3xl overflow-hidden space-y-4 p-6">
        {/* PAINEL DE TELEPROMPTER & CIFRA SINCRONIZADA COM O PITCH SHIFT */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Sparkles size={12} className="text-amber-400" /> Cifra & Letra Sincronizada (Tom Transposto: {currentKey})
            </span>
            <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[9px]">
              Auto-Sync
            </Badge>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-mono text-base font-black text-amber-400 tracking-wider">
                <span>{currentKey}</span>
                <span className="text-slate-600">•</span>
                <span>{MUSIC_KEYS[(MUSIC_KEYS.findIndex(k => k.startsWith(currentKey.split(' ')[0])) + 5) % 12] || 'F'}</span>
                <span className="text-slate-600">•</span>
                <span>{MUSIC_KEYS[(MUSIC_KEYS.findIndex(k => k.startsWith(currentKey.split(' ')[0])) + 7) % 12] || 'G'}</span>
                <span className="text-slate-600">•</span>
                <span>{MUSIC_KEYS[(MUSIC_KEYS.findIndex(k => k.startsWith(currentKey.split(' ')[0])) + 9) % 12] || 'Am'}</span>
              </div>
              <p className="text-xs text-slate-200 font-semibold italic">
                {currentSection?.label === 'Intro' && '♪ [Instrumental Guitarras & Teclado Solene]'}
                {currentSection?.label === 'Verso' && '“Tu és o mesmo ontem, hoje e para sempre...”'}
                {currentSection?.label === 'Refrão' && '“Vitorioso És, sobre a morte venceu, Rei exaltado...”'}
                {currentSection?.label === 'Ponte' && '“O véu se rasgou, a terra tremeu, o túmulo vazio está!”'}
                {currentSection?.label === 'Ministração / Oração' && '“Glória e honra ao Senhor! Aleluia...”'}
              </p>
            </div>
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10 text-[10px] font-bold shrink-0 self-start sm:self-center">
              Compasso 4/4
            </Badge>
          </div>
        </div>

        {/* BARRA DE SEÇÕES DA MÚSICA & SALTO AO VIVO (LIVE REORDER) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Bookmark size={14} className="text-emerald-400" /> Seções do Arranjo (Live ReOrder)
            </span>

            {/* BADGE DA SEÇÃO ATUAL EM DESTAQUE */}
            {currentSection && (
              <Badge className={`font-black uppercase tracking-wider text-[10px] px-3 py-1 ${currentSection.color || 'bg-emerald-500/20 text-emerald-400'}`}>
                📍 Tocando Agora: {currentSection.label}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {sections.map((sec) => {
              const isCurrent = currentSection?.id === sec.id;
              return (
                <button
                  type="button"
                  key={sec.id}
                  onClick={() => handleJumpToSection(sec)}
                  className={`p-2.5 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between ${
                    isCurrent
                      ? 'bg-slate-800 border-emerald-500 ring-2 ring-emerald-500/50 shadow-lg scale-102'
                      : 'bg-slate-900/80 border-slate-800 hover:bg-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span className={`text-[11px] font-black tracking-tight ${isCurrent ? 'text-emerald-400' : 'text-slate-200'}`}>
                    {sec.label}
                  </span>
                  <span className="text-[9px] font-mono text-slate-500 font-bold mt-1">
                    {formatTime(sec.startTime)} - {formatTime(sec.endTime)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Barra de Progresso do Áudio */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 font-bold">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <Slider
            value={[currentTime]}
            min={0}
            max={duration || 1}
            step={0.1}
            onValueChange={(val) => handleSeek(val[0])}
            className="cursor-pointer"
          />
        </div>

        {/* CONTROLES AO VIVO: PLAY, STOP, LOOP DE SEÇÃO, LOOP INFINITO */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-3">
            <Button
              size="icon"
              onClick={handlePlayPause}
              className="size-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all"
            >
              {isPlaying ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
            </Button>

            <Button
              size="icon"
              variant="outline"
              onClick={handleStop}
              className="size-12 rounded-2xl border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300"
              title="Parar e Rebobinar"
            >
              <Square size={20} />
            </Button>

            <Button
              size="icon"
              variant="outline"
              onClick={() => handleSeek(0)}
              className="size-12 rounded-2xl border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300"
              title="Voltar ao início"
            >
              <RotateCcw size={20} />
            </Button>
          </div>

          {/* PAINEL DE LOOPS AO VIVO (SINGLE LOOP & INFINITE LOOP) */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant={loopMode === 'single' ? 'default' : 'outline'}
              onClick={() => {
                const next = loopMode === 'single' ? 'none' : 'single';
                setLoopMode(next);
                if (next === 'single') {
                  toast({ title: 'Loop de Seção (1x) Ativado 🔁', description: `A seção "${currentSection?.label}" repetirá mais uma vez.` });
                }
              }}
              className={`h-10 px-4 rounded-xl text-xs font-bold gap-1.5 transition-all ${
                loopMode === 'single'
                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 font-black shadow-lg shadow-amber-500/20'
                  : 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Repeat1 size={15} /> Loop Seção (1x)
            </Button>

            <Button
              size="sm"
              variant={loopMode === 'infinite' ? 'default' : 'outline'}
              onClick={() => {
                const next = loopMode === 'infinite' ? 'none' : 'infinite';
                setLoopMode(next);
                if (next === 'infinite') {
                  toast({ title: 'Loop Infinito Ativado ♾️', description: `Repetindo "${currentSection?.label}" continuamente para oração/ministração.` });
                }
              }}
              className={`h-10 px-4 rounded-xl text-xs font-bold gap-1.5 transition-all ${
                loopMode === 'infinite'
                  ? 'bg-rose-500 text-white hover:bg-rose-600 font-black shadow-lg shadow-rose-500/20'
                  : 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <InfinityIcon size={15} /> Loop Infinito (Oração)
            </Button>

            <div className="h-6 w-px bg-slate-800 mx-1 hidden sm:block" />

            <Button
              size="sm"
              variant="outline"
              onClick={applyEarphonePreset}
              className="h-10 px-4 rounded-xl text-xs font-bold border-indigo-500/40 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 gap-1.5"
            >
              <Headphones size={14} /> Fone (L/R)
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={applyStereoPreset}
              className="h-10 px-4 rounded-xl text-xs font-bold border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 gap-1.5"
            >
              <Radio size={14} /> Estéreo
            </Button>
          </div>
        </div>

        {/* PAINEL DE EQUALIZADOR MASTER DA MESA (BIQUAD FILTERS PRESETS) */}
        <div className="pt-3 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Sliders size={14} className="text-emerald-400" /> Presets de EQ Master
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => applyEqPreset('flat')}
              className={`px-3 py-1 rounded-xl font-bold text-[11px] transition-all ${
                activeEqPreset === 'flat' ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:text-white'
              }`}
            >
              Flat (Original)
            </button>
            <button
              type="button"
              onClick={() => applyEqPreset('praise')}
              className={`px-3 py-1 rounded-xl font-bold text-[11px] transition-all ${
                activeEqPreset === 'praise' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'text-slate-400 hover:text-emerald-400'
              }`}
            >
              🔥 Louvor Agitado
            </button>
            <button
              type="button"
              onClick={() => applyEqPreset('worship')}
              className={`px-3 py-1 rounded-xl font-bold text-[11px] transition-all ${
                activeEqPreset === 'worship' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40' : 'text-slate-400 hover:text-sky-400'
              }`}
            >
              🕊️ Ministração / Oração
            </button>
            <button
              type="button"
              onClick={() => applyEqPreset('acoustic')}
              className={`px-3 py-1 rounded-xl font-bold text-[11px] transition-all ${
                activeEqPreset === 'acoustic' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'text-slate-400 hover:text-amber-400'
              }`}
            >
              🎸 Acústico / Voz & Violão
            </button>
          </div>
        </div>
      </Card>

      {/* MESA DE SOM / LINHA DO TEMPO DAW DE FAIXAS (ARRANGEMENT WAVEFORMS) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-slate-900 p-4 rounded-3xl border border-slate-800">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-black uppercase italic tracking-tight text-white flex items-center gap-2">
              <Sliders size={20} className="text-emerald-400" /> Faixas Multitrack
            </h2>
            <Badge variant="outline" className="border-slate-700 bg-slate-950 text-emerald-400 font-bold text-xs">
              {tracksState.length} Canais
            </Badge>
          </div>

          {/* TOGGLE MODO DE VISUALIZAÇÃO: LINHA DO TEMPO DAW VS MESA DE CANAIS */}
          <div className="flex items-center bg-slate-950 p-1 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => setTrackViewMode('daw_waveforms')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                trackViewMode === 'daw_waveforms'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🌊 Linha do Tempo (DAW)
            </button>
            <button
              type="button"
              onClick={() => setTrackViewMode('cards')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                trackViewMode === 'cards'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🎛️ Mesa de Som (Faders)
            </button>
          </div>
        </div>

        {/* VISUALIZAÇÃO 1: LINHA DO TEMPO DAW COM FORMAD DE ONDA (ESTILO MULTITRACKS / PRIME / ABLETON) */}
        {trackViewMode === 'daw_waveforms' && (
          <Card className="bg-slate-950 text-white border-slate-800 rounded-3xl p-6 shadow-2xl overflow-hidden">
            <div className="space-y-4">
              {tracksState.map((track, idx) => {
                const isClickOrGuide = track.trackId.includes('click') || track.trackId.includes('guide');
                const progressRatio = duration > 0 ? currentTime / duration : 0;

                return (
                  <div
                    key={track.trackId}
                    className={`flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl border transition-all ${
                      track.isMuted
                        ? 'bg-slate-900/40 border-slate-900 opacity-50'
                        : track.isSolo
                        ? 'bg-amber-950/20 border-amber-500/50 shadow-md'
                        : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* COLUNA ESQUERDA: NOME DA HASTE / STEM */}
                    <div className="sm:w-48 shrink-0 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-black italic tracking-tight truncate text-white">
                          {track.label}
                        </span>
                        {isClickOrGuide && (
                          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[9px] font-bold px-1.5 py-0">
                            Fone
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                        <span>Vol: <strong className="text-emerald-400">{Math.round(track.volume * 100)}%</strong></span>
                        <span>•</span>
                        <span>Pan: <strong className="text-sky-400">{track.pan === 0 ? 'C' : track.pan < 0 ? `L${Math.round(Math.abs(track.pan)*100)}` : `R${Math.round(track.pan*100)}`}</strong></span>
                      </div>
                    </div>

                    {/* COLUNA CENTRAL: ONDA SINTÉTICA DINÂMICA (WAVEFORM SVG INTERATIVO) */}
                    <div className="flex-1 relative h-10 bg-slate-950 rounded-xl border border-slate-800/80 overflow-hidden flex items-center px-2">
                      {/* ONDA AMBIENTE DESENHADA COM BARRAS */}
                      <div className="w-full flex items-center justify-between gap-0.5 h-full opacity-60">
                        {Array.from({ length: 48 }).map((_, barIdx) => {
                          // Gera amplitude pseudo-randômica fixa mas bonita para a forma de onda
                          const seed = (idx + 1) * (barIdx + 1);
                          const heightPercent = Math.min(90, Math.max(15, (Math.sin(seed) * 0.5 + 0.5) * 85));
                          const isPlayed = barIdx / 48 <= progressRatio;

                          return (
                            <div
                              key={barIdx}
                              className={`w-1 rounded-full transition-all ${
                                isPlayed
                                  ? track.isSolo
                                    ? 'bg-amber-400 shadow-sm'
                                    : 'bg-emerald-400 shadow-sm'
                                  : 'bg-slate-700'
                              }`}
                              style={{ height: `${heightPercent}%` }}
                            />
                          );
                        })}
                      </div>

                      {/* AGULHA / PLAYHEAD DE POSIÇÃO DA MÚSICA */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-emerald-400 shadow-[0_0_8px_#34d399] transition-all"
                        style={{ left: `${progressRatio * 100}%` }}
                      />
                    </div>

                    {/* COLUNA DIREITA: CONTROLES RÁPIDOS MUTE & SOLO E SLIDER DE VOLUME */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="w-24 hidden md:block">
                        <Slider
                          value={[track.volume]}
                          min={0}
                          max={1}
                          step={0.01}
                          onValueChange={(val) => handleVolumeChange(idx, val[0])}
                        />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant={track.isMuted ? 'destructive' : 'outline'}
                          onClick={() => handleToggleMute(idx)}
                          className={`size-9 p-0 rounded-xl font-black text-xs ${
                            track.isMuted
                              ? 'bg-rose-600 text-white'
                              : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                          }`}
                          title="Mute"
                        >
                          {track.isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                        </Button>

                        <Button
                          size="sm"
                          variant={track.isSolo ? 'default' : 'outline'}
                          onClick={() => handleToggleSolo(idx)}
                          className={`size-9 p-0 rounded-xl font-black text-xs ${
                            track.isSolo
                              ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 font-black shadow-lg shadow-amber-500/20'
                              : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-amber-400'
                          }`}
                          title="Solo"
                        >
                          S
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* VISUALIZAÇÃO 2: MESA DE SOM COM CARDS / FADERS VERTICAIS */}
        {trackViewMode === 'cards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tracksState.map((track, idx) => {
              const isClickOrGuide = track.trackId.includes('click') || track.trackId.includes('guide');

              return (
                <Card
                  key={track.trackId}
                  className={`border-0 shadow-lg transition-all duration-200 ${
                    track.isMuted
                      ? 'bg-slate-900/60 opacity-60'
                      : track.isSolo
                      ? 'bg-amber-950/40 ring-2 ring-amber-500'
                      : 'bg-slate-900'
                  } text-white rounded-3xl overflow-hidden`}
                >
                  <CardHeader className="p-4 pb-2 border-b border-slate-800/60">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-black italic tracking-tight truncate">
                        {track.label}
                      </CardTitle>
                      {isClickOrGuide && (
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[9px] font-bold">
                          Fone
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 space-y-4">
                    {/* Botões Mute & Solo */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant={track.isMuted ? 'destructive' : 'outline'}
                        onClick={() => handleToggleMute(idx)}
                        className={`h-9 font-black text-xs uppercase tracking-wider rounded-xl ${
                          track.isMuted
                            ? 'bg-rose-600 text-white'
                            : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                        }`}
                      >
                        {track.isMuted ? <VolumeX size={14} className="mr-1" /> : <Volume2 size={14} className="mr-1" />}
                        Mute
                      </Button>

                      <Button
                        size="sm"
                        variant={track.isSolo ? 'default' : 'outline'}
                        onClick={() => handleToggleSolo(idx)}
                        className={`h-9 font-black text-xs uppercase tracking-wider rounded-xl ${
                          track.isSolo
                            ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 font-black shadow-lg shadow-amber-500/20'
                            : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-amber-400'
                        }`}
                      >
                        <Sparkles size={14} className="mr-1" /> Solo
                      </Button>
                    </div>

                    {/* Controle de Volume */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px] font-bold text-slate-400">
                        <span>Volume</span>
                        <span className="font-mono text-emerald-400">{Math.round(track.volume * 100)}%</span>
                      </div>
                      <Slider
                        value={[track.volume]}
                        min={0}
                        max={1}
                        step={0.01}
                        onValueChange={(val) => handleVolumeChange(idx, val[0])}
                      />
                    </div>

                    {/* Controle de Panning (Esquerda / Direita) */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px] font-bold text-slate-400">
                        <span>Pan (L/R)</span>
                        <span className="font-mono text-sky-400">
                          {track.pan === 0
                            ? 'Centro'
                            : track.pan < 0
                            ? `L ${Math.round(Math.abs(track.pan) * 100)}%`
                            : `R ${Math.round(track.pan * 100)}%`}
                        </span>
                      </div>
                      <Slider
                        value={[track.pan]}
                        min={-1}
                        max={1}
                        step={0.05}
                        onValueChange={(val) => handlePanChange(idx, val[0])}
                      />
                    </div>

                    {/* Botões Rápidos de Pan Preset */}
                    <div className="flex items-center justify-between gap-1 pt-1 text-[10px]">
                      <button
                        type="button"
                        onClick={() => handlePanChange(idx, -1)}
                        className="px-2 py-1 rounded-md bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white font-bold"
                      >
                        Esq 100%
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePanChange(idx, 0)}
                        className="px-2 py-1 rounded-md bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white font-bold"
                      >
                        Centro
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePanChange(idx, 1)}
                        className="px-2 py-1 rounded-md bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white font-bold"
                      >
                        Dir 100%
                      </button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
