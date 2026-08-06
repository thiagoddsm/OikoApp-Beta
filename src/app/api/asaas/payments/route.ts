import { NextRequest, NextResponse } from 'next/server';
import { createPayment, getPixQrCode } from '@/lib/asaas';
import { getAdminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { requireAuth } from '@/lib/server-auth';
import { IdempotencyService } from '@/lib/services/idempotency';
import { ServerAuditService } from '@/lib/services/audit-service';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult.errorResponse) return authResult.errorResponse;
    const context = authResult.context!;

    const idempotencyKey = request.headers.get('idempotency-key') || '';
    if (idempotencyKey) {
      const lockResult = await IdempotencyService.checkAndLock(context.tenantId, idempotencyKey, 'CREATE_ASAAS_PAYMENT');
      if (lockResult.isDuplicate) {
        return NextResponse.json(lockResult.previousResult || { message: 'Pagamento já processado previamente.' });
      }
    }
    const body = await request.json();
    const {
      customerId,
      billingType,
      value,
      dueDate,
      description,
      externalReference,
      installmentCount,
      installmentValue,
    } = body;

    // Bug fix: usar tenantId do contexto JWT autenticado como fonte primária.
    // O body pode omitir o tenantId (wizard e approveEnrollmentRequest não o enviavam),
    // fazendo getAsaasCredentials(undefined) pular a API key do tenant da igreja.
    const tenantId = body.tenantId || context.tenantId;

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
      tenantId,
    });

    let pixQrCode = null;
    if (billingType === 'PIX') {
      try {
        pixQrCode = await getPixQrCode(payment.id, tenantId);
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
        tenantId: tenantId ?? null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    } catch (dbError: unknown) {
      const msg = dbError instanceof Error ? dbError.message : 'Erro ao salvar no Firestore';
      console.error('[Asaas] Erro ao salvar pagamento no Firestore:', msg);
      // Não bloquear o retorno — o pagamento foi criado na Asaas com sucesso
    }

    const responseData = { ...payment, pixQrCode };

    if (idempotencyKey) {
      await IdempotencyService.saveResult(context.tenantId, idempotencyKey, responseData);
    }

    await ServerAuditService.record({
      tenantId: context.tenantId,
      userId: context.userId,
      action: 'CREATE_ASAAS_PAYMENT',
      resourceType: 'asaasPayment',
      resourceId: payment.id,
      requestId: context.requestId,
      metadata: { billingType, value, customerId }
    });

    return NextResponse.json(responseData);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao criar pagamento';
    console.error('[Asaas] Erro ao criar pagamento:', message);
    return NextResponse.json({ error: 'Erro ao processar pagamento.' }, { status: 500 });
  }
}
