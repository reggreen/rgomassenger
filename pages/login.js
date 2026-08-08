import { useState } from 'react';
import { useAuth, DEMO_ACCOUNTS } from '../context/AuthContext';
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
  ArrowRight,
  LogOut,
  Sparkles
} from 'lucide-react';

export default function LoginPage() {
  const { user, login, register, demoLogin, logout, loading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('login');
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const [message, setMessage] = useState({ type: '', text: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setSubmitting(true);

    if (activeTab === 'login') {
      const res = await login(email, password);
      if (res.success) {
        setMessage({ type: 'success', text: res.message });
        setTimeout(() => {
          router.push('/dashboard');
        }, 1200);
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
        setTimeout(() => {
          router.push('/dashboard');
        }, 1200);
      } else {
        setMessage({ type: 'error', text: res.message });
      }
    }
    setSubmitting(false);
  };

  const fillCredentials = () => {
    setActiveTab('login');
    setEmail('redgreenonline2023@gmail.com');
    setPassword('12345678');
    setMessage({ type: 'success', text: 'সিস্টেম অ্যাডমিন ইমেইল ও পাসওয়ার্ড ফিল করা হয়েছে। "লগইন করুন" প্রেস করুন।' });
  };

  return (
    <div className="flex-1 p-4 md:p-8 max-w-4xl w-full mx-auto flex items-center justify-center">
        
        {/* If user is already logged in */}
        {user?.loggedIn ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center text-4xl mx-auto shadow-xl border-2 border-slate-700">
              {user.avatar_emoji || '🧑‍💻'}
            </div>

            <div className="space-y-1">
              <span className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-emerald-400" />
                <span>লগইন সক্রিয় আছে</span>
              </span>
              <h2 className="text-2xl font-extrabold text-white pt-2">{user.name}</h2>
              <p className="text-xs font-mono text-slate-400">{user.email}</p>
              <p className="text-xs text-blue-400 font-bold">{user.role}</p>
            </div>

            <div className="pt-4 border-t border-slate-800 flex flex-col gap-3">
              <button
                onClick={() => router.push('/profile')}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
              >
                <User className="w-4 h-4" />
                <span>মাই প্রোফাইলে যান</span>
              </button>

              <button
                onClick={logout}
                className="w-full bg-slate-800 hover:bg-slate-700 text-rose-300 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-700"
              >
                <LogOut className="w-4 h-4" />
                <span>সাইন আউট / লগআউট করুন</span>
              </button>
            </div>
          </div>
        ) : (
          /* Login/Register Card */
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative text-slate-100">
            
            {/* Header */}
            <div className="p-6 pb-4 text-center border-b border-slate-800">
              <div className="w-12 h-12 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/10">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-white tracking-tight">
                rgomassenger সিস্টেমে প্রবেশ করুন
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Appwrite ব্যাকএন্ড চালিত সিকিউর অথেন্টিকেশন পোর্টাল
              </p>

              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-[11px] font-mono">
                <span className={`w-2 h-2 rounded-full ${isAppwriteConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-blue-400'}`}></span>
                <span className="text-slate-300">
                  {isAppwriteConfigured ? 'Appwrite Authentication (Live)' : 'Appwrite Local Session Engine'}
                </span>
              </div>
            </div>

            {/* Tab Buttons */}
            <div className="flex border-b border-slate-800 bg-slate-950/40 p-1">
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

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              {/* Toast */}
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

              {/* Name */}
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

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition active:scale-98 disabled:opacity-50"
              >
                {submitting ? (
                  <span className="inline-block animate-spin font-bold">↻</span>
                ) : activeTab === 'login' ? (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>লগইন করুন</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>নতুন অ্যাকাউন্ট রেজিস্টার করুন</span>
                  </>
                )}
              </button>

              {/* Quick Admin Filler */}
              <div className="pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={fillCredentials}
                  className="w-full bg-slate-950 hover:bg-slate-800 border border-slate-800/80 p-2.5 rounded-xl text-center transition flex items-center justify-center gap-2 group"
                >
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-slate-300 group-hover:text-white">
                    সিস্টেম অ্যাডমিন ক্রেডেনশিয়াল ফিল করুন (redgreenonline2023@gmail.com)
                  </span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
  );
}

LoginPage.getLayout = (page) => page;

