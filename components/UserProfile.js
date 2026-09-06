import { useState, useEffect, useRef } from 'react';
import {
  appwrite as supabase,
  sendOnlinePresence,
  subscribeToPresence,
  subscribeToTyping,
  getOnlineUsersSnapshot
} from '../lib/appwrite';
import { useAuth, DEFAULT_ADMIN_ACCOUNT, isChiefAdminEmail } from '../context/AuthContext';
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
  Globe,
  Users,
  Shield,
  Search,
  Lock,
  ChevronDown
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
  { emoji: '🧑‍💻', label: 'কোডার' },
  { emoji: '👩‍🎨', label: 'ডিজাইনার' },
  { emoji: '👨‍💼', label: 'টিম লিড' },
  { emoji: '🦁', label: 'সিংহ' },
  { emoji: '🦄', label: 'ইউনিকর্ন' },
  { emoji: '🦊', label: 'শেয়াল' },
  { emoji: '🐼', label: 'পান্ডা' },
  { emoji: '🚀', label: 'রকেট' }
];

const PRESENCE_STATUS_OPTIONS = [
  { id: 'online', label: 'অনলাইন (Online)', color: 'bg-emerald-500', textColor: 'text-emerald-400', desc: 'সক্রিয় ও প্রস্তুত' },
  { id: 'busy', label: 'ব্যস্ত (Busy)', color: 'bg-rose-500', textColor: 'text-rose-400', desc: 'বিরক্ত করবেন না' },
  { id: 'away', label: 'অনুপস্থিত (Away)', color: 'bg-amber-500', textColor: 'text-amber-400', desc: 'সাময়িক বাইরে' },
  { id: 'offline', label: 'অদৃশ্য (Invisible)', color: 'bg-slate-500', textColor: 'text-slate-400', desc: 'অফলাইন দেখাবে' }
];

const QUICK_STATUS_PRESETS = [
  'কাজের ডেস্কে আছি 📋',
  'জরুরি স্প্রিন্ট ডেলিভারি 🚀',
  'মিটিংয়ে আছি 🎯',
  'কোডিং ও বাগ ফিক্সিং মোডে 💻',
  'চা / কফির বিরতিতে ☕',
  'অনলাইনে আছি, নক করুন 💬'
];

const ROLE_OPTIONS = [
  'অফিস মেম্বার',
  'মডারেটর / টিম লিড',
  'অ্যাডমিন / কমিউনিটি প্রধান',
  'এইচআর ও অপারেশনস',
  'সফটওয়্যার ইঞ্জিনিয়ার',
  'ডিজাইনার ও ক্রিয়েটিভ'
];

