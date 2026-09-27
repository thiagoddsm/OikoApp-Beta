const fs = require('fs');

function fix(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Mapping from corrupted UTF-8 (which is actually Latin-1 bytes decoded as UTF-8) to correct strings
  const replacements = {
    'Ã¡': 'á',
    'Ã ': 'à',
    'Ã¢': 'â',
    'Ã£': 'ã',
    'Ã¤': 'ä',
    'Ã©': 'é',
    'Ã¨': 'è',
    'Ãª': 'ê',
    'Ã«': 'ë',
    'Ã­': 'í',
    'Ã¬': 'ì',
    'Ã®': 'î',
    'Ã¯': 'ï',
    'Ã³': 'ó',
    'Ã²': 'ò',
    'Ã´': 'ô',
    'Ãµ': 'õ',
    'Ã¶': 'ö',
    'Ãº': 'ú',
    'Ã¹': 'ù',
    'Ã»': 'û',
    'Ã¼': 'ü',
    'Ã§': 'ç',
    'Ã±': 'ñ',
    'Ã': 'Á',
    'Ã€': 'À',
    'Ã‚': 'Â',
    'Ãƒ': 'Ã',
    'Ã„': 'Ä',
    'Ã‰': 'É',
    'Ãˆ': 'È',
    'ÃŠ': 'Ê',
    'Ã‹': 'Ë',
    'Ã': 'Í',
    'ÃŒ': 'Ì',
    'ÃŽ': 'Î',
    'Ã': 'Ï',
    'Ã“': 'Ó',
    'Ã’': 'Ò',
    'Ã”': 'Ô',
    'Ã•': 'Õ',
    'Ã–': 'Ö',
    'Ãš': 'Ú',
    'Ã™': 'Ù',
    'Ã›': 'Û',
    'Ãœ': 'Ü',
    'Ã‡': 'Ç',
    'Ã‘': 'Ñ'
  };

  for (const [bad, good] of Object.entries(replacements)) {
    content = content.split(bad).join(good);
  }

  // Also fix emojis if there are specific broken ones (like ðŸ‘‹ which is 👋)
  // Actually, wait, if I just replace the Latin characters, maybe that's enough? 
  // Let's also fix common emojis if we see them, or just let them be if they are too complex.
  content = content.replace(/ðŸ‘‹/g, '👋');
  content = content.replace(/ðŸ”„/g, '🔄');
  content = content.replace(/1ï¸\x8Fâƒ£/g, '1️⃣');
  content = content.replace(/2ï¸\x8Fâƒ£/g, '2️⃣');
  content = content.replace(/3ï¸\x8Fâƒ£/g, '3️⃣');
  content = content.replace(/ðŸ‘‰/g, '👉');
  content = content.replace(/ðŸ’¡/g, '💡');
  content = content.replace(/ðŸ“ˆ/g, '📈');
  content = content.replace(/ðŸ™\x8F/g, '🙏'); // 🙏 is usually F0 9F 99 8F -> ðŸ™
  content = content.replace(/ðŸ“/g, '📅'); // not exact but close
  content = content.replace(/ðŸ’/g, '💬');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Fixed', filePath);
}

fix('src/app/public/conectar/actions.ts');
fix('src/app/dashboard/engajamento/processos/page.tsx');
