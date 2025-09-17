import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    tx_ref: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    payment_method: { type: String },
    provider_response: { type: Object }, // raw API response
    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Payment", paymentSchema);
