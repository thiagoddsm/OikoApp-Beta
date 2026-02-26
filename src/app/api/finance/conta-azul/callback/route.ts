
import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

/**
 * Rota de Callback para o OAuth 2.0 da Conta Azul.
 * Captura o 'code' enviado após a autorização do usuário e troca pelos tokens de acesso.
 * Otimizada para conformidade estrita com o Redirect URI e detecção de proxy do Studio.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');

  // Detecção do Host Público REAL (essencial para o compliance no Studio)
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || url.host;
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  
  // Reconstrução da URI idêntica à cadastrada no portal (Identidade Binária)
  const appOrigin = `${protocol}://${host}`;
  const redirectUri = `${appOrigin}/api/finance/conta-azul/callback`;

  console.log('--- CALLBACK CONTA AZUL: DETECÇÃO DE AMBIENTE ---');
  console.log('Ambiente (Host):', host);
  console.log('Redirect URI (Compliance):', redirectUri);

  if (error) {
    console.error('Erro retornado pelo Conta Azul:', error, errorDescription);
    const msg = error === 'access_denied' 
        ? 'Acesso Negado: Verifique se está usando o e-mail de Sandbox (@devportal.com) e se o Redirect URI no portal é exatamente: ' + redirectUri
        : errorDescription || error;
    return NextResponse.redirect(`${appOrigin}/dashboard/finance?status=error&message=${encodeURIComponent(msg)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${appOrigin}/dashboard/finance?status=error&message=Codigo_de_autorizacao_nao_recebido`);
  }

  try {
    const { firestore } = initializeFirebase();
    const configRef = doc(firestore, 'config', 'conta_azul');
    const configSnap = await getDoc(configRef);

    if (!configSnap.exists()) {
      throw new Error('Configuração da Conta Azul não encontrada no banco de dados.');
    }

    // Higienização de credenciais (prevenção contra espaços em branco)
    const { clientId, clientSecret } = configSnap.data();
    const cleanClientId = clientId?.trim();
    const cleanClientSecret = clientSecret?.trim();

    if (!cleanClientId || !cleanClientSecret) {
        throw new Error('ClientId ou ClientSecret ausentes. Salve as credenciais primeiro.');
    }

    const authHeader = Buffer.from(`${cleanClientId}:${cleanClientSecret}`).toString('base64');
    
    // Troca do código pelos tokens usando application/x-www-form-urlencoded (Padrão API v2)
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
      console.error('Erro na troca de token (OAuth 2.0):', data);
      throw new Error(data.error_description || data.error || 'Falha técnica na troca do código pelo token.');
    }

    // Persistência de acesso e ciclo de vida do token
    const expiresAt = Date.now() + (data.expires_in * 1000);

    await updateDoc(configRef, {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: expiresAt,
      updatedAt: new Date().toISOString()
    });

    return NextResponse.redirect(`${appOrigin}/dashboard/finance?status=connected`);

  } catch (error: any) {
    console.error('Erro fatal no fluxo de callback:', error);
    return NextResponse.redirect(`${appOrigin}/dashboard/finance?status=error&message=${encodeURIComponent(error.message)}`);
  }
}
