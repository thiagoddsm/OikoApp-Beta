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
    let reqToAuth = request;
    const authHeader = request.headers.get('authorization');
    const tokenParam = request.nextUrl.searchParams.get('token');

    if ((!authHeader || !authHeader.startsWith('Bearer ')) && tokenParam) {
      const reqHeaders = new Headers(request.headers);
      reqHeaders.set('authorization', `Bearer ${tokenParam}`);
      reqToAuth = new NextRequest(request.url, { headers: reqHeaders });
    }

    const authResult = await requireAuth(reqToAuth);
    if (authResult.errorResponse) return authResult.errorResponse;
    const context = authResult.context!;

    const { id } = await params;
    const db = getAdminDb();
    const docSnap = await db.collection('custom_membership_boards').doc(id).get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Quadro não encontrado.' }, { status: 404 });
    }

    const boardConfig = { id: docSnap.id, ...docSnap.data() } as MembershipBoardConfig;
    const { people } = await QueryBuilderEngine.executeQuery(boardConfig, context.tenantId);

    // Gerar CSV em UTF-8 com BOM para abrir perfeitamente no Excel no Brasil
    const header = 'Nome,Email,Telefone,Status,Genero,Idade,GC\n';
    const rows = people.map(p => {
      const escape = (str?: string | number) => `"${String(str || '').replace(/"/g, '""')}"`;
      return [
        escape(p.name),
        escape(p.email),
        escape(p.phone),
        escape(p.membershipStatus),
        escape(p.gender),
        escape(p.age),
        escape(p.cellName)
      ].join(',');
    }).join('\n');

    const csvContent = '\uFEFF' + header + rows;
    const filename = `quadro-${boardConfig.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('[API Membership Boards Export]', error);
    return NextResponse.json({ error: error.message || 'Erro ao exportar planilha.' }, { status: 500 });
  }
}
