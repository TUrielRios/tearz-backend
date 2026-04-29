const { Order, Payment } = require('../models');
const orderService = require('../services/orderService');
const emailService = require('../services/emailService');
const paymentService = require('../services/paymentService');
const { asyncHandler } = require('../utils/helpers');

const create = asyncHandler(async (req, res) => {
  const order = await orderService.create(req.user.id, req.body);

  res.status(201).json({
    success: true,
    message: 'Orden creada exitosamente',
    data: { order },
  });
});

const getUserOrders = asyncHandler(async (req, res) => {
  const result = await orderService.getUserOrders(req.user.id, {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 10,
  });

  // 🔄 Auto-sync: Marcar órdenes pendientes con pago aprobado como 'paid' y decrementar stock
  const pendingOrders = result.orders.filter(o => o.status === 'pending' && o.payment?.status === 'approved');
  for (const order of pendingOrders) {
    try {
      await orderService.processApprovedPayment(order.id);
      order.status = 'paid'; // actualizar en el array de respuesta
      console.log(`✅ Auto-sync (user orders): Orden ${order.id} marcada como PAID`);
    } catch (error) {
      console.error(`❌ Error auto-sync orden ${order.id}:`, error.message);
    }
  }

  res.json({
    success: true,
    data: result,
  });
});

const getById = asyncHandler(async (req, res) => {
  // Regular users can only see their own orders
  const userId = req.user.role === 'admin' ? null : req.user.id;
  let order = await orderService.getById(req.params.id, userId);

  // 🔄 Auto-sync avanzado: Si la orden está pendiente, sincronizar estado del pago
  if (order.status === 'pending' && order.payment) {
    try {
      // Caso 1: El pago ya está aprobado localmente (webhook actualizó pago pero falló orden)
      if (order.payment.status === 'approved') {
        await orderService.processApprovedPayment(order.id);
        console.log(`✅ Auto-sync (detalle): Orden ${order.id} marcada como PAID desde pago local aprobado`);
        order = await orderService.getById(req.params.id, userId);
      }
      // Caso 2: Pago pendiente local, pero puede estar aprobado en MP (webhook no llegó)
      else if (order.payment.externalId) {
        const verification = await paymentService.verifyPayment(order.id);
        if (verification.status === 'approved') {
          order = await orderService.getById(req.params.id, userId);
          console.log(`✅ Auto-sync (detalle): Orden ${order.id} marcada como PAID tras verificación MP`);
        }
      }
    } catch (error) {
      console.error(`⚠️ Error en auto-sync para orden ${order.id}:`, error.message);
      // No bloqueamos la visualización de la orden
    }
  }

  res.json({
    success: true,
    data: { order },
  });
});

const getAllOrders = asyncHandler(async (req, res) => {
  const result = await orderService.getAllOrders({
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 20,
    status: req.query.status,
  });

  // 🔄 Auto-sync: Marcar órdenes pendientes con pago aprobado como 'paid' y decrementar stock
  const pendingOrders = result.orders.filter(o => o.status === 'pending' && o.payment?.status === 'approved');
  for (const order of pendingOrders) {
    try {
      await orderService.processApprovedPayment(order.id);
      order.status = 'paid';
      console.log(`✅ Auto-sync (admin all): Orden ${order.id} marcada como PAID`);
    } catch (error) {
      console.error(`❌ Error auto-sync orden ${order.id}:`, error.message);
    }
  }

  res.json({
    success: true,
    data: result,
  });
});

const updateStatus = asyncHandler(async (req, res) => {
  const order = await orderService.updateStatus(req.params.id, req.body.status);

  // Send email notification for status changes
  try {
    await emailService.sendOrderStatusUpdate(order.id, req.body.status);
  } catch (emailError) {
    console.error('⚠️ Error enviando email de estado:', emailError.message);
  }

  // Send feedback request when order is delivered
  if (req.body.status === 'delivered') {
    try {
      await emailService.sendDeliveryFeedbackRequest(order.id);
    } catch (emailError) {
      console.error('⚠️ Error enviando email de feedback:', emailError.message);
    }
  }

  res.json({
    success: true,
    message: 'Estado de orden actualizado',
    data: { order },
  });
});

module.exports = { create, getUserOrders, getById, getAllOrders, updateStatus };
