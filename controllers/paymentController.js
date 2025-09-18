// backend/controllers/paymentController.js

import { saveOrderDB, saveOrderLocal, callRelworxAPI, verifyWebhookSignature, isWebhookProcessed } from "../services/paymentService.js";
import Payment from "../models/Payment.js";

// ----------------------------
// Initiate Payment
// ----------------------------
async function initiatePayment(req, res) {
  try {
    // Destructure incoming request body
    const { 
      reference, 
      name, 
      email, 
      phone, 
      amount, 
      currency, 
      payment_method,   // 'mobile_money' | 'card'
      provider,         
      subscription_type, 
      device_count 
    } = req.body;

    // Decide Relworx endpoint based on payment method
    let endpoint = "";
    if (payment_method === "mobile_money") {
      endpoint = "/mobile-money/request-payment";
    } else if (payment_method === "card") {
      endpoint = "/card/request-payment";
    } else {
      // If payment method missing, default to mobile money
      endpoint = "/mobile-money/request-payment";
    }

    // Build request payload
    const payload = {
      account_no: process.env.RELWORX_ACCOUNT_NO,
      reference: reference || `AP-${Date.now()}`, // auto-generate if missing
      currency: currency || "UGX",
      amount: amount || 0,
      description: `ApplePark IPTV - ${subscription_type || "new subscription"}`,
    };

    if (payment_method === "mobile_money" || !payment_method) {
      payload.msisdn = phone || "+256000000000"; // default dummy number
      payload.provider = provider || "mtn";
    }

    // Call Relworx API
    const { ok, body } = await callRelworxAPI(
      endpoint,
      payload,
      process.env.RELWORX_API_KEY,
      process.env.RELWORX_BASE_URL
    );

    // Build order data for saving
    const orderData = {
      reference: payload.reference,
      name: name || "Anonymous",
      email: email || "noemail@example.com",
      phone: phone || "+256000000000",
      amount: amount || 0,
      currency: currency || "UGX",
      payment_method: payment_method || "mobile_money",
      provider: provider || "mtn",
      subscription_type: subscription_type || "new subscription",
      device_count: device_count || 1,
      relworx_response: body,
      status: ok ? "pending" : "failed",
    };

    // Save in DB + local
    await saveOrderDB(orderData);
    await saveOrderLocal(orderData);

    console.log(`Payment initiated: ${orderData.reference}, Method: ${orderData.payment_method}, Status: ${ok ? 'pending' : 'failed'}`);

    // Respond back
    if (ok) {
      res.status(200).json({
        success: true,
        message: 'Payment initiated successfully',
        data: body,
        reference: orderData.reference
      });
    } else {
      res.status(400).json({
        success: false,
        message: body?.message || 'Failed to initiate payment',
        data: body
      });
    }
  } catch (err) {
    console.error("initiatePayment error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Server error",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
}

// ----------------------------
// Handle Relworx Webhook
// ----------------------------
async function handleWebhook(req, res) {
  try {
    const rawBody = JSON.stringify(req.body);
    const signature = req.headers["x-relworx-signature"];

    // Verify webhook signature
    const valid = verifyWebhookSignature(
      rawBody,
      signature,
      process.env.RELWORX_WEBHOOK_SECRET
    );
    if (!valid) {
      console.warn('Invalid webhook signature');
      return res.status(401).json({ success: false, message: "Invalid signature" });
    }

    const { reference, status, transaction_id } = req.body;

    // Prevent double-processing
    if (await isWebhookProcessed(reference)) {
      console.log(`Webhook already processed for reference: ${reference}`);
      return res.status(200).json({ success: true, message: "Already processed" });
    }

    // Update DB with new payment status
    const updatedPayment = await Payment.findOneAndUpdate(
      { reference },
      { 
        status,
        transaction_id,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!updatedPayment) {
      console.error(`Payment not found for reference: ${reference}`);
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    console.log(`Payment status updated: ${reference}, Status: ${status}`);

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("handleWebhook error:", err);
    res.status(500).json({ success: false });
  }
}

export { initiatePayment, handleWebhook };
