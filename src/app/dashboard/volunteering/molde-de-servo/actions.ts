'use server';
import { getAdminDb } from '@/lib/firebase-admin';
import { ShapeResult } from '@/types/shape';

function sanitize(data: any): any {
  if (data === null || data === undefined) return data;
  if (typeof data?.toDate === 'function') return data.toDate().toISOString();
  if (typeof data?._seconds === 'number') return new Date(data._seconds * 1000).toISOString();
  if (data instanceof Date) return data.toISOString();
  if (Array.isArray(data)) return data.map(sanitize);
  if (typeof data === 'object') {
    const r: Record<string, any> = {};
    for (const [k, v] of Object.entries(data)) r[k] = sanitize(v);
    return r;
  }
  return data;
}

export async function getShapeResults(): Promise<ShapeResult[]> {
  try {
    const db = getAdminDb();
    const snap = await db.collection('shape_results').orderBy('createdAt', 'desc').get();
    return snap.docs.map(doc => ({ id: doc.id, ...sanitize(doc.data()) })) as ShapeResult[];
  } catch (e) {
    console.error('getShapeResults error:', e);
    return [];
  }
}
