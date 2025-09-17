import { saveOrderDB, saveOrderLocal, callRelworxAPI, verifyWebhookSignature, isWebhookProcessed } from "../services/paymentService.js";
import Payment from "../models/Payment.js";

// Start a new payment
async function initiatePayment(req, res) {
  try {
    const { reference, name, email, phone, amount, currency, payment_method, provider, subscription_type, device_count } = req.body;

    const payload = {
      account_no: process.env.RELWORX_ACCOUNT_NO,
      reference,
      msisdn: phone,
      currency,
      amount,
      description: `Payment for ${subscription_type || "service"}`,
    };

    // Call Relworx
    const { ok, body } = await callRelworxAPI(
      "/request-payment",
      payload,
      process.env.RELWORX_API_KEY,
      process.env.RELWORX_BASE_URL
    );

    // Save order
    const orderData = {
      reference,
      name,
      email,
      phone,
      amount,
      currency,
      payment_method,
      provider,
      subscription_type,
      device_count,
      relworx_response: body,
      status: ok ? "pending" : "failed",
    };

    await saveOrderDB(orderData);
    await saveOrderLocal(orderData);

    res.status(ok ? 200 : 400).json(body);
  } catch (err) {
    console.error("initiatePayment error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

// Handle Relworx webhook
async function handleWebhook(req, res) {
  try {
    const rawBody = JSON.stringify(req.body);
    const signature = req.headers["x-relworx-signature"];

    // Verify signature
    const valid = verifyWebhookSignature(rawBody, signature, process.env.RELWORX_WEBHOOK_SECRET);
    if (!valid) {
      return res.status(401).json({ success: false, message: "Invalid signature" });
    }

    const { reference, status } = req.body;

    // Skip if already processed
    if (await isWebhookProcessed(reference)) {
      return res.status(200).json({ success: true, message: "Already processed" });
    }

    // Update DB
    await Payment.findOneAndUpdate(
      { reference },
      { status },
      { new: true }
    );

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("handleWebhook error:", err);
    res.status(500).json({ success: false });
  }
}

export { initiatePayment, handleWebhook };
