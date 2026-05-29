import { NextResponse } from 'next/server';
import { createPayment, getPixQrCode } from '@/lib/asaas';
import { getAdminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const {
      customerId,
      billingType,
      value,
      dueDate,
      description,
      externalReference,
      installmentCount,
      installmentValue,
    } = await request.json();

    if (!customerId || !billingType || !value || !dueDate) {
      return NextResponse.json(
        { error: 'Os campos customerId, billingType, value e dueDate são obrigatórios.' },
        { status: 400 }
      );
    }

    const payment = await createPayment({
      customerId,
      billingType,
      value,
      dueDate,
      description,
      externalReference,
      installmentCount,
      installmentValue,
    });

    let pixQrCode = null;
    if (billingType === 'PIX') {
      try {
        pixQrCode = await getPixQrCode(payment.id);
      } catch (pixError: unknown) {
        const msg = pixError instanceof Error ? pixError.message : 'Erro ao buscar QR Code PIX';
        console.warn('[Asaas] Aviso: falha ao buscar QR Code PIX:', msg);
      }
    }

    // Salvar pagamento no Firestore
    try {
      const db = getAdminDb();
      await db.collection('asaasPayments').doc(payment.id).set({
        ...payment,
        pixQrCode: pixQrCode ?? null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    } catch (dbError: unknown) {
      const msg = dbError instanceof Error ? dbError.message : 'Erro ao salvar no Firestore';
      console.error('[Asaas] Erro ao salvar pagamento no Firestore:', msg);
      // Não bloquear o retorno — o pagamento foi criado na Asaas com sucesso
    }

    return NextResponse.json({ ...payment, pixQrCode });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[Asaas] Erro ao criar pagamento:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
