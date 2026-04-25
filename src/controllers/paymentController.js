const paymentService = require('../services/paymentService');
const { asyncHandler } = require('../utils/helpers');

/**
 * Create a payment preference for an existing order
 * POST /api/payments/create
 */
const createPayment = asyncHandler(async (req, res) => {
  const { orderId } = req.body;

  const result = await paymentService.createPreference(orderId, req.user.id);

  res.status(201).json({
    success: true,
    message: 'Preferencia de pago creada',
    data: result,
  });
});

/**
 * Webhook endpoint for Mercado Pago notifications
 * POST /api/payments/webhook
 */
const webhook = asyncHandler(async (req, res) => {
  const result = await paymentService.processWebhook(req.body, req.query);

  // Always respond 200 to MP to avoid retries
  res.status(200).json({
    success: true,
    data: result,
  });
});

module.exports = { createPayment, webhook };
