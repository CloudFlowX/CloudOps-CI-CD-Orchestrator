const fs = require('fs');
let c = fs.readFileSync('CI-CD-Frontend/src/utils/api.js', 'utf8');

c = c.replace(
  /import\.meta\.env\.VITE_API_URL \|\| "\/api\/v1"/g,
  "(import.meta.env.VITE_API_URL || '/api/v1').replace(/\\/$/, '')"
);

fs.writeFileSync('CI-CD-Frontend/src/utils/api.js', c);
console.log('Frontend Trailing slashes fixed!');
