import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/server-auth';
import { QueryBuilderEngine } from '@/lib/membership/QueryBuilderEngine';
import { MembershipBoardConfig } from '@/types/membership-board-types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult.errorResponse) return authResult.errorResponse;
    const context = authResult.context!;

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const db = getAdminDb();
    const docSnap = await db.collection('custom_membership_boards').doc(id).get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Quadro não encontrado.' }, { status: 404 });
    }

    const boardConfig = { id: docSnap.id, ...docSnap.data() } as MembershipBoardConfig;
    const result = await QueryBuilderEngine.executeQuery(boardConfig, context.tenantId, { limit, offset });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API Membership Boards People]', error);
    return NextResponse.json({ error: error.message || 'Erro ao carregar lista de membros.' }, { status: 500 });
  }
}
