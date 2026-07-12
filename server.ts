import express from "express";
import axios from "axios";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { requireAuth, AuthRequest } from "./src/middleware/auth";
import budgetRouter from "./src/routes/budgetRoutes";
import { db } from "./src/db/index";
import {
  transactions,
  masterCategories,
  masterAccounts,
  masterAssets,
  masterTags,
  masterContacts,
  masterPeriods,
  budgetAllocations,
  globalBudgets,
} from "./src/db/schema";
import { eq, and, or, ne, sql } from "drizzle-orm";
import { PREDEFINED_CATEGORIES } from "./src/types";
import { generateGuestTransactions, generateGuestBudgets, generateGuestAccounts } from "./src/utils/generateGuestData";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";

let uploadReceipt: any = null;
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // limit to 10MB
});

function handleMemoryUpload(req: any, res: any) {
  memoryUpload.single("receipt")(req, res, (err: any) => {
    if (err) {
      console.error("Memory upload error:", err);
      return res.status(500).json({ error: err.message || "Gagal memproses gambar." });
    }
    if (!req.file) {
      return res.status(400).json({ error: "File tidak ditemukan untuk diproses." });
    }
    
    try {
      const b64 = req.file.buffer.toString("base64");
      const mimeType = req.file.mimetype || "image/jpeg";
      const secureUrl = `data:${mimeType};base64,${b64}`;
      console.log("Uploaded receipt successfully processed using memory fallback (Base64). Configure CLOUDINARY_CLOUD_NAME in .env for actual Cloud Storage.");
      res.json({ secureUrl });
    } catch (conversionError: any) {
      console.error("Error converting file to base64:", conversionError);
      res.status(500).json({ error: "Gagal memproses gambar ke Base64." });
    }
  });
}

