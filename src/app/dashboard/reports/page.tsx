import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { BarChart2 } from "lucide-react";

export default function ReportsPage() {
  return (
     <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <BarChart2 className="size-5" />
                Análises
            </CardTitle>
            <CardDescription>
                Visualize relatórios de frequência, crescimento e outros indicadores.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex items-center justify-center h-48 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">Página de Análises em construção.</p>
            </div>
        </CardContent>
    </Card>
  );
}
