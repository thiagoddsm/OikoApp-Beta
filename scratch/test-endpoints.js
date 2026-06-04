async function test() {
  const baseUrl = 'https://api-v2.contaazul.com';
  
  const endpoints = [
    '/v1/receitas',
    '/v1/despesas',
    '/v1/financial-receivables',
    '/v1/financial-payables',
    '/v1/financeiro/contas-receber',
    '/v1/financeiro/contas-pagar',
    '/v1/revenue',
    '/v1/payables',
    '/v1/receivables',
    '/v1/sales'
  ];

  for (const endpoint of endpoints) {
    try {
      const url = `${baseUrl}${endpoint}`;
      console.log(`Testing GET ${url}...`);
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer dummy_token`,
          'Content-Type': 'application/json'
        }
      });
      console.log(`Status: ${res.status}`);
      console.log('----------------------------------------------------');
    } catch (err) {
      console.error(`Error on ${endpoint}:`, err.message);
    }
  }
  process.exit(0);
}

test();
