import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { formatCurrency } from '../utils/formatCurrency';
import { motion } from 'framer-motion';
import {
  History,
  Search,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Clock,
  Layers,
  ArrowRight,
  ClipboardList
} from 'lucide-react';

const Orders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders/my-orders');
      setOrders(response.data);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-t-blue-500 border-r-transparent border-b-teal-400 border-l-transparent animate-spin rounded-full mb-4"></div>
        <p className="text-gray-400 text-sm tracking-wider font-semibold uppercase">Loading Transactions history...</p>
      </div>
    );
  }

  // Filter orders by symbol or name
  const filteredOrders = orders.filter((order) => {
    if (!order.stock) return false;
    return (
      order.stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.stock.companyName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Calculate statistics
  const totalTrades = orders.length;
  const buyTrades = orders.filter((o) => o.type === 'BUY').length;
  const sellTrades = orders.filter((o) => o.type === 'SELL').length;
  const totalVolume = orders.reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      {/* Title Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight font-display">Order History</h1>
          <p className="text-gray-400 text-sm mt-1">Audit log of all processed market operations and order executions.</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-slate-900 border border-darkborder rounded-xl text-gray-300 hover:text-white transition-all hover:bg-slate-800 disabled:opacity-50 active:scale-95 shadow-md"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Sync Operations</span>
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 border border-darkborder text-center max-w-md mx-auto mt-10">
          <ClipboardList className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-300">No Operations Recorded</h3>
          <p className="text-gray-500 text-xs mt-1.5 max-w-[285px] mx-auto">
            You haven't executed any trades yet. Start buying and selling stock to see logs.
          </p>
          <button
            onClick={() => navigate('/stocks')}
            className="mt-6 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-teal-500 text-white rounded-xl text-xs font-bold hover:shadow-lg active:scale-95 transition-all flex items-center gap-1.5 mx-auto"
          >
            <span>Browse Stock Markets</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <>
          {/* Operations Performance Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass-panel border border-darkborder rounded-3xl p-5 relative overflow-hidden">
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block mb-1">Total Operations</span>
              <p className="text-2xl font-black text-white font-display">{totalTrades} executions</p>
            </div>
            <div className="glass-panel border border-darkborder rounded-3xl p-5 relative overflow-hidden">
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block mb-1">BUY Transactions</span>
              <p className="text-2xl font-black text-blue-400 font-display">{buyTrades} fills</p>
            </div>
            <div className="glass-panel border border-darkborder rounded-3xl p-5 relative overflow-hidden">
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block mb-1">SELL Transactions</span>
              <p className="text-2xl font-black text-teal-400 font-display">{sellTrades} fills</p>
            </div>
            <div className="glass-panel border border-darkborder rounded-3xl p-5 relative overflow-hidden">
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block mb-1">Transacted Volume</span>
              <p className="text-2xl font-black text-indigo-400 font-display">{formatCurrency(totalVolume)}</p>
            </div>
          </div>

          {/* Detailed Transaction Log Table */}
          <div className="glass-panel border border-darkborder rounded-3xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-white font-display">Execution Logs</h2>
                <p className="text-gray-400 text-xs mt-0.5">Chronological record of verified broker transaction orders</p>
              </div>
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3.5 top-2.5 w-3.5 h-3.5 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search orders..."
                  className="w-full bg-[#0d1222]/50 border border-darkborder rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-sans"
                />
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-gray-500 text-xs">No matching orders found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-darkborder/50 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                      <th className="pb-3 pl-3">Asset</th>
                      <th className="pb-3">Type</th>
                      <th className="pb-3">Shares</th>
                      <th className="pb-3">Price per Share</th>
                      <th className="pb-3">Total Fills</th>
                      <th className="pb-3">Execution Status</th>
                      <th className="pb-3 pr-3 text-right">Settled Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-darkborder/20">
                    {filteredOrders.map((order) => {
                      const isBuy = order.type === 'BUY';
                      return (
                        <tr
                          key={order._id}
                          className="text-sm hover:bg-[#0c1020]/30 transition-all duration-150"
                        >
                          <td className="py-4 pl-3">
                            <div>
                              <p className="font-bold text-gray-200">{order.stock?.symbol || 'STOCK'}</p>
                              <p className="text-[10px] text-gray-500 font-light truncate max-w-[150px]">{order.stock?.companyName || 'Unknown Stock'}</p>
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
                          <td className="py-4">
                            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                              <span>{order.status || 'COMPLETED'}</span>
                            </span>
                          </td>
                          <td className="py-4 pr-3 text-right text-xs text-gray-400">
                            {new Date(order.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
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
        </>
      )}
    </motion.div>
  );
};

export default Orders;
