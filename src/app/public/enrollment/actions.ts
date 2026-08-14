'use server';

import { getAdminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Verifica se um e-mail pertence a um membro cadastrado.
 * Retorna dados mascarados para privacidade e o ID interno para submissão.
 */
export async function verifyMemberEmail(email: string) {
    try {
        const db = getAdminDb();
        const q = db.collection('users').where('email', '==', email.toLowerCase().trim());
        const snap = await q.get();

        if (snap.empty) {
            return { found: false };
        }

        const userDoc = snap.docs[0];
        const userData = userDoc.data();
        const userId = userDoc.id;

        // Máscaras de privacidade
        const maskName = (name: string) => {
            if (!name) return "";
            return name.split(' ').map(part => {
                if (part.length <= 1) return part;
                return part[0] + '*'.repeat(part.length - 1);
            }).join(' ');
        };

        const maskPhone = (phone: any) => {
            if (!phone) return "";
            const digits = String(phone).replace(/\D/g, '');
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
    paymentMethod?: string;
    installments?: number;
    asaasPaymentId?: string;
    tenantId?: string;
}) {
    try {
        const db = getAdminDb();

        let finalName = data.name;
        let finalPhone = data.phone;
        let finalEmail = data.email?.toLowerCase().trim();

        // 1. Se userId for fornecido, busca os dados no Firestore
        if (data.userId) {
            const userDoc = await db.collection('users').doc(data.userId).get();
            if (userDoc.exists) {
                const realData = userDoc.data()!;
                finalName = realData.name || finalName;
                finalPhone = realData.phone || finalPhone;
                finalEmail = realData.email || finalEmail;
            }
        }

        // 2. Se não tem userId mas tem email, busca pelo e-mail
        if (!finalName && finalEmail) {
            const userSnap = await db.collection('users').where('email', '==', finalEmail).get();
            if (!userSnap.empty) {
                const realData = userSnap.docs[0].data();
                finalName = realData.name;
                finalPhone = realData.phone || finalPhone;
            }
        }

        if (!finalName) {
            finalName = finalEmail ? finalEmail.split('@')[0] : 'Aluno Inscrito';
        }

        if (!finalEmail) {
            throw new Error("E-mail é obrigatório para realizar a inscrição.");
        }

        const docRef = await db.collection('enrollment_requests').add({
            name: finalName,
            email: finalEmail.toLowerCase(),
            phone: finalPhone || '',
            courseId: data.courseId,
            classId: data.classId || '',
            paymentMethod: data.paymentMethod || 'PIX',
            installments: data.installments || 1,
            asaasPaymentId: data.asaasPaymentId || '',
            tenantId: data.tenantId || '',
            status: 'pending',
            createdAt: Timestamp.now()
        });

        return { success: true, requestId: docRef.id };
    } catch (e: any) {
        console.error("Error submitting enrollment request:", e);
        return { error: e.message || "Erro ao salvar a inscrição." };
    }
}

/**
 * Busca o catálogo público de Cursos, Turmas e Eventos via Firebase Admin SDK.
 * Evita erros de regra de segurança do Firestore para visitantes deslogados (auth: null).
 */
export async function getPublicCatalog() {
    try {
        const db = getAdminDb();

        const [coursesSnap, classesSnap, eventsSnap, strategicEventsSnap] = await Promise.all([
            db.collection('courses').get(),
            db.collection('classes').get(),
            db.collection('events').get(),
            db.collection('strategicEvents').get(),
        ]);

        const courses = coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const classes = classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const events = eventsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const strategicEvents = strategicEventsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        return { courses, classes, events, strategicEvents };
    } catch (e) {
        console.error("Error fetching public catalog:", e);
        return { courses: [], classes: [], events: [], strategicEvents: [] };
    }
}
