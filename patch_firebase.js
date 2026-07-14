import fs from 'fs';
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');

// Remove firestore imports
code = code.replace(/import \{ initializeFirestore, doc, getDocFromServer, Firestore \} from 'firebase\/firestore';\n/g, "");

// Remove everything from "// Initialize Firestore for Dev App" to the end of file
code = code.split('// Initialize Firestore for Dev App')[0];

fs.writeFileSync('src/lib/firebase.ts', code);
