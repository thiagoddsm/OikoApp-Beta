
import { NextResponse } from 'next/server';
import { findOrCreateContaAzulCustomer, createContaAzulReceivable } from '@/lib/conta-azul';

export const dynamic = 'force-dynamic';

export async function POST() {
    try {
        // 1. Gerenciar Cliente
        const customerId = await findOrCreateContaAzulCustomer({
            name: "Cliente Teste OikoApp",
            email: "suporte@oikoapp.com.br",
            phone: "21999999999"
        });

        // 2. Criar Conta a Receber (R$ 1,00)
        const today = new Date().toISOString().split('T')[0];
        const result = await createContaAzulReceivable({
            customer_id: customerId,
            descricao: "Lançamento de Teste OikoApp",
            valor: 1.00,
            data_vencimento: today
        });
        
        return NextResponse.json({ 
            success: true, 
            message: 'Escrita realizada com sucesso!',
            data: { customerId, result }
        });

    } catch (error: any) {
        console.error('Erro no teste de escrita:', error);
        return NextResponse.json({ 
            success: false, 
            error: error.message || 'Erro desconhecido ao gravar no Conta Azul.'
        }, { status: 500 });
    }
}
