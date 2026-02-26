
import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

/**
 * Rota de Callback para o OAuth 2.0 da Conta Azul (ETAPA 2).
 * Processa o código recebido e o troca pelo Access Token.
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

  // Log de diagnóstico inicial para o console do usuário
  await updateDoc(configRef, { 
      lastError: `ETAPA 2: Iniciando troca de código. URI: ${redirectUri}`,
      lastErrorAt: new Date().toISOString()
  }).catch(() => {});

  if (error) {
    const msg = `ERRO CONTA AZUL: ${error} - ${errorDescription || 'Acesso negado pelo usuário.'}`;
    await updateDoc(configRef, { lastError: msg, lastErrorAt: new Date().toISOString() }).catch(() => {});
    return NextResponse.redirect(`${appOrigin}/dashboard/finance?status=error&message=${encodeURIComponent(msg)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${appOrigin}/dashboard/finance?status=error&message=Codigo_de_autorizacao_nao_recebido`);
  }

  try {
    const configSnap = await getDoc(configRef);
    if (!configSnap.exists()) throw new Error('Configuração não encontrada no banco.');

    const { clientId, clientSecret } = configSnap.data();
    if (!clientId || !clientSecret) throw new Error('ClientId ou ClientSecret ausentes. Salve-os antes de autorizar.');

    // Conforme documentação: Authorization: Basic BASE64(client_id:client_secret)
    const authHeader = Buffer.from(`${clientId.trim()}:${clientSecret.trim()}`).toString('base64');
    
    // Conforme documentação: Content-Type: application/x-www-form-urlencoded
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
      await updateDoc(configRef, { 
          lastError: `FALHA NA ETAPA 2: ${errMsg} (URI no portal deve ser: ${redirectUri})`,
          lastErrorAt: new Date().toISOString()
      }).catch(() => {});
      throw new Error(errMsg);
    }

    // Sucesso: Guardar tokens (ETAPA 3 preparada)
    const expiresAt = Date.now() + (data.expires_in * 1000);

    await updateDoc(configRef, {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: expiresAt,
      updatedAt: new Date().toISOString(),
      lastError: 'SUCESSO: Conexão estabelecida e tokens armazenados.' 
    });

    return NextResponse.redirect(`${appOrigin}/dashboard/finance?status=connected`);

  } catch (error: any) {
    console.error('Erro no callback:', error);
    return NextResponse.redirect(`${appOrigin}/dashboard/finance?status=error&message=${encodeURIComponent(error.message)}`);
  }
}
