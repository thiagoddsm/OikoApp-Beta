import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/server-auth';
import { QueryBuilderEngine } from '@/lib/membership/QueryBuilderEngine';
import { MembershipBoardConfig } from '@/types/membership-board-types';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult.errorResponse) return authResult.errorResponse;
    const context = authResult.context!;

    const body = await request.json().catch(() => ({}));
    const boardId = body.boardId;

    const db = getAdminDb();
    let boardsToProcess: MembershipBoardConfig[] = [];

    if (boardId) {
      const snap = await db.collection('custom_membership_boards').doc(boardId).get();
      if (snap.exists) {
        boardsToProcess.push({ id: snap.id, ...snap.data() } as MembershipBoardConfig);
      }
    } else {
      let q: any = db.collection('custom_membership_boards');
      if (context.tenantId) {
        q = q.where('tenantId', '==', context.tenantId) as any;
      }
      const snap = await q.get();
      boardsToProcess = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as MembershipBoardConfig));
    }

    const results: Record<string, number> = {};

    for (const board of boardsToProcess) {
      const { totalCount } = await QueryBuilderEngine.executeQuery(board, context.tenantId);
      results[board.id] = totalCount;
      
      // Atualizar cache no Firestore
      await db.collection('custom_membership_boards').doc(board.id).update({
        cachedTotalCount: totalCount,
        lastCalculatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error('[API Membership Boards Execute]', error);
    return NextResponse.json({ error: error.message || 'Erro ao recalcular contagens.' }, { status: 500 });
  }
}
