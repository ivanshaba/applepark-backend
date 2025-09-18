// backend/routes/paymentRoutes.js
import express from "express";
import { initiatePayment, handleWebhook } from "../controllers/paymentController.js";

const router = express.Router();

// POST /api/pay → Initiates a payment without validation
router.post("/pay", initiatePayment);

// POST /api/webhook/relworx → Handles webhook callbacks
router.post("/webhook/relworx", handleWebhook);

export default router;
