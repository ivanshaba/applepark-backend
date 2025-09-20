// backend/services/paymentService.js
import Payment from "../models/Payment.js";
import fs from "fs";
import path from "path";

// ----------------- Relworx API Call with Retry -----------------
/**
 * Calls Relworx API with retries + exponential backoff
 * @param {string} endpoint - API endpoint (e.g., /mobile-money/request-payment)
 * @param {object} payload - Payload for the request
 * @param {string} RELWORX_API_KEY - API key
 * @param {string} RELWORX_BASE_URL - Base URL for API
 * @param {number} retries - Number of retry attempts
 * @returns {Promise<{ok: boolean, body: object}>}
 */
// In callRelworxAPI function, add better error logging:
export async function callRelworxAPI(endpoint, payload, RELWORX_API_KEY, RELWORX_BASE_URL, retries = 3) {
  const url = `${RELWORX_BASE_URL}${endpoint}`;
  
  // Check if API key is provided
  if (!RELWORX_API_KEY || RELWORX_API_KEY === '1e1d7b1abff46a.82wLZuTcQSdNaRvV-U6mEw') {
    console.error('❌ Invalid or missing Relworx API key');
    return { 
      ok: false, 
      body: { 
        message: "Relworx API configuration error - check API key",
        internal_reference: Math.random().toString(36).substring(7)
      } 
    };
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 Relworx API attempt ${attempt}:`, JSON.stringify(payload));
      
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/vnd.relworx.v2",
          "Authorization": `Bearer ${RELWORX_API_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      // Log the response status and headers for debugging
      console.log(`📨 Relworx response status: ${res.status}`);
      
      const json = await res.json();
      console.log(`📨 Relworx response:`, JSON.stringify(json));

      if (res.ok) {
        console.log(`✅ Relworx API success: ${endpoint} - Reference: ${payload.reference}`);
        return { ok: true, body: json };
      }

      // Handle specific error cases
      if (res.status === 401) {
        console.error('❌ Relworx API authentication failed - check API key');
        return { 
          ok: false, 
          body: { 
            message: "Authentication failed - invalid API key",
            internal_reference: json.internal_reference || Math.random().toString(36).substring(7)
          } 
        };
      }
      
      if (res.status === 429) {
        console.warn(`⚠️ Relworx API rate limit hit for ${payload.msisdn}. Retry attempt ${attempt}`);
      } else {
        console.warn(`⚠️ Relworx API attempt ${attempt} failed: ${json?.message || res.status}`);
      }
    } catch (err) {
      console.warn(`⚠️ Relworx API attempt ${attempt} error:`, err.message);
    }

    // Exponential backoff before retry
    const delay = 1000 * Math.pow(2, attempt); // 2s, 4s, 8s
    await new Promise(r => setTimeout(r, delay));
  }

  console.error(`❌ Relworx API failed after ${retries} attempts: Reference: ${payload.reference}`);
  return { 
    ok: false, 
    body: { 
      message: "Relworx API failed after retries",
      internal_reference: Math.random().toString(36).substring(7)
    } 
  };
}






// ----------------- Save Order to Database -----------------
export async function saveOrderDB(orderData) {
  try {
    const payment = new Payment(orderData);
    await payment.save();
    console.log(`Order saved to DB: ${orderData.reference}`);
    return true;
  } catch (error) {
    console.error("Error saving order to DB:", error);
    return false;
  }
}

// ----------------- Save Order to Local File -----------------
export async function saveOrderLocal(orderData) {
  try {
    const filePath = path.join(process.cwd(), 'orders.json');
    let orders = [];

    // Read existing orders if file exists
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      orders = JSON.parse(data);
    }

    // Add new order
    orders.push({
      ...orderData,
      timestamp: new Date().toISOString()
    });

    // Write back to file
    fs.writeFileSync(filePath, JSON.stringify(orders, null, 2));
    console.log(`Order saved locally: ${orderData.reference}`);
    return true;
  } catch (error) {
    console.error("Error saving order locally:", error);
    return false;
  }
}

// ----------------- Normalize Phone Number -----------------
export function normalizePhone(phone) {
  if (!phone) return "+256000000000";
  
  // Remove all non-digit characters except '+'
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // Handle different formats
  if (cleaned.startsWith('+256')) {
    return cleaned;
  } else if (cleaned.startsWith('256')) {
    return '+' + cleaned;
  } else if (cleaned.startsWith('0')) {
    return '+256' + cleaned.substring(1);
  } else if (cleaned.startsWith('7')) {
    return '+256' + cleaned;
  }
  
  // Default return if format is unrecognized
  return '+256' + cleaned;
}

// ----------------- Verify Webhook Signature -----------------
export function verifyWebhookSignature(rawBody, signature, secret) {
  // Implement proper webhook signature verification
  // This is a placeholder - you should implement proper signature verification
  return true;
}

// ----------------- Check if Webhook Processed -----------------
export async function isWebhookProcessed(reference) {
  try {
    const payment = await Payment.findOne({ reference });
    return payment && payment.status !== 'pending';
  } catch (error) {
    console.error("Error checking if webhook processed:", error);
    return false;
  }
}