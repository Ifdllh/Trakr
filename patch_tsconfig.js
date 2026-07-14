import fs from 'fs';
let tsconfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
tsconfig.compilerOptions.noUnusedLocals = true;
// tsconfig.compilerOptions.noUnusedParameters = true; // might be too noisy
fs.writeFileSync('tsconfig.json', JSON.stringify(tsconfig, null, 2));
