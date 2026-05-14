// This script creates the public/tecnica/index.html file
// Run with: node scripts/create-tecnica.js

const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'public', 'tecnica');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const html = `PLACEHOLDER`;

fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf-8');
console.log('Created public/tecnica/index.html');
