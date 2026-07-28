import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { isAppwriteConfigured } from '../lib/appwrite';
import {
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  X,
  CheckCircle,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Zap,
  ArrowRight
} from 'lucide-react';

export default function LoginModal({ isOpen, onClose }) {
  const { login, register, demoLogin, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('login'); // 'login' or 'register'
  const [showPassword, setShowPassword] = useState(false);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  // Status Message
  const [message, setMessage] = useState({ type: '', text: '' });
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setSubmitting(true);

    if (activeTab === 'login') {
      const res = await login(email, password);
      if (res.success) {
        setMessage({ type: 'success', text: res.message });
        setTimeout(() => {
          onClose();
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
          onClose();
        }, 1200);
      } else {
        setMessage({ type: 'error', text: res.message });
      }
    }
    setSubmitting(false);
  };

  const handleDemoClick = (type) => {
    const res = demoLogin(type);
    setMessage({ type: 'success', text: res.message });
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 text-slate-100">
        
        {/* Background Neon Accent */}
        <div className="absolute -right-20 -top-20 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -left-20 -bottom-20 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="p-6 pb-2 text-center border-b border-slate-800/80">
          <div className="w-12 h-12 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/10">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-extrabold text-white tracking-tight">
            rgomassenger-এ লগইন করুন
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            আপনার অ্যাকাউন্ট দিয়ে সাইন-ইন করে রিয়েল-টাইম কমিনিটি সিস্টেমে যোগ দিন
          </p>

          {/* Appwrite Status Badge */}
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-[11px] font-mono">
            <span className={`w-2 h-2 rounded-full ${isAppwriteConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-blue-400'}`}></span>
            <span className="text-slate-300">
              {isAppwriteConfigured ? 'Appwrite Authentication (Live)' : 'Appwrite Local Session (Ready)'}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Toast Message */}
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

          {/* Name Field (Register mode only) */}
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
                  className="w-full bg-slate-950 border border-slate-750 focus:border-blue-500 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white outline-none transition"
                />
              </div>
            </div>
          )}

          {/* Email Field */}
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
                className="w-full bg-slate-950 border border-slate-750 focus:border-blue-500 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white outline-none transition"
              />
            </div>
          </div>

          {/* Password Field */}
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
                className="w-full bg-slate-950 border border-slate-750 focus:border-blue-500 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white outline-none transition"
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

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition active:scale-98 disabled:opacity-50"
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
                <span>নতুন অ্যাকাউন্ট তৈরি করুন</span>
              </>
            )}
          </button>

          {/* Quick Demo Login Divider */}
          <div className="pt-3 border-t border-slate-800">
            <p className="text-[11px] font-bold text-slate-400 text-center mb-2 flex items-center justify-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>১-ক্লিকে ডেমো প্রোফাইলে প্রবেশ করুন</span>
            </p>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleDemoClick('admin')}
                className="bg-slate-950 hover:bg-slate-800 border border-slate-800 p-2 rounded-xl text-center group transition"
              >
                <span className="block text-base">🧑‍💻</span>
                <span className="block text-[10px] font-bold text-blue-400 group-hover:text-white">অ্যাডমিন</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoClick('moderator')}
                className="bg-slate-950 hover:bg-slate-800 border border-slate-800 p-2 rounded-xl text-center group transition"
              >
                <span className="block text-base">🦁</span>
                <span className="block text-[10px] font-bold text-indigo-400 group-hover:text-white">মডারেটর</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoClick('member')}
                className="bg-slate-950 hover:bg-slate-800 border border-slate-800 p-2 rounded-xl text-center group transition"
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
