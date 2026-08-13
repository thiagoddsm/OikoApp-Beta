'use client';

import React, { useState } from 'react';
import { useWorship, LibrarySong, SongAttachment } from '@/contexts/worship-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { Badge } from '@/components/ui/badge';
import {
  Music,
  PlusCircle,
  Loader2,
  Trash2,
  Pencil,
  MoreHorizontal,
  Plus,
  FileText,
  Volume2,
  ExternalLink,
  Search,
  Youtube,
  Radio,
  Sliders,
  Sparkles,
  Upload,
} from 'lucide-react';

const { firestore } = initializeFirebase();

export default function SongsLibraryPage() {
  const { librarySongs, isLoading, createLibrarySong, updateLibrarySong, deleteLibrarySong } = useWorship();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<LibrarySong | null>(null);

  // VS Catalog list for selection dropdown
  const [vsCatalogList, setVsCatalogList] = useState<{ id: string; title: string; artist?: string; key?: string; bpm?: number }[]>([]);

  // Form states
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [key, setKey] = useState('');
  const [bpm, setBpm] = useState<number | ''>('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [vsId, setVsId] = useState('');
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState<SongAttachment[]>([]);

  // Carrega catálogo de VSs ao abrir a página
  React.useEffect(() => {
    async function loadVsCatalog() {
      if (!firestore) return;
      try {
        const q = query(collection(firestore, 'vs_catalog'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        setVsCatalogList(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
      } catch (e) {
        console.warn('Erro ao carregar catálogo de VS:', e);
      }
    }
    loadVsCatalog();
  }, []);

  // Add Attachment form states
  const [newAttName, setNewAttName] = useState('');
  const [newAttUrl, setNewAttUrl] = useState('');
  const [newAttType, setNewAttType] = useState<'pdf' | 'mp3' | 'link'>('pdf');

  const openNewSongModal = () => {
    setEditingSong(null);
    setTitle('');
    setArtist('');
    setKey('');
    setBpm('');
    setYoutubeUrl('');
    setVsId('');
    setNotes('');
    setAttachments([]);
    setNewAttName('');
    setNewAttUrl('');
    setNewAttType('pdf');
    setEditorOpen(true);
  };

  const openEditSongModal = (song: LibrarySong) => {
    setEditingSong(song);
    setTitle(song.title || '');
    setArtist(song.artist || '');
    setKey(song.key || '');
    setBpm(song.bpm || '');
    setYoutubeUrl(song.youtubeUrl || '');
    setVsId(song.vsId || '');
    setNotes(song.notes || '');
    setAttachments(song.attachments || []);
    setNewAttName('');
    setNewAttUrl('');
    setNewAttType('pdf');
    setEditorOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: 'O título é obrigatório.', variant: 'destructive' });
      return;
    }

    const payload = {
      title: title.trim(),
      artist: artist.trim() || undefined,
      key: key.trim() || undefined,
      bpm: bpm ? Number(bpm) : undefined,
      youtubeUrl: youtubeUrl.trim() || undefined,
      vsId: vsId.trim() || undefined,
      notes: notes.trim() || undefined,
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    try {
      if (editingSong) {
        await updateLibrarySong(editingSong.id, payload);
        toast({ title: 'Música atualizada com sucesso! 🎶' });
      } else {
        await createLibrarySong(payload);
        toast({ title: 'Música adicionada à biblioteca! 🎶' });
      }
      setEditorOpen(false);
    } catch (error) {
      toast({ title: 'Erro ao salvar música.', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza de que deseja excluir esta música da biblioteca?')) {
      try {
        await deleteLibrarySong(id);
        toast({ title: 'Música excluída.' });
      } catch (error) {
        toast({ title: 'Erro ao excluir música.', variant: 'destructive' });
      }
    }
  };

  const addAttachment = () => {
    const name = newAttName.trim() || 'Novo Anexo';
    let url = newAttUrl.trim();
    if (!url) {
      url = newAttType === 'pdf'
        ? 'https://example.com/sheet.pdf'
        : newAttType === 'mp3'
          ? 'https://example.com/audio.mp3'
          : 'https://example.com';
    }

    const newAtt: SongAttachment = { name, url, type: newAttType };
    setAttachments([...attachments, newAtt]);
    setNewAttName('');
    setNewAttUrl('');
  };

  const removeAttachment = (idx: number) => {
    setAttachments(attachments.filter((_, i) => i !== idx));
  };

  const filteredSongs = librarySongs.filter(song =>
    song.title?.toLowerCase().includes(search.toLowerCase()) ||
    song.artist?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
            <Music className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Biblioteca de Músicas</h2>
            <p className="text-sm text-slate-500">Gerenciamento centralizado de músicas, tons, BPMs e anexos.</p>
          </div>
        </div>
        <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white" onClick={openNewSongModal}>
          <PlusCircle className="mr-2 h-4 w-4" /> Nova Música
        </Button>
      </div>

      {/* Search and List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar música por título ou artista..."
              className="pl-9 bg-white"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
            </div>
          ) : filteredSongs.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Music className="h-10 w-10 text-slate-350 mx-auto mb-3" />
              <p className="font-medium text-slate-650">Nenhuma música encontrada</p>
              <p className="text-xs text-slate-400 mt-1">Experimente mudar o termo de busca ou adicione uma nova música.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSongs.map(song => (
                <div
                  key={song.id}
                  className="flex items-start justify-between p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-violet-200 transition-all group"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-slate-800 truncate">{song.title}</span>
                      {song.key && (
                        <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {song.key}
                        </span>
                      )}
                      {song.vsId && (
                        <Link href={`/dashboard/vs/${song.vsId}`} target="_blank">
                          <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 border-emerald-300 text-[10px] font-bold gap-1 cursor-pointer">
                            <Radio size={10} className="animate-pulse text-emerald-600" /> Oiko Live VS
                          </Badge>
                        </Link>
                      )}
                    </div>
                    {song.artist && (
                      <p className="text-xs text-slate-500 font-medium">{song.artist}</p>
                    )}
                    <div className="flex items-center gap-3 flex-wrap text-[10px] text-slate-400 font-bold uppercase">
                      {song.bpm && <span>BPM: {song.bpm}</span>}
                      {song.attachments && song.attachments.length > 0 && (
                        <span>Anexos: {song.attachments.length}</span>
                      )}
                      {song.vsId && (
                        <span className="text-emerald-600 font-black">Multitrack Vinculada ✓</span>
                      )}
                    </div>

                    {/* Attachments & VS action buttons */}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap pt-1 border-t border-slate-200">
                      {song.vsId ? (
                        <Link
                          href={`/dashboard/vs/${song.vsId}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 border border-emerald-300 text-[10px] font-bold text-emerald-800 hover:bg-emerald-100 transition-colors"
                        >
                          <Sliders className="h-3 w-3 text-emerald-600 animate-pulse" />
                          <span>Abrir VS Player</span>
                        </Link>
                      ) : (
                        <Link
                          href={`/dashboard/vs/upload?songId=${song.id}&title=${encodeURIComponent(song.title)}&artist=${encodeURIComponent(song.artist || '')}&key=${encodeURIComponent(song.key || '')}&bpm=${song.bpm || ''}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-violet-50 border border-violet-200 text-[10px] font-bold text-violet-700 hover:bg-violet-100 hover:border-violet-300 transition-colors"
                        >
                          <Upload className="h-3 w-3 text-violet-600" />
                          <span>Inserir VS na Música</span>
                        </Link>
                      )}

                      {song.youtubeUrl && (
                        <a
                          href={song.youtubeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-50 border border-red-200 text-[10px] font-medium text-red-650 hover:bg-red-100 transition-colors"
                        >
                          <Youtube className="h-3 w-3 text-red-600" />
                          <span>YouTube</span>
                        </a>
                      )}

                      {song.attachments && song.attachments.map((att, idx) => (
                        <a
                          key={idx}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white border border-slate-200 text-[10px] text-slate-600 hover:text-violet-600 hover:border-violet-200 transition-colors"
                        >
                          {att.type === 'pdf' && <FileText className="h-3 w-3 text-red-500" />}
                          {att.type === 'mp3' && <Volume2 className="h-3 w-3 text-blue-500" />}
                          {att.type === 'link' && <ExternalLink className="h-3 w-3 text-emerald-500" />}
                          <span className="truncate max-w-[80px]">{att.name}</span>
                        </a>
                      ))}
                    </div>

                    {song.notes && (
                      <blockquote className="border-l-2 border-slate-300 pl-2.5 py-0.5 text-xs text-slate-500 italic mt-2.5">
                        {song.notes}
                      </blockquote>
                    )}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditSongModal(song)}>
                        <Pencil className="mr-2 h-4 w-4" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(song.id)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Editor Modal */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSong ? 'Editar Música' : 'Nova Música'}</DialogTitle>
            <DialogDescription>
              Insira os dados da música. Eles estarão disponíveis para importar em qualquer ordem de culto.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="song-title">Título *</Label>
              <Input
                id="song-title"
                placeholder="Ex: Teu Santo Nome"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="song-artist">Artista / Arranjo</Label>
              <Input
                id="song-artist"
                placeholder="Ex: Gabriela Rocha"
                value={artist}
                onChange={e => setArtist(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="song-key">Tom Padrão</Label>
                <Input
                  id="song-key"
                  placeholder="Ex: G"
                  value={key}
                  onChange={e => setKey(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="song-bpm">BPM Padrão</Label>
                <Input
                  id="song-bpm"
                  type="number"
                  placeholder="Ex: 72"
                  value={bpm}
                  onChange={e => setBpm(e.target.value ? Number(e.target.value) : '')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="song-youtube">Link do YouTube</Label>
              <Input
                id="song-youtube"
                placeholder="Ex: https://youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={e => setYoutubeUrl(e.target.value)}
              />
            </div>

            {/* Vínculo com Oiko Live VS */}
            <div className="space-y-2 p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
              <div className="flex items-center justify-between">
                <Label htmlFor="song-vs-id" className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                  <Radio size={14} className="text-emerald-600" /> Vincular a Multitrack (Oiko Live VS)
                </Label>
                {vsId && (
                  <Badge className="bg-emerald-600 text-white text-[9px] font-bold">Vinculado</Badge>
                )}
              </div>
              <select
                id="song-vs-id"
                value={vsId}
                onChange={e => {
                  const selectedId = e.target.value;
                  setVsId(selectedId);
                  const foundVs = vsCatalogList.find(v => v.id === selectedId);
                  if (foundVs) {
                    if (!key && foundVs.key) setKey(foundVs.key);
                    if (!bpm && foundVs.bpm) setBpm(foundVs.bpm);
                    if (!artist && foundVs.artist) setArtist(foundVs.artist);
                  }
                }}
                className="w-full h-9 px-3 rounded-md border border-emerald-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Nenhuma VS vinculada</option>
                {vsCatalogList.map(vs => (
                  <option key={vs.id} value={vs.id}>
                    {vs.title} {vs.artist ? `(${vs.artist})` : ''} — {vs.bpm ? `${vs.bpm} BPM` : ''} {vs.key ? `[Tom ${vs.key}]` : ''}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-emerald-700">
                Ao vincular uma VS, os instrumentistas e a mesa de som terão acesso direto aos faders de Clique, Guia e Stems.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="song-notes">Comentários / Observações da Música</Label>
              <Textarea
                id="song-notes"
                placeholder="Ex: Observações de dinâmica, link para referência adicional, etc."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* Attachments manager */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <Label>Anexos</Label>
              {attachments.length > 0 ? (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {attachments.map((att, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs">
                      <div className="flex items-center gap-1.5 truncate">
                        {att.type === 'pdf' && <span className="text-red-500 font-bold text-[9px] bg-red-50 px-1 py-0.5 rounded border border-red-200">PDF</span>}
                        {att.type === 'mp3' && <span className="text-blue-500 font-bold text-[9px] bg-blue-50 px-1 py-0.5 rounded border border-blue-200">MP3</span>}
                        {att.type === 'link' && <span className="text-emerald-500 font-bold text-[9px] bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">LINK</span>}
                        <span className="truncate font-medium text-slate-700">{att.name}</span>
                      </div>
                      <button
                        onClick={() => removeAttachment(idx)}
                        className="text-slate-450 hover:text-red-500 shrink-0 ml-2"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Nenhum anexo adicionado.</p>
              )}

              {/* Add Attachment Section */}
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex flex-col gap-2 mt-2">
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Nome do anexo"
                    value={newAttName}
                    onChange={e => setNewAttName(e.target.value)}
                    className="text-xs h-8 bg-white"
                  />
                  <select
                    value={newAttType}
                    onChange={e => setNewAttType(e.target.value as any)}
                    className="text-xs border border-slate-200 rounded px-2 h-8 bg-white focus:outline-none focus:ring-1 focus:ring-violet-500/20"
                  >
                    <option value="pdf">PDF (Cifra/Partitura)</option>
                    <option value="mp3">MP3 (Áudio/Ensaio)</option>
                    <option value="link">Link Externo</option>
                  </select>
                </div>
                <Input
                  placeholder="URL do arquivo (opcional)"
                  value={newAttUrl}
                  onChange={e => setNewAttUrl(e.target.value)}
                  className="text-xs h-8 bg-white"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs self-end gap-1.5"
                  onClick={addAttachment}
                >
                  <Plus className="h-3.5 w-3.5" /> Adicionar Anexo
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-violet-600 hover:bg-violet-700 text-white">Salvar Música</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
