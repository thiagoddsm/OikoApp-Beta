require('dotenv').config({ path: '.env.local' });
import { getAdminDb } from './src/lib/firebase-admin';

async function main() {
  const db = getAdminDb();
  const liderId = '9Sm2pIH1zIOj9k8D8EcLS3bkKad2';
  const liderDoc = await db.collection('users').doc(liderId).get();
  console.log('Phone in DB:', liderDoc.data()?.phone);
  console.log('PhoneNumber in DB:', liderDoc.data()?.phoneNumber);
  console.log('Name in DB:', liderDoc.data()?.name);
}
main().catch(console.error);
