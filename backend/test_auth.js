const http = require('http');

const postData = JSON.stringify({
    email: 'test@example.com',
    password: 'password123'
});

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/register',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

const req = http.request(options, (res) => {
    console.log(\`STATUS: \${res.statusCode}\`);
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log(\`BODY: \${chunk}\`);
  });
});

req.on('error', (e) => {
  console.error(\`problem with request: \${e.message}\`);
});

req.write(postData);
req.end();
