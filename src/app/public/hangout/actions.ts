'use server';

import { getAdminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function submitHangoutQuestion(data: {
    text: string;
    author: string;
}) {
    try {
        const db = getAdminDb();
        
        await db.collection('hangout_questions').add({
            text: data.text,
            author: data.author || 'Anônimo',
            answered: false,
            createdAt: FieldValue.serverTimestamp()
        });

        return { success: true };
    } catch (error: any) {
        console.error("Erro ao enviar pergunta:", error);
        return { success: false, error: "Firebase Error: " + (error?.message || String(error)) };
    }
}

export async function toggleQuestionAnswered(id: string, answered: boolean) {
    try {
        const db = getAdminDb();
        
        await db.collection('hangout_questions').doc(id).update({ answered });

        return { success: true };
    } catch (error: any) {
        console.error("Erro ao atualizar status da pergunta:", error);
        return { success: false, error: "Firebase Error: " + (error?.message || String(error)) };
    }
}
