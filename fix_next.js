const fs = require('fs');
let c = fs.readFileSync('next.config.ts', 'utf8');
c = c.replace(/async rewrites\(\) \{[\s\S]*permanent: true,\r?\n      \},\r?\n    \];\r?\n  \}/g,
`async rewrites() {
    return [
      {
        source: '/hangout',
        destination: '/public/hangout',
      },
      {
        source: '/hangout/painel',
        destination: '/public/hangout/painel',
      },
      {
        source: '/molde-de-servo',
        destination: '/molde-de-servo.html',
      }
    ];
  },

  async redirects() {
    return [
      {
        source: '/enrollment',
        destination: '/public/enrollment',
        permanent: true,
      },
      {
        source: '/teste-shape.html',
        destination: '/molde-de-servo',
        permanent: true,
      }
    ];
  }`);
fs.writeFileSync('next.config.ts', c);
