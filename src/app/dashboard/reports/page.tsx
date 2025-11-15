import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function ReportsPage() {
  return (
     <Card>
        <CardHeader>
            <CardTitle>Relatórios</CardTitle>
            <CardDescription>
                Visualize relatórios de frequência, crescimento e outros indicadores.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex items-center justify-center h-48 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">Página de Relatórios em construção.</p>
            </div>
        </CardContent>
    </Card>
  );
}
