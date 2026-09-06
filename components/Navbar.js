import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import LoginModal from './LoginModal';
import {
  LayoutDashboard,
  MessageSquare,
  CreditCard,
  Calendar,
  MessageCircle,
  HelpCircle,
  Bell,
  User,
  LogIn,
  LogOut,
  ChevronDown,
  Layers,
  Users
} from 'lucide-react';

export default function Navbar() {
  const router = useRouter();
  const { user, logout, appLogo } = useAuth();
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  return (
    <>
      <nav className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50 px-4 py-2.5" id="main-navbar">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          
          {/* Brand/Logo pointing to Dashboard */}
          <Link href="/dashboard" className="flex items-center gap-2 group shrink-0">
            {appLogo ? (
              <img
                src={appLogo}
                alt="App Logo"
                className="w-9 h-9 object-contain rounded-xl bg-slate-950 p-0.5 border border-slate-800 shadow-lg shadow-indigo-500/10 group-hover:scale-105 transition-transform duration-200"
              />
            ) : (
              <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white p-2 rounded-xl shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform duration-200">
                <LayoutDashboard className="w-5 h-5" />
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
                rgomassenger
              </span>
              <span className="text-[9px] font-mono text-slate-400 leading-none">Dashboard Control System</span>
            </div>
          </Link>

          {/* Top Quick Actions & User Profile */}
          <div className="flex items-center gap-2">
            
            {/* Live Status Badge */}
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>লাইভ সিস্টেম</span>
            </div>

            {/* Quick Messenger Link */}
            <Link
              href="/"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all duration-200 ${
                router.pathname === '/'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-1 ring-blue-400/50'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-blue-600 hover:text-white border border-slate-700/60'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
              <span>মেসেঞ্জার</span>
            </Link>

            {/* Quick Members Link */}
            <Link
              href="/members"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all duration-200 ${
                router.pathname === '/members'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 ring-1 ring-purple-400/50'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-purple-600 hover:text-white border border-slate-700/60'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-purple-400" />
              <span>মেম্বার</span>
            </Link>

            {/* Quick Tasks Link */}
            <Link
              href="/tasks"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all duration-200 ${
                router.pathname === '/tasks'
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30 ring-1 ring-rose-400/50'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-rose-600 hover:text-white border border-slate-700/60'
              }`}
            >
              <Bell className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden xs:inline">টাস্ক অ্যালার্ট</span>
            </Link>

            {/* Quick Dashboard Link */}
            <Link
              href="/dashboard"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all duration-200 ${
                router.pathname === '/dashboard'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-400/50'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-indigo-600 hover:text-white border border-slate-700/60'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span className="hidden md:inline">ড্যাশবোর্ড</span>
            </Link>

            {/* User Profile / Auth Button */}
            {user?.loggedIn ? (
              <div className="flex items-center gap-1.5 ml-1 pl-2 border-l border-slate-800">
                <Link
                  href="/profile"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-750 text-xs font-semibold text-slate-200 border border-slate-700/80 transition"
                  title="প্রোফাইল দেখুন"
                >
                  {(user.custom_avatar_url || (typeof window !== 'undefined' && localStorage.getItem('rg_custom_avatar_url'))) ? (
                    <img
                      src={user.custom_avatar_url || localStorage.getItem('rg_custom_avatar_url')}
                      alt={user.name}
                      className="w-5 h-5 rounded-full object-cover border border-blue-500/50"
                    />
                  ) : (
                    <span className="text-sm">{user.avatar_emoji || '🧑‍💻'}</span>
                  )}
                  <span className="max-w-[85px] truncate hidden md:inline">{user.name}</span>
                </Link>
                <button
                  onClick={logout}
                  className="p-1.5 rounded-xl bg-slate-800/90 hover:bg-rose-950 hover:text-rose-400 text-slate-400 border border-slate-700/80 transition"
                  title="লগআউট করুন"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsLoginOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-600/20 transition ml-1"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>লগইন</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </>
  );
}
