import { AuthRequest, requireAuth } from "./src/middleware/auth.js";
import { getFirestoreDb } from "./src/lib/firebase-admin.js";

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

const getCollectionName = (collectionName: string) => {
  const map: Record<string, string> = {
    'customCategories': 'customCategories',
    'customAccounts': 'customAccounts',
    'accounts': 'customAccounts',
    'customContacts': 'customContacts',
    'contacts': 'customContacts',
    'customTags': 'customTags',
    'tags': 'customTags',
    'customPeriods': 'customPeriods',
    'periods': 'customPeriods',
    'customAssets': 'customAssets',
    'assets': 'customAssets',
    'budgetAllocations': 'budgetAllocations',
    'budgets': 'budgetAllocations',
    'transactions': 'transactions',
    'globalBudgets': 'globalBudgets'
  };
  return map[collectionName] || collectionName;
};

export function setupApiRoutes(app: any) {
  // GET masterdata
  app.get("/api/masterdata/:collection", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const userId = req.userId!;
      const collectionName = getCollectionName(req.params.collection);
      
      const firestore = getFirestoreDb(req.authEnv || 'dev');
      const snapshot = await firestore.collection('users').doc(userId).collection(collectionName).get();
      const docs = snapshot.docs.map(doc => doc.data());
      res.json(docs);
    } catch (e) {
      next(e);
    }
  });

  // POST masterdata
  app.post("/api/masterdata/:collection", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const userId = req.userId!;
      const collectionName = getCollectionName(req.params.collection);
      
      const payload = cleanPayload(req.body);
      const id = Date.now() + Math.floor(Math.random() * 1000);
      const docData = { ...payload, id, userId, createdAt: new Date().toISOString() };
      
      const firestore = getFirestoreDb(req.authEnv || 'dev');
      await firestore.collection('users').doc(userId).collection(collectionName).doc(String(id)).set(docData);
      res.json(docData);
    } catch (e) {
      next(e);
    }
  });

  // PUT masterdata
  app.put("/api/masterdata/:collection/:id", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const userId = req.userId!;
      const collectionName = getCollectionName(req.params.collection);
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID format' });
      
      const payload = cleanPayload(req.body);
      delete payload.userId;
      
      const firestore = getFirestoreDb(req.authEnv || 'dev');
      const docRef = firestore.collection('users').doc(userId).collection(collectionName).doc(String(id));
      const docSnapshot = await docRef.get();
      if (!docSnapshot.exists) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      const currentData = docSnapshot.data() || {};
      const updatedData = { ...currentData, ...payload, updatedAt: new Date().toISOString() };
      await docRef.set(updatedData);
      res.json(updatedData);
    } catch (e) {
      next(e);
    }
  });

  // DELETE masterdata
  app.delete("/api/masterdata/:collection/:id", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const userId = req.userId!;
      const collectionName = getCollectionName(req.params.collection);
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID format' });
      
      const firestore = getFirestoreDb(req.authEnv || 'dev');
      await firestore.collection('users').doc(userId).collection(collectionName).doc(String(id)).delete();
      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  });

  // GET transactions
  app.get("/api/transactions", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const userId = req.userId!;
      const firestore = getFirestoreDb(req.authEnv || 'dev');
      const snapshot = await firestore.collection('users').doc(userId).collection('transactions').get();
      const docs = snapshot.docs.map(doc => doc.data());
      res.json(docs);
    } catch (e) {
      next(e);
    }
  });

  // POST transactions
  app.post("/api/transactions", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const userId = req.userId!;
      const firestore = getFirestoreDb(req.authEnv || 'dev');
      
      if (Array.isArray(req.body)) {
        const results = [];
        for (const item of req.body) {
          const payload = cleanPayload(item);
          const id = Date.now() + Math.floor(Math.random() * 1000);
          const docData = { ...payload, id, userId, createdAt: new Date().toISOString() };
          await firestore.collection('users').doc(userId).collection('transactions').doc(String(id)).set(docData);
          results.push(docData);
        }
        res.json(results);
      } else {
        const payload = cleanPayload(req.body);
        const id = Date.now() + Math.floor(Math.random() * 1000);
        const docData = { ...payload, id, userId, createdAt: new Date().toISOString() };
        await firestore.collection('users').doc(userId).collection('transactions').doc(String(id)).set(docData);
        res.json(docData);
      }
    } catch (e) {
      next(e);
    }
  });

  // PUT transactions
  app.put("/api/transactions/:id", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const userId = req.userId!;
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID format' });
      
      const payload = cleanPayload(req.body);
      delete payload.userId;
      
      const firestore = getFirestoreDb(req.authEnv || 'dev');
      const docRef = firestore.collection('users').doc(userId).collection('transactions').doc(String(id));
      const docSnapshot = await docRef.get();
      if (!docSnapshot.exists) {
        return res.status(404).json({ error: "Transaction not found" });
      }
      
      const currentData = docSnapshot.data() || {};
      const updatedData = { ...currentData, ...payload, updatedAt: new Date().toISOString() };
      await docRef.set(updatedData);
      res.json(updatedData);
    } catch (e) {
      next(e);
    }
  });

  // DELETE transactions
  app.delete("/api/transactions/:id", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const userId = req.userId!;
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID format' });
      
      const firestore = getFirestoreDb(req.authEnv || 'dev');
      await firestore.collection('users').doc(userId).collection('transactions').doc(String(id)).delete();
      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  });
}
