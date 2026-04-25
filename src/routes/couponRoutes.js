const { Router } = require('express');
const couponController = require('../controllers/couponController');
const auth = require('../middlewares/auth');
const admin = require('../middlewares/admin');

const router = Router();

// Authenticated users
router.post('/validate', auth, couponController.validate);

// Admin only
router.post('/', auth, admin, couponController.create);
router.get('/', auth, admin, couponController.list);
router.put('/:id', auth, admin, couponController.update);
router.delete('/:id', auth, admin, couponController.remove);

module.exports = router;
