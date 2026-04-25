const { asyncHandler } = require('../utils/helpers');

/**
 * Upload one or more images to Cloudinary
 */
const uploadImages = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, message: 'No se subieron archivos' });
  }

  const urls = req.files.map(file => file.path);

  res.json({
    success: true,
    message: `${urls.length} imagen(es) subida(s)`,
    data: { urls },
  });
});

module.exports = { uploadImages };
