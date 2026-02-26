
import { NextResponse } from 'next/server';
import { findOrCreateContaAzulCustomer, createContaAzulReceivable, callContaAzulApi } from '@/lib/conta-azul';

export const dynamic = 'force-dynamic';

export async function POST() {
    try {
        // 1. Criar um cliente de teste
        const testMember = {
            name: `Membro Teste OikoApp ${Math.floor(Math.random() * 1000)}`,
            email: 'teste@oikoapp.com.br',
            phone: '21999999999'
        };

        const customerId = await findOrCreateContaAzulCustomer(testMember);
        if (!customerId) throw new Error('Falha ao criar/buscar cliente no Conta Azul.');

        // 2. Buscar primeira categoria disponível (para não dar erro de ID inexistente)
        const categoriesData = await callContaAzulApi('/v1/categories');
        const categories = Array.isArray(categoriesData) ? categoriesData : (categoriesData.items || []);
        const categoryId = categories[0]?.id;

        // 3. Buscar primeira conta bancária disponível
        const bankAccountsData = await callContaAzulApi('/v1/bank-accounts');
        const bankAccounts = Array.isArray(bankAccountsData) ? bankAccountsData : (bankAccountsData.items || []);
        const bankAccountId = bankAccounts[0]?.id;

        // 4. Criar um recebível de teste (R$ 1,00)
        const result = await createContaAzulReceivable({
            description: 'LANÇAMENTO DE TESTE - OIKOAPP',
            value: 1.00,
            due_date: new Date().toISOString().split('T')[0],
            customer_id: customerId,
            category_id: categoryId,
            bank_account_id: bankAccountId
        });

        return NextResponse.json({ 
            success: true, 
            message: 'Lançamento de teste realizado com sucesso.',
            details: result 
        });

    } catch (error: any) {
        console.error('Erro no teste de escrita Conta Azul:', error);
        return NextResponse.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
}
