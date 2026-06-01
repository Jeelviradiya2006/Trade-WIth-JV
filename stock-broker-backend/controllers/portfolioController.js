const Portfolio = require('../models/Portfolio');
const User = require('../models/User');

// @desc    Get logged-in user portfolio with live valuation details
// @route   GET /api/portfolio
// @access  Private
const getPortfolio = async (req, res) => {
  try {
    // Populate stock details for current pricing information
    const portfolio = await Portfolio.findOne({ user: req.user._id }).populate({
      path: 'holdings.stock',
      select: 'symbol companyName price sector changePercentage',
    });

    const user = await User.findById(req.user._id).select('balance name email');

    if (!portfolio) {
      return res.json({
        user: {
          name: user.name,
          email: user.email,
          balance: user.balance,
        },
        holdings: [],
        totalInvestment: 0,
        currentValue: 0,
        totalProfitLoss: 0,
        totalProfitLossPercentage: 0,
      });
    }

    let totalInvestment = 0;
    let currentValue = 0;

    // Transform holdings to include current valuation details
    const holdingsValuation = portfolio.holdings.map((holding) => {
      // If populated successfully
      const currentPrice = holding.stock ? holding.stock.price : holding.averageBuyPrice;
      
      const investmentValue = holding.quantity * holding.averageBuyPrice;
      const currentVal = holding.quantity * currentPrice;
      const profitLoss = currentVal - investmentValue;
      const profitLossPercentage = investmentValue > 0 ? (profitLoss / investmentValue) * 100 : 0;

      totalInvestment += investmentValue;
      currentValue += currentVal;

      return {
        _id: holding._id,
        stock: holding.stock,
        quantity: holding.quantity,
        averageBuyPrice: holding.averageBuyPrice,
        investmentValue: Number(investmentValue.toFixed(2)),
        currentValue: Number(currentVal.toFixed(2)),
        profitLoss: Number(profitLoss.toFixed(2)),
        profitLossPercentage: Number(profitLossPercentage.toFixed(2)),
      };
    });

    const totalProfitLoss = currentValue - totalInvestment;
    const totalProfitLossPercentage =
      totalInvestment > 0 ? (totalProfitLoss / totalInvestment) * 100 : 0;

    res.json({
      user: {
        name: user.name,
        email: user.email,
        balance: user.balance,
      },
      holdings: holdingsValuation,
      totalInvestment: Number(totalInvestment.toFixed(2)),
      currentValue: Number(currentValue.toFixed(2)),
      totalProfitLoss: Number(totalProfitLoss.toFixed(2)),
      totalProfitLossPercentage: Number(totalProfitLossPercentage.toFixed(2)),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Deposit funds to wallet
// @route   POST /api/portfolio/deposit
// @access  Private
const depositFunds = async (req, res) => {
  try {
    const { amount } = req.body;
    const depositAmount = Number(amount);

    if (isNaN(depositAmount) || depositAmount <= 0) {
      return res.status(400).json({ message: 'Please provide a valid deposit amount greater than 0' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.balance += depositAmount;
    await user.save();

    res.json({
      message: `Successfully deposited $${depositAmount.toFixed(2)} to your wallet`,
      balance: user.balance,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Withdraw funds from wallet
// @route   POST /api/portfolio/withdraw
// @access  Private
const withdrawFunds = async (req, res) => {
  try {
    const { amount } = req.body;
    const withdrawAmount = Number(amount);

    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      return res.status(400).json({ message: 'Please provide a valid withdrawal amount greater than 0' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.balance < withdrawAmount) {
      return res.status(400).json({
        message: `Insufficient balance. Available balance: $${user.balance.toFixed(2)}`,
      });
    }

    user.balance -= withdrawAmount;
    await user.save();

    res.json({
      message: `Successfully withdrew $${withdrawAmount.toFixed(2)} from your wallet`,
      balance: user.balance,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getPortfolio,
  depositFunds,
  withdrawFunds,
};
