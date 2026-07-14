import fs from 'fs';
let server = fs.readFileSync('server.ts', 'utf8');
server = server.replace(/amount: Number\(txData\.amount\) \|\| 0,/g, "amount: (isNaN(Number(txData.amount)) ? 0 : Number(txData.amount)) || 0,");
fs.writeFileSync('server.ts', server);
