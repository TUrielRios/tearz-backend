const { Router } = require('express');
const paymentController = require('../controllers/paymentController');
const auth = require('../middlewares/auth');

const router = Router();

// Create payment preference (authenticated user)
router.post('/create', auth, paymentController.createPayment);

// Mercado Pago webhook (no auth — MP calls this)
router.post('/webhook', paymentController.webhook);

module.exports = router;
