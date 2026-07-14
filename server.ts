import { getFirestoreDb } from "./src/lib/firebase-admin.js";
import { db as sqlDb } from "./src/db/index.ts";
import * as schema from "./src/db/schema.ts";
import { eq, and } from "drizzle-orm";
import { getOrCreateUser } from "./src/db/users.ts";
import express from "express";
import axios from "axios";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { requireAuth, AuthRequest } from "./src/middleware/auth.js";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";

let uploadReceipt: any = null;

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

function handleMemoryUpload(req: any, res: any) {
  memoryUpload.single("receipt")(req, res, (err: any) => {
    if (err) return res.status(500).json({ error: err.message || "Gagal memproses gambar." });
    if (!req.file) return res.status(400).json({ error: "File tidak ditemukan." });
    try {
      const b64 = req.file.buffer.toString("base64");
      const mimeType = req.file.mimetype || "image/jpeg";
      const secureUrl = `data:${mimeType};base64,${b64}`;
      res.json({ secureUrl });
    } catch (e) {
      res.status(500).json({ error: "Gagal konversi ke Base64." });
    }
  });
}

function getUploadMiddleware() {
  if (uploadReceipt) return uploadReceipt;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  
  if (!cloudName || !apiKey || !apiSecret) {
    return null;
  }
  
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true
  });
  
  const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: "receipts",
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      transformation: [
        { width: 1200, height: 1200, crop: "limit" },
        { quality: "auto" },
        { fetch_format: "auto" }
      ],
      format: "webp"
    } as any
  });
  
  uploadReceipt = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }
  });
  
  return uploadReceipt;
}

let goldPriceCache: any = null;
const GOLD_CACHE_DURATION = 6 * 60 * 60 * 1000;

const app = express();
const PORT = 3000;
// AI initialization will be done lazily inside the route
let ai: GoogleGenAI | null = null;
const getAI = () => {
  if (!ai && process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return ai;
};

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running on Vercel" });
});

