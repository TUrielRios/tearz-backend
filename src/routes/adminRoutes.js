const { Router } = require('express');
const auth = require('../middlewares/auth');
const admin = require('../middlewares/admin');
const adminController = require('../controllers/adminController');
const siteContentController = require('../controllers/siteContentController');
const uploadController = require('../controllers/uploadController');
const { upload } = require('../config/cloudinary');

const router = Router();

// All routes require auth + admin
router.use(auth, admin);

// Dashboard
router.get('/dashboard', adminController.getDashboard);

// Customers
router.get('/customers', adminController.getCustomers);

// Orders (admin view)
router.get('/orders', adminController.getAllOrders);
router.post('/orders/:id/ship', adminController.shipOrder);

// Site Content
router.get('/site-content', siteContentController.getAll);
router.get('/site-content/:key', siteContentController.getByKey);
router.put('/site-content', siteContentController.upsert);

// Image upload (Cloudinary)
router.post('/upload', upload.array('images', 10), uploadController.uploadImages);

module.exports = router;
