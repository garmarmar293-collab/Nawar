
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient, ServerApiVersion } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'dist')));

// --- MongoDB Setup ---
const client = new MongoClient(MONGO_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let db;

async function connectDB() {
  try {
    await client.connect();
    db = client.db("mamoStore");
    console.log("✅ Connected to MongoDB Successfully!");
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error);
    process.exit(1);
  }
}

// --- API Endpoints ---

// 1. المنتجات
app.get('/api/products', async (req, res) => {
  try {
    const products = await db.collection("products").find({}).toArray();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const newProduct = { 
      ...req.body, 
      id: req.body.id || Date.now().toString(),
      createdAt: new Date()
    };
    await db.collection("products").insertOne(newProduct);
    res.status(201).json(newProduct);
  } catch (error) {
    res.status(500).json({ error: "Failed to add product" });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    delete updateData._id; // لا يسمح بتعديل _id

    const result = await db.collection("products").updateOne(
      { id: id },
      { $set: updateData }
    );

    if (result.matchedCount > 0) {
      res.json({ success: true, id });
    } else {
      res.status(404).json({ error: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to update product" });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection("products").deleteOne({ id: id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete product" });
  }
});

// 2. الهوية (تسجيل الدخول / إنشاء حساب)
app.post('/api/login', async (req, res) => {
  try {
    const { name, phone } = req.body;
    let user = await db.collection("users").findOne({ phone: phone });
    
    if (!user) {
      user = { 
        id: phone, 
        name, 
        phone, 
        joinDate: new Date().toISOString() 
      };
      await db.collection("users").insertOne(user);
    }
    
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
});

// 3. الصحة (Health Check)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'running', 
    database: db ? 'connected' : 'disconnected',
    timestamp: new Date() 
  });
});

// أي مسار آخر يخدم تطبيق React (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// تشغيل السيرفر بعد التأكد من اتصال القاعدة
connectDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`
    ███╗   ███╗ █████╗ ███╗   ███╗ ██████╗ 
    ████╗ ████║██╔══██╗████╗ ████║██╔═══██╗
    ██╔████╔██║███████║██╔████╔██║██║   ██║
    ██║╚██╔╝██║██╔══██║██║╚██╔╝██║██║   ██║
    ██║ ╚═╝ ██║██║  ██║██║ ╚═╝ ██║╚██████╔╝
    ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝ 
    🚀 خردوات المامو (نسخة السحاب) - المنفذ ${PORT}
    🌐 MongoDB: Connected to mamoStore
    `);
  });
});
