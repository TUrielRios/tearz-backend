const { Op } = require('sequelize');
const sequelize = require('../config/database');
const { Order, OrderItem, Product, Payment, Coupon, Bundle } = require('../models');
const emailService = require('./emailService');
const ApiError = require('../utils/ApiError');
const { paginate } = require('../utils/helpers');

class OrderService {
  /**
   * Create a new order from cart items
   */
  async create(userId, { items, shippingAddress, couponCode, shippingMethod = 'shipping' }) {
    // Normalize shippingMethod
    const method = (shippingMethod === 'pickup' || shippingMethod === 'shipping') ? shippingMethod : 'shipping';
    
    const transaction = await sequelize.transaction();

    try {
      // 1. Validate products and calculate total
      let subtotalBeforeDiscounts = 0;
      const orderItems = [];
      const bundleCheckItems = []; // For bundle calculation

      for (const item of items) {
        const product = await Product.findByPk(item.productId, { 
          transaction,
          attributes: ['id', 'name', 'price', 'active', 'stock', 'sizeStock', 'categoryId']
        });

        if (!product || !product.active) {
          throw ApiError.badRequest(`Producto no encontrado: ${item.productId}`);
        }

        // Check stock availability (not decrementing yet)
        if (item.size && product.sizeStock && product.sizeStock[item.size] !== undefined) {
          if (product.sizeStock[item.size] < item.quantity) {
            throw ApiError.badRequest(`Stock insuficiente para "${product.name}" talle ${item.size}. Disponible: ${product.sizeStock[item.size]}`);
          }
        } else if (product.stock < item.quantity) {
          throw ApiError.badRequest(`Stock insuficiente para "${product.name}". Disponible: ${product.stock}`);
        }

        const itemPrice = parseFloat(product.price);
        subtotalBeforeDiscounts += itemPrice * item.quantity;

        orderItems.push({
          productId: product.id,
          quantity: item.quantity,
          price: itemPrice,
          size: item.size || null,
        });

        // Add to bundle check
        bundleCheckItems.push({
          productId: product.id,
          categoryId: product.categoryId,
          price: itemPrice,
          quantity: item.quantity
        });
      }

      // 2. Calculate Bundle Discounts
      let bundleDiscount = 0;
      const activeBundles = await Bundle.findAll({ 
        where: { active: true },
        transaction
      });

      if (activeBundles.length > 0) {
        // Sort bundles by discount percentage (highest first)
        const sortedBundles = [...activeBundles].sort((a, b) => b.discountPercentage - a.discountPercentage);
        
        let tempItems = bundleCheckItems.map(i => ({ ...i }));

        for (const bundle of sortedBundles) {
          const requirements = [
            ...(bundle.productIds || []).map(id => ({ type: 'product', id })),
            ...(bundle.categoryIds || []).map(id => ({ type: 'category', id }))
          ];
          
          if (requirements.length === 0) continue;

          while (true) {
            let satisfied = true;
            let usedIndices = [];
            let currentIterationPrice = 0;
            
            for (const req of requirements) {
              let foundIndex = -1;
              if (req.type === 'product') {
                foundIndex = tempItems.findIndex(i => i.productId === req.id && i.quantity > 0);
              } else {
                foundIndex = tempItems.findIndex(i => i.categoryId === req.id && i.quantity > 0);
              }
              
              if (foundIndex === -1) {
                satisfied = false;
                break;
              } else {
                tempItems[foundIndex].quantity -= 1;
                usedIndices.push(foundIndex);
                currentIterationPrice += tempItems[foundIndex].price;
              }
            }
            
            if (satisfied) {
              bundleDiscount += (currentIterationPrice * (bundle.discountPercentage / 100));
            } else {
              usedIndices.forEach(idx => { tempItems[idx].quantity += 1; });
              break;
            }
          }
        }
      }

      // 3. Apply coupon if provided
      let couponDiscount = 0;
      let couponId = null;
      let totalAfterBundles = subtotalBeforeDiscounts - bundleDiscount;

      if (couponCode) {
        const coupon = await Coupon.findOne({
          where: {
            code: couponCode.toUpperCase(),
            active: true,
          },
          transaction,
        });

        if (!coupon) {
          throw ApiError.badRequest('Cupón inválido');
        }

        // Check expiration
        if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
          throw ApiError.badRequest('El cupón ha expirado');
        }

        // Check usage limit
        if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
          throw ApiError.badRequest('El cupón ha alcanzado su límite de uso');
        }

        // Check min purchase
        if (coupon.minPurchase && totalAfterBundles < parseFloat(coupon.minPurchase)) {
          throw ApiError.badRequest(`Compra mínima requerida: $${coupon.minPurchase}`);
        }

        // Calculate discount
        if (coupon.type === 'percentage') {
          couponDiscount = totalAfterBundles * (parseFloat(coupon.value) / 100);
        } else {
          couponDiscount = parseFloat(coupon.value);
        }

        // Discount can't exceed total
        couponDiscount = Math.min(couponDiscount, totalAfterBundles);
        couponId = coupon.id;
      }

      // 4. Calculate shipping cost (always 0 - coordinated via WhatsApp)
      let shippingCost = 0;
      let finalShippingAddress = shippingAddress || {};
      
      if (method === 'pickup') {
        finalShippingAddress = {
          street: 'RETIRAR EN LOCAL',
          city: '',
          state: '',
          zip: '',
          phone: shippingAddress?.phone || '',
        };
      }
      
      const finalTotal = totalAfterBundles - couponDiscount + shippingCost;

