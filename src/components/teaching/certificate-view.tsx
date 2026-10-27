'use client';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Award, Download, ExternalLink, FileText, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useFirebase } from '@/firebase';
import { generateAndSaveCertificate, generateCertificatePdf } from '@/lib/teaching/certificate-generator';
import { useToast } from '@/hooks/use-toast';

export interface CertificateViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId?: string;
  courseId?: string;
  studentName: string;
  courseName: string;
  trackName?: string;
  workloadHours?: number;
  pdfUrl?: string;
  onCertificateGenerated?: (url: string) => void;
}

export function CertificateView({
  open,
  onOpenChange,
  studentId,
  courseId,
  studentName,
  courseName,
  trackName,
  workloadHours,
  pdfUrl,
  onCertificateGenerated
}: CertificateViewProps) {
  const { firestore, storage } = useFirebase();
  const { toast } = useToast();

  const [currentPdfUrl, setCurrentPdfUrl] = useState<string>(pdfUrl || '');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedSuccessfully, setGeneratedSuccessfully] = useState<boolean>(false);

  useEffect(() => {
    if (!open) {
      setGeneratedSuccessfully(false);
      return;
    }

    if (pdfUrl) {
      setCurrentPdfUrl(pdfUrl);
      return;
    }

    // Se não há PDF gravado, aciona a emissão automática inteligente imediatamente!
    if (studentName && courseName) {
      handleAutoGenerate();
    }
  }, [open, pdfUrl, studentId, courseId, studentName, courseName]);

  const handleAutoGenerate = async () => {
    setIsGenerating(true);
    try {
      if (firestore && storage && studentId && courseId) {
        const downloadUrl = await generateAndSaveCertificate({
          studentId,
          studentName,
          courseId,
          courseName,
          trackName,
          workloadHours,
          firestore,
          storage
        });
        setCurrentPdfUrl(downloadUrl);
        setGeneratedSuccessfully(true);
        if (onCertificateGenerated) onCertificateGenerated(downloadUrl);
        toast({
          title: "Certificado Digital Emitido! 🎓",
          description: `O certificado oficial de ${studentName} foi gerado e salvo com sucesso.`
        });
      } else {
        // Fallback autônomo em memória (gera Blob URL para download imediato)
        const docPdf = await generateCertificatePdf({
          studentId: studentId || 'STUDENT',
          studentName,
          courseId: courseId || 'COURSE',
          courseName,
          trackName,
          workloadHours
        });
        const blob = docPdf.output('blob');
        const blobUrl = URL.createObjectURL(blob);
        setCurrentPdfUrl(blobUrl);
        setGeneratedSuccessfully(true);
      }
    } catch (err: any) {
      console.error('[CertificateView] Erro ao gerar certificado automático:', err);
      toast({
        variant: "destructive",
        title: "Erro na Emissão",
        description: err.message || "Não foi possível compilar o certificado digital."
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!currentPdfUrl) return;
    const link = document.createElement('a');
    link.href = currentPdfUrl;
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
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-xl font-black italic tracking-tighter uppercase text-primary flex items-center gap-2">
                <Award className="size-6 text-primary" /> Certificado Digital de Conclusão
              </DialogTitle>
              <DialogDescription className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {studentName} • {courseName}
              </DialogDescription>
            </div>
            {generatedSuccessfully && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="size-3.5 text-emerald-600" /> Emitido com Sucesso
              </span>
            )}
          </div>
        </DialogHeader>

        {/* Visualizador de PDF Embutido */}
        <div className="my-4 sm:my-6 bg-slate-900/5 dark:bg-slate-900/40 rounded-xl border border-dashed p-2 min-h-[360px] flex items-center justify-center">
          {isGenerating ? (
            <div className="text-center py-16 space-y-3">
              <div className="relative mx-auto size-14">
                <Loader2 className="size-14 animate-spin text-primary" />
                <Sparkles className="size-6 text-amber-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Emitindo Certificado Oficial...
              </p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Validando aprovação, inserindo assinatura pastoral e compilando documento em alta resolução.
              </p>
            </div>
          ) : currentPdfUrl ? (
            <div className="w-full space-y-4">
              <iframe 
                src={`${currentPdfUrl}#toolbar=0&navpanes=0`} 
                className="w-full h-[520px] rounded-lg border shadow-inner hidden md:block bg-white" 
                title="Certificado PDF"
              />
              <div className="md:hidden p-8 text-center flex flex-col items-center bg-white dark:bg-slate-950 rounded-xl border shadow-sm">
                <Award className="size-16 text-primary mb-3" />
                <p className="font-bold text-sm text-slate-800 dark:text-slate-100">Certificado Digital Pronto!</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  O documento PDF oficial está disponível para download imediato no seu dispositivo.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground space-y-3">
              <FileText className="size-12 mx-auto text-slate-300" />
              <p className="text-sm font-bold">Arquivo ainda não emitido.</p>
              <Button onClick={handleAutoGenerate} className="text-xs font-black uppercase tracking-wider gap-1.5">
                <Sparkles className="size-4 text-amber-300" /> Emitir Certificado Agora
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4 gap-2 flex-col sm:flex-row">
          <Button variant="outline" className="font-bold w-full sm:w-auto text-xs" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          {currentPdfUrl && !isGenerating && (
            <>
              <Button
                variant="outline"
                className="font-bold w-full sm:w-auto border-primary text-primary hover:bg-primary/5 text-xs"
                asChild
              >
                <a href={currentPdfUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" /> Abrir em Nova Aba
                </a>
              </Button>
              <Button
                onClick={handleDownload}
                className="font-black uppercase tracking-widest shadow-lg w-full sm:w-auto text-xs"
              >
                <Download className="mr-2 h-4 w-4" /> Baixar Certificado (PDF)
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
