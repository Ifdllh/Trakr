import fs from 'fs';

let useAppData = fs.readFileSync('src/hooks/useAppData.ts', 'utf8');

const regex = /set([A-Za-z]+)\(([a-zA-Z]+Res)\.map/g;
useAppData = useAppData.replace(regex, "set$1((Array.isArray($2) ? $2 : []).map");

fs.writeFileSync('src/hooks/useAppData.ts', useAppData);
