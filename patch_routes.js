import fs from 'fs';

let routes = fs.readFileSync('routes.ts', 'utf8');

// replace parseInt with validation
routes = routes.replace(/const id = parseInt\(req\.params\.id, 10\);/g, "const id = parseInt(req.params.id, 10);\n      if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID format' });");

fs.writeFileSync('routes.ts', routes);
