import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

/**
 * Rota de Callback para o OAuth 2.0 da Conta Azul.
 * Captura o 'code' enviado após a autorização do usuário e troca pelos tokens de acesso.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');

  // Detecta a origem dinamicamente para suportar Studio (Dev) e Produção
  const appOrigin = `${url.protocol}//${url.host}`;
  const redirectUri = `${appOrigin}/api/finance/conta-azul/callback`;

  // Se o Conta Azul retornou um erro (ex: access_denied)
  if (error) {
    console.error('Erro retornado pelo Conta Azul:', error, errorDescription);
    let msg = errorDescription || error;
    if (error === 'access_denied') {
        msg = 'Acesso Negado: Certifique-se de estar usando o e-mail de Sandbox (@devportal.com) no login da Conta Azul.';
    }
    return NextResponse.redirect(`${appOrigin}/dashboard/finance?status=error&message=${encodeURIComponent(msg)}`);
  }

  // Se não houver código, o fluxo foi interrompido incorretamente
  if (!code) {
    return NextResponse.redirect(`${appOrigin}/dashboard/finance?status=error&message=Codigo_de_autorizacao_nao_enviado_pela_Conta_Azul`);
  }

  try {
    const { firestore } = initializeFirebase();
    const configRef = doc(firestore, 'config', 'conta_azul');
    const configSnap = await getDoc(configRef);

    if (!configSnap.exists()) {
      throw new Error('Configuração da Conta Azul não encontrada no banco de dados.');
    }

    const { clientId, clientSecret } = configSnap.data();

    if (!clientId || !clientSecret) {
        throw new Error('ClientId ou ClientSecret ausentes no banco de dados.');
    }

    // Criar o header de autorização Basic
    const authHeader = Buffer.from(`${clientId.trim()}:${clientSecret.trim()}`).toString('base64');
    
    // Troca do código pelos tokens (Grant Type: authorization_code)
    // A API da Conta Azul exige x-www-form-urlencoded
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('redirect_uri', redirectUri);
    params.append('code', code);

    const response = await fetch('https://auth.contaazul.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Erro detalhado na troca de token Conta Azul:', data);
      throw new Error(data.error_description || data.error || 'Erro ao trocar tokens.');
    }

    // Calcular expiração
    const expiresAt = Date.now() + (data.expires_in * 1000);

    // Salvar tokens e expiração no Firestore
    await updateDoc(configRef, {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: expiresAt,
      updatedAt: new Date().toISOString()
    });

    return NextResponse.redirect(`${appOrigin}/dashboard/finance?status=connected`);

  } catch (error: any) {
    console.error('Erro fatal no callback da Conta Azul:', error);
    return NextResponse.redirect(`${appOrigin}/dashboard/finance?status=error&message=${encodeURIComponent(error.message)}`);
  }
}
