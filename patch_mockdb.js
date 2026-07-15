const fs = require('fs');
let code = fs.readFileSync('src/lib/firebase-admin.ts', 'utf8');

code = code.replace(
  "async restSetDoc(path: string, data: any, options: any) {",
  "async restSetDoc(path: string, data: any, options: any) {\n    console.log('[MockDb] restSetDoc', path, JSON.stringify(data));"
);

fs.writeFileSync('src/lib/firebase-admin.ts', code);
