import { NextResponse } from 'next/server';
import { getPixQrCode } from '@/lib/asaas';

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

    const qrCode = await getPixQrCode(id);

    return NextResponse.json({
      encodedImage: qrCode.encodedImage,
      payload: qrCode.payload,
      expirationDate: qrCode.expirationDate,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[Asaas] Erro ao buscar QR Code PIX:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
