const orderService = require('../services/orderService');
const emailService = require('../services/emailService');
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

  res.json({
    success: true,
    data: result,
  });
});

const getById = asyncHandler(async (req, res) => {
  // Regular users can only see their own orders
  const userId = req.user.role === 'admin' ? null : req.user.id;
  const order = await orderService.getById(req.params.id, userId);

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
