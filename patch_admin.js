import fs from 'fs';
let code = fs.readFileSync('src/lib/firebase-admin.ts', 'utf8');

code = code.replace(/import \{ getFirestore \} from 'firebase-admin\/firestore';\n/g, "");
code = code.replace(/export const dbDev = getFirestore\(devApp\);\nexport const dbPrd = prdApp \? getFirestore\(prdApp\) : null;\n/g, "");

fs.writeFileSync('src/lib/firebase-admin.ts', code);
