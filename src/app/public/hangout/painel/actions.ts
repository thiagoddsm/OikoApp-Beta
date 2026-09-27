'use server';

import { getAdminDb } from '@/lib/firebase-admin';

export async function fetchHangoutQuestions() {
    try {
        const db = getAdminDb();
        const snap = await db.collection('hangout_questions')
            .orderBy('createdAt', 'desc')
            .get();

        const questions = snap.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                text: data.text || '',
                author: data.author || 'Anônimo',
                answered: !!data.answered,
                createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : new Date().toISOString()
            };
        });

        return { success: true, questions };
    } catch (error: any) {
        console.error("Erro ao buscar perguntas:", error);
        return { success: false, error: error.message };
    }
}
