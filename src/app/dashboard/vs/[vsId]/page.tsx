'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { VSMultitrackPlayer, VsData } from '@/components/vs/vs-multitrack-player';
import { Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const { firestore } = initializeFirebase();

export default function VsPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const vsId = params.vsId as string;

  const [vsData, setVsData] = useState<VsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVs() {
      if (!vsId || !firestore) return;
      setLoading(true);
      try {
        // 1. Tenta buscar diretamente pelo ID do documento
        const docRef = doc(firestore, 'vs_catalog', vsId);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() } as VsData;
          setVsData(data);
        } else {
          // 2. Fallback de busca pela propriedade 'id' no documento
          const q = query(collection(firestore, 'vs_catalog'), where('id', '==', vsId));
          const querySnap = await getDocs(q);
          if (!querySnap.empty) {
            const firstDoc = querySnap.docs[0];
            const data = { id: firstDoc.id, ...firstDoc.data() } as VsData;
            setVsData(data);
          } else {
            setError('Virtual Sound (VS) não encontrada no catálogo.');
          }
        }
      } catch (err: any) {
        console.error('Erro ao buscar VS:', err);
        setError(err.message || 'Falha ao carregar a VS.');
      } finally {
        setLoading(false);
      }
    }

    fetchVs();
  }, [vsId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="size-10 text-emerald-500 animate-spin" />
        <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
          Carregando Faixas Multitrack...
        </p>
      </div>
    );
  }

  if (error || !vsData) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-slate-900 text-white rounded-3xl space-y-4 text-center">
        <AlertTriangle size={36} className="text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold">VS Não Encontrada</h2>
        <p className="text-xs text-slate-400">{error}</p>
        <Button onClick={() => router.push('/dashboard/vs')} className="font-bold bg-emerald-500 hover:bg-emerald-600 text-slate-950">
          <ArrowLeft size={16} className="mr-2" /> Voltar ao Catálogo
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8">
      <VSMultitrackPlayer vs={vsData} />
    </div>
  );
}
