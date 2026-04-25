const { Router } = require('express');
const authController = require('../controllers/authController');
const validate = require('../middlewares/validate');
const auth = require('../middlewares/auth');
const { registerSchema, loginSchema, refreshSchema } = require('../validators/authValidator');

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshSchema), authController.refresh);
router.get('/me', auth, authController.me);

module.exports = router;
