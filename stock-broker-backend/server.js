require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const Stock = require('./models/Stock');

// Connect to Database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Seed Stocks if none exist in the DB
// Seed Stocks and initialize price histories
const seedStocks = async () => {
  try {
    const sampleStocks = [
      { symbol: 'AAPL', companyName: 'Apple Inc.', price: 175.50, sector: 'Technology', changePercentage: 1.25 },
      { symbol: 'MSFT', companyName: 'Microsoft Corporation', price: 415.20, sector: 'Technology', changePercentage: 0.85 },
      { symbol: 'TSLA', companyName: 'Tesla Inc.', price: 180.10, sector: 'Automotive', changePercentage: -2.40 },
      { symbol: 'AMZN', companyName: 'Amazon.com Inc.', price: 178.40, sector: 'Consumer Cyclical', changePercentage: 1.10 },
      { symbol: 'GOOGL', companyName: 'Alphabet Inc.', price: 152.30, sector: 'Technology', changePercentage: -0.45 },
      { symbol: 'NVDA', companyName: 'NVIDIA Corporation', price: 875.12, sector: 'Technology', changePercentage: 3.65 },
      { symbol: 'NFLX', companyName: 'Netflix Inc.', price: 610.50, sector: 'Communication Services', changePercentage: 0.15 },
      { symbol: 'META', companyName: 'Meta Platforms Inc.', price: 475.25, sector: 'Technology', changePercentage: -1.80 },
      
      // Indian Stocks
      { symbol: 'RELIANCE', companyName: 'Reliance Industries Ltd.', price: 2950.00, sector: 'Energy', changePercentage: 0.45 },
      { symbol: 'HDFCBANK', companyName: 'HDFC Bank Ltd.', price: 1520.00, sector: 'Financial Services', changePercentage: -0.25 },
      { symbol: 'ICICIBANK', companyName: 'ICICI Bank Ltd.', price: 1110.00, sector: 'Financial Services', changePercentage: 0.80 },
      { symbol: 'TCS', companyName: 'Tata Consultancy Services Ltd.', price: 3820.00, sector: 'Technology', changePercentage: -1.15 },
      { symbol: 'INFY', companyName: 'Infosys Ltd.', price: 1420.00, sector: 'Technology', changePercentage: 0.65 },
      { symbol: 'BHARTIAIRTEL', companyName: 'Bharti Airtel Ltd.', price: 1290.00, sector: 'Communication Services', changePercentage: 1.45 },
      { symbol: 'LT', companyName: 'Larsen & Tourbo Ltd.', price: 3450.00, sector: 'Industrials', changePercentage: 0.35 },
      { symbol: 'BAJFINANCE', companyName: 'Bajaj Finance Ltd.', price: 6850.00, sector: 'Financial Services', changePercentage: -2.10 },
      { symbol: 'BEL', companyName: 'Bharat Electronics Ltd.', price: 280.00, sector: 'Defense & Aerospace', changePercentage: 2.85 },
      { symbol: 'SUNPHARMA', companyName: 'Sun Pharmaceutical Industries Ltd.', price: 1490.00, sector: 'Healthcare', changePercentage: -0.75 },

      // Market Indices (Non-tradeable trackers)
      { symbol: 'NIFTY50', companyName: 'Nifty 50 Index', price: 23210.00, sector: 'Indices', changePercentage: 0.15, isIndex: true },
      { symbol: 'SENSEX', companyName: 'SENSEX Index', price: 76220.00, sector: 'Indices', changePercentage: 0.18, isIndex: true }
    ];

    for (const stockData of sampleStocks) {
      let stock = await Stock.findOne({ symbol: stockData.symbol });
      if (!stock) {
        // Create the stock with generated history
        const history = [];
        const now = Date.now();
        let lastPrice = stockData.price;
        for (let i = 9; i >= 0; i--) {
          const timestamp = new Date(now - i * 60 * 60 * 1000);
          const fluctuation = (Math.random() * 2 - 1) / 100;
          const histPrice = Number((lastPrice * (1 - fluctuation)).toFixed(2));
          history.push({ price: histPrice, timestamp });
        }
        history[9] = { price: stockData.price, timestamp: new Date(now) };
        
        await Stock.create({
          ...stockData,
          priceHistory: history
        });
        console.log(`Seeded new stock: ${stockData.symbol}`);
      } else {
        // Update/migrate priceHistory if missing
        if (!stock.priceHistory || stock.priceHistory.length === 0) {
          const history = [];
          const now = Date.now();
          let lastPrice = stock.price;
          for (let i = 9; i >= 0; i--) {
            const timestamp = new Date(now - i * 60 * 60 * 1000);
            const fluctuation = (Math.random() * 2 - 1) / 100;
            const histPrice = Number((lastPrice * (1 - fluctuation)).toFixed(2));
            history.push({ price: histPrice, timestamp });
          }
          history[9] = { price: stock.price, timestamp: new Date(now) };
          stock.priceHistory = history;
          await stock.save();
        }
      }
    }
    console.log('Stock seed check and migration completed.');
  } catch (error) {
    console.error('Error seeding stocks:', error.message);
  }
};

// Start Background Stock Price Simulator
const startStockSimulator = () => {
  console.log('Starting Stock Price Simulator (8s interval)...');
  setInterval(async () => {
    try {
      const stocks = await Stock.find({});
      for (let stock of stocks) {
        // Random walk percentage change between -1.2% and +1.2%
        const jitterPercent = (Math.random() * 2.4 - 1.2) / 100;
        const newPrice = Number(Math.max(1.00, stock.price * (1 + jitterPercent)).toFixed(2));
        
        let history = stock.priceHistory || [];
        if (history.length === 0) {
          history.push({ price: stock.price, timestamp: new Date(Date.now() - 1000) });
        }
        
        // Calculate change percentage relative to the first price point in the history (open price representation)
        const openPrice = history[0] ? history[0].price : stock.price;
        const changePercentage = Number((((newPrice - openPrice) / openPrice) * 100).toFixed(2));
        
        history.push({ price: newPrice, timestamp: new Date() });
        if (history.length > 30) {
          history = history.slice(-30);
        }
        
        stock.price = newPrice;
        stock.changePercentage = changePercentage;
        stock.priceHistory = history;
        await stock.save();
      }
    } catch (error) {
      console.error('Simulator tick error:', error.message);
    }
  }, 8000);
};

// Seed stocks and start simulator
seedStocks().then(() => {
  startStockSimulator();
});

// Basic Check Route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Stock Broker API!' });
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/stocks', require('./routes/stockRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/portfolio', require('./routes/portfolioRoutes'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
