const { Router } = require('express');
const authRoutes = require('./authRoutes');
const productRoutes = require('./productRoutes');
const categoryRoutes = require('./categoryRoutes');
const orderRoutes = require('./orderRoutes');
const paymentRoutes = require('./paymentRoutes');
const couponRoutes = require('./couponRoutes');
const adminRoutes = require('./adminRoutes');
const journalRoutes = require('./journalRoutes');
const newsletterRoutes = require('./newsletterRoutes');
const siteContentController = require('../controllers/siteContentController');

const router = Router();

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/coupons', couponRoutes);
router.use('/admin', adminRoutes);
router.use('/journal', journalRoutes);
router.use('/newsletter', newsletterRoutes);
router.get('/site-content', siteContentController.getAll);

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Tearz 1874! API is running 🔥',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
