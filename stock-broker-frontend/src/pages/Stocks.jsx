import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { formatCurrency, formatPercentage } from '../utils/formatCurrency';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Cell
} from 'recharts';
import {
  Search,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  X,
  Plus,
  Minus,
  CheckCircle,
  AlertTriangle,
  Briefcase,
  Layers,
  HelpCircle
} from 'lucide-react';

const Stocks = () => {
  const { user, syncUser } = useAuth();
  
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState('All');
  
  // Trading and Drawer States
  const [selectedStock, setSelectedStock] = useState(null);
  const [orderType, setOrderType] = useState('BUY'); // BUY or SELL
  const [quantity, setQuantity] = useState(1);
  const [ownedQuantity, setOwnedQuantity] = useState(0);
  
  // Transaction Feedback
  const [txLoading, setTxLoading] = useState(false);
  const [txSuccess, setTxSuccess] = useState(null);
  const [txError, setTxError] = useState(null);
  const [chartStyle, setChartStyle] = useState('LINE'); // LINE or CANDLE
  
  // Drawer Stock Chart (computed from live priceHistory)
  const currentSelectedStock = selectedStock
    ? stocks.find((s) => s.symbol === selectedStock.symbol) || selectedStock
    : null;

  const stockChartData = currentSelectedStock?.priceHistory
    ? currentSelectedStock.priceHistory.map((point) => {
        const date = new Date(point.timestamp);
        return {
          date: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          price: point.price,
        };
      })
    : [];

  const candleChartData = currentSelectedStock?.priceHistory
    ? currentSelectedStock.priceHistory.map((point, index, arr) => {
        const prevPoint = index > 0 ? arr[index - 1] : point;
        const open = prevPoint.price;
        const close = point.price;
        
        // Deterministic pseudo-random value based on point details to keep wicks stable across re-renders
        const seedValue = ((close * 100 + index * 17) % 29) / 29;
        const fluctuation = close * 0.0018; // 0.18% max wick fluctuation
        
        const high = Math.max(open, close) + (seedValue * fluctuation);
        const low = Math.max(0.5, Math.min(open, close) - ((1 - seedValue) * fluctuation));
        
        const date = new Date(point.timestamp);
        return {
          time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          open: Number(open.toFixed(2)),
          close: Number(close.toFixed(2)),
          high: Number(high.toFixed(2)),
          low: Number(low.toFixed(2)),
          wick: [Number(low.toFixed(2)), Number(high.toFixed(2))],
          body: [Number(Math.min(open, close).toFixed(2)), Number(Math.max(open, close).toFixed(2))],
          isUp: close >= open
        };
      })
    : [];

  // Fetch stocks from database
  const fetchStocks = async () => {
    try {
      const response = await api.get('/stocks');
      setStocks(response.data);
    } catch (err) {
      console.error('Error fetching stocks:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user's holdings to check how many shares they own
  const checkHoldings = async (stockSymbol) => {
    try {
      const response = await api.get('/portfolio');
      const holding = response.data.holdings.find(
        (h) => h.stock?.symbol.toUpperCase() === stockSymbol.toUpperCase()
      );
      setOwnedQuantity(holding ? holding.quantity : 0);
    } catch (err) {
      console.error('Error fetching owned shares:', err);
      setOwnedQuantity(0);
    }
  };

  useEffect(() => {
    fetchStocks();
  }, []);

  // Poll backend for fresh stock prices every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStocks();
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  // Handle opening stock details
  const handleSelectStock = (stock) => {
    setSelectedStock(stock);
    setQuantity(1);
    setOrderType('BUY');
    setTxSuccess(null);
    setTxError(null);
    checkHoldings(stock.symbol);
  };

  // Handle transaction order
  const handleExecuteOrder = async (e) => {
    e.preventDefault();
    if (quantity <= 0) return;
    
    setTxLoading(true);
    setTxSuccess(null);
    setTxError(null);

    const endpoint = orderType === 'BUY' ? '/orders/buy' : '/orders/sell';
    
    try {
      const response = await api.post(endpoint, {
        symbol: selectedStock.symbol,
        quantity: Number(quantity),
      });

      setTxSuccess(response.data.message || 'Order completed successfully!');
      
      // Update owned shares
      await checkHoldings(selectedStock.symbol);
      // Synchronize context user state (buying power balance)
      await syncUser();
      
      // Reload stocks list prices to sync with latest state
      fetchStocks();
    } catch (err) {
      setTxError(err.response?.data?.message || 'Order execution failed.');
    } finally {
      setTxLoading(false);
    }
  };

  // Unique Sectors list
  const sectors = ['All', ...new Set(stocks.map((s) => s.sector))];

  // Filtering Logic
  const filteredStocks = stocks.filter((stock) => {
    const matchesSearch =
      stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.companyName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSector = selectedSector === 'All' || stock.sector === selectedSector;
    return matchesSearch && matchesSector;
  });

  const totalCost = currentSelectedStock ? currentSelectedStock.price * quantity : 0;
  const hasSufficientFunds = user && user.balance >= totalCost;
  const hasSufficientShares = ownedQuantity >= quantity;

  // Custom tooltips for stock chart
  const CustomStockTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0b1021] border border-darkborder px-2 py-1.5 rounded-lg shadow-md text-xs">
          <span className="font-bold text-gray-200">{payload[0].value.toFixed(2)} USD</span>
        </div>
      );
    }
    return null;
  };

  // Custom tooltips for candlestick chart
  const CustomCandleTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#0b1021] border border-darkborder p-2.5 rounded-xl shadow-xl text-xs space-y-1 z-50">
          <p className="text-gray-400 font-semibold mb-1 border-b border-darkborder/50 pb-1">{data.time}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            <span className="text-gray-400 font-light">Open:</span>
            <span className="text-gray-200 font-semibold text-right">${data.open.toFixed(2)}</span>
            
            <span className="text-gray-400 font-light">High:</span>
            <span className="text-emerald-400 font-semibold text-right">${data.high.toFixed(2)}</span>
            
            <span className="text-gray-400 font-light">Low:</span>
            <span className="text-red-400 font-semibold text-right">${data.low.toFixed(2)}</span>
            
            <span className="text-gray-400 font-light">Close:</span>
            <span className="text-gray-200 font-semibold text-right">${data.close.toFixed(2)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative min-h-screen">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight font-display">Markets Ticker</h1>
        <p className="text-gray-400 text-sm mt-1">Explore sectors, analyze price actions, and trade assets in real time.</p>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6 mb-8">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-3.5 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by symbol or name (e.g. AAPL, Tesla)..."
            className="w-full bg-[#0d1222]/50 border border-darkborder rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all font-sans"
          />
        </div>

        {/* Sector pill filters */}
        <div className="flex flex-wrap gap-2 overflow-x-auto pb-1 max-w-full">
          {sectors.map((sec) => (
            <button
              key={sec}
              onClick={() => setSelectedSector(sec)}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all border whitespace-nowrap ${
                selectedSector === sec
                  ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                  : 'bg-slate-900/40 border-darkborder/50 text-gray-400 hover:text-white hover:border-darkborder'
              }`}
            >
              {sec}
            </button>
          ))}
        </div>
      </div>

      {/* Stocks Directory Grid */}
      {loading ? (
        <div className="h-[50vh] flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-t-blue-500 border-r-transparent border-b-teal-400 border-l-transparent animate-spin rounded-full mb-3"></div>
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest">Streaming live board...</p>
        </div>
      ) : filteredStocks.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 border border-darkborder text-center max-w-md mx-auto mt-10">
          <HelpCircle className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-300">No assets found</h3>
          <p className="text-gray-500 text-xs mt-1">We couldn't find any stocks matching your query. Please check your spelling.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredStocks.map((stock) => {
            const isUp = stock.changePercentage >= 0;
            return (
              <motion.div
                key={stock.symbol}
                layoutId={`stock-card-${stock.symbol}`}
                onClick={() => handleSelectStock(stock)}
                className="glass-panel glass-panel-hover rounded-3xl p-5 border border-darkborder cursor-pointer relative overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="bg-gradient-to-tr from-slate-900 to-slate-950 px-3 py-1 text-xs font-bold rounded-lg border border-darkborder text-gray-300">
                      {stock.symbol}
                    </div>
                    <span className="text-[10px] text-gray-400 font-medium px-2 py-0.5 rounded-full bg-slate-900/60 border border-darkborder/30">
                      {stock.sector}
                    </span>
                  </div>

                  <h3 className="text-base font-extrabold text-gray-100 font-display line-clamp-1 truncate pr-1">
                    {stock.companyName}
                  </h3>
                </div>

                <div className="flex items-end justify-between mt-6">
                  <div>
                    <span className="text-[10px] text-gray-500 font-semibold tracking-wider uppercase block">Price</span>
                    <span className="text-xl font-black text-white font-display">
                      {formatCurrency(stock.price)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-500 font-semibold tracking-wider uppercase block">Daily Change</span>
                    <span className={`text-xs font-black flex items-center justify-end gap-1 ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      {formatPercentage(stock.changePercentage)}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* DETAIL AND TRADING DRAWER (Overlay) */}
      <AnimatePresence>
        {selectedStock && (
          <>
            {/* Drawer Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedStock(null)}
              className="fixed inset-0 bg-black/80 z-40"
            />
            {/* Drawer Container Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.35, ease: 'easeOut' }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#0a0d17] border-l border-darkborder z-50 flex flex-col justify-between shadow-2xl overflow-y-auto"
            >
              {/* Header Details */}
              <div className="p-6 border-b border-darkborder">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="px-2 py-0.5 text-xs font-black rounded-lg bg-slate-900 border border-darkborder text-gray-300">
                      {currentSelectedStock.symbol}
                    </span>
                    <h2 className="text-xl font-extrabold text-white mt-2 font-display">{currentSelectedStock.companyName}</h2>
                    <span className="text-xs text-gray-400">{currentSelectedStock.sector} Sector</span>
                  </div>
                  <button
                    onClick={() => setSelectedStock(null)}
                    className="p-1.5 hover:bg-slate-800 rounded-xl text-gray-400 hover:text-white transition-all active:scale-95"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center gap-4 py-2 mt-4 bg-slate-900/30 border border-darkborder/50 rounded-2xl px-4">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">Current Price</p>
                    <p className="text-2xl font-black text-white font-display">
                      {formatCurrency(currentSelectedStock.price)}
                    </p>
                  </div>
                  <div className="border-l border-darkborder h-8 self-center" />
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">24h Change</p>
                    <span className={`text-sm font-bold flex items-center gap-0.5 mt-0.5 ${
                      currentSelectedStock.changePercentage >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {currentSelectedStock.changePercentage >= 0 ? '+' : ''}
                      {currentSelectedStock.changePercentage}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Chart & Live Status Area */}
              <div className="p-6 space-y-6 flex-1">
                {/* Micro chart */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Price Trend (7D)</h3>
                    {/* Line vs Candle Chart Toggle */}
                    <div className="flex bg-slate-950/80 p-0.5 border border-darkborder/40 rounded-lg">
                      {['LINE', 'CANDLE'].map((style) => (
                        <button
                          key={style}
                          onClick={() => setChartStyle(style)}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all ${
                            chartStyle === style
                              ? 'bg-blue-600/90 text-white shadow'
                              : 'text-gray-500 hover:text-gray-300'
                          }`}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="h-[140px] w-full bg-slate-900/20 border border-darkborder/50 rounded-2xl p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      {chartStyle === 'LINE' ? (
                        <AreaChart data={stockChartData}>
                          <defs>
                            <linearGradient id="stockGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={currentSelectedStock.changePercentage >= 0 ? '#10b981' : '#ef4444'} stopOpacity={0.15} />
                              <stop offset="95%" stopColor={currentSelectedStock.changePercentage >= 0 ? '#10b981' : '#ef4444'} stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <Tooltip content={<CustomStockTooltip />} />
                          <Area
                            type="monotone"
                            dataKey="price"
                            stroke={currentSelectedStock.changePercentage >= 0 ? '#10b981' : '#ef4444'}
                            strokeWidth={1.8}
                            fillOpacity={1}
                            fill="url(#stockGradient)"
                          />
                        </AreaChart>
                      ) : (
                        <ComposedChart data={candleChartData} barGap="-100%">
                          <XAxis dataKey="time" hide />
                          <YAxis domain={['auto', 'auto']} hide />
                          <Tooltip content={<CustomCandleTooltip />} />
                          <Bar dataKey="wick" barSize={1.5} fill="#475569" />
                          <Bar dataKey="body" barSize={8}>
                            {candleChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.isUp ? '#10b981' : '#ef4444'} />
                            ))}
                          </Bar>
                        </ComposedChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Operations Panel */}
                <div className="space-y-4">
                  <div className="flex bg-slate-900 border border-darkborder rounded-xl p-1 justify-between">
                    <button
                      onClick={() => { setOrderType('BUY'); setTxSuccess(null); setTxError(null); }}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                        orderType === 'BUY'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      BUY ASSET
                    </button>
                    <button
                      onClick={() => { setOrderType('SELL'); setTxSuccess(null); setTxError(null); }}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                        orderType === 'SELL'
                          ? 'bg-teal-600 text-white shadow-md'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      SELL ASSET
                    </button>
                  </div>

                  {/* Quantity adjustment */}
                  <div className="bg-[#0b1021]/50 border border-darkborder rounded-2xl p-4">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-semibold text-gray-400">Position size</span>
                      {orderType === 'SELL' && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Briefcase className="w-3 h-3" />
                          <span>Owned: <strong className="text-teal-400">{ownedQuantity} shares</strong></span>
                        </span>
                      )}
                      {orderType === 'BUY' && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          <span>Power: <strong className="text-blue-400">{formatCurrency(user?.balance)}</strong></span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between bg-slate-950/60 rounded-xl p-2 border border-darkborder/50">
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="p-2 hover:bg-slate-800 text-gray-400 hover:text-white rounded-lg active:scale-95 transition-all"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-20 bg-transparent text-center text-lg font-bold text-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setQuantity(quantity + 1)}
                        className="p-2 hover:bg-slate-800 text-gray-400 hover:text-white rounded-lg active:scale-95 transition-all"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Transaction total details */}
                  <div className="space-y-2.5 px-2">
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Market Valuation</span>
                      <span>{formatCurrency(currentSelectedStock.price)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Fee Rate (Brokerage)</span>
                      <span className="text-teal-400 font-semibold">FREE (0.00%)</span>
                    </div>
                    <div className="border-t border-darkborder/30 my-2" />
                    <div className="flex justify-between text-sm font-bold text-white">
                      <span>Total Amount</span>
                      <span className="text-base text-gray-100 font-display">{formatCurrency(totalCost)}</span>
                    </div>
                  </div>
                </div>

                {/* Operation Messages Banners */}
                {txSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs flex items-start gap-2"
                  >
                    <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{txSuccess}</span>
                  </motion.div>
                )}
                {txError && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs flex items-start gap-2"
                  >
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{txError}</span>
                  </motion.div>
                )}
              </div>

              {/* Submit Execution Drawer Action Button */}
              <div className="p-6 border-t border-darkborder bg-[#0d1020]/20">
                {orderType === 'BUY' ? (
                  <button
                    onClick={handleExecuteOrder}
                    disabled={txLoading || !hasSufficientFunds}
                    className="w-full btn-primary text-white rounded-xl py-3.5 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 hover:shadow-lg disabled:pointer-events-none"
                  >
                    {txLoading ? 'Transacting order...' : !hasSufficientFunds ? 'INSUFFICIENT FUNDS' : `BUY ${quantity} SHARES`}
                  </button>
                ) : (
                  <button
                    onClick={handleExecuteOrder}
                    disabled={txLoading || !hasSufficientShares}
                    className="w-full py-3.5 text-sm font-bold rounded-xl text-white bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-500 hover:to-indigo-500 active:scale-95 disabled:opacity-50 hover:shadow-lg disabled:pointer-events-none transition-all duration-200"
                  >
                    {txLoading ? 'Transacting order...' : !hasSufficientShares ? 'INSUFFICIENT POSITION' : `SELL ${quantity} SHARES`}
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Stocks;
