const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Load environment variables for local testing if needed
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    : require(path.resolve(__dirname, '../service-account.json'));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function backfillCpf() {
  console.log('Iniciando backfill de CPF de users -> members...');
  const usersRef = db.collection('users');
  const snapshot = await usersRef.get();

  let totalUpdated = 0;
  let totalMissing = 0;

  const batchSize = 100;
  let batches = [];
  let currentBatch = db.batch();
  let operationCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const userId = doc.id;
    const cpf = data.cpfCnpj || data.cpf || data.cnpj;

    if (!cpf) {
      totalMissing++;
      continue;
    }

    // Achar todos os tenants que esse usuário é membro
    // Se a modelagem de members for /tenants/{tenantId}/members/{userId}:
    const tenantsRef = db.collection('tenants');
    const tenantsSnap = await tenantsRef.get();

    for (const tenantDoc of tenantsSnap.docs) {
      const tenantId = tenantDoc.id;
      const memberRef = db.collection(`tenants/${tenantId}/members`).doc(userId);
      const memberSnap = await memberRef.get();

      if (memberSnap.exists) {
        currentBatch.update(memberRef, { cpf });
        operationCount++;
        totalUpdated++;

        if (operationCount >= batchSize) {
          batches.push(currentBatch);
          currentBatch = db.batch();
          operationCount = 0;
        }
      }
    }
  }

  if (operationCount > 0) {
    batches.push(currentBatch);
  }

  console.log(`Aplicando ${batches.length} batches...`);
  for (const batch of batches) {
    await batch.commit();
  }

  console.log('Backfill concluído com sucesso!');
  console.log(`Usuários com CPF copiados para seus members: ${totalUpdated}`);
  console.log(`Usuários sem CPF (ignorados): ${totalMissing}`);
}

backfillCpf().catch(console.error);
