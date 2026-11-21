// Public program routes (active programs only).
const express = require('express');
const programController = require('../controllers/programController');

const router = express.Router();

router.get('/', programController.list);
router.get('/:slug', programController.getBySlug);

module.exports = router;
