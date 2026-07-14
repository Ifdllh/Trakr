import fs from 'fs';

let content = fs.readFileSync('src/features/reports/Dashboard.tsx', 'utf8');

// remove variables
content = content.replace(/const \[editingBudget, setEditingBudget\] = useState<any>\(null\);\n/g, '');
content = content.replace(/const hasInitializedPeriod = useRef\(false\);\n/g, '');
content = content.replace(/const \[copied, setCopied\] = useState\(false\);\n/g, '');
content = content.replace(/const \[searchQuery, setSearchQuery\] = useState\(''\);\n/g, '');
content = content.replace(/const availableYears = useMemo\(\(\) => \{\n[\s\S]*?return years;\n  \}, \[transactions\]\);\n/g, '');
content = content.replace(/const handleSaveBudget = \(\) => \{[\s\S]*?setEditingBudget\(null\);\n  \};\n/g, '');
content = content.replace(/const handleCopyCard = \(\) => \{[\s\S]*?\}, 2000\);\n  \};\n/g, '');
content = content.replace(/const budgetPercentage = totalBudget > 0 \? Math\.min\(\(totalExpenses \/ totalBudget\) \* 100, 100\) : 0;\n/g, '');
content = content.replace(/const handleSearchSubmit = \(e: React\.FormEvent\) => \{\n    e\.preventDefault\(\);\n  \};\n/g, '');

fs.writeFileSync('src/features/reports/Dashboard.tsx', content);
