
import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

/**
 * Rota de Callback para o OAuth 2.0 da Conta Azul.
 * Otimizada para diagnosticar Redirect URI Mismatch no Firebase Studio.
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

  // Log técnico para o console de depuração do usuário
  await updateDoc(configRef, { 
      lastError: `DIAGNÓSTICO: Tentando troca. URI Enviada: ${redirectUri}`,
      lastErrorAt: new Date().toISOString()
  }).catch(() => {});

  if (error) {
    const msg = `ERRO CONTA AZUL: ${error} - ${errorDescription || 'Sem descrição'}`;
    await updateDoc(configRef, { lastError: msg, lastErrorAt: new Date().toISOString() }).catch(() => {});
    return NextResponse.redirect(`${appOrigin}/dashboard/finance?status=error&message=${encodeURIComponent(msg)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${appOrigin}/dashboard/finance?status=error&message=Codigo_de_autorizacao_nao_recebido`);
  }

  try {
    const configSnap = await getDoc(configRef);
    if (!configSnap.exists()) throw new Error('Configuração não encontrada.');

    const { clientId, clientSecret } = configSnap.data();
    if (!clientId || !clientSecret) throw new Error('ClientId ou ClientSecret ausentes.');

    const authHeader = Buffer.from(`${clientId.trim()}:${clientSecret.trim()}`).toString('base64');
    
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
          lastError: `FALHA NO TOKEN: ${errMsg} (Verifique se a URI no portal é: ${redirectUri})`,
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
      lastError: 'SUCESSO: Chaves obtidas com sucesso.' 
    });

    return NextResponse.redirect(`${appOrigin}/dashboard/finance?status=connected`);

  } catch (error: any) {
    return NextResponse.redirect(`${appOrigin}/dashboard/finance?status=error&message=${encodeURIComponent(error.message)}`);
  }
}
