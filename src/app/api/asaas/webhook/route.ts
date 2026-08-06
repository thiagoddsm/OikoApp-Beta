import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

// Mapa de eventos Asaas → status interno
const EVENT_STATUS_MAP: Record<string, string> = {
  PAYMENT_RECEIVED: 'RECEIVED',
  PAYMENT_CONFIRMED: 'CONFIRMED',
  PAYMENT_OVERDUE: 'OVERDUE',
  PAYMENT_REFUNDED: 'REFUNDED',
  PAYMENT_DELETED: 'DELETED',
  PAYMENT_RESTORED: 'RESTORED',
  PAYMENT_ANTICIPATED: 'ANTICIPATED',
  PAYMENT_AWAITING_RISK_ANALYSIS: 'AWAITING_RISK_ANALYSIS',
  PAYMENT_APPROVED_BY_RISK_ANALYSIS: 'APPROVED_BY_RISK_ANALYSIS',
  PAYMENT_REPROVED_BY_RISK_ANALYSIS: 'REPROVED_BY_RISK_ANALYSIS',
  PAYMENT_CHARGEBACK_REQUESTED: 'CHARGEBACK_REQUESTED',
  PAYMENT_CHARGEBACK_DISPUTE: 'CHARGEBACK_DISPUTE',
  PAYMENT_AWAITING_CHARGEBACK_REVERSAL: 'AWAITING_CHARGEBACK_REVERSAL',
  PAYMENT_DUNNING_RECEIVED: 'DUNNING_RECEIVED',
  PAYMENT_DUNNING_REQUESTED: 'DUNNING_REQUESTED',
  PAYMENT_UPDATED: 'UPDATED',
  PAYMENT_PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
  SUBSCRIPTION_CREATED: 'CREATED',
  SUBSCRIPTION_UPDATED: 'UPDATED',
  SUBSCRIPTION_INACTIVATED: 'INACTIVATED',
  SUBSCRIPTION_DELETED: 'DELETED',
  RECEIVABLE_ANTICIPATION_CREDITED: 'ANTICIPATION_CREDITED',
  RECEIVABLE_ANTICIPATION_DENIED: 'ANTICIPATION_DENIED',
};

export async function GET() {
  return NextResponse.json(
    { status: 'active', message: 'Asaas Webhook Endpoint Ready' },
    { status: 200 }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Allow': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, asaas-access-token',
    },
  });
}

export { POST as PUT };

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');

  const webhookToken = request.headers.get('asaas-access-token');
  
  let expectedToken = process.env.ASAAS_WEBHOOK_SECRET || '';
  try {
    const db = getAdminDb();
    
    if (tenantId) {
      const tenantSnap = await db.collection('tenants').doc(tenantId).get();
      if (tenantSnap.exists && tenantSnap.data()?.asaasWebhookToken) {
        expectedToken = tenantSnap.data()!.asaasWebhookToken;
      }
    }
  } catch (error) {
    console.error('[Asaas Webhook] Erro ao buscar token de validação do Firestore:', error);
  }

  // Se houver token esperado e o token recebido for enviado mas diferente, bloqueia.
  // Se expectedToken estiver configurado e o webhookToken for fornecido, valida.
  if (expectedToken && webhookToken && webhookToken !== expectedToken) {
    console.warn('[Asaas Webhook] Token de validação divergente recebido.');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Retornar 200 imediatamente é crucial para o Asaas não desativar o webhook nem aplicar penalizações 405/500
  const responsePromise = processWebhookEvent(request, tenantId || undefined);

  // Fire-and-forget: não bloquear o retorno
  responsePromise.catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('[Asaas Webhook] Erro no processamento assíncrono:', msg);
  });

  return NextResponse.json({ received: true }, { status: 200 });
}

