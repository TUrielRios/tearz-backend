/**
 * Job: Process webhook events asynchronously.
 *
 * In a simple setup like this, the webhook is processed synchronously
 * in the payment controller. This module provides a queue-like wrapper
 * for future use if we need to move webhook processing to a background job.
 *
 * For now, it exports helper functions used by the payment service.
 */

const { Payment, Order } = require('../models');
const orderService = require('../services/orderService');
const emailService = require('../services/emailService');

/**
 * Process a payment status change.
 * Called from paymentService.processWebhook or could be called from a queue.
 */
const processPaymentStatusChange = async (orderId, mpStatus) => {
  const statusMap = {
    approved: 'approved',
    authorized: 'approved',
    in_process: 'pending',
    rejected: 'rejected',
    cancelled: 'rejected',
    refunded: 'rejected',
  };

  const newStatus = statusMap[mpStatus] || 'pending';

  if (newStatus === 'approved') {
    // Decrement stock and mark order as paid
    await orderService.processApprovedPayment(orderId);

    // Send confirmation email (non-blocking)
    emailService.sendOrderConfirmation(orderId).catch((err) => {
      console.error('⚠️ Error enviando email de confirmación:', err.message);
    });

    console.log(`✅ Orden ${orderId} procesada: PAID`);
  } else if (newStatus === 'rejected') {
    await Order.update({ status: 'cancelled' }, { where: { id: orderId } });
    console.log(`❌ Orden ${orderId} cancelada: pago rechazado`);
  }

  return newStatus;
};

module.exports = { processPaymentStatusChange };
