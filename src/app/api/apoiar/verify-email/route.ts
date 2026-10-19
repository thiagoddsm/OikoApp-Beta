import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ found: false, error: 'E-mail não fornecido' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const db = getAdminDb();
    const snap = await db.collection('users').where('email', '==', cleanEmail).limit(1).get();

    if (snap.empty) {
      return NextResponse.json({ found: false });
    }

    const userDoc = snap.docs[0];
    const userData = userDoc.data();
    const userId = userDoc.id;

    // Máscara de Privacidade Padrão Oiko (Ex: "Lucas Ferreira" -> "L**** F******")
    const maskName = (name: string) => {
      if (!name) return '';
      return name
        .split(' ')
        .map((part) => {
          if (part.length <= 1) return part;
          return part[0] + '*'.repeat(part.length - 1);
        })
        .join(' ');
    };

    const maskPhone = (phone: any) => {
      if (!phone) return '';
      const digits = String(phone).replace(/\D/g, '');
      if (digits.length < 4) return '****';
      return `(${digits.substring(0, 2)}) *****-${digits.slice(-2)}`;
    };

    // Tenta identificar a rede a partir do usuário ou GC
    let rede = userData.rede || userData.hierarchy?.rede || '';
    let gcName = userData.cellName || userData.gcName || '';

    // Se tiver celulaId mas não tiver rede, tenta buscar na coleção de células ('cells')
    const celulaId = userData.hierarchy?.celulaId || userData.gcId || userData.cellId;
    if (celulaId && (!rede || !gcName)) {
      try {
        let celDoc = await db.collection('cells').doc(celulaId).get();
        if (!celDoc.exists) {
          celDoc = await db.collection('celulas').doc(celulaId).get();
        }
        if (celDoc.exists) {
          const celData = celDoc.data();
          if (!gcName) gcName = celData?.nome || celData?.name || '';
          if (!rede) rede = celData?.rede || '';
        }
      } catch (e) {
        // Silencioso se celula não existir
      }
    }

    return NextResponse.json({
      found: true,
      userId,
      realName: userData.name || '',
      maskedName: maskName(userData.name || ''),
      realPhone: userData.phone || '',
      maskedPhone: maskPhone(userData.phone || ''),
      gcName: gcName || '',
      rede: rede || ''
    });
  } catch (error: any) {
    console.error('Erro ao verificar email no Apoiar:', error);
    return NextResponse.json({ found: false, error: 'Falha na comunicação com o servidor' });
  }
}
