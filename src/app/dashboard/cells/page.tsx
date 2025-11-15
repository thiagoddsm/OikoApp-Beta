import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function CellsPage() {
  return (
     <Card>
        <CardHeader>
            <CardTitle>Gestão de Células</CardTitle>
            <CardDescription>
                Gerencie as células, líderes e supervisores.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex items-center justify-center h-48 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">Página de Células em construção.</p>
            </div>
        </CardContent>
    </Card>
  );
}
