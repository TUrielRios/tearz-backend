const { MercadoPagoConfig, Preference, Payment: MPPayment } = require('mercadopago');
const config = require('../config');
const { Payment, Order, OrderItem, Product } = require('../models');
const orderService = require('./orderService');
const ApiError = require('../utils/ApiError');

// Initialize Mercado Pago client
const mpClient = new MercadoPagoConfig({
  accessToken: config.mp.accessToken,
});

class PaymentService {
  /**
   * Create a Mercado Pago payment preference for an order
   */
  async createPreference(orderId, userId) {
    // 1. Get the order with items
    const order = await Order.findOne({
      where: { id: orderId, userId },
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'images', 'description'] }],
        },
      ],
    });

    if (!order) {
      throw ApiError.notFound('Orden no encontrada');
    }

    if (order.status !== 'pending') {
      throw ApiError.badRequest('Esta orden ya fue procesada');
    }

    // 2. Check if payment already exists
    const existingPayment = await Payment.findOne({ where: { orderId: order.id } });
    if (existingPayment && existingPayment.paymentUrl) {
      return {
        orderId: order.id,
        paymentUrl: existingPayment.paymentUrl,
        preferenceId: existingPayment.externalId,
      };
    }

    // 3. Build preference items
    if (!order.items || order.items.length === 0) {
      console.error(`❌ La orden ${order.id} no tiene ítems asociados.`);
      throw ApiError.internal('La orden no contiene productos para procesar el pago.');
    }

    const items = order.items.map((item) => ({
      id: item.productId,
      title: item.product.name,
      description: item.product.description || item.product.name,
      picture_url: item.product.images?.[0] || '',
      quantity: item.quantity,
      unit_price: parseFloat(item.price),
      currency_id: 'ARS',
    }));

    // Add shipping cost as an item if applicable
    if (parseFloat(order.shippingCost) > 0) {
      items.push({
        id: 'shipping',
        title: 'Costo de envío',
        quantity: 1,
        unit_price: parseFloat(order.shippingCost),
        currency_id: 'ARS',
      });
    }

    // Add discount as negative item if applicable
    if (parseFloat(order.discount) > 0) {
      items.push({
        id: 'discount',
        title: 'Descuento',
        quantity: 1,
        unit_price: -parseFloat(order.discount),
        currency_id: 'ARS',
      });
    }

    // 4. Create MercadoPago preference
    const preferenceClient = new Preference(mpClient);

    const frontendUrl = config.cors.frontendUrl || 'http://localhost:5173';
    const backendUrl = config.backendUrl || 'http://localhost:3001';

    const isLocal = frontendUrl.includes('localhost');

    const preferenceData = {
      body: {
        items,
        back_urls: {
          success: `${frontendUrl}/checkout/success?order=${order.id}`,
          failure: `${frontendUrl}/checkout/failure?order=${order.id}`,
          pending: `${frontendUrl}/checkout/pending?order=${order.id}`,
        },
        // Solo activamos auto_return si no es localhost o si no estamos en producción
        auto_return: isLocal && config.mp.isProd ? undefined : 'approved',
        notification_url: isLocal ? undefined : `${backendUrl}/api/payments/webhook`,
        external_reference: order.id,
        statement_descriptor: 'TEARZ 1874',
      },
    };

    console.log('🚀 Creando preferencia de MP con datos:', JSON.stringify(preferenceData, null, 2));

    try {
      const preference = await preferenceClient.create(preferenceData);

      // 5. Save payment record
      const paymentRecord = await Payment.create({
        orderId: order.id,
        provider: 'mercadopago',
        status: 'pending',
        externalId: preference.id,
        paymentUrl: preference.init_point,
        rawData: { preferenceId: preference.id },
      });

      return {
        orderId: order.id,
        paymentUrl: preference.init_point,
        sandboxUrl: preference.sandbox_init_point,
        preferenceId: preference.id,
      };
    } catch (error) {
      console.error('❌ Error creando preferencia de MP:', error);
      throw ApiError.internal('Error al crear el pago con Mercado Pago');
    }
  }

  /**
   * Process webhook notification from Mercado Pago
   */
  async processWebhook(body, query) {
    // MP sends different types of notifications
    const topic = body.type || query.topic;
    const paymentId = body.data?.id || query.id;

    console.log('📩 Webhook recibido:', { topic, paymentId, body });

    if (topic !== 'payment') {
      // We only care about payment notifications
      return { received: true, processed: false };
    }

    if (!paymentId) {
      throw ApiError.badRequest('ID de pago no proporcionado');
    }

    try {
      // 1. Get payment info from Mercado Pago
      const mpPaymentClient = new MPPayment(mpClient);
      const mpPayment = await mpPaymentClient.get({ id: paymentId });

      console.log('💳 Pago MP:', {
        id: mpPayment.id,
        status: mpPayment.status,
        externalReference: mpPayment.external_reference,
        amount: mpPayment.transaction_amount,
      });

      const orderId = mpPayment.external_reference;
      if (!orderId) {
        throw ApiError.badRequest('Referencia de orden no encontrada en el pago');
      }

      // 2. Find our payment record
      let payment = await Payment.findOne({ where: { orderId } });

      if (!payment) {
        // Create payment record if it doesn't exist (edge case)
        payment = await Payment.create({
          orderId,
          provider: 'mercadopago',
          status: 'pending',
          externalId: String(mpPayment.id),
        });
      }

      // 3. Map MP status to our status
      const statusMap = {
        approved: 'approved',
        authorized: 'approved',
        in_process: 'pending',
        in_mediation: 'pending',
        rejected: 'rejected',
        cancelled: 'rejected',
        refunded: 'rejected',
        charged_back: 'rejected',
      };

      const newStatus = statusMap[mpPayment.status] || 'pending';

      // 4. Update payment record
      await payment.update({
        status: newStatus,
        externalId: String(mpPayment.id),
        rawData: {
          mpPaymentId: mpPayment.id,
          mpStatus: mpPayment.status,
          mpStatusDetail: mpPayment.status_detail,
          mpPaymentMethodId: mpPayment.payment_method_id,
          mpTransactionAmount: mpPayment.transaction_amount,
          mpDateApproved: mpPayment.date_approved,
        },
      });

      // 5. Process based on status
      if (newStatus === 'approved') {
        // Decrement stock, mark order as paid, and send emails
        const order = await orderService.processApprovedPayment(orderId);
        console.log(`✅ Orden ${orderId} procesada correctamente`);
      } else if (newStatus === 'rejected') {
        await Order.update({ status: 'cancelled' }, { where: { id: orderId } });
        console.log(`❌ Orden ${orderId} cancelada por pago rechazado`);
      }

      return { received: true, processed: true, status: newStatus };
    } catch (error) {
      console.error('❌ Error procesando webhook:', error);
      throw error;
    }
  }

  /**
   * Manually verify a payment status for an order
   * Useful as a fallback if webhooks are delayed
   */
  async verifyPayment(orderId) {
    const payment = await Payment.findOne({ where: { orderId } });
    if (!payment || !payment.externalId) {
      throw ApiError.notFound('No se encontró un intento de pago para esta orden');
    }

    // If already approved, just return it
    if (payment.status === 'approved') {
      return { status: 'approved' };
    }

    try {
      const mpPaymentClient = new MPPayment(mpClient);
      
      // Try to find the payment by external_reference in MP
      const searchResponse = await mpPaymentClient.search({
        qs: { external_reference: orderId }
      });

      const mpPayment = searchResponse.results?.[0];

      if (!mpPayment) {
        return { status: 'not_found' };
      }

      console.log(`🔍 Verificación manual para orden ${orderId}:`, mpPayment.status);

      const statusMap = {
        approved: 'approved',
        authorized: 'approved',
        in_process: 'pending',
        rejected: 'rejected',
        cancelled: 'rejected',
      };

      const newStatus = statusMap[mpPayment.status] || 'pending';

      if (newStatus === 'approved' && payment.status !== 'approved') {
        // Mark as approved and trigger order processing (includes emails)
        await payment.update({ status: 'approved', externalId: String(mpPayment.id) });
        const order = await orderService.processApprovedPayment(orderId);
      }

      return { status: newStatus };
    } catch (error) {
      console.error('❌ Error en verifyPayment:', error);
      throw error;
    }
  }
}

module.exports = new PaymentService();
