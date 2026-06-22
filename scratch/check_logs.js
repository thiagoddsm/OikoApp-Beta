const admin = require('firebase-admin');

// Ensure firebase isn't initialized twice
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: "studio-1424813022-71754",
      clientEmail: "firebase-adminsdk-fbsvc@studio-1424813022-71754.iam.gserviceaccount.com",
      privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDGuRaX1zTGAO4d\nXlNk0W+5L3U3wRDlX7C/05CbeGbcjOF14LqPZ16L4ICcFd/Hze/YbYBXPii2XrHA\nhWr0c0HZv48kRxRF3EwpahM49vphhQ9aN7ajZYlhuREiDPGhp3OzufzO4SBTWAZI\nhnxLm4mzfkQ2c7lKTSt7spFNGEdZYd2dkR9ak7NstLDFY+fOsdfmIdqraIuPswok\nrcRBvZazYvVWk2k8Ky8R/8sZCz/jPolsN4xOzIhGYxocro3H9qyLpHarWErr2WDv\n3K2Fry2jO8PsqtHtC0Nj3wRH8wADl+umcrWB8AqEgl6mgiqKNk4+Bb7oqqjJKi1X\nbfY4Sd/PAgMBAAECggEAIAIX/YUQXwQvVlOnIwoI8M8QFlbmnct38K3nEOOnzcZz\nWkVER2zi8azLiliLnucwxq98iJDeheFiyBu1SoJ2DNip+bHpNgdxzQnk5rwBQEvq\nWSG4LUFhi3f/pnhnQx5xqHVAnyHrzwDSokPnKVZ4K40e95ZUNf+QDXCJrt1GQMMV\n89cJKaLaHYipyJoIAHtPUvSoyXzIaWUGHw71E+TFOg7gSu3wLvA0kBz9jQInXkSU\nt5zcCVEpjUQCWoujHfE7OFM25p6oXxuSjXrnoibAc58t2jmMhgoiQ9RGBQSOGZFL\nqVhEJAEvzGFV6lKGGT3mPKMee/0uV/I+CraxEl8tIQKBgQDql9MNBPGfk8Z9Cbqz\nelX2qZYSBiObk65QhfckGpF/OtO02cvBiPdwerO/t8jLQBKn8BV3I0G/sSWr/xPs\njR0Jjy4g3Ukf/oo/3KM7guXkq3GSLQaDCj3pJGlEFW5IKdPOjQCfRj0TdktOJ5zY\nodYmmL4UX5n0wa/kkwNxFxFELQKBgQDY21OhmMLfKd0Mai4Wrn6c45duR9Bi+zUk\nnbeXpPHcU0592UUbHc2DBXVtBFWnXI1MxPJdMW4xrdd8UEpEpb4n2OYa+Xr3X65Z\naQotHFaPbx3gCP5Dcvx9griLGn7SeddjXXLsg4x1UeXpUDmbvDzbbx4SWpt2f/IJ\n+xwk36OFawKBgBHD65ypyi5+f2KKsRPUaNwkHZRB2MJ4XZQFgSC/zlLnPo8Mi0yd\ntbdT43baUR9rO75yBP4fsmP041hyGa0pRpCpwiGFAHumyAtsBwSDtisp/JDIThzw\nUp3sPviD8vUODdcvgGOPayKlK7DAeTVClDgaCxL55mvNmydhJrqSt6EFAoGAccYg\nipfrJcqA/xJ2O9Aw/X8q4+Epo8TIjP1yZU1U15OdismDSEbKnAMxKJEtnzEfsTdj\nMSHN/qKGe+JkFMAglCdoEp7xtPeuMZq6jBBiGb7inbgaLqkVb4Q17kVoZGUobCmL\nMiuSdbsSNOayUtLf2wDhdh+zkOhvxGzKx03OLSECgYEAoyhJRBaZ4nFqzs/QmA65\n210Ogt537tcKy6YbGBjjP+xBC7wmNgm7PQgJkt/IdlNyFywR7xgr8SbAv1K49iUR\nEuBvyLmEQSDhc0ZGhGJbZsqowoYYGud/2QEwJV6SNgR6xq96A3hXdsHqY8mfSwGe\nIQcmiwOvh509uP0PTJVdIY4=\n-----END PRIVATE KEY-----\n"
    })
  });
}

const db = admin.firestore();

async function check() {
  console.log("Checking gc_report_sessions...");
  const sessions = await db.collection('gc_report_sessions').get();
  console.log(`Found ${sessions.size} active sessions.`);
  sessions.forEach(doc => {
      console.log(`Session ${doc.id}: step=${doc.data().step}, pollSelections=`, doc.data().pollSelections);
  });

  console.log("\nChecking last 5 debug logs...");
  const logs = await db.collection('gc_bot_debug').orderBy('receivedAt', 'desc').limit(5).get();
  logs.forEach(doc => {
      const data = doc.data();
      console.log(`[${data.receivedAt.toDate().toISOString()}] Phone: ${data.fromPhone}, Text: "${data.text}", isFromMe: ${data.fromMe}, Type: ${data.responseType}`);
      if (data.responseType === 'poll') {
          console.log(`   Poll selections:`, data.payload?.selectedOptions);
      }
  });
}

check().catch(console.error);
