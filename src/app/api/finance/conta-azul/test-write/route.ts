
import { NextResponse } from 'next/server';
import { findOrCreateContaAzulCustomer, createContaAzulCharge, callContaAzulApi, createContaAzulReceivable } from '@/lib/conta-azul';

export const dynamic = 'force-dynamic';

export async function POST() {
    try {
        // 1. Criar ou buscar um cliente de teste (Host: api.contaazul.com)
        const testMember = {
            name: `Membro Teste OikoApp ${Math.floor(Math.random() * 1000)}`,
            email: 'suporte@oikoapp.com.br',
            phone: '21999999999'
        };

        const customerId = await findOrCreateContaAzulCustomer(testMember);
        
        // 2. Buscar contas financeiras para obter um ID válido (Host: api-v2.contaazul.com)
        const bankData = await callContaAzulApi('/v1/conta-financeira');
        const bankAccounts = Array.isArray(bankData) ? bankData : (bankData.items || []);
        const bankAccount = bankAccounts.find((b: any) => b.ativo) || bankAccounts[0];

        if (!bankAccount) {
            throw new Error('Nenhuma conta financeira ativa encontrada para o teste.');
        }

        // 3. Criar um Recebível (v1 no host api-v2) para obter a id_parcela
        // A geração de cobrança v2 exige que a parcela já exista no sistema
        const today = new Date().toISOString().split('T')[0];
        const receivableData = {
            data_competencia: today,
            valor: 1.00,
            descricao: "Teste de Permissão OikoApp",
            observacao: "Gerado automaticamente pelo laboratório de integração",
            contato: customerId,
            conta_financeira: bankAccount.id,
            condicao_pagamento: {
                parcelas: [
                    {
                        descricao: "Parcela Única Teste",
                        data_vencimento: today,
                        nota: "Teste de integração",
                        conta_financeira: bankAccount.id,
                        detalhe_valor: {
                            valor_bruto: 1.00
                        }
                    }
                ]
            }
        };

        const receivableResult = await createContaAzulReceivable(receivableData);
        const protocolId = receivableResult.protocolId;

        // 4. Reportar sucesso do protocolo
        // Como o processamento do protocolo é assíncrono na Conta Azul, 
        // validamos aqui que a escrita do receivable (v1) funcionou.
        
        return NextResponse.json({ 
            success: true, 
            message: 'Teste de escrita concluído com sucesso!',
            data: {
                customerId,
                selectedBank: bankAccount.name,
                receivableProtocol: protocolId,
                note: "O recebível foi protocolado com sucesso. Para gerar a cobrança (v2), o id_parcela estará disponível após o processamento do protocolo."
            }
        });

    } catch (error: any) {
        console.error('Erro no teste de escrita Conta Azul:', error);
        return NextResponse.json({ 
            success: false, 
            error: error.message || 'Erro desconhecido'
        }, { status: 500 });
    }
}
