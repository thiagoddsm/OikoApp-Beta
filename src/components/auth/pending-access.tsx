'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Mail } from 'lucide-react';

interface PendingAccessProps {
  userName?: string | null;
  onLogout: () => void;
}

export function PendingAccess({ userName, onLogout }: PendingAccessProps) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md text-center shadow-lg">
        <CardHeader>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Clock className="h-8 w-8" />
          </div>
          <CardTitle className="mt-4 text-2xl font-bold">Acesso em Análise</CardTitle>
          <CardDescription>
            Olá, {userName || 'Usuário'}! Obrigado por se registrar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Seu acesso ao painel precisa ser aprovado por um administrador. Isso garante a segurança e a integridade de nossa comunidade.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Você será notificado assim que seu acesso for liberado.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button onClick={onLogout} className="w-full">
            Sair
          </Button>
          <a
            href="mailto:suporte@igreja.com"
            className="text-xs text-muted-foreground underline hover:text-primary"
          >
            Precisa de ajuda? Fale com o suporte.
          </a>
        </CardFooter>
      </Card>
    </div>
  );
}
