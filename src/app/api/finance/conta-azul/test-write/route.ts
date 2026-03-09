import { NextResponse } from 'next/server';
export async function POST() {
  return NextResponse.json({ message: "Integração Conta Azul removida." }, { status: 410 });
}
