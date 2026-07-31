'use server';

import { getAdminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { formatName } from '@/lib/utils';

export async function getPublicFormOptions() {
    try {
        const db = getAdminDb();

        const cellsSnap = await db.collection('cells').get();
        const usersSnap = await db.collection('users').get();
        
        const usersMap = new Map<string, string>();
        usersSnap.forEach(uDoc => {
            usersMap.set(uDoc.id, uDoc.data().name || '');
        });

        const cells = cellsSnap.docs.map(doc => {
            const data = doc.data();
            let leaderName = data.leaderName || data.liderNome || data.liderName || '';
            const liderId = data.liderId || data.leaderId || data.liderId1;
            
            if (!leaderName && liderId) {
                leaderName = usersMap.get(liderId) || '';
            }

            if (!leaderName && Array.isArray(data.leaders) && data.leaders.length > 0) {
                const firstLeaderId = typeof data.leaders[0] === 'string' ? data.leaders[0] : data.leaders[0]?.id;
                if (firstLeaderId) leaderName = usersMap.get(firstLeaderId) || '';
            }

            return {
                id: doc.id,
                nome: data.nome || data.name || 'Célula sem nome',
                leaderName: leaderName ? formatName(leaderName) : ''
            };
        });

        // Se alguma célula ainda não encontrou o líder pelo documento da célula, buscar no users por quem tem a celulaId no hierarchy
        usersSnap.forEach(uDoc => {
            const uData = uDoc.data();
            const celId = uData.hierarchy?.celulaId;
            const role = uData.hierarchy?.role || uData.role;
            if (celId && (role === 'lider' || role === 'lider_gc' || role === 'lider_celula' || role === 'pastor')) {
                const targetCell = cells.find(c => c.id === celId);
                if (targetCell && !targetCell.leaderName && uData.name) {
                    targetCell.leaderName = formatName(uData.name);
                }
            }
        });

        cells.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

        const areasSnap = await db.collection('areas_of_service').get();
        const areas = areasSnap.docs
            .map(doc => ({ id: doc.id, name: doc.data().name }))
            .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

        return { cells, areas };
    } catch (e) {
        console.error("Error fetching public form options:", e);
        return { cells: [], areas: [] };
    }
}

export async function verifyEmailRegistered(email: string) {
    try {
        const db = getAdminDb();

        const snap = await db.collection('users').where('email', '==', email.toLowerCase().trim()).get();

        if (snap.empty) {
            return { found: false };
        }

        const userData = snap.docs[0].data();
        const userId = snap.docs[0].id;

        return {
            found: true,
            userId,
            userData: {
                name: userData.name || '',
                phone: userData.phone || '',
                cpf: userData.cpf || '',
                dataNascimento: userData.dataNascimento || '',
                estadoCivil: userData.estadoCivil || '',
                dataCasamento: userData.dataCasamento || '',
                sexo: userData.sexo || userData.gender || '',
                escolaridade: userData.escolaridade || '',
                profissao: userData.profissao || '',
                addressCep: userData.address?.cep || '',
                addressStreet: userData.address?.street || '',
                conjuge: userData.conjuge || '',
                temFilhos: userData.temFilhos || 'nao',
                filhosList: Array.isArray(userData.filhosList) ? userData.filhosList : (
                    Array.isArray(userData.familyMembers)
                        ? userData.familyMembers.filter((m: any) => m.relation === 'Filho(a)').map((m: any) => ({ name: m.name || '', dataNascimento: m.birthDate || m.dataNascimento || '' }))
                        : []
                ),
                idadeFilhos: userData.idadeFilhos || '',
                comoConheceu: userData.comoConheceu || '',
                nomeConvidou: userData.nomeConvidou || '',
                caminhadaInicio: userData.caminhadaInicio || '',
                dataDecisao: userData.dataDecisao || '',
                proximosPassos: userData.proximosPassos || [],
                batizado: userData.batizado || 'nao',
                dataBatismo: userData.dataBatismo || '',
                igrejaBatismo: userData.igrejaBatismo || '',
                membroAntigo: userData.membroAntigo || 'nao',
                igrejaAntiga: userData.igrejaAntiga || '',
                veiculoPlaca: userData.veiculo?.placa || '',
                veiculoMarca: userData.veiculo?.marca || '',
                veiculoModelo: userData.veiculo?.modelo || '',
                veiculoCor: userData.veiculo?.cor || '',
                celulaId: userData.hierarchy?.celulaId || '',
                serviceAreaId: userData.serviceAreaId || '',
            }
        };
    } catch (e) {
        console.error("Error verifying email in public/cadastro:", e);
        return { error: "Falha na comunicação com o servidor." };
    }
}

export async function savePublicRegistration(data: {
    userId?: string;
    name: string;
    email: string;
    phone: string;
    cpf?: string;
    dataNascimento?: string;
    estadoCivil?: string;
    dataCasamento?: string;
    sexo?: string;
    escolaridade?: string;
    profissao?: string;
    addressCep?: string;
    addressStreet?: string;
    conjuge?: string;
    temFilhos?: string;
    filhosList?: { name: string; dataNascimento?: string }[];
    idadeFilhos?: string;
    comoConheceu?: string;
    nomeConvidou?: string;
    caminhadaInicio?: string;
    dataDecisao?: string;
    proximosPassos?: string[];
    batizado?: string;
    dataBatismo?: string;
    igrejaBatismo?: string;
    membroAntigo?: string;
    igrejaAntiga?: string;
    veiculoPlaca?: string;
    veiculoMarca?: string;
    veiculoModelo?: string;
    veiculoCor?: string;
    celulaId?: string;
    serviceAreaId?: string;
}) {
    try {
        const db = getAdminDb();
        const emailClean = data.email.toLowerCase().trim();

        // Limpar Sexo para "Masculino" ou "Feminino"
        let cleanSexo: string | null = null;
        if (data.sexo) {
            const firstChar = data.sexo.trim().substring(0, 1).toUpperCase();
            if (firstChar === 'M') {
                cleanSexo = 'Masculino';
            } else if (firstChar === 'F') {
                cleanSexo = 'Feminino';
            }
        }

        const validFilhos = Array.isArray(data.filhosList) 
            ? data.filhosList.filter(f => f.name.trim()).map(f => ({ name: formatName(f.name), dataNascimento: f.dataNascimento || '' }))
            : [];

        // Derivar integrationStatus a partir da caminhada inicial
        let derivedStatus = 'visitante';
        if (data.caminhadaInicio === 'conversao' || data.caminhadaInicio === 'reconciliacao') {
            derivedStatus = 'novo_convertido';
        } else if (data.caminhadaInicio === 'transferencia') {
            derivedStatus = 'membro_outra_igreja';
        }

        const userData: any = {
            name: formatName(data.name),
            email: emailClean,
            phone: data.phone || '',
            cpf: data.cpf || '',
            dataNascimento: data.dataNascimento || '',
            estadoCivil: data.estadoCivil || '',
            dataCasamento: (data.estadoCivil === 'Casado(a)' || data.estadoCivil === 'União Estável' || data.estadoCivil === 'casado') ? (data.dataCasamento || '') : '',
            gender: cleanSexo,
            sexo: cleanSexo,
            escolaridade: data.escolaridade || '',
            profissao: data.profissao || '',
            professional: {
                educationLevel: data.escolaridade || '',
                profession: data.profissao || '',
            },
            address: {
                street: data.addressStreet || '',
                cep: data.addressCep || ''
            },
            conjuge: (data.estadoCivil === 'Casado(a)' || data.estadoCivil === 'União Estável' || data.estadoCivil === 'casado') && data.conjuge ? formatName(data.conjuge) : null,
            temFilhos: data.temFilhos || 'nao',
            filhosList: validFilhos,
            idadeFilhos: data.idadeFilhos || '',
            comoConheceu: data.comoConheceu || '',
            nomeConvidou: data.nomeConvidou ? formatName(data.nomeConvidou) : '',
            caminhadaInicio: data.caminhadaInicio || '',
            dataDecisao: data.dataDecisao || '',
            proximosPassos: Array.isArray(data.proximosPassos) ? data.proximosPassos : [],
            batizado: data.batizado || 'nao',
            dataBatismo: data.dataBatismo || '',
            igrejaBatismo: data.igrejaBatismo || '',
            membroAntigo: data.caminhadaInicio === 'transferencia' ? 'sim' : (data.membroAntigo || 'nao'),
            igrejaAntiga: data.igrejaAntiga || '',
            veiculo: (data.veiculoPlaca || data.veiculoMarca || data.veiculoModelo || data.veiculoCor) ? {
                placa: data.veiculoPlaca || null,
                marca: data.veiculoMarca || null,
                modelo: data.veiculoModelo || null,
                cor: data.veiculoCor || null,
            } : null,
            serviceAreaId: data.serviceAreaId || '',
            serviceStatus: data.serviceAreaId ? 'serving' : 'not_serving',
            updatedAt: Timestamp.now()
        };

        if (data.userId) {
            const docRef = db.collection('users').doc(data.userId);
            const oldDoc = await docRef.get();
            const oldData = oldDoc.exists ? oldDoc.data() || {} : {};

            let updatedFamilyMembers = [...(oldData.familyMembers || [])];
            // Remover filhos anteriores do familyMembers
            updatedFamilyMembers = updatedFamilyMembers.filter((m: any) => m.relation !== 'Filho(a)');
            
            // Adicionar Cônjuge
            if (data.estadoCivil === 'casado' && data.conjuge) {
                const conjugeClean = formatName(data.conjuge);
                const conjugeIndex = updatedFamilyMembers.findIndex((m: any) => m.relation === 'Cônjuge');
                if (conjugeIndex > -1) {
                    updatedFamilyMembers[conjugeIndex] = {
                        ...updatedFamilyMembers[conjugeIndex],
                        name: conjugeClean
                    };
                } else {
                    updatedFamilyMembers.push({
                        name: conjugeClean,
                        relation: 'Cônjuge'
                    });
                }
            } else {
                const conjugeIndex = updatedFamilyMembers.findIndex((m: any) => m.relation === 'Cônjuge');
                if (conjugeIndex > -1) {
                    updatedFamilyMembers.splice(conjugeIndex, 1);
                }
            }

            // Adicionar filhos atualizados
            if (data.temFilhos === 'sim') {
                validFilhos.forEach(f => {
                    updatedFamilyMembers.push({
                        name: f.name,
                        relation: 'Filho(a)',
                        birthDate: f.dataNascimento || null
                    });
                });
            }
            
            const mergedData = {
                ...oldData,
                ...userData,
                familyMembers: updatedFamilyMembers,
                // Preservar propriedades estruturais
                tags: oldData.tags || [],
                integrationStatus: oldData.integrationStatus || 'novo_convertido',
                serviceStatus: data.serviceAreaId ? 'serving' : (oldData.serviceStatus || 'not_serving'),
                hierarchy: {
                    role: oldData.hierarchy?.role || 'aluno',
                    celulaId: data.celulaId || oldData.hierarchy?.celulaId || '',
                    supervisorId: oldData.hierarchy?.supervisorId || ''
                },
                createdAt: oldData.createdAt || Timestamp.now()
            };

            await docRef.set(mergedData);
            return { success: true, userId: data.userId, action: 'updated' };
        } else {
            // Criar do zero
            userData.createdAt = Timestamp.now();
            userData.integrationStatus = 'novo_convertido';
            userData.serviceStatus = data.serviceAreaId ? 'serving' : 'not_serving';
            userData.hierarchy = {
                role: 'aluno',
                celulaId: data.celulaId || '',
                supervisorId: ''
            };
            userData.tags = [];
            const newFamilyMembers: any[] = [];
            if (data.estadoCivil === 'casado' && data.conjuge) {
                newFamilyMembers.push({ name: formatName(data.conjuge), relation: 'Cônjuge' });
            }
            if (data.temFilhos === 'sim') {
                validFilhos.forEach(f => {
                    newFamilyMembers.push({ name: f.name, relation: 'Filho(a)', birthDate: f.dataNascimento || null });
                });
            }
            userData.familyMembers = newFamilyMembers;

            const newDocRef = await db.collection('users').add(userData);
            return { success: true, userId: newDocRef.id, action: 'created' };
        }
    } catch (e) {
        console.error("Error saving public registration:", e);
        throw e;
    }
}
