'use server';

import { initializeFirebase } from '@/firebase';
import { collection, addDoc, Timestamp, doc, updateDoc } from 'firebase/firestore';

export async function submitHangoutQuestion(data: {
    text: string;
    author: string;
}) {
    try {
        const { firestore } = initializeFirebase();
        
        await addDoc(collection(firestore, 'hangout_questions'), {
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
        const { firestore } = initializeFirebase();
        const docRef = doc(firestore, 'hangout_questions', id);
        
        await updateDoc(docRef, { answered });

        return { success: true };
    } catch (error) {
        console.error("Erro ao atualizar status da pergunta:", error);
        return { success: false, error: "Falha ao atualizar a pergunta." };
    }
}
