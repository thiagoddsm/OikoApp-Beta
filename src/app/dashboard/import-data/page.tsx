'use client';

import React, { useState } from 'react';
import { useFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, Timestamp, getDocs, query, writeBatch, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Loader2, Upload, CheckCircle, Download, DatabaseZap, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
    const { firestore, user } = useFirebase();
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

                const [areasSnapshot, teamsSnapshot, cellsSnapshot, existingUsersSnapshot] = await Promise.all([
                    getDocs(areasQuery),
                    getDocs(teamsQuery),
                    getDocs(cellsQuery),
                    getDocs(existingUsersQuery),
                ]);

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

                const importPromises = json.map(record => {
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

                    const gcName = record.gcName || record.GC || record.Célula || '';
                    const cellDoc = gcName ? cellDocs.find(doc => normalizeString(doc.data().nome) === normalizeString(gcName)) : null;
                    const celulaId = cellDoc ? cellDoc.id : '';
                    const supervisorId = cellDoc ? cellDoc.data().supervisorId || '' : '';

                    const cleanConjuge = clean(record.conjuge || record.Cônjuge);
                    const cleanStatusArrolamento = clean(record.statusArrolamento || record.arrolamento || record.Arrolamento);
                    const cleanDataArrolamento = clean(record.dataArrolamento || record['Data Arrolamento']);
                    const cleanDataBatismo = clean(record.dataBatismo || record['Data Batismo']);
                    const cleanBatismoValue = clean(record.batizado || record.Batizado);
                    const isBatizado = (cleanBatismoValue === 'sim' || cleanBatismoValue === 'true' || cleanBatismoValue === 'Sim' || cleanBatismoValue === true);

                    const vPlaca = clean(record.veiculoPlaca || record.placa_veiculo || record.placa || record.Placa);
                    const vMarca = clean(record.veiculoMarca || record.marca_veiculo || record.marca || record.Marca);
                    const vModelo = clean(record.veiculoModelo || record.modelo_veiculo || record.modelo || record.Modelo);
                    const vCor = clean(record.veiculoCor || record.cor_veiculo || record.cor || record.Cor);
                    const hasVeiculo = !!(vPlaca || vMarca || vModelo || vCor);

                    const photoUrlVal = clean(record.photoURL || record.profilePicture || record.foto || record.Foto || record.linkFoto);

                    const userData: any = {
                        name: cleanNameVal,
                        email: cleanEmailVal || '',
                        phone: cleanPhoneVal || '',
                        dataNascimento: cleanBirthDate || '',
                        estadoCivil: cleanMaritalStatus || '',
                        cpf: cleanCpfVal || '',
                        conjuge: cleanConjuge || null,
                        statusArrolamento: cleanStatusArrolamento || null,
                        dataArrolamento: cleanDataArrolamento || null,
                        dataBatismo: cleanDataBatismo || null,
                        batizado: isBatizado ? 'sim' : 'nao',
                        address: { street: cleanStreet || '' },
                        temFilhos: (String(record['temFilhos (sim/nao)'] || record.temFilhos).toLowerCase() === 'sim' || record.temFilhos === true) ? 'sim' : 'nao',
                        idadeFilhos: clean(record.idadeFilhos) || '',
                        integrationStatus: record.integrationStatus || 'nao_alcancado',
                        serviceStatus: record.serviceAreaName ? 'serving' : 'not_serving',
                        serviceAreaId: record.serviceAreaName ? areaMap.get(record.serviceAreaName.toLowerCase()) || '' : '',
                        serviceTeamId: record.serviceTeamName ? teamMap.get(record.serviceTeamName.toLowerCase()) || '' : '',
                        hierarchy: {
                            role: record.role || record.Cargo || 'member',
                            celulaId: celulaId,
                            supervisorId: supervisorId,
                        },
                        veiculo: hasVeiculo ? {
                            placa: vPlaca || null,
                            marca: vMarca || null,
                            modelo: vModelo || null,
                            cor: vCor || null,
                        } : null,
                        createdAt: Timestamp.now(),
                    };

                    if (photoUrlVal) {
                        userData.photoURL = photoUrlVal;
                        userData.profilePicture = photoUrlVal;
                    }

                    const existingUser = findExistingUser(cleanCpfVal, cleanEmailVal, cleanNameVal);
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

    const handleImportJson = async () => {
        if (!jsonFile) {
            toast({ title: "Nenhum arquivo selecionado", description: "Por favor, selecione um arquivo .json para importar.", variant: "destructive" });
            return;
        }
        if (!user || !firestore) {
            toast({ title: "Erro", description: "Você precisa estar logado para importar dados.", variant: "destructive" });
            return;
        }

        setIsImportingJson(true);
        setJsonImportCompleted(false);
        setJsonImportCount(0);
        let count = 0;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result as string;
                const rawJson = JSON.parse(text);
                
                // Suportar tanto um array direto quanto um objeto que contenha a lista
                const records = Array.isArray(rawJson) 
                    ? rawJson 
                    : (rawJson.membros || rawJson.members || rawJson.data || []);

                if (!Array.isArray(records)) {
                    throw new Error("O arquivo JSON deve conter uma lista (array) de membros.");
                }

                // Buscar GCs para vínculo automático
                const cellsQuery = query(collection(firestore, 'cells'));
                const existingUsersQuery = query(collection(firestore, 'users'));
                const [cellsSnapshot, existingUsersSnapshot] = await Promise.all([
                    getDocs(cellsQuery),
                    getDocs(existingUsersQuery)
                ]);
                const cellDocs = cellsSnapshot.docs;
                const existingUsers = existingUsersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

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
                
                const importPromises = records.map(record => {
                    // Normalização flexível de campos (português/inglês, maiúsculas/minúsculas)
                    const cleanNameVal = clean(record.name || record.Nome || record.nome) || '';
                    if (!cleanNameVal) {
                        return Promise.resolve(); // Pular sem nome
                    }

                    const cleanEmailVal = clean(record.email || record.Email);
                    const cleanPhoneVal = clean(record.phone || record.Celular || record.Telefone || record.Contato);
                    const cleanCpfVal = cleanCpf(record.cpf || record.CPF);
                    const cleanBirthDate = clean(record.dataNascimento || record.nascimento || record['Data Nascimento'] || record.data_nascimento);
                    const cleanMaritalStatus = clean(record.estadoCivil || record.EstadoCivil || record['Estado Civil']);
                    const cleanStreet = clean(record.addressStreet || record.street || record.Endereço || record.Logradouro);
                    const children = record.temFilhos || record.Filhos || 'nao';
                    const childrenAge = record.idadeFilhos || record['Idade Filhos'] || '';
                    const integrationStatus = record.integrationStatus || record.Status || 'membro';
                    
                    const gcName = record.gcName || record.GC || record.Célula || '';
                    const cellDoc = gcName ? cellDocs.find(doc => normalizeString(doc.data().nome) === normalizeString(gcName)) : null;
                    const celulaId = cellDoc ? cellDoc.id : '';
                    const supervisorId = cellDoc ? cellDoc.data().supervisorId || '' : '';

                    const cleanConjuge = clean(record.conjuge || record.Cônjuge);
                    const cleanStatusArrolamento = clean(record.statusArrolamento || record.arrolamento || record.Arrolamento);
                    const cleanDataArrolamento = clean(record.dataArrolamento || record['Data Arrolamento']);
                    const cleanDataBatismo = clean(record.dataBatismo || record['Data Batismo']);
                    const cleanBatismoValue = clean(record.batizado || record.Batizado);
                    const isBatizado = (cleanBatismoValue === 'sim' || cleanBatismoValue === 'true' || cleanBatismoValue === 'Sim' || cleanBatismoValue === true);

                    const vPlaca = clean(record.veiculoPlaca || record.placa_veiculo || record.placa || record.Placa);
                    const vMarca = clean(record.veiculoMarca || record.marca_veiculo || record.marca || record.Marca);
                    const vModelo = clean(record.veiculoModelo || record.modelo_veiculo || record.modelo || record.Modelo);
                    const vCor = clean(record.veiculoCor || record.cor_veiculo || record.cor || record.Cor);
                    const hasVeiculo = !!(vPlaca || vMarca || vModelo || vCor);

                    const photoUrlVal = clean(record.photoURL || record.profilePicture || record.foto || record.Foto || record.linkFoto);

                    const userData: any = {
                        name: cleanNameVal,
                        email: cleanEmailVal || '',
                        phone: cleanPhoneVal || '',
                        dataNascimento: cleanBirthDate || '',
                        estadoCivil: cleanMaritalStatus || '',
                        cpf: cleanCpfVal || '',
                        conjuge: cleanConjuge || null,
                        statusArrolamento: cleanStatusArrolamento || null,
                        dataArrolamento: cleanDataArrolamento || null,
                        dataBatismo: cleanDataBatismo || null,
                        batizado: isBatizado ? 'sim' : 'nao',
                        address: { street: cleanStreet || '' },
                        temFilhos: (String(children).toLowerCase() === 'sim' || children === true) ? 'sim' : 'nao',
                        idadeFilhos: clean(childrenAge) || '',
                        integrationStatus: integrationStatus,
                        serviceStatus: 'not_serving',
                        hierarchy: {
                            role: record.role || record.Cargo || 'member',
                            celulaId: celulaId,
                            supervisorId: supervisorId,
                        },
                        veiculo: hasVeiculo ? {
                            placa: vPlaca || null,
                            marca: vMarca || null,
                            modelo: vModelo || null,
                            cor: vCor || null,
                        } : null,
                        createdAt: Timestamp.now(),
                    };

                    if (photoUrlVal) {
                        userData.photoURL = photoUrlVal;
                        userData.profilePicture = photoUrlVal;
                    }

                    const existingUser = findExistingUser(cleanCpfVal, cleanEmailVal, cleanNameVal);
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
                
                setJsonImportCount(count);
                setIsImportingJson(false);
                setJsonImportCompleted(true);
                toast({
                    title: "Importação Concluída!",
                    description: `${count} membros do Eklesia foram processados (criados ou atualizados).`,
                });

            } catch (error: any) {
                console.error("Error during JSON import:", error);
                setIsImportingJson(false);
                toast({
                    title: "Erro na Importação",
                    description: error.message || "Ocorreu um erro ao processar o arquivo JSON.",
                    variant: "destructive",
                });
            }
        };
        reader.readAsText(jsonFile);
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
                                <div className="space-y-4 p-4 border rounded-lg bg-slate-50/50">
                                    <h4 className="font-semibold flex items-center gap-2"><DatabaseZap className="size-5 text-primary"/>Importação via JSON</h4>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        Selecione o arquivo exportado em formato JSON do Eklesia. O sistema irá normatizar automaticamente os nomes de campos (Ex: <code>Nome</code>, <code>Celular</code>, <code>Célula</code>) e criar os registros vinculados aos GCs correspondentes.
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
                                    <Button onClick={handleImportJson} disabled={isImportingJson || jsonImportCompleted || !jsonFile} className="w-full max-w-sm bg-indigo-600 hover:bg-indigo-700 text-white">
                                        {isImportingJson ? (
                                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando JSON...</>
                                        ) : (
                                            <>{jsonImportCompleted ? <CheckCircle className="mr-2 h-4 w-4" /> : <Upload className="mr-2 h-4 w-4" />}
                                            {jsonImportCompleted ? 'JSON Importado' : 'Importar JSON do Eklesia'}</>
                                        )}
                                    </Button>
                                    {jsonImportCompleted && (
                                        <p className="text-green-600 font-medium">
                                            {jsonImportCount} membros do Eklesia foram importados com sucesso!
                                        </p>
                                    )}
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FixPertencerClassesMigration />
                <OldAttendanceMigration />
            </div>
        </div>
    );
}
