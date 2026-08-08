import { useState, useEffect } from 'react';
import ProtectedRoute from '../components/ProtectedRoute';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  Shield,
  Lock,
  Users,
  Megaphone,
  CheckCircle,
  Trash2,
  UserCheck,
  Key,
  ShieldCheck,
  Sparkles,
  Image as ImageIcon,
  Upload,
  RefreshCw,
  AlertTriangle,
  UserX
} from 'lucide-react';

export default function AdminPanel() {
  const {
    user,
    isAdmin,
    isModerator,
    updateProfile,
    getRegisteredUsers,
    deleteUser,
    updateUserRole,
    appLogo,
    updateAppLogo,
    resetAppLogo
  } = useAuth();

  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [activeTab, setActiveTab] = useState('users'); // 'users', 'logo', 'broadcast', 'channels'
  const [announcementText, setAnnouncementText] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);

  // Logo state
  const [customLogoInput, setCustomLogoInput] = useState('');
  const [logoSuccessMsg, setLogoSuccessMsg] = useState('');

  // Delete User Modal State
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionMsg, setActionMsg] = useState({ type: '', text: '' });

  const loadUsers = async () => {
    setLoadingUsers(true);
    const fetched = await getRegisteredUsers();
    setUsersList(fetched || []);
    setLoadingUsers(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRoleChange = async (targetUser, newRole) => {
    setActionMsg({ type: 'info', text: 'রোল আপডেট করা হচ্ছে...' });
    const res = await updateUserRole(targetUser.id, targetUser.email, newRole);
    if (res.success) {
      setActionMsg({ type: 'success', text: res.message });
      loadUsers();
    } else {
      setActionMsg({ type: 'error', text: res.message });
    }
    setTimeout(() => setActionMsg({ type: '', text: '' }), 3000);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    const res = await deleteUser(userToDelete.id, userToDelete.email);
    setIsDeleting(false);
    if (res.success) {
      setActionMsg({ type: 'success', text: `${userToDelete.name || userToDelete.email} কে সফলভাবে প্ল্যাটফর্ম থেকে মুছে ফেলা হয়েছে।` });
      setUserToDelete(null);
      loadUsers();
    } else {
      setActionMsg({ type: 'error', text: res.message });
    }
    setTimeout(() => setActionMsg({ type: '', text: '' }), 4000);
  };

  const handleLogoFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert('ফাইল সাইজ ৩ MB এর কম হতে হবে!');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      if (dataUrl) {
        setCustomLogoInput(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveLogo = (e) => {
    e.preventDefault();
    if (!customLogoInput.trim()) return;
    updateAppLogo(customLogoInput.trim());
    setLogoSuccessMsg('নতুন অ্যাপ লোগো সফলভাবে সেট ও সেভ করা হয়েছে!');
    setTimeout(() => setLogoSuccessMsg(''), 3000);
  };

  const handleResetLogo = () => {
    resetAppLogo();
    setCustomLogoInput('');
    setLogoSuccessMsg('অ্যাপ লোগো ডিফল্ট ডিজাইনে রিসেট করা হয়েছে!');
    setTimeout(() => setLogoSuccessMsg(''), 3000);
  };

  const handlePublishAnnouncement = async (e) => {
    e.preventDefault();
    if (!announcementText.trim() || isPublishing) return;

    setIsPublishing(true);
    try {
      const { error } = await supabase.from('messages').insert({
        room: 'announcements',
        sender: user?.name ? `${user.name} (অ্যাডমিন)` : 'অ্যাডমিন প্যানেল',
        content: announcementText.trim()
      });

      if (error) {
        console.error('Announcement publish error:', error);
      } else {
        setAnnouncementText('');
        setPublishSuccess(true);
        setTimeout(() => setPublishSuccess(false), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <ProtectedRoute requiredRole="moderator" fallbackTitle="অ্যাডমিন ও মডারেটর কন্ট্রোল প্যানেল">
      <div className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto space-y-6" id="admin-panel-page">
        
        {/* Top Hero Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 border border-indigo-900/40 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="space-y-2 relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-xs font-bold text-indigo-300 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              অ্যাডমিন প্রোটেক্টেড কন্ট্রোল রুট
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <Shield className="w-8 h-8 text-indigo-400" />
              <span>কমিউনিটি অ্যাডমিন প্যানেল</span>
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              ইউজার রোল ম্যানেজমেন্ট, সুরক্ষিত চ্যানেল কনফিগারেশন এবং জরুরি নোটিশ ব্রডকাস্ট সেন্ট্রাল কন্ট্রোল কেন্দ্র।
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-950/80 p-3 rounded-2xl border border-indigo-500/20 relative z-10 shrink-0">
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">বর্তমান পারমিশন লেভেল</p>
              <span className="text-[11px] font-extrabold text-amber-400 font-mono">
                {isAdmin ? '👑 সম্পূর্ণ অ্যাডমিন (Full Access)' : '🛡️ মডারেটর (Staff Access)'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'users'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>ইউজার ও রোল কন্ট্রোল ({usersList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('logo')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'logo'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>🎨 অ্যাপ লোগো পরিবর্তন</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('broadcast')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'broadcast'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Megaphone className="w-4 h-4" />
            <span>অফিসিয়াল আপডেট ও নোটিশ</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('channels')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'channels'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>প্রোটেক্টেড চ্যানেল সিকিউরিটি</span>
          </button>
        </div>

        {/* Global Action Banner */}
        {actionMsg.text && (
          <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 border animate-in fade-in ${
            actionMsg.type === 'error'
              ? 'bg-red-950/70 border-red-800 text-red-300'
              : actionMsg.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
              : 'bg-indigo-950/70 border-indigo-800 text-indigo-300'
          }`}>
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{actionMsg.text}</span>
          </div>
        )}

        {/* Tab 1: User Management & Delete User */}
        {activeTab === 'users' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-indigo-400" />
                  <span>কমিউনিটি ইউজার ও রোল কন্ট্রোল</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  ভার্সেল লিংকের মাধ্যমে আসল ইউজার লগইন করলে এখানে দেখাবে। আপনি রোল পরিবর্তন বা ইউজার ডিলিট করতে পারেন।
                </p>
              </div>

              <button
                type="button"
                onClick={loadUsers}
                className="self-start md:self-auto px-3.5 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white rounded-xl transition flex items-center gap-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? 'animate-spin text-indigo-400' : ''}`} />
                <span>রিফ্রেশ ইউজার লিস্ট</span>
              </button>
            </div>

            {loadingUsers ? (
              <div className="py-12 text-center text-slate-400 text-xs font-mono animate-pulse">
                ইউজার ডেটা লোড হচ্ছে...
              </div>
            ) : usersList.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                কোনো ইউজার পাওয়া যায়নি। ভার্সেল লিংক দিলে নতুন ইউজারদের লগইন আইডি এখানে সরাসরি প্রদর্শিত হবে।
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {usersList.map((usr) => {
                  const isSystemOwner = usr.email?.toLowerCase() === 'redgreenonline2023@gmail.com';

                  return (
                    <div
                      key={usr.id || usr.email}
                      className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3.5 relative group hover:border-indigo-500/40 transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-2xl p-2 bg-slate-900 rounded-2xl border border-slate-800 shrink-0">
                            {usr.avatar_emoji || '🧑‍💻'}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                              <span>{usr.name || 'অজ্ঞাত ইউজার'}</span>
                              {isSystemOwner && (
                                <span className="bg-amber-500/20 text-amber-400 text-[10px] px-1.5 py-0.5 rounded border border-amber-500/30 font-mono">
                                  Owner
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-slate-400 font-mono truncate">{usr.email}</p>
                          </div>
                        </div>

                        {!isSystemOwner && (
                          <button
                            type="button"
                            onClick={() => setUserToDelete(usr)}
                            className="text-slate-500 hover:text-red-400 p-2 hover:bg-red-500/10 rounded-xl transition shrink-0"
                            title="ইউজার ডিলিট করুন"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-xs">
                        <span className="text-slate-400 text-[11px] font-medium">রোল নির্বাচন:</span>
                        <select
                          value={usr.role || 'কমিউনিটি মেম্বার'}
                          onChange={(e) => handleRoleChange(usr, e.target.value)}
                          disabled={isSystemOwner}
                          className="bg-slate-900 border border-slate-800 text-white rounded-lg px-2.5 py-1 text-xs font-bold focus:border-indigo-500 focus:outline-none disabled:opacity-60 cursor-pointer"
                        >
                          <option value="অ্যাডমিন / কমিউনিটি প্রধান">👑 অ্যাডমিন</option>
                          <option value="মডারেটর">🛡️ মডারেটর</option>
                          <option value="কমিউনিটি মেম্বার">🚀 মেম্বার</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: App Logo Upload & Customize */}
        {activeTab === 'logo' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-indigo-400" />
                <span>কাস্টম অ্যাপ লোগো সেটআপ</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                আপনার কমিউনিটি বা ব্র্যান্ডের লোগো সেট করুন। এটি অ্যাপের ন্যাভবার, সাইডবার ও ব্র্যান্ডিং প্লেসে প্রদর্শিত হবে।
              </p>
            </div>

            {logoSuccessMsg && (
              <div className="bg-emerald-950/70 border border-emerald-800 text-emerald-300 p-4 rounded-xl flex items-center gap-2 text-xs font-bold">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>{logoSuccessMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Logo Input Options */}
              <div className="space-y-4 bg-slate-950 p-5 rounded-2xl border border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2">
                    ১. কম্পিউটার বা ফোন থেকে লোগো আপলোড করুন:
                  </label>
                  <label className="cursor-pointer border-2 border-dashed border-slate-800 hover:border-indigo-500 bg-slate-900/60 rounded-xl p-4 flex flex-col items-center justify-center text-center transition group">
                    <Upload className="w-6 h-6 text-slate-400 group-hover:text-indigo-400 mb-1" />
                    <span className="text-xs font-bold text-slate-300">ছবি বাছাই করতে ক্লিক করুন</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">PNG, JPG, SVG বা WEBP (সর্বোচ্চ ৩MB)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-800"></div>
                  <span className="flex-shrink mx-3 text-slate-500 text-[10px] font-bold">অথবা</span>
                  <div className="flex-grow border-t border-slate-800"></div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    ২. লোগো ইমেজ URL পেস্ট করুন:
                  </label>
                  <input
                    type="url"
                    value={customLogoInput}
                    onChange={(e) => setCustomLogoInput(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleSaveLogo}
                    disabled={!customLogoInput.trim()}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>লোগো সেভ করুন</span>
                  </button>

                  {appLogo && (
                    <button
                      type="button"
                      onClick={handleResetLogo}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center gap-1.5 transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>রিসেট</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Logo Preview */}
              <div className="space-y-3 bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col justify-center">
                <p className="text-xs font-bold text-slate-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>লাইভ লোগো প্রিভিউ:</span>
                </p>

                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                  <span className="text-xs text-slate-400">ন্যাভবার লুক:</span>
                  <div className="flex items-center gap-2.5 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
                    {customLogoInput || appLogo ? (
                      <img
                        src={customLogoInput || appLogo}
                        alt="App Logo Preview"
                        className="w-8 h-8 object-contain rounded-lg bg-slate-900 p-0.5 border border-slate-800"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-xs">
                        RG
                      </div>
                    )}
                    <span className="font-extrabold text-sm text-white tracking-tight">rgomassenger</span>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                  <span className="text-xs text-slate-400">বর্তমান স্টেট:</span>
                  <span className="text-xs font-mono font-bold text-indigo-400">
                    {appLogo ? '🎨 কাস্টম লোগো সক্রিয়' : '🛡️ ডিফল্ট ব্র্যান্ড লোগো'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Broadcast Notice */}
        {activeTab === 'broadcast' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-indigo-400" />
                <span>অফিসিয়াল নোটিশ ব্রডকাস্ট</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                এখানে বার্তা পোস্ট করলে সরাসরি সংরক্ষিত #announcements চ্যানেলে পোস্ট হয়ে যাবে।
              </p>
            </div>

            {publishSuccess && (
              <div className="bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 p-4 rounded-xl flex items-center gap-2 text-xs font-bold">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span>নোটিশটি সফলভাবে #announcements চ্যানেলে ব্রডকাস্ট করা হয়েছে!</span>
              </div>
            )}

            <form onSubmit={handlePublishAnnouncement} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  ঘোষণা ও আপডেট বার্তা:
                </label>
                <textarea
                  rows={4}
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  placeholder="জরুরি নোটিশ বা নতুন আপডেট টাইপ করুন..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!announcementText.trim() || isPublishing}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isPublishing ? 'পাবলিশ হচ্ছে...' : 'নোটিশ ব্রডকাস্ট করুন'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 3: Protected Channels Config */}
        {activeTab === 'channels' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-indigo-400" />
                <span>চ্যানেল রোল সিকিউরিটি ম্যাট্রিক্স</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                লাইভ চ্যাট রুমগুলোতে অ্যাক্সেস কন্ট্রোলের তালিকা:
              </p>
            </div>

            <div className="space-y-2.5">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="text-amber-400 p-2 bg-amber-500/10 rounded-lg">👑</span>
                  <div>
                    <p className="font-bold text-white">#admin-lounge</p>
                    <p className="text-[11px] text-slate-400">গোপন ও সংরক্ষিত অ্যাডমিন স্ট্র্যাটেজি চ্যানেল</p>
                  </div>
                </div>
                <span className="bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-full text-[11px] font-bold">
                  শুধুমাত্র অ্যাডমিন
                </span>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="text-indigo-300 p-2 bg-indigo-500/10 rounded-lg">🛡️</span>
                  <div>
                    <p className="font-bold text-white">#announcements</p>
                    <p className="text-[11px] text-slate-400">কমিউনিটির অফিসিয়াল নোটিশ বোর্ড</p>
                  </div>
                </div>
                <span className="bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 px-2.5 py-1 rounded-full text-[11px] font-bold">
                  মডারেটর ও অ্যাডমিন
                </span>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="text-emerald-400 p-2 bg-emerald-500/10 rounded-lg">💬</span>
                  <div>
                    <p className="font-bold text-white">#general, #tech-talk, #fun</p>
                    <p className="text-[11px] text-slate-400">উন্মুক্ত সাধারণ চ্যাট চ্যানেল</p>
                  </div>
                </div>
                <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full text-[11px] font-bold">
                  সকল সদস্য
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Delete User Confirmation Modal */}
        {userToDelete && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3 text-red-400">
                <div className="p-2.5 bg-red-500/10 rounded-xl border border-red-500/20">
                  <UserX className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-white">ইউজার মুছে ফেলার নিশ্চিতকরণ</h4>
                  <p className="text-xs text-slate-400">অনুমতি যাচাইকরণ প্রক্রিয়া</p>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs space-y-2">
                <p className="text-slate-300">
                  আপনি কি নিশ্চিত যে <span className="font-bold text-white font-mono">{userToDelete.name || userToDelete.email}</span> ({userToDelete.email}) অ্যাকাউন্টটি মুছে ফেলতে চান?
                </p>
                <p className="text-amber-400 text-[11px] font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>এটি মুছে ফেললে উক্ত ইউজার প্ল্যাটফর্মের অ্যাক্সেস হারিয়ে ফেলবেন।</span>
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
                >
                  বাতিল করুন
                </button>

                <button
                  type="button"
                  onClick={confirmDeleteUser}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-red-600/20 transition flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isDeleting ? 'মুছে ফেলা হচ্ছে...' : 'হ্যাঁ, মুছে ফেলুন'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </ProtectedRoute>
  );
}
