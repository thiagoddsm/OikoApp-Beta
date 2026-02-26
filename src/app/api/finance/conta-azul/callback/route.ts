
import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'Código de autorização não fornecido.' }, { status: 400 });
  }

  try {
    const { firestore } = initializeFirebase();
    const configRef = doc(firestore, 'config', 'conta_azul');
    const configSnap = await getDoc(configRef);

    if (!configSnap.exists()) {
      throw new Error('Configuração da Conta Azul não encontrada no Firestore.');
    }

    const { clientId, clientSecret } = configSnap.data();
    const redirectUri = `${new URL(request.url).origin}/api/finance/conta-azul/callback`;

    // Trocar o code pelo access_token
    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    const response = await fetch('https://api.contaazul.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code: code
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Erro Conta Azul:', data);
      throw new Error(data.error_description || 'Erro ao trocar tokens.');
    }

    // Calcular timestamp de expiração (ms)
    const expiresAt = Date.now() + (data.expires_in * 1000);

    // Salvar tokens e expiração no Firestore
    await updateDoc(configRef, {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: expiresAt,
      updatedAt: new Date().toISOString()
    });

    // Redirecionar de volta para o dashboard com sucesso
    return NextResponse.redirect(`${new URL(request.url).origin}/dashboard/finance?status=connected`);

  } catch (error: any) {
    console.error('Erro no callback da Conta Azul:', error);
    return NextResponse.redirect(`${new URL(request.url).origin}/dashboard/finance?status=error&message=${encodeURIComponent(error.message)}`);
  }
}
