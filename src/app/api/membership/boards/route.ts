import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/server-auth';
import { MembershipBoardConfig } from '@/types/membership-board-types';
import { QueryBuilderEngine } from '@/lib/membership/QueryBuilderEngine';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult.errorResponse) return authResult.errorResponse;
    const context = authResult.context!;

    const db = getAdminDb();
    let q: any = db.collection('custom_membership_boards');
    
    if (context.tenantId) {
      q = q.where('tenantId', '==', context.tenantId) as any;
    }

    const snap = await q.get();
    const boards: MembershipBoardConfig[] = snap.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    } as MembershipBoardConfig));

    boards.sort((a, b) => (a.order || 0) - (b.order || 0));

    return NextResponse.json({ boards });
  } catch (error: any) {
    console.error('[API Membership Boards GET]', error);
    return NextResponse.json({ error: error.message || 'Erro ao carregar quadros dinâmicos.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult.errorResponse) return authResult.errorResponse;
    const context = authResult.context!;

    const body = await request.json();
    const { title, description, backgroundColor, footerColor, textColor, footerTextColor, icon, isVisibleInDashboard, isVisibleInApp, rules } = body;

    if (!title) {
      return NextResponse.json({ error: 'O título do quadro é obrigatório.' }, { status: 400 });
    }

    const db = getAdminDb();
    const newBoardData: Omit<MembershipBoardConfig, 'id'> = {
      tenantId: context.tenantId || 'w3m93SHQeBRhiDnt7208',
      title,
      description: description || '',
      backgroundColor: backgroundColor || '#1e293b',
      footerColor: footerColor || '#0f172a',
      textColor: textColor || '#ffffff',
      footerTextColor: footerTextColor || '#94a3b8',
      icon: icon || 'Users',
      order: Date.now(),
      isVisibleInDashboard: isVisibleInDashboard ?? true,
      isVisibleInApp: isVisibleInApp ?? true,
      rules: rules || [],
      cachedTotalCount: 0,
      lastCalculatedAt: new Date().toISOString(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await db.collection('custom_membership_boards').add(newBoardData);

    // Calcular contagem inicial
    try {
      const fullBoard = { id: docRef.id, ...newBoardData };
      const { totalCount } = await QueryBuilderEngine.executeQuery(fullBoard, context.tenantId);
      await docRef.update({
        cachedTotalCount: totalCount,
        lastCalculatedAt: new Date().toISOString(),
      });
      fullBoard.cachedTotalCount = totalCount;
      return NextResponse.json({ board: fullBoard });
    } catch (e) {
      return NextResponse.json({ board: { id: docRef.id, ...newBoardData } });
    }
  } catch (error: any) {
    console.error('[API Membership Boards POST]', error);
    return NextResponse.json({ error: error.message || 'Erro ao criar quadro dinâmico.' }, { status: 500 });
  }
}
