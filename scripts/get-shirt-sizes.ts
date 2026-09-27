import { getAdminDb } from '../src/lib/firebase-admin';

async function run() {
  const db = getAdminDb();
  const eventId = 'UM0sbIovrzOQOEF2qOtQ';
  
  const rootRegs = await db.collection('event_registrations').where('eventId', '==', eventId).get();
  
  const statuses: Record<string, number> = {};
  const paidCamisas: Record<string, number> = {};
  const pendingCamisas: Record<string, number> = {};

  rootRegs.docs.forEach((doc) => {
    const data = doc.data();
    
    // Check if it's a shirt
    if (data.ticketName && data.ticketName.toLowerCase().includes('camisa')) {
       let status = data.payment?.status || data.status || 'unknown';
       statuses[status] = (statuses[status] || 0) + 1;
       
       if (status === 'approved' || status === 'CONFIRMED' || status === 'RECEIVED' || status === 'Pago' || data.payment?.asaasStatus === 'RECEIVED' || data.payment?.asaasStatus === 'CONFIRMED') {
           paidCamisas[data.ticketName] = (paidCamisas[data.ticketName] || 0) + 1;
       } else {
           pendingCamisas[data.ticketName] = (pendingCamisas[data.ticketName] || 0) + 1;
       }
    }
  });

  console.log("Payment statuses for Camisas:", statuses);
  console.log("Paid Camisas:", paidCamisas);
  console.log("Pending/Other Camisas:", pendingCamisas);
}

run().catch(console.error);
