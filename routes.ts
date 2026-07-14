import { AuthRequest, requireAuth } from "./src/middleware/auth.js";
import { db } from "./src/db/index.ts";
import * as schema from "./src/db/schema.ts";
import { eq, and } from "drizzle-orm";
import { getOrCreateUser } from "./src/db/users.ts";

const parseInteger = (val: any) => {
  if (val === null || val === undefined || val === '') return null;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? null : parsed;
};

const cleanPayload = (payload: any) => {
  const result = { ...payload };
  delete result.id;
  delete result.createdAt;
  delete result.updatedAt;
  
  // Cast foreign keys to integer if they exist
  const intFields = ['periodId', 'accountId', 'destinationAccountId', 'assetId', 'tagId', 'contactId', 'globalBudgetId'];
  for (const field of intFields) {
    if (result[field] !== undefined) {
      result[field] = parseInteger(result[field]);
    }
  }
  
  // Cast amounts to numbers
  const floatFields = ['amount', 'value', 'calculatedAmount', 'totalTargetAmount', 'balance', 'currentValue'];
  for (const field of floatFields) {
    if (result[field] !== undefined) {
      result[field] = parseFloat(result[field]) || 0;
    }
  }
  
  return result;
};

const getTable = (collectionName: string) => {
  const map: Record<string, any> = {
    'customCategories': schema.masterCategories,
    'customAccounts': schema.masterAccounts,
    'accounts': schema.masterAccounts,
    'customContacts': schema.masterContacts,
    'contacts': schema.masterContacts,
    'customTags': schema.masterTags,
    'tags': schema.masterTags,
    'customPeriods': schema.masterPeriods,
    'periods': schema.masterPeriods,
    'customAssets': schema.masterAssets,
    'assets': schema.masterAssets,
    'budgetAllocations': schema.budgetAllocations,
    'budgets': schema.budgetAllocations,
    'transactions': schema.transactions,
    'globalBudgets': schema.globalBudgets
  };
  return map[collectionName];
};

export function setupApiRoutes(app: any) {
  // GET masterdata
  app.get("/api/masterdata/:collection", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const table = getTable(req.params.collection);
      if (!table) return res.status(400).json({ error: 'Invalid collection name' });
      
      const dbUser = await getOrCreateUser(req.user.uid, req.user.email || '');
      const userId = dbUser.id;
      
      const docs = await db.select().from(table).where(eq(table.userId, userId));
      res.json(docs);
    } catch (e) {
      next(e);
    }
  });

  // POST masterdata
  app.post("/api/masterdata/:collection", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const table = getTable(req.params.collection);
      if (!table) return res.status(400).json({ error: 'Invalid collection name' });
      
      const dbUser = await getOrCreateUser(req.user.uid, req.user.email || '');
      const userId = dbUser.id;
      
      const payload = cleanPayload(req.body);
      const docData = { ...payload, userId };
      
      const inserted = await db.insert(table).values(docData).returning();
      res.json(inserted[0]);
    } catch (e) {
      next(e);
    }
  });

  // PUT masterdata
  app.put("/api/masterdata/:collection/:id", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const table = getTable(req.params.collection);
      if (!table) return res.status(400).json({ error: 'Invalid collection name' });
      
      const dbUser = await getOrCreateUser(req.user.uid, req.user.email || '');
      const userId = dbUser.id;
      
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID format' });
      
      const payload = cleanPayload(req.body);
      delete payload.userId;
      
      const updated = await db.update(table)
        .set(payload)
        .where(and(eq(table.id, id), eq(table.userId, userId)))
        .returning();
      
      if (updated.length === 0) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.json(updated[0]);
    } catch (e) {
      next(e);
    }
  });

  // DELETE masterdata
  app.delete("/api/masterdata/:collection/:id", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const table = getTable(req.params.collection);
      if (!table) return res.status(400).json({ error: 'Invalid collection name' });
      
      const dbUser = await getOrCreateUser(req.user.uid, req.user.email || '');
      const userId = dbUser.id;
      
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID format' });
      
      await db.delete(table).where(and(eq(table.id, id), eq(table.userId, userId)));
      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  });

  // GET transactions
  app.get("/api/transactions", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const dbUser = await getOrCreateUser(req.user.uid, req.user.email || '');
      const userId = dbUser.id;
      
      const docs = await db.select().from(schema.transactions).where(eq(schema.transactions.userId, userId));
      res.json(docs);
    } catch (e) {
      next(e);
    }
  });

  // POST transactions
  app.post("/api/transactions", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const dbUser = await getOrCreateUser(req.user.uid, req.user.email || '');
      const userId = dbUser.id;
      
      if (Array.isArray(req.body)) {
        const results = [];
        for (const item of req.body) {
          const payload = cleanPayload(item);
          const inserted = await db.insert(schema.transactions).values({ ...payload, userId }).returning();
          results.push(inserted[0]);
        }
        res.json(results);
      } else {
        const payload = cleanPayload(req.body);
        const inserted = await db.insert(schema.transactions).values({ ...payload, userId }).returning();
        res.json(inserted[0]);
      }
    } catch (e) {
      next(e);
    }
  });

  // PUT transactions
  app.put("/api/transactions/:id", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const dbUser = await getOrCreateUser(req.user.uid, req.user.email || '');
      const userId = dbUser.id;
      
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID format' });
      
      const payload = cleanPayload(req.body);
      delete payload.userId;
      
      const updated = await db.update(schema.transactions)
        .set(payload)
        .where(and(eq(schema.transactions.id, id), eq(schema.transactions.userId, userId)))
        .returning();
        
      if (updated.length === 0) {
        return res.status(404).json({ error: "Transaction not found" });
      }
      res.json(updated[0]);
    } catch (e) {
      next(e);
    }
  });

  // DELETE transactions
  app.delete("/api/transactions/:id", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const dbUser = await getOrCreateUser(req.user.uid, req.user.email || '');
      const userId = dbUser.id;
      
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID format' });
      
      await db.delete(schema.transactions).where(and(eq(schema.transactions.id, id), eq(schema.transactions.userId, userId)));
      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  });
}