function getUploadMiddleware() {
  if (uploadReceipt) return uploadReceipt;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary credentials are not configured. Please define CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.");
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
        { width: 1200, height: 1200, crop: "limit" }, // limit size
        { quality: "auto" }, // compress automatically
        { fetch_format: "auto" } // auto-select format
      ],
      format: "webp" // convert format to optimized webp
    } as any
  });

  uploadReceipt = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // limit max size to 10MB before transformation
  });

  return uploadReceipt;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  app.use(express.json());

  // === BUDGET ROUTER ===
  app.use("/api/budgets", budgetRouter);

  // === FILE UPLOAD ENDPOINT ===
  app.post("/api/transactions/upload", requireAuth, (req: AuthRequest, res, next) => {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const useCloudinary = !!(cloudName && apiKey && apiSecret);

    if (useCloudinary) {
      try {
        const upload = getUploadMiddleware();
        upload.single("receipt")(req, res, (err: any) => {
          if (err) {
            console.error("Multer upload error:", err);
            return res.status(500).json({ error: err.message || "Gagal mengunggah struk ke cloud storage." });
          }
          if (!req.file) {
            return res.status(400).json({ error: "File tidak ditemukan untuk diunggah." });
          }
          const fileAny = req.file as any;
          const secureUrl = fileAny.path || fileAny.secure_url || fileAny.url;
          res.json({ secureUrl });
        });
      } catch (error: any) {
        console.error("Cloudinary upload failed, falling back to memory upload:", error);
        handleMemoryUpload(req, res);
      }
    } else {
      handleMemoryUpload(req, res);
    }
  });

  // === GLOBAL TYPE COERCION MIDDLEWARE ===
  app.use((req, res, next) => {
    if (req.body && typeof req.body === 'object') {
      const integerFields = [
        'id', 'userId', 'user_id', 'periodId', 'period_id', 
        'globalBudgetId', 'global_budget_id', 'accountId', 'account_id', 
        'assetId', 'asset_id', 'tagId', 'tag_id', 'contactId', 'contact_id'
      ];
      const floatFields = [
        'amount', 'balance', 'currentValue', 'current_value', 
        'value', 'calculatedAmount', 'calculated_amount', 
        'totalTargetAmount', 'total_target_amount'
      ];

      for (const key of Object.keys(req.body)) {
        if (req.body[key] !== undefined && req.body[key] !== null && req.body[key] !== '') {
          if (integerFields.includes(key)) {
            const parsed = parseInt(req.body[key], 10);
            if (!isNaN(parsed)) {
              req.body[key] = parsed;
            }
          } else if (floatFields.includes(key)) {
            const parsed = parseFloat(req.body[key]);
            if (!isNaN(parsed)) {
              req.body[key] = parsed;
            }
          }
        }
      }
    }
    next();
  });

  // === GUEST MODE IN-MEMORY CACHE & DATA GENERATORS ===
  const guestCache = new Map<string, {
    transactions: any[];
    periods: any[];
    accounts: any[];
    assets: any[];
    tags: any[];
    contacts: any[];
    customCategories: any[];
    budgets: any[];
    globalBudgets: any[];
  }>();

  function getOrCreateGuestCache(uid: string) {
    if (guestCache.has(uid)) {
      return guestCache.get(uid)!;
    }

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const generatedTxs = generateGuestTransactions(currentMonth, currentYear);
    const generatedBudgetsData = generateGuestBudgets(generatedTxs);
    const generatedAccounts = generateGuestAccounts();

    const data = {
      transactions: generatedTxs,
      periods: generatedBudgetsData.periods,
      accounts: generatedAccounts,
      assets: [
        { id: "gold_1", assetName: "Emas Antam (Fisik)", assetCategory: "Gold", currentValue: 5000000, isActive: true, createdAt: new Date().toISOString() },
        { id: "mutual_1", assetName: "Reksadana Saham", assetCategory: "Mutual Fund", currentValue: 15000000, isActive: true, createdAt: new Date().toISOString() }
      ],
      tags: [
        { id: "tag_1", tagName: "Bulanan", description: "Pengeluaran rutin bulanan", isActive: true, createdAt: new Date().toISOString() },
        { id: "tag_2", tagName: "Liburan", description: "Biaya senang-senang", isActive: true, createdAt: new Date().toISOString() }
      ],
      contacts: [
        { id: "contact_1", contactName: "Ibu", contactType: "Payee", isActive: true, createdAt: new Date().toISOString() },
        { id: "contact_2", contactName: "Kantor SakuPintar", contactType: "Payer", isActive: true, createdAt: new Date().toISOString() }
      ],
      customCategories: [],
      budgets: generatedBudgetsData.allocations,
      globalBudgets: generatedBudgetsData.globalBudgets
    };

    guestCache.set(uid, data);
    return data;
  }

  // === TRANSACTIONS ===
  app.get("/api/transactions", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (req.user?.isGuest) {
        const guestData = getOrCreateGuestCache(req.user.uid);
        return res.json(guestData.transactions);
      }
      const data = await db.select().from(transactions).where(eq(transactions.userId, req.dbUserId!));
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/transactions", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (Array.isArray(req.body)) {
        const records = req.body.map(tx => {
          const { recurringConfig, isRecurring, recurringFrequency, recurringEndDate, ...rest } = tx;
          return {
            ...rest,
            isRecurring: recurringConfig ? !!recurringConfig.isRecurring : (isRecurring !== undefined ? !!isRecurring : false),
            recurringFrequency: recurringConfig ? (recurringConfig.recurringFrequency || null) : (recurringFrequency || null),
            recurringEndDate: recurringConfig ? (recurringConfig.recurringEndDate || null) : (recurringEndDate || null),
            userId: req.dbUserId!
          };
        });
        const result = await db.insert(transactions).values(records).returning();
        res.json(result);
      } else if (req.body.items && Array.isArray(req.body.items)) {
        const records = req.body.items.map((tx: any) => {
          const { recurringConfig, isRecurring, recurringFrequency, recurringEndDate, ...rest } = tx;
          return {
            ...rest,
            isRecurring: recurringConfig ? !!recurringConfig.isRecurring : (isRecurring !== undefined ? !!isRecurring : false),
            recurringFrequency: recurringConfig ? (recurringConfig.recurringFrequency || null) : (recurringFrequency || null),
            recurringEndDate: recurringConfig ? (recurringConfig.recurringEndDate || null) : (recurringEndDate || null),
            userId: req.dbUserId!
          };
        });
        const result = await db.insert(transactions).values(records).returning();
        res.json(result);
      } else {
        const { recurringConfig, isRecurring, recurringFrequency, recurringEndDate, ...transactionData } = req.body;
        const record = {
          ...transactionData,
          isRecurring: recurringConfig ? !!recurringConfig.isRecurring : (isRecurring !== undefined ? !!isRecurring : false),
          recurringFrequency: recurringConfig ? (recurringConfig.recurringFrequency || null) : (recurringFrequency || null),
          recurringEndDate: recurringConfig ? (recurringConfig.recurringEndDate || null) : (recurringEndDate || null),
          userId: req.dbUserId!
        };
        const result = await db.insert(transactions).values(record).returning();
        res.json(result[0]);
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/transactions/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { recurringConfig, isRecurring, recurringFrequency, recurringEndDate, ...updateData } = req.body;
      const record = {
        ...updateData,
        isRecurring: recurringConfig ? !!recurringConfig.isRecurring : (isRecurring !== undefined ? !!isRecurring : false),
        recurringFrequency: recurringConfig ? (recurringConfig.recurringFrequency || null) : (recurringFrequency || null),
        recurringEndDate: recurringConfig ? (recurringConfig.recurringEndDate || null) : (recurringEndDate || null)
      };
      const result = await db
        .update(transactions)
        .set(record)
        .where(and(eq(transactions.id, parseInt(req.params.id)), eq(transactions.userId, req.dbUserId!)))
        .returning();
      res.json(result[0]);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/transactions/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      await db
        .delete(transactions)
        .where(and(eq(transactions.id, parseInt(req.params.id)), eq(transactions.userId, req.dbUserId!)));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // === REPORTS (CASHFLOW & EXPENSE DISTRIBUTION) ===
  app.get("/api/reports/cashflow-stats", requireAuth, async (req: AuthRequest, res) => {
    try {
      const month = parseInt(req.query.month as string) || (new Date().getMonth() + 1);
      const year = parseInt(req.query.year as string) || new Date().getFullYear();

      const userTxs = req.user?.isGuest
        ? getOrCreateGuestCache(req.user.uid).transactions
        : await db.select().from(transactions).where(eq(transactions.userId, req.dbUserId!));
      
      const yearStr = String(year);
      const monthsLabel = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

      const filtered = userTxs.filter(t => {
        if (!t.date) return false;
        if (t.date.startsWith(`${yearStr}-`)) return true;
        try {
          const d = new Date(t.date);
          return d.getFullYear() === year;
        } catch {
          return false;
        }
      });

      const monthlyData = Array.from({ length: 12 }, (_, i) => ({
        tanggal: monthsLabel[i],
        Pemasukan: 0,
        Pengeluaran: 0
      }));

      const allUserTxsCount = userTxs.length;
      if (allUserTxsCount === 0) {
        // Generate beautiful simulated curves for first-time onboarding display
        const simulated = Array.from({ length: 12 }, (_, i) => {
          const incomeSim = Math.round(11000000 + Math.sin(i * 1.5) * 3500000 + Math.cos(i) * 1000000);
          const expenseSim = Math.round(6500000 + Math.sin(i * 1.5 + 2) * 2800000 + Math.cos(i + 1) * 800000);
          return {
            tanggal: monthsLabel[i],
            Pemasukan: incomeSim,
            Pengeluaran: expenseSim
          };
        });
        return res.json(simulated);
      }

      filtered.forEach(t => {
        let monthIdx = 0;
        if (t.date.includes('-')) {
          const parts = t.date.split('-');
          if (parts.length >= 2) {
            const parsedMonth = parseInt(parts[1], 10);
            if (!isNaN(parsedMonth)) {
              monthIdx = parsedMonth - 1;
            }
          }
        } else {
          try {
            monthIdx = new Date(t.date).getMonth();
          } catch {
            monthIdx = 0;
          }
        }
        if (monthIdx < 0) monthIdx = 0;
        if (monthIdx > 11) monthIdx = 11;

        const amt = Number(t.amount) || 0;
        if (t.type === 'pemasukan' || t.type === 'Income' || t.type === 'income') {
          monthlyData[monthIdx].Pemasukan += amt;
        } else if (t.type === 'pengeluaran' || t.type === 'Expense' || t.type === 'expense') {
          monthlyData[monthIdx].Pengeluaran += amt;
        }
      });

      res.json(monthlyData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/reports/expense-distribution", requireAuth, async (req: AuthRequest, res) => {
    try {
      const month = parseInt(req.query.month as string) || (new Date().getMonth() + 1);
      const year = parseInt(req.query.year as string) || new Date().getFullYear();

      const userTxs = req.user?.isGuest
        ? getOrCreateGuestCache(req.user.uid).transactions
        : await db.select().from(transactions).where(eq(transactions.userId, req.dbUserId!));
      
      const yearStr = String(year);
      const monthStr = month < 10 ? `0${month}` : String(month);
      const prefix = `${yearStr}-${monthStr}`;

      const filtered = userTxs.filter(t => {
        if (!t.date) return false;
        if (!(t.type === 'pengeluaran' || t.type === 'Expense' || t.type === 'expense')) return false;
        if (t.date.startsWith(prefix)) return true;
        try {
          const d = new Date(t.date);
          return d.getFullYear() === year && (d.getMonth() + 1) === month;
        } catch {
          return false;
        }
      });

      if (userTxs.length === 0) {
        const DEFAULT_BREAKDOWN = [
          { name: 'Makanan & Kesehatan', value: 4182390 },
          { name: 'Belanja & Belanja Online', value: 3186580 },
          { name: 'Tagihan & Langganan', value: 3717680 },
          { name: 'Hiburan & Nongkrong', value: 3053810 }
        ];
        return res.json(DEFAULT_BREAKDOWN);
      }

      const categoriesMap: { [catName: string]: number } = {};
      filtered.forEach(t => {
        const catName = t.category || 'Lainnya';
        categoriesMap[catName] = (categoriesMap[catName] || 0) + (Number(t.amount) || 0);
      });

      const result = Object.entries(categoriesMap).map(([name, value]) => ({
        name,
        value
      })).sort((a, b) => b.value - a.value);

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // === REAL-TIME GOLD PRICE API PROXY WITH CACHING ===
  interface GoldVendorData {
    name: string;
    buyPrice: number | null;
    sellPrice: number | null;
    date: string | null;
    isAvailable: boolean;
    type?: string;
    description?: string;
  }

  interface GoldPricePayload {
    success: boolean;
    cached: boolean;
    lastUpdated: string;
    vendors: {
      [key: string]: GoldVendorData;
    };
  }

  let goldPriceCache: { data: GoldPricePayload; timestamp: number } | null = null;
  const GOLD_CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

  app.get("/api/reports/gold-price", requireAuth, async (req: AuthRequest, res) => {
    const now = Date.now();
    if (goldPriceCache && (now - goldPriceCache.timestamp < GOLD_CACHE_DURATION)) {
      console.log("[AURA_CORE] Serving gold prices from 6-hour cache");
      return res.json({ ...goldPriceCache.data, cached: true });
    }

    console.log("[AURA_CORE] Fetching live Indonesian gold prices");

    const fallbackDate = new Date().toISOString();
    const fallbackData: GoldPricePayload = {
      success: true,
      cached: false,
      lastUpdated: fallbackDate,
      vendors: {
        antam: {
          name: "Antam",
          buyPrice: 2482000,
          sellPrice: 2258000,
          date: fallbackDate,
          isAvailable: true,
          type: "Physical",
          description: "LM Sertifikat KBBI / LBMA"
        },
        pegadaian: {
          name: "Pegadaian",
          buyPrice: 2310000,
          sellPrice: 2102000,
          date: fallbackDate,
          isAvailable: true,
          type: "Physical",
          description: "Emas Batangan Outlet Resmi Pegadaian"
        },
        ubs: {
          name: "UBS",
          buyPrice: 2445000,
          sellPrice: 2212000,
          date: fallbackDate,
          isAvailable: true,
          type: "Physical",
          description: "PT Untung Bersama Sejahtera"
        },
        sampoerna: {
          name: "Sampoerna Gold",
          buyPrice: 2432000,
          sellPrice: 2195000,
          date: fallbackDate,
          isAvailable: true,
          type: "Physical",
          description: "PT Sampoerna Gold Indonesia"
        },
        galeri24: {
          name: "Galeri 24",
          buyPrice: 2457000,
          sellPrice: 2215000,
          date: fallbackDate,
          isAvailable: true,
          type: "Physical",
          description: "Anak Perusahaan PT Pegadaian"
        },
        bsi: {
          name: "BSI Emas",
          buyPrice: 2462000,
          sellPrice: 2235000,
          date: fallbackDate,
          isAvailable: true,
          type: "Sharia",
          description: "Emas Syariah Bank Syariah Indonesia"
        },
        pluang: {
          name: "Pluang Emas",
          buyPrice: 2321000,
          sellPrice: 2279000,
          date: fallbackDate,
          isAvailable: true,
          type: "Digital",
          description: "Emas Digital Mitra Antam & PG"
        },
        lakuemas: {
          name: "Lakuemas",
          buyPrice: 2325000,
          sellPrice: 2278000,
          date: fallbackDate,
          isAvailable: true,
          type: "Digital",
          description: "Tabungan Emas Digital Berlisensi Bappebti"
        },
        treasury: {
          name: "Treasury",
          buyPrice: 2316000,
          sellPrice: 2272000,
          date: fallbackDate,
          isAvailable: true,
          type: "Digital",
          description: "Aplikasi Emas Digital Terpercaya"
        }
      }
    };

    const vendors: { [key: string]: GoldVendorData } = { ...fallbackData.vendors };

    // Strategy 1: Programmatic scraping of harga-emas.org + Proportionate calculation for others
    try {
      console.log("[AURA_CORE] Attempting to scrape live prices from harga-emas.org");
      const scrapeRes = await axios.get("https://harga-emas.org/", { timeout: 5000 });
      const html = scrapeRes.data;

      // Extract self.__next_f.push scripts
      const regex = /self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g;
      let match;
      let fullText = "";
      while ((match = regex.exec(html)) !== null) {
        fullText += match[1];
      }
      const textClean = fullText.replace(/\\"/g, '"').replace(/\\/g, '');

      // Find the gram table block
      let antamPrice = NaN;
      let pegadaianPrice = NaN;

      const gramIndex = textClean.indexOf('"children":1}');
      if (gramIndex !== -1) {
        const chunk = textClean.substring(gramIndex, gramIndex + 1000);
        const priceMatches = chunk.match(/"children":"([0-9.]+)"/g);
        if (priceMatches && priceMatches.length >= 2) {
          const antamStr = priceMatches[0].match(/"children":"([0-9.]+)"/)?.[1] || "";
          const pegadaianStr = priceMatches[1].match(/"children":"([0-9.]+)"/)?.[1] || "";

          antamPrice = parseInt(antamStr.replace(/\./g, ''));
          pegadaianPrice = parseInt(pegadaianStr.replace(/\./g, ''));
        }
      }

      // Robust fallback regex parser for raw html or textClean if previous failed
      if (isNaN(antamPrice) || isNaN(pegadaianPrice) || antamPrice < 1000000) {
        console.log("[AURA_CORE] Falling back to direct regex scraping from HTML");
        const allPrices = html.match(/[1-2]\.[0-9]{3}\.[0-9]{3}/g) || [];
        const parsedPrices: number[] = allPrices.map(p => parseInt(p.replace(/\./g, '')));
        const uniquePrices = (Array.from(new Set(parsedPrices)) as number[])
          .filter((p: number) => p >= 1100000 && p <= 1700000)
          .sort((a: number, b: number) => b - a); // Sort descending

        if (uniquePrices.length > 0) {
          antamPrice = uniquePrices[0];
          if (uniquePrices.length >= 2 && uniquePrices[1] >= antamPrice * 0.95) {
            pegadaianPrice = uniquePrices[1];
          } else {
            pegadaianPrice = Math.round(antamPrice * 0.99);
          }
        }
      }

      if (!isNaN(antamPrice) && !isNaN(pegadaianPrice)) {
        console.log(`[AURA_CORE] Successfully scraped prices: Antam = Rp ${antamPrice}, Pegadaian = Rp ${pegadaianPrice}`);
            
            vendors.antam = {
              name: "Antam",
              buyPrice: antamPrice,
              sellPrice: Math.round(antamPrice * 0.91), // ~9% spread
              date: fallbackDate,
              isAvailable: true,
              type: "Physical",
              description: "LM Sertifikat KBBI / LBMA"
            };
            vendors.pegadaian = {
              name: "Pegadaian",
              buyPrice: pegadaianPrice,
              sellPrice: Math.round(pegadaianPrice * 0.91), // ~9% spread
              date: fallbackDate,
              isAvailable: true,
              type: "Physical",
              description: "Emas Batangan Outlet Resmi Pegadaian"
            };
            vendors.ubs = {
              name: "UBS",
              buyPrice: Math.round(antamPrice * 0.985),
              sellPrice: Math.round(antamPrice * 0.985 * 0.92), // ~8% spread
              date: fallbackDate,
              isAvailable: true,
              type: "Physical",
              description: "PT Untung Bersama Sejahtera"
            };
            vendors.sampoerna = {
              name: "Sampoerna Gold",
              buyPrice: Math.round(antamPrice * 0.98),
              sellPrice: Math.round(antamPrice * 0.98 * 0.915), // ~8.5% spread
              date: fallbackDate,
              isAvailable: true,
              type: "Physical",
              description: "PT Sampoerna Gold Indonesia"
            };
            vendors.galeri24 = {
              name: "Galeri 24",
              buyPrice: Math.round(antamPrice * 0.99),
              sellPrice: Math.round(antamPrice * 0.99 * 0.92), // ~8% spread
              date: fallbackDate,
              isAvailable: true,
              type: "Physical",
              description: "Anak Perusahaan PT Pegadaian"
            };
            vendors.bsi = {
              name: "BSI Emas",
              buyPrice: Math.round(antamPrice * 0.992),
              sellPrice: Math.round(antamPrice * 0.992 * 0.925), // ~7.5% spread
              date: fallbackDate,
              isAvailable: true,
              type: "Sharia",
              description: "Emas Syariah Bank Syariah Indonesia"
            };
            // Digital gold has extremely low spread (typically 1.5% to 2% spread)
            vendors.pluang = {
              name: "Pluang Emas",
              buyPrice: Math.round(antamPrice * 0.935),
              sellPrice: Math.round(antamPrice * 0.935 * 0.982), // ~1.8% spread
              date: fallbackDate,
              isAvailable: true,
              type: "Digital",
              description: "Emas Digital Mitra Antam & PG"
            };
            vendors.lakuemas = {
              name: "Lakuemas",
              buyPrice: Math.round(antamPrice * 0.937),
              sellPrice: Math.round(antamPrice * 0.937 * 0.98), // ~2.0% spread
              date: fallbackDate,
              isAvailable: true,
              type: "Digital",
              description: "Tabungan Emas Digital Berlisensi Bappebti"
            };
            vendors.treasury = {
              name: "Treasury",
              buyPrice: Math.round(antamPrice * 0.933),
              sellPrice: Math.round(antamPrice * 0.933 * 0.981), // ~1.9% spread
              date: fallbackDate,
              isAvailable: true,
              type: "Digital",
              description: "Aplikasi Emas Digital Terpercaya"
            };

            const payload: GoldPricePayload = {
              success: true,
              cached: false,
              lastUpdated: fallbackDate,
              vendors
            };

            goldPriceCache = {
              data: payload,
              timestamp: now
            };

            return res.json(payload);
          }
      } catch (scrapeErr: any) {
      console.warn("[AURA_CORE] Direct scraping failed:", scrapeErr.message);
    }

    // Strategy 2: Fallback to Gemini Search Grounding (if scraper is broken/blocked)
    try {
      console.log("[AURA_CORE] Attempting Gemini Search Grounding fallback");
      const currentDateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      const prompt = `Cari harga emas hari ini di Indonesia untuk tanggal ${currentDateStr} atau paling baru.
Dapatkan harga beli per gram (buyPrice) dan harga buyback/sellback per gram (sellPrice) untuk jenis berikut:
1. Antam (Emas Fisik)
2. Pegadaian (Emas Fisik)
3. UBS (Emas Fisik)
4. Sampoerna Gold (Emas Fisik)
5. Galeri 24 (Emas Fisik)
6. BSI Emas (Emas Syariah)
7. Pluang (Emas Digital)
8. Lakuemas (Emas Digital)
9. Treasury (Emas Digital)

Kembalikan dalam format JSON murni:
{
  "antam": { "buyPrice": 1450000, "sellPrice": 1320000 },
  "pegadaian": { "buyPrice": 1440000, "sellPrice": 1300000 },
  "ubs": { "buyPrice": 1430000, "sellPrice": 1310000 },
  "sampoerna": { "buyPrice": 1420000, "sellPrice": 1300000 },
  "galeri24": { "buyPrice": 1435000, "sellPrice": 1315000 },
  "bsi": { "buyPrice": 1445000, "sellPrice": 1335000 },
  "pluang": { "buyPrice": 1360000, "sellPrice": 1335000 },
  "lakuemas": { "buyPrice": 1365000, "sellPrice": 1338000 },
  "treasury": { "buyPrice": 1358000, "sellPrice": 1332000 }
}`;

      const geminiRes = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
        },
      });

      const text = geminiRes.text;
      console.log("[AURA_CORE] Gemini response for gold prices:", text);

      let parsed = null;
      if (text) {
        try {
          parsed = JSON.parse(text);
        } catch (jsonErr) {
          console.warn("[AURA_CORE] Failed to parse JSON from Gemini, trying match regex:", jsonErr);
          const match = text.match(/\{[\s\S]*\}/);
          if (match) {
            parsed = JSON.parse(match[0]);
          }
        }
      }

      if (parsed) {
        const keys = ["antam", "pegadaian", "ubs", "sampoerna", "galeri24", "bsi", "pluang", "lakuemas", "treasury"];
        for (const key of keys) {
          if (parsed[key] && parsed[key].buyPrice) {
            vendors[key] = {
              ...vendors[key],
              buyPrice: Number(parsed[key].buyPrice) || vendors[key].buyPrice,
              sellPrice: Number(parsed[key].sellPrice) || vendors[key].sellPrice,
              date: fallbackDate,
              isAvailable: true
            };
          }
        }

        const payload: GoldPricePayload = {
          success: true,
          cached: false,
          lastUpdated: fallbackDate,
          vendors
        };

        goldPriceCache = {
          data: payload,
          timestamp: now
        };

        return res.json(payload);
      }
    } catch (err: any) {
      console.log("[AURA_CORE] Gemini fallback not available, using high-fidelity pre-cached data.");
    }

    // Strategy 3: Graceful fallback to pre-cached modern static defaults
    console.log("[AURA_CORE] Serving pre-cached gold price fallback data gracefully");
    goldPriceCache = {
      data: fallbackData,
      timestamp: now
    };
    return res.json(fallbackData);
  });

  app.delete("/api/periods/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const periodId = parseInt(req.params.id);
      if (isNaN(periodId)) {
        return res.status(400).json({ error: "ID periode tidak valid." });
      }

      // Check transactions dependency
      const txs = await db
        .select()
        .from(transactions)
        .where(and(eq(transactions.periodId, periodId), eq(transactions.userId, req.dbUserId!)))
        .limit(1);

      if (txs.length > 0) {
        return res.status(400).json({
          error: "Periode tidak dapat dihapus karena sudah memiliki transaksi atau anggaran terkait."
        });
      }

      // Check budget allocations dependency
      const allocations = await db
        .select()
        .from(budgetAllocations)
        .where(and(eq(budgetAllocations.periodId, periodId), eq(budgetAllocations.userId, req.dbUserId!)))
        .limit(1);

      if (allocations.length > 0) {
        return res.status(400).json({
          error: "Periode tidak dapat dihapus karena sudah memiliki transaksi atau anggaran terkait."
        });
      }

      // Check global budgets dependency
      const gbs = await db
        .select()
        .from(globalBudgets)
        .where(and(eq(globalBudgets.periodId, periodId), eq(globalBudgets.userId, req.dbUserId!)))
        .limit(1);

      if (gbs.length > 0) {
        return res.status(400).json({
          error: "Periode tidak dapat dihapus karena sudah memiliki transaksi atau anggaran terkait."
        });
      }

      // Delete the period
      await db
        .delete(masterPeriods)
        .where(and(eq(masterPeriods.id, periodId), eq(masterPeriods.userId, req.dbUserId!)));

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Generic Master Data Route Helper
  const tableMap: Record<string, any> = {
    'customCategories': masterCategories,
    'accounts': masterAccounts,
    'assets': masterAssets,
    'tags': masterTags,
    'contacts': masterContacts,
    'periods': masterPeriods,
    'budgets': budgetAllocations,
    'globalBudgets': globalBudgets,
  };

  app.get("/api/budgets", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (req.user?.isGuest) {
        const guestData = getOrCreateGuestCache(req.user.uid);
        // Aggregate cached guest transactions
        const actualAmountMap: Record<string, number> = {};
        guestData.transactions.forEach(tx => {
          if (tx.type === 'pengeluaran') {
            actualAmountMap[tx.category] = (actualAmountMap[tx.category] || 0) + tx.amount;
          }
        });
        const mergedBudgets = guestData.budgets.map(budget => {
          let categoryName = "";
          const predefined = PREDEFINED_CATEGORIES.find(c => c.id === budget.categoryId);
          if (predefined) {
            categoryName = predefined.name;
          } else {
            categoryName = budget.categoryId;
          }
          const actual_amount = actualAmountMap[budget.categoryId] || actualAmountMap[categoryName] || 0;
          const target_amount = budget.calculatedAmount || 0;
          const remaining_amount = target_amount - actual_amount;
          return {
            ...budget,
            actual_amount,
            remaining_amount,
            target_amount
          };
        });
        return res.json(mergedBudgets);
      }

      const { period_id } = req.query;
      if (!period_id) return res.status(400).json({ error: "Missing period_id" });

      const pId = parseInt(period_id as string);

      // 1. Get exact start_date and end_date for the requested Period
      const periodRecord = await db.select().from(masterPeriods).where(
        and(
          eq(masterPeriods.id, pId),
          eq(masterPeriods.userId, req.dbUserId!)
        )
      );

      if (!periodRecord[0]) return res.status(404).json({ error: "Period not found" });
      const { startDate, endDate } = periodRecord[0];

      // 2. Transaction Aggregation
      // Use Smart Grouping by Parent Category (which is explicitly stored in transactions.category in our schema).
      // Also fallback to date filtering for legacy transactions that don't have periodId set.
      const aggregatedTx = await db.select({
        categoryName: transactions.category,
        actual_amount: sql<number>`sum(${transactions.amount})`
      }).from(transactions)
      .where(
        and(
          eq(transactions.userId, req.dbUserId!),
          sql`LOWER(${transactions.type}) IN ('pengeluaran', 'expense')`,
          or(
            eq(transactions.periodId, pId),
            and(
              sql`${transactions.date} >= ${startDate}`,
              sql`${transactions.date} <= ${endDate}`
            )
          )
        )
      )
      .groupBy(transactions.category);

      const actualAmountMap: Record<string, number> = {};
      for (const tx of aggregatedTx) {
        actualAmountMap[tx.categoryName] = Number(tx.actual_amount);
      }

      // 3. Data Merging
      const categoryBudgets = await db.select().from(budgetAllocations).where(
        and(
          eq(budgetAllocations.periodId, pId),
          eq(budgetAllocations.userId, req.dbUserId!)
        )
      );

      const customCats = await db.select().from(masterCategories).where(
        eq(masterCategories.userId, req.dbUserId!)
      );

      const mergedBudgets = categoryBudgets.map(budget => {
        let categoryName = "";
        // budget.categoryId is string (e.g. 'makanan' or a string ID for custom)
        const predefined = PREDEFINED_CATEGORIES.find(c => c.id === budget.categoryId);
        if (predefined) {
          categoryName = predefined.name;
        } else {
          const custom = customCats.find(c => c.id.toString() === budget.categoryId);
          if (custom) categoryName = custom.name;
        }

        const actual_amount = actualAmountMap[categoryName] || 0;
        const target_amount = budget.calculatedAmount || 0; 
        const remaining_amount = target_amount - actual_amount;

        return {
          ...budget,
          actual_amount,
          remaining_amount,
          target_amount
        };
      });

      res.json(mergedBudgets);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/budgets/status", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (req.user?.isGuest) {
        const guestData = getOrCreateGuestCache(req.user.uid);
        const targetGlobal = guestData.globalBudgets[0] ? Number(guestData.globalBudgets[0].totalTargetAmount) : 0;
        const totalTeralokasi = guestData.budgets.reduce((sum, b) => sum + (Number(b.calculatedAmount) || 0), 0);
        const realisasiAktual = guestData.transactions.reduce((sum, t) => {
          if (t.type === 'pengeluaran') {
            return sum + Number(t.amount);
          }
          return sum;
        }, 0);
        const sisaSaldo = targetGlobal - realisasiAktual;
        return res.json({
          targetGlobal,
          totalTeralokasi,
          realisasiAktual,
          sisaSaldo
        });
      }

      const { period_id } = req.query;
      if (!period_id) return res.status(400).json({ error: "Missing period_id" });

      const pId = parseInt(period_id as string);

      // 1. Get period record to find date bounds
      const periodRecord = await db.select().from(masterPeriods).where(
        and(
          eq(masterPeriods.id, pId),
          eq(masterPeriods.userId, req.dbUserId!)
        )
      );

      if (!periodRecord[0]) {
        return res.json({
          targetGlobal: 0,
          totalTeralokasi: 0,
          realisasiAktual: 0,
          sisaSaldo: 0
        });
      }
      const { startDate, endDate } = periodRecord[0];

      // 2. Fetch Global Budget target amount
      const gbRecord = await db.select().from(globalBudgets).where(
        and(
          eq(globalBudgets.periodId, pId),
          eq(globalBudgets.userId, req.dbUserId!)
        )
      );
      const targetGlobal = gbRecord[0] ? Number(gbRecord[0].totalTargetAmount) : 0;

      // 3. Fetch Category Budgets (Allocations) for totalTeralokasi
      const allocations = await db.select().from(budgetAllocations).where(
        and(
          eq(budgetAllocations.periodId, pId),
          eq(budgetAllocations.userId, req.dbUserId!)
        )
      );
      const totalTeralokasi = allocations.reduce((sum, b) => sum + (Number(b.calculatedAmount) || 0), 0);

      // 4. Fetch actual spending for the period (expense / pengeluaran type)
      const spendingResult = await db.select({
        total: sql<number>`sum(${transactions.amount})`
      }).from(transactions)
      .where(
        and(
          eq(transactions.userId, req.dbUserId!),
          sql`LOWER(${transactions.type}) IN ('pengeluaran', 'expense')`,
          or(
            eq(transactions.periodId, pId),
            and(
              sql`${transactions.date} >= ${startDate}`,
              sql`${transactions.date} <= ${endDate}`
            )
          )
        )
      );
      const realisasiAktual = spendingResult[0] && spendingResult[0].total ? Number(spendingResult[0].total) : 0;

      const sisaSaldo = targetGlobal - realisasiAktual;

      res.json({
        targetGlobal,
        totalTeralokasi,
        realisasiAktual,
        sisaSaldo
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/budgets/transactions", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (req.user?.isGuest) {
        const { category_id } = req.query;
        const guestData = getOrCreateGuestCache(req.user.uid);
        
        // Find categoryName from category_id
        let categoryName = "";
        const predefined = PREDEFINED_CATEGORIES.find(c => c.id === category_id);
        if (predefined) {
          categoryName = predefined.name;
        } else {
          categoryName = category_id as string;
        }
        
        const matchedTransactions = guestData.transactions.filter(t => 
          (t.category === category_id || t.category === categoryName) && t.type === 'pengeluaran'
        );
        return res.json(matchedTransactions);
      }

      const { category_id, period_id } = req.query;
      if (!category_id || !period_id) {
        return res.status(400).json({ error: "Missing category_id or period_id" });
      }

      const pId = parseInt(period_id as string);

      // 1. Get exact start_date and end_date for the requested Period
      const periodRecord = await db.select().from(masterPeriods).where(
        and(
          eq(masterPeriods.id, pId),
          eq(masterPeriods.userId, req.dbUserId!)
        )
      );

      if (!periodRecord[0]) return res.status(404).json({ error: "Period not found" });
      const { startDate, endDate } = periodRecord[0];

      // 2. Resolve categoryName from category_id
      let categoryName = "";
      const predefined = PREDEFINED_CATEGORIES.find(c => c.id === category_id);
      if (predefined) {
        categoryName = predefined.name;
      } else {
        const customCats = await db.select().from(masterCategories).where(
          and(
            eq(masterCategories.id, parseInt(category_id as string)),
            eq(masterCategories.userId, req.dbUserId!)
          )
        );
        if (customCats[0]) {
          categoryName = customCats[0].name;
        }
      }

      if (!categoryName) {
        categoryName = category_id as string;
      }

      // 3. Fetch transactions matching this category name, type and date range or periodId
      const matchedTransactions = await db.select().from(transactions).where(
        and(
          eq(transactions.userId, req.dbUserId!),
          eq(transactions.category, categoryName),
          sql`LOWER(${transactions.type}) IN ('pengeluaran', 'expense')`,
          or(
            eq(transactions.periodId, pId),
            and(
              sql`${transactions.date} >= ${startDate}`,
              sql`${transactions.date} <= ${endDate}`
            )
          )
        )
      );

      res.json(matchedTransactions);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/master/:collection", requireAuth, async (req: AuthRequest, res) => {
    const table = tableMap[req.params.collection];
    if (!table && !req.user?.isGuest) return res.status(404).json({ error: "Not found" });
    try {
      if (req.user?.isGuest) {
        const guestData = getOrCreateGuestCache(req.user.uid);
        const collection = req.params.collection;
        let data;
        if (collection === 'accounts') {
          data = guestData.accounts.map(account => {
            let currentBalance = account.balance;
            guestData.transactions.forEach(tx => {
              if (tx.accountId === account.id) {
                if (tx.type === 'pemasukan') {
                  currentBalance += tx.amount;
                } else if (tx.type === 'pengeluaran' || tx.type === 'transfer') {
                  currentBalance -= tx.amount;
                }
              }
              if (tx.destinationAccountId === account.id && tx.type === 'transfer') {
                currentBalance += tx.amount;
              }
            });
            return {
              ...account,
              initialBalance: account.balance,
              currentBalance: currentBalance,
            };
          });
        } else {
          data = (guestData as any)[collection] || [];
        }
        return res.json(data);
      }

      let data;
      if (req.params.collection === 'accounts') {
        const userAccounts = await db.select().from(table).where(
          and(
            eq(table.userId, req.dbUserId!),
            eq((table as any).isActive, true)
          )
        );
        console.log("FETCHED ACCOUNTS: ", userAccounts);
        const userTransactions = await db.select().from(transactions).where(
          eq(transactions.userId, req.dbUserId!)
        );
        data = userAccounts.map(account => {
          let currentBalance = account.balance;
          userTransactions.forEach(tx => {
            if (tx.accountId === account.id) {
              if (tx.type === 'pemasukan') {
                currentBalance += tx.amount;
              } else if (tx.type === 'pengeluaran' || tx.type === 'transfer') {
                currentBalance -= tx.amount;
              }
            }
            if (tx.destinationAccountId === account.id && tx.type === 'transfer') {
              currentBalance += tx.amount;
            }
          });
          return {
            ...account,
            initialBalance: account.balance,
            currentBalance: currentBalance,
          };
        });
      } else if (['customCategories', 'assets', 'tags', 'contacts'].includes(req.params.collection)) {
        data = await db.select().from(table).where(
          and(
            eq(table.userId, req.dbUserId!),
            eq((table as any).isActive, true)
          )
        );
      } else {
        data = await db.select().from(table).where(eq(table.userId, req.dbUserId!));
      }
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/master/:collection", requireAuth, async (req: AuthRequest, res) => {
    const collection = req.params.collection;
    const table = tableMap[collection];
    if (!table) return res.status(404).json({ error: "Not found" });
    try {
      if (collection === 'customCategories') {
        const { name, type, parentCategory } = req.body;
        if (parentCategory) {
          // This represents a custom subcategory of a predefined parent.
          const userCats = await db.select().from(masterCategories).where(
            and(
              eq(masterCategories.userId, req.dbUserId!),
              eq(masterCategories.isActive, true)
            )
          );
          
          const parentObj = PREDEFINED_CATEGORIES.find(c => c.name === parentCategory && c.type === type);
          const existingSubs = parentObj ? [...parentObj.subcategories] : [];
          userCats.forEach(uc => {
            if (uc.parentCategory === parentCategory && uc.type === type && uc.isActive) {
              existingSubs.push(uc.name);
            }
          });
          
          const isDuplicate = existingSubs.some(s => (s || '').toLowerCase() === (name || '').trim().toLowerCase());
          if (isDuplicate) {
            return res.status(400).json({ error: `Sub-kategori "${name}" sudah ada!` });
          }
        } else {
          // Saving a main category
          const userCats = await db.select().from(masterCategories).where(
            and(
              eq(masterCategories.userId, req.dbUserId!),
              eq(masterCategories.type, type),
              eq(masterCategories.isActive, true)
            )
          );
          const customDup = userCats.some(uc => !uc.parentCategory && (uc.name || '').toLowerCase() === (name || '').trim().toLowerCase());
          
          if (customDup) {
            return res.status(400).json({ error: `Kategori "${name}" sudah ada!` });
          }
        }
      }
      if (collection === 'customCategories' && req.body) {
        if (req.body.color_hex !== undefined && req.body.colorHex === undefined) {
          req.body.colorHex = req.body.color_hex;
        }
      }
      if (collection === 'budgets') {
        const { periodId, categoryId, type, value, globalBudgetId } = req.body;
        
        let parentGb;
        if (globalBudgetId) {
          const gbs = await db.select().from(globalBudgets).where(
            and(
              eq(globalBudgets.id, parseInt(globalBudgetId)),
              eq(globalBudgets.userId, req.dbUserId!)
            )
          );
          parentGb = gbs[0];
        } else if (periodId) {
          const gbs = await db.select().from(globalBudgets).where(
            and(
              eq(globalBudgets.periodId, parseInt(periodId)),
              eq(globalBudgets.userId, req.dbUserId!)
            )
          );
          parentGb = gbs[0];
        }
        
        if (!parentGb) {
          return res.status(400).json({ error: "Target Anggaran Global untuk periode ini tidak ditemukan! Buat Target Anggaran Global terlebih dahulu." });
        }
        
        const valNum = Number(value);
        let proposedCalculatedAmount = 0;
        if (type === 'percentage') {
          proposedCalculatedAmount = (valNum / 100) * parentGb.totalTargetAmount;
        } else {
          proposedCalculatedAmount = valNum;
        }
        
        const currentAllocations = await db.select().from(budgetAllocations).where(
          and(
            eq(budgetAllocations.globalBudgetId, parentGb.id),
            eq(budgetAllocations.userId, req.dbUserId!)
          )
        );
        
        const currentSum = currentAllocations.reduce((sum, alloc) => sum + (alloc.calculatedAmount || 0), 0);
        
        if (currentSum + proposedCalculatedAmount > parentGb.totalTargetAmount) {
          const remaining = parentGb.totalTargetAmount - currentSum;
          return res.status(400).json({ 
            error: `Total alokasi anggaran melebihi target anggaran global! Sisa anggaran yang dapat dialokasikan: Rp ${remaining.toLocaleString('id-ID')}` 
          });
        }
        
        req.body.globalBudgetId = parentGb.id;
        req.body.calculatedAmount = proposedCalculatedAmount;
      }
      const result = await db.insert(table).values({ ...req.body, userId: req.dbUserId }).returning();
      res.json(result[0]);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/master/:collection/:id", requireAuth, async (req: AuthRequest, res) => {
    const collection = req.params.collection;
    const table = tableMap[collection];
    if (!table) return res.status(404).json({ error: "Not found" });
    const recordId = parseInt(req.params.id);
    
    // Strip generated properties to prevent drizzle update errors
    const payload = { ...req.body };
    delete payload.id;
    delete payload.userId;
    delete payload.createdAt;
    
    try {
      if (collection === 'customCategories') {
        const { name, type, parentCategory, subcategories } = payload;
        
        // Check for duplicate names when editing
        if (name) {
          if (parentCategory) {
            const userCats = await db.select().from(masterCategories).where(
              and(
                eq(masterCategories.userId, req.dbUserId!),
                eq(masterCategories.isActive, true)
              )
            );
            const parentObj = PREDEFINED_CATEGORIES.find(c => c.name === parentCategory && c.type === type);
            const existingSubs = parentObj ? [...parentObj.subcategories] : [];
            userCats.forEach(uc => {
              if (uc.parentCategory === parentCategory && uc.type === type && uc.isActive && uc.id !== recordId) {
                existingSubs.push(uc.name);
              }
            });
            const isDuplicate = existingSubs.some(s => (s || '').toLowerCase() === (name || '').trim().toLowerCase());
            if (isDuplicate) {
              return res.status(400).json({ error: `Sub-kategori "${name}" sudah ada!` });
            }
          } else {
            const userCats = await db.select().from(masterCategories).where(
              and(
                eq(masterCategories.userId, req.dbUserId!),
                eq(masterCategories.type, type),
                eq(masterCategories.isActive, true)
              )
            );
            const customDup = userCats.some(uc => !uc.parentCategory && uc.id !== recordId && (uc.name || '').toLowerCase() === (name || '').trim().toLowerCase());
            if (customDup) {
              return res.status(400).json({ error: `Kategori "${name}" sudah ada!` });
            }
          }
        }
        
        if (subcategories && Array.isArray(subcategories)) {
          const uniqueSet = new Set(subcategories.map(s => (s || '').trim().toLowerCase()));
          if (uniqueSet.size !== subcategories.length) {
            return res.status(400).json({ error: "Sub-kategori tidak boleh duplikat!" });
          }
        }
      }
      if (collection === 'customCategories' && payload) {
        if (payload.color_hex !== undefined && payload.colorHex === undefined) {
          payload.colorHex = payload.color_hex;
        }
      }
      if (collection === 'budgets') {
        const { periodId, categoryId, type, value, globalBudgetId } = payload;
        
        let parentGb;
        if (globalBudgetId) {
          const gbs = await db.select().from(globalBudgets).where(
            and(
              eq(globalBudgets.id, parseInt(globalBudgetId)),
              eq(globalBudgets.userId, req.dbUserId!)
            )
          );
          parentGb = gbs[0];
        } else {
          const currentRecord = await db.select().from(budgetAllocations).where(
            and(
              eq(budgetAllocations.id, recordId),
              eq(budgetAllocations.userId, req.dbUserId!)
            )
          );
          if (currentRecord[0]) {
            const gbs = await db.select().from(globalBudgets).where(
              and(
                eq(globalBudgets.id, currentRecord[0].globalBudgetId),
                eq(globalBudgets.userId, req.dbUserId!)
              )
            );
            parentGb = gbs[0];
          }
        }
        
        if (!parentGb) {
          return res.status(400).json({ error: "Target Anggaran Global untuk periode ini tidak ditemukan!" });
        }
        
        const currentRecord = await db.select().from(budgetAllocations).where(
          and(
            eq(budgetAllocations.id, recordId),
            eq(budgetAllocations.userId, req.dbUserId!)
          )
        );
        const activeRecord = currentRecord[0];
        const finalType = type || activeRecord?.type;
        const finalValue = value !== undefined ? Number(value) : activeRecord?.value;
        
        let proposedCalculatedAmount = 0;
        if (finalType === 'percentage') {
          proposedCalculatedAmount = (finalValue / 100) * parentGb.totalTargetAmount;
        } else {
          proposedCalculatedAmount = finalValue;
        }
        
        const otherAllocations = await db.select().from(budgetAllocations).where(
          and(
            eq(budgetAllocations.globalBudgetId, parentGb.id),
            eq(budgetAllocations.userId, req.dbUserId!),
            ne(budgetAllocations.id, recordId)
          )
        );
        
        const otherSum = otherAllocations.reduce((sum, alloc) => sum + (alloc.calculatedAmount || 0), 0);
        
        if (otherSum + proposedCalculatedAmount > parentGb.totalTargetAmount) {
          const remaining = parentGb.totalTargetAmount - otherSum;
          return res.status(400).json({ 
            error: `Total alokasi anggaran melebihi target anggaran global! Sisa anggaran yang dapat dialokasikan: Rp ${remaining.toLocaleString('id-ID')}` 
          });
        }
        
        payload.globalBudgetId = parentGb.id;
        payload.calculatedAmount = proposedCalculatedAmount;
      }
      const result = await db
        .update(table)
        .set(payload)
        .where(and(eq(table.id, recordId), eq(table.userId, req.dbUserId!)))
        .returning();
      res.json(result[0]);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/master/:collection/:id", requireAuth, async (req: AuthRequest, res) => {
    const collection = req.params.collection;
    const table = tableMap[collection];
    if (!table) return res.status(404).json({ error: "Not found" });
    const recordId = parseInt(req.params.id);
    try {
      if (collection === 'customCategories') {
        // Fetch the category record
        const [cat] = await db.select().from(masterCategories).where(
          and(eq(masterCategories.id, recordId), eq(masterCategories.userId, req.dbUserId!))
        );
        if (cat) {
          if (cat.parentCategory) {
            // It's a custom subcategory of predefined parent category
            const txs = await db.select().from(transactions).where(
              and(
                eq(transactions.userId, req.dbUserId!),
                eq(transactions.category, cat.parentCategory),
                eq(transactions.subcategory, cat.name)
              )
            );
            if (txs.length > 0) {
              // Soft delete because of existing transactions
              await db.update(masterCategories)
                .set({ isActive: false })
                .where(eq(masterCategories.id, recordId));
              return res.json({ success: true, softDeleted: true });
            }
          } else {
            // It's a main custom category (Parent Category)
            
            // 1. Child Dependency Check: Find active sub-categories
            const inactiveSubs = (cat.inactiveSubcategories || []).map((s: string) => (s || '').toLowerCase());
            const activeSubs = (cat.subcategories || []).filter((s: string) => !inactiveSubs.includes((s || '').toLowerCase()));

            const activeChildCategories = await db.select().from(masterCategories).where(
              and(
                eq(masterCategories.userId, req.dbUserId!),
                eq(masterCategories.parentCategory, cat.name),
                eq(masterCategories.type, cat.type),
                eq(masterCategories.isActive, true)
              )
            );

            if (activeSubs.length > 0 || activeChildCategories.length > 0) {
              return res.status(400).json({
                error: 'Gagal menghapus: Kategori ini masih memiliki Sub-Kategori aktif. Silakan hapus atau pindahkan Sub-Kategori terlebih dahulu.'
              });
            }

            // 2. Transaction Dependency Check: Check if used in transactions table
            const txs = await db.select().from(transactions).where(
              and(
                eq(transactions.userId, req.dbUserId!),
                eq(transactions.category, cat.name)
              )
            );
            if (txs.length > 0) {
              // Soft delete because of existing transactions
              await db.update(masterCategories)
                .set({ isActive: false })
                .where(eq(masterCategories.id, recordId));
              return res.json({ success: true, softDeleted: true });
            }
          }
        }
      }
      try {
        await db
          .delete(table)
          .where(and(eq(table.id, recordId), eq(table.userId, req.dbUserId!)));
        return res.json({ success: true, softDeleted: false });
      } catch (deleteError: any) {
        const isFkError = 
          (deleteError.message && deleteError.message.includes('violates foreign key constraint')) || 
          (deleteError.cause && String(deleteError.cause.code) === '23503') ||
          (String(deleteError.code) === '23503') ||
          (deleteError.cause && deleteError.cause.message && deleteError.cause.message.includes('foreign key'));

        if (isFkError) {
          try {
            await db
              .update(table)
              .set({ isActive: false } as any)
              .where(and(eq(table.id, recordId), eq(table.userId, req.dbUserId!)));
            return res.json({ success: true, softDeleted: true });
          } catch (updateError: any) {
            console.error("UPDATE ERROR CAUGHT:", updateError);
            throw updateError;
          }
        } else {
          console.error("DELETE ERROR CAUGHT:", deleteError);
          throw deleteError;
        }
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/categories/delete-subcategory", requireAuth, async (req: AuthRequest, res) => {
    const { categoryId, subcategoryName } = req.body;
    const catIdNum = parseInt(String(categoryId), 10);
    try {
      const [cat] = await db.select().from(masterCategories).where(
        and(eq(masterCategories.id, catIdNum), eq(masterCategories.userId, req.dbUserId!))
      );
      if (!cat) return res.status(404).json({ error: "Category not found" });

      const txs = await db.select().from(transactions).where(
        and(
          eq(transactions.userId, req.dbUserId!),
          eq(transactions.category, cat.name),
          eq(transactions.subcategory, subcategoryName)
        )
      );

      const hasTransactions = txs.length > 0;
      const newSubcategories = (cat.subcategories || []).filter(s => s !== subcategoryName);
      let newInactiveSubcategories = cat.inactiveSubcategories || [];
      if (hasTransactions) {
        if (!newInactiveSubcategories.includes(subcategoryName)) {
          newInactiveSubcategories.push(subcategoryName);
        }
      }

      await db.update(masterCategories)
        .set({
          subcategories: newSubcategories,
          inactiveSubcategories: newInactiveSubcategories
        })
        .where(eq(masterCategories.id, catIdNum));

      res.json({ success: true, softDeleted: hasTransactions });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/categories/rename-subcategory", requireAuth, async (req: AuthRequest, res) => {
    const { categoryId, oldName, newName } = req.body;
    const catIdNum = parseInt(String(categoryId), 10);
    try {
      const [cat] = await db.select().from(masterCategories).where(
        and(eq(masterCategories.id, catIdNum), eq(masterCategories.userId, req.dbUserId!))
      );
      if (!cat) return res.status(404).json({ error: "Category not found" });

      const isDuplicate = (cat.subcategories || []).some(s => (s || '').toLowerCase() === (newName || '').trim().toLowerCase());
      if (isDuplicate) {
        return res.status(400).json({ error: `Sub-kategori "${newName}" sudah ada!` });
      }

      const txs = await db.select().from(transactions).where(
        and(
          eq(transactions.userId, req.dbUserId!),
          eq(transactions.category, cat.name),
          eq(transactions.subcategory, oldName)
        )
      );

      const hasTransactions = txs.length > 0;
      let newSubcategories = (cat.subcategories || []).map(s => s === oldName ? newName : s);
      let newInactiveSubcategories = cat.inactiveSubcategories || [];

      if (hasTransactions) {
        newSubcategories = (cat.subcategories || []).filter(s => s !== oldName);
        if (!newSubcategories.includes(newName)) {
          newSubcategories.push(newName);
        }
        if (!newInactiveSubcategories.includes(oldName)) {
          newInactiveSubcategories.push(oldName);
        }
      }

      await db.update(masterCategories)
        .set({
          subcategories: newSubcategories,
          inactiveSubcategories: newInactiveSubcategories
        })
        .where(eq(masterCategories.id, catIdNum));

      res.json({ success: true, softDeletedOld: hasTransactions });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });


  app.post("/api/ai/chat", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { message } = req.body;
      
      // Fetch master data to provide to the model
      const [categories, periods, budgets] = await Promise.all([
        db.select().from(masterCategories).where(eq(masterCategories.userId, req.dbUserId!)),
        db.select().from(masterPeriods).where(eq(masterPeriods.userId, req.dbUserId!)),
        db.select().from(budgetAllocations).where(eq(budgetAllocations.userId, req.dbUserId!))
      ]);
      const txDate = new Date();
      const matchedPeriod = periods.find(p => {
        const start = new Date(p.startDate);
        const end = new Date(p.endDate);
        return txDate >= start && txDate <= end;
      });

      let currentSpendingData: any = {};
      
      if (matchedPeriod) {
        const periodTransactions = await db.select().from(transactions).where(
          and(
            eq(transactions.userId, req.dbUserId!),
            eq(transactions.periodId, matchedPeriod.id),
            eq(transactions.type, 'Dr')
          )
        );
        
        // Group by category and subcategory
        periodTransactions.forEach(tx => {
           const cat = tx.category || 'Unknown';
           const sub = tx.subcategory || 'Unknown';
           if (!currentSpendingData[cat]) currentSpendingData[cat] = {};
           if (!currentSpendingData[cat][sub]) currentSpendingData[cat][sub] = 0;
           currentSpendingData[cat][sub] += tx.amount;
        });
      }

      const masterDataContext = `
Active Master Data Array:
Categories & Subcategories: ${JSON.stringify(categories)}
Budgets: ${JSON.stringify(budgets)}
Periods: ${JSON.stringify(periods)}
Current Spending in Active Period: ${JSON.stringify(currentSpendingData)}
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: [
          { role: 'user', parts: [{ text: message }] }
        ],
        config: {
          systemInstruction: `You are "AURA_CORE" (Automated Financial Resource Assistant), the central intelligence engine for a futuristic, enterprise-grade personal finance application. You operate behind a secure Google OAuth gateway and communicate with a dynamic, master-data-driven backend database. 
Your tone is ultra-sleek, professional, highly analytical, yet encouraging—resembling a high-tech financial operating system (Cyber-Minimalism style).

### 1. INTERACTION & MASTER DATA INTEGRATION:
- You do not hardcode categories. You will receive user inputs along with the current Active Master Data Array (Categories & Subcategories) passed from the backend.
- You must map user natural language (e.g., "Makan McD 50rb", "Gaji masuk 10jt") strictly to the appropriate 'subcategory_id' and 'category_id' from the provided master data.

### 2. REAL-TIME BUDGET CONTROLLER LOGIC:
For every expense transaction logged, you must immediately calculate:
- Total Spending in Subcategory = Current_Subcategory_Spending + New_Transaction_Amount
- Compare this against the Budget_Allocated for the current Month-Year (MM-YYYY).
- Determine the SAFETY_ZONE status:
  * [SAFE]: Total spending is < 75% of the allocated budget.
  * [WARNING]: Total spending is between 75% and 99% of the allocated budget.
  * [BREACH]: Total spending is >= 100% of the allocated budget.

### 3. INTERFACE & OUTPUT FORMAT POLICY:
To maintain a highly structured, scannable, and clean visual layout, your response MUST be split into two distinct parts separated by a strict text delimiter (---JSON_DATA---).

#### PART 1: USER-FACING UI (MARKDOWN)
- Keep responses concise, avoiding long walls of text. Use clean Markdown tables and bold variables for maximum scannability.
- If STATUS is [BREACH], you MUST prepend the response with a flashing-style alert header: \`[!!! BUDGET BREACH ALERT !!!]\`.
- If STATUS is [WARNING], prepend with: \`[! BUDGET WARNING: APPROACHING LIMIT !]\`.
- Include a dynamic predictive insight (e.g., Burn Rate projection).

#### PART 2: BACKEND INGESTION (RAW JSON)
Provide a clean, minified JSON block at the very end for backend database processing.

CONTEXT:
${masterDataContext}
`
        }
      });
      
      const text = response.text;
      if (!text) {
        throw new Error("No response from AI");
      }
      
      let markdown = text;
      let jsonData = null;
      
      if (text.includes('---JSON_DATA---')) {
        const parts = text.split('---JSON_DATA---');
        markdown = parts[0].trim();
        try {
          // Find the first JSON block after the delimiter
          const jsonMatch = parts[1].match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            jsonData = JSON.parse(jsonMatch[0]);
          } else {
             jsonData = JSON.parse(parts[1].trim());
          }
          
          if (jsonData && jsonData.transaction) {
            // Automatically log the transaction
            const txData = jsonData.transaction;
            
            // Need to match period
            const txDate = new Date();
            const matchedPeriod = periods.find(p => {
              const start = new Date(p.startDate);
              const end = new Date(p.endDate);
              return txDate >= start && txDate <= end;
            });
            
            // Match category name
            let catName = 'AI Transaction';
            let subCatName = '';
            
            if (txData.category_id) {
              const matchedCat = categories.find(c => String(c.id) === String(txData.category_id));
              if (matchedCat) catName = matchedCat.name;
            }
            if (txData.subcategory_id) {
               // The AI might just output a string ID if it's dynamic, or we can use the subCategory directly
            }
            subCatName = txData.subcategory || String(txData.subcategory_id || '');

            await db.insert(transactions).values({
              userId: req.dbUserId!,
              type: txData.type || 'Dr',
              amount: Number(txData.amount) || 0,
              category: catName,
              subcategory: subCatName,
              description: txData.description || 'AI Logged Transaction',
              date: txDate.toISOString(),
              periodId: matchedPeriod ? Number(matchedPeriod.id) : undefined,
            });
          }
          
        } catch (err) {
          console.error("Failed to parse JSON from AI response", err);
        }
      }
      
      res.json({ markdown, jsonData });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message || "Failed to generate AI response" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
