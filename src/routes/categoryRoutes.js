const { Router } = require('express');
const categoryController = require('../controllers/categoryController');
const auth = require('../middlewares/auth');
const admin = require('../middlewares/admin');

const router = Router();

// Public
router.get('/', categoryController.list);

// Admin only
router.post('/', auth, admin, categoryController.create);
router.put('/:id', auth, admin, categoryController.update);
router.delete('/:id', auth, admin, categoryController.remove);

module.exports = router;
