import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getAdminDb } from './src/lib/firebase-admin';

async function main() {
  const db = getAdminDb();
  const uDoc = await db.collection('users').doc('9Sm2pIH1zIOj9k8D8EcLS3bkKad2').get();
  console.log('USER 9Sm2pIH1zIOj9k8D8EcLS3bkKad2:');
  console.log(uDoc.data());

  const reqDoc = await db.collection('enrollment_requests').doc('VmgwHOvfa2YyNuoZYGqS').get();
  console.log('REQ VmgwHOvfa2YyNuoZYGqS:');
  console.log(reqDoc.data());
}

main().catch(console.error);
