const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema(
  {
    symbol: {
      type: String,
      required: [true, 'Please add a stock symbol'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    companyName: {
      type: String,
      required: [true, 'Please add a company name'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Please add stock price'],
      min: [0, 'Price cannot be negative'],
    },
    sector: {
      type: String,
      required: [true, 'Please add a sector'],
      trim: true,
    },
    changePercentage: {
      type: Number,
      default: 0.0,
    },
    isIndex: {
      type: Boolean,
      default: false,
    },
    priceHistory: [
      {
        price: {
          type: Number,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Stock', stockSchema);
