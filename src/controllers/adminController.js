const { Order, OrderItem, Product, User, Category, Payment } = require('../models');
const orderService = require('../services/orderService');
const emailService = require('../services/emailService');
const { asyncHandler } = require('../utils/helpers');
const { Op, fn, col, literal } = require('sequelize');
const config = require('../config');

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

  console.log('🔍 Fetching orders with where:', where);
  const { count, rows } = await Order.findAndCountAll({
    where,
    include: [
      { model: User, as: 'user', attributes: ['id', 'email', 'firstName', 'lastName'] },
      {
        model: OrderItem, as: 'items',
        include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'images'] }],
      },
      { model: Payment, as: 'payment', attributes: ['id', 'status', 'provider'] },
    ],
    order: [['createdAt', 'DESC']],
    offset,
    limit: parseInt(limit, 10),
    distinct: true,
  });

  console.log(`📊 Found ${rows.length} orders (Total count: ${count})`);

  // 🔄 Auto-sync: Marcar órdenes pendientes con pago aprobado como 'paid'
  // Esto corrige el caso donde el webhook no llegó pero el pago está aprobado
  const pendingOrders = rows.filter(o => o.status === 'pending' && o.payment?.status === 'approved');
  for (const order of pendingOrders) {
    try {
      await orderService.processApprovedPayment(order.id);
      console.log(`✅ Auto-sync: Orden ${order.id} marcada como PAID (pago aprobado detectado)`);
    } catch (error) {
      console.error(`❌ Error auto-sync orden ${order.id}:`, error.message);
    }
  }

  // Remover el campo payment del resultado para no exponerlo al frontend (opcional)
  const ordersWithoutPayment = rows.map(o => {
    const plain = o.toJSON();
    delete plain.payment;
    return plain;
  });

  res.json({
    success: true,
    data: {
      orders: ordersWithoutPayment,
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

/**
 * Test email configuration
 * GET /api/admin/test-email?to=...&type=...
 */
const testEmail = asyncHandler(async (req, res) => {
  const { to, type = 'test' } = req.query;
  const testTo = to || config.admin.email || config.email.user;

  if (!testTo) {
    return res.status(400).json({
      success: false,
      message: 'No hay email configurado. Configure ADMIN_EMAIL o EMAIL_USER en .env'
    });
  }

  let subject, html;
  const now = new Date().toLocaleString('es-AR');

  switch (type) {
    case 'order_confirm':
      subject = `✅ [TEST] Confirmación de compra — ${now}`;
      html = `
        <div style="font-family:Helvetica,Arial,sans-serif;max-width:600px;margin:auto;padding:20px;">
          <h1 style="color:#22c55e;">Prueba de Email – Confirmación de Orden</h1>
          <p>Este es un <strong>email de prueba</strong> del sistema Tearz 1874.</p>
          <p>Si recibís este email, la configuración de email funciona correctamente.</p>
          <hr>
          <p><small>Enviado desde: ${config.backendUrl}</small></p>
        </div>`;
      break;
    case 'admin_alert':
      subject = `🚨 [TEST] Alerta de Nueva Orden — ${now}`;
      html = `
        <div style="font-family:Helvetica,Arial,sans-serif;max-width:600px;margin:auto;padding:20px;">
          <h1 style="color:#dc2626;">Prueba de Email – Alerta a Admin</h1>
          <p>Este es un <strong>email de prueba</strong> de alerta de nueva orden pagada.</p>
          <p>El admin debería recibir esto cuando un cliente completa un pago.</p>
          <hr>
          <p><small>Enviado desde: ${config.backendUrl}</small></p>
        </div>`;
      break;
    case 'shipping':
      subject = `🚚 [TEST] Notificación de Envío — ${now}`;
      html = `
        <div style="font-family:Helvetica,Arial,sans-serif;max-width:600px;margin:auto;padding:20px;">
          <h1 style="color:#2563eb;">Prueba de Email – Orden Enviada</h1>
          <p>Este es un <strong>email de prueba</strong> notificando que la orden fue despachada.</p>
          <p>Incluye código de tracking y enlace a Andreani.</p>
          <hr>
          <p><small>Enviado desde: ${config.backendUrl}</small></p>
        </div>`;
      break;
    default:
      subject = `📧 [TEST] Email de prueba — ${now}`;
      html = `
        <div style="font-family:Helvetica,Arial,sans-serif;max-width:600px;margin:auto;padding:20px;">
          <h1>Email de prueba – Tearz 1874!</h1>
          <p>Si ves este email, la configuración de correo funciona correctamente.</p>
          <p><strong>No es una notificación real.</strong></p>
        </div>`;
  }

  const result = await emailService.send({ to: testTo, subject, html });

  res.json({
    success: true,
    message: 'Email de prueba enviado (o simulado)',
    data: { to: testTo, subject, result },
  });
});

module.exports = { getDashboard, getCustomers, getAllOrders, shipOrder, testEmail };

