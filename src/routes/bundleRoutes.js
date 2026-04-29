const { Router } = require('express');
const { Bundle } = require('../models');
const { asyncHandler } = require('../utils/helpers');

const router = Router();

// Get all active bundles
router.get('/', asyncHandler(async (req, res) => {
  const bundles = await Bundle.findAll({
    where: { active: true },
    attributes: ['id', 'name', 'productIds', 'categoryIds', 'discountPercentage']
  });
  res.json({ success: true, data: { bundles } });
}));

module.exports = router;
