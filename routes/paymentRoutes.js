import express from "express";
import { initiatePayment, handleWebhook } from "../controllers/paymentController.js";
import { validatePayment } from "../validation/paymentValidation.js";

const router = express.Router();

router.post("/pay", validatePayment, initiatePayment);
router.post("/webhook/relworx", handleWebhook);

export default router;