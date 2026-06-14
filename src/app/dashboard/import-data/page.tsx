'use client';

import React, { useState } from 'react';
import { useFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, Timestamp, getDocs, query, writeBatch, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { matchGcWithAi, geocodeAddress } from './actions';
import { formatName } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Loader2, Upload, CheckCircle, Download, DatabaseZap, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


// Define the columns for the template
const columns = [
    "name", "email", "phone", "dataNascimento (YYYY-MM-DD)", "estadoCivil", 
    "addressStreet", "temFilhos (sim/nao)", "idadeFilhos", "integrationStatus", 
    "role", "serviceAreaName", "serviceTeamName", "gcName",
    "cpf", "conjuge", "statusArrolamento", "dataArrolamento", "dataBatismo", 
    "veiculoPlaca", "veiculoMarca", "veiculoModelo", "veiculoCor"
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
        "gcName": "Conexão Jovem",
        "cpf": "123.456.789-00",
        "conjuge": "Maria da Silva",
        "statusArrolamento": "Membro",
        "dataArrolamento": "2024-01-01",
        "dataBatismo": "2015-05-20",
        "veiculoPlaca": "ABC1D23",
        "veiculoMarca": "Toyota",
        "veiculoModelo": "Corolla",
        "veiculoCor": "Prata"
    }
];

const clean = (val: any) => {
    if (val === undefined || val === null) return null;
    const str = String(val).trim();
    if (str === ".: NÃO INFORMADO :." || str === ".: NAO INFORMADO :." || str === "" || str.toLowerCase() === "não informado" || str.toLowerCase() === "nao informado") {
        return null;
    }
    return str;
};

const normalizeString = (str: string) => {
    if (!str) return '';
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[\s\-_]/g, '');
};

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

        const possiblePaths = [
            `users/${user.uid}/registros_de_presenca`, // without cedilla
            `users/${user.uid}/registros_de_presença` // with cedilla
        ];

        let migratedCount = 0;
        let found = false;

        try {
            for (const path of possiblePaths) {
                toast({ title: "Migração", description: `Verificando caminho: ${path}` });
                const oldCollectionRef = collection(firestore, path);
                const oldRecordsSnapshot = await getDocs(oldCollectionRef);

                if (!oldRecordsSnapshot.empty) {
                    found = true;
                    const newCollectionRef = collection(firestore, 'registros_de_presenca');
                    const batch = writeBatch(firestore);
                    
                    oldRecordsSnapshot.forEach(docSnapshot => {
                        const newDocRef = doc(newCollectionRef, docSnapshot.id); // Preserve original ID
                        batch.set(newDocRef, docSnapshot.data());
                        migratedCount++;
                    });

                    await batch.commit();
                    
                    toast({ title: "Migração Concluída!", description: `${migratedCount} registros antigos foram movidos com sucesso do caminho: ${path}` });
                    break; // Exit loop once data is found and migrated
                }
            }

            if (!found) {
                toast({ title: "Nenhum dado para migrar", description: "Não foram encontrados registros de presença antigos nos caminhos verificados." });
            }

        } catch (error) {
            console.error("Migration failed:", error);
            toast({ title: "Erro na Migração", description: "Não foi possível migrar os dados antigos. Verifique o console para mais detalhes.", variant: "destructive" });
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
                    Clique no botão para mover os registros de presença antigos (que só você via) para o novo sistema centralizado.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">
                    Este processo buscará seus dados antigos em alguns locais possíveis e os moverá para a coleção correta. É seguro executar várias vezes.
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

function FixPertencerClassesMigration() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isMigrating, setIsMigrating] = useState(false);

    const handleFixClasses = async () => {
        if (!firestore) return;
        setIsMigrating(true);

        try {
            // 1. Encontrar o curso Pertencer
            const coursesRef = collection(firestore, 'courses');
            const coursesSnap = await getDocs(coursesRef);
            const pertencerCourse = coursesSnap.docs.find(doc => 
                doc.data().name?.toLowerCase().includes('pertencer') || 
                doc.data().name?.toLowerCase().includes('membro')
            );

            if (!pertencerCourse) {
                toast({ variant: 'destructive', title: 'Erro', description: 'Curso Pertencer não encontrado.' });
                setIsMigrating(false);
                return;
            }

            const courseId = pertencerCourse.id;

            // 2. Buscar todas as turmas deste curso
            const classesRef = collection(firestore, 'classes');
            const classesSnap = await getDocs(classesRef);
            const pertencerClasses = classesSnap.docs.filter(doc => doc.data().courseId === courseId);

            if (pertencerClasses.length <= 1) {
                toast({ title: 'Tudo OK', description: 'Não há múltiplas turmas para unificar.' });
                setIsMigrating(false);
                return;
            }

            // 3. Pegar todos os alunos únicos de todas essas mini-turmas
            const allStudentIds = new Set<string>();
            let teacherId = '';

            pertencerClasses.forEach(cls => {
                const data = cls.data();
                if (data.teacherId) teacherId = data.teacherId;
                if (Array.isArray(data.students)) {
                    data.students.forEach((id: string) => allStudentIds.add(id));
                }
            });

            // 4. Criar a Turma Unificada (Turma de Março)
            // Ajustado para o dia 08/03 conforme solicitado
            const unifiedClassData = {
                courseId: courseId,
                name: "Turma de Março",
                teacherId: teacherId || '',
                students: Array.from(allStudentIds),
                frequency: "semanal",
                dayOfWeek: "Domingo",
                startTime: "09:00",
                endTime: "11:00",
                startDate: "2024-03-08", // Data ajustada!
                // Adicionando explicitamente quais datas as aulas ocorrerão
                extraDates: [
                    "2024-03-08", // Aula 1
                    "2024-03-15", // Aula 2
                    "2024-03-22", // Aula 3
                    "2024-03-29", // Aula 4
                ],
                maxStudents: 100,
                attendance: [] // Presenças zeradas, será lançado no diário manualmente
            };

            const newClassRef = doc(collection(firestore, 'classes'));
            await setDocumentNonBlocking(newClassRef, unifiedClassData);

            // 5. Apagar as mini-turmas antigas
            for (const cls of pertencerClasses) {
                await deleteDocumentNonBlocking(doc(firestore, 'classes', cls.id));
            }

            toast({ 
                title: 'Sucesso!', 
                description: `Turmas unificadas em "Turma de Março" com ${allStudentIds.size} alunos consolidados.` 
            });

        } catch (error) {
            console.error("Fix classes failed:", error);
            toast({ variant: 'destructive', title: 'Erro', description: 'Ocorreu um erro ao unificar as turmas.' });
        } finally {
            setIsMigrating(false);
        }
    };

    return (
        <Card className="border-amber-200 bg-amber-50/30">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-800">
                    <Wand2 className="size-5" />
                    Unificar Turmas do Curso Pertencer
                </CardTitle>
                <CardDescription>
                    Agrupa as turmas "Aula 1", "Aula 2", etc, em uma única "Turma de Março", preservando os alunos.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-amber-900/70">
                    Use este botão apenas 1 vez para corrigir o lançamento das aulas no formato antigo. As turmas antigas serão excluídas e todos os alunos irão para a Turma de Março (Iniciando no dia 08/03 com 4 aulas apenas).
                </p>
            </CardContent>
            <CardFooter>
                 <Button onClick={handleFixClasses} variant="outline" className="border-amber-500 text-amber-700 hover:bg-amber-100" disabled={isMigrating}>
                    {isMigrating ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...</>
                    ) : 'Executar Unificação'}
                </Button>
            </CardFooter>
        </Card>
    );
}

