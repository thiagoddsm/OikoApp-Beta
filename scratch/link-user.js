const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // Assume it exists or we use default

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault()
    });
}

const db = admin.firestore();

async function linkUser() {
    const phone = '5521989001302';
    const jid = '5521989001302@s.whatsapp.net';
    const lid = '43817323462720@lid';
    const name = 'Thiago Dias';

    console.log(`Linking ${name} (${phone})...`);

    try {
        const contactRef = db.collection('notifications_contacts').doc(phone);
        await contactRef.set({
            phoneNumber: phone,
            jid: jid,
            lid: lid,
            name: name,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        // Também salvar sem o 55 para garantir match redundante
        const phoneShort = '21989001302';
        await db.collection('notifications_contacts').doc(phoneShort).set({
            phoneNumber: phoneShort,
            jid: jid,
            lid: lid,
            name: name,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        console.log('Successfully linked Thiago Dias!');
    } catch (error) {
        console.error('Error linking user:', error);
    }
}

linkUser();
