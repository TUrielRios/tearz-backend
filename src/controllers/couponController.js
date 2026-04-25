const { Coupon } = require('../models');
const ApiError = require('../utils/ApiError');
const { asyncHandler } = require('../utils/helpers');

const validate = asyncHandler(async (req, res) => {
  const { code, totalPrice } = req.body;

  const coupon = await Coupon.findOne({
    where: { code: code.toUpperCase(), active: true },
  });

  if (!coupon) throw ApiError.badRequest('Cupón inválido');

  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    throw ApiError.badRequest('El cupón ha expirado');
  }

  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
    throw ApiError.badRequest('El cupón ha alcanzado su límite de uso');
  }

  if (coupon.minPurchase && totalPrice < parseFloat(coupon.minPurchase)) {
    throw ApiError.badRequest(`Compra mínima requerida: $${coupon.minPurchase}`);
  }

  let discount = 0;
  if (coupon.type === 'percentage') {
    discount = totalPrice * (parseFloat(coupon.value) / 100);
  } else {
    discount = parseFloat(coupon.value);
  }
  discount = Math.min(discount, totalPrice);

  res.json({
    success: true,
    data: {
      coupon: {
        code: coupon.code,
        type: coupon.type,
        value: parseFloat(coupon.value),
      },
      discount,
      finalPrice: totalPrice - discount,
    },
  });
});

const create = asyncHandler(async (req, res) => {
  const coupon = await Coupon.create(req.body);

  res.status(201).json({
    success: true,
    message: 'Cupón creado exitosamente',
    data: { coupon },
  });
});

const list = asyncHandler(async (req, res) => {
  const coupons = await Coupon.findAll({
    order: [['createdAt', 'DESC']],
  });

  res.json({
    success: true,
    data: { coupons },
  });
});

const update = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByPk(req.params.id);
  if (!coupon) {
    return res.status(404).json({ success: false, message: 'Cupón no encontrado' });
  }
  await coupon.update(req.body);

  res.json({
    success: true,
    message: 'Cupón actualizado',
    data: { coupon },
  });
});

const remove = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByPk(req.params.id);
  if (!coupon) {
    return res.status(404).json({ success: false, message: 'Cupón no encontrado' });
  }
  await coupon.destroy();

  res.json({
    success: true,
    message: 'Cupón eliminado',
  });
});

module.exports = { validate, create, list, update, remove };
