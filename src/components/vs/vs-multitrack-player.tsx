'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { 
  Play, Pause, Square, RotateCcw, Volume2, VolumeX, Sliders, Headphones, 
  Music, Radio, Loader2, ArrowLeft, Disc, Sparkles, Volume1
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

interface InternalTrack {
  trackId: string;
  label: string;
  url: string;
  volume: number; // 0..1
  pan: number;    // -1..1
  isMuted: boolean;
  isSolo: boolean;
  buffer: AudioBuffer | null;
  gainNode?: GainNode;
  panNode?: StereoPannerNode;
  sourceNode?: AudioBufferSourceNode;
  isLoading: boolean;
  hasError: boolean;
}

export function VSMultitrackPlayer({ vs }: VSMultitrackPlayerProps) {
  const router = useRouter();
  const { toast } = useToast();

  const audioCtxRef = useRef<AudioContext | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseOffsetRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffersLoading, setIsBuffersLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);

  const [tracksState, setTracksState] = useState<InternalTrack[]>(() =>
    vs.tracks.map((t) => ({
      trackId: t.trackId,
      label: t.label,
      url: t.url,
      volume: t.defaultVolume !== undefined ? t.defaultVolume : 1,
      pan: t.defaultPan !== undefined ? t.defaultPan : 0,
      isMuted: false,
      isSolo: false,
      buffer: null,
      isLoading: true,
      hasError: false,
    }))
  );

  // Inicializa o AudioContext
  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioCtxClass();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  // Carrega os buffers de áudio de cada faixa
  useEffect(() => {
    let isCancelled = false;

    async function loadAllBuffers() {
      setIsBuffersLoading(true);
      const ctx = getAudioContext();
      let loadedCount = 0;
      let maxDur = 0;

      const updated = await Promise.all(
        vs.tracks.map(async (t) => {
          if (!t.url) {
            return {
              trackId: t.trackId,
              label: t.label,
              url: '',
              volume: t.defaultVolume ?? 1,
              pan: t.defaultPan ?? 0,
              isMuted: false,
              isSolo: false,
              buffer: null,
              isLoading: false,
              hasError: true,
            };
          }

          try {
            const res = await fetch(t.url);
            const arrayBuffer = await res.arrayBuffer();
            const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);

            if (decodedBuffer.duration > maxDur) {
              maxDur = decodedBuffer.duration;
            }

            loadedCount++;
            if (!isCancelled) {
              setLoadingProgress(Math.round((loadedCount / vs.tracks.length) * 100));
            }

            return {
              trackId: t.trackId,
              label: t.label,
              url: t.url,
              volume: t.defaultVolume ?? 1,
              pan: t.defaultPan ?? 0,
              isMuted: false,
              isSolo: false,
              buffer: decodedBuffer,
              isLoading: false,
              hasError: false,
            };
          } catch (err) {
            console.error(`Erro ao carregar faixa ${t.label}:`, err);
            return {
              trackId: t.trackId,
              label: t.label,
              url: t.url,
              volume: t.defaultVolume ?? 1,
              pan: t.defaultPan ?? 0,
              isMuted: false,
              isSolo: false,
              buffer: null,
              isLoading: false,
              hasError: true,
            };
          }
        })
      );

      if (!isCancelled) {
        setTracksState(updated);
        setDuration(maxDur);
        setIsBuffersLoading(false);
      }
    }

    loadAllBuffers();

    return () => {
      isCancelled = true;
      stopAudio();
    };
  }, [vs]);

  // Atualiza o progresso de tempo durante a reprodução
  const updateProgress = () => {
    if (!audioCtxRef.current || !isPlaying) return;
    const elapsed = audioCtxRef.current.currentTime - startTimeRef.current + pauseOffsetRef.current;
    
    if (elapsed >= duration && duration > 0) {
      handleStop();
      return;
    }

    setCurrentTime(elapsed);
    animFrameRef.current = requestAnimationFrame(updateProgress);
  };

  useEffect(() => {
    if (isPlaying) {
      animFrameRef.current = requestAnimationFrame(updateProgress);
    } else if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, duration]);

  // Conecta e dispara as faixas de áudio
  const playAudio = (offset = 0) => {
    const ctx = getAudioContext();
    stopSourcesOnly();

    const hasSolo = tracksState.some((t) => t.isSolo);

    const newTracks = tracksState.map((t) => {
      if (!t.buffer) return t;

      const source = ctx.createBufferSource();
      source.buffer = t.buffer;

      const gain = ctx.createGain();
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;

      // Regra de Solo e Mute
      let effectiveVol = t.volume;
      if (t.isMuted) effectiveVol = 0;
      if (hasSolo && !t.isSolo) effectiveVol = 0;

      gain.gain.value = effectiveVol;

      if (pan) {
        pan.pan.value = t.pan;
        source.connect(gain);
        gain.connect(pan);
        pan.connect(ctx.destination);
      } else {
        source.connect(gain);
        gain.connect(ctx.destination);
      }

      source.start(0, offset);

      return {
        ...t,
        gainNode: gain,
        panNode: pan || undefined,
        sourceNode: source,
      };
    });

    setTracksState(newTracks);
    startTimeRef.current = ctx.currentTime;
    pauseOffsetRef.current = offset;
    setIsPlaying(true);
  };

  const stopSourcesOnly = () => {
    tracksState.forEach((t) => {
      if (t.sourceNode) {
        try {
          t.sourceNode.stop();
          t.sourceNode.disconnect();
        } catch (e) {
          // ignora se já parou
        }
      }
    });
  };

  const stopAudio = () => {
    stopSourcesOnly();
    setIsPlaying(false);
  };

  const handlePlayPause = () => {
    if (isBuffersLoading) return;

    if (isPlaying) {
      if (audioCtxRef.current) {
        pauseOffsetRef.current += audioCtxRef.current.currentTime - startTimeRef.current;
      }
      stopAudio();
    } else {
      playAudio(pauseOffsetRef.current);
    }
  };

  const handleStop = () => {
    stopAudio();
    pauseOffsetRef.current = 0;
    setCurrentTime(0);
  };

  const handleSeek = (newTime: number) => {
    pauseOffsetRef.current = newTime;
    setCurrentTime(newTime);
    if (isPlaying) {
      playAudio(newTime);
    }
  };

  // Atualização de Volume e Pan em tempo real sem interrupção
  const handleVolumeChange = (index: number, newVol: number) => {
    setTracksState((prev) => {
      const copy = [...prev];
      const target = copy[index];
      target.volume = newVol;

      const hasSolo = copy.some((t) => t.isSolo);
      let effectiveVol = newVol;
      if (target.isMuted) effectiveVol = 0;
      if (hasSolo && !target.isSolo) effectiveVol = 0;

      if (target.gainNode) {
        target.gainNode.gain.setValueAtTime(effectiveVol, audioCtxRef.current?.currentTime || 0);
      }
      return copy;
    });
  };

  const handlePanChange = (index: number, newPan: number) => {
    setTracksState((prev) => {
      const copy = [...prev];
      const target = copy[index];
      target.pan = newPan;

      if (target.panNode) {
        target.panNode.pan.setValueAtTime(newPan, audioCtxRef.current?.currentTime || 0);
      }
      return copy;
    });
  };

  const handleToggleMute = (index: number) => {
    setTracksState((prev) => {
      const copy = [...prev];
      const target = copy[index];
      target.isMuted = !target.isMuted;

      const hasSolo = copy.some((t) => t.isSolo);
      
      copy.forEach((t) => {
        let effectiveVol = t.volume;
        if (t.isMuted) effectiveVol = 0;
        if (hasSolo && !t.isSolo) effectiveVol = 0;
        if (t.gainNode) {
          t.gainNode.gain.setValueAtTime(effectiveVol, audioCtxRef.current?.currentTime || 0);
        }
      });

      return copy;
    });
  };

  const handleToggleSolo = (index: number) => {
    setTracksState((prev) => {
      const copy = [...prev];
      const target = copy[index];
      target.isSolo = !target.isSolo;

      const hasSolo = copy.some((t) => t.isSolo);

      copy.forEach((t) => {
        let effectiveVol = t.volume;
        if (t.isMuted) effectiveVol = 0;
        if (hasSolo && !t.isSolo) effectiveVol = 0;
        if (t.gainNode) {
          t.gainNode.gain.setValueAtTime(effectiveVol, audioCtxRef.current?.currentTime || 0);
        }
      });

      return copy;
    });
  };

  // Preset Rápido: Fone dos Músicos (Clique/Guia 100% Esq, Base 100% Dir)
  const applyEarphonePreset = () => {
    setTracksState((prev) => {
      const copy = prev.map((t) => {
        let pan = 0;
        if (t.trackId.includes('click') || t.trackId.includes('guide')) {
          pan = -1.0; // 100% Esquerda
        } else {
          pan = 1.0; // 100% Direita
        }

        if (t.panNode) {
          t.panNode.pan.setValueAtTime(pan, audioCtxRef.current?.currentTime || 0);
        }
        return { ...t, pan };
      });
      return copy;
    });
    toast({
      title: 'Preset Fone de Músicos Aplicado 🎧',
      description: 'Clique e Guia enviados 100% para a Esquerda, Banda/Base para a Direita.',
    });
  };

  // Preset Rápido: Estéreo Padrão
  const applyStereoPreset = () => {
    setTracksState((prev) => {
      const copy = prev.map((t) => {
        const pan = t.trackId.includes('click') ? -1.0 : t.trackId.includes('guide') ? 1.0 : 0;
        if (t.panNode) {
          t.panNode.pan.setValueAtTime(pan, audioCtxRef.current?.currentTime || 0);
        }
        return { ...t, pan };
      });
      return copy;
    });
    toast({
      title: 'Preset Estéreo Restaurado 📻',
      description: 'Panorâmicos restaurados para o padrão original.',
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
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
          {vs.bpm && (
            <Badge variant="outline" className="bg-slate-800 border-slate-700 text-white font-mono text-xs px-3 py-1">
              🎵 {vs.bpm} BPM
            </Badge>
          )}
          {vs.key && (
            <Badge variant="outline" className="bg-slate-800 border-slate-700 text-amber-400 font-bold text-xs px-3 py-1">
              🎹 Tom: {vs.key}
            </Badge>
          )}
          {vs.timeSignature && (
            <Badge variant="outline" className="bg-slate-800 border-slate-700 text-sky-400 font-mono text-xs px-3 py-1">
              ⏱ {vs.timeSignature}
            </Badge>
          )}
        </div>
      </div>

      {/* Control Bar Principal (Play/Pause, Slider, Presets) */}
      <Card className="bg-slate-950 text-white border-slate-800 shadow-2xl rounded-3xl overflow-hidden">
        <CardContent className="p-6 space-y-6">
          {isBuffersLoading ? (
            <div className="py-8 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="size-10 text-emerald-500 animate-spin" />
              <p className="text-sm font-bold text-slate-300">Carregando Multitracks na Memória ({loadingProgress}%)...</p>
              <div className="w-64 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-200"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <>
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
            </>
          )}
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
