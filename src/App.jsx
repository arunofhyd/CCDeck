import React, { useState, useEffect } from 'react';
import { CreditCard, AlertCircle, Calendar, IndianRupee, PieChart, TrendingUp, ShieldCheck, Zap, Loader2, Settings, Pencil, X, Lock, RefreshCcw } from 'lucide-react';

// Hardcoded configurations based on user portfolio
// Added premium abstract textures that blend with the card gradients
const PORTFOLIO = [
  { id: 'amex', name: 'Amex Blue', bank: 'American Express', last4: '2000', limit: 370000, stmtDate: 2, dueDate: 20, feeTarget: 40000, bg: 'bg-gradient-to-br from-blue-600 to-blue-900', image: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=600', logo: 'AMEX' },
  { id: 'millennia', name: 'HDFC Millennia', bank: 'HDFC Bank', last4: '1697', limit: 231000, stmtDate: 6, dueDate: 26, bg: 'bg-gradient-to-br from-indigo-800 to-blue-900', image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600', logo: 'VISA' },
  { id: 'swiggy', name: 'HDFC Swiggy', bank: 'HDFC Bank', last4: '2569', limit: 185000, stmtDate: 6, dueDate: 26, bg: 'bg-gradient-to-br from-orange-500 to-red-600', image: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?auto=format&fit=crop&q=80&w=600', logo: 'MASTERCARD' },
  { id: 'amazon', name: 'Amazon Pay', bank: 'ICICI Bank', last4: '2002', limit: 330000, stmtDate: 12, dueDate: 30, bg: 'bg-gradient-to-br from-amber-500 to-orange-700', image: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&q=80&w=600', logo: 'VISA' },
  { id: 'airtel', name: 'Airtel Axis', bank: 'Axis Bank', last4: '8559', limit: 185000, stmtDate: 12, dueDate: 2, feeTarget: 200000, bg: 'bg-gradient-to-br from-red-600 to-red-900', image: 'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?auto=format&fit=crop&q=80&w=600', logo: 'MASTERCARD' },
  { id: 'onecard', name: 'OneCard BOB', bank: 'BOB', last4: '8697', limit: 300000, stmtDate: 18, dueDate: 4, bg: 'bg-gradient-to-br from-gray-800 to-black', image: 'https://images.unsplash.com/photo-1600607688969-a5bfcd64bd40?auto=format&fit=crop&q=80&w=600', logo: 'VISA' },
  { id: 'mojo', name: 'Kotak Mojo', bank: 'Kotak Bank', last4: '8222', limit: 488000, stmtDate: 20, dueDate: 6, bg: 'bg-gradient-to-br from-red-700 to-rose-900', image: 'https://images.unsplash.com/photo-1557682224-5b8590cd9ec5?auto=format&fit=crop&q=80&w=600', logo: 'VISA' },
  { id: 'tiger', name: 'IndusInd Tiger', bank: 'IndusInd Bank', last4: '6688', limit: 200000, stmtDate: 23, dueDate: 11, bg: 'bg-gradient-to-br from-yellow-700 to-amber-900', image: 'https://images.unsplash.com/photo-1557682260-96773eb01377?auto=format&fit=crop&q=80&w=600', logo: 'VISA' },
  { id: 'ixigo', name: 'AU ixigo', bank: 'AU Small Finance', last4: '1309', limit: 70000, stmtDate: 24, dueDate: 12, bg: 'bg-gradient-to-br from-purple-600 to-purple-900', image: 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80&w=600', logo: 'VISA' }
];

const formatInr = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

const getLastStatementDate = (stmtDay) => {
  const today = new Date();
  let lastStmt = new Date(today.getFullYear(), today.getMonth(), stmtDay);
  if (today.getDate() < stmtDay) {
    lastStmt.setMonth(lastStmt.getMonth() - 1);
  }
  lastStmt.setHours(0, 0, 0, 0);
  return lastStmt;
};

const getDates = (stmtDay, dueDay) => {
  const today = new Date(); 
  let nextStmt = new Date(today.getFullYear(), today.getMonth(), stmtDay);
  if (today.getDate() > stmtDay) {
    nextStmt.setMonth(nextStmt.getMonth() + 1);
  }
  let nextDue = new Date(nextStmt.getFullYear(), nextStmt.getMonth(), dueDay);
  if (dueDay < stmtDay) {
    nextDue.setMonth(nextDue.getMonth() + 1);
  }
  const daysToStmt = Math.ceil((nextStmt - today) / (1000 * 60 * 60 * 24));
  const daysToDue = Math.ceil((nextDue - today) / (1000 * 60 * 60 * 24));

  return { 
    nextStmt: nextStmt.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }), 
    nextDue: nextDue.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }), 
    daysToStmt, daysToDue 
  };
};

export default function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);

  // App State
  const [transactions, setTransactions] = useState([]);
  const [cardSpends, setCardSpends] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [customConfig, setCustomConfig] = useState({});
  const [editingCard, setEditingCard] = useState(null);
  const [editForm, setEditForm] = useState({ limit: 0, balance: 0 });

  // ⚠️ LIVE GOOGLE APPS SCRIPT API LINK ⚠️
  const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzSZk7SCZwdrwokpnjoBREXLwxj3rYUv6mAz-4IJiZhqn7DFDIdftERkfptW1tbkqzy/exec";

  // Check Session Storage for Auth
  useEffect(() => {
    if (sessionStorage.getItem('mycardhub_unlocked') === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // Handle PIN Logic
  const handlePinChange = (e) => {
    const val = e.target.value.replace(/[^0-9]/g, ''); // Only allow numbers
    if (val.length <= 4) {
      setPin(val);
      if (val === '4421') {
        setTimeout(() => {
          sessionStorage.setItem('mycardhub_unlocked', 'true');
          setIsAuthenticated(true);
        }, 300); // Tiny delay for a smooth transition
      } else if (val.length === 4) {
        setPinError(true);
        setTimeout(() => {
          setPin('');
          setPinError(false);
        }, 600);
      }
    }
  };

  // Fetch Data (Only runs when authenticated)
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchLiveData = async () => {
      try {
        if (GOOGLE_APPS_SCRIPT_URL === "YOUR_NEW_WEB_APP_URL_HERE") {
          console.warn("API URL not set. Loading Mock Data instead.");
          setCardSpends({ '2000': 12500, '1697': 45000, '2569': 28000, '2002': 1500, '8559': 14000, '8697': 0, '8222': 5000, '6688': 2000, '1309': 8500 });
          setTransactions([
            { id: 1, date: 'Today, 2:30 PM', merchant: 'Amazon India', amount: 1500, card: '2002' },
            { id: 2, date: 'Today, 10:15 AM', merchant: 'Swiggy Instamart', amount: 840, card: '2569' }
          ]);
          setIsLoading(false);
          return;
        }

        const response = await fetch(GOOGLE_APPS_SCRIPT_URL);
        const data = await response.json();
        
        if (data.settings) setCustomConfig(data.settings);
        
        const currentSpends = {};
        const lastStmtDates = {};

        PORTFOLIO.forEach(card => {
          currentSpends[card.last4] = 0;
          lastStmtDates[card.last4] = getLastStatementDate(card.stmtDate);
        });

        const recentTxs = [];
        const txList = data.transactions || [];
        
        txList.forEach((row, index) => {
          const cardNum = String(row.card);
          const amount = Number(row.amount);
          const txDate = new Date(row.date);

          if (currentSpends[cardNum] !== undefined && lastStmtDates[cardNum] !== undefined) {
            if (txDate >= lastStmtDates[cardNum]) {
              currentSpends[cardNum] += amount;
            }
          }

          if (index < 15) {
            const dateStr = isNaN(txDate) ? row.date : txDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' });
            recentTxs.push({ id: index, date: dateStr, merchant: row.merchant || 'Unknown Merchant', amount: amount, card: cardNum });
          }
        });

        setCardSpends(currentSpends);
        setTransactions(recentTxs);
        setIsLoading(false);

      } catch (error) {
        console.error("Failed to fetch Google Sheet data:", error);
        setIsLoading(false);
      }
    };

    fetchLiveData();
  }, [isAuthenticated]);

  const openEditModal = (card) => {
    const fetchedSpend = cardSpends[card.last4] || 0;
    const currentAdjustment = customConfig[card.last4]?.adjustment || 0;
    const currentLimit = customConfig[card.last4]?.limit || card.limit;
    
    setEditForm({ limit: currentLimit, balance: fetchedSpend + currentAdjustment });
    setEditingCard(card);
  };

  const saveEdit = async () => {
    setIsSaving(true);
    const fetchedSpend = cardSpends[editingCard.last4] || 0;
    const newAdjustment = editForm.balance - fetchedSpend;
    
    const newConfig = { ...customConfig, [editingCard.last4]: { limit: editForm.limit, adjustment: newAdjustment } };
    setCustomConfig(newConfig);

    try {
      await fetch(GOOGLE_APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ card: editingCard.last4, limit: editForm.limit, adjustment: newAdjustment })
      });
    } catch (error) {
      console.error("Failed to cloud-sync settings:", error);
    }

    setIsSaving(false);
    setEditingCard(null);
  };

  const totalLimit = PORTFOLIO.reduce((sum, card) => sum + (customConfig[card.last4]?.limit || card.limit), 0);
  const totalSpent = PORTFOLIO.reduce((sum, card) => {
    const fSpend = cardSpends[card.last4] || 0;
    const adj = customConfig[card.last4]?.adjustment || 0;
    return sum + Math.max(0, fSpend + adj);
  }, 0);

  // ==========================================
  // RENDER LOGIN SCREEN
  // ==========================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 selection:bg-indigo-500/30 relative overflow-hidden">
        {/* Abstract Background Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className={`bg-gray-900/60 backdrop-blur-2xl border border-gray-800/50 p-10 rounded-[2rem] w-full max-w-sm shadow-2xl transition-all duration-300 relative z-10 ${pinError ? 'animate-shake border-rose-500/50 shadow-rose-500/10' : ''}`}>
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-cyan-400 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-6">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-wide">MyCardHub</h1>
            <p className="text-sm text-gray-400 mt-2">Enter Vault Passcode</p>
          </div>

          <div className="flex gap-4 justify-center relative mb-8">
            {/* The 4 Dots indicating PIN entry */}
            {[...Array(4)].map((_, i) => (
              <div 
                key={i} 
                className={`w-4 h-4 rounded-full transition-all duration-300 ${pin.length > i ? 'bg-indigo-400 scale-125 shadow-[0_0_15px_rgba(129,140,248,0.5)]' : 'bg-gray-800'}`} 
              />
            ))}
            
            {/* Invisible Input capturing typing */}
            <input 
              type="tel" 
              maxLength={4} 
              autoFocus 
              className="absolute inset-0 opacity-0 cursor-text w-full h-full z-20" 
              value={pin} 
              onChange={handlePinChange} 
            />
          </div>
          
          <div className="text-center text-xs font-mono text-gray-600">
            {pinError ? <span className="text-rose-400">Incorrect Passcode</span> : 'Encrypted Connection'}
          </div>
        </div>
        
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-5px); }
            40%, 80% { transform: translateX(5px); }
          }
          .animate-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
        `}} />
      </div>
    );
  }

  // ==========================================
  // RENDER MAIN DASHBOARD
  // ==========================================
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-8 font-sans selection:bg-indigo-500/30">
      <header className="max-w-7xl mx-auto mb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400 flex items-center gap-3">
              <ShieldCheck className="text-indigo-500 w-8 h-8" />
              MyCardHub
            </h1>
            <p className="text-gray-400 mt-1">Automated Portfolio Tracking & Analytics</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            disabled={isLoading}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 shadow-lg shadow-indigo-900/20"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />} 
            {isLoading ? 'Syncing...' : 'Sync Emails'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-3 text-gray-400 mb-2">
              <CreditCard className="w-5 h-5" /> Total Credit Line
            </div>
            <div className="text-3xl font-bold text-white">{formatInr(totalLimit)}</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center gap-3 text-gray-400 mb-2">
              <TrendingUp className="w-5 h-5 text-rose-400" /> Current Outstanding
            </div>
            <div className="text-3xl font-bold text-white">
              {isLoading ? '...' : formatInr(totalSpent)}
            </div>
            <div className="absolute bottom-0 left-0 h-1 bg-gray-800 w-full">
              <div className="h-full bg-rose-500 transition-all duration-1000" style={{ width: `${(totalSpent/totalLimit)*100}%` }}></div>
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-3 text-gray-400 mb-2">
              <PieChart className="w-5 h-5 text-emerald-400" /> Overall Utilization
            </div>
            <div className="text-3xl font-bold text-white">
              {isLoading ? '...' : `${((totalSpent / totalLimit) * 100).toFixed(1)}%`}
            </div>
            <p className="text-xs text-gray-500 mt-1">Excellent (Under 30%)</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-indigo-400" /> Active Cards (9)
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PORTFOLIO.map(card => {
              const fetchedSpend = cardSpends[card.last4] || 0;
              const adjustment = customConfig[card.last4]?.adjustment || 0;
              const spent = fetchedSpend + adjustment; 
              const activeLimit = customConfig[card.last4]?.limit || card.limit;
              
              const util = Math.max(0, Math.min(100, (spent / activeLimit) * 100));
              const dates = getDates(card.stmtDate, card.dueDate);
              const isDueSoon = dates.daysToDue <= 7 && spent > 0;

              return (
                <div key={card.id} className="group relative bg-gray-900 border border-gray-800 rounded-2xl p-1 overflow-hidden transition-all hover:border-gray-700 hover:shadow-2xl hover:shadow-indigo-900/10">
                  <div className={`relative h-44 rounded-xl p-5 flex flex-col justify-between overflow-hidden ${card.bg} shadow-inner`}>
                    
                    {/* Fading Premium Card Image Texture */}
                    {card.image && (
                      <div 
                        className="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-20 group-hover:opacity-40 transition-opacity duration-700 pointer-events-none" 
                        style={{ backgroundImage: `url('${card.image}')` }}
                      ></div>
                    )}
                    
                    {/* Dark gradient overlay to ensure text is always readable */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none"></div>
                    
                    <div className="flex justify-between items-start z-10">
                      <div className="text-white/80 font-medium tracking-wider text-sm drop-shadow-md">{card.bank}</div>
                      <div className="font-bold text-white/90 italic tracking-widest drop-shadow-md">{card.logo}</div>
                    </div>
                    <div className="z-10 mt-auto mb-2">
                      <div className="text-white/70 text-xs mb-1 uppercase tracking-widest">Card Number</div>
                      <div className="font-mono text-xl tracking-widest text-white flex gap-3 drop-shadow-md">
                        <span>••••</span><span>••••</span><span>••••</span><span>{card.last4}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 space-y-4 relative">
                    <button 
                      onClick={() => openEditModal(card)}
                      className="absolute top-3 right-3 p-2 text-gray-500 hover:text-indigo-400 hover:bg-gray-800 rounded-lg transition-colors z-20"
                      title="Edit Limit & Balance"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    <div className="flex justify-between items-end pr-8">
                      <div>
                        <div className="text-sm text-gray-400">Current Spend</div>
                        <div className={`text-xl font-semibold ${spent < 0 ? 'text-emerald-400' : 'text-white'}`}>
                          {isLoading ? '...' : formatInr(spent)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Total Limit</div>
                        <div className="text-sm text-gray-300 font-mono">
                          {isLoading ? '...' : formatInr(activeLimit)}
                        </div>
                      </div>
                    </div>

                    <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-1000 ${util > 30 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${util}%` }}></div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-800/50">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <div className="text-xs">
                          <span className="text-gray-400">Stmt: </span>
                          <span className="text-gray-200">{dates.nextStmt} <span className="text-gray-600">({dates.daysToStmt}d)</span></span>
                        </div>
                      </div>
                      <div className={`text-xs flex items-center gap-1.5 px-2 py-1 rounded-md ${isDueSoon ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'text-gray-400'}`}>
                        {isDueSoon && <AlertCircle className="w-3.5 h-3.5" />}
                        Due: {dates.nextDue}
                      </div>
                    </div>

                    {card.feeTarget && (
                      <div className="pt-2">
                        <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                          <span>Fee Waiver Progress</span>
                          <span>{formatInr(Math.max(card.feeTarget - Math.max(0, spent), 0))} to go</span>
                        </div>
                        <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${Math.min((Math.max(0, spent)/card.feeTarget)*100, 100)}%` }}></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-6">
              <IndianRupee className="w-5 h-5 text-emerald-400" /> Recent Parsed Syncs
            </h2>
            
            {isLoading ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              </div>
            ) : transactions.length === 0 ? (
               <div className="text-center py-6 text-gray-500 text-sm">No transactions parsed yet.</div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {transactions.map((tx) => {
                  const cardInfo = PORTFOLIO.find(c => c.last4 === tx.card);
                  const isCredit = tx.amount < 0;
                  return (
                    <div key={tx.id} className="flex justify-between items-center p-3 rounded-xl hover:bg-gray-800/50 transition-colors border border-transparent hover:border-gray-700/50">
                      <div className="flex gap-3 items-center">
                        <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${cardInfo?.bg || 'bg-gray-700'} text-white text-xs font-bold shadow-lg overflow-hidden relative`}>
                          {cardInfo?.image && (
                            <div className="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-40" style={{ backgroundImage: `url('${cardInfo.image}')` }}></div>
                          )}
                          <span className="relative z-10">{tx.card}</span>
                        </div>
                        <div className="overflow-hidden">
                          <div className="font-medium text-gray-200 text-sm truncate w-32 md:w-48">{tx.merchant}</div>
                          <div className="text-xs text-gray-500">{tx.date}</div>
                        </div>
                      </div>
                      <div className={`font-semibold shrink-0 ${isCredit ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isCredit ? '+' : '-'}{formatInr(Math.abs(tx.amount))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/20 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
            <h3 className="font-semibold text-indigo-300 mb-2">Cloud Synced</h3>
            <p className="text-sm text-gray-400 mb-4 leading-relaxed">
              Live sync connected. Any edits to limits and balances are saved permanently to your Google Sheets.
            </p>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-400/10 p-2 rounded-lg border border-emerald-400/20">
              <RefreshCcw className="w-3.5 h-3.5 animate-spin-slow" />
              Connected
            </div>
          </div>
        </div>
      </main>

      {editingCard && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-400" /> 
                Edit {editingCard.name}
              </h3>
              <button disabled={isSaving} onClick={() => setEditingCard(null)} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Total Credit Limit (₹)</label>
                <input 
                  type="number" 
                  value={editForm.limit}
                  onChange={(e) => setEditForm({...editForm, limit: Number(e.target.value)})}
                  className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Current Outstanding Balance (₹)</label>
                <input 
                  type="number" 
                  value={editForm.balance}
                  onChange={(e) => setEditForm({...editForm, balance: Number(e.target.value)})}
                  className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
                <p className="text-xs text-gray-500 mt-2">
                  This balance will be saved to your Google Sheet and synced across all devices.
                </p>
              </div>
            </div>
            
            <div className="mt-8 flex gap-3">
              <button 
                disabled={isSaving}
                onClick={() => setEditingCard(null)}
                className="flex-1 py-3 rounded-xl font-medium text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                disabled={isSaving}
                onClick={saveEdit}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-lg shadow-indigo-900/20 disabled:opacity-75"
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save to Cloud'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #374151; border-radius: 10px; }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow { animation: spin-slow 8s linear infinite; }
      `}} />
    </div>
  );
}