      // 5. Create order
      const order = await Order.create(
        {
          userId,
          status: 'pending',
          totalPrice: finalTotal,
          shippingAddress: finalShippingAddress,
          shippingCost,
          shippingMethod: method,
          couponId,
          discount: bundleDiscount + couponDiscount, // Total discount is sum of both
        },
        { transaction }
      );

      // 6. Create order items
      const itemsWithOrderId = orderItems.map((item) => ({
        ...item,
        orderId: order.id,
      }));

      await OrderItem.bulkCreate(itemsWithOrderId, { transaction });

      // 7. Increment coupon usage
      if (couponId) {
        await Coupon.increment('usedCount', {
          by: 1,
          where: { id: couponId },
          transaction,
        });
      }

      await transaction.commit();

      // Return order with items
      return Order.findByPk(order.id, {
        include: [
          {
            model: OrderItem,
            as: 'items',
            include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'images'] }],
          },
        ],
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get user's orders
   */
  async getUserOrders(userId, { page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;

    const { count, rows } = await Order.findAndCountAll({
      where: { userId },
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'images'] }],
        },
        { model: Payment, as: 'payment', attributes: ['id', 'status', 'provider'] },
      ],
      order: [['createdAt', 'DESC']],
      offset,
      limit,
      distinct: true,
    });

    return {
      orders: rows,
      pagination: paginate(page, limit, count),
    };
  }

  /**
   * Get single order
   */
  async getById(orderId, userId = null) {
    const where = { id: orderId };
    if (userId) where.userId = userId;

    const order = await Order.findOne({
      where,
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'images', 'price'] }],
        },
        { model: Payment, as: 'payment' },
      ],
    });

    if (!order) throw ApiError.notFound('Orden no encontrada');
    return order;
  }

  /**
   * Get all orders (admin)
   */
  async getAllOrders({ page = 1, limit = 20, status }) {
    const where = {};
    if (status) where.status = status;

    const offset = (page - 1) * limit;

    const { count, rows } = await Order.findAndCountAll({
      where,
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [{ model: Product, as: 'product', attributes: ['id', 'name'] }],
        },
        { model: Payment, as: 'payment', attributes: ['id', 'status', 'provider'] },
      ],
      order: [['createdAt', 'DESC']],
      offset,
      limit,
      distinct: true,
    });

    return {
      orders: rows,
      pagination: paginate(page, limit, count),
    };
  }

  /**
   * Update order status (admin)
   */
  async updateStatus(orderId, status) {
    const order = await Order.findByPk(orderId);
    if (!order) throw ApiError.notFound('Orden no encontrada');

    await order.update({ status });
    return order;
  }

  /**
   * Process approved payment — decrement stock and mark order as paid
   * Idempotent: safe to call multiple times
   * Also sends confirmation emails to customer and admin alert
   */
  async processApprovedPayment(orderId) {
    const transaction = await sequelize.transaction();

    try {
      // Lock the order first (no joins to avoid FOR UPDATE on outer join)
      const order = await Order.findByPk(orderId, {
        transaction,
        lock: true, // SELECT ... FOR UPDATE
      });

      if (!order) {
        await transaction.rollback();
        throw ApiError.notFound('Orden no encontrada');
      }

      // If already paid, no need to process again
      if (order.status === 'paid') {
        await transaction.commit();
        console.log(`⚠️ Orden ${orderId} ya estaba marcada como PAID - omitiendo`);
        return order;
      }

      // Load order items separately (within same transaction)
      const items = await OrderItem.findAll({
        where: { orderId },
        transaction,
        lock: true,
      });

      if (!items || items.length === 0) {
        await transaction.rollback();
        throw ApiError.badRequest('La orden no tiene ítems');
      }

      // Decrement stock
      for (const item of items) {
        // Lock the product row to prevent race conditions
        const product = await Product.findByPk(item.productId, { transaction, lock: true });

        if (!product) {
          await transaction.rollback();
          throw ApiError.notFound(`Producto no encontrado: ${item.productId}`);
        }

        // 1. If size is specified and exists in sizeStock, decrement from there
        if (item.size && product.sizeStock && product.sizeStock[item.size] !== undefined) {
          if (product.sizeStock[item.size] < item.quantity) {
            await transaction.rollback();
            throw ApiError.badRequest(`Stock insuficiente para "${product.name}" talle ${item.size}`);
          }

          const newSizeStock = { ...product.sizeStock };
          newSizeStock[item.size] -= item.quantity;
          
          // Also keep total stock updated for backward compatibility/stats
          const newTotalStock = Math.max(0, product.stock - item.quantity);

          await product.update({
            sizeStock: newSizeStock,
            stock: newTotalStock
          }, { transaction });
        } 
        // 2. Fallback to global stock if no size or no sizeStock configured
        else {
          if (product.stock < item.quantity) {
            await transaction.rollback();
            throw ApiError.badRequest(`Stock insuficiente para "${product.name}"`);
          }

          await product.update({
            stock: product.stock - item.quantity
          }, { transaction });
        }
      }

      // Mark as paid
      await order.update({ status: 'paid' }, { transaction });
      await transaction.commit();

      // Send notification emails (outside transaction to avoid blocking order completion)
      try {
        await emailService.sendOrderConfirmation(orderId);
      } catch (emailError) {
        console.error('⚠️ Error enviando email de confirmación al cliente:', emailError.message);
      }
      try {
        await emailService.sendAdminNewOrderAlert(orderId);
      } catch (emailError) {
        console.error('⚠️ Error enviando alerta al admin:', emailError.message);
      }

      console.log(`✅ Orden ${orderId} marcada como PAID y emails enviados`);
      return order;
    } catch (error) {
      if (transaction.finished !== 'commit') {
        await transaction.rollback();
      }
      throw error;
    }
  }
}

module.exports = new OrderService();
