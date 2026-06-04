const dotenv = require('dotenv');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env');
console.log('Resolvendo caminho do .env:', envPath);

dotenv.config({ path: envPath });

console.log('--- VARIÁVEIS CARREGADAS ---');
console.log('ASAAS_BASE_URL:', process.env.ASAAS_BASE_URL);
console.log('ASAAS_API_KEY (Existe?):', !!process.env.ASAAS_API_KEY);
if (process.env.ASAAS_API_KEY) {
  console.log('ASAAS_API_KEY (Primeiros 10 chars):', process.env.ASAAS_API_KEY.substring(0, 10));
}
