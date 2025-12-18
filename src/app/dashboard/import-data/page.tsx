
'use client';

import React, { useState } from 'react';
import { useFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Loader2, Upload, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { historicalData } from './historical-data';

const parseDate = (dateStr: string): Date => {
  const [day, month, year] = dateStr.split('/');
  // The time should be set to noon to avoid timezone issues when converting back.
  return new Date(`${year}-${month}-${day}T12:00:00`);
};

export default function ImportDataPage() {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);
  const [importCompleted, setImportCompleted] = useState(false);
  const [importCount, setImportCount] = useState(0);

  const handleImport = async () => {
    if (!user || !firestore) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para importar dados.",
        variant: "destructive",
      });
      return;
    }
    
    setIsImporting(true);
    setImportCompleted(false);
    setImportCount(0);
    let count = 0;

    const collectionRef = collection(firestore, `cultos/${user.uid}/registros`);

    // Use Promise.all to wait for all non-blocking writes to be queued
    const importPromises = historicalData.map(record => {
      const recordData = {
        data: Timestamp.fromDate(parseDate(record.date)),
        horario: record.horario,
        adultos: record.adultos,
        criancas: record.criancas,
        serieMensagem: 'Importado Historico', // Generic series name
        clima: 'Agradável',
        feriadoProximo: false,
        jogoFutebol: false,
        apresentacaoBebe: false,
        observacoes: 'Dados importados do sistema anterior.',
        criadoEm: Timestamp.now()
      };
      
      // We don't await each call here
      return addDocumentNonBlocking(collectionRef, recordData).then(() => {
        count++;
      });
    });

    try {
        await Promise.all(importPromises);
        setImportCount(count);
        setIsImporting(false);
        setImportCompleted(true);
        toast({
            title: "Importação Concluída!",
            description: `${count} registros foram adicionados à fila de gravação.`,
        });
    } catch(e) {
        console.error("Error during batch import:", e);
        setIsImporting(false);
        toast({
            title: "Erro na Importação",
            description: "Ocorreu um erro ao tentar salvar os registros. Verifique o console.",
            variant: "destructive",
        });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importação de Dados Históricos</CardTitle>
        <CardDescription>
          Esta página é um utilitário para popular o banco de dados com a frequência de cultos histórica.
          Clique no botão abaixo para iniciar o processo.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center space-y-4">
        <p className="text-sm text-muted-foreground">
          {historicalData.length} registros prontos para serem importados.
        </p>
        <Button onClick={handleImport} disabled={isImporting || importCompleted}>
          {isImporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Importando...
            </>
          ) : (
            <>
             {importCompleted ? <CheckCircle className="mr-2 h-4 w-4" /> : <Upload className="mr-2 h-4 w-4" />}
             {importCompleted ? 'Dados Importados' : 'Iniciar Importação'}
            </>
          )}
        </Button>
        {importCompleted && (
            <p className="text-green-600 font-medium">
                {importCount} registros foram importados com sucesso! Você já pode remover esta página de importação.
            </p>
        )}
      </CardContent>
    </Card>
  );
}
