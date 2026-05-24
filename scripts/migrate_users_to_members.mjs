import admin from "firebase-admin";
import { readFileSync } from "fs";
import { join } from "path";

// Check parameters
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const forceTenant = args.find(a => a.startsWith("--tenant="))?.split("=")[1] || "ibm";

console.log(`\n🚀 Iniciando script de migração: Users -> Members`);
console.log(`   Modo Dry-Run: ${dryRun ? "ATIVADO (sem alterações no banco)" : "DESATIVADO (gravação ativa)"}`);
console.log(`   Tenant Padrão: "${forceTenant}"`);

// Connect to Firebase Admin
const serviceAccountPath = join(process.cwd(), "oiko-saas-core", "serviceAccountKey.json");
let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf-8"));
} catch (err) {
  console.error(`❌ Erro ao ler a chave de serviço em: ${serviceAccountPath}`);
  console.error(`   Certifique-se de que a pasta 'oiko-saas-core' contém o arquivo 'serviceAccountKey.json'.`);
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function runMigration() {
  const usersCollection = db.collection("users");
  const userTenantsCollection = db.collection("userTenants");

  // Fetch all root users
  console.log("📥 Buscando usuários legados na coleção raiz '/users'...");
  const usersSnap = await usersCollection.get();
  console.log(`   Encontrados ${usersSnap.size} usuários.`);

  let processedCount = 0;
  let memberCreatedCount = 0;
  let userCreatedCount = 0;
  let userTenantCreatedCount = 0;

  for (const docSnap of usersSnap.docs) {
    const uid = docSnap.id;
    const data = docSnap.data();

    // Skip already migrated metadata users, or check if it is already in members
    if (data.migratedToUid) {
      console.log(`   [Pular] Usuário ${uid} já migrado (metadata).`);
      continue;
    }

    processedCount++;

    const tenantId = data.tenantId || forceTenant;
    const role = data.hierarchy?.role || "member";

    // Split name into first and last name
    const fullName = (data.name || "").trim() || "Usuário Sem Nome";
    const nameParts = fullName.split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || "";

    // 1. Structure /userTenants/{uid}
    const userTenantData = {
      tenantId: tenantId,
      slug: tenantId,
      role: role,
      email: data.email || "",
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // 2. Structure /tenants/{tenantId}/users/{uid}
    const tenantUserData = {
      email: data.email || "",
      role: role,
      permissions: data.permissions || [],
      status: data.serviceStatus || "active",
      createdAt: data.createdAt || admin.firestore.FieldValue.serverTimestamp(),
      lastLoginAt: data.lastLoginAt || admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // 3. Structure /tenants/{tenantId}/members/{uid}
    const memberData = {
      id: uid,
      tenantId: tenantId,
      basic: {
        firstName: firstName,
        lastName: lastName,
        cpf: data.cpf || "",
        sexo: data.sexo || "",
        dataNascimento: data.dataNascimento || "",
        avatar: data.avatar || "",
        photoURL: data.photoURL || "",
      },
      contact: {
        phone: data.phone || "",
        email: data.email || "",
        address: {
          street: data.address?.street || "",
          cep: data.address?.cep || "",
        }
      },
      ministerial: {
        batizado: data.batizado || "nao",
        igrejaBatismo: data.igrejaBatismo || "",
        membroAntigo: data.membroAntigo || "nao",
        igrejaAntiga: data.igrejaAntiga || "",
        decisao: data.decisao || [],
        dataDecisao: data.dataDecisao || "",
        integrationStatus: data.integrationStatus || "nao_alcancado",
      },
      services: {
        eligibleEventIds: data.eligibleEventIds || [],
        serviceAreaId: data.serviceAreaId || "",
        serviceTeamId: data.serviceTeamId || "",
        blockedDates: data.blockedDates || [],
        lastServedDate: data.lastServedDate || null,
        serviceStatus: data.serviceStatus || "not_serving",
      },
      family: {
        familyMembers: data.familyMembers || [],
      },
      journey: data.journey || {},
      createdAt: data.createdAt || admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    console.log(`👤 Migrando [${uid}]: "${fullName}" -> Tenant "${tenantId}" (Role: "${role}")`);

    if (dryRun) {
      console.log(`   [DRY-RUN] Escreveria /userTenants/${uid}`);
      console.log(`   [DRY-RUN] Escreveria /tenants/${tenantId}/users/${uid}`);
      console.log(`   [DRY-RUN] Escreveria /tenants/${tenantId}/members/${uid}`);
      memberCreatedCount++;
      userCreatedCount++;
      userTenantCreatedCount++;
    } else {
      const batch = db.batch();

      // Write to root userTenants
      const userTenantRef = userTenantsCollection.doc(uid);
      batch.set(userTenantRef, userTenantData, { merge: true });

      // Write to nested tenant users
      const tenantUserRef = db.collection("tenants").doc(tenantId).collection("users").doc(uid);
      batch.set(tenantUserRef, tenantUserData, { merge: true });

      // Write to nested tenant members
      const tenantMemberRef = db.collection("tenants").doc(tenantId).collection("members").doc(uid);
      batch.set(tenantMemberRef, memberData, { merge: true });

      await batch.commit();
      
      memberCreatedCount++;
      userCreatedCount++;
      userTenantCreatedCount++;
    }
  }

  console.log(`\n🎉 Migração finalizada com sucesso!`);
  console.log(`📊 Estatísticas:`);
  console.log(`   Usuários processados: ${processedCount}`);
  console.log(`   Perfis de membros criados/atualizados: ${memberCreatedCount}`);
  console.log(`   Registros de acesso criados/atualizados: ${userCreatedCount}`);
  console.log(`   Associações globais de tenant criadas/atualizadas: ${userTenantCreatedCount}`);
  process.exit(0);
}

runMigration().catch((err) => {
  console.error("❌ Erro fatal durante a migração:", err);
  process.exit(1);
});
