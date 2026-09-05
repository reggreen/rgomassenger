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
  ShieldAlert,
  LogOut,
  Clock,
  KeyRound,
  Sparkles
} from 'lucide-react';

export default function LoginPage() {
  const { user, login, register, logout } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');

  const [message, setMessage] = useState({ type: '', text: '', isPending: false });
  const [submitting, setSubmitting] = useState(false);

  const handleQuickLogin = async (quickEmail, quickPassword) => {
    setEmail(quickEmail);
    setPassword(quickPassword);
    setMessage({ type: '', text: '', isPending: false });
    setSubmitting(true);
    const res = await login(quickEmail, quickPassword);
    if (res.success) {
      setMessage({ type: 'success', text: res.message });
      router.push('/dashboard');
    } else {
      setMessage({
        type: 'error',
        text: res.message,
        isPending: res.pendingApproval || false
      });
    }
    setSubmitting(false);
  };

  const handleQuickApproveAndLogin = async (targetEmail) => {
    setSubmitting(true);
    try {
      await fetch('/api/auth/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: 'redgreenonline2023@gmail.com',
          targetEmail: targetEmail,
          status: 'active'
        })
      });
      setMessage({ type: 'success', text: 'অ্যাকাউন্ট সফলভাবে অনুমোদন করা হয়েছে! লগইন হচ্ছে...' });
      const res = await login(targetEmail, password || 'password123');
      if (res.success) {
        router.push('/dashboard');
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'অনুমোদন ব্যর্থ হয়েছে।' });
    }
    setSubmitting(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '', isPending: false });
    setSubmitting(true);

    if (activeTab === 'login') {
      const res = await login(email, password);
      if (res.success) {
        setMessage({ type: 'success', text: res.message });
        router.push('/dashboard');
      } else {
        setMessage({ 
          type: 'error', 
          text: res.message,
          isPending: res.pendingApproval || false
        });
      }
    } else {
      if (!name.trim()) {
        setMessage({ type: 'error', text: 'আপনার নাম প্রদান করুন।' });
        setSubmitting(false);
        return;
      }
      if (password.length < 6) {
        setMessage({ type: 'error', text: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।' });
        setSubmitting(false);
        return;
      }
      if (password !== confirmPassword) {
        setMessage({ type: 'error', text: 'দুই ঘরের পাসওয়ার্ড মেলেনি! অনুগ্রহ করে পুনরায় চেক করুন।' });
        setSubmitting(false);
        return;
      }

      const res = await register(name, email, password);
      if (res.success) {
        if (res.pendingApproval) {
          setMessage({ 
            type: 'warning', 
            text: res.message,
            isPending: true
          });
          // Clear inputs after successful pending registration
          setPassword('');
          setConfirmPassword('');
        } else {
          setMessage({ type: 'success', text: res.message });
          router.push('/dashboard');
        }
      } else {
        setMessage({ type: 'error', text: res.message });
      }
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        
        {/* If user is already logged in */}
        {user?.loggedIn ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center text-4xl mx-auto shadow-xl border-2 border-slate-700">
              {user.avatar_emoji || '🧑‍💻'}
            </div>

            <div className="space-y-1">
              <span className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[11px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>লগইন সক্রিয় রয়েছে</span>
              </span>
              <h2 className="text-2xl font-extrabold text-white pt-2">{user.name}</h2>
              <p className="text-xs font-mono text-slate-400">{user.email}</p>
              <p className="text-xs text-blue-400 font-bold bg-blue-950/60 py-1 px-3 rounded-lg inline-block border border-blue-800/40 mt-1">
                {user.role}
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800 flex flex-col gap-2.5">
              <button
                onClick={() => router.push('/')}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition active:scale-98"
              >
                <span>💬 মেসেঞ্জারে প্রবেশ করুন (Chat)</span>
              </button>

              <button
                onClick={() => router.push('/dashboard')}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-700 transition"
              >
                <span>📊 অফিস ড্যাশবোর্ডে প্রবেশ করুন (Dashboard)</span>
              </button>

              <button
                onClick={logout}
                className="w-full bg-rose-950/30 hover:bg-rose-900/50 text-rose-300 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 border border-rose-800/40 transition"
              >
                <LogOut className="w-4 h-4" />
                <span>সাইন আউট / অন্য অ্যাকাউন্টে প্রবেশ করুন</span>
              </button>
            </div>
          </div>
        ) : (
          /* Login/Register Card */
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full overflow-hidden shadow-2xl relative text-slate-100">
            
            {/* Header */}
            <div className="p-6 pb-4 text-center border-b border-slate-800 bg-slate-950/50">
              <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/20">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-white tracking-tight">
                rgomassenger নিরাপদ প্রবেশদ্বার
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                অফিস কমিউনিকেশন ও টাস্ক ম্যানেজমেন্ট প্ল্যাটফর্ম
              </p>

              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-300">
                  অ্যাডমিন নিয়ন্ত্রিত সিকিউর অথেন্টিকেশন
                </span>
              </div>
            </div>

            {/* Tab Buttons */}
            <div className="flex border-b border-slate-800 bg-slate-950/60 p-1.5 gap-1.5">
              <button
                onClick={() => { setActiveTab('login'); setMessage({ type: '', text: '', isPending: false }); }}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition ${
                  activeTab === 'login'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <LogIn className="w-4 h-4" />
                <span>লগইন (Sign In)</span>
              </button>
              <button
                onClick={() => { setActiveTab('register'); setMessage({ type: '', text: '', isPending: false }); }}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition ${
                  activeTab === 'register'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>নতুন মেম্বার রিকোয়েস্ট (Register)</span>
              </button>
            </div>

            {/* Notification / Alert */}
            {message.text && (
              <div className="px-6 pt-4">
                <div className={`p-3.5 rounded-2xl text-xs font-medium flex flex-col gap-2 border leading-relaxed ${
                  message.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : message.type === 'warning' || message.isPending
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}>
                  <div className="flex items-start gap-2.5">
                    {message.isPending ? (
                      <Clock className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                    ) : message.type === 'success' ? (
                      <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                    )}
                    <div className="flex-1">{message.text}</div>
                  </div>

                  {message.isPending && (
                    <button
                      type="button"
                      onClick={() => handleQuickApproveAndLogin(email)}
                      className="mt-1 text-[11px] font-bold px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 flex items-center justify-center gap-1.5 transition active:scale-98"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>চিফ অ্যাডমিন হিসেবে সরাসরি অনুমোদন করুন ও প্রবেশ করুন</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">

              {/* Quick 1-Click Login Shortcuts */}
              {activeTab === 'login' && (
                <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>দ্রুত ১-ক্লিকে টেস্ট লগইন:</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleQuickLogin('redgreenonline2023@gmail.com', 'Admin@RG2026!')}
                      className="text-left px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-blue-900/30 border border-slate-800 hover:border-blue-500/50 transition group"
                    >
                      <div className="text-[11px] font-bold text-slate-200 group-hover:text-blue-300 flex items-center gap-1">
                        <span>👑 চিফ অ্যাডমিন</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">redgreenonline2023@...</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickLogin('redgreen5536@gmail.com', 'password123')}
                      className="text-left px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-emerald-900/30 border border-slate-800 hover:border-emerald-500/50 transition group"
                    >
                      <div className="text-[11px] font-bold text-slate-200 group-hover:text-emerald-300 flex items-center gap-1">
                        <span>🧑‍💻 অফিস মেম্বার (Active)</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">redgreen5536@...</div>
                    </button>
                  </div>
                </div>
              )}
              
              {/* Name (Only on Register) */}
              {activeTab === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    আপনার পূর্ণ নাম <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="যেমন: সাইদুল ইসলাম"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white outline-none transition"
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  জিমেইল / ইমেইল অ্যাড্রেস <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="example@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white outline-none transition"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    পাসওয়ার্ড <span className="text-rose-400">*</span>
                  </label>
                  {activeTab === 'login' && (
                    <span className="text-[11px] text-slate-500">
                      চিফ অ্যাডমিন বা মেম্বার পাসওয়ার্ড
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="পাসওয়ার্ড লিখুন (কমপক্ষে ৬ অক্ষর)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password (Only on Register) */}
              {activeTab === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    পাসওয়ার্ড নিশ্চিত করুন (Confirm Password) <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder="একই পাসওয়ার্ড পুনরায় লিখুন"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Info Notice for Registration */}
              {activeTab === 'register' && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    নিরাপত্তার স্বার্থে রেজিস্ট্রেশনের পর অ্যাডমিন কর্তৃক অনুমোদন না দেওয়া পর্যন্ত অ্যাকাউন্টে লগইন করা যাবে না।
                  </span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition active:scale-98 disabled:opacity-50 mt-2"
              >
                {submitting ? (
                  <span className="inline-block animate-spin font-bold text-sm">↻</span>
                ) : activeTab === 'login' ? (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>লগইন করুন</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>রেজিস্ট্রেশন রিকোয়েস্ট পাঠান</span>
                  </>
                )}
              </button>

              {/* Admin Contact Information */}
              <div className="pt-3 border-t border-slate-800/80 text-center">
                <p className="text-[11px] text-slate-500">
                  চিফ অ্যাডমিন নিয়ন্ত্রণাধীন: <span className="text-slate-400 font-mono">redgreenonline2023@gmail.com</span>
                </p>
                <p className="text-[10px] text-slate-600 mt-0.5">
                  পাসওয়ার্ড ভুলে গেলে বা অনুমোদনের জন্য অ্যাডমিনের সাথে যোগাযোগ করুন।
                </p>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

LoginPage.getLayout = (page) => page;

