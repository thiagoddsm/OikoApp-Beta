'use client';

import React, { useState } from 'react';
import { useFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, Timestamp, getDocs, query, writeBatch, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Loader2, Upload, CheckCircle, Download, DatabaseZap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Define the columns for the template
const columns = [
    "name", "email", "phone", "dataNascimento (YYYY-MM-DD)", "estadoCivil", 
    "addressStreet", "temFilhos (sim/nao)", "idadeFilhos", "integrationStatus", 
    "role", "serviceAreaName", "serviceTeamName", "gcName"
];

const sampleData = [
    {
        "name": "João da Silva",
        "email": "joao.silva@exemplo.com",
        "phone": "(11) 99999-8888",
        "dataNascimento (YYYY-MM-DD)": "1990-05-15",
        "estadoCivil": "Casado(a)",
        "addressStreet": "Rua das Flores, 123, São Paulo, SP",
        "temFilhos (sim/nao)": "sim",
        "idadeFilhos": "5",
        "integrationStatus": "membro",
        "role": "member",
        "serviceAreaName": "Recepção",
        "serviceTeamName": "Alpha",
        "gcName": "Conexão Jovem"
    },
    {
        "name": "Maria Oliveira",
        "email": "maria.oliveira@exemplo.com",
        "phone": "(21) 98888-7777",
        "dataNascimento (YYYY-MM-DD)": "1985-10-20",
        "estadoCivil": "Solteiro(a)",
        "addressStreet": "Avenida Copacabana, 456, Rio de Janeiro, RJ",
        "temFilhos (sim/nao)": "nao",
        "idadeFilhos": "",
        "integrationStatus": "lider_gc",
        "role": "lider_gc",
        "serviceAreaName": "Mídia",
        "serviceTeamName": "Bravo",
        "gcName": "Famílias Restauradas"
    }
];

function OldAttendanceMigration() {
    const { firestore, user } = useFirebase();
    const { toast } = useToast();
    const [isMigrating, setIsMigrating] = useState(false);

    const handleMigration = async () => {
        if (!firestore || !user) {
            toast({ title: "Erro", description: "Você precisa estar logado.", variant: "destructive" });
            return;
        }
        setIsMigrating(true);

        try {
            const oldCollectionPath = `users/${user.uid}/registros_de_presenca`;
            const oldCollectionRef = collection(firestore, oldCollectionPath);
            const oldRecordsSnapshot = await getDocs(oldCollectionRef);

            if (oldRecordsSnapshot.empty) {
                toast({ title: "Nenhum dado encontrado", description: "Nenhum registro de presença antigo para migrar." });
                setIsMigrating(false);
                return;
            }

            const newCollectionRef = collection(firestore, 'registros_de_presenca');
            const batch = writeBatch(firestore);
            let migratedCount = 0;

            oldRecordsSnapshot.forEach(docSnapshot => {
                const newDocRef = doc(newCollectionRef, docSnapshot.id); // Preserve original ID
                batch.set(newDocRef, docSnapshot.data());
                migratedCount++;
            });

            await batch.commit();

            toast({ title: "Migração Concluída!", description: `${migratedCount} registros antigos foram movidos com sucesso.` });

        } catch (error) {
            console.error("Migration failed:", error);
            toast({ title: "Erro na Migração", description: "Não foi possível migrar os dados antigos.", variant: "destructive" });
        } finally {
            setIsMigrating(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <DatabaseZap className="size-5 text-primary" />
                    Migração de Dados Antigos
                </CardTitle>
                <CardDescription>
                    Use esta ferramenta para mover os registros de presença antigos (que só você via) para o novo sistema centralizado.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">
                    Este processo é necessário apenas uma vez para recuperar os dados que sumiram após a correção. Clique no botão para iniciar.
                </p>
            </CardContent>
            <CardFooter>
                 <Button onClick={handleMigration} variant="secondary" disabled={isMigrating}>
                    {isMigrating ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Migrando...</>
                    ) : 'Migrar Registros de Presença Antigos'}
                </Button>
            </CardFooter>
        </Card>
    );
}

export default function ImportDataPage() {
    const { firestore, user } = useFirebase();
    const { toast } = useToast();
    const [isImporting, setIsImporting] = useState(false);
    const [importCompleted, setImportCompleted] = useState(false);
    const [importCount, setImportCount] = useState(0);
    const [file, setFile] = useState<File | null>(null);

    const handleDownloadTemplate = () => {
        const worksheet = XLSX.utils.json_to_sheet(sampleData, { header: columns });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Membros");
        // Adjust column widths
        const cols = columns.map(col => ({ wch: col.length > 20 ? col.length : 20 }));
        worksheet['!cols'] = cols;
        XLSX.writeFile(workbook, "modelo_importacao_membros.xlsx");
    };

    const handleImport = async () => {
        if (!file) {
            toast({ title: "Nenhum arquivo selecionado", description: "Por favor, selecione um arquivo .xlsx para importar.", variant: "destructive" });
            return;
        }
        if (!user || !firestore) {
            toast({ title: "Erro", description: "Você precisa estar logado para importar dados.", variant: "destructive" });
            return;
        }

        setIsImporting(true);
        setImportCompleted(false);
        setImportCount(0);
        let count = 0;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                // Fetch lookup data
                const areasQuery = query(collection(firestore, 'areas_of_service'));
                const teamsQuery = query(collection(firestore, 'teams'));
                const cellsQuery = query(collection(firestore, 'cells'));

                const [areasSnapshot, teamsSnapshot, cellsSnapshot] = await Promise.all([
                    getDocs(areasQuery),
                    getDocs(teamsQuery),
                    getDocs(cellsQuery),
                ]);

                const areaMap = new Map(areasSnapshot.docs.map(doc => [doc.data().name.toLowerCase(), doc.id]));
                const teamMap = new Map(teamsSnapshot.docs.map(doc => [doc.data().name.toLowerCase(), doc.id]));
                const cellDocs = cellsSnapshot.docs;

                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet) as any[];

                const usersCollection = collection(firestore, 'users');
                const importPromises = json.map(record => {
                    const cellDoc = record.gcName ? cellDocs.find(doc => doc.data().nome.toLowerCase() === record.gcName.toLowerCase()) : null;
                    const celulaId = cellDoc ? cellDoc.id : '';
                    const supervisorId = cellDoc ? cellDoc.data().supervisorId || '' : '';

                    const userData = {
                        name: record.name || '',
                        email: record.email || '',
                        phone: record.phone || '',
                        dataNascimento: record['dataNascimento (YYYY-MM-DD)'] || '',
                        estadoCivil: record.estadoCivil || '',
                        address: { street: record.addressStreet || '' },
                        temFilhos: record['temFilhos (sim/nao)']?.toLowerCase() || 'nao',
                        idadeFilhos: record.idadeFilhos || '',
                        integrationStatus: record.integrationStatus || 'nao_alcancado',
                        serviceStatus: record.serviceAreaName ? 'serving' : 'not_serving',
                        serviceAreaId: record.serviceAreaName ? areaMap.get(record.serviceAreaName.toLowerCase()) || '' : '',
                        serviceTeamId: record.serviceTeamName ? teamMap.get(record.serviceTeamName.toLowerCase()) || '' : '',
                        hierarchy: {
                            role: record.role || '',
                            celulaId: celulaId,
                            supervisorId: supervisorId,
                        },
                        createdAt: Timestamp.now(),
                    };
                    
                    if (!userData.name) {
                        console.warn('Registro ignorado por não ter nome:', record);
                        return Promise.resolve(); // Skip record without a name
                    }

                    return addDocumentNonBlocking(usersCollection, userData).then(() => {
                        count++;
                    });
                });

                await Promise.all(importPromises);
                
                setImportCount(count);
                setIsImporting(false);
                setImportCompleted(true);
                toast({
                    title: "Importação Concluída!",
                    description: `${count} registros de membros foram adicionados à fila de gravação.`,
                });

            } catch (error) {
                console.error("Error during import:", error);
                setIsImporting(false);
                toast({
                    title: "Erro na Importação",
                    description: "Ocorreu um erro ao ler ou processar o arquivo. Verifique se o formato está correto.",
                    variant: "destructive",
                });
            }
        };
        reader.readAsBinaryString(file);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Importação de Membresia</CardTitle>
                    <CardDescription>
                        Use esta ferramenta para importar em massa a lista de membros da sua igreja para o sistema.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    <div className="space-y-4 p-4 border rounded-lg">
                        <h4 className="font-semibold flex items-center gap-2"><Download className="size-5 text-primary"/>Passo 1: Baixar o Modelo</h4>
                        <p className="text-sm text-muted-foreground">
                            Faça o download da planilha modelo. Preencha com os dados dos seus membros, mantendo as colunas no formato original.
                        </p>
                        <Button onClick={handleDownloadTemplate} variant="outline">
                            Baixar modelo de planilha (.xlsx)
                        </Button>
                    </div>

                    <div className="space-y-4 p-4 border rounded-lg">
                         <h4 className="font-semibold flex items-center gap-2"><Upload className="size-5 text-primary"/>Passo 2: Enviar a Planilha</h4>
                        <p className="text-sm text-muted-foreground">
                           Selecione o arquivo .xlsx que você preencheu e clique em "Iniciar Importação".
                        </p>
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="excel-file">Arquivo Excel</Label>
                            <Input 
                                id="excel-file" 
                                type="file" 
                                accept=".xlsx, .xls"
                                onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                            />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex-col items-center gap-4">
                     <Button onClick={handleImport} disabled={isImporting || importCompleted || !file} className="w-full max-w-sm">
                        {isImporting ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importando...</>
                        ) : (
                            <>{importCompleted ? <CheckCircle className="mr-2 h-4 w-4" /> : <Upload className="mr-2 h-4 w-4" />}
                            {importCompleted ? 'Dados Importados' : 'Iniciar Importação'}</>
                        )}
                    </Button>
                    {importCompleted && (
                        <p className="text-green-600 font-medium">
                            {importCount} membros foram importados com sucesso!
                        </p>
                    )}
                </CardFooter>
            </Card>

            <OldAttendanceMigration />
        </div>
    );
}
