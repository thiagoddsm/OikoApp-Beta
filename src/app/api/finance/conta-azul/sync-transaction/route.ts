import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { findOrCreateContaAzulCustomer, callContaAzulApi } from '@/lib/conta-azul';

/**
 * Rota para sincronizar uma transação individual com o Conta Azul.
 */
export async function POST(request: Request) {
    try {
        const { transactionId, memberData } = await request.json();
        const { firestore } = initializeFirebase();

        const transRef = doc(firestore, 'financial_transactions', transactionId);
        const transSnap = await getDoc(transRef);

        if (!transSnap.exists()) throw new Error('Transação não encontrada.');
        const transaction = transSnap.data();

        // 1. Resolver Cliente
        const customerId = await findOrCreateContaAzulCustomer(
            memberData?.name ? memberData : { name: 'Doador IBM' }
        );

        // 2. Resolver Categoria e Banco (Filtros de segurança)
        const [categories, bankAccounts] = await Promise.all([
            callContaAzulApi('/v1/categories'),
            callContaAzulApi('/v1/bank-accounts')
        ]);

        const category = categories.find((c: any) => 
            c.name.toLowerCase().includes(transaction.category.toLowerCase())
        ) || categories[0];

        const bankAccount = bankAccounts.find((b: any) => 
            b.name.toLowerCase().includes('itaú') || b.name.toLowerCase().includes('nubank')
        ) || bankAccounts[0];

        // 3. Formatar Data ISO (YYYY-MM-DD)
        const dateObj = transaction.date?.toDate ? transaction.date.toDate() : new Date(transaction.date);
        const dateFormatted = dateObj.toISOString().split('T')[0];

        // 4. Criar Recebível (V1 Financeiro)
        await callContaAzulApi('/v1/financeiro/contas-a-receber', 'POST', {
            descricao: `[Oiko] ${transaction.category}: ${transaction.description || ''}`,
            valor: transaction.amount,
            data_vencimento: dateFormatted,
            customer_id: customerId,
            category_id: category?.id,
            bank_account_id: bankAccount?.id
        });

        // Marca como sincronizado para evitar duplicidade
        await updateDoc(transRef, { contaAzulSync: true });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Erro sincronização Conta Azul:', error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
