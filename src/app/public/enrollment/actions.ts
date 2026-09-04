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
 * Converte recursivamente Timestamps do Firestore e objetos não-planos em dados primitivos/JSON.
 * Essencial para que Server Actions do Next.js passem objetos limpos para Client Components.
 */
function sanitizeFirestoreData<T = any>(data: any): T {
    if (data === null || data === undefined) return data;
    if (typeof data.toDate === 'function') {
        try {
            return data.toDate().toISOString() as any;
        } catch {
            return null as any;
        }
    }
    if (typeof data._seconds === 'number' && typeof data._nanoseconds === 'number') {
        try {
            return new Date(data._seconds * 1000 + Math.round(data._nanoseconds / 1000000)).toISOString() as any;
        } catch {
            return null as any;
        }
    }
    if (data instanceof Date) {
        return data.toISOString() as any;
    }
    if (Array.isArray(data)) {
        return data.map(sanitizeFirestoreData) as any;
    }
    if (typeof data === 'object') {
        const plain: Record<string, any> = {};
        for (const [key, value] of Object.entries(data)) {
            plain[key] = sanitizeFirestoreData(value);
        }
        return plain as any;
    }
    return data;
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
            db.collection('strategic_events').get(),
        ]);

        const courses = coursesSnap.docs.map(doc => ({ id: doc.id, ...sanitizeFirestoreData(doc.data()) }));
        const classes = classesSnap.docs.map(doc => ({ id: doc.id, ...sanitizeFirestoreData(doc.data()) }));
        const events = eventsSnap.docs.map(doc => ({ id: doc.id, ...sanitizeFirestoreData(doc.data()) }));
        const strategicEvents = strategicEventsSnap.docs.map(doc => ({ id: doc.id, ...sanitizeFirestoreData(doc.data()) }));

        return JSON.parse(JSON.stringify({ courses, classes, events, strategicEvents }));
    } catch (e) {
        console.error("Error fetching public catalog:", e);
        return { courses: [], classes: [], events: [], strategicEvents: [] };
    }
}

/**
 * Busca um evento ou curso público pelo seu slug amigável ou ID.
 */
export async function getPublicItemBySlug(slugOrId: string) {
    try {
        const catalog = await getPublicCatalog();
        const { matchSlug } = await import('@/lib/slug-utils');

        // 1. Buscar em strategicEvents (apenas aprovados)
        const foundEvent = catalog.strategicEvents.find(
            (e: any) => e.status === 'aprovado' && matchSlug(e, slugOrId)
        );
        if (foundEvent) {
            return JSON.parse(JSON.stringify({
                type: 'event' as const,
                item: foundEvent,
            }));
        }

        // 2. Buscar em courses
        const foundCourse = catalog.courses.find((c: any) => matchSlug(c, slugOrId));
        if (foundCourse) {
            const courseClasses = catalog.classes.filter((cl: any) => cl.courseId === foundCourse.id);
            return JSON.parse(JSON.stringify({
                type: 'course' as const,
                item: foundCourse,
                classes: courseClasses,
            }));
        }

        return null;
    } catch (e) {
        console.error("Error finding item by slug:", e);
        return null;
    }
}

