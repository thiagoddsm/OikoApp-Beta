import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

/**
 * Rota de Callback para o OAuth 2.0 da Conta Azul.
 * Captura o 'code' enviado após a autorização do usuário e troca pelos tokens de acesso.
 * Otimizada para ambientes de Proxy/Studio.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');

  // Detecção do Host Público REAL (essencial para o Studio)
  // Prioriza headers de proxy que o Google Cloud Workstations envia
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || url.host;
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  
  // Constrói a URI que deve ser IDENTICA à cadastrada no Portal do Desenvolvedor
  const appOrigin = `${protocol}://${host}`;
  const redirectUri = `${appOrigin}/api/finance/conta-azul/callback`;

  console.log('--- DEBUG CONTA AZUL CALLBACK ---');
  console.log('Host detectado:', host);
  console.log('Redirect URI usada para troca:', redirectUri);

  if (error) {
    console.error('Erro retornado pelo Conta Azul:', error, errorDescription);
    const msg = error === 'access_denied' 
        ? 'Acesso Negado: Certifique-se de usar o e-mail de Sandbox (@devportal.com) e que a URL no portal seja exatamente: ' + redirectUri
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
      throw new Error('Configuração da Conta Azul não encontrada.');
    }

    const { clientId, clientSecret } = configSnap.data();

    if (!clientId || !clientSecret) {
        throw new Error('ClientId ou ClientSecret ausentes. Salve as credenciais primeiro.');
    }

    const authHeader = Buffer.from(`${clientId.trim()}:${clientSecret.trim()}`).toString('base64');
    
    // Troca do código pelos tokens
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
      console.error('Erro na troca de token:', data);
      throw new Error(data.error_description || data.error || 'Falha na troca do código.');
    }

    // Calcular expiração e salvar
    const expiresAt = Date.now() + (data.expires_in * 1000);

    await updateDoc(configRef, {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: expiresAt,
      updatedAt: new Date().toISOString()
    });

    return NextResponse.redirect(`${appOrigin}/dashboard/finance?status=connected`);

  } catch (error: any) {
    console.error('Erro fatal no callback:', error);
    return NextResponse.redirect(`${appOrigin}/dashboard/finance?status=error&message=${encodeURIComponent(error.message)}`);
  }
}
