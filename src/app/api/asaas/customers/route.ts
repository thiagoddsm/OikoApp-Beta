import { NextRequest, NextResponse } from 'next/server';
import { findOrCreateCustomer } from '@/lib/asaas';
import { optionalAuth } from '@/lib/server-auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { context, tenantId: resolvedTenantId } = await optionalAuth(request);

    const body = await request.json();
    let { name, cpfCnpj, email, phone, userId, notificationMethod } = body;
    const tenantId = body.tenantId || context?.tenantId || resolvedTenantId;

    // Se userId foi fornecido e falta CPF, telefone ou nome, resgata com segurança via Admin SDK
    if (userId && (!cpfCnpj || !phone || !name)) {
      try {
        const { getAdminDb } = await import('@/lib/firebase-admin');
        const db = getAdminDb();
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
          const uData = userDoc.data()!;
          name = name || uData.name;
          phone = phone || uData.phone;
          cpfCnpj = cpfCnpj || uData.cpfCnpj || uData.cpf || uData.cnpj;
        }
      } catch (e) {
        console.warn('[Asaas Customer] Aviso ao buscar dados complementares do user:', e);
      }
    }

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
      notificationDisabled: notificationMethod === 'NONE',
    });

    if (notificationMethod && notificationMethod !== 'NONE') {
      const { configureCustomerNotifications } = await import('@/lib/asaas');
      await configureCustomerNotifications(customer.id, {
        whatsapp: notificationMethod === 'WHATSAPP',
        email: notificationMethod === 'EMAIL',
      }, tenantId).catch(err => console.error('[Asaas] Falha ao configurar notificações:', err));
    }

    return NextResponse.json({ customerId: customer.id });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao processar cliente Asaas.';
    console.error('[Asaas] Erro ao criar/buscar cliente:', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
