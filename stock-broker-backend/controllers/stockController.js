const Stock = require('../models/Stock');

// @desc    Get all stocks (excluding market indices)
// @route   GET /api/stocks
// @access  Public
const getAllStocks = async (req, res) => {
  try {
    const stocks = await Stock.find({ isIndex: { $ne: true } });
    res.json(stocks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get stock by symbol
// @route   GET /api/stocks/:symbol
// @access  Public
const getStockBySymbol = async (req, res) => {
  try {
    const stock = await Stock.findOne({ symbol: req.params.symbol.toUpperCase() });

    if (!stock) {
      return res.status(404).json({ message: 'Stock not found' });
    }

    res.json(stock);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get market indices (Nifty 50, Sensex)
// @route   GET /api/stocks/market/indices
// @access  Public
const getMarketIndices = async (req, res) => {
  try {
    const indices = await Stock.find({ isIndex: true });
    res.json(indices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllStocks,
  getStockBySymbol,
  getMarketIndices,
};
