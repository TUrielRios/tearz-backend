const { Bundle, Product } = require('../models');
const { asyncHandler } = require('../utils/helpers');
const ApiError = require('../utils/ApiError');

/**
 * List all bundles
 */
const getAllBundles = asyncHandler(async (req, res) => {
  const bundles = await Bundle.findAll({
    order: [['createdAt', 'DESC']],
  });
  res.json({ success: true, data: { bundles } });
});

/**
 * Create a new bundle
 */
const createBundle = asyncHandler(async (req, res) => {
  const { name, productIds, categoryIds, discountPercentage, active } = req.body;

  const totalItems = (Array.isArray(productIds) ? productIds.length : 0) + 
                    (Array.isArray(categoryIds) ? categoryIds.length : 0);

  if (totalItems < 2) {
    throw ApiError.badRequest('Un combo debe tener al menos 2 elementos (productos o categorías)');
  }

  const bundle = await Bundle.create({
    name,
    productIds: productIds || [],
    categoryIds: categoryIds || [],
    discountPercentage,
    active: active !== undefined ? active : true,
  });

  res.status(201).json({ success: true, data: { bundle } });
});

/**
 * Update a bundle
 */
const updateBundle = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, productIds, categoryIds, discountPercentage, active } = req.body;

  const bundle = await Bundle.findByPk(id);
  if (!bundle) throw ApiError.notFound('Combo no encontrado');

  const finalProductIds = productIds || bundle.productIds;
  const finalCategoryIds = categoryIds || bundle.categoryIds;
  const totalItems = finalProductIds.length + finalCategoryIds.length;

  if (totalItems < 2) {
    throw ApiError.badRequest('Un combo debe tener al menos 2 elementos (productos o categorías)');
  }

  await bundle.update({
    name: name || bundle.name,
    productIds: finalProductIds,
    categoryIds: finalCategoryIds,
    discountPercentage: discountPercentage !== undefined ? discountPercentage : bundle.discountPercentage,
    active: active !== undefined ? active : bundle.active,
  });

  res.json({ success: true, data: { bundle } });
});

/**
 * Delete a bundle
 */
const deleteBundle = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const bundle = await Bundle.findByPk(id);
  if (!bundle) throw ApiError.notFound('Combo no encontrado');

  await bundle.destroy();
  res.json({ success: true, message: 'Combo eliminado correctamente' });
});

module.exports = {
  getAllBundles,
  createBundle,
  updateBundle,
  deleteBundle,
};
