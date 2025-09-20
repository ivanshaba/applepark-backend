import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
    reference: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'UGX' },
    payment_method: { type: String, default: 'mobile_money' },
    provider: { type: String, required: true },
    subscription_type: { type: String, required: true },
    device_count: { type: Number, default: 1 },
    status: { type: String, default: 'pending' }, // pending, success, failed
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Transaction', transactionSchema);
