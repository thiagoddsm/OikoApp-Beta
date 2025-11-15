import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function SettingsPage() {
  return (
     <Card>
        <CardHeader>
            <CardTitle>Configurações</CardTitle>
            <CardDescription>
                Gerencie as configurações da sua conta e da aplicação.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex items-center justify-center h-48 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">Página de Configurações em construção.</p>
            </div>
        </CardContent>
    </Card>
  );
}
