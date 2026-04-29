const { Router } = require('express');
const auth = require('../middlewares/auth');
const admin = require('../middlewares/admin');
const adminController = require('../controllers/adminController');
const siteContentController = require('../controllers/siteContentController');
const journalController = require('../controllers/journalController');
const uploadController = require('../controllers/uploadController');
const { upload } = require('../config/cloudinary');

const router = Router();

// All routes require auth + admin
router.use(auth, admin);

// Dashboard
router.get('/dashboard', adminController.getDashboard);

// Test email
router.get('/test-email', adminController.testEmail);

// Customers
router.get('/customers', adminController.getCustomers);

// Orders (admin view)
router.get('/orders', adminController.getAllOrders);
router.post('/orders/:id/ship', adminController.shipOrder);

// Site Content
router.get('/site-content', siteContentController.getAll);
router.get('/site-content/:key', siteContentController.getByKey);
router.put('/site-content', siteContentController.upsert);

// Journal Posts
router.get('/journals', journalController.listAll);
router.get('/journals/:id', journalController.getById);
router.post('/journals', journalController.create);
router.put('/journals/:id', journalController.update);
router.delete('/journals/:id', journalController.remove);

// Image upload (Cloudinary)
router.post('/upload', upload.array('images', 10), uploadController.uploadImages);

module.exports = router;
