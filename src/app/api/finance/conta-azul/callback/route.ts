import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  // URL do app publicado para consistência no redirecionamento
  const appOrigin = 'https://studio--studio-1424813022-71754.us-central1.hosted.app';

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
    // A redirectUri deve ser idêntica à cadastrada e enviada no início do fluxo
    const redirectUri = `${appOrigin}/api/finance/conta-azul/callback`;

    // Trocar o code pelo access_token usando o endpoint auth.contaazul.com
    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    const response = await fetch('https://auth.contaazul.com/oauth2/token', {
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
    return NextResponse.redirect(`${appOrigin}/dashboard/finance?status=connected`);

  } catch (error: any) {
    console.error('Erro no callback da Conta Azul:', error);
    return NextResponse.redirect(`${appOrigin}/dashboard/finance?status=error&message=${encodeURIComponent(error.message)}`);
  }
}