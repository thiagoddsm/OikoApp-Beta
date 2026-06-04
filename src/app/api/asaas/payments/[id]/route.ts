import { NextResponse } from 'next/server';
import { getPayment } from '@/lib/asaas';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'ID do pagamento é obrigatório.' }, { status: 400 });
    }

    const payment = await getPayment(id);
    return NextResponse.json(payment);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[Asaas] Erro ao buscar pagamento:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