export default function ImportDataPage() {
    const { firestore, storage, user } = useFirebase();
    const { toast } = useToast();
    
    // Excel Import States
    const [isImporting, setIsImporting] = useState(false);
    const [importCompleted, setImportCompleted] = useState(false);
    const [importCount, setImportCount] = useState(0);
    const [file, setFile] = useState<File | null>(null);

    // JSON Import States
    const [jsonFile, setJsonFile] = useState<File | null>(null);
    const [isImportingJson, setIsImportingJson] = useState(false);
    const [jsonImportCompleted, setJsonImportCompleted] = useState(false);
    const [jsonImportCount, setJsonImportCount] = useState(0);

    const handleDownloadTemplate = () => {
        const worksheet = XLSX.utils.json_to_sheet(sampleData, { header: columns });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Membros");
        // Adjust column widths
        const cols = columns.map(col => ({ wch: col.length > 20 ? col.length : 20 }));
        worksheet['!cols'] = cols;
        XLSX.writeFile(workbook, "modelo_importacao_membros.xlsx");
    };

    const handleDownloadJsonTemplate = () => {
        const templateData = [
            {
                "NOME": "João da Silva",
                "E-MAIL": "joao.silva@exemplo.com",
                "CELULAR": "(11) 99999-8888",
                "NASCIMENTO": "1990-05-15",
                "ESTADO CIVIL": "Casado(a)",
                "CPF": "123.456.789-00",
                "ENDEREÇO": "Rua das Flores",
                "NÚMERO": "123",
                "BAIRRO": "Centro",
                "CIDADE": "São Paulo",
                "UF": "SP",
                "CEP": "01001-000",
                "PEQUENOS GRUPOS": "Conexão Jovem",
                "ARROLAMENTO": "Membro",
                "DATA ARROLAMENTO": "2024-01-01",
                "DATA BATISMO": "2015-05-20",
                "BATIZADO": "sim",
                "PLACA VEICULO": "ABC1D23",
                "MARCA VEICULO": "Toyota",
                "MODELO VEICULO": "Corolla",
                "COR VEICULO": "Prata",
                "COMO SOUBE DA IGREJA": "Convite",
                "SEXO": "Masculino",
                "ESCOLARIDADE": "Superior Completo",
                "APELIDO": "Joãozinho",
                "TIPO DECISÃO": "Batismo",
                "PROFISSÃO": "Engenheiro",
                "NOME DA OUTRA IGREJA": "Igreja Central",
                "Foto": "https://exemplo.com/foto.jpg",
                "NOME DO LÍDER": "Pedro Lider"
            }
        ];
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(templateData, null, 4));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", "modelo_importacao_membros.json");
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
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
                const existingUsersQuery = query(collection(firestore, 'users'));
                const coursesQuery = query(collection(firestore, 'courses'));

                const [areasSnapshot, teamsSnapshot, cellsSnapshot, existingUsersSnapshot, coursesSnapshot] = await Promise.all([
                    getDocs(areasQuery),
                    getDocs(teamsQuery),
                    getDocs(cellsQuery),
                    getDocs(existingUsersQuery),
                    getDocs(coursesQuery),
                ]);

                const pertencerCourse = coursesSnapshot.docs.find(d => 
                    d.data().name?.toLowerCase().includes('pertencer') || 
                    d.data().name?.toLowerCase().includes('membro')
                );
                const pertencerCourseId = pertencerCourse ? pertencerCourse.id : null;

                const areaMap = new Map(areasSnapshot.docs.map(doc => [doc.data().name.toLowerCase(), doc.id]));
                const teamMap = new Map(teamsSnapshot.docs.map(doc => [doc.data().name.toLowerCase(), doc.id]));
                const cellDocs = cellsSnapshot.docs;
                const existingUsers = existingUsersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet) as any[];

                const usersCollection = collection(firestore, 'users');

                const cleanCpf = (c: any) => {
                    const str = clean(c);
                    return str ? str.replace(/\D/g, '') : null;
                };

                const findExistingUser = (importedCpf: string | null, importedEmail: string | null, importedName: string) => {
                    if (importedCpf) {
                        const found = existingUsers.find(u => u.cpf && u.cpf.replace(/\D/g, '') === importedCpf);
                        if (found) return found;
                    }
                    if (importedEmail) {
                        const found = existingUsers.find(u => u.email && u.email.toLowerCase() === importedEmail.toLowerCase());
                        if (found) return found;
                    }
                    const foundByName = existingUsers.find(u => u.name && u.name.toLowerCase().trim() === importedName.toLowerCase().trim());
                    return foundByName || null;
                };

                const importPromises = json.map(async record => {
                    const cleanNameVal = clean(record.name || record.Nome) || '';
                    if (!cleanNameVal) {
                        console.warn('Registro ignorado por não ter nome:', record);
                        return Promise.resolve(); // Skip record without a name
                    }

                    const cleanEmailVal = clean(record.email || record.Email);
                    const cleanPhoneVal = clean(record.phone || record.Celular || record.Telefone);
                    const cleanCpfVal = cleanCpf(record.cpf || record.CPF);
                    const cleanBirthDate = clean(record['dataNascimento (YYYY-MM-DD)'] || record.dataNascimento || record.nascimento);
                    const cleanMaritalStatus = clean(record.estadoCivil || record.EstadoCivil);
                    const cleanStreet = clean(record.addressStreet || record.street || record.Endereço);
                    const cleanCep = clean(record.cep || record.CEP || record.Cep) || '';

                    const gcName = record.gcName || record.GC || record.Célula || '';
                    const cellDoc = gcName ? cellDocs.find(doc => normalizeString(doc.data().nome) === normalizeString(gcName)) : null;
                    const celulaId = cellDoc ? cellDoc.id : '';
                    const supervisorId = cellDoc ? cellDoc.data().supervisorId || '' : '';

                    const cleanConjuge = clean(record.conjuge || record.Cônjuge);
                    const cleanStatusArrolamento = clean(record.statusArrolamento || record.arrolamento || record.Arrolamento);
                    const cleanDataArrolamento = clean(record.dataArrolamento || record['Data Arrolamento']);
                    const cleanDataBatismo = clean(record.dataBatismo || record['Data Batismo']);
                    const cleanBatismoValue = clean(record.batizado || record.Batizado);
                    const isBatizado = (cleanBatismoValue === 'sim' || cleanBatismoValue === 'true' || cleanBatismoValue === 'Sim');

                    const vPlaca = clean(record.veiculoPlaca || record.placa_veiculo || record.placa || record.Placa);
                    const vMarca = clean(record.veiculoMarca || record.marca_veiculo || record.marca || record.Marca);
                    const vModelo = clean(record.veiculoModelo || record.modelo_veiculo || record.modelo || record.Modelo);
                    const vCor = clean(record.veiculoCor || record.cor_veiculo || record.cor || record.Cor);
                    const hasVeiculo = !!(vPlaca || vMarca || vModelo || vCor);

                    const photoUrlVal = clean(record.photoURL || record.profilePicture || record.foto || record.Foto || record.linkFoto);

                    // Obter geolocalização do endereço com Google Maps Geocoding API
                    let locationData: { latitude: number; longitude: number } | null = null;
                    if (cleanStreet) {
                        const coords = await geocodeAddress(cleanStreet);
                        if (coords) {
                            locationData = {
                                latitude: coords.lat,
                                longitude: coords.lng
                            };
                        }
                    }

                    const existingUser = findExistingUser(cleanCpfVal, cleanEmailVal, cleanNameVal);

                    const userData: any = {
                        name: formatName(cleanNameVal),
                        email: cleanEmailVal || '',
                        phone: cleanPhoneVal || '',
                        dataNascimento: cleanBirthDate || '',
                        estadoCivil: cleanMaritalStatus || '',
                        cpf: cleanCpfVal || '',
                        statusArrolamento: clean(record.statusArrolamento || record.arrolamento || record.Arrolamento) || null,
                        dataArrolamento: cleanDataArrolamento || null,
                        dataBatismo: cleanDataBatismo || null,
                        batizado: isBatizado ? 'sim' : 'nao',
                        conjuge: cleanConjuge ? formatName(cleanConjuge) : null,
                        address: { 
                            ...(existingUser?.address || {}),
                            street: cleanStreet || existingUser?.address?.street || '',
                            cep: cleanCep || existingUser?.address?.cep || '',
                            location: locationData || existingUser?.address?.location || null
                        },
                        temFilhos: (String(record['temFilhos (sim/nao)'] || record.temFilhos).toLowerCase() === 'sim' || record.temFilhos === true) ? 'sim' : 'nao',
                        idadeFilhos: clean(record.idadeFilhos) || '',
                        integrationStatus: record.integrationStatus || existingUser?.integrationStatus || 'nao_alcancado',
                        serviceStatus: record.serviceAreaName ? 'serving' : (existingUser?.serviceStatus || 'not_serving'),
                        serviceAreaId: record.serviceAreaName ? areaMap.get(record.serviceAreaName.toLowerCase()) || '' : (existingUser?.serviceAreaId || ''),
                        serviceTeamId: record.serviceTeamName ? teamMap.get(record.serviceTeamName.toLowerCase()) || '' : (existingUser?.serviceTeamId || ''),
                        hierarchy: {
                            ...(existingUser?.hierarchy || {}),
                            role: record.role || record.Cargo || existingUser?.hierarchy?.role || 'aluno',
                            celulaId: celulaId || existingUser?.hierarchy?.celulaId || '',
                            supervisorId: supervisorId || existingUser?.hierarchy?.supervisorId || '',
                        },
                        veiculo: hasVeiculo ? {
                            ...(existingUser?.veiculo || {}),
                            placa: vPlaca || null,
                            marca: vMarca || null,
                            modelo: vModelo || null,
                            cor: vCor || null,
                        } : (existingUser?.veiculo || null),
                        journey: (() => {
                            const isMembro = cleanStatusArrolamento && (
                                cleanStatusArrolamento.toLowerCase().includes('membro') ||
                                cleanStatusArrolamento.toLowerCase().includes('admiss') ||
                                cleanStatusArrolamento.toLowerCase().includes('batismo') ||
                                cleanStatusArrolamento.toLowerCase().includes('aclama') ||
                                cleanStatusArrolamento.toLowerCase().includes('transfer')
                            );
                            const j = { ...(existingUser?.journey || {}) };
                            if (isMembro && pertencerCourseId) {
                                j.courseStatus = {
                                    ...(j.courseStatus || {}),
                                    [pertencerCourseId]: 'approved'
                                };
                            }
                            return j;
                        })(),
                        createdAt: existingUser?.createdAt || Timestamp.now(),
                    };

                    if (photoUrlVal) {
                        userData.photoURL = photoUrlVal;
                        userData.profilePicture = photoUrlVal;
                    }

                    if (existingUser) {
                        const userDocRef = doc(firestore, 'users', existingUser.id);
                        return updateDocumentNonBlocking(userDocRef, userData).then(() => {
                            count++;
                        });
                    } else {
                        return addDocumentNonBlocking(usersCollection, userData).then(() => {
                            count++;
                        });
                    }
                });

                await Promise.all(importPromises);
                
                setImportCount(count);
                setIsImporting(false);
                setImportCompleted(true);
                toast({
                    title: "Importação Concluída!",
                    description: `${count} registros de membros foram processados (criados ou atualizados).`,
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

    // Preview & Analysis States
    const [previewRecords, setPreviewRecords] = useState<any[]>([]);
    const [isAnalyzingJson, setIsAnalyzingJson] = useState(false);
    const [stats, setStats] = useState({ total: 0, newCount: 0, updateCount: 0 });
    const [selectedPreviewUser, setSelectedPreviewUser] = useState<any | null>(null);
    const [availableGcs, setAvailableGcs] = useState<{ id: string; name: string; supervisorId: string }[]>([]);


    const handleAnalyzeJson = async () => {
        if (!jsonFile) {
            toast({ title: "Nenhum arquivo selecionado", description: "Por favor, selecione um arquivo .json para analisar.", variant: "destructive" });
            return;
        }
        if (!user || !firestore) {
            toast({ title: "Erro", description: "Você precisa estar logado para importar dados.", variant: "destructive" });
            return;
        }

        setIsAnalyzingJson(true);
        setPreviewRecords([]);
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result as string;
                const rawJson = JSON.parse(text);
                
                const records = Array.isArray(rawJson) 
                    ? rawJson 
                    : (rawJson.membros || rawJson.members || rawJson.data || []);

                if (!Array.isArray(records)) {
                    throw new Error("O arquivo JSON deve conter uma lista (array) de membros.");
                }

                // Buscar GCs para vínculo automático
                const cellsQuery = query(collection(firestore, 'cells'));
                const existingUsersQuery = query(collection(firestore, 'users'));
                const coursesQuery = query(collection(firestore, 'courses'));
                const [cellsSnapshot, existingUsersSnapshot, coursesSnapshot] = await Promise.all([
                    getDocs(cellsQuery),
                    getDocs(existingUsersQuery),
                    getDocs(coursesQuery),
                ]);

                const pertencerCourse = coursesSnapshot.docs.find(d => 
                    d.data().name?.toLowerCase().includes('pertencer') || 
                    d.data().name?.toLowerCase().includes('membro')
                );
                const pertencerCourseId = pertencerCourse ? pertencerCourse.id : null;
                const cellDocs = cellsSnapshot.docs;
                setAvailableGcs(
                    cellDocs
                        .map(doc => ({ id: doc.id, name: doc.data().nome, supervisorId: doc.data().supervisorId || '' }))
                        .sort((a, b) => a.name.localeCompare(b.name))
                );


                const existingUsers = existingUsersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

                const usersCollection = collection(firestore, 'users');
                const aiGcCache = new Map<string, string | null>();

                const cleanCpf = (c: any) => {
                    const str = clean(c);
                    return str ? str.replace(/\D/g, '') : null;
                };

                const findExistingUser = (importedCpf: string | null, importedEmail: string | null, importedName: string) => {
                    if (importedCpf) {
                        const found = existingUsers.find(u => u.cpf && u.cpf.replace(/\D/g, '') === importedCpf);
                        if (found) return found;
                    }
                    if (importedEmail) {
                        const found = existingUsers.find(u => u.email && u.email.toLowerCase() === importedEmail.toLowerCase());
                        if (found) return found;
                    }
                    const foundByName = existingUsers.find(u => u.name && u.name.toLowerCase().trim() === importedName.toLowerCase().trim());
                    return foundByName || null;
                };

                let newCount = 0;
                let updateCount = 0;

                const analyzedPromises = records.map(async (record) => {
                    const cleanNameVal = clean(record.NOME || record.Nome || record.nome) || '';
                    if (!cleanNameVal) return null;

                    const cleanEmailVal = clean(record['E-MAIL'] || record.email || record.Email);
                    const cleanPhoneVal = clean(record.CELULAR || record.phone || record.Celular || record.Telefone);
                    const cleanCpfVal = cleanCpf(record.CPF || record.cpf);
                    const cleanBirthDate = clean(record.NASCIMENTO || record.nascimento || record.dataNascimento);
                    const cleanMaritalStatus = clean(record['ESTADO CIVIL'] || record.estadoCivil || record.EstadoCivil);
                    
                    const addressParts = [
                        clean(record.ENDEREÇO || record.Endereço || record.street || record.addressStreet),
                        clean(record.NÚMERO || record.Número || record.numero),
                        clean(record.BAIRRO || record.Bairro || record.bairro),
                        clean(record.CIDADE || record.Cidade || record.cidade),
                        clean(record.UF || record.uf)
                    ].filter(Boolean);
                    const cleanStreet = addressParts.join(', ');
                    const cleanCep = clean(record.CEP || record.cep);

                    // Pequenos grupos (GC) com IA
                    const rawGcName = clean(record['PEQUENOS GRUPOS'] || record.Célula || record.gcName || record.GC);
                    let celulaId = '';
                    let supervisorId = '';
                    let matchedGcName = 'Nenhum';
                    
                    if (rawGcName) {
                        // Pode ser uma lista de GCs separados por vírgula ou ponto e vírgula, preservando a barra dupla (//) do nome do líder
                        const gcCandidates = rawGcName.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
                        let foundMatchDoc: any = null;

                        const smartLocalMatch = (candidate: string) => {
                            const normCandidate = normalizeString(candidate);
                            // 1. Match exato ou normalizado
                            let match = cellDocs.find(doc => normalizeString(doc.data().nome) === normCandidate);
                            if (match) return match;

                            // 2. Se contém '//', tenta casar a parte do nome do GC ou o nome parcial
                            if (candidate.includes('//')) {
                                const parts = candidate.split('//').map(p => p.trim());
                                const gcPart = normalizeString(parts[0]);
                                
                                // Tenta achar uma célula cujo nome normalizado contenha a parte do GC ou vice-versa
                                match = cellDocs.find(doc => {
                                    const docName = normalizeString(doc.data().nome);
                                    return docName.includes(gcPart) || gcPart.includes(docName);
                                });
                                if (match) return match;
                            }

                            // 3. Tenta achar qualquer célula que contenha o termo buscado ou vice-versa
                            match = cellDocs.find(doc => {
                                const docName = normalizeString(doc.data().nome);
                                return docName.includes(normCandidate) || normCandidate.includes(docName);
                            });
                            return match || null;
                        };

                        for (const candidate of gcCandidates) {
                            const localMatch = smartLocalMatch(candidate);
                            if (localMatch) {
                                foundMatchDoc = localMatch;
                                break;
                            }
                        }
                        if (!foundMatchDoc) {
                            const targetForAi = gcCandidates[0] || rawGcName;
                            const normalizedRaw = normalizeString(targetForAi);
                            if (aiGcCache.has(normalizedRaw)) {
                                const cachedName = aiGcCache.get(normalizedRaw);
                                foundMatchDoc = cachedName ? cellDocs.find(doc => doc.data().nome === cachedName) : null;
                            } else {
                                const actualGcs = cellDocs.map(doc => {
                                    const cellData = doc.data();
                                    const leaderId = cellData.liderId || cellData.leaderId || cellData.supervisorId || '';
                                    const leaderUser = existingUsers.find(u => u.id === leaderId);
                                    return {
                                        name: cellData.nome,
                                        leaderName: leaderUser ? leaderUser.name : null
                                    };
                                });
                                const matchedName = await matchGcWithAi(targetForAi, actualGcs);
                                aiGcCache.set(normalizedRaw, matchedName);
                                foundMatchDoc = matchedName ? cellDocs.find(doc => doc.data().nome === matchedName) : null;
                            }
                        }
                        if (foundMatchDoc) {
                            celulaId = foundMatchDoc.id;
                            supervisorId = foundMatchDoc.data().supervisorId || '';
                            matchedGcName = foundMatchDoc.data().nome;
                        }
                    }

                    // Arrolamento -> TAG format (adicionar como tag)
                    const cleanArrolamento = clean(record.ARROLAMENTO || record.arrolamento || record.statusArrolamento);
                    
                    // Decidir ID do usuário existente ou novo
                    const existingUser = findExistingUser(cleanCpfVal, cleanEmailVal, cleanNameVal);
                    const userId = existingUser ? existingUser.id : doc(usersCollection).id;

                    // Arrolamento e tags
                    const tags: string[] = [];
                    if (cleanArrolamento) {
                        tags.push(cleanArrolamento);
                    }
                    if (existingUser && Array.isArray(existingUser.tags)) {
                        existingUser.tags.forEach((t: string) => {
                            if (!tags.includes(t)) tags.push(t);
                        });
                    }

                    const cleanDataArrolamento = clean(record['DATA ARROLAMENTO'] || record.dataArrolamento);
                    const cleanDataBatismo = clean(record['DATA BATISMO'] || record.dataBatismo);
                    const cleanBatismoValue = clean(record.BATIZADO || record.batizado || record.Batizado);
                    const isBatizado = (cleanBatismoValue === 'sim' || cleanBatismoValue === 'true' || cleanBatismoValue === 'Sim');

                    const vPlaca = clean(record['PLACA VEICULO'] || record.veiculoPlaca || record.placa);
                    const vMarca = clean(record['MARCA VEICULO'] || record.veiculoMarca || record.marca);
                    const vModelo = clean(record['MODELO VEICULO'] || record.veiculoModelo || record.modelo);
                    const vCor = clean(record['COR VEICULO'] || record.veiculoCor || record.cor);
                    const hasVeiculo = !!(vPlaca || vMarca || vModelo || vCor);

                    const cleanComoConheceu = clean(record['COMO SOUBE DA IGREJA'] || record.comoConheceu);
                    
                    // Tratar Sexo/Gênero para apenas "Masculino" ou "Feminino"
                    const rawSexo = clean(record.SEXO || record.sexo || record.gender || '');
                    let cleanSexo: string | null = null;
                    if (rawSexo) {
                        const firstChar = rawSexo.trim().substring(0, 1).toUpperCase();
                        if (firstChar === 'M') {
                            cleanSexo = 'Masculino';
                        } else if (firstChar === 'F') {
                            cleanSexo = 'Feminino';
                        }
                    }

                    const cleanEscolaridade = clean(record.ESCOLARIDADE || record.escolaridade);
                    const cleanApelido = clean(record.APELIDO || record.apelido);
                    const cleanTipoDecisao = clean(record['TIPO DECISÃO'] || record.tipoDecisao);
                    const cleanProfissao = clean(record.PROFISSÃO || record.profissao);
                    const cleanIgrejaBatismo = clean(record['NOME DA OUTRA IGREJA'] || record.igrejaBatismo);
                    const cleanConjuge = clean(record.conjuge || record.Cônjuge || record['CÔNJUGE'] || record.CONJUGE || record.spouse);
                    const cleanNomeConvidou = clean(record.nomeConvidou || record['Quem Convidou'] || record.quemConvidou || record.convidouPor || record.nomeConvidou);
                    
                    // NOME DO LÍDER (Responsável pelo acompanhamento)
                    const rawSupervisorName = clean(record['NOME DO LÍDER'] || record.Responsavel || record.supervisorName);
                    if (rawSupervisorName) {
                        const match = existingUsers.find(u => u.name && u.name.toLowerCase().trim() === rawSupervisorName.toLowerCase().trim());
                        if (match) {
                            supervisorId = match.id;
                        }
                    }

                    const photoUrlVal = clean(record.Foto || record.foto || record.photoURL || record.profilePicture);

                    const actionType = existingUser ? 'update' : 'new';
                    if (actionType === 'new') newCount++; else updateCount++;

                    // Obter geolocalização do endereço com Google Maps Geocoding API
                    let locationData: { latitude: number; longitude: number } | null = null;
                    if (cleanStreet) {
                        const coords = await geocodeAddress(cleanStreet);
                        if (coords) {
                            locationData = {
                                latitude: coords.lat,
                                longitude: coords.lng
                            };
                        }
                    }

                    const userData: any = {
                        name: formatName(cleanNameVal),
                        email: cleanEmailVal || '',
                        phone: cleanPhoneVal || '',
                        dataNascimento: cleanBirthDate || '',
                        estadoCivil: cleanMaritalStatus || '',
                        cpf: cleanCpfVal || '',
                        dataArrolamento: cleanDataArrolamento || null,
                        dataBatismo: cleanDataBatismo || null,
                        batizado: isBatizado ? 'sim' : 'nao',
                        conjuge: cleanConjuge ? formatName(cleanConjuge) : null,
                        nomeConvidou: cleanNomeConvidou ? formatName(cleanNomeConvidou) : '',
                        address: { 
                            ...(existingUser?.address || {}),
                            street: cleanStreet || existingUser?.address?.street || '',
                            cep: cleanCep || existingUser?.address?.cep || '',
                            location: locationData || existingUser?.address?.location || null
                        },
                        tags,
                        integrationStatus: existingUser?.integrationStatus || 'membro',
                        serviceStatus: existingUser?.serviceStatus || 'not_serving',
                        comoConheceu: cleanComoConheceu || existingUser?.comoConheceu || null,
                        gender: cleanSexo || existingUser?.gender || null,
                        escolaridade: cleanEscolaridade || existingUser?.escolaridade || null,
                        apelido: cleanApelido || existingUser?.apelido || null,
                        tipoDecisao: cleanTipoDecisao || existingUser?.tipoDecisao || null,
                        profissao: cleanProfissao || existingUser?.profissao || null,
                        igrejaBatismo: cleanIgrejaBatismo || existingUser?.igrejaBatismo || null,
                        professional: {
                            ...(existingUser?.professional || {}),
                            educationLevel: cleanEscolaridade || existingUser?.professional?.educationLevel || null,
                            profession: cleanProfissao || existingUser?.professional?.profession || null,
                        },
                        hierarchy: {
                            ...(existingUser?.hierarchy || {}),
                            role: record.role || record.Cargo || existingUser?.hierarchy?.role || 'aluno',
                            celulaId: celulaId || existingUser?.hierarchy?.celulaId || '',
                            supervisorId: supervisorId || existingUser?.hierarchy?.supervisorId || '',
                        },
                        veiculo: hasVeiculo ? {
                            ...(existingUser?.veiculo || {}),
                            placa: vPlaca || null,
                            marca: vMarca || null,
                            modelo: vModelo || null,
                            cor: vCor || null,
                        } : (existingUser?.veiculo || null),
                        journey: (() => {
                            const isMembro = cleanArrolamento && (
                                cleanArrolamento.toLowerCase().includes('membro') ||
                                cleanArrolamento.toLowerCase().includes('admiss') ||
                                cleanArrolamento.toLowerCase().includes('batismo') ||
                                cleanArrolamento.toLowerCase().includes('aclama') ||
                                cleanArrolamento.toLowerCase().includes('transfer')
                            );
                            const j = { ...(existingUser?.journey || {}) };
                            if (isMembro && pertencerCourseId) {
                                j.courseStatus = {
                                    ...(j.courseStatus || {}),
                                    [pertencerCourseId]: 'approved'
                                };
                            }
                            return j;
                        })(),
                        createdAt: existingUser?.createdAt || Timestamp.now(),
                    };

                    return {
                        userId,
                        actionType,
                        matchedGcName,
                        photoUrlVal,
                        userData,
                        originalName: record.NOME || record.Nome || record.nome,
                        detectedGcs: rawGcName ? String(rawGcName).split(/[,;]+/).map(s => s.trim()).filter(Boolean) : []
                    };

                });

                const resolved = (await Promise.all(analyzedPromises)).filter(Boolean);
                setPreviewRecords(resolved);
                setStats({ total: resolved.length, newCount, updateCount });
                setIsAnalyzingJson(false);
                toast({
                    title: "Análise Concluída!",
                    description: `${resolved.length} registros foram mapeados e estão prontos para visualização.`,
                });

            } catch (error: any) {
                console.error("Error during JSON analysis:", error);
                setIsAnalyzingJson(false);
                toast({
                    title: "Erro na Análise",
                    description: error.message || "Ocorreu um erro ao ler o arquivo JSON.",
                    variant: "destructive",
                });
            }
        };
        reader.readAsText(jsonFile);
    };

    const handleConfirmImportJson = async () => {
        if (previewRecords.length === 0) return;
        setIsImportingJson(true);
        setJsonImportCompleted(false);
        setJsonImportCount(0);
        let count = 0;

        const uploadPhotoFromUrl = async (photoUrl: string, userId: string): Promise<string | null> => {
            if (!photoUrl || !storage) return null;
            try {
                const response = await fetch(photoUrl);
                if (!response.ok) throw new Error(`HTTP status ${response.status}`);
                const blob = await response.blob();
                
                const filePath = `profile-pictures/${userId}.jpg`;
                const fileRef = ref(storage, filePath);
                await uploadBytes(fileRef, blob);
                const downloadUrl = await getDownloadURL(fileRef);
                return downloadUrl;
            } catch (error) {
                console.warn("Não foi possível carregar foto da URL:", photoUrl, error);
                return null;
            }
        };

        try {
            const importPromises = previewRecords.map(async (record: any) => {
                const userData = { ...record.userData };

                // Realizar upload de foto antes de gravar
                if (record.photoUrlVal) {
                    const uploadedUrl = await uploadPhotoFromUrl(record.photoUrlVal, record.userId);
                    if (uploadedUrl) {
                        userData.photoURL = uploadedUrl;
                        userData.profilePicture = uploadedUrl;
                    } else {
                        userData.photoURL = record.photoUrlVal;
                        userData.profilePicture = record.photoUrlVal;
                    }
                }

                const userDocRef = doc(firestore, 'users', record.userId);
                if (record.actionType === 'update') {
                    await updateDocumentNonBlocking(userDocRef, userData);
                } else {
                    await setDocumentNonBlocking(userDocRef, userData);
                }
                count++;
            });

            await Promise.all(importPromises);

            setJsonImportCount(count);
            setIsImportingJson(false);
            setJsonImportCompleted(true);
            setPreviewRecords([]); // Clear preview on success
            toast({
                title: "Importação Concluída!",
                description: `${count} membros do Eklesia foram processados e salvos no banco.`,
            });
        } catch (error: any) {
            console.error("Error during JSON import confirm:", error);
            setIsImportingJson(false);
            toast({
                title: "Erro na Importação",
                description: error.message || "Ocorreu um erro ao salvar os registros.",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Importação de Membresia</CardTitle>
                    <CardDescription>
                        Importe a lista de membros em lote para o sistema Oiko.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Tabs defaultValue="excel" className="w-full">
                        <div className="px-6 border-b">
                            <TabsList className="bg-transparent h-12 gap-6 p-0">
                                <TabsTrigger value="excel" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none font-bold text-xs uppercase">Excel (.xlsx)</TabsTrigger>
                                <TabsTrigger value="eklesia" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none font-bold text-xs uppercase">Eklesia (JSON)</TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="p-6">
                            <TabsContent value="excel" className="space-y-8 mt-0">
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
                                        <Label htmlFor="excel-file">Planilha Excel</Label>
                                        <Input 
                                            id="excel-file" 
                                            type="file" 
                                            accept=".xlsx, .xls"
                                            onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col items-center gap-4 pt-4 border-t">
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
                                </div>
                            </TabsContent>

                            <TabsContent value="eklesia" className="space-y-8 mt-0">
                                <div className="space-y-4 p-4 border rounded-lg">
                                    <h4 className="font-semibold flex items-center gap-2"><Download className="size-5 text-primary"/>Passo 1: Baixar o Modelo JSON</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Faça o download do modelo JSON para estruturar seus dados e validar os nomes de propriedades esperados.
                                    </p>
                                    <Button onClick={handleDownloadJsonTemplate} variant="outline">
                                        Baixar modelo de importação (.json)
                                    </Button>
                                </div>

                                <div className="space-y-4 p-4 border rounded-lg bg-slate-50/50">
                                    <h4 className="font-semibold flex items-center gap-2"><DatabaseZap className="size-5 text-primary"/>Passo 2: Enviar o arquivo JSON</h4>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        Selecione o arquivo exportado em formato JSON. O sistema irá normatizar automaticamente os nomes de campos (Ex: <code>Nome</code>, <code>Celular</code>, <code>Célula</code>) e criar/atualizar os registros vinculados aos GCs correspondentes.
                                    </p>
                                    <div className="grid w-full max-w-sm items-center gap-1.5 pt-2">
                                        <Label htmlFor="json-file">Arquivo JSON</Label>
                                        <Input 
                                            id="json-file" 
                                            type="file" 
                                            accept=".json"
                                            onChange={(e) => setJsonFile(e.target.files ? e.target.files[0] : null)}
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col items-center gap-4 pt-4 border-t">
                                    {previewRecords.length === 0 ? (
                                        <Button onClick={handleAnalyzeJson} disabled={isAnalyzingJson || jsonImportCompleted || !jsonFile} className="w-full max-w-sm bg-indigo-600 hover:bg-indigo-700 text-white">
                                            {isAnalyzingJson ? (
                                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analisando JSON...</>
                                            ) : (
                                                <><Upload className="mr-2 h-4 w-4" /> Analisar Arquivo JSON</>
                                            )}
                                        </Button>
                                    ) : (
                                        <div className="w-full space-y-6">
                                            {/* Stats Cards */}
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <Card className="bg-slate-50">
                                                    <CardContent className="pt-6 text-center">
                                                        <span className="text-3xl font-bold text-slate-800">{stats.total}</span>
                                                        <p className="text-sm text-slate-500 font-medium mt-1">Total Analisados</p>
                                                    </CardContent>
                                                </Card>
                                                <Card className="bg-emerald-50/50 border-emerald-100">
                                                    <CardContent className="pt-6 text-center">
                                                        <span className="text-3xl font-bold text-emerald-600">+{stats.newCount}</span>
                                                        <p className="text-sm text-emerald-600 font-medium mt-1">Novos Membros</p>
                                                    </CardContent>
                                                </Card>
                                                <Card className="bg-amber-50/50 border-amber-100">
                                                    <CardContent className="pt-6 text-center">
                                                        <span className="text-3xl font-bold text-amber-600">{stats.updateCount}</span>
                                                        <p className="text-sm text-amber-600 font-medium mt-1">Atualizações</p>
                                                    </CardContent>
                                                </Card>
                                            </div>

                                            {/* Preview Table */}
                                            <div className="border rounded-md max-h-[400px] overflow-y-auto">
                                                <Table>
                                                    <TableHeader className="bg-slate-50 sticky top-0">
                                                        <TableRow>
                                                            <TableHead>Nome</TableHead>
                                                            <TableHead>E-mail / Celular</TableHead>
                                                            <TableHead>Célula Mapeada (GC)</TableHead>
                                                            <TableHead>Ação</TableHead>
                                                            <TableHead className="text-right">Detalhes</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {previewRecords.map((record, index) => (
                                                            <TableRow key={record.userId || index}>
                                                                <TableCell className="font-medium">{record.userData.name}</TableCell>
                                                                <TableCell className="text-slate-500 text-xs">
                                                                    {record.userData.email || '—'}<br/>
                                                                    {record.userData.phone || '—'}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="flex flex-col gap-1.5">
                                                                        <Select
                                                                            value={record.userData.hierarchy.celulaId || 'none'}
                                                                            onValueChange={(val) => {
                                                                                const selectedGc = availableGcs.find(g => g.id === val);
                                                                                const newGcName = selectedGc ? selectedGc.name : 'Nenhum';
                                                                                const newSupervisorId = selectedGc ? selectedGc.supervisorId : '';
                                                                                
                                                                                setPreviewRecords(prev => prev.map((r, idx) => {
                                                                                    if (idx === index) {
                                                                                        return {
                                                                                            ...r,
                                                                                            matchedGcName: newGcName,
                                                                                            userData: {
                                                                                                ...r.userData,
                                                                                                hierarchy: {
                                                                                                    ...r.userData.hierarchy,
                                                                                                    celulaId: val === 'none' ? '' : val,
                                                                                                    supervisorId: newSupervisorId
                                                                                                }
                                                                                            }
                                                                                        };
                                                                                    }
                                                                                    return r;
                                                                                }));
                                                                            }}
                                                                        >
                                                                            <SelectTrigger className="h-8 w-[180px]">
                                                                                <SelectValue placeholder="Selecione o GC" />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                <SelectItem value="none">Nenhum</SelectItem>
                                                                                {[...availableGcs].sort((a, b) => a.name.localeCompare(b.name)).map(gc => (
                                                                                    <SelectItem key={gc.id} value={gc.id}>
                                                                                        {gc.name}
                                                                                    </SelectItem>
                                                                                ))}

                                                                            </SelectContent>
                                                                        </Select>
                                                                        {record.detectedGcs && record.detectedGcs.length > 1 && (
                                                                            <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 border border-amber-100 rounded px-1.5 py-1 w-[180px] whitespace-normal break-words" title={`Múltiplos GCs no JSON: ${record.detectedGcs.join(', ')}`}>
                                                                                Opções: {record.detectedGcs.join(', ')}
                                                                            </span>
                                                                        )}

                                                                    </div>
                                                                </TableCell>

                                                                <TableCell>
                                                                    {record.actionType === 'new' ? (
                                                                        <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-700/10">
                                                                            Novo
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20">
                                                                            Atualizar
                                                                        </span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    <Button variant="ghost" size="sm" onClick={() => setSelectedPreviewUser(record)}>
                                                                        Ver dados
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                                                <Button 
                                                    onClick={() => { setPreviewRecords([]); setJsonFile(null); }} 
                                                    variant="outline" 
                                                    className="w-full sm:w-auto"
                                                    disabled={isImportingJson}
                                                >
                                                    Cancelar
                                                </Button>
                                                <Button 
                                                    onClick={handleConfirmImportJson} 
                                                    disabled={isImportingJson} 
                                                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white"
                                                >
                                                    {isImportingJson ? (
                                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gravando no Banco...</>
                                                    ) : (
                                                        <>Confirmar Importação de {previewRecords.length} contatos</>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {jsonImportCompleted && (
                                        <p className="text-green-600 font-medium">
                                            {jsonImportCount} membros foram processados com sucesso!
                                        </p>
                                    )}
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                </CardContent>
            </Card>

            {/* Details Dialog */}
            <Dialog open={!!selectedPreviewUser} onOpenChange={(open) => !open && setSelectedPreviewUser(null)}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Confirmar Dados de Importação</DialogTitle>
                        <DialogDescription>
                            Revise detalhadamente como os dados de <strong>{selectedPreviewUser?.userData.name}</strong> serão salvos no banco.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedPreviewUser && (
                        <div className="space-y-4 py-4 text-sm">
                            <div className="grid grid-cols-2 gap-4 border-b pb-4">
                                <div>
                                    <span className="text-xs font-semibold text-slate-400 uppercase">Ação da Importação</span>
                                    <p className="font-semibold text-base mt-0.5">
                                        {selectedPreviewUser.actionType === 'new' ? (
                                            <span className="text-emerald-600">Criar Novo Registro</span>
                                        ) : (
                                            <span className="text-amber-600">Atualizar Registro Existente</span>
                                        )}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-xs font-semibold text-slate-400 uppercase">ID Interno</span>
                                    <p className="font-mono text-xs mt-1 text-slate-600">{selectedPreviewUser.userId}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                <div>
                                    <span className="text-xs text-slate-400 font-medium">Nome</span>
                                    <p className="font-semibold">{selectedPreviewUser.userData.name}</p>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-400 font-medium">E-mail</span>
                                    <p className="font-semibold">{selectedPreviewUser.userData.email || '—'}</p>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-400 font-medium">Celular</span>
                                    <p className="font-semibold">{selectedPreviewUser.userData.phone || '—'}</p>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-400 font-medium">CPF</span>
                                    <p className="font-semibold">{selectedPreviewUser.userData.cpf || '—'}</p>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-400 font-medium">Data Nascimento</span>
                                    <p className="font-semibold">{selectedPreviewUser.userData.dataNascimento || '—'}</p>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-400 font-medium">Estado Civil</span>
                                    <p className="font-semibold">{selectedPreviewUser.userData.estadoCivil || '—'}</p>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-400 font-medium">Gênero (Sexo)</span>
                                    <p className="font-semibold">{selectedPreviewUser.userData.gender || '—'}</p>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-400 font-medium">Profissão</span>
                                    <p className="font-semibold">{selectedPreviewUser.userData.professional?.profession || '—'}</p>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-400 font-medium">Escolaridade</span>
                                    <p className="font-semibold">{selectedPreviewUser.userData.escolaridade || '—'}</p>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-400 font-medium">Apelido</span>
                                    <p className="font-semibold">{selectedPreviewUser.userData.apelido || '—'}</p>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-400 font-medium">Como soube da Igreja</span>
                                    <p className="font-semibold">{selectedPreviewUser.userData.comoConheceu || '—'}</p>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-400 font-medium">Célula Associada (GC)</span>
                                    <p className="font-semibold text-indigo-600">{selectedPreviewUser.matchedGcName}</p>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-400 font-medium">Batizado</span>
                                    <p className="font-semibold">{selectedPreviewUser.userData.batizado === 'sim' ? 'Sim' : 'Não'}</p>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-400 font-medium">Qual igreja foi batizado?</span>
                                    <p className="font-semibold">{selectedPreviewUser.userData.igrejaBatismo || '—'}</p>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-400 font-medium">Data de Batismo</span>
                                    <p className="font-semibold">{selectedPreviewUser.userData.dataBatismo || '—'}</p>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-400 font-medium">Tipo de Decisão</span>
                                    <p className="font-semibold">{selectedPreviewUser.userData.tipoDecisao || '—'}</p>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-400 font-medium">Data do Arrolamento</span>
                                    <p className="font-semibold">{selectedPreviewUser.userData.dataArrolamento || '—'}</p>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-400 font-medium">Tags / Arrolamento</span>
                                    <p className="font-semibold">{selectedPreviewUser.userData.tags?.join(', ') || '—'}</p>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-400 font-medium">Coordenadas (Lat/Lng)</span>
                                    <p className="font-semibold font-mono text-xs">
                                        {selectedPreviewUser.userData.address?.location 
                                            ? `${selectedPreviewUser.userData.address.location.latitude.toFixed(6)}, ${selectedPreviewUser.userData.address.location.longitude.toFixed(6)}`
                                            : 'Não geocodificado'}
                                    </p>
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <span className="text-xs text-slate-400 font-medium">Endereço Completo</span>
                                <p className="font-semibold mt-0.5">{selectedPreviewUser.userData.address?.street || '—'}</p>
                            </div>

                            {selectedPreviewUser.photoUrlVal && (
                                <div className="border-t pt-4">
                                    <span className="text-xs text-slate-400 font-medium">Foto (URL Original)</span>
                                    <p className="text-xs text-indigo-500 underline truncate mt-0.5">
                                        <a href={selectedPreviewUser.photoUrlVal} target="_blank" rel="noreferrer">
                                            {selectedPreviewUser.photoUrlVal}
                                        </a>
                                    </p>
                                </div>
                            )}

                            {selectedPreviewUser.userData.veiculo && (
                                <div className="border-t pt-4">
                                    <span className="text-xs text-slate-400 font-semibold block mb-1">Veículo</span>
                                    <div className="grid grid-cols-4 gap-2 text-xs">
                                        <div>
                                            <span className="text-slate-400">Placa</span>
                                            <p className="font-semibold">{selectedPreviewUser.userData.veiculo.placa || '—'}</p>
                                        </div>
                                        <div>
                                            <span className="text-slate-400">Marca</span>
                                            <p className="font-semibold">{selectedPreviewUser.userData.veiculo.marca || '—'}</p>
                                        </div>
                                        <div>
                                            <span className="text-slate-400">Modelo</span>
                                            <p className="font-semibold">{selectedPreviewUser.userData.veiculo.modelo || '—'}</p>
                                        </div>
                                        <div>
                                            <span className="text-slate-400">Cor</span>
                                            <p className="font-semibold">{selectedPreviewUser.userData.veiculo.cor || '—'}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">Fechar</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FixPertencerClassesMigration />
                <OldAttendanceMigration />
            </div>
        </div>
    );
}
