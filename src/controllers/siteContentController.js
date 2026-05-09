const { SiteContent } = require('../models');
const { asyncHandler } = require('../utils/helpers');

/**
 * Get all site content
 */
const getAll = asyncHandler(async (req, res) => {
  const items = await SiteContent.findAll();
  const content = {};
  items.forEach(item => { content[item.key] = item.value; });

  console.log("DEBUG: SiteContent.getAll returning keys:", Object.keys(content));
  res.json({ success: true, data: { content } });
});

/**
 * Get single content by key
 */
const getByKey = asyncHandler(async (req, res) => {
  const item = await SiteContent.findOne({ where: { key: req.params.key } });

  res.json({
    success: true,
    data: { content: item ? item.value : null },
  });
});

/**
 * Upsert site content (create or update)
 */
const upsert = asyncHandler(async (req, res) => {
  const { key, value } = req.body;

  const [item, created] = await SiteContent.findOrCreate({
    where: { key },
    defaults: { value },
  });

  if (!created) {
    await item.update({ value });
  }

  res.json({
    success: true,
    message: created ? 'Contenido creado' : 'Contenido actualizado',
    data: { content: item },
  });
});

module.exports = { getAll, getByKey, upsert };
