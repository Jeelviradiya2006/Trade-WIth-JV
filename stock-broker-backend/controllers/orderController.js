const Order = require('../models/Order');
const Stock = require('../models/Stock');
const User = require('../models/User');
const Portfolio = require('../models/Portfolio');

// @desc    Buy stock
// @route   POST /api/orders/buy
// @access  Private
const buyStock = async (req, res) => {
  try {
    const { symbol, quantity } = req.body;

    if (!symbol || !quantity || quantity <= 0) {
      return res.status(400).json({ message: 'Please provide a valid stock symbol and quantity greater than 0' });
    }

    // Find the stock
    const stock = await Stock.findOne({ symbol: symbol.toUpperCase() });
    if (!stock) {
      return res.status(404).json({ message: 'Stock not found' });
    }

    // Find the user to get latest balance
    const user = await User.findById(req.user._id);
    const totalAmount = stock.price * quantity;

    // Validate user balance before buying
    if (user.balance < totalAmount) {
      return res.status(400).json({
        message: `Insufficient balance. Required: $${totalAmount.toFixed(2)}, Available: $${user.balance.toFixed(2)}`,
      });
    }

    // Process payment (deduct balance)
    user.balance -= totalAmount;
    await user.save();

    // Create the completed order
    const order = await Order.create({
      user: user._id,
      stock: stock._id,
      type: 'BUY',
      quantity,
      price: stock.price,
      totalAmount,
      status: 'COMPLETED',
    });

    // Update user's Portfolio
    let portfolio = await Portfolio.findOne({ user: user._id });
    if (!portfolio) {
      portfolio = new Portfolio({ user: user._id, holdings: [] });
    }

    // Check if the stock is already in the portfolio
    const holdingIndex = portfolio.holdings.findIndex(
      (h) => h.stock.toString() === stock._id.toString()
    );

    if (holdingIndex >= 0) {
      // Stock exists, calculate new average buy price
      const existingHolding = portfolio.holdings[holdingIndex];
      const newQuantity = existingHolding.quantity + quantity;
      const newAverageBuyPrice =
        (existingHolding.quantity * existingHolding.averageBuyPrice + totalAmount) / newQuantity;

      portfolio.holdings[holdingIndex].quantity = newQuantity;
      portfolio.holdings[holdingIndex].averageBuyPrice = Number(newAverageBuyPrice.toFixed(4));
    } else {
      // Add new holding
      portfolio.holdings.push({
        stock: stock._id,
        quantity,
        averageBuyPrice: stock.price,
      });
    }

    await portfolio.save();

    res.status(201).json({
      message: 'Buy order processed successfully',
      order,
      newBalance: user.balance,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Sell stock
// @route   POST /api/orders/sell
// @access  Private
const sellStock = async (req, res) => {
  try {
    const { symbol, quantity } = req.body;

    if (!symbol || !quantity || quantity <= 0) {
      return res.status(400).json({ message: 'Please provide a valid stock symbol and quantity greater than 0' });
    }

    // Find the stock
    const stock = await Stock.findOne({ symbol: symbol.toUpperCase() });
    if (!stock) {
      return res.status(404).json({ message: 'Stock not found' });
    }

    // Get user's portfolio
    const portfolio = await Portfolio.findOne({ user: req.user._id });
    if (!portfolio) {
      return res.status(400).json({ message: 'Portfolio not found' });
    }

    // Find the holding
    const holdingIndex = portfolio.holdings.findIndex(
      (h) => h.stock.toString() === stock._id.toString()
    );

    // Validate portfolio quantity before selling
    if (holdingIndex === -1 || portfolio.holdings[holdingIndex].quantity < quantity) {
      const ownedQuantity = holdingIndex === -1 ? 0 : portfolio.holdings[holdingIndex].quantity;
      return res.status(400).json({
        message: `Insufficient stock quantity to sell. You own: ${ownedQuantity}, Requested: ${quantity}`,
      });
    }

    // Calculate proceeds
    const totalAmount = stock.price * quantity;

    // Find the user to add proceeds
    const user = await User.findById(req.user._id);
    user.balance += totalAmount;
    await user.save();

    // Create the completed order
    const order = await Order.create({
      user: user._id,
      stock: stock._id,
      type: 'SELL',
      quantity,
      price: stock.price,
      totalAmount,
      status: 'COMPLETED',
    });

    // Update holdings
    const holding = portfolio.holdings[holdingIndex];
    holding.quantity -= quantity;

    if (holding.quantity === 0) {
      // Remove holding if empty
      portfolio.holdings.splice(holdingIndex, 1);
    }

    await portfolio.save();

    res.status(201).json({
      message: 'Sell order processed successfully',
      order,
      newBalance: user.balance,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get logged-in user orders
// @route   GET /api/orders/my-orders
// @access  Private
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate('stock', 'symbol companyName')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  buyStock,
  sellStock,
  getMyOrders,
};
