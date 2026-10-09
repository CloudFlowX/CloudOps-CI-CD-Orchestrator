const fs = require('fs');
let c = fs.readFileSync('CI-CD-backend/src/app.js', 'utf8');

c = c.replace(
  /origin: \[\s*"http:\/\/localhost:5173",\s*"http:\/\/localhost:5174",\s*"http:\/\/127\.0\.0\.1:5173",\s*\],/g,
  `origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5173",
      process.env.FRONTEND_URL,
    ].filter(Boolean),`
);

fs.writeFileSync('CI-CD-backend/src/app.js', c);
console.log('CORS fixed!');
