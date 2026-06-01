const express = require('express');
const router = express.Router();
const { buyStock, sellStock, getMyOrders } = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');

router.post('/buy', protect, buyStock);
router.post('/sell', protect, sellStock);
router.get('/my-orders', protect, getMyOrders);

module.exports = router;
