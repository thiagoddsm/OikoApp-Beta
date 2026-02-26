
import { NextResponse } from 'next/server';
import { findOrCreateContaAzulCustomer, createContaAzulReceivable, callContaAzulApi } from '@/lib/conta-azul';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export async function POST(request: Request) {
    try {
        const { transactionId, memberData } = await request.json();
        const { firestore } = initializeFirebase();

        // 1. Buscar a transação original
        const transRef = doc(firestore, 'financial_transactions', transactionId);
        const transSnap = await getDoc(transRef);

        if (!transSnap.exists()) {
            throw new Error('Transação não encontrada.');
        }

        const transaction = transSnap.data();

        // 2. Resolver Categoria no Conta Azul (tentar achar uma categoria compatível)
        const categories = await callContaAzulApi('/v1/categories');
        const category = categories.find((c: any) => c.name.toLowerCase().includes(transaction.category.toLowerCase())) || categories[0];

        // 3. Resolver Conta Bancária (pegar a primeira ativa)
        const bankAccounts = await callContaAzulApi('/v1/bank-accounts');
        const bankAccount = bankAccounts.find((b: any) => b.name.toLowerCase().includes('itau') || b.name.toLowerCase().includes('nubank')) || bankAccounts[0];

        // 4. Resolver Cliente (Membro)
        let customerId = '';
        if (memberData) {
            customerId = await findOrCreateContaAzulCustomer(memberData);
        } else {
            // Cliente genérico para anônimos
            customerId = await findOrCreateContaAzulCustomer({ name: 'Doador Anônimo IBM' });
        }

        if (!customerId) throw new Error('Não foi possível vincular o cliente no Conta Azul.');

        // 5. Criar o Recebível
        const date = transaction.date.toDate().toISOString().split('T')[0];
        
        await createContaAzulReceivable({
            description: `[OikoApp] ${transaction.category}: ${transaction.description || ''}`,
            value: transaction.amount,
            due_date: date,
            customer_id: customerId,
            category_id: category?.id,
            bank_account_id: bankAccount?.id
        });

        // 6. Marcar como sincronizado no Firestore
        await updateDoc(transRef, { contaAzulSync: true });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Erro na sincronização individual Conta Azul:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
