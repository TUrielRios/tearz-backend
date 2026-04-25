const { Router } = require('express');
const productController = require('../controllers/productController');
const validate = require('../middlewares/validate');
const auth = require('../middlewares/auth');
const admin = require('../middlewares/admin');
const { createProductSchema, updateProductSchema, productQuerySchema } = require('../validators/productValidator');

const router = Router();

// Public
router.get('/', validate(productQuerySchema, 'query'), productController.list);
router.get('/:id', productController.getById);

// Admin only
router.post('/', auth, admin, validate(createProductSchema), productController.create);
router.put('/:id', auth, admin, validate(updateProductSchema), productController.update);
router.delete('/:id', auth, admin, productController.remove);

module.exports = router;
