import { useState, useEffect } from 'react';
import { appwrite as supabase } from '../lib/appwrite';
import { CreditCard, CheckCircle, Clock, Plus, Search, DollarSign, TrendingUp, Sparkles, X, User, ArrowRight, Edit3, Trash2, AlertTriangle } from 'lucide-react';

export default function Billing() {
  const [billingList, setBillingList] = useState([]);
  const [filter, setFilter] = useState('All'); // All, Paid, Unpaid
  const [searchTerm, setSearchTerm] = useState('');
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [editingBillingId, setEditingBillingId] = useState(null);
  const [deletingBillingId, setDeletingBillingId] = useState(null);

  // Form states
  const [memberName, setMemberName] = useState('');
  const [amount, setAmount] = useState('500');
  const [month, setMonth] = useState('জুন ২০২৬');
  const [txId, setTxId] = useState('');
  const [status, setStatus] = useState('Paid');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load and subscribe
  useEffect(() => {
    let active = true;

    const fetchBilling = async () => {
      try {
        const { data, error } = await supabase
          .from('billing')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error(error);
          return;
        }
        if (active && data) {
          setBillingList(data);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchBilling();

    const subscription = supabase
      .channel('public:billing')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'billing' },
        () => {
          fetchBilling(); // Reload list on updates
        }
      )
      .subscribe();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleOpenPayModal = () => {
    setEditingBillingId(null);
    setMemberName('');
    setAmount('500');
    setMonth('জুন ২০২৬');
    setTxId('');
    setStatus('Paid');
    setIsPayModalOpen(true);
  };

  const handleStartEdit = (item) => {
    setEditingBillingId(item.id);
    setMemberName(item.member_name);
    setAmount(item.amount.toString());
    setMonth(item.month);
    setTxId(item.tx_id || '');
    setStatus(item.status || 'Paid');
    setIsPayModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsPayModalOpen(false);
    setEditingBillingId(null);
    setMemberName('');
    setAmount('500');
    setMonth('জুন ২০২৬');
    setTxId('');
    setStatus('Paid');
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    if (!memberName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const billingData = {
      member_name: memberName.trim(),
      amount: parseFloat(amount),
      month: month,
      status: status,
      payment_date: status === 'Paid' ? (editingBillingId ? (billingList.find(b => b.id === editingBillingId)?.payment_date || new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0]) : null,
      tx_id: status === 'Paid' ? txId.trim() : null
    };

    try {
      if (editingBillingId) {
        const { error } = await supabase
          .from('billing')
          .update(billingData)
          .eq('id', editingBillingId);
        
        if (error) {
          console.error(error);
        } else {
          handleCloseModal();
          // reload list is done via subscription, but let's do fallback too
          const { data } = await supabase.from('billing').select('*').order('created_at', { ascending: false });
          if (data) setBillingList(data);
        }
      } else {
        const { error } = await supabase.from('billing').insert(billingData);
        if (error) {
          console.error(error);
        } else {
          handleCloseModal();
          setIsSuccess(true);
          // Hide success banner after 5s
          setTimeout(() => setIsSuccess(false), 5000);
          const { data } = await supabase.from('billing').select('*').order('created_at', { ascending: false });
          if (data) setBillingList(data);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async (id) => {
    try {
      const { error } = await supabase
        .from('billing')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error(error);
      } else {
        setBillingList(prev => prev.filter(item => item.id !== id));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingBillingId(null);
    }
  };

  // Calculations
  const totalCollected = billingList
    .filter(b => b.status === 'Paid')
    .reduce((sum, b) => sum + parseFloat(b.amount || 0), 0);
  
  const unpaidCount = billingList.filter(b => b.status === 'Unpaid').length;
  const paidCount = billingList.filter(b => b.status === 'Paid').length;
  const collectionTarget = 5000; // Mock group target
  const progressPercent = Math.min((totalCollected / collectionTarget) * 100, 100);

  // Filter list
  const filteredBilling = billingList.filter(item => {
    const matchesSearch = item.member_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (item.tx_id && item.tx_id.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (filter === 'All') return matchesSearch;
    return matchesSearch && item.status === filter;
  });

  return (
      <div className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6 bg-slate-900/10" id="billing-container">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-blue-900/40 to-slate-900 border border-blue-900/30 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-400">
            <Sparkles className="w-3.5 h-3.5" />
            কমিউনিটি ফান্ড ও সাবস্ক্রিপশন
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white">বিলিং ও ফান্ড ট্র্যাকিং</h2>
          <p className="text-slate-400 text-sm max-w-2xl">
            গ্রুপের প্রজেক্ট খরচ, সার্ভার বিল ও নিয়মিত ফান্ডিং মনিটর করুন। আপনার অংশ পরিশোধ করুন এবং সম্প্রদায়কে এগিয়ে নিয়ে যান।
          </p>
        </div>

        <button
          onClick={handleOpenPayModal}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-blue-500/15 active:scale-95 transition-all duration-150 flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>পেমেন্ট সাবমিট করুন</span>
        </button>
      </div>

      {/* Success Banner */}
      {isSuccess && (
        <div className="bg-emerald-950/60 border border-emerald-800 text-emerald-300 p-4 rounded-xl flex items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="font-semibold text-sm">পেমেন্ট সফলভাবে জমা হয়েছে!</p>
              <p className="text-xs text-slate-400">আপনার ট্রানজেকশনটি ভেরিফিকেশনের জন্য লেজারে যুক্ত হয়েছে। ধন্যবাদ!</p>
            </div>
          </div>
          <button onClick={() => setIsSuccess(false)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Collected */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 flex items-center justify-between shadow-md">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">সর্বমোট সংগৃহীত ফান্ড</p>
            <h3 className="text-3xl font-extrabold text-emerald-400 font-mono">৳{totalCollected}</h3>
            <p className="text-xs text-slate-500">লক্ষ্যমাত্রা: ৳{collectionTarget}</p>
          </div>
          <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/10 text-emerald-400">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Target Progress Bar */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between shadow-md">
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">মাসিক লক্ষ্য অগ্রগতি</p>
              <span className="text-xs font-bold text-blue-400 font-mono">{progressPercent.toFixed(0)}%</span>
            </div>
            <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden mt-2 border border-slate-800">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-4 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
            ৳৫,০০০ পূর্ণ হলে পরবর্তী হোস্টিং বিল পরিশোধ করা যাবে।
          </p>
        </div>

        {/* Member States count */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 flex items-center justify-between shadow-md">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">সদস্যদের পেমেন্ট স্ট্যাটাস</p>
            <div className="flex gap-4">
              <div>
                <p className="text-xs text-slate-500">পরিশোধিত</p>
                <p className="text-xl font-bold text-white font-mono mt-0.5">{paidCount} জন</p>
              </div>
              <div className="border-r border-slate-800 my-1"></div>
              <div>
                <p className="text-xs text-slate-500">বকেয়া</p>
                <p className="text-xl font-bold text-pink-500 font-mono mt-0.5">{unpaidCount} জন</p>
              </div>
            </div>
          </div>
          <div className="bg-blue-500/10 p-3 rounded-xl border border-blue-500/10 text-blue-400">
            <User className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Ledger Section */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-lg">
        {/* Table controls */}
        <div className="p-5 border-b border-slate-800 bg-slate-900/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex bg-slate-950 border border-slate-800 rounded-xl p-1 w-full md:w-auto">
              {['All', 'Paid', 'Unpaid'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                    filter === tab
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab === 'All' ? 'সব রেকর্ড' : tab === 'Paid' ? 'পরিশোধিত' : 'বকেয়া'}
                </button>
              ))}
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="নাম বা TxID দিয়ে খুঁজুন..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-blue-500 placeholder:text-slate-600"
            />
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-xs uppercase bg-slate-950 text-slate-500 border-b border-slate-800">
              <tr>
                <th className="px-6 py-3.5 font-bold">সদস্যের নাম</th>
                <th className="px-6 py-3.5 font-bold">উদ্দেশ্য / মাস</th>
                <th className="px-6 py-3.5 font-bold">টাকার পরিমাণ</th>
                <th className="px-6 py-3.5 font-bold">স্ট্যাটাস</th>
                <th className="px-6 py-3.5 font-bold">পেমেন্ট তারিখ</th>
                <th className="px-6 py-3.5 font-bold">ট্রানজেকশন ID</th>
                <th className="px-6 py-3.5 font-bold text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredBilling.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-10 text-center text-slate-500">
                    কোনো পেমেন্ট রেকর্ড খুঁজে পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                filteredBilling.map((item) => {
                  if (deletingBillingId === item.id) {
                    return (
                      <tr key={item.id} className="bg-rose-950/20 border-l-2 border-rose-500 animate-in fade-in duration-150">
                        <td colSpan="7" className="px-6 py-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold">
                              <AlertTriangle className="w-4 h-4 animate-bounce" />
                              <span>আপনি কি নিশ্চিতভাবে "{item.member_name}" এর পেমেন্ট রেকর্ডটি মুছে ফেলতে চান?</span>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleDeleteConfirm(item.id)}
                                className="bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg active:scale-95 transition"
                                type="button"
                              >
                                হ্যাঁ, ডিলিট করুন
                              </button>
                              <button
                                onClick={() => setDeletingBillingId(null)}
                                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold px-3 py-1.5 rounded-lg active:scale-95 transition"
                                type="button"
                              >
                                না
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition">
                      <td className="px-6 py-4 font-semibold text-white">{item.member_name}</td>
                      <td className="px-6 py-4 text-slate-400 font-medium">{item.month}</td>
                      <td className="px-6 py-4 font-mono font-bold text-white">৳{item.amount}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          item.status === 'Paid'
                            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                            : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                        }`}>
                          {item.status === 'Paid' ? (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              <span>পরিশোধিত</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" />
                              <span>বকেয়া</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-xs font-mono">{item.payment_date || '—'}</td>
                      <td className="px-6 py-4">
                        {item.tx_id ? (
                          <code className="bg-slate-950 border border-slate-800 px-2 py-1 rounded text-xs font-mono text-blue-400">
                            {item.tx_id}
                          </code>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleStartEdit(item)}
                            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
                            title="সম্পাদনা করুন"
                            type="button"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingBillingId(item.id)}
                            className="p-1.5 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 rounded-lg transition"
                            title="ডিলিট করুন"
                            type="button"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Submit / Edit Modal */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="border-b border-slate-800 p-5 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-2 text-blue-500">
                <CreditCard className="w-5 h-5" />
                <h3 className="text-sm font-bold text-white">
                  {editingBillingId ? 'পেমেন্ট রেকর্ড সম্পাদন করুন' : 'বিকাশ/রকেট/নগদ পেমেন্ট ফর্ম'}
                </h3>
              </div>
              <button 
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handlePaySubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">সদস্যের নাম (যা লেজারে দেখাবে)</label>
                <input
                  type="text"
                  required
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  placeholder="উদা: আসিফ ইকবাল"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">পরিশোধের মাস</label>
                  <select
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="জুন ২০২৬">জুন ২০২৬</option>
                    <option value="জুলাই ২০২৬">জুলাই ২০২৬</option>
                    <option value="আগস্ট ২০২৬">আগস্ট ২০২৬</option>
                    <option value="সাধারণ অনুদান">সাধারণ অনুদান</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">টাকার পরিমাণ (৳)</label>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="৫০০"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">পেমেন্ট স্ট্যাটাস</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Paid">পরিশোধিত (Paid)</option>
                  <option value="Unpaid">বকেয়া (Unpaid)</option>
                </select>
              </div>

              {status === 'Paid' && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">ট্রানজেকশন ID (TxID)</label>
                  <input
                    type="text"
                    required
                    value={txId}
                    onChange={(e) => setTxId(e.target.value)}
                    placeholder=" BK89123M"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-blue-500 uppercase placeholder:normal-case"
                  />
                </div>
              )}

              {status === 'Paid' && (
                <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 text-xs text-slate-500 space-y-1">
                  <p className="font-bold text-slate-400 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-blue-500" />
                    পেমেন্ট পাঠানোর ঠিকানা
                  </p>
                  <p>বিকাশ/রকেট/নগদ (পার্সোনাল): <strong className="text-slate-300 font-mono">01700-000000</strong></p>
                  <p className="text-[10px]">লেনদেন শেষে প্রাপ্ত ট্রানজেকশন আইডি উপরে সাবমিট করুন।</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/10 active:scale-95 transition-all duration-150 flex items-center justify-center gap-2 text-sm"
              >
                {isSubmitting ? 'প্রসেসিং হচ্ছে...' : editingBillingId ? 'রেকর্ড আপডেট করুন' : 'পেমেন্ট ভেরিফাই করুন'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
