import { NextRequest, NextResponse } from 'next/server';
import { findOrCreateCustomer } from '@/lib/asaas';
import { requireAuth } from '@/lib/server-auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { context, errorResponse } = await requireAuth(request, ['admin', 'finance']);
    if (errorResponse) return errorResponse;

    const { name, cpfCnpj, email, phone, userId } = await request.json();

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
      tenantId: context.tenantId,
    });

    return NextResponse.json({ customerId: customer.id });
  } catch (error: unknown) {
    console.error('[Asaas] Erro ao criar/buscar cliente:', error);
    return NextResponse.json({ error: 'Erro ao processar cliente Asaas.' }, { status: 500 });
  }
}
