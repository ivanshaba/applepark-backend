import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health check (for Render/Heroku monitoring)
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "ApplePark Backend Running ✅" });
});

// Payment route
app.post("/api/pay", async (req, res) => {
  try {
    const { amount, phone, provider, email, username } = req.body;

    if (!amount || !phone || !provider) {
      return res.status(400).json({ status: "error", message: "Missing required fields" });
    }

    const response = await fetch(process.env.RELWORX_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.RELWORX_API_KEY}`,
      },
      body: JSON.stringify({
        amount,
        phone,
        provider,
        email,
        username,
        currency: "UGX", // set default currency
      }),
    });

    const data = await response.json();
    res.json({ status: "success", data });
  } catch (error) {
    console.error("Payment Error:", error);
    res.status(500).json({ status: "error", message: "Payment request failed" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
