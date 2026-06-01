const express = require('express');
const router = express.Router();
const { getAllStocks, getStockBySymbol, getMarketIndices } = require('../controllers/stockController');

router.get('/', getAllStocks);
router.get('/market/indices', getMarketIndices);
router.get('/:symbol', getStockBySymbol);

module.exports = router;
