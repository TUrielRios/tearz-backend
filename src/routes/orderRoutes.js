const { Router } = require('express');
const orderController = require('../controllers/orderController');
const validate = require('../middlewares/validate');
const auth = require('../middlewares/auth');
const admin = require('../middlewares/admin');
const { createOrderSchema } = require('../validators/orderValidator');

const router = Router();

// Authenticated users
router.post('/', auth, validate(createOrderSchema), orderController.create);
router.get('/', auth, orderController.getUserOrders);
router.get('/:id', auth, orderController.getById);

// Admin only
router.get('/admin/all', auth, admin, orderController.getAllOrders);
router.patch('/:id/status', auth, admin, orderController.updateStatus);

module.exports = router;
