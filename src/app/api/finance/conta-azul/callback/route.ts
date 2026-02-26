
import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

/**
 * Rota de Callback para o OAuth 2.0 da Conta Azul.
 * Captura o 'code' enviado após a autorização do usuário e troca pelos tokens de acesso.
 * Otimizada para o ambiente de proxy do Firebase Studio com LOGS DE DIAGNÓSTICO.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');

  // Detecção do Host Público REAL (Essencial para o Studio)
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || url.host;
  const protocol = 'https';
  const appOrigin = `${protocol}://${host}`;
  const redirectUri = `${appOrigin}/api/finance/conta-azul/callback`;

  const { firestore } = initializeFirebase();
  const configRef = doc(firestore, 'config', 'conta_azul');

  // Log inicial para diagnóstico no painel
  await updateDoc(configRef, { 
      lastError: `DEBUG CALLBACK: Iniciando troca. URI Detectada: ${redirectUri}`,
      lastErrorAt: new Date().toISOString()
  }).catch(() => {});

  if (error) {
    const msg = `ERRO CONTA AZUL: ${error} - ${errorDescription || 'Sem descrição'}`;
    console.error(msg);
    
    await updateDoc(configRef, { 
        lastError: msg,
        lastErrorAt: new Date().toISOString()
    }).catch(() => {});

    return NextResponse.redirect(`${appOrigin}/dashboard/finance?status=error&message=${encodeURIComponent(msg)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${appOrigin}/dashboard/finance?status=error&message=Codigo_de_autorizacao_nao_recebido`);
  }

  try {
    const configSnap = await getDoc(configRef);

    if (!configSnap.exists()) {
      throw new Error('Configuração da Conta Azul não encontrada no banco de dados.');
    }

    const { clientId, clientSecret } = configSnap.data();
    const cleanClientId = clientId?.trim();
    const cleanClientSecret = clientSecret?.trim();

    if (!cleanClientId || !cleanClientSecret) {
        throw new Error('ClientId ou ClientSecret ausentes no banco. Salve primeiro.');
    }

    const authHeader = Buffer.from(`${cleanClientId}:${cleanClientSecret}`).toString('base64');
    
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
      const errMsg = data.error_description || data.error || 'Falha na troca do token.';
      
      // Salva falha técnica para depuração no painel do usuário
      await updateDoc(configRef, { 
          lastError: `FALHA NO TOKEN: ${errMsg} (URI enviada: ${redirectUri})`,
          lastErrorAt: new Date().toISOString()
      }).catch(() => {});

      throw new Error(errMsg);
    }

    const expiresAt = Date.now() + (data.expires_in * 1000);

    await updateDoc(configRef, {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: expiresAt,
      updatedAt: new Date().toISOString(),
      lastError: 'SUCESSO: Conexão estabelecida e tokens salvos.' 
    });

    return NextResponse.redirect(`${appOrigin}/dashboard/finance?status=connected`);

  } catch (error: any) {
    console.error('Erro fatal no callback:', error);
    return NextResponse.redirect(`${appOrigin}/dashboard/finance?status=error&message=${encodeURIComponent(error.message)}`);
  }
}
