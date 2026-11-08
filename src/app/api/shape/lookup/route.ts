import { NextRequest, NextResponse } from 'next/server';
import { lookupMemberByEmail, getMinistryProfiles } from '@/app/public/molde-de-servo/actions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = body?.email || '';
    const result = await lookupMemberByEmail(email);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[API /api/shape/lookup] Error:', err);
    return NextResponse.json(
      {
        found: false,
        error: err?.message || 'Erro ao consultar cadastro.',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const profiles = await getMinistryProfiles();
    return NextResponse.json({ success: true, profiles });
  } catch (err: any) {
    return NextResponse.json({ success: false, profiles: [] }, { status: 500 });
  }
}
