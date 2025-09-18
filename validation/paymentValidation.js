import { body } from 'express-validator';

export const validatePayment = [
  body('reference')
    .notEmpty()
    .withMessage('Reference is required')
    .isLength({ min: 5 })
    .withMessage('Reference must be at least 5 characters'),
  
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters'),
  
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  
  body('amount')
    .isInt({ min: 1000 })
    .withMessage('Amount must be at least 1000'),
  
  body('currency')
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be 3 characters'),
  
  body('payment_method')
    .isIn(['mobile', 'card'])
    .withMessage('Payment method must be either mobile or card'),
  
  body('subscription_type')
    .isIn(['new', 'renew'])
    .withMessage('Subscription type must be either new or renew'),
  
  body('device_count')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Device count must be between 1 and 5'),
];