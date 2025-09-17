import express from "express";
import { initiatePayment, handleWebhook } from "../controllers/paymentController.js";

const router = express.Router();

router.post("/pay", initiatePayment);
router.post("/webhook/relworx", handleWebhook);

export default router;
