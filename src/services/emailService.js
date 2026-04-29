const nodemailer = require('nodemailer');
const config = require('../config');
const { Order, OrderItem, Product, User } = require('../models');

class EmailService {
  constructor() {
    this.transporter = null;
  }

  getTransporter() {
    if (this.transporter) return this.transporter;

    if (!config.email.user || !config.email.password) {
      console.warn('⚠️ Email no configurado — emails no se enviarán');
      console.warn('   Variables requeridas: EMAIL_USER, EMAIL_PASSWORD');
      return null;
    }

    console.log(`📧 Configurando transporter de email para ${config.email.host}:${config.email.port}...`);
    
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465,
      auth: {
        user: config.email.user,
        pass: config.email.password,
      },
      tls: {
        // No fallar por certificados auto-firmados en algunos entornos
        rejectUnauthorized: false
      },
      // Timeouts para evitar que el proceso se quede colgado indefinidamente
      connectionTimeout: 10000, // 10s
      greetingTimeout: 10000,   // 10s
      socketTimeout: 30000      // 30s
    });

    return this.transporter;
  }

  async send({ to, subject, html }) {
    const transporter = this.getTransporter();
    if (!transporter) {
      console.log(`📧 [SIMULADO] Email a ${to}: ${subject}`);
      return { simulated: true };
    }

    console.log(`📧 [send] Intentando enviar a ${to}...`);
    
    try {
      const startTime = Date.now();
      const result = await transporter.sendMail({
        from: `"Tearz 1874!" <${config.email.from || config.email.user}>`,
        to,
        subject,
        html,
      });
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`✅ Email enviado exitosamente a ${to} (${duration}s): ${subject}`);
      return result;
    } catch (error) {
      console.error(`❌ Error enviando email a ${to}:`, error.message);
      if (error.code === 'EAUTH') {
        console.error('   👉 Tip: Verifica que EMAIL_USER y EMAIL_PASSWORD sean correctos.');
        console.error('   👉 Tip: Si usas Gmail, recuerda que debes usar una "Contraseña de Aplicación" si tienes 2FA activado.');
      }
      console.error(`   Código de error:`, error.code);
      return { error: error.message };
    }
  }

  /** Send order confirmation to CUSTOMER after payment approved */
  async sendOrderConfirmation(orderId) {
    console.log(`📦 [sendOrderConfirmation] Intentando enviar email de confirmación para orden ${orderId}`);
    const order = await Order.findByPk(orderId, {
      include: [
        { model: User, as: 'user' },
        {
          model: OrderItem,
          as: 'items',
          include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'images'] }],
        },
      ],
    });
    if (!order) {
      console.log(`❌ [sendOrderConfirmation] Orden ${orderId} no encontrada`);
      return;
    }
    if (!order.user) {
      console.log(`❌ [sendOrderConfirmation] Orden ${orderId} sin usuario asociado (userId: ${order.userId})`);
      return;
    }
    if (!order.user.email) {
      console.log(`❌ [sendOrderConfirmation] Usuario ${order.user.id} sin email configurado`);
      return;
    }
    console.log(`📧 [sendOrderConfirmation] Enviando a cliente: ${order.user.email} (orden ${orderId})`);

    const itemsHtml = (order.items || []).map((item) => `
      <tr>
        <td style="padding:12px;border-bottom:1px solid #eee;">
          ${item.product.name}${item.size ? ` — Talle: ${item.size}` : ''}
        </td>
        <td style="padding:12px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
        <td style="padding:12px;border-bottom:1px solid #eee;text-align:right;">$${parseFloat(item.price).toLocaleString('es-AR')}</td>
      </tr>`).join('');

    const html = `
    <div style="max-width:600px;margin:0 auto;font-family:'Helvetica Neue',Arial,sans-serif;color:#1a1a1a;">
      <div style="background:#1a1a1a;padding:24px;text-align:center;">
        <h1 style="color:#c8e64a;margin:0;font-size:24px;letter-spacing:2px;">TEARZ 1874!</h1>
      </div>
      <div style="padding:32px 24px;">
        <h2 style="margin:0 0 8px;font-size:20px;">¡Gracias por tu compra! 🎉</h2>
        <p style="color:#666;margin:0 0 24px;">
          Hola ${order.user.firstName || order.user.email.split('@')[0]}, tu pago fue confirmado exitosamente.
        </p>
        <div style="background:#f8f8f8;padding:16px;border-radius:8px;margin-bottom:24px;">
          <p style="margin:0;font-size:14px;color:#666;">Número de orden</p>
          <p style="margin:4px 0 0;font-size:16px;font-weight:bold;font-family:monospace;">#${order.id.slice(0,8).toUpperCase()}</p>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <thead>
            <tr style="background:#f8f8f8;">
              <th style="padding:12px;text-align:left;font-size:13px;text-transform:uppercase;color:#666;">Producto</th>
              <th style="padding:12px;text-align:center;font-size:13px;text-transform:uppercase;color:#666;">Cant.</th>
              <th style="padding:12px;text-align:right;font-size:13px;text-transform:uppercase;color:#666;">Precio</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div style="border-top:2px solid #1a1a1a;padding-top:16px;">
          ${parseFloat(order.discount) > 0 ? `<div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="color:#666;">Descuento:</span><span style="color:#22c55e;font-weight:bold;">-$${parseFloat(order.discount).toLocaleString('es-AR')}</span></div>` : ''}
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="color:#666;">Envío:</span><span>${parseFloat(order.shippingCost) > 0 ? `$${parseFloat(order.shippingCost).toLocaleString('es-AR')}` : '<span style="color:#22c55e;">GRATIS</span>'}</span></div>
          <div style="display:flex;justify-content:space-between;margin-top:12px;font-size:18px;font-weight:bold;"><span>Total:</span><span>$${parseFloat(order.totalPrice).toLocaleString('es-AR')}</span></div>
        </div>
        ${order.shippingAddress ? `
        <div style="margin-top:24px;padding:16px;background:#f8f8f8;border-radius:8px;">
          <h3 style="margin:0 0 8px;font-size:14px;text-transform:uppercase;color:#666;">Dirección de envío</h3>
          <p style="margin:0;line-height:1.8;">${typeof order.shippingAddress === 'string' ? order.shippingAddress : JSON.stringify(order.shippingAddress)}</p>
        </div>` : ''}
        <div style="margin-top:24px;padding:16px;background:#fffbeb;border-radius:8px;border-left:4px solid #f59e0b;">
          <p style="margin:0;font-size:14px;color:#92400e;">📦 <strong>Próximo paso:</strong> Tu pedido será preparado y te notificaremos por email cuando sea despachado.</p>
        </div>
      </div>
      <div style="background:#1a1a1a;padding:24px;text-align:center;">
        <p style="color:#999;margin:0;font-size:13px;">© ${new Date().getFullYear()} — TEARZ 1874!</p>
        <p style="color:#666;margin:8px 0 0;font-size:12px;">Ante cualquier consulta responde este email.</p>
      </div>
    </div>`;

    await this.send({
      to: order.user.email,
      subject: `Tearz 1874! — Confirmación de compra #${order.id.slice(0,8).toUpperCase()}`,
      html,
    });
  }

  /**
   * Notify ADMIN of a new paid order so they can dispatch it manually
   */
  async sendAdminNewOrderAlert(orderId) {
    const adminEmail = config.admin.email || config.email.user;
    console.log(`📧 [sendAdminNewOrderAlert] Orden ${orderId}, adminEmail: ${adminEmail}`);
    if (!adminEmail) {
      console.log(`❌ [sendAdminNewOrderAlert] No hay adminEmail configurado en .env`);
      return;
    }

    const order = await Order.findByPk(orderId, {
      include: [
        { model: User, as: 'user' },
        {
          model: OrderItem,
          as: 'items',
          include: [{ model: Product, as: 'product', attributes: ['id', 'name'] }],
        },
      ],
    });
    if (!order) {
      console.log(`❌ [sendAdminNewOrderAlert] Orden ${orderId} no encontrada`);
      return;
    }

    const itemsList = (order.items || []).map((i) =>
      `&#8226; ${i.product?.name || 'Producto'} x${i.quantity}${i.size ? ` (Talle: ${i.size})` : ''}`
    ).join('<br>');

    const adminPanelUrl = `${config.cors.frontendUrl}/admin/orders`;
    const address = typeof order.shippingAddress === 'string'
      ? order.shippingAddress
      : JSON.stringify(order.shippingAddress || '');

    const html = `
    <div style="max-width:600px;margin:0 auto;font-family:'Helvetica Neue',Arial,sans-serif;color:#1a1a1a;">
      <div style="background:#1a1a1a;padding:20px;text-align:center;">
        <h1 style="color:#c8e64a;margin:0;font-size:22px;letter-spacing:2px;">TEARZ 1874! — ADMIN</h1>
      </div>
      <div style="padding:28px 24px;">
        <div style="background:#dcfce7;border:1px solid #86efac;border-radius:8px;padding:16px;margin-bottom:24px;">
          <h2 style="margin:0;color:#166534;font-size:18px;">💰 Nueva orden pagada — hay que despachar</h2>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:14px;">
          <tr><td style="padding:8px 0;color:#666;width:40%">Orden #</td><td style="font-weight:bold;font-family:monospace;">${order.id.slice(0,8).toUpperCase()}</td></tr>
          <tr><td style="padding:8px 0;color:#666;">Cliente</td><td>${order.user?.firstName || ''} ${order.user?.lastName || ''} &lt;${order.user?.email}&gt;</td></tr>
          <tr><td style="padding:8px 0;color:#666;">Total</td><td style="font-weight:700;font-size:16px;">$${parseFloat(order.totalPrice).toLocaleString('es-AR')}</td></tr>
          <tr><td style="padding:8px 0;color:#666;">Dirección</td><td>${address}</td></tr>
        </table>
        <div style="background:#f8f8f8;padding:16px;border-radius:8px;margin-bottom:24px;">
          <p style="margin:0 0 8px;font-size:13px;text-transform:uppercase;color:#666;font-weight:600;">Productos</p>
          <p style="margin:0;line-height:2;">${itemsList}</p>
        </div>
        <a href="${adminPanelUrl}" style="display:block;background:#1a1a1a;color:#c8e64a;text-align:center;padding:14px;border-radius:6px;text-decoration:none;font-weight:bold;letter-spacing:1px;font-size:14px;">
          VER EN PANEL ADMIN →
        </a>
      </div>
      <div style="background:#f8f8f8;padding:16px;text-align:center;">
        <p style="color:#999;margin:0;font-size:12px;">Tearz 1874! — Notificación automática de nueva orden</p>
      </div>
    </div>`;

    await this.send({
      to: adminEmail,
      subject: `🚨 Nueva orden pagada #${order.id.slice(0,8).toUpperCase()} — $${parseFloat(order.totalPrice).toLocaleString('es-AR')}`,
      html,
    });

    console.log(`📧 Alerta de admin enviada para orden ${orderId}`);
  }

  /**
   * Notify CUSTOMER that their order was shipped, with Andreani tracking code
   */
  async sendShippingNotification(orderId) {
    console.log(`📦 [sendShippingNotification] Intentando enviar email de envío para orden ${orderId}`);
    const order = await Order.findByPk(orderId, {
      include: [
        { model: User, as: 'user' },
        {
          model: OrderItem,
          as: 'items',
          include: [{ model: Product, as: 'product', attributes: ['id', 'name'] }],
        },
      ],
    });
    if (!order) {
      console.log(`❌ [sendShippingNotification] Orden ${orderId} no encontrada`);
      return;
    }
    if (!order.user) {
      console.log(`❌ [sendShippingNotification] Orden ${orderId} sin usuario asociado`);
      return;
    }
    if (!order.user.email) {
      console.log(`❌ [sendShippingNotification] Usuario ${order.user.id} sin email`);
      return;
    }
    console.log(`📧 [sendShippingNotification] Enviando a cliente: ${order.user.email} (orden ${orderId})`);

    const trackingCode = order.trackingCode;
    const trackingSection = trackingCode ? `
      <div style="background:#eff6ff;border:1px solid #93c5fd;padding:20px;border-radius:8px;text-align:center;margin-bottom:24px;">
        <p style="margin:0 0 6px;font-size:13px;color:#1e40af;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Número de seguimiento</p>
        <p style="margin:0;font-size:26px;font-weight:bold;letter-spacing:2px;font-family:monospace;color:#1e3a8a;">${trackingCode}</p>
        <a href="https://www.andreani.com/#!/informacionEnvio/${trackingCode}"
           style="display:inline-block;margin-top:14px;background:#2563eb;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:bold;">
          RASTREAR MI PEDIDO 📦
        </a>
      </div>` : `
      <div style="background:#f8f8f8;padding:16px;border-radius:8px;margin-bottom:24px;text-align:center;">
        <p style="margin:0;color:#666;font-size:14px;">En breve recibirás más información sobre cómo rastrear tu envío.</p>
      </div>`;

    const itemsList = (order.items || []).map((i) =>
      `&#8226; ${i.product?.name || 'Producto'} x${i.quantity}${i.size ? ` (Talle: ${i.size})` : ''}`
    ).join('<br>');

    const html = `
    <div style="max-width:600px;margin:0 auto;font-family:'Helvetica Neue',Arial,sans-serif;color:#1a1a1a;">
      <div style="background:#1a1a1a;padding:24px;text-align:center;">
        <h1 style="color:#c8e64a;margin:0;font-size:24px;letter-spacing:2px;">TEARZ 1874!</h1>
      </div>
      <div style="padding:32px 24px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="font-size:52px;margin-bottom:12px;">🚚</div>
          <h2 style="margin:0 0 8px;font-size:22px;">¡Tu pedido está en camino!</h2>
          <p style="color:#666;margin:0;">
            Hola ${order.user.firstName || order.user.email.split('@')[0]}, tu pedido fue despachado.
          </p>
        </div>
        ${trackingSection}
        <div style="background:#f8f8f8;padding:16px;border-radius:8px;margin-bottom:24px;">
          <p style="margin:0 0 6px;font-size:13px;text-transform:uppercase;color:#666;font-weight:600;">Orden #${order.id.slice(0,8).toUpperCase()}</p>
          <p style="margin:0;line-height:2;font-size:14px;">${itemsList}</p>
        </div>
        ${order.adminNotes ? `
        <div style="background:#fffbeb;padding:16px;border-radius:8px;border-left:4px solid #f59e0b;margin-bottom:24px;">
          <p style="margin:0;font-size:14px;color:#92400e;">📝 <strong>Nota del equipo:</strong> ${order.adminNotes}</p>
        </div>` : ''}
        <p style="color:#666;font-size:14px;text-align:center;">
          El tiempo estimado de entrega es de <strong>3 a 7 días hábiles</strong> según tu zona.<br>
          Ante cualquier consulta podés responder este email.
        </p>
      </div>
      <div style="background:#1a1a1a;padding:24px;text-align:center;">
        <p style="color:#999;margin:0;font-size:13px;">© ${new Date().getFullYear()} — TEARZ 1874!</p>
      </div>
    </div>`;

    await this.send({
      to: order.user.email,
      subject: `Tearz 1874! — Tu pedido #${order.id.slice(0,8).toUpperCase()} fue enviado 🚚`,
      html,
    });
  }

  /** Generic status update email */
  async sendOrderStatusUpdate(orderId, newStatus) {
    const order = await Order.findByPk(orderId, {
      include: [{ model: User, as: 'user' }],
    });
    if (!order || !order.user) {
      console.log(`❌ [sendOrderStatusUpdate] Orden ${orderId} no encontrada o sin usuario`);
      return;
    }

    const statusLabels = {
      pending: { label: 'Pendiente', emoji: '⏳', color: '#f59e0b' },
      paid: { label: 'Pagado', emoji: '✅', color: '#22c55e' },
      shipped: { label: 'Enviado', emoji: '🚚', color: '#3b82f6' },
      delivered: { label: 'Entregado', emoji: '📦', color: '#22c55e' },
      cancelled: { label: 'Cancelado', emoji: '❌', color: '#ef4444' },
    };
    const statusInfo = statusLabels[newStatus] || statusLabels.pending;

    const html = `
    <div style="max-width:600px;margin:0 auto;font-family:'Helvetica Neue',Arial,sans-serif;color:#1a1a1a;">
      <div style="background:#1a1a1a;padding:24px;text-align:center;">
        <h1 style="color:#c8e64a;margin:0;font-size:24px;letter-spacing:2px;">TEARZ 1874!</h1>
      </div>
      <div style="padding:32px 24px;text-align:center;">
        <div style="font-size:48px;margin-bottom:16px;">${statusInfo.emoji}</div>
        <h2 style="margin:0 0 8px;">Actualización de tu pedido</h2>
        <p style="color:#666;margin:0 0 24px;">
          Hola ${order.user.firstName || order.user.email.split('@')[0]}, tu pedido cambió de estado.
        </p>
        <div style="background:#f8f8f8;padding:20px;border-radius:8px;display:inline-block;">
          <p style="margin:0 0 4px;font-size:14px;color:#666;">Orden #${order.id.slice(0,8).toUpperCase()}</p>
          <p style="margin:0;font-size:22px;font-weight:bold;color:${statusInfo.color};">${statusInfo.label.toUpperCase()}</p>
        </div>
        ${newStatus === 'delivered' ? '<p style="margin:24px 0 0;color:#666;font-size:14px;">¡Tu pedido fue entregado! Esperamos que disfrutes tus productos. 🙏</p>' : ''}
        ${newStatus === 'cancelled' ? '<p style="margin:24px 0 0;color:#666;font-size:14px;">Tu pedido fue cancelado. Si tenés alguna duda, contactanos.</p>' : ''}
      </div>
      <div style="background:#1a1a1a;padding:24px;text-align:center;">
        <p style="color:#999;margin:0;font-size:13px;">© ${new Date().getFullYear()} — TEARZ 1874!</p>
      </div>
    </div>`;

    await this.send({
      to: order.user.email,
      subject: `Tearz 1874! — Pedido #${order.id.slice(0,8).toUpperCase()} → ${statusInfo.label}`,
      html,
    });
  }

  /** Send delivery feedback request to customer */
  async sendDeliveryFeedbackRequest(orderId) {
    const order = await Order.findByPk(orderId, {
      include: [
        { model: User, as: 'user' },
        {
          model: OrderItem,
          as: 'items',
          include: [{ model: Product, as: 'product', attributes: ['id', 'name'] }],
        },
      ],
    });
    if (!order || !order.user) {
      console.log(`❌ [sendDeliveryFeedbackRequest] Orden ${orderId} no encontrada o sin usuario`);
      return;
    }

    const itemsList = (order.items || []).map((i) =>
      `• ${i.product?.name || 'Producto'}${i.size ? ` (Talle: ${i.size})` : ''}`
    ).join('<br>');

    const storeUrl = config.cors.frontendUrl;

    const html = `
    <div style="max-width:600px;margin:0 auto;font-family:'Helvetica Neue',Arial,sans-serif;color:#1a1a1a;">
      <div style="background:#1a1a1a;padding:24px;text-align:center;">
        <h1 style="color:#c8e64a;margin:0;font-size:24px;letter-spacing:2px;">TEARZ 1874!</h1>
      </div>
      <div style="padding:32px 24px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="font-size:52px;margin-bottom:12px;">📦✨</div>
          <h2 style="margin:0 0 8px;font-size:22px;">¿Recibiste tu pedido?</h2>
          <p style="color:#666;margin:0;">
            Hola ${order.user.firstName || order.user.email.split('@')[0]}, queremos saber cómo te fue con tu compra.
          </p>
        </div>
        <div style="background:#f8f8f8;padding:16px;border-radius:8px;margin-bottom:24px;">
          <p style="margin:0 0 8px;font-size:13px;text-transform:uppercase;color:#666;font-weight:600;">Tu orden</p>
          <p style="margin:0;font-size:14px;font-family:monospace;">#${order.id.slice(0,8).toUpperCase()}</p>
          <p style="margin:8px 0 0;line-height:1.6;font-size:14px;">${itemsList}</p>
        </div>
        <div style="text-align:center;margin-bottom:24px;">
          <p style="margin:0 0 16px;font-size:15px;color:#666;">¿Todo llegó bien?</p>
          <a href="${storeUrl}/feedback/${order.id}" style="display:inline-block;background:#1a1a1a;color:#fff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px;">
            DEJAR RESEÑA ⭐
          </a>
        </div>
        <div style="background:#fef3c7;border:1px solid #fcd34d;padding:16px;border-radius:8px;text-align:center;">
          <p style="margin:0;font-size:14px;color:#92400e;">💬 <strong>Tu opinión nos importa</strong></p>
          <p style="margin:8px 0 0;font-size:13px;color:#b45309;">Contanos tu experiencia, eso nos ayuda a mejorar siempre.</p>
        </div>
        <p style="margin-top:24px;color:#999;font-size:13px;text-align:center;">
          ¿Tenés alguna duda? Respondé este email y te respondemos ASAP.
        </p>
      </div>
      <div style="background:#1a1a1a;padding:24px;text-align:center;">
        <p style="color:#999;margin:0;font-size:13px;">© ${new Date().getFullYear()} — TEARZ 1874!</p>
      </div>
    </div>`;

    await this.send({
      to: order.user.email,
      subject: `Tearz 1874! — ¿Cómo te fue con tu pedido? 📦`,
      html,
    });
  }
}

module.exports = new EmailService();
