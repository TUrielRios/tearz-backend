const { Category } = require('../models');
const ApiError = require('../utils/ApiError');
const { asyncHandler } = require('../utils/helpers');

const list = asyncHandler(async (req, res) => {
  const categories = await Category.findAll({
    order: [['name', 'ASC']],
  });

  res.json({
    success: true,
    data: { categories },
  });
});

const create = asyncHandler(async (req, res) => {
  const category = await Category.create(req.body);

  res.status(201).json({
    success: true,
    message: 'Categoría creada exitosamente',
    data: { category },
  });
});

const update = asyncHandler(async (req, res) => {
  const category = await Category.findByPk(req.params.id);
  if (!category) throw ApiError.notFound('Categoría no encontrada');

  await category.update(req.body);

  res.json({
    success: true,
    message: 'Categoría actualizada exitosamente',
    data: { category },
  });
});

const remove = asyncHandler(async (req, res) => {
  const category = await Category.findByPk(req.params.id);
  if (!category) throw ApiError.notFound('Categoría no encontrada');

  await category.destroy();

  res.json({
    success: true,
    message: 'Categoría eliminada exitosamente',
  });
});

module.exports = { list, create, update, remove };
