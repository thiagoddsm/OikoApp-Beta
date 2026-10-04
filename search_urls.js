const fs = require('fs');
const path = require('path');
function find(dir) {
  let res = [];
  const files = fs.readdirSync(dir);
  for(let f of files) {
    if(f === 'node_modules' || f === '.next') continue;
    const p = path.join(dir, f);
    if(fs.statSync(p).isDirectory()) res = res.concat(find(p));
    else if(p.endsWith('.tsx') || p.endsWith('.ts')) {
      const content = fs.readFileSync(p, 'utf8');
      const matches = content.match(/https?:\/\/[^\s"'\`]+/g);
      if(matches) res = res.concat(matches);
    }
  }
  return res;
}
console.log(Array.from(new Set(find('./src'))).filter(u => u.toLowerCase().includes('shape') || u.toLowerCase().includes('don') || u.toLowerCase().includes('form') || u.toLowerCase().includes('test') || u.toLowerCase().includes('ibmanha')));
