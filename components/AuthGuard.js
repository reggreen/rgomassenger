import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import { isAppwriteConfigured } from '../lib/appwrite';
import {
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  Zap,
  MessageSquare,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export default function AuthGuard({ children }) {
  const { user, loading, login, register, demoLogin } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('login');
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const [message, setMessage] = useState({ type: '', text: '' });
  const [submitting, setSubmitting] = useState(false);

  // Allow public access to /login if needed, but AuthGuard locks everything
  const publicRoutes = ['/login'];
  const isPublicRoute = publicRoutes.includes(router.pathname);

  // Loading state while checking session
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="relative flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-blue-600/20 border-2 border-blue-500 rounded-2xl flex items-center justify-center text-blue-400 animate-pulse shadow-xl shadow-blue-500/20">
            <MessageSquare className="w-8 h-8" />
          </div>
          <div className="flex items-center gap-2 text-slate-300 text-sm font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping"></span>
            <span>অকাউন্ট সিকিউরিটি ভেরিফাই করা হচ্ছে...</span>
          </div>
        </div>
      </div>
    );
  }

  // If user is logged in or route is public, render app
  if (user?.loggedIn || isPublicRoute) {
    return children;
  }

  // Handle Forced Login Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setSubmitting(true);

    if (activeTab === 'login') {
      const res = await login(email, password);
      if (res.success) {
        setMessage({ type: 'success', text: res.message });
        router.push('/dashboard');
      } else {
        setMessage({ type: 'error', text: res.message });
      }
    } else {
      if (!name) {
        setMessage({ type: 'error', text: 'আপনার নাম প্রদান করুন' });
        setSubmitting(false);
        return;
      }
      const res = await register(name, email, password);
      if (res.success) {
        setMessage({ type: 'success', text: res.message });
        router.push('/dashboard');
      } else {
        setMessage({ type: 'error', text: res.message });
      }
    }
    setSubmitting(false);
  };

  const fillCredentials = (type) => {
    setActiveTab('login');
    if (type === 'admin') {
      setEmail('redgreenonline2023@gmail.com');
      setPassword('12345678');
      setMessage({ type: 'success', text: 'অ্যাডমিন ইমেইল ও পাসওয়ার্ড ফিল করা হয়েছে। প্রবেশ করতে "অ্যাকাউন্টে প্রবেশ করুন" বাটনে ক্লিক করুন।' });
    } else if (type === 'moderator') {
      setEmail('saiful.mod@rgomassenger.com');
      setPassword('12345678');
      setMessage({ type: 'success', text: 'মডারেটর ইমেইল ও পাসওয়ার্ড ফিল করা হয়েছে। প্রবেশ করতে "অ্যাকাউন্টে প্রবেশ করুন" বাটনে ক্লিক করুন।' });
    } else {
      setEmail('asif.member@rgomassenger.com');
      setPassword('12345678');
      setMessage({ type: 'success', text: 'সদস্য ইমেইল ও পাসওয়ার্ড ফিল করা হয়েছে। প্রবেশ করতে "অ্যাকাউন্টে প্রবেশ করুন" বাটনে ক্লিক করুন।' });
    }
  };

  // Render Forced Auth Lock Screen
  return (
    <div className="min-h-[85vh] flex-1 flex items-center justify-center p-4 bg-slate-950 text-slate-100">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
        
        {/* Glow Effects */}
        <div className="absolute -right-20 -top-20 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -left-20 -bottom-20 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Forced Lock Header */}
        <div className="p-6 pb-4 text-center border-b border-slate-800/80 bg-slate-900/90">
          <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/20 border border-blue-400/30">
            <Lock className="w-7 h-7" />
          </div>
          <span className="inline-block px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] font-extrabold uppercase tracking-wider mb-2">
            🔒 Forced Auth Guard (প্রবেশ সংরক্ষিত)
          </span>
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            rgomassenger-এ লগইন আবশ্যক
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            অ্যাপটি ব্যবহারের জন্য প্রথমে আপনার অ্যাকাউন্টে সাইন-ইন বা রেজিস্টার করুন
          </p>

          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-[11px] font-mono">
            <span className={`w-2 h-2 rounded-full ${isAppwriteConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-blue-400'}`}></span>
            <span className="text-slate-300">
              {isAppwriteConfigured ? 'Appwrite Authentication (Live)' : 'Appwrite Local Auth Active'}
            </span>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 p-1">
          <button
            onClick={() => { setActiveTab('login'); setMessage({ type: '', text: '' }); }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition ${
              activeTab === 'login'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>লগইন (Login)</span>
          </button>
          <button
            onClick={() => { setActiveTab('register'); setMessage({ type: '', text: '' }); }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition ${
              activeTab === 'register'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>রেজিস্ট্রেশন (Register)</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Toast Notification */}
          {message.text && (
            <div className={`p-3 rounded-2xl text-xs font-medium flex items-center gap-2 border ${
              message.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}>
              {message.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{message.text}</span>
            </div>
          )}

          {/* Full Name for Registration */}
          {activeTab === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">আপনার পূর্ণ নাম (Full Name)</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  placeholder="যেমন: সাইদুল ইসলাম"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-750 focus:border-blue-500 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white outline-none"
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">ইমেইল ঠিকানা (Email)</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                placeholder="redgreenonline2023@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-750 focus:border-blue-500 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white outline-none"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">পাসওয়ার্ড (Password)</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-750 focus:border-blue-500 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition active:scale-98 disabled:opacity-50"
          >
            {submitting ? (
              <span className="inline-block animate-spin font-bold">↻</span>
            ) : activeTab === 'login' ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>অ্যাকাউন্টে প্রবেশ করুন</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>নতুন অ্যাকাউন্ট রেজিস্টার করুন</span>
              </>
            )}
          </button>

          {/* Quick Demo Credential Filler */}
          <div className="pt-3 border-t border-slate-800">
            <p className="text-[11px] font-bold text-slate-400 text-center mb-2 flex items-center justify-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>টেস্ট অ্যাকাউন্টের তথ্য ফিল করুন (লগইন বাটন প্রেস করতে হবে)</span>
            </p>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillCredentials('admin')}
                className="bg-slate-950 hover:bg-slate-800 border border-slate-800 p-2 rounded-xl text-center group transition"
                title="অ্যাডমিন ক্রেডেনশিয়াল ইনপুট বক্সে ফিল করুন"
              >
                <span className="block text-base">🧑‍💻</span>
                <span className="block text-[10px] font-bold text-blue-400 group-hover:text-white">অ্যাডমিন</span>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('moderator')}
                className="bg-slate-950 hover:bg-slate-800 border border-slate-800 p-2 rounded-xl text-center group transition"
                title="মডারেটর ক্রেডেনশিয়াল ইনপুট বক্সে ফিল করুন"
              >
                <span className="block text-base">🦁</span>
                <span className="block text-[10px] font-bold text-indigo-400 group-hover:text-white">মডারেটর</span>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('member')}
                className="bg-slate-950 hover:bg-slate-800 border border-slate-800 p-2 rounded-xl text-center group transition"
                title="সদস্য ক্রেডেনশিয়াল ইনপুট বক্সে ফিল করুন"
              >
                <span className="block text-base">🚀</span>
                <span className="block text-[10px] font-bold text-emerald-400 group-hover:text-white">সদস্য</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
