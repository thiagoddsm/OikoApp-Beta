'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Map } from "lucide-react";

export default function MapPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Map className="size-5" />
          Mapa das Células
        </CardTitle>
        <CardDescription>
          Visualize a localização de todas as células em um mapa interativo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center h-96 border-2 border-dashed rounded-lg bg-muted">
          <p className="text-muted-foreground">Funcionalidade de Mapa em desenvolvimento.</p>
        </div>
      </CardContent>
    </Card>
  );
}
