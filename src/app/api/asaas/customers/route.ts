import { NextRequest, NextResponse } from 'next/server';
import { findOrCreateCustomer } from '@/lib/asaas';
import { optionalAuth } from '@/lib/server-auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { context, tenantId: resolvedTenantId } = await optionalAuth(request);

    const body = await request.json();
    const { name, cpfCnpj, email, phone, userId } = body;
    const tenantId = body.tenantId || context?.tenantId || resolvedTenantId;

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
      externalReference: userId || context.userId,
      tenantId,
    });

    return NextResponse.json({ customerId: customer.id });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao processar cliente Asaas.';
    console.error('[Asaas] Erro ao criar/buscar cliente:', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
