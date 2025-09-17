// backend/services/paymentService.js

// ----------------- Imports -----------------
// import fetch from "node-fetch";              // For calling Relworx API (Node <18). On Node 18+, you can use global fetch.
import { createHmac } from "crypto";         // For verifying webhook signatures
import fs from "fs/promises";                // For local order fallback (file system)
import path from "path";                     // For handling file paths
import Payment from "../models/Payment.js";  // MongoDB model for payments

// ----------------- Local File Fallback -----------------
const ORDERS_FILE = path.join(process.cwd(), "orders.json");

/**
 * Save order data locally as fallback (orders.json)
 */
export async function saveOrderLocal(orderData) {
  try {
    let orders = [];
    try {
      const data = await fs.readFile(ORDERS_FILE, "utf8");
      orders = JSON.parse(data);
    } catch {
      // File doesn't exist yet
    }

    orders.push({ ...orderData, timestamp: new Date().toISOString() });
    await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2));

    console.log("✅ Order saved locally.");
  } catch (err) {
    console.error("❌ Local order saving error:", err.message);
  }
}

// ----------------- MongoDB Persistence -----------------
/**
 * Save order data to MongoDB
 */
export async function saveOrderDB(orderData) {
  try {
    const payment = new Payment(orderData);
    await payment.save();
    console.log("✅ Order saved in MongoDB.");
  } catch (err) {
    console.error("❌ MongoDB saving error:", err.message);
    await saveOrderLocal(orderData); // fallback if DB fails
  }
}

// ----------------- Relworx API Call with Retry -----------------
/**
 * Calls Relworx API with retries + exponential backoff
 */
export async function callRelworxAPI(endpoint, payload, RELWORX_API_KEY, RELWORX_BASE_URL, retries = 3) {
  const url = `${RELWORX_BASE_URL}${endpoint}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${RELWORX_API_KEY}`,
        },
        body: JSON.stringify(payload),
        timeout: 30000, // 30s timeout
      });

      const json = await res.json();

      if (res.ok) {
        console.log("✅ Relworx API success.");
        return { ok: true, body: json };
      }

      console.warn(`⚠️ Relworx API attempt ${attempt} failed: ${json?.message || res.status}`);
    } catch (err) {
      console.warn(`⚠️ Relworx API attempt ${attempt} error:`, err.message);
    }

    // exponential backoff before retry
    await new Promise(r => setTimeout(r, 1000 * attempt));
  }

  return { ok: false, body: { message: "Relworx API failed after retries" } };
}

// ----------------- Webhook Security -----------------
/**
 * Verifies Relworx webhook signature
 */
export function verifyWebhookSignature(rawBody, signatureHeader, RELWORX_WEBHOOK_SECRET) {
  if (!RELWORX_WEBHOOK_SECRET || !signatureHeader) return false;

  const hmac = createHmac("sha256", RELWORX_WEBHOOK_SECRET);
  hmac.update(rawBody);

  const computed = hmac.digest("hex");
  return signatureHeader === computed;
}

/**
 * Prevents duplicate webhook processing
 */
export async function isWebhookProcessed(reference) {
  const payment = await Payment.findOne({ reference });
  return payment?.status === "completed";
}
