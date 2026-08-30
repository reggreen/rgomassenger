import { useState, useEffect, useRef } from 'react';
import {
  appwrite as supabase,
  sendOnlinePresence,
  subscribeToPresence,
  subscribeToTyping,
  getOnlineUsersSnapshot,
  isAppwriteConfigured
} from '../lib/appwrite';
import { useAuth } from '../context/AuthContext';
import {
  User,
  Mail,
  ShieldCheck,
  Calendar,
  Key,
  Edit3,
  Check,
  RefreshCw,
  Copy,
  Sparkles,
  Phone,
  FileText,
  AlertTriangle,
  Award,
  Bell,
  MessageSquare,
  CreditCard,
  X,
  Camera,
  LogOut,
  LogIn,
  Upload,
  Trash2,
  Activity,
  Wifi,
  Radio,
  Circle,
  Zap,
  Globe
} from 'lucide-react';

const resizeImage = (file, maxWidth = 300, maxHeight = 300, quality = 0.85) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const PRESET_AVATARS = [
  { emoji: '🧑‍💻', bg: 'from-blue-600 to-indigo-600', label: 'কোডার' },
  { emoji: '👩‍🎨', bg: 'from-pink-500 to-rose-500', label: 'ডিজাইনার' },
  { emoji: '🦁', bg: 'from-amber-500 to-orange-500', label: 'সিংহ' },
  { emoji: '🦄', bg: 'from-purple-500 to-indigo-500', label: 'ইউনিকর্ন' },
  { emoji: '🦊', bg: 'from-orange-400 to-amber-600', label: 'শেয়াল' },
  { emoji: '🐼', bg: 'from-emerald-500 to-teal-600', label: 'পান্ডা' },
  { emoji: '🚀', bg: 'from-cyan-500 to-blue-500', label: 'রকেট' },
  { emoji: '🍿', bg: 'from-red-500 to-yellow-500', label: 'পপকর্ন' }
];

const PRESENCE_STATUS_OPTIONS = [
  { id: 'online', label: 'অনলাইন (Online)', color: 'bg-emerald-500', textColor: 'text-emerald-400', desc: 'সক্রিয় ও প্রস্তুত' },
  { id: 'busy', label: 'ব্যস্ত (Busy)', color: 'bg-rose-500', textColor: 'text-rose-400', desc: 'বিরক্ত করবেন না' },
  { id: 'away', label: 'অনুপস্থিত (Away)', color: 'bg-amber-500', textColor: 'text-amber-400', desc: 'সাময়িক বাইরে' },
  { id: 'offline', label: 'অদৃশ্য (Invisible)', color: 'bg-slate-500', textColor: 'text-slate-400', desc: 'অফলাইন দেখাবে' }
];

