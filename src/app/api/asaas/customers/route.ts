import { NextResponse } from 'next/server';
import { findOrCreateCustomer } from '@/lib/asaas';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { name, cpfCnpj, email, phone, userId, tenantId } = await request.json();

    console.log('[API Debug] Recebido no POST /api/asaas/customers:', { name, cpfCnpj, userId });
    console.log('[API Debug] process.env.ASAAS_API_KEY (Mascarada):', process.env.ASAAS_API_KEY ? `${process.env.ASAAS_API_KEY.substring(0, 15)}...` : 'NÃO CONFIGURADA EM PROCESS.ENV');

    if (!name) {
      return NextResponse.json(
        { error: 'O campo name é obrigatório.' },
        { status: 400 }
      );
    }

    const customer = await findOrCreateCustomer({
      name,
      cpfCnpj,
      email,
      phone,
      externalReference: userId,
      tenantId,
    });

    return NextResponse.json({ customerId: customer.id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[Asaas] Erro ao criar/buscar cliente:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
