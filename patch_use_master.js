import fs from 'fs';

let useMaster = fs.readFileSync('src/services/useMasterData.ts', 'utf8');
useMaster = useMaster.replace(/return await masterDataService\.get\(collectionName\);/g, "const data = await masterDataService.get(collectionName);\n      return Array.isArray(data) ? data : [];");

fs.writeFileSync('src/services/useMasterData.ts', useMaster);
