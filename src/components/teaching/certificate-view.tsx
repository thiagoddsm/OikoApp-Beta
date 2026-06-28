'use client';
import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Award, Download, ShieldCheck } from 'lucide-react';
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
      <DialogContent className="sm:max-w-5xl max-h-[95vh] overflow-y-auto p-4 sm:p-6 shadow-2xl border-none">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-xl font-black italic tracking-tighter uppercase text-primary flex items-center gap-2">
            <Award className="size-6 text-primary" /> Visualizar Certificado
          </DialogTitle>
          <DialogDescription className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Compatível com visualização em celulares. Use o botão para fazer o download oficial.
          </DialogDescription>
        </DialogHeader>

        {/* Wrapper Responsivo com Escalonamento Inteligente para Celulares */}
        <div className="flex justify-center my-4 sm:my-6 overflow-hidden p-1 sm:p-2 bg-slate-100/50 rounded-xl border border-dashed min-h-[260px] xs:min-h-[320px] sm:min-h-[480px] md:min-h-[580px] lg:min-h-[720px] items-center relative">
          
          {/* Container que escala usando transform no celular */}
          <div className="scale-[0.28] xs:scale-[0.38] sm:scale-[0.55] md:scale-[0.72] lg:scale-100 origin-center transition-all duration-300 flex-shrink-0 absolute">
            {/* Layout do Certificado - Proporção de A4 Paisagem (1000px x 707px) */}
            <div
              ref={certificateRef}
              className="relative bg-white text-slate-800 p-16 flex flex-col justify-between select-none shadow-xl border-[20px] border-double border-slate-900"
              style={{
                width: '1000px',
                height: '707px',
                boxSizing: 'border-box',
                backgroundImage: 'radial-gradient(circle, #fcfdfd 0%, #f4f6f8 100%)',
              }}
            >
              {/* Linhas ornamentais interiores */}
              <div className="absolute inset-3 border border-slate-300 pointer-events-none" />
              <div className="absolute inset-6 border border-slate-300 pointer-events-none" />

              {/* Cabeçalho */}
              <div className="text-center space-y-4 z-10">
                <div className="flex items-center justify-center gap-4">
                  <span className="h-[1px] w-20 bg-slate-900/20" />
                  <h4 className="text-[10px] font-black tracking-[0.4em] uppercase text-primary">IGREJA BATISTA DA MANHÃ</h4>
                  <span className="h-[1px] w-20 bg-slate-900/20" />
                </div>
                <h1 className="text-5xl font-serif text-slate-900 font-extrabold tracking-tight pt-2">
                  Certificado de Conclusão
                </h1>
              </div>

              {/* Corpo do Certificado */}
              <div className="text-center space-y-6 px-16 z-10">
                <p className="text-xs font-bold tracking-[0.2em] uppercase text-slate-400">Certificamos para os devidos fins que o aluno(a)</p>
                
                <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 border-b-[3px] border-double border-primary/30 pb-3 w-fit mx-auto px-12 font-serif italic">
                  {studentName}
                </h2>

                <p className="text-base text-slate-600 leading-relaxed font-serif max-w-2xl mx-auto italic">
                  concluiu com aproveitamento, compromisso e dedicação o curso de capacitação
                  <span className="block text-2xl font-black uppercase tracking-tighter text-slate-900 not-italic mt-3">
                    {courseName}
                  </span>
                  <span className="text-[10px] bg-slate-900/5 px-3 py-1 rounded text-slate-500 block w-fit mx-auto mt-2 uppercase font-black not-italic tracking-widest border">
                    Turma: {className}
                  </span>
                </p>
              </div>

              {/* Rodapé - Assinatura e Data */}
              <div className="flex justify-between items-end px-12 z-10">
                {/* Data */}
                <div className="text-left space-y-1.5 pb-2">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Data de Conclusão</span>
                  <span className="text-sm font-black text-slate-800 bg-slate-900/5 px-2.5 py-1 rounded border">{formattedDate}</span>
                </div>

                {/* Badge de Selo Dourado Decorativo */}
                <div className="flex flex-col items-center justify-center opacity-70">
                  <div className="size-16 rounded-full border-4 border-double border-amber-500 bg-amber-50 flex items-center justify-center text-amber-600 shadow-sm">
                    <ShieldCheck className="size-8" />
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-wider text-amber-600 mt-1">Selo de Autenticidade</span>
                </div>

                {/* Assinatura */}
                <div className="text-center flex flex-col items-center min-w-[240px]">
                  {signatureUrl ? (
                    <div className="h-16 flex items-end justify-center mb-1">
                      <img 
                        src={signatureUrl} 
                        alt="Assinatura Pastor" 
                        className="max-h-16 max-w-[220px] object-contain opacity-95" 
                        crossOrigin="anonymous"
                      />
                    </div>
                  ) : (
                    <div className="h-16 border-b border-dashed border-slate-300 w-full mb-1 flex items-center justify-center text-[10px] text-muted-foreground italic">
                      Assinatura não cadastrada
                    </div>
                  )}
                  <div className="w-full border-t border-slate-300 pt-2">
                    <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{signatoryName}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Pastor Presidente</p>
                  </div>
                </div>
              </div>

              {/* Marca d'água decorativa no fundo */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.02] pointer-events-none">
                <Award className="size-[400px] text-slate-900" />
              </div>
            </div>
          </div>

        </div>

        <DialogFooter className="border-t pt-4 gap-2 flex-col sm:flex-row">
          <Button variant="outline" className="font-bold w-full sm:w-auto" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button
            onClick={handleDownloadPDF}
            disabled={isGenerating}
            className="font-black uppercase tracking-widest shadow-lg w-full sm:w-auto"
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

