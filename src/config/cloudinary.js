const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const config = require('./index');

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

// Multer storage for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'tearz1874',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    resource_type: 'image',
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

module.exports = { cloudinary, upload };
