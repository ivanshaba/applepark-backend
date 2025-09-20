import express from 'express';
import fetch from 'node-fetch';
import Transaction from '../models/Transaction.js';

const router = express.Router();

// POST /api/pay
router.post('/pay', async (req, res) => {
    try {
        const {
            reference,
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

        // Save transaction as pending
        const transaction = await Transaction.create({
            reference,
            name,
            email,
            phone,
            amount,
            currency,
            payment_method,
            provider,
            subscription_type,
            device_count
        });

        // Prepare payload for Relworx
        const relworxPayload = {
            account_no: 'RELABE0529D5A', // Replace with your actual account
            reference,
            msisdn: phone,
            currency,
            amount,
            description: `${subscription_type} subscription for ${name}`
        };

        const response = await fetch('https://payments.relworx.com/api/mobile-money/request-payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.relworx.v2',
                'Authorization': `Bearer ${process.env.RELWORX_API_KEY}`
            },
            body: JSON.stringify(relworxPayload)
        });

        const data = await response.json();

        if (response.ok) {
            // Update transaction status to 'success' (or keep as pending if waiting for callback)
            transaction.status = 'pending';
            await transaction.save();
            res.status(200).json({ message: 'Payment request sent successfully', data });
        } else {
            transaction.status = 'failed';
            await transaction.save();
            res.status(400).json({ message: 'Payment request failed', data });
        }
    } catch (error) {
        console.error('Payment error:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

export default router;
