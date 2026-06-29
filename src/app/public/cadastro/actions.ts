'use server';

import { getAdminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { formatName } from '@/lib/utils';

export async function getPublicFormOptions() {
    try {
        const db = getAdminDb();

        const cellsSnap = await db.collection('cells').get();
        const cells = cellsSnap.docs.map(doc => ({ id: doc.id, nome: doc.data().nome }));

        const areasSnap = await db.collection('areas_of_service').get();
        const areas = areasSnap.docs.map(doc => ({ id: doc.id, name: doc.data().name }));

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
                sexo: userData.sexo || userData.gender || '',
                escolaridade: userData.escolaridade || '',
                profissao: userData.profissao || '',
                addressCep: userData.address?.cep || '',
                addressStreet: userData.address?.street || '',
                conjuge: userData.conjuge || '',
                temFilhos: userData.temFilhos || 'nao',
                idadeFilhos: userData.idadeFilhos || '',
                comoConheceu: userData.comoConheceu || '',
                nomeConvidou: userData.nomeConvidou || '',
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
    sexo?: string;
    escolaridade?: string;
    profissao?: string;
    addressCep?: string;
    addressStreet?: string;
    conjuge?: string;
    temFilhos?: string;
    idadeFilhos?: string;
    comoConheceu?: string;
    nomeConvidou?: string;
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

        const userData: any = {
            name: formatName(data.name),
            email: emailClean,
            phone: data.phone || '',
            cpf: data.cpf || '',
            dataNascimento: data.dataNascimento || '',
            estadoCivil: data.estadoCivil || '',
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
            conjuge: data.conjuge ? formatName(data.conjuge) : null,
            temFilhos: data.temFilhos || 'nao',
            idadeFilhos: data.idadeFilhos || '',
            comoConheceu: data.comoConheceu || '',
            nomeConvidou: data.nomeConvidou ? formatName(data.nomeConvidou) : '',
            batizado: data.batizado || 'nao',
            dataBatismo: data.dataBatismo || '',
            igrejaBatismo: data.igrejaBatismo || '',
            membroAntigo: data.membroAntigo || 'nao',
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

            const updatedFamilyMembers = [...(oldData.familyMembers || [])];
            if (data.conjuge) {
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
            userData.familyMembers = data.conjuge ? [{
                name: formatName(data.conjuge),
                relation: 'Cônjuge'
            }] : [];

            const newDocRef = await db.collection('users').add(userData);
            return { success: true, userId: newDocRef.id, action: 'created' };
        }
    } catch (e) {
        console.error("Error saving public registration:", e);
        throw e;
    }
}
