// backend/controllers/paymentController.js
import { saveOrderDB, saveOrderLocal, callRelworxAPI, normalizePhone } from "../services/paymentService.js";
import Payment from "../models/Payment.js";

// ----------------------------
// Initiate Payment (Updated for Relworx API)
// ----------------------------
async function initiatePayment(req, res) {
  try {
    const {
      reference: incomingRef,
      name,
      email,
      phone,
      amount,
      currency,
      payment_method,
      provider,
      subscription_type,
      device_count
    } = req.body;

    // Ensure reference is 8-36 characters as required by Relworx
    const reference = incomingRef && incomingRef.length >= 8 && incomingRef.length <= 36 
      ? incomingRef 
      : `AP${Date.now().toString().slice(-12)}`;

    // Build payload for Relworx - EXACTLY as they require
    const payload = {
      account_no: process.env.RELWORX_ACCOUNT_NO || "RELABE0529D5A",
      reference: reference,
      msisdn: normalizePhone(phone) || "+256000000000", // Must be internationally formatted
      currency: currency || "UGX",
      amount: parseFloat(amount) || 0.0,
      description: `ApplePark IPTV - ${subscription_type || "new subscription"}`
    };

    // Call Relworx API
    const { ok, body } = await callRelworxAPI(
      "/mobile-money/request-payment",
      payload,
      process.env.RELWORX_API_KEY,
      process.env.RELWORX_BASE_URL || "https://payments.relworx.com/api"
    );

    // Build order data for DB
    const orderData = {
      reference,
      name: name || "Anonymous",
      email: email || "noemail@example.com",
      phone: phone || "+256000000000",
      amount: parseFloat(amount) || 0,
      currency: currency || "UGX",
      payment_method: payment_method || "mobile_money",
      provider: (provider || "mtn").toLowerCase(),
      subscription_type: subscription_type || "new subscription",
      device_count: device_count || 1,
      relworx_response: body,
      status: ok ? "pending" : "failed"
    };

    // Save order
    await saveOrderDB(orderData);
    await saveOrderLocal(orderData);

    console.log(`Payment initiated: ${reference}, Status: ${ok ? 'pending' : 'failed'}`);

    // Respond
    if (ok) {
      return res.status(200).json({
        success: true,
        message: 'Payment initiated successfully',
        data: body,
        reference
      });
    } else {
      return res.status(400).json({
        success: false,
        message: body?.message || 'Failed to initiate payment',
        data: body
      });
    }
  } catch (err) {
    console.error("initiatePayment error:", err);
    return res.status(500).json({
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
    if (!verifyWebhookSignature(rawBody, signature, process.env.RELWORX_WEBHOOK_SECRET)) {
      console.warn('Invalid webhook signature');
      return res.status(401).json({ success: false, message: "Invalid signature" });
    }

    const { reference, status, transaction_id } = req.body;

    // Prevent duplicate processing
    if (await isWebhookProcessed(reference)) {
      console.log(`Webhook already processed for reference: ${reference}`);
      return res.status(200).json({ success: true, message: "Already processed" });
    }

    // Update DB payment status
    const updatedPayment = await Payment.findOneAndUpdate(
      { reference },
      { status, transaction_id, updatedAt: new Date() },
      { new: true }
    );

    if (!updatedPayment) {
      console.error(`Payment not found for reference: ${reference}`);
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    console.log(`Payment status updated: ${reference}, Status: ${status}`);
    return res.status(200).json({ success: true });

  } catch (err) {
    console.error("handleWebhook error:", err);
    return res.status(500).json({ success: false });
  }
}

// Helper function to verify webhook signature
function verifyWebhookSignature(rawBody, signature, secret) {
  // Implement your webhook signature verification logic here
  // This is a placeholder - you should implement proper signature verification
  return true; // For now, return true. Implement proper verification in production.
}

// Helper function to check if webhook was already processed
async function isWebhookProcessed(reference) {
  const payment = await Payment.findOne({ reference });
  return payment && payment.status !== 'pending';
}

export { initiatePayment, handleWebhook };