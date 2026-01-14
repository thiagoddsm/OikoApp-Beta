'use client';
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, UploadCloud, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { discipleshipPhasesData } from '@/lib/discipleship-data';
import { useFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';

export function DiscipleshipChecklistManager() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);
  const [importCompleted, setImportCompleted] = useState(false);

  const handleImportDefaults = async () => {
    if (!firestore) return;
    setIsImporting(true);

    try {
      const promises = discipleshipPhasesData.map(phase => {
        const phaseDocRef = doc(firestore, 'discipleship_checklists', phase.id);
        const dataToSave = {
          phaseId: phase.id,
          title: phase.title,
          questions: phase.questions,
        };
        // Use non-blocking write for each document
        setDocumentNonBlocking(phaseDocRef, dataToSave);
      });
      
      // We don't await promises here, but in a real scenario you might
      // to handle UI feedback after all writes are queued.
      // For this implementation, we assume it's "fire and forget".
      
      toast({
        title: 'Importação Iniciada!',
        description: 'Os checklists padrão estão sendo salvos no banco de dados.',
      });
      setImportCompleted(true);
    } catch (error) {
      console.error("Error importing checklist data:", error);
      toast({
        variant: 'destructive',
        title: 'Erro na Importação',
        description: 'Não foi possível salvar os checklists padrão.',
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Checklists da Jornada</CardTitle>
        <CardDescription>
          Gerencie as perguntas de acompanhamento para cada fase da jornada do membro. Você pode começar importando os checklists padrão.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* The management UI will be built here */}
        <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">A interface para adicionar, editar e remover perguntas será construída aqui.</p>
           {!importCompleted ? (
              <Button onClick={handleImportDefaults} disabled={isImporting}>
                {isImporting ? <Loader2 className="mr-2 size-4 animate-spin"/> : <UploadCloud className="mr-2 size-4"/>}
                Importar Checklists Padrão
              </Button>
           ) : (
            <div className="flex items-center gap-2 text-green-600 font-semibold">
                <CheckCircle className="size-5" />
                Checklists padrão importados com sucesso!
            </div>
           )}
        </div>
      </CardContent>
    </Card>
  );
}
