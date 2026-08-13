'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { 
  Play, Pause, Square, RotateCcw, Volume2, VolumeX, Sliders, Headphones, 
  Radio, Loader2, ArrowLeft, Disc, Sparkles, Volume1
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export interface VsTrack {
  trackId: string;
  label: string;
  url: string;
  defaultPan?: number;
  defaultVolume?: number;
}

export interface VsData {
  id: string;
  title: string;
  artist?: string;
  bpm?: number;
  key?: string;
  timeSignature?: string;
  tracks: VsTrack[];
}

interface VSMultitrackPlayerProps {
  vs: VsData;
}

interface TrackAudioControl {
  trackId: string;
  label: string;
  url: string;
  volume: number; // 0..1
  pan: number;    // -1..1
  isMuted: boolean;
  isSolo: boolean;
  isReady: boolean;
}

export function VSMultitrackPlayer({ vs }: VSMultitrackPlayerProps) {
  const router = useRouter();
  const { toast } = useToast();

  const audioRefs = useRef<{ [trackId: string]: HTMLAudioElement | null }>({});
  const audioCtxRef = useRef<AudioContext | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

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

  // Inicializa o AudioContext para beeps sintéticos de teste se necessário
  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioCtxClass();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // Toca um tom de bip sintético (Metrônomo de Teste) se o canal de clique/teste estiver ativado
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

  // Atualiza Volume e Mute de cada elemento HTML5 de áudio diretamente (Solução Infalível para Saída de Som)
  const applyAudioSettings = useCallback((tracks: TrackAudioControl[]) => {
    const hasSolo = tracks.some((t) => t.isSolo);

    tracks.forEach((t) => {
      const audioEl = audioRefs.current[t.trackId];
      if (audioEl) {
        let effectiveVol = t.volume;
        const shouldMute = t.isMuted || (hasSolo && !t.isSolo);
        if (shouldMute) effectiveVol = 0;

        audioEl.volume = effectiveVol;
        audioEl.muted = shouldMute;
      }
    });
  }, []);

  // Monitora e atualiza o progresso do tempo
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

        // Se houver áudio real tocando
        if (mainAudio && !isNaN(mainAudio.currentTime) && mainAudio.currentTime > 0) {
          setCurrentTime(mainAudio.currentTime);
          if (mainAudio.ended || mainAudio.currentTime >= maxDur) {
            handleStop();
          }
        } else {
          // Temporizador progressivo sintético
          setCurrentTime((prev) => {
            const next = prev + 0.1;
            if (next >= maxDur) {
              handleStop();
              return 0;
            }
            return next;
          });

          // Dispara o bip sintético do metrônomo para feedback sonoro no fone
          if (Date.now() - lastBeep >= intervalMs) {
            playClickBeep(1000);
            lastBeep = Date.now();
          }
        }
      }, 100);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, duration, vs.tracks, vs.bpm, playClickBeep]);

  // Captura metadados das faixas
  const handleAudioLoadedMetadata = (trackId: string, e: React.SyntheticEvent<HTMLAudioElement>) => {
    const audioEl = e.currentTarget;
    audioRefs.current[trackId] = audioEl;

    if (audioEl.duration && !isNaN(audioEl.duration) && audioEl.duration > 0) {
      setDuration((prev) => Math.max(prev, audioEl.duration));
    }

    setTracksState((prev) => {
      const copy = prev.map((t) => (t.trackId === trackId ? { ...t, isReady: true } : t));
      return copy;
    });
  };

  // Play / Pause
  const handlePlayPause = async () => {
    getAudioContext();

    if (isPlaying) {
      // Pause
      Object.values(audioRefs.current).forEach((audio) => {
        if (audio) {
          try {
            audio.pause();
          } catch (e) {
            // ignora
          }
        }
      });
      setIsPlaying(false);
    } else {
      // Play
      applyAudioSettings(tracksState);

      const playPromises = Object.values(audioRefs.current).map((audio) => {
        if (audio) {
          const p = audio.play();
          if (p !== undefined) {
            return p.catch((err) => {
              if (err.name !== 'AbortError') {
                console.warn('Aviso de play de áudio:', err);
              }
            });
          }
        }
        return Promise.resolve();
      });

      try {
        await Promise.all(playPromises);
        setIsPlaying(true);
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.error('Erro ao dar Play:', err);
        }
      }
    }
  };

  const handleStop = () => {
    Object.values(audioRefs.current).forEach((audio) => {
      if (audio) {
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch (e) {
          // ignora
        }
      }
    });
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (newTime: number) => {
    setCurrentTime(newTime);
    Object.values(audioRefs.current).forEach((audio) => {
      if (audio) {
        try {
          audio.currentTime = newTime;
        } catch (e) {
          // ignora
        }
      }
    });
  };

  const handleVolumeChange = (idx: number, newVol: number) => {
    setTracksState((prev) => {
      const copy = [...prev];
      copy[idx].volume = newVol;
      applyAudioSettings(copy);
      return copy;
    });
  };

  const handlePanChange = (idx: number, newPan: number) => {
    setTracksState((prev) => {
      const copy = [...prev];
      copy[idx].pan = newPan;
      return copy;
    });
  };

  const handleToggleMute = (idx: number) => {
    setTracksState((prev) => {
      const copy = [...prev];
      copy[idx].isMuted = !copy[idx].isMuted;
      applyAudioSettings(copy);
      return copy;
    });
  };

  const handleToggleSolo = (idx: number) => {
    setTracksState((prev) => {
      const copy = [...prev];
      copy[idx].isSolo = !copy[idx].isSolo;
      applyAudioSettings(copy);
      return copy;
    });
  };

  const applyEarphonePreset = () => {
    setTracksState((prev) => {
      const copy = prev.map((t) => {
        let pan = 0;
        if (t.trackId.includes('click') || t.trackId.includes('guide')) {
          pan = -1.0;
        } else {
          pan = 1.0;
        }
        return { ...t, pan };
      });
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
            ref={(el) => { 
              if (el) audioRefs.current[t.trackId] = el; 
            }}
            src={t.url}
            preload="auto"
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
          {vs.key && (
            <Badge variant="outline" className="bg-slate-800 border-slate-700 text-amber-400 font-bold text-xs px-3 py-1">
              🎹 Tom: {vs.key}
            </Badge>
          )}
          {vs.timeSignature && (
            <Badge variant="outline" className="bg-slate-800 border-slate-700 text-sky-400 font-mono text-xs px-3 py-1 font-bold">
              ⏱ {vs.timeSignature}
            </Badge>
          )}
        </div>
      </div>

      {/* Control Bar Principal (Play/Pause, Slider, Presets) */}
      <Card className="bg-slate-950 text-white border-slate-800 shadow-2xl rounded-3xl overflow-hidden">
        <CardContent className="p-6 space-y-6">
          {/* Barra de Progresso do Áudio */}
          <div className="space-y-2">
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

          {/* Botões Principais de Controle */}
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

            {/* Presets Rápidos de Fone */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={applyEarphonePreset}
                className="h-10 px-4 rounded-xl text-xs font-bold border-indigo-500/40 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 gap-1.5"
              >
                <Headphones size={14} /> Preset Fone Músicos (L/R)
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={applyStereoPreset}
                className="h-10 px-4 rounded-xl text-xs font-bold border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 gap-1.5"
              >
                <Radio size={14} /> Estéreo Padrão
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MESA DE MISTURA (MIXER VIRTUAL DE CANAIS) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black uppercase italic tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Sliders size={20} className="text-emerald-500" /> Mesa de Som Multitrack
          </h2>
          <span className="text-xs text-slate-500 font-bold">{tracksState.length} Canais Ativos</span>
        </div>

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
      </div>
    </div>
  );
}
