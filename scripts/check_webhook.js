require('dotenv').config({ path: './.env' });

async function checkWebhooks() {
  const url = `${process.env.WHATSAPP_SERVER_URL}/webhook/find/${process.env.WHATSAPP_INSTANCE_KEY}`;
  console.log(`Fetching from: ${url}`);
  try {
    const res = await fetch(url, {
      headers: { 'apikey': 'AIzaSyDeMWIHIDKVeQV97Qc4HlraUtfFSwBonmA' } // Using random API key from env or global? Wait, no global apikey.
    });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e);
  }
}

checkWebhooks();
