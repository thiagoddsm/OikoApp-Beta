
import { NextResponse } from 'next/server';
import { findOrCreateContaAzulCustomer, callContaAzulApi, createContaAzulReceivable } from '@/lib/conta-azul';

export const dynamic = 'force-dynamic';

export async function POST() {
    try {
        // 1. Gerenciar Cliente (Usa o Host V1 conforme a doc)
        const testMember = {
            name: `Membro Teste OikoApp ${Math.floor(Math.random() * 1000)}`,
            email: 'suporte@oikoapp.com.br',
            phone: '21999999999'
        };

        const customerId = await findOrCreateContaAzulCustomer(testMember);
        
        // 2. Buscar Conta Financeira (Usa o Host V2 conforme a doc)
        const bankData = await callContaAzulApi('/v1/conta-financeira');
        const bankAccounts = Array.isArray(bankData) ? bankData : (bankData.itens || bankData.items || []);
        
        const bankAccount = bankAccounts.find((b: any) => b.ativo) || bankAccounts[0];

        if (!bankAccount) {
            throw new Error('Nenhuma conta financeira ativa encontrada para o teste.');
        }

        // 3. Criar um Recebível (Host V2)
        const today = new Date().toISOString().split('T')[0];
        const receivableData = {
            data_competencia: today,
            valor: 1.00,
            observacao: "Teste de Permissão de Escrita OikoApp",
            descricao: "Lançamento de Teste IBM",
            contato: customerId,
            conta_financeira: bankAccount.id,
            condicao_pagamento: {
                parcelas: [
                    {
                        descricao: "Parcela Única Teste",
                        data_vencimento: today,
                        nota: "Teste de integração IBM",
                        conta_financeira: bankAccount.id,
                        detalhe_valor: {
                            valor_bruto: 1.00
                        }
                    }
                ]
            }
        };

        const result = await createContaAzulReceivable(receivableData);
        
        return NextResponse.json({ 
            success: true, 
            message: 'Teste de escrita concluído!',
            data: {
                customerId,
                selectedBank: bankAccount.name,
                protocolId: result.protocolId || 'OK',
                status: result.status || 'SUCCESS'
            }
        });

    } catch (error: any) {
        console.error('Erro no teste de escrita:', error);
        return NextResponse.json({ 
            success: false, 
            error: error.message || 'Erro desconhecido ao gravar no Conta Azul.'
        }, { status: 500 });
    }
}
