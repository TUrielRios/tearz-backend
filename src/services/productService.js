const { Op } = require('sequelize');
const { Product, Category } = require('../models');
const ApiError = require('../utils/ApiError');
const { paginate } = require('../utils/helpers');

class ProductService {
  /**
   * List products with pagination, filters, search, and sort
   */
  async list({ page, limit, category, search, minPrice, maxPrice, sort, active }) {
    page = parseInt(page, 10) || 1;
    limit = parseInt(limit, 10) || 20;
    const where = {};
    const include = [];

    // Filter by active
    if (active === 'all') {
      // Don't add active filter
    } else if (active !== undefined) {
      where.active = active === 'true' || active === true;
    } else {
      where.active = true;
    }

    // Filter by category slug
    if (category) {
      include.push({
        model: Category,
        as: 'category',
        where: { slug: category },
        attributes: ['id', 'name', 'slug'],
      });
    } else {
      include.push({
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'slug'],
      });
    }

    // Search by name or description
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];
    }

    // Price range
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price[Op.gte] = minPrice;
      if (maxPrice !== undefined) where.price[Op.lte] = maxPrice;
    }

    // Sort
    const orderMap = {
      price_asc: [['price', 'ASC']],
      price_desc: [['price', 'DESC']],
      newest: [['createdAt', 'DESC']],
      name_asc: [['name', 'ASC']],
    };
    const order = orderMap[sort] || orderMap.newest;

    const offset = (page - 1) * limit;

    const { count, rows } = await Product.findAndCountAll({
      where,
      include,
      order,
      offset,
      limit,
      distinct: true,
    });

    return {
      products: rows,
      pagination: paginate(page, limit, count),
    };
  }

  /**
   * Get single product by ID
   */
  async getById(id) {
    const product = await Product.findByPk(id, {
      include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'slug'] }],
    });

    if (!product) {
      throw ApiError.notFound('Producto no encontrado');
    }

    return product;
  }

  /**
   * Create a new product (admin)
   */
  async create(data) {
    if (data.categoryId) {
      const category = await Category.findByPk(data.categoryId);
      if (!category) throw ApiError.badRequest('Categoría no encontrada');
    }

    return Product.create(data);
  }

  /**
   * Update product (admin)
   */
  async update(id, data) {
    const product = await Product.findByPk(id);
    if (!product) throw ApiError.notFound('Producto no encontrado');

    if (data.categoryId) {
      const category = await Category.findByPk(data.categoryId);
      if (!category) throw ApiError.badRequest('Categoría no encontrada');
    }

    await product.update(data);
    return product.reload({
      include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'slug'] }],
    });
  }

  /**
   * Soft-delete product (set active = false)
   */
  async delete(id) {
    const product = await Product.findByPk(id);
    if (!product) throw ApiError.notFound('Producto no encontrado');

    await product.update({ active: false });
    return { message: 'Producto desactivado correctamente' };
  }
}

module.exports = new ProductService();
