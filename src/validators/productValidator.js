const { z } = require('zod');

const createProductSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  price: z.number().positive('El precio debe ser positivo'),
  oldPrice: z.number().positive().nullable().optional(),
  stock: z.number().int().min(0).default(0),
  images: z.array(z.string().url()).default([]),
  colors: z.array(z.string()).default([]),
  sizes: z.array(z.string()).default([]),
  badge: z.string().nullable().optional(),
  active: z.boolean().default(true),
  categoryId: z.string().uuid().nullable().optional(),
});

const updateProductSchema = createProductSchema.partial();

const productQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
  category: z.string().optional(),
  search: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sort: z.enum(['price_asc', 'price_desc', 'newest', 'name_asc']).default('newest'),
  active: z.coerce.boolean().optional(),
});

module.exports = { createProductSchema, updateProductSchema, productQuerySchema };