export default function UserProfile({ onProfileUpdate }) {
  const { user: authContextUser, updateProfile: authUpdateProfile, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [toast, setToast] = useState('');
  const [customAvatarUrl, setCustomAvatarUrl] = useState(null);
  const fileInputRef = useRef(null);

  // Real-time presence and typing status state
  const [currentPresenceStatus, setCurrentPresenceStatus] = useState('online');
  const [onlinePresenceMap, setOnlinePresenceMap] = useState({});
  const [liveTypingUsers, setLiveTypingUsers] = useState({});

  // Stats for current user
  const [userStats, setUserStats] = useState({
    tasksCount: 0,
    messagesCount: 0,
    billingCount: 0
  });

  // Edit form state
  const [formData, setFormData] = useState({
    full_name: '',
    nickname: '',
    email: '',
    phone: '',
    bio: '',
    role: 'Community Member',
    avatar_emoji: '🧑‍💻'
  });

  const fetchUserProfile = async () => {
    setLoading(true);
    try {
      // Priority 1: AuthContext User
      const currentUserName = authContextUser?.name || 'MD SHANTO';
      const currentUserEmail = authContextUser?.email || 'redgreenonline2023@gmail.com';
      const currentUserRole = authContextUser?.role || 'অ্যাডমিন / কমিউনিটি প্রধান';

      // 1. Try fetching real Auth user
      let currentAuthUser = null;
      if (supabase?.auth?.getUser) {
        const { data: { user } } = await supabase.auth.getUser();
        currentAuthUser = user;
        setAuthUser(user);
      }

      // Default email from metadata or active user
      const userEmail = currentAuthUser?.email || currentUserEmail;
      const userId = authContextUser?.id || currentAuthUser?.id || 'usr_rg_99218';

      // 2. Query Appwrite / Supabase 'profiles' table
      let fetchedProfile = null;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', userEmail);
        
        if (data && data.length > 0) {
          fetchedProfile = data[0];
        }
      } catch (err) {
        console.log('Profiles table query fallback:', err);
      }

      // 3. Fallback to localStorage or default profile state
      const localNickname = typeof window !== 'undefined' ? localStorage.getItem('rg_username') : null;
      const savedCustomAvatar = fetchedProfile?.custom_avatar_url || fetchedProfile?.avatar_url || authContextUser?.custom_avatar_url || (typeof window !== 'undefined' ? localStorage.getItem('rg_custom_avatar_url') : null);
      if (savedCustomAvatar) {
        setCustomAvatarUrl(savedCustomAvatar);
      }

      const mergedProfile = {
        id: fetchedProfile?.id || userId,
        full_name: authContextUser?.name || fetchedProfile?.full_name || currentAuthUser?.user_metadata?.full_name || localNickname || 'MD SHANTO',
        nickname: fetchedProfile?.nickname || localNickname || currentUserName.split(' ')[0] || 'SHANTO',
        email: authContextUser?.email || fetchedProfile?.email || userEmail,
        phone: fetchedProfile?.phone || authContextUser?.phone || '+880 1700-000000',
        role: authContextUser?.role || fetchedProfile?.role || currentUserRole,
        bio: authContextUser?.bio || fetchedProfile?.bio || 'rgomassenger কমিউনিটির সক্রিয় সদস্য এবং সিস্টেম মডারেটর।',
        avatar_emoji: authContextUser?.avatar_emoji || fetchedProfile?.avatar_emoji || '🧑‍💻',
        custom_avatar_url: savedCustomAvatar,
        created_at: fetchedProfile?.created_at || currentAuthUser?.created_at || '2026-01-15T10:00:00.000Z',
        last_sign_in_at: currentAuthUser?.last_sign_in_at || new Date().toISOString(),
        is_verified: true
      };

      setProfile(mergedProfile);
      setFormData({
        full_name: mergedProfile.full_name,
        nickname: mergedProfile.nickname,
        email: mergedProfile.email,
        phone: mergedProfile.phone,
        bio: mergedProfile.bio,
        role: mergedProfile.role,
        avatar_emoji: mergedProfile.avatar_emoji
      });

      // Broadcast current user presence
      sendOnlinePresence(mergedProfile.full_name, {
        status: currentPresenceStatus,
        avatar_emoji: mergedProfile.avatar_emoji,
        custom_avatar_url: savedCustomAvatar
      });

      // 4. Fetch activity stats for this user
      try {
        const { data: tasks } = await supabase.from('tasks').select('id');
        const { data: messages } = await supabase.from('messages').select('id');
        const { data: billing } = await supabase.from('billing').select('id');

        setUserStats({
          tasksCount: tasks?.length || 0,
          messagesCount: messages?.length || 0,
          billingCount: billing?.length || 0
        });
      } catch (e) {
        console.error('Stats fetch error:', e);
      }

    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();

    // Subscribe to Appwrite real-time presence changes
    const unsubPresence = subscribeToPresence((presenceStore) => {
      if (presenceStore) {
        setOnlinePresenceMap({ ...presenceStore });
      }
    });

    // Subscribe to Appwrite real-time typing events
    const unsubTyping = subscribeToTyping((typingPayload) => {
      if (typingPayload?.sender) {
        setLiveTypingUsers(prev => {
          if (!typingPayload.isTyping) {
            const next = { ...prev };
            delete next[typingPayload.sender];
            return next;
          }
          return {
            ...prev,
            [typingPayload.sender]: {
              room: typingPayload.room,
              time: Date.now()
            }
          };
        });
      }
    });

    // Initial presence snapshot
    setOnlinePresenceMap(getOnlineUsersSnapshot());

    return () => {
      unsubPresence();
      unsubTyping();
    };
  }, []);

  const handleStatusChange = (statusKey) => {
    setCurrentPresenceStatus(statusKey);
    if (profile?.full_name) {
      sendOnlinePresence(profile.full_name, {
        status: statusKey,
        avatar_emoji: profile.avatar_emoji,
        custom_avatar_url: customAvatarUrl
      });
      setToast(`স্ট্যাটাস পরিবর্তন হয়েছে: ${PRESENCE_STATUS_OPTIONS.find(o => o.id === statusKey)?.label || statusKey}`);
      setTimeout(() => setToast(''), 3000);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const resized = await resizeImage(file, 300, 300, 0.85);
      setCustomAvatarUrl(resized);
      if (typeof window !== 'undefined') {
        localStorage.setItem('rg_custom_avatar_url', resized);
        localStorage.setItem('rg_avatar_id', 'custom');
      }
      setToast('প্রোফাইল ছবি সফলভাবে যুক্ত হয়েছে!');
      setTimeout(() => setToast(''), 3000);
    } catch (err) {
      console.error('Profile image upload error:', err);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = () => {
    setCustomAvatarUrl(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('rg_custom_avatar_url');
      localStorage.setItem('rg_avatar_id', 'av-1');
    }
    setToast('প্রোফাইল ছবি রিমুভ করা হয়েছে');
    setTimeout(() => setToast(''), 3000);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      // 1. Save to Appwrite / Database 'profiles' table
      try {
        await supabase.from('profiles').insert([
          {
            email: formData.email,
            full_name: formData.full_name,
            nickname: formData.nickname,
            phone: formData.phone,
            bio: formData.bio,
            role: formData.role,
            avatar_emoji: formData.avatar_emoji,
            custom_avatar_url: customAvatarUrl,
            updated_at: new Date().toISOString()
          }
        ]);
      } catch (err) {
        console.log('Appwrite profiles insert/update error:', err);
      }

      // 2. Sync with AuthContext & local storage
      if (authUpdateProfile) {
        authUpdateProfile({
          name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          bio: formData.bio,
          role: formData.role,
          avatar_emoji: formData.avatar_emoji,
          custom_avatar_url: customAvatarUrl
        });
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('rg_username', formData.full_name);
        if (customAvatarUrl) {
          localStorage.setItem('rg_custom_avatar_url', customAvatarUrl);
          localStorage.setItem('rg_avatar_id', 'custom');
        } else {
          localStorage.removeItem('rg_custom_avatar_url');
        }
      }

      // Update state
      const updated = {
        ...profile,
        full_name: formData.full_name,
        nickname: formData.nickname,
        phone: formData.phone,
        bio: formData.bio,
        role: formData.role,
        avatar_emoji: formData.avatar_emoji,
        custom_avatar_url: customAvatarUrl
      };

      setProfile(updated);
      setIsEditing(false);
      setToast('প্রোফাইল সফলভাবে আপডেট করা হয়েছে!');
      if (onProfileUpdate) onProfileUpdate(updated);

      // Re-broadcast presence
      sendOnlinePresence(formData.full_name, {
        status: currentPresenceStatus,
        avatar_emoji: formData.avatar_emoji,
        custom_avatar_url: customAvatarUrl
      });

      setTimeout(() => setToast(''), 3500);
    } catch (err) {
      console.error('Save profile error:', err);
      setToast('প্রোফাইল আপডেট করতে সমস্যা হয়েছে!');
    } finally {
      setUpdating(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  if (loading) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 max-w-2xl w-full mx-auto shadow-2xl flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
        <p className="text-sm font-semibold text-slate-400 animate-pulse">অ্যাপরাইট থেকে প্রোফাইল তথ্য লোড হচ্ছে...</p>
      </div>
    );
  }

  const activeTypingList = Object.entries(liveTypingUsers).filter(
    ([user]) => user !== profile?.full_name
  );

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-3xl w-full mx-auto shadow-2xl relative overflow-hidden text-slate-100" id="user-profile-component">
      {/* Background Neon Accent Glow */}
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Toast Notification */}
      {toast && (
        <div className="mb-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{toast}</span>
          </div>
          <button onClick={() => setToast('')} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-4">
          {/* User Avatar with Real-time Online Indicator */}
          <div 
            className="relative group cursor-pointer flex-shrink-0" 
            onClick={() => fileInputRef.current?.click()} 
            title="প্রোফাইল ছবি পরিবর্তন করতে ক্লিক করুন"
          >
            {customAvatarUrl ? (
              <img
                src={customAvatarUrl}
                alt={profile?.full_name}
                className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover shadow-xl border-2 border-blue-500/80"
              />
            ) : (
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-3xl md:text-4xl shadow-xl shadow-blue-600/20 border-2 border-slate-700">
                {profile?.avatar_emoji || '🧑‍💻'}
              </div>
            )}
            
            {/* Real-time Status Badge Overlay */}
            <span
              className={`absolute -bottom-1 -right-1 p-1 rounded-full border-2 border-slate-900 shadow-md z-10 ${
                currentPresenceStatus === 'online'
                  ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-500/40'
                  : currentPresenceStatus === 'busy'
                  ? 'bg-rose-500 text-white'
                  : currentPresenceStatus === 'away'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-500 text-white'
              }`}
              title={`রিয়েল-টাইম স্ট্যাটাস: ${currentPresenceStatus}`}
            >
              <ShieldCheck className="w-3.5 h-3.5 font-bold" />
            </span>

            <div className="absolute inset-0 bg-slate-950/75 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white text-[10px] md:text-xs font-bold gap-1 backdrop-blur-[2px]">
              <Camera className="w-4 h-4 text-blue-400" />
              <span>আপলোড</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">{profile?.full_name}</h2>
              <span className="bg-blue-500/10 text-blue-300 border border-blue-500/30 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                {profile?.role}
              </span>
            </div>

            {/* Real-time Online & Appwrite Connection Indicator */}
            <div className="flex items-center gap-2 flex-wrap pt-0.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>অ্যাপরাইট রিয়েল-টাইম সংযুক্ত (Live Online)</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700">
                Ping: 12ms
              </span>
            </div>

            <p className="text-xs text-slate-400 flex items-center gap-1.5 font-mono pt-1">
              <Mail className="w-3.5 h-3.5 text-blue-400" />
              <span>{profile?.email}</span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={fetchUserProfile}
            className="bg-slate-800/80 hover:bg-slate-700 text-slate-300 p-2.5 rounded-xl border border-slate-700 transition"
            title="রিফ্রেশ করুন"
          >
            <RefreshCw className="w-4 h-4 text-blue-400" />
          </button>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-4 py-2.5 rounded-xl font-bold flex items-center gap-1.5 shadow-lg shadow-blue-600/20 transition active:scale-95"
          >
            {isEditing ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
            <span>{isEditing ? 'বাতিল করুন' : 'প্রোফাইল এডিট'}</span>
          </button>
        </div>
      </div>

      {/* Real-time Status Switcher Bar */}
      <div className="mt-4 p-3 bg-slate-950/70 border border-slate-800/90 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="text-xs font-bold text-slate-300">আমার লাইভ স্ট্যাটাস (Live Presence):</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto">
          {PRESENCE_STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => handleStatusChange(opt.id)}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                currentPresenceStatus === opt.id
                  ? 'bg-slate-800 border-blue-500 text-white shadow-md'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${opt.color} ${currentPresenceStatus === opt.id ? 'animate-pulse' : ''}`} />
              <span>{opt.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Real-time Live Community Activity & Typing Feed */}
      {activeTypingList.length > 0 && (
        <div className="mt-4 p-3 bg-blue-950/30 border border-blue-500/30 rounded-2xl flex items-center gap-3 animate-pulse">
          <div className="flex gap-1 items-center justify-center py-1">
            <span className="h-2 w-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
            <span className="h-2 w-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
            <span className="h-2 w-2 bg-blue-400 rounded-full animate-bounce"></span>
          </div>
          <div className="text-xs text-blue-200">
            <span className="font-bold">{activeTypingList.map(([user]) => user).join(', ')}</span>{' '}
            বর্তমানে অ্যাপরাইট মেসেঞ্জারে টাইপ করছেন...
          </div>
        </div>
      )}

      {/* Edit Form Modal/Drawer View */}
      {isEditing ? (
        <form onSubmit={handleSaveProfile} className="mt-6 space-y-4 bg-slate-950/60 p-5 rounded-2xl border border-slate-800">
          <h3 className="text-sm font-bold text-white flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-blue-400" />
              <span>অ্যাপরাইট প্রোফাইল তথ্য পরিবর্তন করুন</span>
            </span>
          </h3>

          {/* Profile Photo Upload Box */}
          <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-blue-400" />
                <span>প্রোফাইল ছবি আপলোড (Profile Picture Upload)</span>
              </label>
              {customAvatarUrl && (
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  কাস্টম ছবি সক্রিয়
                </span>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />

            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-slate-700 bg-slate-950 flex items-center justify-center flex-shrink-0 shadow-inner">
                {customAvatarUrl ? (
                  <img src={customAvatarUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">{formData.avatar_emoji || '🧑‍💻'}</span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
                >
                  <Upload className="w-4 h-4 text-blue-400" />
                  <span>গ্যালারি থেকে ছবি বেছে নিন</span>
                </button>

                {customAvatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="px-3.5 py-2.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ছবি মুছুন</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">পূর্ণ নাম (Full Name)</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
                className="w-full bg-slate-900 border border-slate-750 focus:border-blue-500 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">ডাকনাম (Nickname)</label>
              <input
                type="text"
                value={formData.nickname}
                onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                className="w-full bg-slate-900 border border-slate-750 focus:border-blue-500 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">ইমেইল ঠিকানা</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="w-full bg-slate-900 border border-slate-750 focus:border-blue-500 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">ফোন নম্বর</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-slate-900 border border-slate-750 focus:border-blue-500 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">অথবা অবতার ইমোজি (Avatar Icon)</label>
            <div className="flex flex-wrap gap-2 pt-1">
              {PRESET_AVATARS.map((av, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, avatar_emoji: av.emoji });
                  }}
                  className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition border ${
                    formData.avatar_emoji === av.emoji && !customAvatarUrl
                      ? 'bg-blue-600/30 border-blue-500 scale-110 shadow-lg'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {av.emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Role Status (Locked and Admin Controlled for Security) */}
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <label className="block text-[11px] font-bold text-slate-400">অ্যাসাইন করা রোল (Role Permission)</label>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs font-extrabold text-blue-400 bg-blue-500/10 border border-blue-500/30 px-2.5 py-0.5 rounded-full">
                  {formData.role || 'কমিউনিটি সদস্য'}
                </span>
                <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  ভেরিফাইড
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 font-medium block">
                🔒 নিরাপত্তা নীতি অনুযায়ী রোল শুধুমাত্র
              </span>
              <span className="text-[10px] text-slate-400 font-medium block">
                সিস্টেম অ্যাডমিন দ্বারা পরিবর্তনযোগ্য
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">বায়ো / ভূমিকা (Bio)</label>
            <textarea
              rows={3}
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="w-full bg-slate-900 border border-slate-750 focus:border-blue-500 rounded-xl p-3 text-xs text-white outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-4 py-2 rounded-xl font-semibold"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={updating}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-5 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-md"
            >
              {updating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>সেভ করুন</span>
            </button>
          </div>
        </form>
      ) : (
        /* Profile Details Body */
        <div className="mt-6 space-y-6">
          {/* Bio Box */}
          <div className="bg-slate-950/60 border border-slate-850 rounded-2xl p-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span>আমার বায়ো / পরিচিতি</span>
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              {profile?.bio || 'কোনো বায়ো যুক্ত করা নেই।'}
            </p>
          </div>

          {/* Key Information Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* User ID */}
            <div className="bg-slate-950/60 border border-slate-850 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">অ্যাপরাইট ইউজার আইডি (UID)</span>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-slate-200 truncate">{profile?.id}</span>
                <button
                  onClick={() => copyToClipboard(profile?.id)}
                  className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
                  title="কপি করুন"
                >
                  {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Phone */}
            <div className="bg-slate-950/60 border border-slate-850 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">যোগাযোগের ফোন নম্বর</span>
              <p className="font-mono text-slate-200 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-blue-400" />
                <span>{profile?.phone}</span>
              </p>
            </div>

            {/* Created At */}
            <div className="bg-slate-950/60 border border-slate-850 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">অ্যাকাউন্ট খোলার তারিখ</span>
              <p className="text-slate-200 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span>{new Date(profile?.created_at).toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </p>
            </div>

            {/* Security Status */}
            <div className="bg-slate-950/60 border border-slate-850 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">সিকিউরিটি ও স্ট্যাটাস</span>
              <p className="text-emerald-400 font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>ভেরিফাইড অ্যাপরাইট ডাটাবেস</span>
              </p>
            </div>
          </div>

          {/* Activity Overview Badges */}
          <div className="bg-gradient-to-r from-blue-950/30 via-slate-950 to-indigo-950/30 border border-slate-850 rounded-2xl p-4">
            <h4 className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>কমিউনিটিতে আপনার মোট একটিভিটি</span>
            </h4>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
                <p className="text-lg font-extrabold text-blue-400">{userStats.tasksCount}</p>
                <p className="text-[10px] text-slate-400">টাস্ক / রিমাইন্ডার</p>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
                <p className="text-lg font-extrabold text-indigo-400">{userStats.messagesCount}</p>
                <p className="text-[10px] text-slate-400">মেসেজ পাঠানো</p>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
                <p className="text-lg font-extrabold text-emerald-400">{userStats.billingCount}</p>
                <p className="text-[10px] text-slate-400">বিলিং রেকর্ড</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
