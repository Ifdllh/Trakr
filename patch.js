import fs from 'fs';

let server = fs.readFileSync('server.ts', 'utf8');

const aiChatRegex = /app\.post\("\/api\/ai\/chat", requireAuth, async \(req: AuthRequest, res\) => \{[\s\S]*?\}\);/m;

const newAiChat = `
app.post("/api/ai/chat", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { message } = req.body;
      const userId = req.userId!;
      
      // Fetch data from Cloud SQL
      const [categories, periods, budgets] = await Promise.all([
        sqlDb.select().from(schema.masterCategories).where(eq(schema.masterCategories.userId, userId)),
        sqlDb.select().from(schema.masterPeriods).where(eq(schema.masterPeriods.userId, userId)),
        sqlDb.select().from(schema.globalBudgets).where(eq(schema.globalBudgets.userId, userId))
      ]);
      
      const txDate = new Date();
      const matchedPeriod = periods.find((p: any) => {
        if (!p.startDate || !p.endDate) return false;
        const start = new Date(p.startDate);
        const end = new Date(p.endDate);
        return txDate >= start && txDate <= end;
      });
      
      let currentSpendingData: any = {};
      if (matchedPeriod) {
        const transactions = await sqlDb.select()
          .from(schema.transactions)
          .where(and(eq(schema.transactions.userId, userId), eq(schema.transactions.periodId, matchedPeriod.id)));
          
        transactions.forEach((tx: any) => {
          if (tx.type !== 'Dr' && tx.type !== 'pengeluaran') return;
          const cat = tx.category || 'Unknown';
          const sub = tx.subcategory || 'Unknown';
          if (!currentSpendingData[cat]) currentSpendingData[cat] = {};
          if (!currentSpendingData[cat][sub]) currentSpendingData[cat][sub] = 0;
          currentSpendingData[cat][sub] += Number(tx.amount || 0);
        });
      }
      
      const masterDataContext = \`Categories: \${JSON.stringify(categories)}\nBudgets: \${JSON.stringify(budgets)}\nCurrent Spending: \${JSON.stringify(currentSpendingData)}\`;
      
      const aiInstance = getAI();
      if (!aiInstance) {
        return res.status(500).json({ error: "Gemini API key is not configured." });
      }
      
      const response = await aiInstance.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: [{ role: 'user', parts: [{ text: message }] }],
        config: {
          systemInstruction: \`You are Asisten Trakr. User input: \${message}\nCONTEXT:\${masterDataContext}. You must return UI Markdown and ---JSON_DATA--- with a transaction object if a transaction should be logged.\`
        }
      });
      
      const text = response.text;
      let markdown = text;
      let jsonData = null;
      if (text && text.includes('---JSON_DATA---')) {
        const parts = text.split('---JSON_DATA---');
        markdown = parts[0].trim();
        try {
          const jsonMatch = parts[1].match(/\\{[\\s\\S]*\\}/);
          jsonData = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(parts[1].trim());
          if (jsonData?.transaction) {
             const txData = jsonData.transaction;
             await sqlDb.insert(schema.transactions).values({
               userId,
               type: txData.type || 'Dr',
               amount: Number(txData.amount) || 0,
               category: txData.category || 'AI Logged',
               subcategory: txData.subcategory || '',
               description: txData.description || '',
               date: txDate.toISOString(),
               periodId: matchedPeriod ? matchedPeriod.id : null,
             });
          }
        } catch(e) {}
      }
      res.json({ markdown, jsonData });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
`;

server = server.replace(aiChatRegex, newAiChat.trim());
server = `import { db as sqlDb } from "./src/db/index.js";\nimport * as schema from "./src/db/schema.js";\nimport { eq, and } from "drizzle-orm";\n` + server;

fs.writeFileSync('server.ts', server);
