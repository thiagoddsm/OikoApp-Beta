
import { NextResponse } from 'next/server';
import { callContaAzulApi } from '@/lib/conta-azul';

export const dynamic = 'force-dynamic';

export async function POST() {
    try {
        // Buscar contas bancárias para testar a conexão
        // Na v1 da API, alguns endpoints podem retornar lista vazia se não houver dados
        const bankAccounts = await callContaAzulApi('/v1/bank-accounts');
        
        // Normalização do retorno (pode vir como array ou objeto com .items)
        const list = Array.isArray(bankAccounts) ? bankAccounts : (bankAccounts.items || []);

        return NextResponse.json({ 
            success: true, 
            message: 'Sincronização realizada com sucesso.',
            data: {
                bankAccounts: list
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
