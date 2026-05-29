'use server';

import { initializeFirebase } from '@/firebase';
import { collection, query, where, getDocs, doc, getDoc, addDoc, Timestamp } from 'firebase/firestore';

/**
 * Verifica se um e-mail pertence a um membro cadastrado.
 * Retorna dados mascarados para privacidade e o ID interno para submissão.
 */
export async function verifyMemberEmail(email: string) {
    const { firestore } = initializeFirebase();
    if (!firestore) return { error: "Database not available" };

    try {
        const q = query(collection(firestore, 'users'), where('email', '==', email.toLowerCase().trim()));
        const snap = await getDocs(q);

        if (snap.empty) {
            return { found: false };
        }

        const userData = snap.docs[0].data();
        const userId = snap.docs[0].id;

        // Máscaras de privacidade
        const maskName = (name: string) => {
            if (!name) return "";
            return name.split(' ').map(part => {
                if (part.length <= 1) return part;
                return part[0] + '*'.repeat(part.length - 1);
            }).join(' ');
        };

        const maskPhone = (phone: string) => {
            if (!phone) return "";
            const digits = phone.replace(/\D/g, '');
            if (digits.length < 4) return "****";
            return `(${digits.substring(0, 2)}) *****-${digits.slice(-2)}`;
        };

        return {
            found: true,
            userId,
            maskedName: maskName(userData.name),
            maskedPhone: maskPhone(userData.phone),
            hasCpf: !!(userData.cpfCnpj || userData.cpf || userData.cnpj)
        };
    } catch (e) {
        console.error("Error verifying email:", e);
        return { error: "Falha na comunicação com o servidor." };
    }
}

/**
 * Registra o protocolo de inscrição.
 * Se userId for fornecido, busca os dados REAIS no banco para evitar salvar as máscaras (***).
 */
export async function submitEnrollmentRequest(data: {
    userId?: string;
    name?: string;
    email: string;
    phone?: string;
    courseId: string;
    classId?: string;
}) {
    const { firestore } = initializeFirebase();
    if (!firestore) throw new Error("Database not available");

    let finalName = data.name;
    let finalPhone = data.phone;
    let finalEmail = data.email;

    // Se é um membro reconhecido, buscamos os dados reais no servidor
    if (data.userId) {
        const userDoc = await getDoc(doc(firestore, 'users', data.userId));
        if (userDoc.exists()) {
            const realData = userDoc.data();
            finalName = realData.name;
            finalPhone = realData.phone;
            finalEmail = realData.email;
        }
    }

    if (!finalName || !finalEmail) {
        throw new Error("Dados de identificação ausentes.");
    }

    await addDoc(collection(firestore, 'enrollment_requests'), {
        name: finalName,
        email: finalEmail.toLowerCase(),
        phone: finalPhone || '',
        courseId: data.courseId,
        classId: data.classId || '',
        status: 'pending',
        createdAt: Timestamp.now()
    });

    return { success: true };
}
