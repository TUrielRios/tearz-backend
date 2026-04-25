const { Order, OrderItem, Product, User, Category } = require('../models');
const { asyncHandler } = require('../utils/helpers');
const { Op, fn, col, literal } = require('sequelize');

/**
 * Dashboard stats — total orders, revenue, products, customers, low stock
 */
const getDashboard = asyncHandler(async (req, res) => {
  const [
    totalOrders,
    paidOrders,
    totalProducts,
    activeProducts,
    totalCustomers,
    lowStockProducts,
    recentOrders,
    ordersByStatus,
  ] = await Promise.all([
    Order.count(),
    Order.findAll({
      where: { status: { [Op.in]: ['paid', 'shipped', 'delivered'] } },
      attributes: [[fn('SUM', col('total_price')), 'revenue']],
      raw: true,
    }),
    Product.count(),
    Product.count({ where: { active: true } }),
    User.count({ where: { role: 'customer' } }),
    Product.findAll({
      where: { stock: { [Op.lte]: 10 }, active: true },
      attributes: ['id', 'name', 'stock', 'images'],
      order: [['stock', 'ASC']],
      limit: 10,
    }),
    Order.findAll({
      include: [
        { model: User, as: 'user', attributes: ['id', 'email', 'firstName', 'lastName'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: 8,
    }),
    Order.findAll({
      attributes: ['status', [fn('COUNT', col('id')), 'count']],
      group: ['status'],
      raw: true,
    }),
  ]);

  res.json({
    success: true,
    data: {
      stats: {
        totalOrders,
        revenue: parseFloat(paidOrders[0]?.revenue || 0),
        totalProducts,
        activeProducts,
        totalCustomers,
      },
      ordersByStatus,
      lowStockProducts,
      recentOrders,
    },
  });
});

/**
 * List all customers
 */
const getCustomers = asyncHandler(async (req, res) => {
  const customers = await User.findAll({
    where: { role: 'customer' },
    attributes: ['id', 'email', 'firstName', 'lastName', 'createdAt'],
    include: [{
      model: Order,
      as: 'orders',
      attributes: ['id', 'totalPrice', 'status'],
    }],
    order: [['createdAt', 'DESC']],
  });

  res.json({
    success: true,
    data: { customers },
  });
});

/**
 * List all orders for admin (with filters)
 */
const getAllOrders = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const where = {};
  if (status) where.status = status;

  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const { count, rows } = await Order.findAndCountAll({
    where,
    include: [
      { model: User, as: 'user', attributes: ['id', 'email', 'firstName', 'lastName'] },
      {
        model: OrderItem, as: 'items',
        include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'images'] }],
      },
    ],
    order: [['createdAt', 'DESC']],
    offset,
    limit: parseInt(limit, 10),
    distinct: true,
  });

  res.json({
    success: true,
    data: {
      orders: rows,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total: count,
        totalPages: Math.ceil(count / parseInt(limit, 10)),
      },
    },
  });
});

/**
 * Ship an order — set status to 'shipped', save tracking code, send email to customer
 * POST /api/admin/orders/:id/ship
 */
const shipOrder = asyncHandler(async (req, res) => {
  const { trackingCode, adminNotes } = req.body;
  const { id } = req.params;

  const order = await Order.findByPk(id);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Orden no encontrada' });
  }
  if (order.status !== 'paid') {
    return res.status(400).json({ success: false, message: 'La orden debe estar en estado "paid" para poder despacharla' });
  }

  await order.update({
    status: 'shipped',
    trackingCode: trackingCode || null,
    adminNotes: adminNotes || null,
  });

  // Send shipping notification email to customer
  const emailService = require('../services/emailService');
  try {
    await emailService.sendShippingNotification(id);
  } catch (emailError) {
    console.error('⚠️ Error enviando email de envío:', emailError.message);
  }

  console.log(`🚚 Orden ${id} marcada como SHIPPED — tracking: ${trackingCode || 'sin código'}`);

  res.json({
    success: true,
    message: 'Orden despachada y cliente notificado por email',
    data: { order },
  });
});

module.exports = { getDashboard, getCustomers, getAllOrders, shipOrder };