export default function UserProfile({ onProfileUpdate }) {
  const {
    user: authContextUser,
    updateProfile: authUpdateProfile,
    adminUpdateUserProfile,
    removeMemberFromApp,
    getRegisteredUsers,
    isAdmin,
    isModerator
  } = useAuth();

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [toast, setToast] = useState('');
  const [customAvatarUrl, setCustomAvatarUrl] = useState(null);
  const fileInputRef = useRef(null);

  // Admin visibility & editing mode states
  const [adminInspectMode, setAdminInspectMode] = useState(false); // false = self, true = inspect other users
  const [allRegisteredUsers, setAllRegisteredUsers] = useState([]);
  const [selectedUserEmail, setSelectedUserEmail] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [removingUserConfirm, setRemovingUserConfirm] = useState(false);

  // Active target profile currently being viewed (self or inspected user)
  const [activeProfile, setActiveProfile] = useState(null);

  // Real-time presence status
  const [currentPresenceStatus, setCurrentPresenceStatus] = useState('online');
  const [onlinePresenceMap, setOnlinePresenceMap] = useState({});

  // Form Data for Edit Mode
  const [formData, setFormData] = useState({
    full_name: '',
    nickname: '',
    email: '',
    phone: '',
    bio: '',
    status: '',
    presence: 'online',
    role: 'অফিস মেম্বার',
    avatar_emoji: '🧑‍💻'
  });

  const showToastMsg = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  // Load all registered users for admin selector
  const fetchAllUsers = async () => {
    try {
      const list = await getRegisteredUsers();
      setAllRegisteredUsers(list || []);
      return list || [];
    } catch (err) {
      console.error('Fetch all users error:', err);
      return [];
    }
  };

  // Load profile data
  const loadProfileData = async (targetEmail = null) => {
    setLoading(true);
    try {
      const usersList = await fetchAllUsers();

      // Determine which user to display
      let currentTarget = null;
      const targetEmailClean = (targetEmail || '').toLowerCase();

      if (targetEmailClean) {
        currentTarget = usersList.find(u => u.email?.toLowerCase() === targetEmailClean);
      }

      if (!currentTarget) {
        // Default to logged-in user
        const selfEmail = authContextUser?.email?.toLowerCase() || DEFAULT_ADMIN_ACCOUNT.email.toLowerCase();
        currentTarget = usersList.find(u => u.email?.toLowerCase() === selfEmail) || authContextUser || DEFAULT_ADMIN_ACCOUNT;
      }

      const merged = {
        id: currentTarget.id || 'usr_' + Date.now(),
        full_name: currentTarget.name || currentTarget.full_name || 'ইউজার',
        nickname: currentTarget.nickname || (currentTarget.name ? currentTarget.name.split(' ')[0] : 'Member'),
        email: currentTarget.email || 'user@example.com',
        phone: currentTarget.phone || '',
        role: currentTarget.role || 'অফিস মেম্বার',
        bio: currentTarget.bio || 'অফিস মেসেঞ্জারের সক্রিয় সদস্য।',
        status: currentTarget.status || 'কাজের ডেস্কে আছি 📋',
        presence: currentTarget.presence || 'online',
        avatar_emoji: currentTarget.avatar_emoji || '🧑‍💻',
        custom_avatar_url: currentTarget.custom_avatar_url || currentTarget.avatar_url || null,
        created_at: currentTarget.created_at || '2026-01-15T10:00:00.000Z',
        is_verified: true
      };

      setActiveProfile(merged);
      setSelectedUserEmail(merged.email);
      setCustomAvatarUrl(merged.custom_avatar_url);
      setCurrentPresenceStatus(merged.presence || 'online');

      setFormData({
        full_name: merged.full_name,
        nickname: merged.nickname,
        email: merged.email,
        phone: merged.phone,
        bio: merged.bio,
        status: merged.status,
        presence: merged.presence,
        role: merged.role,
        avatar_emoji: merged.avatar_emoji
      });
    } catch (err) {
      console.error('Load profile data error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfileData();

    // Subscribe to presence
    const unsubPresence = subscribeToPresence((presenceStore) => {
      if (presenceStore) {
        setOnlinePresenceMap({ ...presenceStore });
      }
    });
    setOnlinePresenceMap(getOnlineUsersSnapshot());

    const handleUserUpdated = () => {
      fetchAllUsers();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('rg_user_updated', handleUserUpdated);
      window.addEventListener('rg_member_removed', handleUserUpdated);
    }

    return () => {
      unsubPresence();
      if (typeof window !== 'undefined') {
        window.removeEventListener('rg_user_updated', handleUserUpdated);
        window.removeEventListener('rg_member_removed', handleUserUpdated);
      }
    };
  }, [authContextUser?.email]);

  // Handle Admin User Selection
  const handleSelectInspectUser = (email) => {
    setSelectedUserEmail(email);
    setIsEditing(false);
    loadProfileData(email);
  };

  // Status Change Handler (Quick Presence Switch)
  const handleStatusChange = async (presenceKey) => {
    setCurrentPresenceStatus(presenceKey);
    setFormData(prev => ({ ...prev, presence: presenceKey }));

    if (isViewingSelf) {
      authUpdateProfile({ presence: presenceKey });
      sendOnlinePresence(activeProfile.full_name, {
        status: presenceKey,
        avatar_emoji: activeProfile.avatar_emoji,
        custom_avatar_url: customAvatarUrl
      });
    } else if (isAdmin) {
      await adminUpdateUserProfile(activeProfile.id, activeProfile.email, { presence: presenceKey });
    }

    showToastMsg(`লাইভ প্রেজেন্স পরিবর্তন হয়েছে: ${PRESENCE_STATUS_OPTIONS.find(o => o.id === presenceKey)?.label || presenceKey}`);
  };

  // Image Upload Handler
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const resized = await resizeImage(file, 300, 300, 0.85);
      setCustomAvatarUrl(resized);
      showToastMsg('প্রোফাইল ছবি সফলভাবে লোড হয়েছে!');
    } catch (err) {
      console.error('Image upload error:', err);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Remove Custom Avatar Image
  const handleRemoveImage = () => {
    setCustomAvatarUrl(null);
    showToastMsg('প্রোফাইল ছবি সরানো হয়েছে');
  };

  // Save Profile Handler (Supports both Member Self-Update & Admin Full-Editing Rights)
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      showToastMsg('ডিসপ্লে নাম খালি রাখা যাবে না');
      return;
    }

    setUpdating(true);
    try {
      const isViewingSelf = (authContextUser?.email || DEFAULT_ADMIN_ACCOUNT.email).toLowerCase() === activeProfile?.email?.toLowerCase();

      const updatedPayload = {
        name: formData.full_name.trim(),
        full_name: formData.full_name.trim(),
        nickname: formData.nickname.trim() || formData.full_name.trim().split(' ')[0],
        phone: formData.phone.trim(),
        bio: formData.bio.trim(),
        status: formData.status.trim(),
        presence: formData.presence || currentPresenceStatus,
        avatar_emoji: formData.avatar_emoji,
        custom_avatar_url: customAvatarUrl
      };

      // If Admin is editing, include the role modification!
      if (isAdmin) {
        updatedPayload.role = formData.role;
      }

      if (isViewingSelf) {
        // Self edit by member (updates name, status, phone, bio, avatar)
        authUpdateProfile(updatedPayload);
        showToastMsg('আপনার প্রোফাইল তথ্য সফলভাবে আপডেট হয়েছে!');
      } else {
        // Admin full editing rights over member's profile
        const res = await adminUpdateUserProfile(activeProfile.id, activeProfile.email, updatedPayload);
        if (res.success) {
          showToastMsg(`অ্যাডমিন হিসেবে "${formData.full_name}" এর প্রোফাইল সফলভাবে আপডেট করা হয়েছে!`);
        } else {
          showToastMsg(res.message || 'আপডেট করতে ত্রুটি হয়েছে');
        }
      }

      // Update active local state
      const updatedProfileObj = {
        ...activeProfile,
        ...updatedPayload
      };
      setActiveProfile(updatedProfileObj);
      setIsEditing(false);

      if (onProfileUpdate) onProfileUpdate(updatedProfileObj);
      await fetchAllUsers();
    } catch (err) {
      console.error('Save profile error:', err);
      showToastMsg('প্রোফাইল সংরক্ষণ করতে সমস্যা হয়েছে');
    } finally {
      setUpdating(false);
    }
  };

  // Remove User from Application (Admin Exclusive)
  const handleRemoveUserFromApp = async () => {
    if (!isAdmin || !activeProfile) return;
    try {
      const res = await removeMemberFromApp(activeProfile.id, activeProfile.email);
      if (res.success) {
        showToastMsg(res.message);
        setRemovingUserConfirm(false);
        // Switch back to self profile
        setAdminInspectMode(false);
        await loadProfileData(authContextUser?.email);
      } else {
        showToastMsg(res.message || 'রিমুভ করা সম্ভব হয়নি');
      }
    } catch (err) {
      console.error('Remove member error:', err);
      showToastMsg('মেম্বার রিমুভ করতে ব্যর্থ হয়েছে');
    }
  };

  const copyToClipboard = (text, label = 'কপি') => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToastMsg(`${label} ক্লিপবোর্ডে কপি করা হয়েছে!`);
    }
  };

  if (loading || !activeProfile) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 max-w-3xl w-full mx-auto shadow-2xl flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
        <p className="text-sm font-semibold text-slate-400 animate-pulse">প্রোফাইল তথ্য লোড হচ্ছে...</p>
      </div>
    );
  }

  const isViewingSelf = (authContextUser?.email || DEFAULT_ADMIN_ACCOUNT.email).toLowerCase() === activeProfile.email.toLowerCase();
  const isChiefAdmin = isChiefAdminEmail(activeProfile.email);

  const filteredDropdownUsers = allRegisteredUsers.filter(u => {
    const q = userSearchQuery.trim().toLowerCase();
    return !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.role?.toLowerCase().includes(q);
  });

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-4xl w-full mx-auto shadow-2xl relative overflow-hidden text-slate-100 space-y-6" id="user-profile-component">
      
      {/* Background Neon Accent Glow */}
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Toast Notification */}
      {toast && (
        <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-between shadow-lg animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{toast}</span>
          </div>
          <button onClick={() => setToast('')} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ADMIN CONTROL INSPECTION BAR (Ensuring Admin Retains Full Visibility & Editing Rights Over All User Profiles) */}
      {isAdmin && (
        <div className="bg-slate-950 border border-indigo-500/30 rounded-2xl p-4 shadow-lg space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs md:text-sm font-extrabold text-white">অ্যাডমিন প্রোফাইল কন্ট্রোল ও ইন্সপেকশন</h3>
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.2 rounded-full font-bold">
                    ফুল এডিটিং রাইটস
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  অ্যাডমিন হিসেবে যেকোনো মেম্বারের সম্পূর্ণ প্রোফাইল দেখতে ও তাদের ডিসপ্লে নাম, পদবি বা স্ট্যাটাস এডিট করতে পারেন।
                </p>
              </div>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => {
                  setAdminInspectMode(false);
                  loadProfileData(authContextUser?.email);
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                  !adminInspectMode
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>আমার প্রোফাইল</span>
              </button>

              <button
                type="button"
                onClick={() => setAdminInspectMode(true)}
                className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                  adminInspectMode
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>সকল সদস্য ({allRegisteredUsers.length})</span>
              </button>
            </div>
          </div>

          {/* Member Selector Dropdown & Search (When in Inspect Mode) */}
          {adminInspectMode && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  প্রোফাইল নির্বাচন করুন:
                </label>
                <select
                  value={selectedUserEmail}
                  onChange={(e) => handleSelectInspectUser(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-white text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold"
                >
                  {allRegisteredUsers.map((u) => (
                    <option key={u.email} value={u.email}>
                      {u.avatar_emoji || '🧑‍💻'} {u.name} ({u.role || 'মেম্বার'}) — {u.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  কুইক ইউজার সার্চ:
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="নাম বা ইমেইল দিয়ে ফিল্টার করুন..."
                    className="w-full bg-slate-900 border border-slate-800 text-white text-xs pl-8 pr-3 py-2.5 rounded-xl focus:outline-none focus:border-indigo-500"
                  />
                  {userSearchQuery && (
                    <button
                      onClick={() => setUserSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* HEADER BANNER: AVATAR, NAME, ROLE & ACTION BUTTONS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        
        {/* User Identity */}
        <div className="flex items-center gap-4">
          
          {/* Avatar with Presence Indicator */}
          <div
            className="relative group cursor-pointer flex-shrink-0"
            onClick={() => fileInputRef.current?.click()}
            title="ছবি পরিবর্তন করতে ক্লিক করুন"
          >
            {customAvatarUrl ? (
              <img
                src={customAvatarUrl}
                alt={activeProfile.full_name}
                className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover shadow-xl border-2 border-indigo-500/80"
              />
            ) : (
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center text-3xl md:text-4xl shadow-xl shadow-indigo-600/20 border-2 border-slate-700">
                {activeProfile.avatar_emoji || '🧑‍💻'}
              </div>
            )}

            {/* Live Presence Badge Dot */}
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
              title={`লাইভ প্রেজেন্স: ${currentPresenceStatus}`}
            >
              <ShieldCheck className="w-3.5 h-3.5 font-bold" />
            </span>

            <div className="absolute inset-0 bg-slate-950/75 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white text-[10px] md:text-xs font-bold gap-1 backdrop-blur-[2px]">
              <Camera className="w-4 h-4 text-indigo-400" />
              <span>আপলোড</span>
            </div>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />

          {/* Name, Role & Status Preview */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
                {activeProfile.full_name}
              </h2>
              <span
                className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                  activeProfile.role?.toLowerCase().includes('admin') || activeProfile.role?.toLowerCase().includes('অ্যাডমিন')
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    : activeProfile.role?.toLowerCase().includes('মডারেটর')
                    ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                    : 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                }`}
              >
                {activeProfile.role}
              </span>

              {isChiefAdmin && (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.2 rounded-full font-bold">
                  👑 রুট অ্যাডমিন
                </span>
              )}
            </div>

            {/* Custom Status Display */}
            {activeProfile.status && (
              <p className="text-xs text-indigo-300 font-semibold flex items-center gap-1.5 pt-0.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>"{activeProfile.status}"</span>
              </p>
            )}

            <p className="text-xs text-slate-400 flex items-center gap-1.5 font-mono pt-0.5">
              <Mail className="w-3.5 h-3.5 text-indigo-400" />
              <span>{activeProfile.email}</span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => loadProfileData(activeProfile.email)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2.5 rounded-xl border border-slate-700 transition"
            title="রিফ্রেশ করুন"
          >
            <RefreshCw className="w-4 h-4 text-indigo-400" />
          </button>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4 py-2.5 rounded-xl font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition active:scale-95"
          >
            {isEditing ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
            <span>{isEditing ? 'সম্পাদনা বাতিল' : 'প্রোফাইল এডিট'}</span>
          </button>
        </div>
      </div>

      {/* QUICK STATUS & PRESENCE SWITCHER BAR */}
      <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="text-xs font-bold text-slate-300">
            {isViewingSelf ? 'আমার লাইভ স্ট্যাটাস:' : 'ইউজারের লাইভ স্ট্যাটাস:'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto">
          {PRESENCE_STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleStatusChange(opt.id)}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition ${
                currentPresenceStatus === opt.id
                  ? 'bg-slate-800 text-white border-indigo-500 shadow-md ring-1 ring-indigo-500/40'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${opt.color}`} />
              <span>{opt.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* MAIN VIEW: DETAILS VS EDIT FORM */}
      {!isEditing ? (
        
        /* READ-ONLY VIEW (WITH FULL VISIBILITY) */
        <div className="space-y-5 animate-in fade-in duration-150">
          
          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Display Name & Nickname */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-1">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                পূর্ণ নাম ও ডাকনাম
              </span>
              <p className="text-sm font-extrabold text-white">{activeProfile.full_name}</p>
              {activeProfile.nickname && (
                <p className="text-xs text-slate-400">ডাকনাম: {activeProfile.nickname}</p>
              )}
            </div>

            {/* Role & Permissions */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-1">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                অফিস পদবি ও দায়িত্ব
              </span>
              <p className="text-sm font-extrabold text-indigo-300">{activeProfile.role}</p>
              <p className="text-[11px] text-slate-500">
                {isAdmin ? 'অ্যাডমিন অধিকার দ্বারা পরিবর্তনযোগ্য' : 'সিস্টেম অ্যাডমিন কর্তৃক নির্ধারিত'}
              </p>
            </div>

            {/* Custom Status Message */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-1 md:col-span-2">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                বর্তমান কাজের স্ট্যাটাস বার্তা
              </span>
              <p className="text-sm font-semibold text-emerald-300">
                {activeProfile.status || 'কোনো স্ট্যাটাস দেওয়া নেই'}
              </p>
            </div>

            {/* Contact Email */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-1">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-blue-400" />
                অফিসিয়াল ইমেইল
              </span>
              <div className="flex items-center justify-between">
                <p className="text-xs font-mono text-white break-all">{activeProfile.email}</p>
                <button
                  onClick={() => copyToClipboard(activeProfile.email, 'ইমেইল')}
                  className="text-slate-500 hover:text-white p-1"
                  title="ইমেইল কপি করুন"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Contact Phone */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-1">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                মোবাইল ফোন নম্বর
              </span>
              <p className="text-xs text-white">{activeProfile.phone || 'ফোন নম্বর উল্লেখ নেই'}</p>
            </div>

            {/* Bio / Description */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-1 md:col-span-2">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                বায়োগ্রাফি ও কাজের বিবরণ
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">
                {activeProfile.bio || 'কোনো বিবরণ যোগ করা হয়নি'}
              </p>
            </div>

            {/* Account Metadata */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-1">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                ইউজার আইডি (UID)
              </span>
              <p className="font-mono text-[11px] text-slate-400 truncate">{activeProfile.id}</p>
            </div>

            {/* Registered Date */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-1">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                নিবন্ধনের তারিখ
              </span>
              <p className="text-xs text-slate-300">
                {new Date(activeProfile.created_at || Date.now()).toLocaleDateString('bn-BD', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>

          {/* Admin Remove Option (Option to remove user from application) */}
          {isAdmin && !isViewingSelf && (
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-rose-400">প্রশাসনিক রিমুভ কন্ট্রোল</p>
                <p className="text-[11px] text-slate-400">
                  এই মেম্বারকে অ্যাপ থেকে স্থায়ীভাবে রিমুভ করতে পারবেন।
                </p>
              </div>

              {isChiefAdmin ? (
                <span className="text-xs text-amber-400 font-bold bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/30">
                  রুট চিফ অ্যাডমিন সুরক্ষিত
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setRemovingUserConfirm(true)}
                  className="px-4 py-2 bg-rose-950/40 hover:bg-rose-600 text-rose-300 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-rose-800/40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>অ্যাপ থেকে রিমুভ করুন</span>
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        
        /* EDIT PROFILE FORM (Allows Members to update Display Name & Status, and Admin full editing rights) */
        <form onSubmit={handleSaveProfile} className="space-y-4 animate-in fade-in duration-150">
          
          <div className="p-3 bg-indigo-950/30 border border-indigo-500/30 rounded-2xl flex items-center gap-2 text-xs text-indigo-300">
            <Edit3 className="w-4 h-4 shrink-0 text-indigo-400" />
            <span>
              {isViewingSelf
                ? 'আপনার ডিসপ্লে নাম ও স্ট্যাটাস বার্তা আপডেট করতে নিচের তথ্য পরিবর্তন করুন।'
                : `অ্যাডমিন হিসেবে "${activeProfile.full_name}" এর প্রোফাইল ও ভূমিকা সম্পাদনা করছেন।`}
            </span>
          </div>

          {/* Display Name & Nickname */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                ডিসপ্লে নাম (Display Name) <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="যেমন: তানভীর আহমেদ"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white text-xs px-3.5 py-2.5 rounded-xl focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                ডাকনাম (Nickname)
              </label>
              <input
                type="text"
                value={formData.nickname}
                onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                placeholder="যেমন: তানভীর"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white text-xs px-3.5 py-2.5 rounded-xl focus:outline-none transition"
              />
            </div>
          </div>

          {/* Custom Status Message & Quick Presets */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300">
              কাজের স্ট্যাটাস বার্তা (Custom Status) <span className="text-emerald-400">*</span>
            </label>
            <input
              type="text"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              placeholder="যেমন: কাজের ডেস্কে আছি 📋, জরুরি মিটিংয়ে ব্যস্ত..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white text-xs px-3.5 py-2.5 rounded-xl focus:outline-none transition"
            />

            {/* Quick Status Chips */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] text-slate-500 font-semibold">কুইক সিলেক্ট:</span>
              {QUICK_STATUS_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setFormData({ ...formData, status: preset })}
                  className="text-[10px] bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 px-2 py-1 rounded-lg transition"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Role (Editable by Admin, View-only for Regular Members) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>নির্ধারিত রোল / পদবি</span>
                {isAdmin ? (
                  <span className="text-[10px] text-indigo-400 font-bold">অ্যাডমিন এডিটেবল</span>
                ) : (
                  <span className="text-[10px] text-slate-500">লক করা</span>
                )}
              </label>

              {isAdmin ? (
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="w-full bg-slate-950/60 border border-slate-800 text-slate-400 text-xs px-3.5 py-2.5 rounded-xl flex items-center justify-between">
                  <span>{formData.role}</span>
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                মোবাইল ফোন নম্বর
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+880 1700-000000"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white text-xs px-3.5 py-2.5 rounded-xl focus:outline-none transition"
              />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              বায়োগ্রাফি ও কাজের বিবরণ
            </label>
            <textarea
              rows={3}
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="আপনার অফিস ভূমিকা ও দায়িত্বের সংক্ষিপ্ত পরিচয়..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white text-xs p-3 rounded-xl focus:outline-none transition resize-none"
            />
          </div>

          {/* Avatar Emoji Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              এভারটার ইমোজি
            </label>
            <div className="flex items-center gap-2 flex-wrap bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              {PRESET_AVATARS.map((av) => (
                <button
                  key={av.emoji}
                  type="button"
                  onClick={() => setFormData({ ...formData, avatar_emoji: av.emoji })}
                  className={`text-xl p-2 rounded-xl border transition ${
                    formData.avatar_emoji === av.emoji
                      ? 'bg-indigo-600/30 border-indigo-500 scale-110 shadow'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                  title={av.label}
                >
                  {av.emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              disabled={updating}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
            >
              বাতিল
            </button>

            <button
              type="submit"
              disabled={updating}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center gap-2 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{updating ? 'সংরক্ষণ হচ্ছে...' : 'পরিবর্তন সংরক্ষণ করুন'}</span>
            </button>
          </div>
        </form>
      )}

      {/* MODAL: REMOVE USER CONFIRMATION (Admin Exclusive) */}
      {removingUserConfirm && (
        <div className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-rose-800/60 rounded-2xl p-6 w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-150 space-y-4">
            
            <div className="p-3 bg-rose-500/20 text-rose-400 rounded-2xl border border-rose-500/30 w-fit">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">অ্যাপ্লিকেশন থেকে ইউজার রিমুভ নিশ্চিতকরণ</h3>
              <p className="text-xs text-slate-300">
                আপনি কি নিশ্চিতভাবে <span className="text-rose-400 font-bold">{activeProfile.full_name}</span> ({activeProfile.email}) কে অফিস মেসেঞ্জার থেকে সম্পূর্ণভাবে অপসারণ করতে চান?
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRemovingUserConfirm(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
              >
                বাতিল করুন
              </button>

              <button
                type="button"
                onClick={handleRemoveUserFromApp}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/30 transition flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>হ্যাঁ, রিমুভ করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
