'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, addDoc, setDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { initializeFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Upload, Play, ArrowLeft, CheckCircle2, Music2, Sliders, 
  Loader2, Disc, Headphones, Sparkles, AlertTriangle, FileAudio, Radio, Edit3, Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

const { firestore, storage } = initializeFirebase();

const TRACK_SLOTS = [
  { id: 'click', label: '1. Clique (Metrônomo)', defaultPan: -1.0, description: 'Track de marcação de tempo. Pan 100% esquerda.' },
  { id: 'guide', label: '2. Guia (Voz Regência)', defaultPan: 1.0, description: 'Voz guia para o músico. Pan 100% direita.' },
  { id: 'pad', label: '3. Pad Contínuo (Worship)', defaultPan: 0.0, description: 'Ambiência e harmonia no tom da música.' },
  { id: 'drums', label: '4. Bateria / Loops', defaultPan: 0.0, description: 'Bateria acústica, percussão ou loops eletrônicos.' },
  { id: 'bass', label: '5. Baixo / Synth Bass', defaultPan: 0.0, description: 'Linhas de contrabaixo ou synth bass.' },
  { id: 'ac_gtr', label: '6. Violão (Acoustic)', defaultPan: -0.3, description: 'Violão base ou fingerpicking.' },
  { id: 'el_gtr1', label: '7. Guitarra 1 (Rhythm)', defaultPan: -0.6, description: 'Guitarras de base, drives ou ambiência.' },
  { id: 'el_gtr2', label: '8. Guitarra 2 (Lead)', defaultPan: 0.6, description: 'Solos, riffs melódicos e delays.' },
  { id: 'keys', label: '9. Piano / Teclados', defaultPan: 0.0, description: 'Piano acústico, Rhodes e teclados.' },
  { id: 'synths', label: '10. Synths / Arpeggiators', defaultPan: 0.2, description: 'Sintetizadores melódicos e arpejos.' },
  { id: 'strings', label: '11. Cordas / Orquestra', defaultPan: 0.0, description: 'Violinos, cellos e arranjos de cordas.' },
  { id: 'brass', label: '12. Metais / Horns', defaultPan: 0.3, description: 'Trompetes, trombones e sax.' },
  { id: 'backing_vocals', label: '13. Backing Vocals', defaultPan: 0.0, description: 'Harmonias vocais e coro de fundo.' },
  { id: 'fx', label: '14. FX / Risers / Efeitos', defaultPan: 0.0, description: 'Transições, risers, sub-drops e impactos.' },
  { id: 'backing', label: '15. Playback / Instrumental Geral', defaultPan: 0.0, description: 'Base musical mista ou playback estéreo.' },
  { id: 'extra1', label: '16. Faixa Extra (Personalizada)', defaultPan: 0.0, description: 'Stem adicional personalizada para o arranjo.' },
];

type TrackUpload = {
  slotId: string;
  label: string;
  defaultPan: number;
  defaultVolume: number;
  file: File | null;
  progress: number;
  url: string;
  storagePath: string;
  status: 'idle' | 'uploading' | 'done' | 'error';
};

function VsUploadContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const editId = searchParams.get('edit') || '';
  const linkedSongId = searchParams.get('songId') || '';
  const paramTitle = searchParams.get('title') || '';
  const paramArtist = searchParams.get('artist') || '';
  const paramKey = searchParams.get('key') || '';
  const paramBpm = searchParams.get('bpm') || '';

  const [title, setTitle] = useState(paramTitle);
  const [artist, setArtist] = useState(paramArtist);
  const [bpm, setBpm] = useState(paramBpm);
  const [key, setKey] = useState(paramKey);
  const [timeSignature, setTimeSignature] = useState('4/4');
  const [notes, setNotes] = useState('');
  const [isLoadingEdit, setIsLoadingEdit] = useState(!!editId);

  const [tracks, setTracks] = useState<TrackUpload[]>(
    TRACK_SLOTS.map((slot) => ({
      slotId: slot.id,
      label: slot.label,
      defaultPan: slot.defaultPan,
      defaultVolume: 1.0,
      file: null,
      progress: 0,
      url: '',
      storagePath: '',
      status: 'idle',
    }))
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);

  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 1. Carrega parâmetros vindos da URL
  useEffect(() => {
    if (!editId) {
      if (paramTitle) setTitle(paramTitle);
      if (paramArtist) setArtist(paramArtist);
      if (paramKey) setKey(paramKey);
      if (paramBpm) setBpm(paramBpm);
    }
  }, [paramTitle, paramArtist, paramKey, paramBpm, editId]);

  // 2. Se for modo EDIÇÃO (?edit=ID), busca os dados reais da VS no Firestore
  useEffect(() => {
    if (!editId || !firestore) return;

    async function loadVsData() {
      setIsLoadingEdit(true);
      try {
        let snap = await getDoc(doc(firestore, 'vs_catalog', editId));
        let data = snap.exists() ? snap.data() : null;

        // Se não encontrou em vs_catalog, tenta buscar em worship_songs (músicas gerais)
        if (!data) {
          const songSnap = await getDoc(doc(firestore, 'worship_songs', editId));
          if (songSnap.exists()) {
            data = songSnap.data();
          }
        }

        if (data) {
          if (data.title) setTitle(data.title);
          if (data.artist) setArtist(data.artist);
          if (data.bpm !== undefined && data.bpm !== null) setBpm(String(data.bpm));
          if (data.key) setKey(data.key);
          if (data.timeSignature) setTimeSignature(data.timeSignature);
          if (data.notes) setNotes(data.notes);

          if (Array.isArray(data.tracks) && data.tracks.length > 0) {
            setTracks((prev) =>
              prev.map((slot) => {
                const existing = data.tracks.find(
                  (t: any) => t.trackId === slot.slotId || t.slotId === slot.slotId
                );
                if (existing && existing.url) {
                  return {
                    ...slot,
                    defaultPan: existing.defaultPan !== undefined ? existing.defaultPan : slot.defaultPan,
                    defaultVolume: existing.defaultVolume !== undefined ? existing.defaultVolume : 1.0,
                    url: existing.url,
                    storagePath: existing.storagePath || '',
                    status: 'done',
                    progress: 100,
                    label: existing.label || slot.label,
                  };
                }
                return slot;
              })
            );
          }
        } else {
          toast({
            variant: 'destructive',
            title: 'VS Não Encontrada',
            description: `Não encontramos nenhuma VS com o ID ${editId}.`,
          });
        }
      } catch (err: any) {
        console.error('Erro ao carregar VS para edição:', err);
        toast({
          variant: 'destructive',
          title: 'Erro ao carregar dados',
          description: err.message,
        });
      } finally {
        setIsLoadingEdit(false);
      }
    }

    loadVsData();
  }, [editId]);

  function handleFileChange(idx: number, file: File | null) {
    setTracks((prev) =>
      prev.map((t, i) =>
        i === idx
          ? {
              ...t,
              file,
              status: file ? 'idle' : t.url ? 'done' : 'idle',
              progress: file ? 0 : t.url ? 100 : 0,
            }
          : t
      )
    );
  }

  function handleRemoveTrackAudio(idx: number) {
    setTracks((prev) =>
      prev.map((t, i) =>
        i === idx
          ? {
              ...t,
              file: null,
              url: '',
              storagePath: '',
              status: 'idle',
              progress: 0,
            }
          : t
      )
    );
    if (fileRefs.current[idx]) {
      fileRefs.current[idx]!.value = '';
    }
  }

  function handlePanChange(idx: number, pan: number) {
    setTracks((prev) => prev.map((t, i) => (i === idx ? { ...t, defaultPan: pan } : t)));
  }

  async function uploadTrackFile(track: TrackUpload, vsId: string, idx: number): Promise<{ url: string; storagePath: string }> {
    if (!track.file || !storage) return { url: track.url || '', storagePath: track.storagePath || '' };

    const ext = track.file.name.split('.').pop();
    const storagePath = `vs/${vsId}/${track.slotId}.${ext}`;
    const storageRef = ref(storage, storagePath);

    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, track.file!);
      uploadTask.on(
        'state_changed',
        (snap) => {
          const progress = (snap.bytesTransferred / snap.totalBytes) * 100;
          setTracks((prev) => prev.map((t, i) => (i === idx ? { ...t, progress, status: 'uploading' } : t)));
        },
        (err) => {
          setTracks((prev) => prev.map((t, i) => (i === idx ? { ...t, status: 'error' } : t)));
          reject(err);
        },
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          setTracks((prev) => prev.map((t, i) => (i === idx ? { ...t, url, storagePath, status: 'done', progress: 100 } : t)));
          resolve({ url, storagePath });
        }
      );
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast({ variant: 'destructive', title: 'Título Obrigatório', description: 'Informe o título da música.' });
      return;
    }

    const hasAudio = tracks.some((t) => t.file !== null || t.url.trim() !== '');
    if (!hasAudio) {
      toast({ variant: 'destructive', title: 'Nenhum Áudio Selecionado', description: 'Selecione pelo menos um arquivo MP3/WAV ou mantenha uma faixa existente.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const vsId = editId || `vs_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const uploadedTrackMeta: any[] = [];

      for (let i = 0; i < tracks.length; i++) {
        const tr = tracks[i];
        if (tr.file) {
          // Upload novo arquivo
          const { url, storagePath } = await uploadTrackFile(tr, vsId, i);
          uploadedTrackMeta.push({
            trackId: tr.slotId,
            label: tr.label,
            url,
            storagePath,
            defaultPan: tr.defaultPan,
            defaultVolume: tr.defaultVolume,
          });
        } else if (tr.url) {
          // Mantém áudio pré-existente
          uploadedTrackMeta.push({
            trackId: tr.slotId,
            label: tr.label,
            url: tr.url,
            storagePath: tr.storagePath || '',
            defaultPan: tr.defaultPan,
            defaultVolume: tr.defaultVolume,
          });
        }
      }

      if (firestore) {
        const vsDocRef = doc(firestore, 'vs_catalog', vsId);
        await setDoc(
          vsDocRef,
          {
            id: vsId,
            title: title.trim(),
            artist: artist.trim() || '',
            bpm: bpm ? Number(bpm) : 0,
            key: key || '',
            timeSignature: timeSignature || '4/4',
            notes: notes.trim() || '',
            tracks: uploadedTrackMeta,
            status: 'active',
            linkedSongId: linkedSongId || undefined,
            updatedAt: serverTimestamp(),
            ...(editId ? {} : { createdAt: serverTimestamp() }),
          },
          { merge: true }
        );

        // 🔗 Sincroniza e vincula automaticamente na Biblioteca de Músicas (worship_songs)
        try {
          const targetSongId = linkedSongId || vsId;
          const librarySongDoc = doc(firestore, 'worship_songs', targetSongId);
          await setDoc(
            librarySongDoc,
            {
              title: title.trim(),
              artist: artist.trim() || '',
              bpm: bpm ? Number(bpm) : undefined,
              key: key || '',
              vsId: vsId,
              notes: notes.trim() || '',
              attachments: uploadedTrackMeta.map((t) => ({
                name: `Stem: ${t.label}`,
                url: t.url,
                type: 'mp3' as const,
              })),
              updatedAt: serverTimestamp(),
              ...(editId ? {} : { createdAt: serverTimestamp() }),
            },
            { merge: true }
          );
        } catch (libErr) {
          console.warn('Aviso: erro ao sincronizar com Biblioteca de Músicas:', libErr);
        }
      }

      setSuccessId(vsId);
      toast({
        title: editId ? 'VS Atualizada com Sucesso! ✨' : 'VS Cadastrada com Sucesso! 🚀',
        description: editId
          ? 'As alterações da música e faixas foram salvas.'
          : linkedSongId
          ? 'A música da Biblioteca foi vinculada a esta VS!'
          : 'Você já pode testá-la no navegador.',
      });
    } catch (err: any) {
      console.error('Erro ao salvar VS:', err);
      toast({ variant: 'destructive', title: 'Erro ao salvar VS', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  }

  // TELA DE SUCESSO DO UPLOAD / EDIÇÃO
  if (successId) {
    return (
      <div className="max-w-2xl mx-auto p-4 sm:p-8 space-y-6">
        <Card className="bg-slate-900 text-white border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6 text-center">
          <div className="size-16 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 size={36} />
          </div>

          <div className="space-y-2">
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-bold uppercase tracking-wider text-[10px]">
              {editId ? 'Edição Salva' : 'Upload Concluído'}
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-black italic tracking-tight">{title || 'Música Cadastrada'}</h1>
            <p className="text-xs sm:text-sm text-slate-400 font-medium max-w-md mx-auto">
              A Virtual Sound foi salva com sucesso no catálogo. Você pode testar e mixar as pistas diretamente pelo seu navegador!
            </p>
            <div className="pt-2">
              <span className="text-[11px] font-mono text-slate-500 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                ID da VS: {successId}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-slate-800">
            <Link href={`/dashboard/vs/${successId}`} className="w-full sm:w-auto">
              <Button size="lg" className="w-full font-black text-xs sm:text-sm bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-lg shadow-emerald-500/20 rounded-2xl gap-2 h-12 px-6">
                <Play size={18} className="fill-slate-950" /> Testar & Mixar no Navegador Agora
              </Button>
            </Link>

            <Link href="/dashboard/vs" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full font-bold text-xs sm:text-sm border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800 rounded-2xl h-12 px-6">
                Ver no Catálogo
              </Button>
            </Link>

            <Button
              size="lg"
              variant="ghost"
              onClick={() => {
                setSuccessId(null);
                if (editId) {
                  router.push('/dashboard/vs');
                } else {
                  setTitle('');
                  setArtist('');
                  setBpm('');
                  setKey('');
                  setTracks(
                    TRACK_SLOTS.map((slot) => ({
                      slotId: slot.id,
                      label: slot.label,
                      defaultPan: slot.defaultPan,
                      defaultVolume: 1.0,
                      file: null,
                      progress: 0,
                      url: '',
                      storagePath: '',
                      status: 'idle',
                    }))
                  );
                }
              }}
              className="w-full sm:w-auto font-bold text-xs text-slate-400 hover:text-white"
            >
              {editId ? 'Concluir' : 'Enviar Outra Música'}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // TELA DE CARREGAMENTO (SE ESTIVER ABRINDO EDIÇÃO)
  if (isLoadingEdit) {
    return (
      <div className="max-w-4xl mx-auto p-8 flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 size={36} className="animate-spin text-emerald-400" />
        <p className="text-sm font-bold text-slate-400">Carregando dados da Virtual Sound...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-6">
      {/* Botão Voltar */}
      <Link href="/dashboard/vs" className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors">
        <ArrowLeft size={16} /> Voltar para o Catálogo de VS
      </Link>

      {/* Banner Informativo se for vinculação da Biblioteca ou Edição */}
      {editId && (
        <div className="p-4 bg-indigo-950/40 border border-indigo-800/50 rounded-2xl flex items-center gap-3">
          <div className="size-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <Edit3 size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-indigo-400">Modo de Edição de Virtual Sound</h3>
            <p className="text-xs text-slate-300">
              Você está editando a VS existente <strong>"{title || editId}"</strong>. As faixas já gravadas estão preservadas abaixo e você pode alterar informações ou substituir arquivos.
            </p>
          </div>
        </div>
      )}

      {linkedSongId && !editId && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-800/50 rounded-2xl flex items-center gap-3">
          <div className="size-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-emerald-400">Inserindo VS para música da Biblioteca</h3>
            <p className="text-xs text-slate-300">
              Ao concluir o upload das faixas, a música <strong>"{title || 'Selecionada'}"</strong> ficará automaticamente vinculada ao Oiko Live e disponível com multitrack nos cultos.
            </p>
          </div>
        </div>
      )}

      {/* Cabeçalho da Página */}
      <div className="flex items-center justify-between gap-4 bg-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-2xl border border-slate-800">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black italic tracking-tight flex items-center gap-2">
            {editId ? <Edit3 size={28} className="text-indigo-400" /> : <Upload size={28} className="text-emerald-400" />}
            {editId ? `Editar VS: ${title || 'Música'}` : linkedSongId ? `Inserir VS: ${title || 'Música'}` : 'Upload de Virtual Sound (VS)'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium">
            {editId
              ? 'Edite as propriedades musicais e gerencie os canais de áudio da Virtual Sound.'
              : 'Envie os arquivos multitrack (Clique, Guia, Base) para cadastrar no catálogo do Oiko Live.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card 1: Informações da Música */}
        <Card className="bg-slate-900 border-slate-800 text-white rounded-3xl shadow-xl overflow-hidden">
          <CardHeader className="border-b border-slate-800/80 p-6">
            <CardTitle className="text-base font-black italic tracking-tight flex items-center gap-2 text-indigo-400">
              <Music2 size={18} /> Informações da Música
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Defina o nome, artista, tonalidade e andamento (BPM) da música.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-bold text-slate-300">Título da Música *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Oceans (Where Feet May Fail)"
                required
                className="h-10 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-300">Artista / Banda</Label>
              <Input
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="Ex: Hillsong United"
                className="h-10 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-300">BPM (Andamento)</Label>
              <Input
                type="number"
                value={bpm}
                onChange={(e) => setBpm(e.target.value)}
                placeholder="Ex: 68"
                min={40}
                max={280}
                className="h-10 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 text-xs rounded-xl font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-300">Tonalidade (Tom)</Label>
              <Select value={key} onValueChange={setKey}>
                <SelectTrigger className="h-10 bg-slate-950 border-slate-800 text-white text-xs rounded-xl font-bold">
                  <SelectValue placeholder="Selecione o tom..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  {['C', 'C#/Db', 'D', 'D#/Eb', 'E', 'F', 'F#/Gb', 'G', 'G#/Ab', 'A', 'A#/Bb', 'B'].map((k) => (
                    <SelectItem key={k} value={k}>{k}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-300">Fórmula de Compasso</Label>
              <Select value={timeSignature} onValueChange={setTimeSignature}>
                <SelectTrigger className="h-10 bg-slate-950 border-slate-800 text-white text-xs rounded-xl font-bold font-mono">
                  <SelectValue placeholder="4/4" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  <SelectItem value="4/4">4/4</SelectItem>
                  <SelectItem value="3/4">3/4</SelectItem>
                  <SelectItem value="6/8">6/8</SelectItem>
                  <SelectItem value="2/4">2/4</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Slots das Pistas de Áudio (Multitrack) */}
        <Card className="bg-slate-900 border-slate-800 text-white rounded-3xl shadow-xl overflow-hidden">
          <CardHeader className="border-b border-slate-800/80 p-6">
            <CardTitle className="text-base font-black italic tracking-tight flex items-center gap-2 text-emerald-400">
              <Sliders size={18} /> Faixas de Áudio (Slots Multitrack)
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Envie arquivos em formato MP3 ou WAV. O sistema fará a sincronização automática.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-4">
            {tracks.map((tr, idx) => (
              <div
                key={tr.slotId}
                className="p-4 bg-slate-950 rounded-2xl border border-slate-800/80 space-y-3"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-white flex items-center gap-2">
                        <FileAudio size={16} className="text-emerald-400" /> {tr.label}
                      </span>
                      {tr.url && !tr.file && (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                          Áudio Gravado
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      {TRACK_SLOTS[idx]?.description}
                    </p>
                  </div>

                  <input
                    type="file"
                    ref={(el) => { fileRefs.current[idx] = el; }}
                    className="hidden"
                    accept="audio/*"
                    onChange={(e) => handleFileChange(idx, e.target.files?.[0] || null)}
                  />

                  <div className="flex items-center gap-2">
                    {tr.url && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveTrackAudio(idx)}
                        className="h-9 px-2 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 rounded-xl"
                        title="Remover faixa de áudio"
                      >
                        <Trash2 size={14} />
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant={tr.file ? 'default' : tr.url ? 'outline' : 'outline'}
                      size="sm"
                      onClick={() => fileRefs.current[idx]?.click()}
                      className={`h-9 px-4 rounded-xl font-bold text-xs gap-1.5 ${
                        tr.file
                          ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black'
                          : tr.url
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                          : 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <Upload size={14} />
                      {tr.file ? tr.file.name : tr.url ? 'Substituir Arquivo' : 'Selecionar Arquivo'}
                    </Button>
                  </div>
                </div>

                {/* Status e progresso do upload */}
                {tr.status === 'uploading' && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-bold text-slate-400">
                      <span>Enviando áudio...</span>
                      <span>{Math.round(tr.progress)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${tr.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Pan Slider (Balanço L/R Padrão) */}
                <div className="pt-2 border-t border-slate-900 flex items-center gap-3 text-xs">
                  <span className="text-slate-400 font-bold text-[11px] min-w-[75px]">
                    Pan Padrão:
                  </span>
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-500">L (100%)</span>
                    <input
                      type="range"
                      min="-1.0"
                      max="1.0"
                      step="0.05"
                      value={tr.defaultPan}
                      onChange={(e) => handlePanChange(idx, parseFloat(e.target.value))}
                      className="flex-1 accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                    <span className="text-[10px] font-bold text-slate-500">R (100%)</span>
                  </div>
                  <span className="font-mono text-[11px] text-emerald-400 min-w-[45px] text-right font-bold">
                    {tr.defaultPan === -1 ? 'L (100%)' : tr.defaultPan === 1 ? 'R (100%)' : tr.defaultPan === 0 ? 'Centro' : `${Math.round(tr.defaultPan * 100)}%`}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Card 3: Observações & Informações de Arranjo */}
        <Card className="bg-slate-900 border-slate-800 text-white rounded-3xl shadow-xl overflow-hidden">
          <CardHeader className="border-b border-slate-800/80 p-6">
            <CardTitle className="text-base font-black italic tracking-tight text-slate-300">
              Observações do Arranjo / Estrutura
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Introdução 8 compassos -> Verso 1 -> Refrão -> Ponte com solo de guitarra..."
              rows={3}
              className="w-full p-3 bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 text-xs rounded-xl focus:outline-none focus:border-indigo-500"
            />
          </CardContent>
        </Card>

        {/* Botão de Submissão */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4">
          <Link href="/dashboard/vs" className="w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 font-bold text-xs rounded-2xl h-12 px-6"
            >
              Cancelar
            </Button>
          </Link>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs sm:text-sm rounded-2xl h-12 px-8 shadow-xl shadow-emerald-500/20 gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {editId ? 'Salvando Alterações...' : 'Processando Upload...'}
              </>
            ) : (
              <>
                <Upload size={16} />
                {editId ? 'Salvar Alterações da VS' : 'Cadastrar e Fazer Upload das Faixas'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function VsUploadPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto p-8 flex items-center justify-center min-h-[400px]">
          <Loader2 size={36} className="animate-spin text-emerald-400" />
        </div>
      }
    >
      <VsUploadContent />
    </Suspense>
  );
}
