'use server';

import { initializeFirebase } from '@/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

export async function submitPrayerRequest(data: {
    name: string;
    phone: string;
    request: string;
    wantsContact: boolean;
}) {
    try {
        const { firestore } = initializeFirebase();
        
        // Salva na coleção 'prayer_requests' no Firestore
        await addDoc(collection(firestore, 'prayer_requests'), {
            name: data.name || 'Anônimo',
            phone: data.phone || '',
            request: data.request,
            wantsContact: data.wantsContact,
            status: 'pending', // pending, praying, answered
            createdAt: Timestamp.now()
        });

        return { success: true };
    } catch (error) {
        console.error("Erro ao enviar pedido de oração:", error);
        return { success: false, error: "Falha ao enviar o pedido." };
    }
}