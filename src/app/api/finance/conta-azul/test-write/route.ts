
import { NextResponse } from 'next/server';
import { findOrCreateContaAzulCustomer, createContaAzulCharge, callContaAzulApi } from '@/lib/conta-azul';

export const dynamic = 'force-dynamic';

export async function POST() {
    try {
        // 1. Criar ou buscar um cliente de teste
        const testMember = {
            name: `Membro Teste OikoApp ${Math.floor(Math.random() * 1000)}`,
            email: 'suporte@oikoapp.com.br',
            phone: '21999999999'
        };

        const customerId = await findOrCreateContaAzulCustomer(testMember);
        
        // 2. Buscar uma conta bancária ativa (v1)
        const bankAccountsData = await callContaAzulApi('/v1/bank-accounts');
        const bankAccounts = Array.isArray(bankAccountsData) ? bankAccountsData : (bankAccountsData.items || []);
        const bankAccount = bankAccounts[0];

        if (!bankAccount) {
            throw new Error('Nenhuma conta bancária encontrada para gerar a cobrança de teste.');
        }

        // 3. Gerar uma cobrança de teste (v2) conforme documentação enviada
        // Nota: Para gerar uma cobrança real via v2, normalmente precisamos de um id_parcela de um receivable.
        // Como é um teste de ESCRITA e PERMISSÃO, vamos reportar os dados básicos necessários.
        
        return NextResponse.json({ 
            success: true, 
            message: 'Teste de permissão concluído com sucesso.',
            data: {
                customerId,
                selectedBank: bankAccount.name,
                nextStep: "A escrita na v2 requer um id_parcela válido de um lançamento financeiro v1."
            }
        });

    } catch (error: any) {
        console.error('Erro no teste Conta Azul:', error);
        return NextResponse.json({ 
            success: false, 
            error: error.message || 'Erro desconhecido'
        }, { status: 500 });
    }
}
