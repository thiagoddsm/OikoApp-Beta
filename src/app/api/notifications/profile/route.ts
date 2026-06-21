import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

/**
 * GET /api/notifications/profile
 * Obtém informações do perfil conectado
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let evolutionKey = searchParams.get('key');
    let evolutionUrl = searchParams.get('server');
    let evolutionInstance = searchParams.get('instance');

    if (evolutionKey === 'undefined' || evolutionKey === 'null') evolutionKey = null;
    if (evolutionUrl === 'undefined' || evolutionUrl === 'null') evolutionUrl = null;
    if (evolutionInstance === 'undefined' || evolutionInstance === 'null') evolutionInstance = null;

    if (!evolutionKey || !evolutionUrl || !evolutionInstance) {
      try {
        const db = getAdminDb();
        const configSnap = await db.collection('config').doc('notifications').get();
        if (configSnap.exists) {
          const data = configSnap.data();
          evolutionKey = evolutionKey || data?.evolutionKey || data?.instanceKey;
          evolutionUrl = evolutionUrl || data?.evolutionUrl || data?.serverUrl;
          evolutionInstance = evolutionInstance || data?.evolutionInstance || data?.instanceName;
        }
      } catch (e) {
        console.warn("Failed to read config from Firestore in Profile GET");
      }
    }

    if (!evolutionKey || !evolutionUrl || !evolutionInstance) {
      return NextResponse.json({ error: "Configurações da Evolution API incompletas." }, { status: 400 });
    }

    const baseUrl = evolutionUrl.replace(/\/$/, '');
    
    // Obter estado de conexão / perfil
    const response = await fetch(`${baseUrl}/instance/connectionState/${evolutionInstance}`, {
      method: 'GET',
      headers: { 'accept': '*/*', 'apikey': evolutionKey },
      cache: 'no-store'
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Profile GET Error] HTTP ${response.status}:`, errorText);
      return NextResponse.json({ error: "Erro ao consultar a API externa.", details: errorText }, { status: response.status });
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: `Erro interno: ${error.message}` }, { status: 500 });
  }
}

/**
 * POST /api/notifications/profile
 * Atualiza propriedades do perfil (Nome, Foto ou Status)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { name, picture, status } = body;

    let evolutionKey = body.key;
    let evolutionUrl = body.server;
    let evolutionInstance = body.instance;

    if (evolutionKey === 'undefined' || evolutionKey === 'null') evolutionKey = null;
    if (evolutionUrl === 'undefined' || evolutionUrl === 'null') evolutionUrl = null;
    if (evolutionInstance === 'undefined' || evolutionInstance === 'null') evolutionInstance = null;

    if (!evolutionKey || !evolutionUrl || !evolutionInstance) {
      try {
        const db = getAdminDb();
        const configSnap = await db.collection('config').doc('notifications').get();
        if (configSnap.exists) {
          const data = configSnap.data();
          evolutionKey = evolutionKey || data?.evolutionKey || data?.instanceKey;
          evolutionUrl = evolutionUrl || data?.evolutionUrl || data?.serverUrl;
          evolutionInstance = evolutionInstance || data?.evolutionInstance || data?.instanceName;
        }
      } catch (e) {
        console.warn("Failed to read config from Firestore in Profile POST");
      }
    }

    if (!evolutionKey || !evolutionUrl || !evolutionInstance) {
      return NextResponse.json({ error: "Configurações da Evolution API incompletas." }, { status: 400 });
    }

    const baseUrl = evolutionUrl.replace(/\/$/, '');
    const results: Record<string, any> = {};
    let statusOk = true;
    let lastError = '';

    // 1. Atualizar Nome: POST /chat/updateProfileName/{instanceName}
    if (name !== undefined) {
      try {
        const res = await fetch(`${baseUrl}/chat/updateProfileName/${evolutionInstance}`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'apikey': evolutionKey 
          },
          body: JSON.stringify({ name }),
        });
        const resData = await res.json().catch(() => ({}));
        results.name = { success: res.ok, data: resData };
        if (!res.ok) {
          statusOk = false;
          lastError = resData.message || `Erro ${res.status} ao atualizar nome`;
          console.error('[Profile Name Update Error]:', resData);
        }
      } catch (e: any) {
        statusOk = false;
        lastError = e.message;
        results.name = { success: false, error: e.message };
      }
    }

    // 2. Atualizar Status (Recado): POST /chat/updateProfileStatus/{instanceName}
    if (status !== undefined) {
      try {
        const res = await fetch(`${baseUrl}/chat/updateProfileStatus/${evolutionInstance}`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'apikey': evolutionKey 
          },
          body: JSON.stringify({ status }),
        });
        const resData = await res.json().catch(() => ({}));
        results.status = { success: res.ok, data: resData };
        if (!res.ok) {
          statusOk = false;
          lastError = resData.message || `Erro ${res.status} ao atualizar status`;
          console.error('[Profile Status Update Error]:', resData);
        }
      } catch (e: any) {
        statusOk = false;
        lastError = e.message;
        results.status = { success: false, error: e.message };
      }
    }

    // 3. Atualizar Foto: POST /chat/updateProfilePicture/{instanceName} (FormData)
    if (picture !== undefined) {
      try {
        let fileBlob;
        const fileName = 'profile.jpg';
        let mimeType = 'image/jpeg';

        if (picture.startsWith('data:')) {
          const dataParts = picture.split(',');
          const meta = dataParts[0];
          const base64Data = dataParts[1];
          mimeType = meta.substring(meta.indexOf(':') + 1, meta.indexOf(';'));
          const buffer = Buffer.from(base64Data, 'base64');
          fileBlob = new Blob([buffer], { type: mimeType });
        } else {
          // URL pública
          const imgRes = await fetch(picture);
          const arrayBuffer = await imgRes.arrayBuffer();
          fileBlob = new Blob([arrayBuffer], { type: imgRes.headers.get('content-type') || 'image/jpeg' });
        }

        const formData = new FormData();
        formData.append('file', fileBlob, fileName);

        const res = await fetch(`${baseUrl}/chat/updateProfilePicture/${evolutionInstance}`, {
          method: 'POST',
          headers: { 
            'apikey': evolutionKey 
          },
          body: formData,
        });

        const resData = await res.json().catch(() => ({}));
        results.picture = { success: res.ok, data: resData };
        if (!res.ok) {
          statusOk = false;
          lastError = resData.message || `Erro ${res.status} ao atualizar foto`;
          console.error('[Profile Picture Update Error]:', resData);
        }
      } catch (e: any) {
        statusOk = false;
        lastError = e.message;
        results.picture = { success: false, error: e.message };
      }
    }

    if (!statusOk) {
      return NextResponse.json({ success: false, error: lastError, details: results }, { status: 400 });
    }

    return NextResponse.json({ success: true, details: results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
