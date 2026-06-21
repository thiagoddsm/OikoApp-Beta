import { NextResponse } from 'next/server';
import { createSubscription } from '@/lib/asaas';
import { getAdminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { customerId, billingType, value, dueDate, description, externalReference, cycle, tenantId } = await request.json();

    if (!customerId || !value || !dueDate) {
      return NextResponse.json(
        { error: 'Os campos customerId, value e dueDate são obrigatórios.' },
        { status: 400 }
      );
    }

    const subscription = await createSubscription({
      customerId,
      billingType: billingType || 'UNDEFINED',
      value,
      dueDate,
      description,
      externalReference,
      cycle: cycle || 'MONTHLY',
      tenantId
    });

    // Registrar assinatura no Firestore
    const db = getAdminDb();
    if (subscription.id) {
      await db.collection('asaasSubscriptions').doc(subscription.id).set({
        id: subscription.id,
        customerId: subscription.customer,
        billingType: subscription.billingType,
        value: subscription.value,
        status: subscription.status || 'ACTIVE',
        description: subscription.description || '',
        externalReference: subscription.externalReference || '',
        tenantId: tenantId || null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
    }

    return NextResponse.json(subscription);
  } catch (error: any) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[Asaas] Erro ao criar assinatura:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
