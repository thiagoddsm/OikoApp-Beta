'use client';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Award, Download, ExternalLink, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

interface CertificateViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  courseName: string;
  pdfUrl: string;
}

export function CertificateView({
  open,
  onOpenChange,
  studentName,
  courseName,
  pdfUrl
}: CertificateViewProps) {
  
  const handleDownload = () => {
    if (!pdfUrl) return;
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.target = '_blank';
    link.download = `Certificado_${studentName.replace(/\s+/g, '_')}_${courseName.replace(/\s+/g, '_')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[95vh] overflow-y-auto p-4 sm:p-6 shadow-2xl border-none">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-xl font-black italic tracking-tighter uppercase text-primary flex items-center gap-2">
            <Award className="size-6 text-primary" /> Visualizar Certificado
          </DialogTitle>
          <DialogDescription className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Certificado de {studentName} para o curso {courseName}.
          </DialogDescription>
        </DialogHeader>

        {/* Visualizador de PDF Embutido */}
        <div className="my-4 sm:my-6 bg-slate-100/50 rounded-xl border border-dashed p-2 min-h-[300px] flex items-center justify-center">
          {pdfUrl ? (
            <div className="w-full space-y-4">
              <iframe 
                src={`${pdfUrl}#toolbar=0&navpanes=0`} 
                className="w-full h-[500px] rounded-lg border shadow-inner hidden md:block" 
                title="Certificado PDF"
              />
              <div className="md:hidden p-8 text-center flex flex-col items-center bg-white rounded-xl border shadow-sm">
                <FileText className="size-16 text-primary mb-3" />
                <p className="font-bold text-sm text-slate-800">Visualização mobile indisponível diretamente no navegador</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">Use o botão abaixo para baixar ou abrir o documento PDF oficial no seu dispositivo.</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="size-12 mx-auto mb-2 text-slate-300 animate-pulse" />
              <p className="text-sm font-bold">Arquivo do certificado não localizado.</p>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4 gap-2 flex-col sm:flex-row">
          <Button variant="outline" className="font-bold w-full sm:w-auto" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          {pdfUrl && (
            <>
              <Button
                variant="outline"
                className="font-bold w-full sm:w-auto border-primary text-primary hover:bg-primary/5"
                asChild
              >
                <a href={pdfUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" /> Abrir em Nova Aba
                </a>
              </Button>
              <Button
                onClick={handleDownload}
                className="font-black uppercase tracking-widest shadow-lg w-full sm:w-auto"
              >
                <Download className="mr-2 h-4 w-4" /> Baixar PDF
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

