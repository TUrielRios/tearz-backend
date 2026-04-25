const { z } = require('zod');

const orderItemSchema = z.object({
  productId: z.string().uuid('ID de producto inválido'),
  quantity: z.number().int().min(1, 'Cantidad mínima es 1'),
  size: z.string().optional(),
});

const shippingAddressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, 'Se requiere al menos un producto'),
  shippingAddress: shippingAddressSchema.nullable().optional(),
  couponCode: z.string().optional(),
  shippingMethod: z.string().optional().default('shipping'),
});

module.exports = { createOrderSchema };
