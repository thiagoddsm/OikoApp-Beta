import fs from 'fs';
import path from 'path';

function run() {
  const filePath = 'C:\\Users\\user\\Downloads\\RelatorioEmCsv_4000_f34492c7-5041-43d4-b545-4bfcbe261e9c.csv';
  const content = fs.readFileSync(filePath, 'utf8');
  
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  
  const bairros = new Set<string>();
  let totalRows = 0;

  // skip header
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(';');
    const bairro = parts[0]?.trim()?.toUpperCase();
    
    // Ignore empty and "Não informado" equivalents if any
    if (bairro && bairro !== '') {
      // Remover parenteses tipo "NEVES (NEVES)" para ficar só "NEVES" se quiser,
      // mas vamos contar os originais
      // let cleanBairro = bairro.replace(/\(.*\)/g, '').trim();
      let cleanBairro = bairro.split('(')[0].trim();
      bairros.add(cleanBairro);
      totalRows++;
    }
  }

  console.log(`Linhas de GCs com bairro: ${totalRows}`);
  console.log(`Bairros Únicos alcançados: ${bairros.size}`);
  console.log(`Lista de Bairros:\n${Array.from(bairros).sort().join(', ')}`);
}

run();
