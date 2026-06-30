const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getSecurityRules } = require('firebase-admin/security-rules');
require('dotenv').config({ path: '.env' });

async function runCheck() {
  const saKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!saKey) {
    console.error('FIREBASE_SERVICE_ACCOUNT_KEY is not defined in .env');
    process.exit(1);
  }

  const sa = JSON.parse(saKey);
  console.log(`Checking rules for Firebase project: ${sa.project_id}`);

  let app;
  if (!getApps().length) {
    app = initializeApp({ credential: cert(sa) });
  } else {
    app = getApps()[0];
  }

  try {
    const rules = getSecurityRules(app);
    const ruleset = await rules.getFirestoreRuleset();
    console.log('✅ Active Ruleset Metadata:', {
      name: ruleset.name,
      createTime: ruleset.createTime
    });
    console.log('----------------------------------------------------------------');
    console.log('📄 ACTIVE RULESET CONTENT:');
    console.log(ruleset.source[0].content);
    console.log('----------------------------------------------------------------');
  } catch (error) {
    console.error('❌ Failed to fetch active ruleset:', error);
  }
}

runCheck().catch(console.error);
