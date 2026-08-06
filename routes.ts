import { AuthRequest, requireAuth } from "./src/middleware/auth.js";
import { getFirestoreDb } from "./src/lib/firebase-admin.js";

const cleanPayload = (payload: any) => {
  const result = { ...payload };
  delete result.id;
  delete result.createdAt;
  delete result.updatedAt;
  
  const floatFields = ['amount', 'value', 'calculatedAmount', 'totalTargetAmount', 'balance', 'currentValue'];
  for (const field of floatFields) {
    if (result[field] !== undefined && result[field] !== null) {
      result[field] = parseFloat(result[field]) || 0;
    }
  }
  
  return result;
};

const getFirestoreCollectionName = (collectionName: string): string => {
  const map: Record<string, string> = {
    'customCategories': 'customCategories',
    'categories': 'customCategories',
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
  return map[collectionName] || collectionName;
};

const getCollectionRef = (authEnv: 'dev' | 'prd', userId: string, collectionName: string) => {
  const db = getFirestoreDb(authEnv);
  const firestoreCollection = getFirestoreCollectionName(collectionName);
  return db.collection('users').doc(userId).collection(firestoreCollection);
};

const getDocs = async (colRef: any) => {
  const snapshot = await colRef.get();
  const docs = snapshot.docs || [];
  return docs.map((doc: any) => {
    const data = typeof doc.data === 'function' ? doc.data() : doc;
    return {
      id: doc.id,
      ...data
    };
  });
};

const getDoc = async (docRef: any) => {
  const snap = await docRef.get();
  if (!snap.exists) return null;
  const data = typeof snap.data === 'function' ? snap.data() : snap;
  return {
    id: snap.id,
    ...data
  };
};

export function setupApiRoutes(app: any) {
  app.get("/api/user/profile", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const db = getFirestoreDb(req.authEnv!);
      const userDocRef = db.collection('users').doc(req.userId!);
      const docSnap = await userDocRef.get();
      const firestoreData = docSnap.exists ? docSnap.data() : {};
      res.json({
        displayName: firestoreData?.displayName || '',
        phoneNumber: firestoreData?.phoneNumber || '',
        monthlyBudget: parseFloat(firestoreData?.monthlyBudget) || 0,
        currency: firestoreData?.currency || 'IDR - Rupiah',
        financialStartDay: parseInt(firestoreData?.financialStartDay) || 1,
        firstDayOfWeek: firestoreData?.firstDayOfWeek || 'Senin',
        autoCreatePeriods: firestoreData?.autoCreatePeriods ?? false,
        photoURL: firestoreData?.photoURL || '',
        language: firestoreData?.language || 'id'
      });
    } catch (e: any) {
      if (e?.message?.includes('429') || e?.message?.includes('Quota') || e?.code === 429) {
        console.warn('Firebase Quota Exceeded. Returning empty result.');
        res.status(429).json({ error: "Firebase Quota Exceeded. Please try again later." });
      } else {
        next(e);
      }
    }
  });

  app.put("/api/user/profile", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const db = getFirestoreDb(req.authEnv!);
      const userDocRef = db.collection('users').doc(req.userId!);
      const docSnap = await userDocRef.get();
      const exists = docSnap.exists;
      const firestoreData = exists ? (typeof docSnap.data === 'function' ? docSnap.data() : docSnap) : {};

      const { displayName, phoneNumber, monthlyBudget, photoURL, financialStartDay, firstDayOfWeek, autoCreatePeriods, language } = req.body;
      const updateData: any = {};
      
      updateData.uid = firestoreData.uid || req.userId!;
      updateData.email = firestoreData.email || req.user?.email || 'guest@example.com';
      updateData.createdAt = firestoreData.createdAt || new Date().toISOString();

      if (displayName !== undefined) updateData.displayName = displayName;
      if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
      if (monthlyBudget !== undefined) updateData.monthlyBudget = parseFloat(monthlyBudget) || 0;
      if (photoURL !== undefined) updateData.photoURL = photoURL;
      if (financialStartDay !== undefined) updateData.financialStartDay = parseInt(financialStartDay) || 1;
      if (firstDayOfWeek !== undefined) updateData.firstDayOfWeek = firstDayOfWeek;
      if (autoCreatePeriods !== undefined) updateData.autoCreatePeriods = autoCreatePeriods === true || autoCreatePeriods === 'true';
      if (language !== undefined) updateData.language = language;
      
      await userDocRef.set(updateData, { merge: true });
      res.json({ success: true, ...updateData });
    } catch (e: any) {
      if (e?.message?.includes('429') || e?.message?.includes('Quota') || e?.code === 429) {
        console.warn('Firebase Quota Exceeded. Returning empty result.');
        res.status(429).json({ error: "Firebase Quota Exceeded. Please try again later." });
      } else {
        next(e);
      }
    }
  });

  app.get("/api/masterdata/:collection", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const colRef = getCollectionRef(req.authEnv!, req.userId!, req.params.collection);
      const docs = await getDocs(colRef);
      res.json(docs);
    } catch (e: any) {
      if (e?.message?.includes('429') || e?.message?.includes('Quota') || e?.code === 429) {
        console.warn('Firebase Quota Exceeded. Returning empty result.');
        res.status(429).json({ error: "Firebase Quota Exceeded. Please try again later." });
      } else {
        next(e);
      }
    }
  });

  app.post("/api/masterdata/:collection", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const colRef = getCollectionRef(req.authEnv!, req.userId!, req.params.collection);
      
      if (Array.isArray(req.body)) {
        const results = [];
        for (const item of req.body) {
          const payload = cleanPayload(item);
          payload.createdAt = new Date().toISOString();
          payload.updatedAt = new Date().toISOString();
          const docId = Math.random().toString(36).substring(2, 15);
          const docRef = colRef.doc(docId);
          await docRef.set(payload);
          results.push({ id: docId, ...payload, _status: "async_processing_started" });
        }
        res.json(results);
      } else {
        const payload = cleanPayload(req.body);
        payload.createdAt = new Date().toISOString();
        payload.updatedAt = new Date().toISOString();
        const docId = Math.random().toString(36).substring(2, 15);
        const docRef = colRef.doc(docId);
        await docRef.set(payload);
        
        res.json({ id: docId, ...payload, _status: "async_processing_started" });
      }

      const runBackgroundJob = async () => {
        try {
           await new Promise(resolve => setTimeout(resolve, 2000));
           console.log(`[Background Job] Processed CREATE for ${req.params.collection}`);
        } catch (jobErr) {
           console.error("[Background Job Error]:", jobErr);
        }
      };
      runBackgroundJob().catch(console.error);
    } catch (e: any) {
      if (e?.message?.includes('429') || e?.message?.includes('Quota') || e?.code === 429) {
        console.warn('Firebase Quota Exceeded. Returning empty result.');
        res.status(429).json({ error: "Firebase Quota Exceeded. Please try again later." });
      } else {
        next(e);
      }
    }
  });

  app.put("/api/masterdata/:collection/:id", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const colRef = getCollectionRef(req.authEnv!, req.userId!, req.params.collection);
      const docId = req.params.id;
      const docRef = colRef.doc(docId);
      const existingDoc = await getDoc(docRef);
      if (!existingDoc) return res.status(404).json({ error: "Document not found" });

      const payload = cleanPayload(req.body);
      payload.updatedAt = new Date().toISOString();
      if (existingDoc && existingDoc.createdAt) {
        payload.createdAt = existingDoc.createdAt;
      }

      await docRef.set(payload, { merge: true });
      
      res.json({ id: docId, ...existingDoc, ...payload, _status: "async_processing_started" });

      const runBackgroundJob = async () => {
        try {
           await new Promise(resolve => setTimeout(resolve, 2000));
           console.log(`[Background Job] Processed UPDATE for ${req.params.collection} ${docId}`);
        } catch (jobErr) {
           console.error("[Background Job Error]:", jobErr);
        }
      };
      runBackgroundJob().catch(console.error);
    } catch (e: any) {
      if (e?.message?.includes('429') || e?.message?.includes('Quota') || e?.code === 429) {
        console.warn('Firebase Quota Exceeded. Returning empty result.');
        res.status(429).json({ error: "Firebase Quota Exceeded. Please try again later." });
      } else {
        next(e);
      }
    }
  });

  app.delete("/api/masterdata/:collection/:id", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const colRef = getCollectionRef(req.authEnv!, req.userId!, req.params.collection);
      const docId = req.params.id;
      const docRef = colRef.doc(docId);
      await docRef.delete();
      
      res.json({ success: true, id: docId, _status: "async_processing_started" });

      const runBackgroundJob = async () => {
        try {
           await new Promise(resolve => setTimeout(resolve, 2000));
           console.log(`[Background Job] Processed DELETE for ${req.params.collection} ${docId}`);
        } catch (jobErr) {
           console.error("[Background Job Error]:", jobErr);
        }
      };
      runBackgroundJob().catch(console.error);
    } catch (e: any) {
      if (e?.message?.includes('429') || e?.message?.includes('Quota') || e?.code === 429) {
        console.warn('Firebase Quota Exceeded. Returning empty result.');
        res.status(429).json({ error: "Firebase Quota Exceeded. Please try again later." });
      } else {
        next(e);
      }
    }
  });

  app.get("/api/transactions", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const colRef = getCollectionRef(req.authEnv!, req.userId!, 'transactions');
      const docs = await getDocs(colRef);
      res.json(docs);
    } catch (e: any) {
      if (e?.message?.includes('429') || e?.message?.includes('Quota') || e?.code === 429) {
        console.warn('Firebase Quota Exceeded. Returning empty result.');
        res.status(429).json({ error: "Firebase Quota Exceeded. Please try again later." });
      } else {
        next(e);
      }
    }
  });

  app.post("/api/transactions", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const colRef = getCollectionRef(req.authEnv!, req.userId!, 'transactions');
      
      if (Array.isArray(req.body)) {
        const results = [];
        for (const item of req.body) {
          const payload = cleanPayload(item);
          payload.createdAt = new Date().toISOString();
          payload.updatedAt = new Date().toISOString();
          const docId = Math.random().toString(36).substring(2, 15);
          const docRef = colRef.doc(docId);
          await docRef.set(payload);
          results.push({ id: docId, ...payload, _status: "async_processing_started" });
        }
        res.json(results);
      } else {
        const payload = cleanPayload(req.body);
        payload.createdAt = new Date().toISOString();
        payload.updatedAt = new Date().toISOString();
        const docId = Math.random().toString(36).substring(2, 15);
        const docRef = colRef.doc(docId);
        await docRef.set(payload);
        res.json({ id: docId, ...payload, _status: "async_processing_started" });
      }

      const runBackgroundJob = async () => {
        try {
           await new Promise(resolve => setTimeout(resolve, 2000));
           console.log(`[Background Job] Processed CREATE for transactions`);
        } catch (jobErr) {
           console.error("[Background Job Error]:", jobErr);
        }
      };
      runBackgroundJob().catch(console.error);
    } catch (e: any) {
      if (e?.message?.includes('429') || e?.message?.includes('Quota') || e?.code === 429) {
        console.warn('Firebase Quota Exceeded. Returning empty result.');
        res.status(429).json({ error: "Firebase Quota Exceeded. Please try again later." });
      } else {
        next(e);
      }
    }
  });

  app.put("/api/transactions/:id", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const colRef = getCollectionRef(req.authEnv!, req.userId!, 'transactions');
      const goalColRef = getCollectionRef(req.authEnv!, req.userId!, 'savingsGoals');
      const docId = req.params.id;
      const docRef = colRef.doc(docId);
      const payload = cleanPayload(req.body);

      const txSnap = await docRef.get();
      if (!txSnap || txSnap.exists === false) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      const oldTxData = typeof txSnap.data === 'function' ? txSnap.data() : txSnap;
      const newTxData = { ...oldTxData, ...payload };

      // Determine old savingsGoalId
      let oldGoalId = oldTxData?.savingsGoalId;
      const oldAmount = Number(oldTxData?.amount) || 0;
      const oldType = (oldTxData?.type || '').toLowerCase();

      // Determine new savingsGoalId
      let newGoalId = newTxData?.savingsGoalId;
      const newAmount = Number(newTxData?.amount) || 0;
      const newType = (newTxData?.type || '').toLowerCase();

      // Fallback matching by subcategory/category if ID not explicitly stored
      if (!oldGoalId && (oldTxData?.category === 'Tabungan & Impian' || oldTxData?.category === 'Pencairan Tabungan' || oldTxData?.subcategory)) {
        const goalsSnap = await goalColRef.get();
        const matched = (goalsSnap.docs || []).find((gDoc: any) => {
          const gData = typeof gDoc.data === 'function' ? gDoc.data() : gDoc;
          return gDoc.id === oldTxData?.subcategory || gData?.title === oldTxData?.subcategory;
        });
        if (matched) oldGoalId = matched.id;
      }

      if (!newGoalId && (newTxData?.category === 'Tabungan & Impian' || newTxData?.category === 'Pencairan Tabungan' || newTxData?.subcategory)) {
        const goalsSnap = await goalColRef.get();
        const matched = (goalsSnap.docs || []).find((gDoc: any) => {
          const gData = typeof gDoc.data === 'function' ? gDoc.data() : gDoc;
          return gDoc.id === newTxData?.subcategory || gData?.title === newTxData?.subcategory;
        });
        if (matched) newGoalId = matched.id;
      }

      const oldGoalRef = oldGoalId ? goalColRef.doc(String(oldGoalId)) : null;
      const newGoalRef = newGoalId ? goalColRef.doc(String(newGoalId)) : null;

      const oldGoalSnap = oldGoalRef ? await oldGoalRef.get() : null;
      const newGoalSnap = (newGoalRef && String(newGoalId) !== String(oldGoalId))
        ? await newGoalRef.get()
        : (String(newGoalId) === String(oldGoalId) ? oldGoalSnap : null);

      const goalUpdates = new Map<string, { ref: any, currentAmount: number, targetAmount: number, status: string }>();

      // Step 1: Revert Old Impact
      if (oldGoalSnap && oldGoalSnap.exists !== false && oldAmount > 0) {
        const gData = typeof oldGoalSnap.data === 'function' ? oldGoalSnap.data() : oldGoalSnap;
        let curr = Number(gData?.currentAmount) || 0;
        if (oldType === 'pengeluaran' || oldType === 'expense') {
          curr = Math.max(0, curr - oldAmount);
        } else if (oldType === 'pemasukan' || oldType === 'income') {
          curr = curr + oldAmount;
        }
        goalUpdates.set(String(oldGoalId), {
          ref: oldGoalRef,
          currentAmount: curr,
          targetAmount: Number(gData?.targetAmount) || 0,
          status: gData?.status || 'active'
        });
      }

      // Step 2: Apply New Impact
      if (newGoalSnap && newGoalSnap.exists !== false && newAmount > 0) {
        const gData = typeof newGoalSnap.data === 'function' ? newGoalSnap.data() : newGoalSnap;
        let curr = goalUpdates.has(String(newGoalId))
          ? goalUpdates.get(String(newGoalId))!.currentAmount
          : (Number(gData?.currentAmount) || 0);

        if (newType === 'pengeluaran' || newType === 'expense') {
          curr = curr + newAmount;
        } else if (newType === 'pemasukan' || newType === 'income') {
          curr = Math.max(0, curr - newAmount);
        }
        goalUpdates.set(String(newGoalId), {
          ref: newGoalRef,
          currentAmount: curr,
          targetAmount: Number(gData?.targetAmount) || 0,
          status: gData?.status || 'active'
        });
      }

      // Perform Goal Updates
      for (const [_, entry] of goalUpdates.entries()) {
        let status = entry.status;
        if (status !== 'archived' && status !== 'cancelled') {
          status = (entry.targetAmount > 0 && entry.currentAmount >= entry.targetAmount) ? 'completed' : 'active';
        }
        await entry.ref.set({
          currentAmount: entry.currentAmount,
          status: status,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      payload.updatedAt = new Date().toISOString();
      if (oldTxData && oldTxData.createdAt) {
        payload.createdAt = oldTxData.createdAt;
      }

      await docRef.set(payload, { merge: true });
      const finalUpdatedDocData = { id: docId, ...oldTxData, ...payload };
      
      res.json({ ...finalUpdatedDocData, _status: "async_processing_started" });

      const runBackgroundJob = async () => {
        try {
           await new Promise(resolve => setTimeout(resolve, 2000));
           console.log(`[Background Job] Processed UPDATE for transactions ${docId}`);
        } catch (jobErr) {
           console.error("[Background Job Error]:", jobErr);
        }
      };
      runBackgroundJob().catch(console.error);
    } catch (e: any) {
      if (e?.message?.includes('429') || e?.message?.includes('Quota') || e?.code === 429) {
        console.warn('Firebase Quota Exceeded. Returning empty result.');
        res.status(429).json({ error: "Firebase Quota Exceeded. Please try again later." });
      } else {
        next(e);
      }
    }
  });

  app.delete("/api/transactions/:id", requireAuth, async (req: AuthRequest, res: any, next: any) => {
    try {
      const colRef = getCollectionRef(req.authEnv!, req.userId!, 'transactions');
      const goalColRef = getCollectionRef(req.authEnv!, req.userId!, 'savingsGoals');
      const docId = req.params.id;
      const docRef = colRef.doc(docId);

      const txSnap = await docRef.get();
      if (txSnap && txSnap.exists !== false) {
        const txData = typeof txSnap.data === 'function' ? txSnap.data() : txSnap;
        const amount = Number(txData?.amount) || 0;
        const type = (txData?.type || '').toLowerCase();
        let savingsGoalId = txData?.savingsGoalId;

        // If savingsGoalId is missing, check if category/subcategory points to a savings goal
        if (!savingsGoalId && (txData?.category === 'Tabungan & Impian' || txData?.category === 'Pencairan Tabungan' || txData?.subcategory)) {
          const goalsSnap = await goalColRef.get();
          const matchedGoal = (goalsSnap.docs || []).find((gDoc: any) => {
            const gData = typeof gDoc.data === 'function' ? gDoc.data() : gDoc;
            return gDoc.id === txData?.subcategory || gData?.title === txData?.subcategory;
          });
          if (matchedGoal) {
            savingsGoalId = matchedGoal.id;
          }
        }

        // Step 1: Revert Savings Goal Balance if linked
        if (savingsGoalId && amount > 0) {
          try {
            const goalDocRef = goalColRef.doc(String(savingsGoalId));
            const goalSnap = await goalDocRef.get();

            if (goalSnap && goalSnap.exists !== false) {
              const goalData = typeof goalSnap.data === 'function' ? goalSnap.data() : goalSnap;
              const currentAmount = Number(goalData?.currentAmount) || 0;
              const targetAmount = Number(goalData?.targetAmount) || 0;
              let updatedAmount = currentAmount;

              if (type === 'pengeluaran' || type === 'expense') {
                // Deleting an Expense (Top-up): Subtract transaction amount from goal's currentAmount
                updatedAmount = Math.max(0, currentAmount - amount);
              } else if (type === 'pemasukan' || type === 'income') {
                // Deleting an Income (Withdrawal): Add transaction amount back to goal's currentAmount
                updatedAmount = currentAmount + amount;
              }

              // Update status dynamically based on reverted amount vs target
              let status = goalData?.status || 'active';
              if (status !== 'archived' && status !== 'cancelled') {
                status = (targetAmount > 0 && updatedAmount >= targetAmount) ? 'completed' : 'active';
              }

              await goalDocRef.set({
                currentAmount: updatedAmount,
                status: status,
                updatedAt: new Date().toISOString()
              }, { merge: true });
            }
          } catch (goalErr) {
            console.error('[Delete Tx] Failed to update savings goal:', goalErr);
          }
        }

        // Step 2: Delete transaction record
        await docRef.delete();
      }
      
      res.json({ success: true, id: docId, _status: "async_processing_started" });

      const runBackgroundJob = async () => {
        try {
           await new Promise(resolve => setTimeout(resolve, 2000));
           console.log(`[Background Job] Processed DELETE for transactions ${docId}`);
        } catch (jobErr) {
           console.error("[Background Job Error]:", jobErr);
        }
      };
      runBackgroundJob().catch(console.error);
    } catch (e: any) {
      if (e?.message?.includes('429') || e?.message?.includes('Quota') || e?.code === 429) {
        console.warn('Firebase Quota Exceeded. Returning empty result.');
        res.status(429).json({ error: "Firebase Quota Exceeded. Please try again later." });
      } else {
        next(e);
      }
    }
  });
}
