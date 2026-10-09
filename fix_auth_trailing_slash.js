const fs = require('fs');

const updateFile = (path) => {
  let c = fs.readFileSync(path, 'utf8');
  c = c.replace(
    /\$\{import\.meta\.env\.VITE_API_URL \|\| "\/api\/v1"\}/g,
    "${(import.meta.env.VITE_API_URL || '/api/v1').replace(/\\/$/, '')}"
  );
  fs.writeFileSync(path, c);
};

updateFile('CI-CD-Frontend/src/pages/LoginPage.jsx');
updateFile('CI-CD-Frontend/src/pages/RegisterPage.jsx');
console.log('Auth pages fixed!');
