import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { formatCurrency, formatPercentage } from '../utils/formatCurrency';
import { motion } from 'framer-motion';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  Briefcase,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  PieChart as PieIcon,
  Search,
  ArrowUpRight,
  TrendingUp as TrendUpIcon,
  HelpCircle,
  Play
} from 'lucide-react';

const COLORS = [
  '#2563eb', // Blue
  '#0d9488', // Teal
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Violet
];

const Portfolio = () => {
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');

  const fetchPortfolio = async () => {
    try {
      const response = await api.get('/portfolio');
      setPortfolio(response.data);
    } catch (err) {
      console.error('Error fetching portfolio:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, []);

  // Poll backend for fresh portfolio data every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPortfolio();
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPortfolio();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-t-blue-500 border-r-transparent border-b-teal-400 border-l-transparent animate-spin rounded-full mb-4"></div>
        <p className="text-gray-400 text-sm tracking-wider font-semibold uppercase">Loading Portfolio Audit...</p>
      </div>
    );
  }

  // Pre-process chart data
  const chartData = portfolio?.holdings.map((h) => ({
    name: h.stock?.symbol || 'STOCK',
    value: h.currentValue,
  })) || [];

  // Filter holdings table
  const filteredHoldings = portfolio?.holdings.filter((h) => {
    if (!h.stock) return false;
    return (
      h.stock.symbol.toLowerCase().includes(filterQuery.toLowerCase()) ||
      h.stock.companyName.toLowerCase().includes(filterQuery.toLowerCase())
    );
  }) || [];

  const totalPortfolioValue = (portfolio?.currentValue || 0) + (portfolio?.user?.balance || 0);
  const isProfitable = (portfolio?.totalProfitLoss || 0) >= 0;

  // Custom tooltips for pie chart
  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const percentageOfPortfolio = totalPortfolioValue > 0
        ? ((payload[0].value / totalPortfolioValue) * 100).toFixed(1)
        : 0;
      return (
        <div className="bg-[#0b1021] border border-darkborder p-3 rounded-xl shadow-xl">
          <p className="text-xs font-bold text-gray-200 mb-0.5">{payload[0].name}</p>
          <p className="text-sm font-bold text-teal-400">{formatCurrency(payload[0].value)}</p>
          <p className="text-[10px] text-gray-400 mt-1 font-medium">{percentageOfPortfolio}% of Net Worth</p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      {/* Upper Title Row */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight font-display">Portfolio Analysis</h1>
          <p className="text-gray-400 text-sm mt-1">Review asset distributions, purchase price averages, and performance metrics.</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-slate-900 border border-darkborder rounded-xl text-gray-300 hover:text-white transition-all hover:bg-slate-800 disabled:opacity-50 active:scale-95 shadow-md"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Sync Assets</span>
        </button>
      </div>

      {portfolio?.holdings.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 border border-darkborder text-center max-w-md mx-auto mt-10">
          <HelpCircle className="w-12 h-12 text-gray-600 mx-auto mb-4 animate-pulse" />
          <h3 className="text-lg font-bold text-gray-300">Your Portfolio is Empty</h3>
          <p className="text-gray-500 text-xs mt-1.5 max-w-[280px] mx-auto">
            You don't own any active holdings yet. Browse the markets to buy stocks.
          </p>
          <button
            onClick={() => navigate('/stocks')}
            className="mt-6 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-teal-500 text-white rounded-xl text-xs font-bold hover:shadow-lg active:scale-95 transition-all flex items-center gap-1.5 mx-auto"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Invest Now</span>
          </button>
        </div>
      ) : (
        <>
          {/* Top Panel - Assets Breakdown vs cash */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Asset Allocation Pie Chart */}
            <div className="glass-panel border border-darkborder rounded-3xl p-6 flex flex-col justify-between h-[360px]">
              <div>
                <h2 className="text-lg font-bold text-white font-display flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-blue-400" />
                  <span>Asset Allocation</span>
                </h2>
                <p className="text-gray-400 text-xs mt-0.5">Asset shares breakdown by symbol valuation</p>
              </div>

              <div className="h-[220px] w-full mt-2 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0.4)" strokeWidth={1} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] text-gray-400 font-semibold px-2">
                {chartData.map((item, index) => (
                  <span key={item.name} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    {item.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Comprehensive Metrics List */}
            <div className="glass-panel border border-darkborder rounded-3xl p-6 lg:col-span-2 flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-bold text-white font-display flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-teal-400" />
                  <span>Asset Valuation Summary</span>
                </h2>
                <p className="text-gray-400 text-xs mt-0.5 font-sans">Full summary of holdings cost vs market values</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
                <div className="bg-[#0b1021]/50 border border-darkborder/50 rounded-2xl p-4">
                  <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block mb-1">Total Assets Valuation</span>
                  <span className="text-2xl font-black text-white font-display">{formatCurrency(portfolio?.currentValue)}</span>
                </div>
                <div className="bg-[#0b1021]/50 border border-darkborder/50 rounded-2xl p-4">
                  <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block mb-1">Settled Funds (Cash)</span>
                  <span className="text-2xl font-black text-teal-400 font-display">{formatCurrency(portfolio?.user?.balance)}</span>
                </div>
                <div className="bg-[#0b1021]/50 border border-darkborder/50 rounded-2xl p-4">
                  <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block mb-1">Invested Capital basis</span>
                  <span className="text-2xl font-black text-indigo-400 font-display">{formatCurrency(portfolio?.totalInvestment)}</span>
                </div>
                <div className="bg-[#0b1021]/50 border border-darkborder/50 rounded-2xl p-4">
                  <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block mb-1">Net Gain / Loss</span>
                  <span className={`text-2xl font-black font-display ${isProfitable ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatCurrency(portfolio?.totalProfitLoss)} ({portfolio?.totalProfitLossPercentage >= 0 ? '+' : ''}{portfolio?.totalProfitLossPercentage}%)
                  </span>
                </div>
              </div>

              <div className="p-4 bg-slate-900/40 border border-darkborder/40 rounded-2xl flex items-center justify-between text-xs text-gray-400">
                <span>Invested Net Worth: <strong className="text-white font-semibold">{formatCurrency(totalPortfolioValue)}</strong></span>
                <span className="flex items-center gap-1 text-teal-400 font-semibold">
                  <span>Buying stocks</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>

          {/* Holdings detailed list table */}
          <div className="glass-panel border border-darkborder rounded-3xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-white font-display">Active Positions</h2>
                <p className="text-gray-400 text-xs mt-0.5">Manage and track profit/losses for each asset held</p>
              </div>
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3.5 top-2.5 w-3.5 h-3.5 text-gray-500" />
                <input
                  type="text"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder="Filter holdings..."
                  className="w-full bg-[#0d1222]/50 border border-darkborder rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-sans"
                />
              </div>
            </div>

            {filteredHoldings.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-gray-500 text-xs">No matching holdings found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-darkborder/50 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                      <th className="pb-3 pl-3">Asset</th>
                      <th className="pb-3">Shares</th>
                      <th className="pb-3">Avg Cost</th>
                      <th className="pb-3">Invested Value</th>
                      <th className="pb-3">Current Price</th>
                      <th className="pb-3">Current Valuation</th>
                      <th className="pb-3 pr-3 text-right">Profit / Loss</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-darkborder/20">
                    {filteredHoldings.map((holding) => {
                      if (!holding.stock) return null;
                      const pl = holding.profitLoss;
                      const isUp = pl >= 0;
                      return (
                        <tr
                          key={holding._id}
                          onClick={() => navigate('/stocks')}
                          className="text-sm hover:bg-[#0c1020]/30 transition-all duration-150 cursor-pointer"
                        >
                          <td className="py-4 pl-3">
                            <div>
                              <p className="font-bold text-gray-200">{holding.stock.symbol}</p>
                              <p className="text-[10px] text-gray-500 font-light truncate max-w-[150px]">{holding.stock.companyName}</p>
                            </div>
                          </td>
                          <td className="py-4 text-gray-300 font-medium">{holding.quantity}</td>
                          <td className="py-4 text-gray-300 font-semibold">{formatCurrency(holding.averageBuyPrice)}</td>
                          <td className="py-4 text-gray-400 font-medium">{formatCurrency(holding.investmentValue)}</td>
                          <td className="py-4 text-gray-300 font-semibold">{formatCurrency(holding.stock.price)}</td>
                          <td className="py-4 text-gray-100 font-bold">{formatCurrency(holding.currentValue)}</td>
                          <td className="py-4 pr-3 text-right">
                            <span className={`font-black flex items-center justify-end gap-1 ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                              {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                              <span>{formatCurrency(pl)} ({isUp ? '+' : ''}{holding.profitLossPercentage}%)</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
};

export default Portfolio;
