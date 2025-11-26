'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Upload, FileSpreadsheet } from 'lucide-react';

export function ImportTab() {

  const handleDownloadTemplate = () => {
    // Em um cenário real, isso geraria e baixaria um arquivo .xlsx ou .csv
    alert("Iniciando o download do modelo de planilha...");
  };

  const handleImport = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Em um cenário real, isso leria o arquivo e o enviaria para o backend
    alert("Arquivo enviado para importação! (Funcionalidade em desenvolvimento)");
  };
  
  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="size-5 text-primary" />
            Passo 1: Baixar Modelo
          </CardTitle>
          <CardDescription>
            Faça o download da planilha modelo para garantir que os dados estejam no formato correto antes de importar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleDownloadTemplate}>
            <FileSpreadsheet className="mr-2 size-4" />
            Baixar modelo de planilha (.xlsx)
          </Button>
        </CardContent>
      </Card>

      <Card>
         <form onSubmit={handleImport}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="size-5 text-primary" />
                Passo 2: Importar Planilha
              </CardTitle>
              <CardDescription>
                Selecione o arquivo da planilha preenchida para importar os registros de presença de uma só vez.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label htmlFor="excel-file">Arquivo Excel</Label>
                    <Input id="excel-file" type="file" accept=".xlsx, .xls" required />
                </div>
                 <Button type="submit">
                    <Upload className="mr-2 size-4" />
                    Importar Dados
                </Button>
            </CardContent>
         </form>
      </Card>
    </div>
  );
}
