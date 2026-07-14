import { AuthRequest, requireAuth } from "./src/middleware/auth.js";
import { getFirestoreDb } from "./src/lib/firebase-admin.js";

const cleanPayload = (payload: any) => {
  const result = { ...payload };
  delete result.id;
  delete result.createdAt;
  delete result.updatedAt;
  
  // Cast amounts to numbers
  const floatFields = ['amount', 'value', 'calculatedAmount', 'totalTargetAmount', 'balance', 'currentValue'];
  for (const field of floatFields) {
    if (result[field] !== undefined) {
      result[field] = parseFloat(result[field]) || 0;
    }
  }
  
  return result;
};

const getFirestoreCollection = (req: AuthRequest, collectionName: string) => {
  const db = getFirestoreDb(req.authEnv || 'dev');
  const userId = req.userId!;
  
  const map: Record<string, string> = {
    'customCategories': 'customCategories',
    'customAccounts': 'accounts',
    'accounts': 'accounts',
    'customContacts': 'contacts',
    'contacts': 'contacts',
    'customTags': 'tags',
    'tags': 'tags',
    'customPeriods': 'periods',
    'periods': 'periods',
    'customAssets': 'assets',
    'assets': 'assets',
    'budgetAllocations': 'budgets',
    'budgets': 'budgets',
    'transactions': 'transactions',
    'globalBudgets': 'globalBudgets'
  };
  
  const mappedName = map[collectionName] || collectionName;
  return db.collection('users').doc(userId).collection(mappedName);
};

export function setupApiRoutes(app: any) {
  // GET masterdata
  app.get("/api/masterdata/:collection", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const colRef = getFirestoreCollection(req, req.params.collection);
      const snapshot = await colRef.get();
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(docs);
    } catch (e) {
      next(e);
    }
  });

  // POST masterdata
  app.post("/api/masterdata/:collection", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const colRef = getFirestoreCollection(req, req.params.collection);
      const payload = cleanPayload(req.body);
      const docData = { 
        ...payload, 
        createdAt: new Date().toISOString() 
      };
      
      const docRef = await colRef.add(docData);
      res.json({ id: docRef.id, ...docData });
    } catch (e) {
      next(e);
    }
  });

  // PUT masterdata
  app.put("/api/masterdata/:collection/:id", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const colRef = getFirestoreCollection(req, req.params.collection);
      const id = req.params.id;
      const payload = cleanPayload(req.body);
      
      const docData = { 
        ...payload, 
        updatedAt: new Date().toISOString() 
      };
      
      await colRef.doc(id).set(docData, { merge: true });
      const updatedDoc = await colRef.doc(id).get();
      res.json({ id: updatedDoc.id, ...updatedDoc.data() });
    } catch (e) {
      next(e);
    }
  });

  // DELETE masterdata
  app.delete("/api/masterdata/:collection/:id", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const colRef = getFirestoreCollection(req, req.params.collection);
      const id = req.params.id;
      await colRef.doc(id).delete();
      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  });

  // GET transactions
  app.get("/api/transactions", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const colRef = getFirestoreCollection(req, "transactions");
      const snapshot = await colRef.get();
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(docs);
    } catch (e) {
      next(e);
    }
  });

  // POST transactions
  app.post("/api/transactions", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const colRef = getFirestoreCollection(req, "transactions");
      
      if (Array.isArray(req.body)) {
        const results = [];
        const dbInstance = getFirestoreDb(req.authEnv || 'dev');
        const batch = dbInstance.batch();
        
        for (const item of req.body) {
          const payload = cleanPayload(item);
          const docRef = colRef.doc();
          const docData = {
            ...payload,
            createdAt: new Date().toISOString()
          };
          batch.set(docRef, docData);
          results.push({ id: docRef.id, ...docData });
        }
        await batch.commit();
        res.json(results);
      } else {
        const payload = cleanPayload(req.body);
        const docData = {
          ...payload,
          createdAt: new Date().toISOString()
        };
        const docRef = await colRef.add(docData);
        res.json({ id: docRef.id, ...docData });
      }
    } catch (e) {
      next(e);
    }
  });

  // PUT transactions
  app.put("/api/transactions/:id", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const colRef = getFirestoreCollection(req, "transactions");
      const id = req.params.id;
      const payload = cleanPayload(req.body);
      
      const docData = {
        ...payload,
        updatedAt: new Date().toISOString()
      };
      
      await colRef.doc(id).set(docData, { merge: true });
      const updatedDoc = await colRef.doc(id).get();
      res.json({ id: updatedDoc.id, ...updatedDoc.data() });
    } catch (e) {
      next(e);
    }
  });

  // DELETE transactions
  app.delete("/api/transactions/:id", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const colRef = getFirestoreCollection(req, "transactions");
      const id = req.params.id;
      await colRef.doc(id).delete();
      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  });
}
