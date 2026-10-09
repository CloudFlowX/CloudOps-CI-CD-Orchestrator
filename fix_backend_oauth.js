const fs = require('fs');
let c = fs.readFileSync('CI-CD-backend/src/controllers/oauth.controller.js', 'utf8');
c = c.replace(/http:\/\/localhost:5002/g, '${process.env.BACKEND_URL || "http://localhost:5002"}');
fs.writeFileSync('CI-CD-backend/src/controllers/oauth.controller.js', c);
console.log('Backend OAuth URLs fixed!');
