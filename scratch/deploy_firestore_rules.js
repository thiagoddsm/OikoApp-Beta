const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getSecurityRules } = require('firebase-admin/security-rules');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env' });

async function runDeploy() {
  const saKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!saKey) {
    console.error('FIREBASE_SERVICE_ACCOUNT_KEY is not defined in .env');
    process.exit(1);
  }

  const sa = JSON.parse(saKey);
  console.log(`Programmatically deploying rules to Firebase project: ${sa.project_id}`);

  let app;
  if (!getApps().length) {
    app = initializeApp({ credential: cert(sa) });
  } else {
    app = getApps()[0];
  }

  // Load the rules file content
  const rulesPath = path.join(__dirname, '..', 'firestore.rules');
  if (!fs.existsSync(rulesPath)) {
    console.error(`firestore.rules file not found at: ${rulesPath}`);
    process.exit(1);
  }

  const rulesContent = fs.readFileSync(rulesPath, 'utf8');

  try {
    const rules = getSecurityRules(app);
    // Release the firestore ruleset
    await rules.releaseFirestoreRulesetFromSource(rulesContent);
    console.log('✅ Firestore security rules deployed successfully using Admin SDK!');
  } catch (error) {
    console.error('❌ Failed to deploy firestore rules programmatically:', error);
  }
}

runDeploy().catch(console.error);
