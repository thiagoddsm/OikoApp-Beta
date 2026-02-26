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

  // Detecção ultra-robusta do Host público para evitar Mismatch de Redirect URI
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || url.host;
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  
  // Remove a porta interna (ex: :9002) se o host contiver o domínio do cloudworkstations
  const cleanHost = host.includes('cloudworkstations.dev') ? host.split(':')[0] : host;
  
  const appOrigin = `${protocol}://${cleanHost}`;
  const redirectUri = `${appOrigin}/api/finance/conta-azul/callback`;

  console.log('--- DEBUG CONTA AZUL CALLBACK ---');
  console.log('App Origin detectado:', appOrigin);
  console.log('Redirect URI gerada para troca de token:', redirectUri);

  // Se o Conta Azul retornou um erro
  if (error) {
    console.error('Erro retornado pelo Conta Azul:', error, errorDescription);
    let msg = errorDescription || error;
    if (error === 'access_denied') {
        msg = 'Acesso Negado: Verifique se o Client ID e Secret estão corretos e se você usou o e-mail de Sandbox (@devportal.com).';
    }
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

    const { clientId, clientSecret } = configSnap.data();

    if (!clientId || !clientSecret) {
        throw new Error('ClientId ou ClientSecret ausentes no banco de dados.');
    }

    // Limpeza rigorosa das chaves para evitar espaços invisíveis
    const cleanId = clientId.trim();
    const cleanSecret = clientSecret.trim();

    // Criar o header de autorização Basic
    const authHeader = Buffer.from(`${cleanId}:${cleanSecret}`).toString('base64');
    
    // Troca do código pelos tokens usando URLSearchParams (obrigatório pela API)
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
      console.error('Erro na troca de token (Resposta da API):', data);
      throw new Error(data.error_description || data.error || 'Falha na troca do código pelo token de acesso.');
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
    console.error('Erro fatal no processamento do callback:', error);
    return NextResponse.redirect(`${appOrigin}/dashboard/finance?status=error&message=${encodeURIComponent(error.message)}`);
  }
}
