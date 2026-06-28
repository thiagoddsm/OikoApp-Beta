'use client';
import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Award, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useDoc } from '@/firebase';

interface CertificateViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  courseName: string;
  className: string;
  completionDate?: string;
}

export function CertificateView({
  open,
  onOpenChange,
  studentName,
  courseName,
  className,
  completionDate
}: CertificateViewProps) {
  const certificateRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Busca as configurações globais da igreja (assinatura e nome do signatário)
  const { data: tenantConfig } = useDoc<any>('config/tenant_details');

  // Se não houver data, usa a data atual formatada
  const formattedDate = React.useMemo(() => {
    if (completionDate) {
      try {
        const [year, month, day] = completionDate.split('-');
        return `${day}/${month}/${year}`;
      } catch (e) {
        return completionDate;
      }
    }
    const today = new Date();
    return today.toLocaleDateString('pt-BR');
  }, [completionDate]);

  const handleDownloadPDF = async () => {
    if (!certificateRef.current) return;
    setIsGenerating(true);

    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const element = certificateRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      const fileName = `Certificado_${studentName.replace(/\s+/g, '_')}_${courseName.replace(/\s+/g, '_')}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const signatoryName = tenantConfig?.signatoryName || 'Pastor Sênior';
  const signatureUrl = tenantConfig?.signatureUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl border-none">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-xl font-black italic tracking-tighter uppercase text-primary flex items-center gap-2">
            <Award className="size-6 text-primary" /> Visualizar Certificado
          </DialogTitle>
          <DialogDescription className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Visualize o certificado antes de fazer o download do documento em PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center my-6 overflow-x-auto p-2 bg-slate-100/50 rounded-xl border border-dashed">
          {/* Layout do Certificado - Proporção de A4 Paisagem (1000px x 707px) */}
          <div
            ref={certificateRef}
            className="relative bg-white text-slate-800 p-16 flex flex-col justify-between select-none shadow-lg border-[16px] border-slate-900"
            style={{
              width: '1000px',
              height: '707px',
              boxSizing: 'border-box',
              backgroundImage: 'radial-gradient(circle, rgba(248,250,252,0.6) 0%, rgba(255,255,255,1) 100%)',
            }}
          >
            {/* Linha ornamental interior */}
            <div className="absolute inset-4 border-2 border-slate-400/40 pointer-events-none" />

            {/* Cabeçalho */}
            <div className="text-center space-y-3 z-10">
              <div className="flex items-center justify-center gap-3">
                <span className="h-0.5 w-16 bg-slate-900/10" />
                <h4 className="text-[11px] font-black tracking-[0.3em] uppercase text-primary">IGREJA BATISTA DA MANHÃ</h4>
                <span className="h-0.5 w-16 bg-slate-900/10" />
              </div>
              <h1 className="text-4xl font-serif italic text-slate-900 font-extrabold tracking-tight">Certificado de Conclusão</h1>
            </div>

            {/* Corpo do Certificado */}
            <div className="text-center space-y-6 px-12 z-10">
              <p className="text-sm font-medium tracking-wide uppercase text-slate-500">Certificamos para os devidos fins que</p>
              
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 border-b-2 border-primary/20 pb-2 w-fit mx-auto px-8 min-w-[300px]">
                {studentName}
              </h2>

              <p className="text-base text-slate-600 leading-relaxed font-serif max-w-xl mx-auto italic">
                concluiu com aproveitamento e dedicação o curso de capacitação e ensino
                <span className="block text-lg font-black uppercase tracking-tight text-slate-900 not-italic mt-2">
                  {courseName}
                </span>
                <span className="text-xs text-muted-foreground block mt-1 uppercase font-black not-italic tracking-wider">
                  Turma: {className}
                </span>
              </p>
            </div>

            {/* Rodapé - Assinatura e Data */}
            <div className="flex justify-between items-end px-10 z-10">
              {/* Data */}
              <div className="text-left space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Data de Conclusão</span>
                <span className="text-sm font-black text-slate-800">{formattedDate}</span>
              </div>

              {/* Assinatura */}
              <div className="text-center flex flex-col items-center min-w-[220px]">
                {signatureUrl ? (
                  <div className="h-16 flex items-end justify-center mb-1">
                    <img 
                      src={signatureUrl} 
                      alt="Assinatura Pastor" 
                      className="max-h-16 max-w-[200px] object-contain opacity-95" 
                      crossOrigin="anonymous"
                    />
                  </div>
                ) : (
                  <div className="h-16 border-b border-dashed border-slate-300 w-full mb-1 flex items-center justify-center text-[10px] text-muted-foreground italic">
                    Assinatura não cadastrada
                  </div>
                )}
                <div className="w-full border-t border-slate-300 pt-1.5">
                  <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{signatoryName}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Assinatura Autorizada</p>
                </div>
              </div>
            </div>

            {/* Marca d'água decorativa ou elemento gráfico de fundo */}
            <div className="absolute right-8 bottom-8 opacity-5">
              <Award className="size-48 text-slate-900" />
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-4 gap-2">
          <Button variant="outline" className="font-bold" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button
            onClick={handleDownloadPDF}
            disabled={isGenerating}
            className="font-black uppercase tracking-widest shadow-lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando PDF...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" /> Baixar PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
