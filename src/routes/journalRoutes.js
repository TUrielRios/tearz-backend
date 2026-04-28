const { Router } = require('express');
const journalController = require('../controllers/journalController');

const router = Router();

// Public endpoints
router.get('/', journalController.listPublished);
router.get('/:slug', journalController.getBySlug);

module.exports = router;
