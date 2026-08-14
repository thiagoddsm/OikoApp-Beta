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
  Loader2, Disc, Headphones, Sparkles, AlertTriangle, FileAudio, Radio
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

  // Se veio com songId, preenche com os dados da música se os params não vieram completos
  useEffect(() => {
    if (paramTitle) setTitle(paramTitle);
    if (paramArtist) setArtist(paramArtist);
    if (paramKey) setKey(paramKey);
    if (paramBpm) setBpm(paramBpm);
  }, [paramTitle, paramArtist, paramKey, paramBpm]);

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

  function handleFileChange(idx: number, file: File | null) {
    setTracks((prev) =>
      prev.map((t, i) => (i === idx ? { ...t, file, status: 'idle', progress: 0, url: '', storagePath: '' } : t))
    );
  }

  function handlePanChange(idx: number, pan: number) {
    setTracks((prev) => prev.map((t, i) => (i === idx ? { ...t, defaultPan: pan } : t)));
  }

  async function uploadTrackFile(track: TrackUpload, vsId: string, idx: number): Promise<{ url: string; storagePath: string }> {
    if (!track.file || !storage) return { url: '', storagePath: '' };

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

    const selectedTracks = tracks.filter((t) => t.file !== null);
    if (selectedTracks.length === 0) {
      toast({ variant: 'destructive', title: 'Nenhum Áudio Selecionado', description: 'Selecione pelo menos um arquivo MP3/WAV/AAC.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const vsId = `vs_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const uploadedTrackMeta: any[] = [];

      for (let i = 0; i < tracks.length; i++) {
        const tr = tracks[i];
        if (tr.file) {
          const { url, storagePath } = await uploadTrackFile(tr, vsId, i);
          uploadedTrackMeta.push({
            trackId: tr.slotId,
            label: tr.label,
            url,
            storagePath,
            defaultPan: tr.defaultPan,
            defaultVolume: tr.defaultVolume,
          });
        }
      }

      if (firestore) {
        await setDoc(doc(firestore, 'vs_catalog', vsId), {
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
          createdAt: serverTimestamp(),
        });

        // 🔗 Sincroniza e vincula automaticamente na Biblioteca de Músicas (worship_songs)
        try {
          // Se foi iniciado a partir de uma música existente da biblioteca, atualiza ela com o vsId
          const targetSongId = linkedSongId || vsId;
          const librarySongDoc = doc(firestore, 'worship_songs', targetSongId);
          await setDoc(librarySongDoc, {
            title: title.trim(),
            artist: artist.trim() || '',
            bpm: bpm ? Number(bpm) : undefined,
            key: key || '',
            vsId: vsId,
            notes: notes.trim() || '',
            attachments: uploadedTrackMeta.map(t => ({
              name: `Stem: ${t.label}`,
              url: t.url,
              type: 'mp3' as const
            })),
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
          }, { merge: true });
        } catch (libErr) {
          console.warn('Aviso: erro ao sincronizar com Biblioteca de Músicas:', libErr);
        }
      }

      setSuccessId(vsId);
      toast({ title: 'VS Cadastrada com Sucesso! 🚀', description: linkedSongId ? 'A música da Biblioteca foi vinculada a esta VS!' : 'Você já pode testá-la no navegador.' });
    } catch (err: any) {
      console.error('Erro ao criar VS:', err);
      toast({ variant: 'destructive', title: 'Erro ao cadastrar VS', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  }

  // TELA DE SUCESSO DO UPLOAD
  if (successId) {
    return (
      <div className="max-w-2xl mx-auto p-4 sm:p-8 space-y-6">
        <Card className="bg-slate-900 text-white border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6 text-center">
          <div className="size-16 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 size={36} />
          </div>

          <div className="space-y-2">
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-bold uppercase tracking-wider text-[10px]">
              Upload Concluído
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
            {/* BOTÃO PRINCIPAL DE TESTAR NO NAVEGADOR AGORA */}
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
                setTitle('');
                setArtist('');
                setBpm('');
                setKey('');
                setNotes('');
                setTracks(TRACK_SLOTS.map((s) => ({ slotId: s.id, label: s.label, defaultPan: s.defaultPan, defaultVolume: 1.0, file: null, progress: 0, url: '', storagePath: '', status: 'idle' })));
              }}
              className="w-full sm:w-auto font-bold text-xs sm:text-sm text-slate-400 hover:text-white rounded-2xl h-12"
            >
              + Cadastrar Outra VS
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-8">
      {/* Botão Voltar */}
      <div className="flex items-center justify-between">
        <Link href={linkedSongId ? "/dashboard/volunteering/worship" : "/dashboard/vs"}>
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white gap-2 font-bold text-xs rounded-xl">
            <ArrowLeft size={16} /> {linkedSongId ? "Voltar à Biblioteca de Músicas" : "Voltar ao Oiko Live"}
          </Button>
        </Link>
        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-bold uppercase tracking-wider text-[10px]">
          Multitrack DAW Stems
        </Badge>
      </div>

      {/* Banner de Vinculação com Música da Biblioteca */}
      {linkedSongId && (
        <div className="flex items-center gap-3 p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl">
          <div className="size-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Radio size={20} className="animate-pulse" />
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
            <Upload size={28} className="text-emerald-400" /> 
            {linkedSongId ? `Inserir VS: ${title || 'Música'}` : 'Upload de Virtual Sound (VS)'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium">
            Envie os arquivos multitrack (Clique, Guia, Base) para cadastrar no catálogo do Oiko Live.
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
                    <span className="font-black text-sm text-white flex items-center gap-2">
                      <FileAudio size={16} className="text-emerald-400" /> {tr.label}
                    </span>
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

                  <Button
                    type="button"
                    variant={tr.file ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => fileRefs.current[idx]?.click()}
                    className={`h-9 px-4 rounded-xl font-bold text-xs gap-1.5 ${
                      tr.file
                        ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black'
                        : 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Upload size={14} />
                    {tr.file ? tr.file.name : 'Selecionar Arquivo'}
                  </Button>
                </div>

                {tr.status === 'uploading' && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono text-slate-400 font-bold">
                      <span>Enviando...</span>
                      <span>{Math.round(tr.progress)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400 transition-all" style={{ width: `${tr.progress}%` }} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Botão de Envio Principal */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto font-black text-sm bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-xl shadow-emerald-500/20 rounded-2xl h-12 px-8 gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Enviando Arquivos...
              </>
            ) : (
              <>
                <Upload size={18} /> Publicar VS no Oiko Live
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
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-8 animate-spin text-emerald-400" />
      </div>
    }>
      <VsUploadContent />
    </Suspense>
  );
}
