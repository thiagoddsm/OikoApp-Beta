import { getAdminDb } from '../src/lib/firebase-admin';

async function run() {
  const db = getAdminDb();
  const eventId = 'UM0sbIovrzOQOEF2qOtQ';
  
  const rootRegs = await db.collection('event_registrations').where('eventId', '==', eventId).get();
  
  const usersSnap = await db.collection('users').get();
  const usersMap = new Map();
  usersSnap.docs.forEach(doc => usersMap.set(doc.id, doc.data()));

  let deFora = 0;
  let daIgreja = 0;
  let anonimos = 0;
  let anonimosComCadastro = 0;

  const listaDeFora: any[] = [];
  const listaDaIgreja: any[] = [];

  rootRegs.docs.forEach((doc) => {
    const data = doc.data();
    
    let isMembro = false;

    if (data.userId && data.userId !== 'anonymous') {
        const u = usersMap.get(data.userId);
        if (u) {
            // Check their hierarchy role or integration status
            const role = u.hierarchy?.role || u.role;
            const status = u.integrationStatus || u.situacaoCaminhada;
            // Basic heuristic: Se tem cadastro, será que consideramos da igreja?
            // "member", "membro", "lider_gc", etc.
            isMembro = true; // For now assume anyone with an account is known, but let's check roles
            if (role === 'visitante' || status === 'visitante') {
                isMembro = false;
            }
        }
    } else {
        // Maybe anonymous, check email
        let foundUser = null;
        for (const u of usersMap.values()) {
            if (u.email && data.userMetadata?.email && u.email.toLowerCase() === data.userMetadata.email.toLowerCase()) {
                foundUser = u;
                break;
            }
        }
        if (foundUser) {
            anonimosComCadastro++;
            isMembro = true;
            if (foundUser.hierarchy?.role === 'visitante' || foundUser.integrationStatus === 'visitante') {
                isMembro = false;
            }
        } else {
            anonimos++;
            isMembro = false;
        }
    }

    if (isMembro) {
        daIgreja++;
        listaDaIgreja.push(data.userMetadata?.name);
    } else {
        deFora++;
        listaDeFora.push(data.userMetadata?.name);
    }
  });

  console.log(`Total Inscrições: ${rootRegs.size}`);
  console.log(`Da Igreja: ${daIgreja}`);
  console.log(`De Fora (Visitantes/Sem Cadastro): ${deFora}`);
  console.log(`(Inscrições anônimas mas que tinham email no sistema: ${anonimosComCadastro})`);
  console.log(`(Inscrições totalmente anônimas/sem email no sistema: ${anonimos})`);
}

run().catch(console.error);
