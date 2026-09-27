'use server';

import { getAdminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

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
            createdAt: Timestamp.now()
        });

        return { success: true };
    } catch (error) {
        console.error("Erro ao enviar pergunta:", error);
        return { success: false, error: "Falha ao enviar a pergunta." };
    }
}

export async function toggleQuestionAnswered(id: string, answered: boolean) {
    try {
        const db = getAdminDb();
        
        await db.collection('hangout_questions').doc(id).update({ answered });

        return { success: true };
    } catch (error) {
        console.error("Erro ao atualizar status da pergunta:", error);
        return { success: false, error: "Falha ao atualizar a pergunta." };
    }
}
