'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function CursoApoiarRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Redireciona automaticamente para a Central Geral de Questionários
    const timer = setTimeout(() => {
      router.replace('/dashboard/teaching/questionarios');
    }, 800);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex-1 p-8 flex items-center justify-center min-h-[500px]">
      <Card className="max-w-md w-full border-purple-200 shadow-md">
        <CardContent className="p-8 text-center space-y-4">
          <div className="size-14 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto shadow-xs">
            <Sparkles className="size-7" />
          </div>

          <div className="space-y-1.5">
            <h3 className="font-black text-xl text-slate-900">
              Redirecionando para a Central
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              O módulo de questionários interativos agora é genérico para todos os cursos presenciais da plataforma.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-purple-700 font-bold pt-2">
            <Loader2 className="size-4 animate-spin" />
            <span>Abrindo /dashboard/teaching/questionarios...</span>
          </div>

          <div className="pt-2">
            <Button asChild size="sm" className="w-full bg-purple-700 hover:bg-purple-800 text-white font-bold gap-2">
              <Link href="/dashboard/teaching/questionarios">
                Acessar Central de Questionários <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
