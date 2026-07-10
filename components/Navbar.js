import Link from 'next/link';
import { useRouter } from 'next/router';
import { MessageSquare, CreditCard, Calendar, MessageCircle, HelpCircle, Bell } from 'lucide-react';

export default function Navbar() {
  const router = useRouter();

  const navItems = [
    { name: 'চ্যাট রুম (Home)', href: '/', icon: MessageSquare },
    { name: 'টাস্ক নোটিফিকেশন (Tasks)', href: '/tasks', icon: Bell },
    { name: 'বিলিং / ফান্ড (Billing)', href: '/billing', icon: CreditCard },
    { name: 'ফোরাম (Discussion)', href: '/discussion', icon: MessageCircle },
    { name: 'ইভেন্টস (Events)', href: '/events', icon: Calendar },
    { name: 'হেল্পডেস্ক (Support)', href: '/support', icon: HelpCircle },
  ];

  return (
    <nav className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50 px-4 py-3" id="main-navbar">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand/Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="bg-blue-600 text-white p-2 rounded-full shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform duration-200">
            <MessageSquare className="w-6 h-6" />
          </div>
          <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            rgomassenger
          </span>
          <span className="bg-slate-800 text-[10px] text-blue-400 px-2 py-0.5 rounded-full font-mono border border-slate-700">
            Community
          </span>
        </Link>

        {/* Navigation Links */}
        <div className="flex flex-wrap items-center justify-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = router.pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
