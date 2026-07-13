import fs from 'fs';

let code = fs.readFileSync('src/features/transactions/CategoryManager.tsx', 'utf8');

code = code.replace(/import \{ api \} from '@\/lib\/api';/, `import { api } from '@/lib/api';\nimport { masterDataService } from '@/services/dbServices';`);

code = code.replace(
  /await api\.post\('\/categories\/delete-subcategory', \{ categoryId: cat\.id, subcategoryName: subName \}\);/g,
  `
        const newSubs = (cat.subcategories || []).filter((s: string) => s !== subName);
        await masterDataService.save('customCategories', { ...cat, subcategories: newSubs }, cat.id);
  `
);

code = code.replace(
  /await api\.post\('\/categories\/rename-subcategory', \{ categoryId: cat\.id, oldName, newName \}\);/g,
  `
        const newSubs = (cat.subcategories || []).map((s: string) => s === oldName ? newName : s);
        await masterDataService.save('customCategories', { ...cat, subcategories: newSubs }, cat.id);
  `
);

fs.writeFileSync('src/features/transactions/CategoryManager.tsx', code);
