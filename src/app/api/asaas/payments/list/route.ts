import { NextResponse } from 'next/server';
import { listPayments } from '@/lib/asaas';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const externalReference = searchParams.get('externalReference');

    if (!externalReference) {
      return NextResponse.json(
        { error: 'O parâmetro externalReference é obrigatório.' },
        { status: 400 }
      );
    }

    const result = await listPayments(externalReference);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[Asaas] Erro ao listar pagamentos:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
