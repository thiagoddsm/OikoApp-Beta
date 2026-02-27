
'use server';

import { initializeFirebase } from '@/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

export async function addEnrollmentRequest(data: { name: string; email?: string; phone: string; courseId: string }) {
    try {
        const { firestore } = initializeFirebase();
        const col = collection(firestore, 'enrollment_requests');
        
        await addDoc(col, {
            ...data,
            status: 'pending',
            createdAt: Timestamp.now(),
        });

        return { success: true };
    } catch (error: any) {
        console.error("Erro ao salvar solicitação de inscrição:", error);
        return { success: false, error: error.message };
    }
}
