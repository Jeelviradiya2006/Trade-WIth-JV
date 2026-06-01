import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { formatCurrency, formatPercentage } from '../utils/formatCurrency';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Briefcase,
  Layers,
  ArrowRight,
  RefreshCw,
  Clock,
  Play
} from 'lucide-react';

const Dashboard = () => {
  const { user, syncUser } = useAuth();
  const navigate = useNavigate();

  const [portfolioData, setPortfolioData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chartPeriod, setChartPeriod] = useState('7D');
  const [historicalData, setHistoricalData] = useState([]);
  const [indices, setIndices] = useState([]);

  const fetchData = async () => {
    try {
      const [portfolioRes, ordersRes, indicesRes] = await Promise.all([
        api.get('/portfolio'),
        api.get('/orders/my-orders'),
        api.get('/stocks/market/indices'),
      ]);
      setPortfolioData(portfolioRes.data);
      // Take only first 4 orders for dashboard preview
      setOrders(ordersRes.data.slice(0, 4));
      setIndices(indicesRes.data);
      
      // Generate chart data based on current values
      generateHistoricalData(
        portfolioRes.data.currentValue + (portfolioRes.data.user?.balance || 10000),
        portfolioRes.data.totalProfitLoss
      );
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Poll backend for fresh dashboard data every 8 seconds
    const interval = setInterval(() => {
      fetchData();
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([syncUser(), fetchData()]);
    setRefreshing(false);
  };

  // Generate realistic-looking historical chart data based on current net worth and profit/loss
  const generateHistoricalData = (netWorth, totalProfitLoss) => {
    const dataPoints = [];
    const now = new Date();
    let numDays = 7;
    if (chartPeriod === '1M') numDays = 30;
    if (chartPeriod === '3M') numDays = 90;

    const step = totalProfitLoss / numDays;
    const baseValue = netWorth - totalProfitLoss;

    for (let i = numDays; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      
      // Add natural fluctuation
      const progressRatio = (numDays - i) / numDays;
      const linearTrend = baseValue + step * (numDays - i);
      const randomFluctuation = linearTrend * (Math.sin(i * 0.5) * 0.015 + Math.cos(i * 0.3) * 0.008);
      const value = linearTrend + randomFluctuation;

      dataPoints.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: Number(value.toFixed(2)),
      });
    }
    setHistoricalData(dataPoints);
  };

  // Re-generate chart data whenever period changes
  useEffect(() => {
    if (portfolioData) {
      generateHistoricalData(
        portfolioData.currentValue + (portfolioData.user?.balance || 0),
        portfolioData.totalProfitLoss
      );
    }
  }, [chartPeriod, portfolioData]);

  if (loading) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-t-blue-500 border-r-transparent border-b-teal-400 border-l-transparent animate-spin rounded-full mb-4"></div>
        <p className="text-gray-400 text-sm tracking-wider font-semibold uppercase">Loading Trading Desk...</p>
      </div>
    );
  }

  const netWorth = (portfolioData?.currentValue || 0) + (portfolioData?.user?.balance || 0);
  const totalProfitLoss = portfolioData?.totalProfitLoss || 0;
  const isProfitable = totalProfitLoss >= 0;

  // Custom tooltips for chart
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0b1021] border border-darkborder p-3 rounded-xl shadow-xl">
          <p className="text-xs text-gray-400 font-medium mb-0.5">{payload[0].payload.date}</p>
          <p className="text-sm font-bold text-teal-400">{formatCurrency(payload[0].value)}</p>
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
      {/* Upper Welcome Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight font-display">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-gray-400 text-sm mt-1">Here is a summary of your investment performance today.</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-slate-900 border border-darkborder rounded-xl text-gray-300 hover:text-white transition-all hover:bg-slate-800 disabled:opacity-50 active:scale-95 shadow-md"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Terminal</span>
        </button>
      </div>

      {/* Market Indices Row */}
      {indices && indices.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {indices.map((idx) => {
            const isUp = idx.changePercentage >= 0;
            const chartData = (idx.priceHistory || []).map((point) => {
              const date = new Date(point.timestamp);
              return {
                time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                value: point.price,
              };
            });
            
            return (
              <div
                key={idx.symbol}
                className="glass-panel border border-darkborder rounded-3xl p-5 flex items-center justify-between overflow-hidden relative"
              >
                <div className={`absolute top-0 left-0 w-2.5 h-full ${isUp ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <div className="pl-2.5 space-y-1.5">
                  <div>
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block">Indian Index Tracker</span>
                    <h3 className="text-base font-extrabold text-white font-display tracking-tight leading-none mt-0.5">{idx.companyName}</h3>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-black text-gray-100 font-display">
                      {idx.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                    <span className={`text-xs font-black flex items-center gap-0.5 ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isUp ? '+' : ''}{idx.changePercentage.toFixed(2)}%
                    </span>
                  </div>
                </div>

                {/* Sparkline chart */}
                <div className="h-14 w-28 sm:w-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                      <defs>
                        <linearGradient id={`grad-${idx.symbol}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={isUp ? '#10b981' : '#ef4444'} stopOpacity={0.15} />
                          <stop offset="95%" stopColor={isUp ? '#10b981' : '#ef4444'} stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={isUp ? '#10b981' : '#ef4444'}
                        strokeWidth={1.5}
                        fillOpacity={1}
                        fill={`url(#grad-${idx.symbol})`}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Main Stats Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Net Worth */}
        <div className="glass-panel border border-darkborder rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-blue-500" />
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Net Worth</span>
            <div className="bg-blue-500/10 p-2 rounded-xl text-blue-400">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-white font-display mb-1">{formatCurrency(netWorth)}</p>
          <div className="flex items-center gap-1.5 mt-2">
            {isProfitable ? (
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-400" />
            )}
            <span className={`text-xs font-bold ${isProfitable ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatPercentage(portfolioData?.totalProfitLossPercentage)}
            </span>
            <span className="text-[10px] text-gray-500 font-medium">All Time</span>
          </div>
        </div>

        {/* Buying Power */}
        <div className="glass-panel border border-darkborder rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-teal-500" />
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Buying Power</span>
            <div className="bg-teal-500/10 p-2 rounded-xl text-teal-400">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-white font-display mb-1">
            {formatCurrency(portfolioData?.user?.balance)}
          </p>
          <p className="text-xs text-gray-400 mt-2">Settled cash ready to trade</p>
        </div>

        {/* Invested Capital */}
        <div className="glass-panel border border-darkborder rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500" />
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Invested Value</span>
            <div className="bg-indigo-500/10 p-2 rounded-xl text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-white font-display mb-1">
            {formatCurrency(portfolioData?.totalInvestment)}
          </p>
          <p className="text-xs text-gray-400 mt-2">Cost basis of open positions</p>
        </div>

        {/* Net Profit / Loss */}
        <div className="glass-panel border border-darkborder rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500" />
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Profit/Loss</span>
            <div className="bg-emerald-500/10 p-2 rounded-xl text-emerald-400">
              {isProfitable ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </div>
          </div>
          <p className={`text-2xl font-black font-display mb-1 ${isProfitable ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCurrency(totalProfitLoss)}
          </p>
          <p className="text-xs text-gray-400 mt-2">Unrealized gains across holdings</p>
        </div>
      </div>

      {/* Main Charts & Analytics Block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Performance Chart Card */}
        <div className="glass-panel border border-darkborder rounded-3xl p-6 lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-bold text-white font-display">Performance History</h2>
              <p className="text-gray-400 text-xs mt-0.5">Asset value development over time</p>
            </div>
            {/* Filter buttons */}
            <div className="flex bg-slate-900/80 p-1 border border-darkborder rounded-xl">
              {['7D', '1M', '3M'].map((period) => (
                <button
                  key={period}
                  onClick={() => setChartPeriod(period)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all duration-200 ${
                    chartPeriod === period
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historicalData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  stroke="#475569"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#475569"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `$${val.toLocaleString()}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="url(#chartGradient)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#chartGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Portfolio quick preview */}
        <div className="glass-panel border border-darkborder rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-bold text-white font-display">Holdings Summary</h2>
                <p className="text-gray-400 text-xs mt-0.5">Your top investment allocations</p>
              </div>
              <button
                onClick={() => navigate('/portfolio')}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 transition-colors"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {portfolioData?.holdings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-900 border border-darkborder flex items-center justify-center text-gray-500 mb-3">
                  <Layers className="w-6 h-6" />
                </div>
                <p className="text-gray-300 text-sm font-semibold">No assets owned yet</p>
                <p className="text-gray-500 text-xs mt-1 max-w-[200px]">
                  Explore available stocks and buy your first share today.
                </p>
                <button
                  onClick={() => navigate('/stocks')}
                  className="mt-4 px-4 py-2 bg-gradient-to-r from-blue-600 to-teal-500 text-white rounded-xl text-xs font-bold hover:shadow-lg active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Start Trading</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {portfolioData?.holdings.slice(0, 4).map((holding) => {
                  if (!holding.stock) return null;
                  const pl = holding.profitLoss;
                  const isHoldingProfitable = pl >= 0;
                  return (
                    <div
                      key={holding._id}
                      onClick={() => navigate('/stocks')}
                      className="flex items-center justify-between p-3 rounded-2xl bg-[#0e1325]/40 border border-darkborder/40 hover:border-darkborder hover:bg-[#121931]/60 transition-all duration-200 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-900 to-slate-950 flex items-center justify-center font-bold text-gray-300 border border-darkborder/50 text-xs">
                          {holding.stock.symbol}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-200">{holding.stock.symbol}</p>
                          <p className="text-[10px] text-gray-400 font-light truncate max-w-[120px]">
                            {holding.stock.companyName}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-200">{formatCurrency(holding.currentValue)}</p>
                        <p className={`text-xs font-bold ${isHoldingProfitable ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isHoldingProfitable ? '+' : ''}
                          {holding.profitLossPercentage}%
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {portfolioData?.holdings.length > 0 && (
            <div className="pt-4 mt-4 border-t border-darkborder/30 text-center">
              <span className="text-xs text-gray-400">
                You own positions in <strong className="text-teal-400 font-semibold">{portfolioData.holdings.length}</strong> different assets.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Activity Section */}
      <div className="glass-panel border border-darkborder rounded-3xl p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-bold text-white font-display">Recent Operations</h2>
            <p className="text-gray-400 text-xs mt-0.5">Your latest orders and execution logs</p>
          </div>
          <button
            onClick={() => navigate('/orders')}
            className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 transition-colors"
          >
            <span>Audit History</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-900 border border-darkborder flex items-center justify-center text-gray-500 mb-3">
              <Clock className="w-5 h-5" />
            </div>
            <p className="text-gray-300 text-sm font-semibold">No transactions recorded</p>
            <p className="text-gray-500 text-xs mt-1">Your order transaction logs will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-darkborder/50 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                  <th className="pb-3 pl-3">Asset</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Quantity</th>
                  <th className="pb-3">Rate</th>
                  <th className="pb-3">Total Amount</th>
                  <th className="pb-3 pr-3 text-right">Execution Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-darkborder/20">
                {orders.map((order) => {
                  const isBuy = order.type === 'BUY';
                  return (
                    <tr
                      key={order._id}
                      className="text-sm hover:bg-[#0c1020]/30 transition-all duration-150"
                    >
                      <td className="py-4 pl-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-200">{order.stock?.symbol || 'STOCK'}</span>
                          <span className="text-xs text-gray-500 font-light truncate max-w-[120px] hidden sm:inline">
                            {order.stock?.companyName}
                          </span>
                        </div>
                      </td>
                      <td className="py-4">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            isBuy
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                          }`}
                        >
                          {order.type}
                        </span>
                      </td>
                      <td className="py-4 text-gray-300 font-medium">{order.quantity}</td>
                      <td className="py-4 text-gray-300 font-semibold">{formatCurrency(order.price)}</td>
                      <td className="py-4 text-gray-100 font-bold">{formatCurrency(order.totalAmount)}</td>
                      <td className="py-4 pr-3 text-right text-xs text-gray-400">
                        {new Date(order.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Dashboard;
