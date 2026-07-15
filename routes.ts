import { AuthRequest, requireAuth } from "./src/middleware/auth.js";
import { db } from "./src/db/index.js";
import { eq, and } from "drizzle-orm";
import { 
  users, 
  transactions, 
  masterCategories, 
  masterAccounts, 
  masterContacts, 
  masterTags, 
  masterPeriods, 
  masterAssets, 
  budgetAllocations, 
  globalBudgets 
} from "./src/db/schema.js";

const cleanPayload = (payload: any) => {
  const result = { ...payload };
  delete result.id;
  delete result.createdAt;
  delete result.updatedAt;
  
  const floatFields = ['amount', 'value', 'calculatedAmount', 'totalTargetAmount', 'balance', 'currentValue'];
  for (const field of floatFields) {
    if (result[field] !== undefined) {
      result[field] = parseFloat(result[field]) || 0;
    }
  }

  // Convert string IDs back to numbers for Postgres foreign keys where appropriate
  const intFields = ['accountId', 'destinationAccountId', 'assetId', 'tagId', 'contactId', 'periodId'];
  for (const field of intFields) {
    if (result[field] !== undefined && result[field] !== null) {
      const parsed = parseInt(result[field]);
      if (!isNaN(parsed)) {
        result[field] = parsed;
      } else {
        result[field] = null;
      }
    }
  }
  
  return result;
};

async function getPgUserId(firebaseUid: string): Promise<number> {
  const result = await db.select().from(users).where(eq(users.uid, firebaseUid)).limit(1);
  if (result.length > 0) {
    return result[0].id;
  }
  const newUsers = await db.insert(users).values({ uid: firebaseUid, email: 'unknown@example.com' }).returning();
  return newUsers[0].id;
}

const getTableForCollection = (collectionName: string) => {
  const map: Record<string, any> = {
    'customCategories': masterCategories,
    'categories': masterCategories,
    'customAccounts': masterAccounts,
    'accounts': masterAccounts,
    'customContacts': masterContacts,
    'contacts': masterContacts,
    'customTags': masterTags,
    'tags': masterTags,
    'customPeriods': masterPeriods,
    'periods': masterPeriods,
    'customAssets': masterAssets,
    'assets': masterAssets,
    'budgetAllocations': budgetAllocations,
    'budgets': budgetAllocations,
    'transactions': transactions,
    'globalBudgets': globalBudgets
  };
  return map[collectionName];
};

export function setupApiRoutes(app: any) {
  app.get("/api/masterdata/:collection", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const pgUserId = await getPgUserId(req.userId!);
      const table = getTableForCollection(req.params.collection);
      if (!table) return res.status(404).json({ error: "Collection not found" });
      
      const docs = await db.select().from(table).where(eq(table.userId, pgUserId));
      res.json(docs);
    } catch (e) {
      next(e);
    }
  });

  app.post("/api/masterdata/:collection", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const pgUserId = await getPgUserId(req.userId!);
      const table = getTableForCollection(req.params.collection);
      if (!table) return res.status(404).json({ error: "Collection not found" });
      
      const payload = cleanPayload(req.body);
      payload.userId = pgUserId;
      
      const inserted = await db.insert(table).values(payload).returning();
      res.json(inserted[0]);
    } catch (e) {
      next(e);
    }
  });

  app.put("/api/masterdata/:collection/:id", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const pgUserId = await getPgUserId(req.userId!);
      const table = getTableForCollection(req.params.collection);
      if (!table) return res.status(404).json({ error: "Collection not found" });
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

      const payload = cleanPayload(req.body);
      
      const updated = await db.update(table)
        .set(payload)
        .where(and(eq(table.id, id), eq(table.userId, pgUserId)))
        .returning();
        
      res.json(updated[0]);
    } catch (e) {
      next(e);
    }
  });

  app.delete("/api/masterdata/:collection/:id", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const pgUserId = await getPgUserId(req.userId!);
      const table = getTableForCollection(req.params.collection);
      if (!table) return res.status(404).json({ error: "Collection not found" });
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

      await db.delete(table).where(and(eq(table.id, id), eq(table.userId, pgUserId)));
      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  });

  app.get("/api/transactions", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const pgUserId = await getPgUserId(req.userId!);
      const docs = await db.select().from(transactions).where(eq(transactions.userId, pgUserId));
      res.json(docs);
    } catch (e) {
      next(e);
    }
  });

  app.post("/api/transactions", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const pgUserId = await getPgUserId(req.userId!);
      
      if (Array.isArray(req.body)) {
        const payloads = req.body.map(item => {
          const p = cleanPayload(item);
          p.userId = pgUserId;
          return p;
        });
        const inserted = await db.insert(transactions).values(payloads).returning();
        res.json(inserted);
      } else {
        const payload = cleanPayload(req.body);
        payload.userId = pgUserId;
        const inserted = await db.insert(transactions).values(payload).returning();
        res.json(inserted[0]);
      }
    } catch (e) {
      next(e);
    }
  });

  app.put("/api/transactions/:id", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const pgUserId = await getPgUserId(req.userId!);
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

      const payload = cleanPayload(req.body);
      
      const updated = await db.update(transactions)
        .set(payload)
        .where(and(eq(transactions.id, id), eq(transactions.userId, pgUserId)))
        .returning();
        
      res.json(updated[0]);
    } catch (e) {
      next(e);
    }
  });

  app.delete("/api/transactions/:id", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const pgUserId = await getPgUserId(req.userId!);
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

      await db.delete(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, pgUserId)));
      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  });
}
