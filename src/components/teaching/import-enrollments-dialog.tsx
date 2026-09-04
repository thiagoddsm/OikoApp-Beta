'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, Download, FileSpreadsheet, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useVolunteering, type Course, type Class } from '@/contexts/volunteering-context';
import * as XLSX from 'xlsx';
import { useMembersData, useCoursesData } from "@/hooks/useDomainData";

interface ImportEnrollmentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedRow {
  nome: string;
  email: string;
  telefone: string;
  cursoId: string;
  cursoNome: string;
}

interface PendingMapping {
  courseId: string;
  courseName: string;
  studentCount: number;
  availableClasses: Class[];
}

export function ImportEnrollmentsDialog({ open, onOpenChange }: ImportEnrollmentsDialogProps) {
    const { users } = useMembersData();
    const { courses, classes, enrollmentRequests, pedagogicalLogs, theoflixCourses } = useCoursesData();

  const { addUser, enrollStudent } = useVolunteering();
  const { toast } = useToast();
  
  const [step, setStep] = useState<'upload' | 'mapping'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [pendingMappings, setPendingMappings] = useState<PendingMapping[]>([]);
  const [classSelections, setClassSelections] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) {
      setStep('upload');
      setParsedRows([]);
      setPendingMappings([]);
      setClassSelections({});
      setFile(null);
      setIsProcessing(false);
      setIsDownloading(false);
    }
  }, [open]);

  const downloadTemplate = async () => {
    setIsDownloading(true);
    try {
        // Dynamic import to prevent SSR/Next.js hydration freezes with heavy node-dependent libs
        const ExcelJS = (await import('exceljs')).default;
        const { saveAs } = await import('file-saver');

        const workbook = new ExcelJS.Workbook();
        const sheetMatriculas = workbook.addWorksheet('Matrículas');
        const sheetOpcoes = workbook.addWorksheet('Opcoes');

        const courseNames = courses.map(c => c.name);

        courseNames.forEach((name, i) => {
            sheetOpcoes.getCell(`A${i + 1}`).value = name;
        });

        sheetOpcoes.state = 'hidden'; 

        sheetMatriculas.columns = [
            { header: 'Nome', key: 'nome', width: 30 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Telefone', key: 'telefone', width: 20 },
            { header: 'Curso', key: 'curso', width: 40 },
        ];

        sheetMatriculas.addRow({
            nome: 'João Exemplo',
            email: 'joao@email.com',
            telefone: '21999999999',
            curso: courseNames[0] || ''
        });

        for (let i = 2; i <= 1000; i++) {
            if (courseNames.length > 0) {
                sheetMatriculas.getCell(`D${i}`).dataValidation = {
                    type: 'list',
                    allowBlank: true,
                    formulae: [`'Opcoes'!$A$1:$A$${courseNames.length}`],
                    showErrorMessage: true,
                    errorTitle: 'Curso Inválido',
                    error: 'Por favor, selecione um curso da lista suspensa.'
                };
            }
        }

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, 'modelo_importacao_matriculas.xlsx');
    } catch (error) {
        console.error("Error generating Excel template:", error);
        toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível gerar a planilha modelo.' });
    } finally {
        setIsDownloading(false);
    }
  };

  const normalizeString = (str: string) => {
    return str.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  };

  const handleFileParse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Selecione um arquivo Excel.' });
      return;
    }

    setIsProcessing(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets['Matrículas'] || workbook.Sheets[workbook.SheetNames[0]]; 
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      let errorCount = 0;
      let errorMessages: string[] = [];
      const validRows: ParsedRow[] = [];
      
      const requiredMappings = new Map<string, { course: Course, count: number }>();
      const initialSelections: Record<string, string> = {};

      for (const [index, row] of jsonData.entries()) {
        const rowNum = index + 2; 
        const nome = row['Nome'] || row['nome'] || row['Nome do Aluno'] || '';
        const email = row['Email'] || row['E-mail'] || row['email'] || '';
        const telefone = row['Telefone'] || row['telefone'] || '';
        const cursoNome = row['Curso'] || row['curso'] || '';

        if (!nome || !cursoNome) {
          if (!nome && !email && !telefone && !cursoNome) continue; 
          errorCount++;
          errorMessages.push(`Linha ${rowNum}: Nome e Curso são obrigatórios.`);
          continue;
        }
        
        if (nome === 'João Exemplo' && email === 'joao@email.com') {
            continue;
        }

        const course = courses.find(c => normalizeString(c.name) === normalizeString(cursoNome));
        if (!course) {
          errorCount++;
          errorMessages.push(`Linha ${rowNum}: Curso "${cursoNome}" não encontrado no sistema.`);
          continue;
        }

        validRows.push({
            nome,
            email,
            telefone,
            cursoId: course.id,
            cursoNome: course.name
        });

        // Check if course has multiple classes
        const courseClasses = classes.filter(c => c.courseId === course.id);
        
        if (courseClasses.length > 1) {
             if (!requiredMappings.has(course.id)) {
                 requiredMappings.set(course.id, { course, count: 0 });
             }
             requiredMappings.get(course.id)!.count++;
        } else if (courseClasses.length === 1) {
             initialSelections[course.id] = courseClasses[0].id;
        }
      }

      if (errorCount > 0) {
           toast({
               variant: 'destructive',
               title: 'Aviso na Leitura',
               description: `${errorCount} linhas ignoradas por estarem incompletas ou com cursos inválidos.`
           });
           console.warn("Erros de Importação:", errorMessages);
      }

      if (validRows.length === 0) {
          toast({ variant: 'destructive', title: 'Erro', description: 'Nenhum dado válido encontrado para importar.' });
          setIsProcessing(false);
          return;
      }

      setClassSelections(initialSelections);
      setParsedRows(validRows);

      if (requiredMappings.size > 0) {
          setPendingMappings(Array.from(requiredMappings.values()).map(m => ({
              courseId: m.course.id,
              courseName: m.course.name,
              studentCount: m.count,
              availableClasses: classes.filter(c => c.courseId === m.course.id)
          })));
          setStep('mapping');
          setIsProcessing(false);
      } else {
          // No mapping required, execute directly
          await executeImport(validRows, initialSelections);
      }

    } catch (error) {
      console.error(error);
      setIsProcessing(false);
      toast({ variant: 'destructive', title: 'Erro', description: 'Ocorreu um erro ao ler o arquivo Excel. Verifique a formatação.' });
    }
  };

  const executeImport = async (rowsToImport: ParsedRow[], selections: Record<string, string>) => {
      setIsProcessing(true);
      try {
          let successCount = 0;

          for (const row of rowsToImport) {
              const targetClassId = selections[row.cursoId];

              // Find or Create User
              let studentId = '';
              const existingUser = users.find(u => 
                (row.email && u.email?.toLowerCase() === row.email.toLowerCase()) || 
                (row.telefone && u.phone === row.telefone) ||
                (normalizeString(u.name) === normalizeString(row.nome))
              );

              if (existingUser) {
                studentId = existingUser.id;
              } else {
                studentId = await addUser({
                  name: row.nome,
                  email: row.email,
                  phone: row.telefone,
                  integrationStatus: 'nao_alcancado',
                });
              }

              // Enroll User
              await enrollStudent(studentId, row.cursoId, targetClassId);
              successCount++;
          }

          toast({
            title: 'Importação Concluída',
            description: `${successCount} matrículas realizadas com sucesso.`,
          });

          onOpenChange(false);
      } catch (error) {
          console.error("Erro na importação:", error);
          toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao processar algumas matrículas no banco de dados.' });
      } finally {
          setIsProcessing(false);
      }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
        if (!isProcessing && !isDownloading) onOpenChange(val);
    }}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="size-5 text-emerald-600" />
            {step === 'upload' ? 'Importar Matrículas' : 'Direcionamento de Turmas'}
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' 
                ? 'Faça upload de uma planilha do Excel para matricular alunos em massa no sistema.'
                : 'Alguns cursos identificados na sua planilha possuem mais de uma turma aberta. Por favor, indique para qual turma os alunos devem ir.'
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' ? (
            <form onSubmit={handleFileParse} className="space-y-6 py-4">
            <div className="p-4 bg-muted/50 rounded-lg border border-dashed space-y-3">
                <h4 className="text-sm font-bold flex items-center gap-2">
                <Download className="size-4" /> 1. Baixe o Modelo
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                Baixe a nossa planilha. Nela você preenche Nome, Email, Telefone e Curso. O campo de Curso é uma lista suspensa com todas as opções do sistema.
                </p>
                <Button type="button" variant="outline" size="sm" onClick={downloadTemplate} disabled={isDownloading} className="w-full text-xs font-bold bg-white">
                {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Baixar Planilha Modelo (.xlsx)'}
                </Button>
            </div>

            <div className="space-y-3">
                <h4 className="text-sm font-bold flex items-center gap-2">
                <Upload className="size-4" /> 2. Envie o Arquivo Preenchido
                </h4>
                <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="excel-file" className="text-xs text-muted-foreground uppercase font-bold">Arquivo Excel (.xlsx)</Label>
                <Input 
                    id="excel-file" 
                    type="file" 
                    accept=".xlsx, .xls" 
                    ref={fileInputRef}
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    required 
                />
                </div>
                {file && (
                    <div className="flex items-center gap-2 p-2 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-md border border-emerald-200">
                        <CheckCircle2 className="size-4" />
                        {file.name}
                    </div>
                )}
            </div>

            <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                <Button type="submit" disabled={!file || isProcessing || isDownloading} className="bg-emerald-600 hover:bg-emerald-700">
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Avançar'}
                </Button>
            </DialogFooter>
            </form>
        ) : (
            <div className="space-y-6 py-4">
                <div className="max-h-[300px] overflow-y-auto space-y-4 pr-2">
                    {pendingMappings.map(mapping => (
                        <div key={mapping.courseId} className="p-4 bg-muted/40 rounded-xl border space-y-3">
                            <div>
                                <h4 className="font-bold text-sm text-slate-900">{mapping.courseName}</h4>
                                <p className="text-xs text-muted-foreground">{mapping.studentCount} aluno(s) aguardando direcionamento</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <ArrowRight className="size-4 text-muted-foreground shrink-0" />
                                <div className="flex-1">
                                    <Select 
                                        value={classSelections[mapping.courseId] || ''} 
                                        onValueChange={(val) => setClassSelections(prev => ({...prev, [mapping.courseId]: val}))}
                                    >
                                        <SelectTrigger className="w-full bg-white">
                                            <SelectValue placeholder="Selecione a Turma..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {mapping.availableClasses.map(cls => (
                                                <SelectItem key={cls.id} value={cls.id}>
                                                    {cls.name} <span className="text-muted-foreground text-[10px] ml-2">({cls.dayOfWeek} às {cls.startTime})</span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <DialogFooter className="pt-2">
                    <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setStep('upload')} 
                        disabled={isProcessing}
                    >
                        Voltar
                    </Button>
                    <Button 
                        type="button" 
                        disabled={isProcessing || pendingMappings.some(m => !classSelections[m.courseId])} 
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => executeImport(parsedRows, classSelections)}
                    >
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Confirmar e Importar'}
                    </Button>
                </DialogFooter>
            </div>
        )}

      </DialogContent>
    </Dialog>
  );
}
