import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const db = getAdminDb();
    
    // Se tem userId, busca dados reais do usuário
    let finalName = body.nome;
    let finalPhone = body.telefone;
    if (body.userId) {
      const userDoc = await db.collection('users').doc(body.userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data()!;
        finalName = userData.name || finalName;
        finalPhone = userData.phone || finalPhone;
      }
    }
    
    const docRef = await db.collection('shape_results').add({
      userId: body.userId || null,
      nome: finalName || body.nome,
      email: body.email?.toLowerCase().trim() || '',
      telefone: finalPhone || body.telefone || '',
      dataNascimento: body.dataNascimento || '',
      estadoCivil: body.estadoCivil || '',
      gcInfo: body.gcInfo || '',
      profissao: body.profissao || '',
      habilidades: body.habilidades || [],
      coracao: body.coracao || {},
      perso: body.perso || {},
      dom: body.dom || {},
      quadrante: body.quadrante || '',
      orgScore: body.orgScore || 0,
      motScore: body.motScore || 0,
      domScores: body.domScores || {},
      top3: body.top3 || [],
      createdAt: Timestamp.now(),
      aiAnalysis: null,
    });
    
    return NextResponse.json({ success: true, id: docRef.id });
  } catch(e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || 'Erro ao salvar' }, { status: 500 });
  }
}
