const http = require('http');

const options = {
  hostname: 'localhost',
  port: 9002,
  path: '/enrollment',
  method: 'HEAD'
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers, null, 2)}`);
  process.exit(0);
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
  process.exit(1);
});

req.end();
