import fs from 'fs';
let tsconfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
delete tsconfig.compilerOptions.noUnusedLocals;
delete tsconfig.compilerOptions.noUnusedParameters;
fs.writeFileSync('tsconfig.json', JSON.stringify(tsconfig, null, 2));
