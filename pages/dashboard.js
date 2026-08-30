import { useState, useEffect } from 'react';
import Link from 'next/link';
import { appwrite as supabase } from '../lib/appwrite';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Bell,
  CreditCard,
  MessageCircle,
  Calendar,
  HelpCircle,
  MessageSquare,
  Clock,
  TrendingUp,
  Plus,
  ArrowRight,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Zap,
  Activity,
  Users,
  ShieldCheck,
  RefreshCw,
  FolderPlus,
  DollarSign,
  Shield,
  Lock,
  UserCheck
} from 'lucide-react';

export default function Dashboard() {
  const { user, isAdmin, isModerator, userRole, demoLogin } = useAuth();
  const [stats, setStats] = useState({
    pendingTasks: 0,
    urgentTasks: 0,
    totalFundAmount: 0,
    paidBillsCount: 0,
    totalMessages: 0,
    totalDiscussions: 0,
    upcomingEvents: 0,
    openSupportTickets: 0
  });

  const [recentTasks, setRecentTasks] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [recentBilling, setRecentBilling] = useState([]);
  const [recentMessages, setRecentMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState('');

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Tasks
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .order('due_date', { ascending: true });

      if (tasksData) {
        const pending = tasksData.filter(t => t.status === 'Pending' || t.status === 'In Progress');
        const urgent = tasksData.filter(t => (t.status === 'Pending' || t.status === 'In Progress') && t.priority === 'জরুরি');
        setStats(prev => ({
          ...prev,
          pendingTasks: pending.length,
          urgentTasks: urgent.length
        }));
        setRecentTasks(tasksData.slice(0, 5));
      }

      // 2. Fetch Billing
      const { data: billingData } = await supabase
        .from('billing')
        .select('*')
        .order('created_at', { ascending: false });

      if (billingData) {
        const paidItems = billingData.filter(b => b.status === 'Paid');
        const totalAmount = paidItems.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
        setStats(prev => ({
          ...prev,
          totalFundAmount: totalAmount,
          paidBillsCount: paidItems.length
        }));
        setRecentBilling(billingData.slice(0, 4));
      }

      // 3. Fetch Messages
      const { data: messagesData } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6);

      if (messagesData) {
        setStats(prev => ({ ...prev, totalMessages: messagesData.length }));
        setRecentMessages(messagesData);
      }

      // 4. Fetch Discussions
      const { data: discussionData } = await supabase
        .from('discussion')
        .select('*');

      if (discussionData) {
        setStats(prev => ({ ...prev, totalDiscussions: discussionData.length }));
      }

      // 5. Fetch Events
      const { data: eventsData } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true });

      if (eventsData) {
        setStats(prev => ({ ...prev, upcomingEvents: eventsData.length }));
        setRecentEvents(eventsData.slice(0, 4));
      }

      // 6. Fetch Support Tickets
      const { data: supportData } = await supabase
        .from('support')
        .select('*');

      if (supportData) {
        const openTickets = supportData.filter(s => s.status === 'উন্মুক্ত' || s.status === 'চলমান');
        setStats(prev => ({ ...prev, openSupportTickets: openTickets.length }));
      }

      setLastRefreshed(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error('Dashboard data load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Subscribe to realtime updates across core tables
    const tasksSub = supabase.channel('dashboard-tasks').on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchDashboardData).subscribe();
    const billingSub = supabase.channel('dashboard-billing').on('postgres_changes', { event: '*', schema: 'public', table: 'billing' }, fetchDashboardData).subscribe();
    const eventsSub = supabase.channel('dashboard-events').on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, fetchDashboardData).subscribe();

    return () => {
      tasksSub.unsubscribe();
      billingSub.unsubscribe();
      eventsSub.unsubscribe();
    };
  }, []);

  const formatBengaliNum = (num) => {
    if (num === undefined || num === null) return '০';
    const bnNums = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(num).split('').map(digit => bnNums[Number(digit)] || digit).join('');
  };

  return (
      <div className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto space-y-6" id="dashboard-main-page">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900/60 via-indigo-900/40 to-slate-900 border border-blue-800/40 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-52 h-52 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-blue-400" />
                লাইভ সিস্টেম
              </span>
              <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                <Activity className="w-3 h-3 text-emerald-400" />
                অবশেষ সিঙ্ক: {lastRefreshed || 'এখনই'}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <LayoutDashboard className="w-7 h-7 text-blue-400" />
              কমিউনিটি ও ড্যাশবোর্ড ওভারভিউ
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              আপনার সমস্ত রিমাইন্ডার, ফান্ড কালেকশন, ইভেন্ট, চ্যাট এবং সাপোর্ট টিকিট এক পলকে ট্র্যাক ও পরিচালনা করুন।
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={fetchDashboardData}
              disabled={loading}
              className="bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/60 text-xs px-3.5 py-2 rounded-xl flex items-center gap-2 font-semibold transition active:scale-95 shadow-md"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${loading ? 'animate-spin' : ''}`} />
              <span>রিফ্রেশ করুন</span>
            </button>
            <Link
              href="/tasks"
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 font-bold transition shadow-lg shadow-blue-600/20 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন টাস্ক</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Role Verification & Access Security Card */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">ইউজার রোল ও সিকিউরিটি লেয়ার</h3>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                  সক্রিয় প্রোটেক্টেড রুট
                </span>
              </div>
              <p className="text-xs text-slate-400">
                আপনার বর্তমান রোল যাচাই করে বিভিন্ন চ্যাট চ্যানেল এবং অ্যাডমিন প্যানেলে প্রবেশাধিকার নির্ধারিত হয়।
              </p>
            </div>
          </div>

          {/* Current User Badge */}
          <div className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800/90 w-full md:w-auto">
            <span className="text-2xl">{user?.avatar_emoji || '🧑‍💻'}</span>
            <div className="min-w-0 pr-2">
              <p className="text-xs font-bold text-white truncate">{user?.name || 'ইউজার'}</p>
              <div className="flex items-center gap-1 mt-0.5">
                {isAdmin ? (
                  <span className="text-[10px] font-extrabold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.2 rounded-full">
                    👑 অ্যাডমিন (Admin)
                  </span>
                ) : isModerator ? (
                  <span className="text-[10px] font-extrabold text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.2 rounded-full">
                    🛡️ মডারেটর (Moderator)
                  </span>
                ) : (
                  <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.2 rounded-full">
                    🚀 সদস্য (Member)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Channel & Panel Permissions Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Item 1: Member Public Channels */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>পাবলিক চ্যাট চ্যানেল</span>
              </span>
              <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-bold">
                উন্মুক্ত
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              #general, #tech-talk, #fun - সকল ভেরিফাইড সদস্যের জন্য উন্মুক্ত।
            </p>
            <div className="pt-1 flex items-center justify-between text-[10px] text-emerald-400 font-bold">
              <span>প্রবেশাধিকার: ✅ অনুমোদিত</span>
              <Link href="/" className="hover:underline text-blue-400">চ্যাটে যান →</Link>
            </div>
          </div>

          {/* Item 2: Moderator Channels */}
          <div className={`p-3.5 rounded-xl border space-y-2 ${
            isModerator
              ? 'bg-indigo-950/20 border-indigo-800/40 text-indigo-200'
              : 'bg-slate-950/30 border-slate-800/50 text-slate-500'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                <span>ঘোষণা ও আপডেট চ্যানেল</span>
              </span>
              <span className="text-[9px] bg-indigo-500/15 text-indigo-300 px-1.5 py-0.5 rounded font-mono font-bold">
                মডারেটর+
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              #announcements - পোস্ট বা প্রকাশের জন্য মডারেটর অথবা অ্যাডমিন রোল আবশ্যক।
            </p>
            <div className="pt-1 flex items-center justify-between text-[10px]">
              {isModerator ? (
                <span className="text-emerald-400 font-bold">প্রবেশাধিকার: ✅ পোস্ট করার অনুমতি আছে</span>
              ) : (
                <span className="text-amber-400 font-bold">প্রবেশাধিকার: 🔒 পোস্ট করতে মডারেটর রোল প্রয়োজন</span>
              )}
            </div>
          </div>

          {/* Item 3: Admin Only Lounge */}
          <div className={`p-3.5 rounded-xl border space-y-2 ${
            isAdmin
              ? 'bg-amber-950/20 border-amber-800/40 text-amber-200'
              : 'bg-slate-950/30 border-slate-800/50 text-slate-500'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>অ্যাডমিন লাউঞ্জ & বিলিং</span>
              </span>
              <span className="text-[9px] bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded font-mono font-bold">
                অ্যাডমিন অনলি
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              #admin-lounge এবং বিলিং/ফান্ডিং প্যানেলে স্পেশাল অ্যাডমিনিস্ট্রেটিভ অ্যাকশন।
            </p>
            <div className="pt-1 flex items-center justify-between text-[10px]">
              {isAdmin ? (
                <span className="text-emerald-400 font-bold">প্রবেশাধিকার: ✅ অ্যাডমিন ফুল কন্ট্রোল</span>
              ) : (
                <span className="text-rose-400 font-bold">প্রবেশাধিকার: 🔐 শুধুমাত্র অ্যাডমিন</span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Demo Role Switcher Bar */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="font-semibold">রোল ভেরিফিকেশন টেস্ট করতে ১-ক্লিকে সুইচ করুন:</span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => demoLogin('admin')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                isAdmin
                  ? 'bg-amber-500 text-slate-950 font-extrabold ring-2 ring-amber-400/50'
                  : 'bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30'
              }`}
            >
              <span>🧑‍💻 অ্যাডমিন</span>
            </button>
            <button
              type="button"
              onClick={() => demoLogin('moderator')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                isModerator && !isAdmin
                  ? 'bg-indigo-600 text-white font-extrabold ring-2 ring-indigo-400/50'
                  : 'bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-indigo-500/30'
              }`}
            >
              <span>🦁 মডারেটর</span>
            </button>
            <button
              type="button"
              onClick={() => demoLogin('member')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                !isModerator
                  ? 'bg-emerald-600 text-white font-extrabold ring-2 ring-emerald-400/50'
                  : 'bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30'
              }`}
            >
              <span>🚀 সদস্য</span>
            </button>
          </div>
        </div>
      </div>

      {/* Core Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Pending Tasks */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">চলমান রিমাইন্ডার</p>
            <div className="bg-amber-500/10 text-amber-400 p-2.5 rounded-xl border border-amber-500/20">
              <Bell className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <h2 className="text-3xl font-extrabold text-white">{formatBengaliNum(stats.pendingTasks)} <span className="text-xs font-normal text-slate-400">টি</span></h2>
            {stats.urgentTasks > 0 && (
              <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] px-2 py-0.5 rounded-full font-bold">
                {formatBengaliNum(stats.urgentTasks)} টি জরুরি
              </span>
            )}
          </div>
          <div className="mt-3 border-t border-slate-800/80 pt-2.5 flex items-center justify-between text-xs text-slate-400">
            <span>সময়মতো এলার্ট নোটিফিকেশন</span>
            <Link href="/tasks" className="text-blue-400 hover:underline font-semibold flex items-center gap-1">
              দেখুন <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Stat 2: Total Fund */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">মোট জমা ফান্ড</p>
            <div className="bg-emerald-500/10 text-emerald-400 p-2.5 rounded-xl border border-emerald-500/20">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <h2 className="text-3xl font-extrabold text-emerald-400">৳ {formatBengaliNum(stats.totalFundAmount)}</h2>
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] px-2 py-0.5 rounded-full font-bold">
              {formatBengaliNum(stats.paidBillsCount)} টি ট্রানজেকশন
            </span>
          </div>
          <div className="mt-3 border-t border-slate-800/80 pt-2.5 flex items-center justify-between text-xs text-slate-400">
            <span>কমিউনিটি বিলিং ও ফান্ড</span>
            <Link href="/billing" className="text-emerald-400 hover:underline font-semibold flex items-center gap-1">
              হিসাব দেখুন <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Stat 3: Upcoming Events */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">আসন্ন ইভেন্টস</p>
            <div className="bg-violet-500/10 text-violet-400 p-2.5 rounded-xl border border-violet-500/20">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <h2 className="text-3xl font-extrabold text-white">{formatBengaliNum(stats.upcomingEvents)} <span className="text-xs font-normal text-slate-400">টি</span></h2>
            <span className="bg-violet-500/10 text-violet-400 border border-violet-500/20 text-[10px] px-2 py-0.5 rounded-full font-bold">
              শিডিউলকৃত
            </span>
          </div>
          <div className="mt-3 border-t border-slate-800/80 pt-2.5 flex items-center justify-between text-xs text-slate-400">
            <span>কমিউনিটি মিটিং ও প্রোগ্রাম</span>
            <Link href="/events" className="text-violet-400 hover:underline font-semibold flex items-center gap-1">
              ক্যালেন্ডার <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Stat 4: Open Support Tickets */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">খোলা হেল্পডেস্ক টিকিট</p>
            <div className="bg-cyan-500/10 text-cyan-400 p-2.5 rounded-xl border border-cyan-500/20">
              <HelpCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <h2 className="text-3xl font-extrabold text-white">{formatBengaliNum(stats.openSupportTickets)} <span className="text-xs font-normal text-slate-400">টি</span></h2>
            <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] px-2 py-0.5 rounded-full font-bold">
              সাপোর্ট প্রয়োজন
            </span>
          </div>
          <div className="mt-3 border-t border-slate-800/80 pt-2.5 flex items-center justify-between text-xs text-slate-400">
            <span>হেল্পডেস্ক টিকিট ও মতামত</span>
            <Link href="/support" className="text-cyan-400 hover:underline font-semibold flex items-center gap-1">
              টিকিট দেখুন <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content Layout (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Urgent & Recent Tasks Widget */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">জরুরি রিমাইন্ডার ও আসন্ন টাস্ক ফিড</h3>
              </div>
              <Link href="/tasks" className="text-xs text-blue-400 hover:underline font-semibold flex items-center gap-1">
                সবগুলো দেখুন <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {recentTasks.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold text-slate-400">কোনো মুলতুবি টাস্ক নেই!</p>
                <p className="text-xs text-slate-500">আপনার নতুন কাজ যুক্ত করতে টাস্ক ম্যানেজারে যান।</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTasks.map((task) => (
                  <div
                    key={task.id}
                    className="bg-slate-950/60 border border-slate-850 hover:border-slate-750 p-3.5 rounded-xl flex items-center justify-between gap-3 transition"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider ${
                          task.priority === 'জরুরি'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : task.priority === 'মাঝারি'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {task.category || 'টাস্ক'}
                        </span>
                        <h4 className="text-sm font-bold text-slate-200 truncate">{task.title}</h4>
                      </div>
                      {task.description && (
                        <p className="text-xs text-slate-400 truncate max-w-md">{task.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right text-xs">
                        <span className="text-slate-400 font-mono text-[11px] block">
                          {new Date(task.due_date).toLocaleDateString()}
                        </span>
                        <span className={`font-semibold text-[10px] ${task.status === 'Completed' ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {task.status === 'Completed' ? 'সম্পন্ন' : 'মুলতুবি'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Billing & Fund Records */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">সাম্প্রতিক ফান্ড ও চাঁদা ট্রানজেকশন</h3>
              </div>
              <Link href="/billing" className="text-xs text-emerald-400 hover:underline font-semibold flex items-center gap-1">
                ফান্ড হিস্ট্রি <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {recentBilling.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                কোনো সাম্প্রতিক বিলিং রেকর্ড নেই।
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentBilling.map((bill) => (
                  <div
                    key={bill.id}
                    className="bg-slate-950/60 border border-slate-850 p-3 rounded-xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                        ৳
                      </div>
                      <div>
                        <p className="font-bold text-slate-200">{bill.member_name || 'সদস্য'}</p>
                        <p className="text-[10px] text-slate-400">{bill.month || 'জমা'} • TxID: {bill.tx_id || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-emerald-400 text-sm">৳ {formatBengaliNum(bill.amount)}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold inline-block ${
                        bill.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        {bill.status === 'Paid' ? 'পরিশোধিত' : 'বকেয়া'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Column (1 Col) */}
        <div className="space-y-6">

          {/* Quick Action Hub */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h3 className="text-base font-bold text-white mb-3.5 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              <span>কুইক একশন হাব</span>
            </h3>

            <div className="grid grid-cols-1 gap-2.5">
              <Link
                href="/tasks"
                className="bg-slate-950/70 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/40 p-3 rounded-xl flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200 group-hover:text-blue-400 transition">নতুন রিমাইন্ডার সেট করুন</p>
                    <p className="text-[10px] text-slate-500">ইমেইল ও অলটার্ট নোটিফিকেশন</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition" />
              </Link>

              <Link
                href="/billing"
                className="bg-slate-950/70 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 p-3 rounded-xl flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200 group-hover:text-emerald-400 transition">বিলিং বা ফান্ড তথ্য দিন</p>
                    <p className="text-[10px] text-slate-500">বিকাশ/নগদ চাঁদা রেকর্ড</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition" />
              </Link>

              <Link
                href="/"
                className="bg-slate-950/70 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/40 p-3 rounded-xl flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200 group-hover:text-indigo-400 transition">চ্যাট রুমে মেসেজ দিন</p>
                    <p className="text-[10px] text-slate-500">রিয়েল-টাইম লাইভ চ্যাটিং</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition" />
              </Link>

              <Link
                href="/discussion"
                className="bg-slate-950/70 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/40 p-3 rounded-xl flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200 group-hover:text-purple-400 transition">ফোরামে আলোচনা পোস্ট করুন</p>
                    <p className="text-[10px] text-slate-500">কমিউনিটি ডিসকাশন বোর্ড</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-0.5 transition" />
              </Link>

              <Link
                href="/events"
                className="bg-slate-950/70 hover:bg-slate-800 border border-slate-800 hover:border-violet-500/40 p-3 rounded-xl flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200 group-hover:text-violet-400 transition">নতুন ইভেন্ট শিডিউল করুন</p>
                    <p className="text-[10px] text-slate-500">অনলাইন/অফলাইন ইভেন্ট</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-violet-400 group-hover:translate-x-0.5 transition" />
              </Link>
            </div>
          </div>

          {/* Upcoming Events Preview */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-violet-400" />
                <h3 className="text-base font-bold text-white">আসন্ন প্রোগ্রাম ও মিটিং</h3>
              </div>
              <Link href="/events" className="text-xs text-violet-400 hover:underline font-semibold">
                সবগুলো
              </Link>
            </div>

            {recentEvents.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">কোনো ইভেন্ট নেই</p>
            ) : (
              <div className="space-y-2.5">
                {recentEvents.map((evt) => (
                  <div key={evt.id} className="bg-slate-950/60 border border-slate-850 p-3 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-slate-200 truncate">{evt.title}</p>
                      <span className="text-[10px] text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded font-mono">
                        {evt.location || 'অনলাইন'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono">
                      📅 {new Date(evt.date).toLocaleDateString()} • {new Date(evt.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Database & Sync Status Box */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-4 text-xs space-y-2.5">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>সুপাবেস ডাটাবেস রিয়েল-টাইম সক্রিয়</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              আপনার সমস্ত ডাটাবেস আপডেট এবং রিমাইন্ডার ব্যাকগ্রাউন্ডে রিয়েল-টাইমে সিঙ্ক হচ্ছে।
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
