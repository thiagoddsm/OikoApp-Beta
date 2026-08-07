const https = require('https');

function testWebhook() {
  const data = JSON.stringify({
    event: 'PAYMENT_RECEIVED',
    payment: { id: 'test_pay_123' }
  });

  const options = {
    hostname: 'oiko.app',
    port: 443,
    path: '/api/asaas/webhook/?tenantId=w3m93SHQeBRhiDnt7208',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length,
      'User-Agent': 'Asaas-Webhook-Test/1.0'
    }
  };

  console.log('Enviando POST de teste para https://oiko.app/api/asaas/webhook ...');

  const req = https.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode} ${res.statusMessage}`);
    console.log('HEADERS:', JSON.stringify(res.headers, null, 2));

    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
      console.log('BODY:', body);
    });
  });

  req.on('error', (e) => {
    console.error('ERRO:', e);
  });

  req.write(data);
  req.end();
}

testWebhook();
