'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { HardHat } from 'lucide-react';

interface UnderConstructionProps {
  pageTitle: string;
  pageDescription: string;
}

export function UnderConstruction({ pageTitle, pageDescription }: UnderConstructionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardHat className="size-5 text-primary" />
          {pageTitle}
        </CardTitle>
        <CardDescription>{pageDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg text-center p-8">
          <HardHat className="size-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground">Página em Construção</h3>
          <p className="text-muted-foreground mt-2">
            Estamos trabalhando duro para trazer esta funcionalidade para o OikoApp. <br/> Volte em breve para conferir as novidades!
          </p>
        </div>
      </CardContent>
    </Card>
  );
}