import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatCurrency';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  TrendingUp,
  Briefcase,
  History,
  LogOut,
  Menu,
  X,
  Wallet,
  RefreshCw,
  TrendingDown,
  User as UserIcon,
  AlertCircle,
  CheckCircle,
  Loader2,
  Plus,
  Minus
} from 'lucide-react';

const Layout = () => {
  const { user, logout, syncUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [walletAmount, setWalletAmount] = useState('');
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState('');
  const [walletSuccess, setWalletSuccess] = useState('');

  const handleWalletAction = async (type) => {
    setWalletError('');
    setWalletSuccess('');
    const amt = parseFloat(walletAmount);

    if (isNaN(amt) || amt <= 0) {
      setWalletError('Please enter a valid amount greater than 0.');
      return;
    }

    setWalletLoading(true);
    try {
      const endpoint = type === 'DEPOSIT' ? '/portfolio/deposit' : '/portfolio/withdraw';
      const response = await api.post(endpoint, { amount: amt });
      
      setWalletSuccess(response.data.message);
      setWalletAmount('');
      await syncUser();
    } catch (err) {
      setWalletError(err.response?.data?.message || 'Operation failed. Please try again.');
    } finally {
      setWalletLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await syncUser();
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setRefreshing(false), 600);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Browse Stocks', path: '/stocks', icon: TrendingUp },
    { name: 'Portfolio', path: '/portfolio', icon: Briefcase },
    { name: 'Order History', path: '/orders', icon: History },
  ];

  return (
    <div className="min-h-screen bg-[#060913] text-gray-100 flex flex-col md:flex-row relative overflow-hidden">
      {/* Background Decorative Glow Spheres */}
      <div className="glow-sphere top-[-100px] left-[-100px]" />
      <div className="glow-sphere bottom-[-150px] right-[-100px]" style={{ background: 'radial-gradient(circle, rgba(13, 148, 136, 0.1) 0%, rgba(37, 99, 235, 0.02) 60%, transparent 100%)' }} />

      {/* MOBILE HEADER */}
      <header className="md:hidden flex items-center justify-between px-6 py-4 bg-darkcard/80 border-b border-darkborder backdrop-blur-md z-40 sticky top-0">
        <div className="flex items-center gap-2" onClick={() => navigate('/dashboard')}>
          <div className="bg-gradient-to-tr from-blue-600 to-teal-500 p-2 rounded-lg shadow-lg">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent font-display">
            TradeWithJV
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-gray-400 hover:text-white transition-colors duration-200"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 glass-panel border-r border-darkborder h-screen sticky top-0 z-30 justify-between p-6">
        <div className="flex flex-col gap-8">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
            <div className="bg-gradient-to-tr from-blue-600 to-teal-500 p-2 rounded-lg shadow-lg">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent font-display">
              TradeWithJV
            </span>
          </div>

          {/* User Brief info */}
          <div className="p-4 rounded-xl bg-slate-900/40 border border-darkborder/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center font-bold text-slate-950">
                {user?.name ? user.name[0].toUpperCase() : <UserIcon className="w-4 h-4" />}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold truncate text-gray-200">{user?.name || 'Investor'}</p>
                <p className="text-xs truncate text-gray-400 font-light">{user?.email}</p>
              </div>
            </div>
            {/* Balance Panel */}
            <div className="pt-3 border-t border-darkborder/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase">Buying Power</p>
                  <p className="text-base font-bold text-teal-400 font-display">
                    {formatCurrency(user?.balance)}
                  </p>
                </div>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-2 hover:bg-slate-800 rounded-lg text-gray-400 hover:text-white transition-all active:scale-95 disabled:opacity-50"
                  title="Refresh Balance"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-teal-400' : ''}`} />
                </button>
              </div>
              <button
                onClick={() => setWalletModalOpen(true)}
                className="w-full mt-2 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs text-blue-400 hover:text-blue-300 font-semibold rounded-lg border border-darkborder/50 transition-all flex items-center justify-center gap-1.5"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Manage Wallet</span>
              </button>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all relative ${
                      isActive
                        ? 'text-white'
                        : 'text-gray-400 hover:text-gray-100 hover:bg-slate-900/30'
                    }`
                  }
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-indicator"
                      className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-teal-500/10 border border-blue-500/30 rounded-xl"
                      initial={false}
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon className={`w-4 h-4 z-10 ${isActive ? 'text-blue-400' : 'text-gray-400'}`} />
                  <span className="z-10">{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Logout Section */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </aside>

      {/* MOBILE DRAWER */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-40 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed left-0 top-0 bottom-0 w-72 bg-[#090d19] border-r border-darkborder p-6 flex flex-col justify-between z-50 md:hidden"
            >
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="bg-gradient-to-tr from-blue-600 to-teal-500 p-2 rounded-lg shadow-lg">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent font-display">
                      TradeWithJV
                    </span>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1 hover:bg-slate-800 rounded-lg text-gray-400 hover:text-white"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* User info in mobile */}
                <div className="p-4 rounded-xl bg-slate-900/40 border border-darkborder/50">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center font-bold text-slate-950">
                      {user?.name ? user.name[0].toUpperCase() : <UserIcon className="w-4 h-4" />}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-semibold truncate text-gray-200">{user?.name}</p>
                      <p className="text-xs truncate text-gray-400 font-light">{user?.email}</p>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-darkborder/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase">Buying Power</p>
                        <p className="text-base font-bold text-teal-400 font-display">
                          {formatCurrency(user?.balance)}
                        </p>
                      </div>
                      <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="p-2 hover:bg-slate-800 rounded-lg text-gray-400 hover:text-white transition-all"
                      >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-teal-400' : ''}`} />
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setWalletModalOpen(true);
                      }}
                      className="w-full mt-2 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs text-blue-400 hover:text-blue-300 font-semibold rounded-lg border border-darkborder/50 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Wallet className="w-3.5 h-3.5" />
                      <span>Manage Wallet</span>
                    </button>
                  </div>
                </div>

                <nav className="flex flex-col gap-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                            isActive
                              ? 'bg-gradient-to-r from-blue-600/20 to-teal-500/10 border border-blue-500/30 text-white'
                              : 'text-gray-400 hover:text-gray-100 hover:bg-slate-900/30'
                          }`
                        }
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.name}</span>
                      </NavLink>
                    );
                  })}
                </nav>
              </div>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto px-6 py-8 md:px-10 z-10">
        <Outlet />
      </main>

      {/* Wallet Management Modal */}
      <AnimatePresence>
        {walletModalOpen && (
          <>
            {/* Modal Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!walletLoading) {
                  setWalletModalOpen(false);
                  setWalletError('');
                  setWalletSuccess('');
                  setWalletAmount('');
                }
              }}
              className="fixed inset-0 bg-black/80 z-50"
            />
            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 m-auto w-full max-w-md h-fit bg-[#0a0d17] border border-darkborder rounded-3xl p-6 shadow-2xl z-50 overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-blue-500 via-indigo-500 to-teal-500" />
              
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <div className="bg-blue-500/10 p-2 rounded-xl text-blue-400">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-white font-display">Manage Funds</h3>
                </div>
                <button
                  onClick={() => {
                    setWalletModalOpen(false);
                    setWalletError('');
                    setWalletSuccess('');
                    setWalletAmount('');
                  }}
                  disabled={walletLoading}
                  className="p-1.5 hover:bg-slate-800 rounded-xl text-gray-400 hover:text-white transition-all disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Balance card */}
              <div className="bg-slate-900/60 border border-darkborder/50 rounded-2xl p-4 mb-5 text-center">
                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">Available Balance</span>
                <span className="text-3xl font-black text-teal-400 font-display mt-1 block">
                  {formatCurrency(user?.balance)}
                </span>
              </div>

              {walletError && (
                <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 text-red-400 p-3.5 rounded-xl text-xs mb-4">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{walletError}</span>
                </div>
              )}

              {walletSuccess && (
                <div className="flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3.5 rounded-xl text-xs mb-4">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{walletSuccess}</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Transaction Amount ($)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={walletAmount}
                    onChange={(e) => setWalletAmount(e.target.value)}
                    placeholder="Enter amount (e.g. 1000)"
                    disabled={walletLoading}
                    className="w-full bg-[#0d1222]/50 border border-darkborder rounded-xl py-3 px-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <button
                    onClick={() => handleWalletAction('DEPOSIT')}
                    disabled={walletLoading}
                    className="py-3 text-xs font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {walletLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Deposit</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleWalletAction('WITHDRAW')}
                    disabled={walletLoading || !user?.balance || user.balance <= 0}
                    className="py-3 text-xs font-bold rounded-xl text-white bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-500 hover:to-indigo-500 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {walletLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Minus className="w-4 h-4" />
                        <span>Withdraw</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Layout;