app.post("/api/transactions/upload", requireAuth, (req: AuthRequest, res, next) => {
    const uploadMiddleware = getUploadMiddleware();
    if (!uploadMiddleware) {
      return handleMemoryUpload(req, res);
    }
    uploadMiddleware.single("receipt")(req, res, (err: any) => {
      if (err) return res.status(500).json({ error: err.message || "Gagal upload" });
      if (!req.file) return res.status(400).json({ error: "File tidak ditemukan" });
      res.json({ secureUrl: req.file.path });
    });
  });

  app.get("/api/reports/gold-price", requireAuth, async (req: AuthRequest, res) => {
    const isRefresh = req.query.refresh === 'true';
    const now = Date.now();
    
    if (!isRefresh && goldPriceCache && (now - goldPriceCache.timestamp < GOLD_CACHE_DURATION)) {
      return res.json({ ...goldPriceCache.data, cached: true });
    }
    
    try {
      const endpoints = ['logammulia', 'anekalogam', 'galeri24', 'indogold', 'treasury', 'bankbsi', 'sampoernagold'];
      const baseUrl = process.env.GOLD_API_URL || "https://logam-mulia-api.iamutaki.workers.dev";
      const promises = endpoints.map(ep => 
        axios.get(`${baseUrl}/api/prices/${ep}${isRefresh ? '?refresh=true' : ''}`)
          .catch(e => ({ data: { data: [] } }))
      );
      
      const results = await Promise.all(promises);
      const [lmRes, anekaRes, g24Res, indoRes, trRes, bsiRes, sampoernaRes] = results;
      
      const lmData = lmRes.data?.data || [];
      const anekaData = anekaRes.data?.data || [];
      const g24Data = g24Res.data?.data || [];
      const indoData = indoRes.data?.data || [];
      const trData = trRes.data?.data || [];
      const bsiData = bsiRes.data?.data || [];
      const sampoernaData = sampoernaRes.data?.data || [];
      
      const get1g = (arr: any[], condition: (x: any) => boolean) => arr.find((x: any) => (x.weight === 1 || x.weight === "1") && condition(x)) || arr.find((x: any) => condition(x));
      
      const lm1g = get1g(lmData, x => x.materialType === 'Emas Batangan');
      const aneka1g = get1g(anekaData, x => typeof x.materialType === 'string' && x.materialType.includes('produksi tahun'));
      const anekaCert1g = get1g(anekaData, x => typeof x.materialType === 'string' && x.materialType.includes('Certicard'));
      const g24_g24 = get1g(g24Data, x => x.materialType === 'GALERI 24');
      const g24_ubs = get1g(g24Data, x => x.materialType === 'UBS');
      const g24_antam = get1g(g24Data, x => x.materialType === 'ANTAM NON PEGADAIAN') || get1g(g24Data, x => x.materialType === 'ANTAM');
      const g24_lotus = get1g(g24Data, x => x.materialType === 'LOTUS ARCHI');
      const g24_bb = get1g(g24Data, x => x.materialType === 'SENTRA BUYBACK');
      
      const indo_antam = get1g(indoData, x => x.materialType === 'Antam');
      const indo_ubs = get1g(indoData, x => x.materialType === 'UBS');
      const indo_ig = get1g(indoData, x => x.materialType === 'IndoGold');
      
      const tr_1g = get1g(trData, x => true);
      const bsi_1g = get1g(bsiData, x => true);
      const sampoerna_1g = get1g(sampoernaData, x => true);
      
      const vendors: any = {};
      const fallbackDate = new Date().toISOString();
      let maxTimestamp = 0;
      
      const addVendor = (key: string, name: string, itemSell: any, itemBuy: any) => {
        const sellPrice = itemBuy?.buybackPrice || itemSell?.buybackPrice || 0;
        const buyPrice = itemSell?.sellPrice || 0;
        if (!sellPrice && !buyPrice) return;
        
        const date = itemSell?.recordedDate || itemBuy?.recordedDate || fallbackDate;
        const time = new Date(date).getTime();
        if (time > maxTimestamp) maxTimestamp = time;
        
        vendors[key] = {
          name,
          buyPrice,
          sellPrice,
          date,
          isAvailable: true
        };
      };
      
      addVendor('antam_lm', 'Antam (Logam Mulia)', lm1g, aneka1g || g24_bb);
      addVendor('antam_aneka', 'Antam (Aneka Logam)', aneka1g, aneka1g);
      addVendor('antam_aneka_cert', 'Antam Certicard (Aneka Logam)', anekaCert1g, anekaCert1g);
      addVendor('g24_antam', 'Antam (Galeri 24)', g24_antam, g24_antam);
      addVendor('g24_g24', 'Galeri 24', g24_g24, g24_g24);
      addVendor('g24_ubs', 'UBS (Galeri 24)', g24_ubs, g24_ubs);
      addVendor('g24_lotus', 'Lotus Archi (Galeri 24)', g24_lotus, g24_lotus);
      addVendor('indo_antam', 'Antam (IndoGold)', indo_antam, indo_antam);
      addVendor('indo_ubs', 'UBS (IndoGold)', indo_ubs, indo_ubs);
      addVendor('indo_ig', 'IndoGold', indo_ig, indo_ig);
      addVendor('treasury', 'Treasury', tr_1g, tr_1g);
      addVendor('bsi', 'Bank BSI', bsi_1g, bsi_1g);
      addVendor('sampoerna', 'Sampoerna Gold', sampoerna_1g, sampoerna_1g);
      
      // Fallback if APIs are completely down
      if (Object.keys(vendors).length === 0) {
        throw new Error("No vendors found");
      }
      
      const finalLastUpdated = maxTimestamp > 0 ? new Date(maxTimestamp).toISOString() : fallbackDate;
      
      const responseData = {
        success: true,
        cached: false,
        lastUpdated: fallbackDate,
        vendors
      };
      
      goldPriceCache = { timestamp: now, data: responseData };
      return res.json(responseData);
      
    } catch (err) {

      if (goldPriceCache) {
         return res.json({ ...goldPriceCache.data, cached: true });
      }
      
      const fallbackDate = new Date().toISOString();
      const fallbackData = {
        success: true,
        cached: false,
        lastUpdated: fallbackDate,
        vendors: {
          antam: { name: "Antam", buyPrice: 1500000, sellPrice: 1350000, date: fallbackDate, isAvailable: true },
          antamRetro: { name: "Antam Retro", buyPrice: 1450000, sellPrice: 1300000, date: fallbackDate, isAvailable: true },
          ubs: { name: "UBS", buyPrice: 1480000, sellPrice: 1330000, date: fallbackDate, isAvailable: true },
          galeri24: { name: "Galeri 24", buyPrice: 1490000, sellPrice: 1340000, date: fallbackDate, isAvailable: true },
        }
      };
      return res.json(fallbackData);
    }
  });

  app.post("/api/ai/chat", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { message } = req.body;
      const firebaseUid = req.userId!;
      
      // Resolve database user
      const dbUser = await getOrCreateUser(firebaseUid, req.user?.email || '');
      const userId = dbUser.id;
      
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
        const transactionsList = await sqlDb.select()
          .from(schema.transactions)
          .where(and(eq(schema.transactions.userId, userId), eq(schema.transactions.periodId, matchedPeriod.id)));
          
        transactionsList.forEach((tx: any) => {
          if (tx.type !== 'Dr' && tx.type !== 'pengeluaran') return;
          const cat = tx.category || 'Unknown';
          const sub = tx.subcategory || 'Unknown';
          if (!currentSpendingData[cat]) currentSpendingData[cat] = {};
          if (!currentSpendingData[cat][sub]) currentSpendingData[cat][sub] = 0;
          currentSpendingData[cat][sub] += Number(tx.amount || 0);
        });
      }
      
      const masterDataContext = `Categories: ${JSON.stringify(categories)}\nBudgets: ${JSON.stringify(budgets)}\nCurrent Spending: ${JSON.stringify(currentSpendingData)}`;
      
      const aiInstance = getAI();
      if (!aiInstance) {
        return res.status(500).json({ error: "Gemini API key is not configured." });
      }
      
      const response = await aiInstance.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: 'user', parts: [{ text: message }] }],
        config: {
          systemInstruction: `You are Asisten Trakr. User input: ${message}\nCONTEXT:${masterDataContext}. You must return UI Markdown and ---JSON_DATA--- with a transaction object if a transaction should be logged.`
        }
      });
      
      const text = response.text;
      let markdown = text;
      let jsonData = null;
      if (text && text.includes('---JSON_DATA---')) {
        const parts = text.split('---JSON_DATA---');
        markdown = parts[0].trim();
        try {
          const jsonMatch = parts[1].match(/\{[\s\S]*\}/);
          jsonData = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(parts[1].trim());
          if (jsonData?.transaction) {
             const txData = jsonData.transaction;
             await sqlDb.insert(schema.transactions).values({
               userId,
               type: txData.type || 'Dr',
               amount: (isNaN(Number(txData.amount)) ? 0 : Number(txData.amount)) || 0,
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

import { setupApiRoutes } from "./routes.js";
setupApiRoutes(app);

app.use((err: any, req: any, res: any, next: any) => { 

  res.status(500).json({ error: err.message || "Internal server error" }); 
});

if (process.env.NODE_ENV !== "production") {
  (async () => {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
    app.listen(PORT, "0.0.0.0", () => {

    });
  })();
} else {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {

    });
  }
}

export default app;
