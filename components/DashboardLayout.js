import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { appwrite as supabase } from '../lib/appwrite';
import { useAuth, isChiefAdminEmail } from '../context/AuthContext';
import {
  LayoutDashboard,
  MessageSquare,
  Bell,
  CreditCard,
  MessageCircle,
  Calendar,
  HelpCircle,
  Menu,
  X,
  ChevronRight,
  ChevronLeft,
  User,
  LogOut,
  Shield,
  Layers,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const { user, logout, appLogo } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [counts, setCounts] = useState({
    pendingTasks: 0,
    openTickets: 0
  });

  useEffect(() => {
    // Fetch quick notification badges
    const fetchBadges = async () => {
      try {
        const { data: tasks } = await supabase
          .from('tasks')
          .select('id, status')
          .or('status.eq.Pending,status.eq.In Progress');
        
        const { data: support } = await supabase
          .from('support')
          .select('id, status')
          .or('status.eq.উন্মুক্ত,status.eq.চলমান');

        setCounts({
          pendingTasks: tasks?.length || 0,
          openTickets: support?.length || 0
        });
      } catch (err) {
        console.error('Badge load error:', err);
      }
    };

    fetchBadges();
  }, []);

  // Auto close mobile drawer on route navigation
  useEffect(() => {
    setIsMobileOpen(false);
  }, [router.pathname]);

  // Keyboard navigation listener (Escape key to close mobile drawer)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key === 'Escape' && isMobileOpen) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isMobileOpen]);

  // Handle arrow key navigation between menu items
  const handleNavKeyDown = (e, index) => {
    const navLinks = document.querySelectorAll('#dashboard-sidebar-nav a');
    if (!navLinks.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (index + 1) % navLinks.length;
      navLinks[nextIndex]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (index - 1 + navLinks.length) % navLinks.length;
      navLinks[prevIndex]?.focus();
    }
  };

  const navSections = [
    {
      title: '⚡ মূল ফিচারসমূহ (Core Focus)',
      items: [
        { name: 'লাইভ মেসেঞ্জার (Messenger)', href: '/', icon: MessageSquare, badge: 'Live', badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
        { name: 'মেম্বার ও গ্রুপ (Members)', href: '/members', icon: Users, badge: null },
        { name: 'টাস্ক ও অ্যালার্ম অ্যালার্ট', href: '/tasks', icon: Bell, badge: counts.pendingTasks > 0 ? `${counts.pendingTasks}` : null, badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
        { name: 'ড্যাশবোর্ড ওভারভিউ', href: '/dashboard', icon: LayoutDashboard, badge: null },
        { name: 'আমার প্রোফাইল', href: '/profile', icon: User, badge: null },
      ]
    },
    {
      title: '🛠️ অন্যান্য অপশনাল মডিউল (Optional)',
      items: [
        { name: 'ফোরাম ও ডিসকাশন', href: '/discussion', icon: MessageCircle, badge: null },
        { name: 'ইভেন্টস ক্যালেন্ডার', href: '/events', icon: Calendar, badge: null },
        { name: 'বিলিং ও ক্যাশ ফান্ড', href: '/billing', icon: CreditCard, badge: null },
        { name: 'হেল্পডেস্ক সাপোর্ট', href: '/support', icon: HelpCircle, badge: counts.openTickets > 0 ? `${counts.openTickets}` : null, badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
      ]
    },
    {
      title: '🔐 এডমিনিস্ট্রেশন & গার্ড',
      items: [
        { name: 'অ্যাডমিন প্যানেল', href: '/admin', icon: Shield, badge: 'গার্ড', badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
      ]
    },
    {
      title: '👤 অ্যাকাউন্ট',
      items: [
        { name: 'মাই প্রোফাইল', href: '/profile', icon: User, badge: null },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row relative">
      
      {/* Mobile Top Header with Sidemenu Hamburger Toggle Button */}
      <div className="lg:hidden bg-slate-900/95 border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-12 z-30 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="p-2 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-xl border border-blue-500/30 transition active:scale-95 flex items-center gap-1.5 text-xs font-bold"
            aria-label="সাইডবার মেনু টগল করুন"
          >
            {isMobileOpen ? <X className="w-5 h-5 text-rose-400" /> : <Menu className="w-5 h-5" />}
            <span>সাইডবার মেনু</span>
          </button>
        </div>

        <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
          <Layers className="w-3 h-3 text-blue-400" />
          <span>rgomassenger Control</span>
        </span>
      </div>

      {/* Backdrop overlay for mobile drawer if toggled */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Improved Sidemenu Navigation */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 lg:z-30 h-screen bg-slate-900/95 backdrop-blur-md border-r border-slate-800 flex flex-col justify-between transition-all duration-300 ${
          isMobileOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
        id="dashboard-sidebar"
      >
        {/* Top Header/Brand */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between gap-2">
          <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
            {appLogo ? (
              <img
                src={appLogo}
                alt="App Logo"
                className="w-9 h-9 object-contain rounded-xl bg-slate-950 p-0.5 border border-slate-800 shadow-lg shadow-indigo-500/10 flex-shrink-0"
              />
            ) : (
              <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white p-2.5 rounded-xl shadow-lg shadow-blue-600/20 flex-shrink-0">
                <LayoutDashboard className="w-5 h-5" />
              </div>
            )}
            {(!isCollapsed || isMobileOpen) && (
              <div className="min-w-0">
                <span className="font-extrabold text-base tracking-tight text-white block truncate">
                  rgomassenger
                </span>
                <span className="text-[10px] text-blue-400 font-mono bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                  Control Panel v2.5
                </span>
              </div>
            )}
          </Link>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg border border-slate-700/60 transition"
            title={isCollapsed ? "সাইডবার প্রসারিত করুন" : "সাইডবার ছোট করুন"}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Scrollable Nav List */}
        <nav
          id="dashboard-sidebar-nav"
          aria-label="সাইডবার নেভিগেশন"
          className="flex-1 overflow-y-auto px-3 py-4 space-y-6 custom-scrollbar"
        >
          {(() => {
            let itemIndex = 0;
            return navSections.map((section, idx) => (
              <div key={idx} className="space-y-1.5" role="group" aria-label={section.title}>
                {(!isCollapsed || isMobileOpen) && (
                  <p className="px-3 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span>{section.title}</span>
                  </p>
                )}
                <div className="space-y-1" role="menu">
                  {section.items.map((item) => {
                    const currentIndex = itemIndex++;
                    const Icon = item.icon;
                    const isActive = router.pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        role="menuitem"
                        tabIndex={0}
                        aria-current={isActive ? 'page' : undefined}
                        onKeyDown={(e) => handleNavKeyDown(e, currentIndex)}
                        title={isCollapsed ? item.name : undefined}
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 relative group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus:bg-slate-800 ${
                          isActive
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/25 ring-1 ring-blue-400/30'
                            : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                        }`}
                      >
                        <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'}`} />
                        {(!isCollapsed || isMobileOpen) && (
                          <span className="truncate flex-1">{item.name}</span>
                        )}
                        
                        {item.badge && (!isCollapsed || isMobileOpen) && (
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${item.badgeColor || 'bg-blue-500/20 text-blue-300 border-blue-500/30'}`}>
                            {item.badge}
                          </span>
                        )}

                        {/* Active indicator bar */}
                        {isActive && (
                          <span className="absolute left-0 top-2 bottom-2 w-1 bg-white rounded-r-full" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ));
          })()}
        </nav>

        {/* Bottom Sidebar User Info & Status Card */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/60">
          {(!isCollapsed || isMobileOpen) ? (
            <div className="space-y-2">
              {/* Logged in User snippet */}
              {user?.loggedIn && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    {(user.custom_avatar_url || (typeof window !== 'undefined' && localStorage.getItem('rg_custom_avatar_url'))) ? (
                      <img
                        src={user.custom_avatar_url || localStorage.getItem('rg_custom_avatar_url')}
                        alt={user.name}
                        className="w-8 h-8 rounded-xl object-cover border border-blue-500/50 shadow flex-shrink-0"
                      />
                    ) : (
                      <span className="text-xl p-1 bg-slate-800 rounded-lg">{user.avatar_emoji || '🧑‍💻'}</span>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-white truncate">{user.name}</p>
                      </div>
                      <p className="text-[10px] font-mono truncate flex items-center gap-1">
                        {isChiefAdminEmail(user.email) || (user.role || '').includes('অ্যাডমিন') ? (
                          <span className="text-amber-400 font-bold bg-amber-500/10 px-1 rounded border border-amber-500/20">👑 অ্যাডমিন</span>
                        ) : (user.role || '').includes('মডারেটর') ? (
                          <span className="text-indigo-300 font-bold bg-indigo-500/10 px-1 rounded border border-indigo-500/20">🛡️ মডারেটর</span>
                        ) : (
                          <span className="text-emerald-400 font-medium bg-emerald-500/10 px-1 rounded border border-emerald-500/20">🚀 মেম্বার</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={logout}
                    className="p-1.5 hover:bg-rose-950 text-slate-400 hover:text-rose-400 rounded-lg transition"
                    title="লগআউট"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-[11px]">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>সুপাবেস সিস্টেম সিঙ্কড</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-1 text-emerald-400" title="সুপাবেস অনলাইন">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Body */}
      <div className="flex-1 min-w-0 flex flex-col">
        {children}
      </div>
    </div>
  );
}
