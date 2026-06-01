const express = require('express');
const router = express.Router();
const { getPortfolio, depositFunds, withdrawFunds } = require('../controllers/portfolioController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getPortfolio);
router.post('/deposit', protect, depositFunds);
router.post('/withdraw', protect, withdrawFunds);

module.exports = router;
