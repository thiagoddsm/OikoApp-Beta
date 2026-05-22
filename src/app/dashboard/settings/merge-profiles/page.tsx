'use client';

import { useState } from 'react';
import { mergeUserProfiles } from '@/app/actions/auth-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2, GitMerge, Loader2, Info } from 'lucide-react';

export default function MergeProfilesPage() {
  const [authUid, setAuthUid] = useState('');
  const [oldDocId, setOldDocId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUid.trim() || !oldDocId.trim()) return;

    setIsLoading(true);
    setResult(null);

    try {
      const res = await mergeUserProfiles(authUid.trim(), oldDocId.trim());
      setResult(res);
      if (res.success) {
        setAuthUid('');
        setOldDocId('');
      }
    } catch (err: any) {
      setResult({ success: false, message: err.message || 'Erro inesperado.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Mesclar Perfis Duplicados</h1>
        <p className="text-sm text-slate-500 mt-1">
          Use esta ferramenta para corrigir usuários que fizeram login pelo Google e tiveram um perfil duplicado criado.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <Info className="size-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 space-y-1">
          <p className="font-semibold">Como funciona:</p>
          <ol className="list-decimal list-inside space-y-1 text-blue-700">
            <li>No Firestore, encontre o documento com o <strong>UID do Google Auth</strong> (o novo, com poucos dados)</li>
            <li>Copie o <strong>ID do documento antigo</strong> (o que tem dados completos: role, célula etc.)</li>
            <li>Preencha os campos abaixo e clique em Mesclar</li>
            <li>O sistema copiará todos os dados do perfil antigo para o novo UID e marcará o antigo como migrado</li>
          </ol>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="space-y-2">
          <Label className="text-xs font-bold text-slate-500 uppercase">
            UID do Auth (documento NOVO — incompleto)
          </Label>
          <Input
            placeholder="ex: QpjGsvkG4JULL3076jDuF7mik6o2"
            value={authUid}
            onChange={e => setAuthUid(e.target.value)}
            required
            className="font-mono text-sm"
          />
          <p className="text-[11px] text-slate-400">
            Este é o ID do documento criado pelo login Google (geralmente só tem email, name, lastLoginAt).
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold text-slate-500 uppercase">
            ID do documento ANTIGO (perfil completo)
          </Label>
          <Input
            placeholder="ex: VNhiLUEXB2eEL5yNG6SnrPi9CFr2"
            value={oldDocId}
            onChange={e => setOldDocId(e.target.value)}
            required
            className="font-mono text-sm"
          />
          <p className="text-[11px] text-slate-400">
            Este é o documento com os dados completos (role, célula, jornada etc.).
          </p>
        </div>

        {result && (
          <div className={`p-4 rounded-lg flex gap-3 ${result.success ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
            {result.success
              ? <CheckCircle2 className="size-5 text-emerald-600 shrink-0 mt-0.5" />
              : <AlertCircle className="size-5 text-red-600 shrink-0 mt-0.5" />
            }
            <p className={`text-sm font-medium ${result.success ? 'text-emerald-800' : 'text-red-800'}`}>
              {result.message}
            </p>
          </div>
        )}

        <Button
          type="submit"
          disabled={isLoading || !authUid.trim() || !oldDocId.trim()}
          className="w-full font-bold gap-2"
        >
          {isLoading
            ? <><Loader2 className="size-4 animate-spin" /> Mesclando...</>
            : <><GitMerge className="size-4" /> Mesclar Perfis</>
          }
        </Button>
      </form>
    </div>
  );
}
