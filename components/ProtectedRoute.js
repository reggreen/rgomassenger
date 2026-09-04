import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import LoginModal from './LoginModal';
import { Shield, Lock, AlertTriangle, ArrowLeft, User, Zap } from 'lucide-react';

export default function ProtectedRoute({ children, requiredRole = 'member', fallbackTitle = 'অ্যাক্সেস সংরক্ষিত', fallbackMessage = null }) {
  const { user, loading, isAdmin, isModerator, userRole } = useAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3 p-6 text-slate-400">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-mono">পারমিশন ভেরিফাই করা হচ্ছে...</p>
      </div>
    );
  }

  // Check login
  if (!user || !user.loggedIn) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">লগইন প্রয়োজন</h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              এই কমিউনিটি প্যানেল অথবা সংরক্ষিত ফিচারটিতে প্রবেশ করতে আপনাকে লগইন করতে হবে।
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(true)}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/20 transition active:scale-98"
            >
              লগইন অথবা একাউন্ট তৈরি করুন
            </button>
            <Link
              href="/dashboard"
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs rounded-xl transition inline-flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>ড্যাশবোর্ডে ফিরে যান</span>
            </Link>
          </div>

          <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
        </div>
      </div>
    );
  }

  // Verify Role Requirement
  let hasPermission = false;
  if (requiredRole === 'admin') {
    hasPermission = isAdmin;
  } else if (requiredRole === 'moderator') {
    hasPermission = isModerator;
  } else {
    hasPermission = true; // Any logged-in member
  }

  if (!hasPermission) {
    return (
      <div className="min-h-[65vh] flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-lg w-full text-center space-y-6 shadow-2xl relative overflow-hidden">
          {/* Top Decorative Banner */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-500" />

          <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-amber-500/5">
            <Shield className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold rounded-full uppercase tracking-wider">
              {requiredRole === 'admin' ? '👑 অ্যাডমিন রোল আবশ্যক' : '🛡️ মডারেটর রোল আবশ্যক'}
            </span>
            <h2 className="text-xl font-bold text-white">{fallbackTitle}</h2>
            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
              {fallbackMessage || (
                requiredRole === 'admin'
                  ? `এই অ্যাডমিনিস্ট্রেটিভ প্যানেলে প্রবেশ বা পারফর্ম করার অনুমতি আপনার বর্তমান অ্যাকাউন্টের নেই। প্রয়োজনীয় রোল: "অ্যাডমিন" (Admin)।`
                  : `এই প্যানেলটিতে প্রবেশ বা পরিচালনা করার জন্য অন্তত "মডারেটর" (Moderator) রোল পারমিশন প্রয়োজন।`
              )}
            </p>
          </div>

          {/* Role Status Card */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between text-left text-xs">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{user.avatar_emoji || '🧑‍💻'}</span>
              <div>
                <p className="font-bold text-white">{user.name}</p>
                <p className="text-[10px] text-slate-400 font-mono">{user.email}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 block">বর্তমান রোল</span>
              <span className="text-xs font-extrabold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                {user.role || 'সদস্য'}
              </span>
            </div>
          </div>

          {/* Admin Authorization Notice */}
          <div className="pt-2 space-y-3">
            <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-2xl text-left space-y-1.5 text-xs">
              <p className="font-bold text-slate-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                <span>পারমিশন অনুমোদন:</span>
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                এই সেকশনে প্রবেশের জন্য আপনার অ্যাকাউন্টে অ্যাডমিন পারমিশন প্রয়োজন। পারমিশন আপগ্রেডের জন্য চিফ অ্যাডমিন (<span className="text-slate-300 font-mono">redgreenonline2023@gmail.com</span>) এর সাথে যোগাযোগ করুন।
              </p>
            </div>

            <Link
              href="/dashboard"
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs rounded-xl transition inline-flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>ড্যাশবোর্ডে ফিরে যান</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
