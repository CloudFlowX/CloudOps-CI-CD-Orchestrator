const fs = require('fs');
let c = fs.readFileSync('CI-CD-backend/src/controllers/oauth.controller.js', 'utf8');

c = c.replace(
  /\$\{process\.env\.BACKEND_URL \|\| "http:\/\/localhost:5002"\}/g,
  "${(process.env.BACKEND_URL || 'http://localhost:5002').replace(/\\/$/, '')}"
);

c = c.replace(
  /\$\{process\.env\.FRONTEND_URL \|\| "http:\/\/localhost:5173"\}/g,
  "${(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\\/$/, '')}"
);

c = c.replace(
  /\$\{FRONTEND_URL\}/g,
  "${FRONTEND_URL.replace(/\\/$/, '')}"
);

fs.writeFileSync('CI-CD-backend/src/controllers/oauth.controller.js', c);
console.log('Trailing slashes fixed!');
