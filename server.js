import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import paymentRoutes from './routes/paymentRoutes.js';
import cors from 'cors';

dotenv.config();
connectDB();

const app = express();

// Middleware
app.use(express.json());
app.use(cors({ origin: '*' })); // allow your frontend origin in production

// Routes
app.use('/api', paymentRoutes);

// Health check
app.get('/', (req, res) => {
    res.send('ApplePark Backend is running!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
