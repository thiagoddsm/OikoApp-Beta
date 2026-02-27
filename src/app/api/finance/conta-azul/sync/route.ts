import { NextResponse } from 'next/server';
import { callContaAzulApi } from '@/lib/conta-azul';

export const dynamic = 'force-dynamic';

export async function POST() {
    try {
        // Conforme documentação: /v1/conta-financeira
        const data = await callContaAzulApi('/v1/conta-financeira');
        
        const list = Array.isArray(data) ? data : (data.items || []);

        return NextResponse.json({ 
            success: true, 
            message: 'Contas sincronizadas.',
            data: {
                bankAccounts: list
            }
        });
    } catch (error: any) {
        console.error('Erro na sincronização:', error);
        return NextResponse.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
}
