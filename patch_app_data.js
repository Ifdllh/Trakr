import fs from 'fs';

let useAppData = fs.readFileSync('src/hooks/useAppData.ts', 'utf8');
useAppData = useAppData.replace(/console\.error\(error\);\s*\n/g, "console.error(error);\n      const msg = error.response?.data?.error || error.message || 'Terjadi kesalahan';\n      showGlobalToast(msg, 'error');\n");
fs.writeFileSync('src/hooks/useAppData.ts', useAppData);
