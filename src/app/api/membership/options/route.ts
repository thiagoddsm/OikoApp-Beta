import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/server-auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult.errorResponse) return authResult.errorResponse;
    const context = authResult.context!;

    const db = getAdminDb();

    // 1. Buscar Cursos
    const coursesSnap = await db.collection('courses').get().catch(() => ({ docs: [] } as any));
    const courses = coursesSnap.docs.map((d: any) => ({
      id: d.id,
      name: d.data()?.name || d.id,
    }));

    // 2. Buscar Eventos
    const eventsSnap = await db.collection('events').get().catch(() => ({ docs: [] } as any));
    const events = eventsSnap.docs.map((d: any) => ({
      id: d.id,
      name: d.data()?.title || d.data()?.name || d.id,
    }));

    // 3. Buscar Células (GCs)
    const cellsSnap = await db.collection('cells').get().catch(() => ({ docs: [] } as any));
    const cells = cellsSnap.docs.map((d: any) => ({
      id: d.id,
      name: d.data()?.nome || d.data()?.name || d.id,
    }));

    // 4. Buscar Áreas
    const areasSnap = await db.collection('areas').get().catch(() => ({ docs: [] } as any));
    const areas = areasSnap.docs.map((d: any) => ({
      id: d.id,
      name: d.data()?.nome || d.data()?.name || d.id,
    }));

    // 5. Buscar Redes
    const redesSnap = await db.collection('redes').get().catch(() => ({ docs: [] } as any));
    const redes = redesSnap.docs.map((d: any) => ({
      id: d.id,
      name: d.data()?.nome || d.data()?.name || d.id,
    }));

    // 6. Buscar Ministérios
    const ministriesSnap = await db.collection('volunteers').get().catch(() => ({ docs: [] } as any));
    const ministryMap = new Map<string, string>();
    ministriesSnap.docs.forEach((d: any) => {
      const data = d.data();
      const mId = data.ministryId || data.departmentId || d.id;
      const mName = data.ministryName || data.departmentName || mId;
      if (mId) ministryMap.set(mId, mName);
    });

    const ministries = Array.from(ministryMap.entries()).map(([id, name]) => ({ id, name }));

    return NextResponse.json({
      courses,
      events,
      cells,
      areas,
      redes,
      ministries,
    });
  } catch (error: any) {
    console.error('[API Membership Options]', error);
    return NextResponse.json({ error: error.message || 'Erro ao carregar opções.' }, { status: 500 });
  }
}
