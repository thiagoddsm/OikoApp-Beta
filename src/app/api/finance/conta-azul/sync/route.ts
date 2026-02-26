
import { NextResponse } from 'next/server';
import { callContaAzulApi } from '@/lib/conta-azul';

export const dynamic = 'force-dynamic';

export async function POST() {
    try {
        // Buscar contas bancárias para testar a conexão
        const bankAccounts = await callContaAzulApi('/v1/bank-accounts');
        
        // Poderíamos também buscar categorias aqui
        // const categories = await callContaAzulApi('/v1/categorias');

        return NextResponse.json({ 
            success: true, 
            message: 'Sincronização realizada com sucesso.',
            data: {
                bankAccounts: bankAccounts || []
            }
        });
    } catch (error: any) {
        console.error('Erro na sincronização Conta Azul:', error);
        return NextResponse.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
}
