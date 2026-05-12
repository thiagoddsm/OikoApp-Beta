const fs = require('fs');
const file = 'src/app/dashboard/notifications/page.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/setIsRefreshing\(false\);\s*\}\s*\};\s*useEffect/g, 'setIsRefreshing(false);\n        }\n    }, [config, waKey, toast]);\n\n    useEffect');
fs.writeFileSync(file, content);
