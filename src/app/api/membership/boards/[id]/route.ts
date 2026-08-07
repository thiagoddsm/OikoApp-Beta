import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/server-auth';
import { QueryBuilderEngine } from '@/lib/membership/QueryBuilderEngine';
import { MembershipBoardConfig } from '@/types/membership-board-types';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult.errorResponse) return authResult.errorResponse;
    const context = authResult.context!;

    const { id } = await params;
    const body = await request.json();

    const db = getAdminDb();
    const docRef = db.collection('custom_membership_boards').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Quadro não encontrado.' }, { status: 404 });
    }

    const updateData: Partial<MembershipBoardConfig> = {
      ...body,
      updatedAt: new Date(),
    };
    delete (updateData as any).id;

    await docRef.update(updateData as any);

    // Recalcular contagem com as novas regras
    const updatedSnap = await docRef.get();
    const fullBoard = { id: updatedSnap.id, ...updatedSnap.data() } as MembershipBoardConfig;
    
    try {
      const { totalCount } = await QueryBuilderEngine.executeQuery(fullBoard, context.tenantId);
      await docRef.update({
        cachedTotalCount: totalCount,
        lastCalculatedAt: new Date().toISOString(),
      });
      fullBoard.cachedTotalCount = totalCount;
    } catch (e) {}

    return NextResponse.json({ board: fullBoard });
  } catch (error: any) {
    console.error('[API Membership Boards PUT]', error);
    return NextResponse.json({ error: error.message || 'Erro ao atualizar quadro.' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult.errorResponse) return authResult.errorResponse;

    const { id } = await params;
    const db = getAdminDb();
    await db.collection('custom_membership_boards').doc(id).delete();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Membership Boards DELETE]', error);
    return NextResponse.json({ error: error.message || 'Erro ao excluir quadro.' }, { status: 500 });
  }
}
