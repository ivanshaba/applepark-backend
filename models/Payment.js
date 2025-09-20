// models/Payment.js
import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: "UGX" },
    payment_method: { type: String, required: true, enum: ["mobile_money", "card"] },
    provider: { type: String },
    subscription_type: { type: String, required: true, enum: ["new", "renew"] },
    device_count: { type: Number, default: 1 },
    relworx_response: { type: mongoose.Schema.Types.Mixed },
    transaction_id: { type: String },
    status: {
      type: String,
      enum: ["pending", "success", "failed", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

// Remove the duplicate index definitions from the schema and only define them here:
paymentSchema.index({ reference: 1 }, { unique: true });
paymentSchema.index({ email: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ createdAt: 1 });

export default mongoose.model("Payment", paymentSchema);