async function processWebhookEvent(request: Request, tenantId?: string): Promise<void> {
  let body: { 
    event?: string; 
    id?: string;
    payment?: Record<string, any>; 
    subscription?: Record<string, any>;
    anticipation?: Record<string, any>;
  };

  try {
    body = await request.json();
  } catch (parseError: unknown) {
    const msg = parseError instanceof Error ? parseError.message : 'Erro desconhecido';
    console.error('[Asaas Webhook] Falha ao parsear body JSON:', msg);
    return;
  }

  const { event, payment, subscription, anticipation, id: eventId } = body;

  if (!event) {
    console.warn('[Asaas Webhook] Payload inválido — event ausente:', body);
    return;
  }

  const internalStatus = EVENT_STATUS_MAP[event] ?? event;
  const db = getAdminDb();
  const now = Timestamp.now();

  // Verificação de Idempotência
  if (eventId) {
    const processedRef = db.collection('processed_webhooks').doc(eventId);
    const processedSnap = await processedRef.get();
    if (processedSnap.exists) {
      console.log(`[Asaas Webhook] Evento ${eventId} já processado anteriormente. Ignorando duplicidade.`);
      return;
    }
    await processedRef.set({ processedAt: now, event, tenantId: tenantId ?? null });
  }

  try {
    // 1. Processar Eventos de Cobrança (Payment)
    if (payment && payment.id) {
      const paymentRef = db.collection('asaasPayments').doc(payment.id);
      await paymentRef.set(
        {
          status: internalStatus,
          asaasStatus: payment.status ?? null,
          asaasEvent: event,
          tenantId: tenantId ?? null,
          updatedAt: now,
          ...(payment.value !== undefined && { value: payment.value }),
          ...(payment.dueDate !== undefined && { dueDate: payment.dueDate }),
          ...(payment.billingType !== undefined && { billingType: payment.billingType }),
          ...(payment.customer !== undefined && { customer: payment.customer }),
          ...(payment.externalReference !== undefined && {
            externalReference: payment.externalReference,
          }),
          ...(payment.invoiceUrl !== undefined && { invoiceUrl: payment.invoiceUrl }),
          ...(payment.bankSlipUrl !== undefined && { bankSlipUrl: payment.bankSlipUrl }),
          ...(payment.description !== undefined && { description: payment.description }),
        },
        { merge: true }
      );
      console.log(`[Asaas Webhook] Cobrança ${payment.id} atualizada: ${event} → ${internalStatus}`);

      // Sincronizar status com a inscrição do evento correspondente
      const isPaidEvent = event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED';
      
      // 1.1 Sincronizar com mensalidades de Cursos (tuition_fees) — Baixa Automática!
      try {
        const feesRef = db.collection('tuition_fees');
        let feesQuerySnap = await feesRef.where('asaasPaymentId', '==', payment.id).get();

        if (feesQuerySnap.empty && payment.externalReference) {
          feesQuerySnap = await feesRef.where('enrollmentId', '==', payment.externalReference).get();
        }

        if (feesQuerySnap.empty && payment.externalReference) {
          const docSnap = await feesRef.doc(payment.externalReference).get();
          if (docSnap.exists) {
            const updateFee: any = {
              asaasStatus: payment.status || 'RECEIVED',
              updatedAt: now,
            };
            if (isPaidEvent) {
              updateFee.status = 'pago';
              updateFee.paidAt = now;
            }
            await feesRef.doc(payment.externalReference).update(updateFee);
            console.log(`[Asaas Webhook] Baixa automática efetuada na mensalidade ${payment.externalReference}`);
          }
        }

        if (!feesQuerySnap.empty) {
          const feeBatch = db.batch();
          feesQuerySnap.docs.forEach(docSnap => {
            const fRef = feesRef.doc(docSnap.id);
            const updateFee: any = {
              asaasStatus: payment.status || 'RECEIVED',
              updatedAt: now,
            };
            if (isPaidEvent) {
              updateFee.status = 'pago';
              updateFee.paidAt = now;
            }
            feeBatch.update(fRef, updateFee);
          });
          await feeBatch.commit();
          console.log(`[Asaas Webhook] Baixa automática efetuada em ${feesQuerySnap.size} mensalidade(s) para o pagamento ${payment.id}`);
        }
      } catch (feeError: unknown) {
        const msg = feeError instanceof Error ? feeError.message : 'Erro desconhecido';
        console.error('[Asaas Webhook] Erro ao sincronizar baixa na mensalidade (tuition_fees):', msg);
      }

      // 1.2 Sincronizar com inscrições de eventos (event_registrations)
      try {
        const registrationsRef = db.collection('event_registrations');
        let querySnapshot = await registrationsRef.where('payment.asaasPaymentId', '==', payment.id).get();
        
        if (querySnapshot.empty) {
          querySnapshot = await registrationsRef.where('payment.transactionId', '==', payment.id).get();
        }
        
        if (querySnapshot.empty && payment.subscription) {
          querySnapshot = await registrationsRef.where('payment.asaasPaymentId', '==', payment.subscription).get();
        }

        if (querySnapshot.empty && payment.externalReference) {
          const docSnap = await registrationsRef.doc(payment.externalReference).get();
          if (docSnap.exists) {
            const regRef = registrationsRef.doc(payment.externalReference);
            const updateData: any = {
              'payment.asaasStatus': payment.status || 'RECEIVED',
              'payment.updatedAt': now,
            };
            if (isPaidEvent) {
              updateData['payment.status'] = 'approved';
              updateData['payment.paidAt'] = now;
            }
            await regRef.update(updateData);
            console.log(`[Asaas Webhook] Inscrição ${payment.externalReference} atualizada via externalReference`);
          }
        }

        if (!querySnapshot.empty) {
          const batch = db.batch();
          querySnapshot.docs.forEach(doc => {
            const regRef = registrationsRef.doc(doc.id);
            const updateData: any = {
              'payment.asaasStatus': payment.status || 'RECEIVED',
              'payment.updatedAt': now,
            };
            if (isPaidEvent) {
              updateData['payment.status'] = 'approved';
              updateData['payment.paidAt'] = now;
            }
            batch.update(regRef, updateData);
          });
          await batch.commit();
          console.log(`[Asaas Webhook] Sincronizadas ${querySnapshot.size} inscrições de evento para o pagamento ${payment.id}`);
        }
      } catch (regError: unknown) {
        const msg = regError instanceof Error ? regError.message : 'Erro desconhecido';
        console.error('[Asaas Webhook] Erro ao sincronizar inscrição de evento:', msg);
      }
    }

    // 2. Processar Eventos de Assinatura (Subscription)
    if (subscription && subscription.id) {
      const subscriptionRef = db.collection('asaasSubscriptions').doc(subscription.id);
      await subscriptionRef.set(
        {
          status: internalStatus,
          asaasStatus: subscription.status ?? null,
          asaasEvent: event,
          tenantId: tenantId ?? null,
          updatedAt: now,
          ...(subscription.value !== undefined && { value: subscription.value }),
          ...(subscription.billingType !== undefined && { billingType: subscription.billingType }),
          ...(subscription.cycle !== undefined && { cycle: subscription.cycle }),
          ...(subscription.customer !== undefined && { customer: subscription.customer }),
          ...(subscription.externalReference !== undefined && {
            externalReference: subscription.externalReference,
          }),
          ...(subscription.description !== undefined && { description: subscription.description }),
        },
        { merge: true }
      );
      console.log(`[Asaas Webhook] Assinatura ${subscription.id} atualizada: ${event} → ${internalStatus}`);
    }

    // 3. Processar Eventos de Antecipação (Anticipation)
    if (anticipation && anticipation.id) {
      const anticipationRef = db.collection('asaasAnticipations').doc(anticipation.id);
      await anticipationRef.set(
        {
          status: internalStatus,
          asaasStatus: anticipation.status ?? null,
          asaasEvent: event,
          tenantId: tenantId ?? null,
          updatedAt: now,
          ...(anticipation.value !== undefined && { value: anticipation.value }),
          ...(anticipation.fee !== undefined && { fee: anticipation.fee }),
          ...(anticipation.netValue !== undefined && { netValue: anticipation.netValue }),
          ...(anticipation.requestDate !== undefined && { requestDate: anticipation.requestDate }),
        },
        { merge: true }
      );
      console.log(`[Asaas Webhook] Antecipação ${anticipation.id} atualizada: ${event} → ${internalStatus}`);
    }
  } catch (dbError: unknown) {
    const msg = dbError instanceof Error ? dbError.message : 'Erro desconhecido';
    console.error(`[Asaas Webhook] Erro ao atualizar no Firestore para evento ${event}:`, msg);
  }
}
