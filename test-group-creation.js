const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
  "projectId": "studio-1424813022-71754",
  "appId": "1:989586605112:web:66250f4d31e88166a212cd",
  "storageBucket": "studio-1424813022-71754.firebasestorage.app",
  "apiKey": "AIzaSyAOSAJ0WPPXAxbSMtiq7UZxkjzE6vizVq8",
  "authDomain": "studio-1424813022-71754.firebaseapp.com",
  "messagingSenderId": "989586605112"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function runTest() {
  console.log("=== INICIANDO TESTE CLIENTE DE CREDENCIAIS DE WHATSAPP ===");
  try {
    const docRef = doc(db, 'config', 'notifications');
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      console.error("ERRO: Documento 'config/notifications' não existe no Firestore!");
      return;
    }

    const configData = docSnap.data();
    const waKey = configData?.evolutionKey || configData?.instanceKey || configData?.whatsappApiKey || null;
    const serverUrl = (configData?.evolutionUrl || configData?.serverUrl || 'https://api.ibmanha.com.br').replace(/\/$/, '');
    const instanceName = configData?.evolutionInstance || configData?.instanceName || 'IBM';

    console.log("Configurações lidas do Firestore:");
    console.log(`- Server URL: ${serverUrl}`);
    console.log(`- Instance Name: ${instanceName}`);
    console.log(`- API Key (ofuscada): ${waKey ? waKey.substring(0, 10) + '...' : 'NULA'}`);

    if (!waKey) {
      console.error("ERRO: Evolution API Key está nula ou vazia no Firestore.");
      return;
    }

    console.log("\n1. Testando conexão de leitura (Listar grupos)...");
    const checkConn = await fetch(`${serverUrl}/group/fetchAllGroups/${instanceName}?getParticipants=false`, {
      method: 'GET',
      headers: { 'accept': '*/*', 'apikey': waKey }
    });

    const connData = await checkConn.json().catch(() => null);
    console.log(`- Status HTTP da Resposta: ${checkConn.status}`);
    if (!checkConn.ok) {
      console.error("ERRO na conexão com a Evolution API:", connData);
      return;
    }
    console.log("✓ Conexão com Evolution API bem-sucedida!");

    console.log("\n2. Testando criação de grupo de teste...");
    const createRes = await fetch(`${serverUrl}/group/create/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': waKey
      },
      body: JSON.stringify({
        subject: "Grupo Teste Antigravity",
        participants: []
      })
    });

    const createData = await createRes.json().catch(() => ({}));
    console.log(`- Status HTTP da Criação: ${createRes.status}`);
    console.log("- Resposta da Evolution API:", JSON.stringify(createData, null, 2));

  } catch (error) {
    console.error("Erro durante o teste:", error.message);
  }
}

runTest();
