const fs = require('fs');

const updateFile = (path, replaceFn) => {
  let content = fs.readFileSync(path, 'utf8');
  content = replaceFn(content);
  fs.writeFileSync(path, content);
};

// 1. api.js
updateFile('CI-CD-Frontend/src/utils/api.js', c => 
  c.replace('const API_BASE = "/api/v1";', 'const API_BASE = import.meta.env.VITE_API_URL || "/api/v1";')
);

// 2. Auth Pages
const authReplace = c => c.replace(/http:\/\/localhost:5002\/api\/v1/g, '${import.meta.env.VITE_API_URL || "/api/v1"}').replace(/onClick=\{\(\) => window\.location\.href = '(\$\{.*?\}.*)'\}/g, "onClick={() => window.location.href = `$1`}");
updateFile('CI-CD-Frontend/src/pages/LoginPage.jsx', authReplace);
updateFile('CI-CD-Frontend/src/pages/RegisterPage.jsx', authReplace);

// 3. Socket.io
const socketPages = ['PipelinesPage.jsx', 'AlertsPage.jsx', 'MonitoringPage.jsx', 'LogsPage.jsx'];
socketPages.forEach(page => {
  updateFile(`CI-CD-Frontend/src/pages/${page}`, c => 
    c.replace(/io\("http:\/\/localhost:5002"/g, 'io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5002"')
  );
});

console.log('URLs updated!');
