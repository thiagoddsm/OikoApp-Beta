import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function MembersPage() {
  return (
    <Card>
        <CardHeader>
            <CardTitle>Gestão de Membros</CardTitle>
            <CardDescription>
                Aqui você pode visualizar, adicionar, editar e remover membros da igreja.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex items-center justify-center h-48 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">Página de Membros em construção.</p>
            </div>
        </CardContent>
    </Card>
  );
}
