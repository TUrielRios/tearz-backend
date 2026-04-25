const productService = require('../services/productService');
const { asyncHandler } = require('../utils/helpers');

const list = asyncHandler(async (req, res) => {
  const result = await productService.list(req.query);

  res.json({
    success: true,
    data: result,
  });
});

const getById = asyncHandler(async (req, res) => {
  const product = await productService.getById(req.params.id);

  res.json({
    success: true,
    data: { product },
  });
});

const create = asyncHandler(async (req, res) => {
  const product = await productService.create(req.body);

  res.status(201).json({
    success: true,
    message: 'Producto creado exitosamente',
    data: { product },
  });
});

const update = asyncHandler(async (req, res) => {
  const product = await productService.update(req.params.id, req.body);

  res.json({
    success: true,
    message: 'Producto actualizado exitosamente',
    data: { product },
  });
});

const remove = asyncHandler(async (req, res) => {
  const result = await productService.delete(req.params.id);

  res.json({
    success: true,
    ...result,
  });
});

module.exports = { list, getById, create, update, remove };
