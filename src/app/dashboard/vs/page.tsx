'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Play, Plus, Trash2, Loader2, Music2, Sliders, Disc, Radio, 
  Sparkles, Layers, Volume2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const { firestore } = initializeFirebase();

type VsEntry = {
  id: string;
  title: string;
  artist?: string;
  bpm?: number;
  key?: string;
  timeSignature?: string;
  tracks: { trackId: string; label: string }[];
  status?: string;
  createdAt?: any;
};

export default function VsCatalogPage() {
  const { toast } = useToast();
  const [catalog, setCatalog] = useState<VsEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCatalog() {
      if (!firestore) return;
      try {
        const q = query(collection(firestore, 'vs_catalog'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as VsEntry));
        setCatalog(data);
      } catch (e) {
        console.error('Erro ao carregar catálogo:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchCatalog();
  }, []);

  async function handleDelete(id: string, title: string) {
    if (!firestore || !confirm(`Deseja remover a VS "${title}" do catálogo?`)) return;
    setDeletingId(id);
    try {
      await deleteDoc(doc(firestore, 'vs_catalog', id));
      setCatalog((prev) => prev.filter((vs) => vs.id !== id));
      toast({ title: 'VS Removida 🗑️', description: `A música "${title}" foi excluída com sucesso.` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao remover', description: e.message });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-2xl border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-bold uppercase tracking-wider text-[10px]">
              Oiko Live Estúdio
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black italic tracking-tight flex items-center gap-3">
            <Disc className="size-8 text-emerald-400 animate-spin-slow" /> Catálogo de VS (Multitracks)
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium">
            Gerencie e teste as Virtual Sounds disponíveis para os músicos e equipe de louvor.
          </p>
        </div>

        <Link href="/dashboard/vs/upload">
          <Button size="lg" className="font-bold text-xs sm:text-sm bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-lg shadow-emerald-500/20 rounded-2xl gap-2 h-12 px-6">
            <Plus size={18} /> Novo Upload de VS
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="size-10 text-emerald-500 animate-spin" />
          <p className="text-sm font-bold text-slate-500">Carregando catálogo de músicas...</p>
        </div>
      ) : catalog.length === 0 ? (
        <Card className="bg-slate-900 text-white border-slate-800 rounded-3xl p-12 text-center shadow-xl space-y-4">
          <div className="size-16 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
            <Music2 size={32} />
          </div>
          <div>
            <h2 className="text-xl font-black italic">Nenhuma VS Cadastrada Ainda</h2>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              Cadastre a primeira música multitrack (Clique, Guia, Instrumental) para começar a testar no Oiko Live.
            </p>
          </div>
          <Link href="/dashboard/vs/upload" className="inline-block pt-2">
            <Button className="font-bold bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl gap-2">
              <Plus size={16} /> Cadastrar Primeira VS
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {catalog.map((vs) => (
            <Card
              key={vs.id}
              className="group bg-slate-900 border-slate-800 text-white shadow-xl hover:shadow-2xl hover:border-emerald-500/50 transition-all duration-300 rounded-3xl overflow-hidden flex flex-col justify-between"
            >
              <CardHeader className="p-6 pb-3 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg font-black italic tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                      {vs.title}
                    </CardTitle>
                    {vs.artist && (
                      <CardDescription className="text-xs font-semibold text-slate-400 mt-0.5">
                        {vs.artist}
                      </CardDescription>
                    )}
                  </div>
                  <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-bold text-[10px]">
                    {vs.status === 'active' || !vs.status ? 'Ativo' : vs.status}
                  </Badge>
                </div>

                {/* Badges dos Parâmetros Musicais */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {vs.bpm && vs.bpm > 0 && (
                    <Badge variant="outline" className="bg-slate-950 border-slate-800 text-emerald-400 font-mono text-[10px] px-2 py-0.5 font-bold">
                      🎵 {vs.bpm} BPM
                    </Badge>
                  )}
                  {vs.key && (
                    <Badge variant="outline" className="bg-slate-950 border-slate-800 text-amber-400 font-bold text-[10px] px-2 py-0.5">
                      🎹 {vs.key}
                    </Badge>
                  )}
                  {vs.timeSignature && (
                    <Badge variant="outline" className="bg-slate-950 border-slate-800 text-sky-400 font-mono text-[10px] px-2 py-0.5 font-bold">
                      ⏱ {vs.timeSignature}
                    </Badge>
                  )}
                  {vs.tracks?.length > 0 && (
                    <Badge variant="outline" className="bg-slate-950 border-slate-800 text-purple-400 font-bold text-[10px] px-2 py-0.5">
                      🎛 {vs.tracks.length} faixas
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-6 pt-0 space-y-4 flex-1 flex flex-col justify-end">
                {/* Pistas de Áudio Cadastradas */}
                {vs.tracks?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {vs.tracks.map((t) => (
                      <span
                        key={t.trackId}
                        className="text-[10px] font-semibold bg-slate-950 text-slate-400 border border-slate-800/80 px-2 py-0.5 rounded-lg"
                      >
                        {t.label}
                      </span>
                    ))}
                  </div>
                )}

                {/* Ações: Testar no Navegador / Excluir */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800/80">
                  <Link href={`/dashboard/vs/${vs.id}`} className="flex-1">
                    <Button
                      size="sm"
                      className="w-full font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl gap-1.5 shadow-md shadow-emerald-500/20"
                    >
                      <Play size={14} className="fill-slate-950" /> Testar & Mixar no Navegador
                    </Button>
                  </Link>

                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={deletingId === vs.id}
                    onClick={() => handleDelete(vs.id, vs.title)}
                    className="size-9 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                    title="Excluir VS"
                  >
                    {deletingId === vs.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
