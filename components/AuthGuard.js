import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import { MessageSquare, Lock } from 'lucide-react';

export default function AuthGuard({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Allow public access to /login
  const publicRoutes = ['/login'];
  const isPublicRoute = publicRoutes.includes(router.pathname);

  // Strict redirection: Any route other than /login requires authentication
  useEffect(() => {
    if (!loading && !user?.loggedIn && !isPublicRoute) {
      router.replace('/login');
    }
  }, [loading, user?.loggedIn, isPublicRoute, router]);

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
            <span>অ্যাকাউন্ট সিকিউরিটি ভেরিফাই করা হচ্ছে...</span>
          </div>
        </div>
      </div>
    );
  }

  // If user is logged in or route is public, render app
  if (user?.loggedIn || isPublicRoute) {
    return children;
  }

  // While redirecting to /login
  return (
    <div className="min-h-[85vh] flex-1 flex items-center justify-center p-4 bg-slate-950 text-slate-100">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
        <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">লগইন প্রয়োজন</h3>
          <p className="text-xs text-slate-400 mt-1">
            এই পৃষ্ঠাটি সুরক্ষিত। অনুগ্রহ করে লগইন করুন। লগইন পেজে রিডাইরেক্ট করা হচ্ছে...
          </p>
        </div>
        <div className="flex justify-center">
          <span className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
        </div>
      </div>
    </div>
  );
}
