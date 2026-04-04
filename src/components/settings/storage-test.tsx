'use client';

import React, { useState, useRef } from 'react';
import { useFirebase } from '@/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertTriangle, Loader2, UploadCloud, File as FileIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function StorageTest() {
  const { storage } = useFirebase();
  const { toast } = useToast();
  
  // State is used to trigger UI re-renders (e.g., show the file name and enable the button)
  const [fileName, setFileName] = useState<string | null>(null);
  // Ref is used to hold the most current value of the file for the upload handler
  const fileRef = useRef<File | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ status: 'success' | 'error'; message: string; url?: string } | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files ? event.target.files[0] : null;
    if (selectedFile) {
      setFileName(selectedFile.name); // Update state to re-render UI
      fileRef.current = selectedFile;   // Update ref to hold the actual file data
      setUploadResult(null);
    }
  };

  const handleTestUpload = async () => {
    // Always read from the ref inside the handler to prevent stale state issues
    const currentFile = fileRef.current;

    if (!currentFile || !storage) {
      toast({
        variant: 'destructive',
        title: 'Nenhum arquivo selecionado',
        description: 'Por favor, escolha um arquivo para testar o upload.',
      });
      return;
    }

    setIsLoading(true);
    setUploadResult(null);
    const testRef = ref(storage, `test-uploads/${new Date().toISOString()}_${currentFile.name}`);

    try {
      const snapshot = await uploadBytes(testRef, currentFile);
      const downloadURL = await getDownloadURL(snapshot.ref);
      setUploadResult({
        status: 'success',
        message: 'Upload realizado com sucesso! O Firebase Storage está funcionando.',
        url: downloadURL,
      });
      toast({
        title: 'Sucesso!',
        description: 'O arquivo foi enviado para o Storage.',
      });
    } catch (error: any) {
      console.error("Storage upload error:", error);
      setUploadResult({
        status: 'error',
        message: `Falha no upload: ${error.message}. Verifique as regras de segurança do Storage e a configuração do bucket.`,
      });
      toast({
        variant: 'destructive',
        title: 'Erro no Upload',
        description: 'Não foi possível enviar o arquivo. Verifique o console para detalhes.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Diagnóstico do Sistema</CardTitle>
        <CardDescription>
          Use esta ferramenta para verificar a saúde e a conectividade dos serviços essenciais, como o Firebase Storage.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
          <div className="p-6 border-2 border-dashed rounded-lg">
              <div className="text-center">
                  <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold text-slate-800">Teste de Escrita no Storage</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                      Selecione um arquivo e clique em "Testar Upload" para verificar se o sistema consegue gravar dados no Firebase Storage.
                  </p>
              </div>

              <div className="mt-6 max-w-md mx-auto">
                <div className="flex items-center gap-4">
                    <Input id="storage-test-file" type="file" onChange={handleFileChange} className="flex-1" />
                    <Button onClick={handleTestUpload} disabled={isLoading || !fileName}>
                        {isLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Testar Upload
                    </Button>
                </div>
                {fileName && (
                    <div className="mt-4 flex items-center justify-center text-sm text-muted-foreground">
                        <FileIcon className="mr-2 size-4" />
                        <span>{fileName}</span>
                    </div>
                )}
              </div>
          </div>

        {uploadResult && (
          <div
            className={`mt-4 p-4 rounded-md ${
              uploadResult.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
          >
            <div className="flex">
              <div className="flex-shrink-0">
                {uploadResult.status === 'success' ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <AlertTriangle className="h-5 w-5" />
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{uploadResult.message}</p>
                {uploadResult.url && (
                  <a
                    href={uploadResult.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 text-sm font-semibold underline hover:text-green-900"
                  >
                    Ver arquivo enviado
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
