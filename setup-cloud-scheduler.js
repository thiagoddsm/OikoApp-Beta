/**
 * setup-cloud-scheduler.js
 * 
 * Cria um job no Cloud Scheduler para chamar /api/gc/trigger-reports a cada hora.
 * Usa a service account do Firebase que já temos configurada.
 * 
 * Execute: node setup-cloud-scheduler.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// ── Configurações ──────────────────────────────────────────────────────────────
const PROJECT_ID = 'studio-1424813022-71754';
const REGION = 'us-central1';  // mesma região do App Hosting
const APP_URL = 'https://ibmanha.com.br';
const TRIGGER_TOKEN = 'b403330a21190e9416c6ff13e8cf1d1d8975adae6a48222ac7bc6103c8078556';
const JOB_NAME = 'gc-report-trigger-hourly';

// Carrega a service account
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const saMatch = envContent.match(/FIREBASE_SERVICE_ACCOUNT_KEY='(.*)'/);
const serviceAccount = JSON.parse(saMatch[1]);

// ── Gerar JWT para autenticação ────────────────────────────────────────────────
const { GoogleAuth } = require('./node_modules/google-auth-library');

async function main() {
  const auth = new GoogleAuth({
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });

  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const accessToken = tokenResponse.token;

  const jobBody = {
    name: `projects/${PROJECT_ID}/locations/${REGION}/jobs/${JOB_NAME}`,
    description: 'Dispara o bot de relatório de GC a cada hora. A lógica interna do endpoint verifica dia da semana e janela de 3h pós-reunião.',
    schedule: '0 * * * *',     // Toda hora em ponto
    timeZone: 'America/Sao_Paulo',
    httpTarget: {
      uri: `${APP_URL}/api/gc/trigger-reports`,
      httpMethod: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TRIGGER_TOKEN}`,
      },
      body: Buffer.from(JSON.stringify({})).toString('base64'),
    },
    retryConfig: {
      retryCount: 3,
      minBackoffDuration: '5s',
      maxBackoffDuration: '60s',
    },
  };

  const apiUrl = `https://cloudscheduler.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/jobs`;

  // Tenta criar. Se já existir, atualiza (PATCH)
  console.log(`\nCriando job "${JOB_NAME}" no Cloud Scheduler...`);
  
  let response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(jobBody),
  });

  if (response.status === 409) {
    // Já existe — atualizar
    console.log('Job já existe. Atualizando...');
    const patchUrl = `${apiUrl}/${JOB_NAME}?updateMask=schedule,timeZone,httpTarget,description,retryConfig`;
    response = await fetch(
      `https://cloudscheduler.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/jobs/${JOB_NAME}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jobBody),
      }
    );
  }

  const result = await response.json();
  
  if (response.ok) {
    console.log('\n✅ Cloud Scheduler configurado com sucesso!');
    console.log(`   Nome: ${result.name}`);
    console.log(`   Agendamento: ${result.schedule} (${result.timeZone})`);
    console.log(`   URL: ${result.httpTarget?.uri}`);
    console.log(`   Próxima execução: ${result.scheduleTime || 'calculando...'}`);
    console.log('\n📌 Próximo passo: adicionar o TOKEN nas variáveis de ambiente do App Hosting.');
    console.log(`   GC_REPORT_TRIGGER_TOKEN=${TRIGGER_TOKEN}`);
  } else {
    console.error('\n❌ Erro ao configurar Cloud Scheduler:');
    console.error(JSON.stringify(result, null, 2));
    
    if (result.error?.status === 'PERMISSION_DENIED') {
      console.log('\n💡 A service account precisa da permissão "Cloud Scheduler Admin".');
      console.log('   Acesse: https://console.cloud.google.com/iam-admin/iam?project=' + PROJECT_ID);
      console.log('   Adicione o papel "Cloud Scheduler Admin" para:');
      console.log('   firebase-adminsdk-fbsvc@studio-1424813022-71754.iam.gserviceaccount.com');
    }
  }
}

main().catch(console.error);
