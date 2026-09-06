import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth, DEFAULT_ADMIN_ACCOUNT, isChiefAdminEmail } from '../context/AuthContext';
import { appwrite as supabase } from '../lib/appwrite';
import {
  Users,
  Shield,
  Search,
  SlidersHorizontal,
  FolderPlus,
  Trash2,
  Edit3,
  Key,
  Eye,
  MessageSquare,
  Copy,
  CheckCircle,
  AlertTriangle,
  X,
  Plus,
  Briefcase,
  ExternalLink,
  Lock,
  Mail,
  Phone,
  RefreshCw,
  UserX,
  Camera,
  Check,
  Ban,
  Activity,
  UserCheck,
  Share2,
  Sparkles
} from 'lucide-react';

const DEFAULT_OFFICE_GROUPS = [
  {
    id: 'grp_office_updates',
    name: 'অফিস কাজের সার্বিক আপডেট',
    desc: 'অফিসের প্রতিদিনের কাজের সার্বিক আপডেট ও রিপোর্ট শেয়ারিং গ্রুপ',
    emoji: '💼',
    createdBy: 'redgreenonline2023@gmail.com',
    members: ['ALL'],
    createdAt: new Date().toISOString()
  }
];

const GROUP_PRESET_EMOJIS = ['💼', '🚀', '🔥', '🏢', '💡', '🛡️', '📊', '💻', '🎯', '✨', '☕', '📢', '📱', '🎨'];

const ROLE_OPTIONS = [
  'অফিস মেম্বার',
  'মডারেটর / টিম লিড',
  'অ্যাডমিন / কমিউনিটি প্রধান',
  'এইচআর ও অপারেশনস',
  'সফটওয়্যার ইঞ্জিনিয়ার',
  'ডিজাইনার ও ক্রিয়েটিভ'
];

export default function MembersPage() {
  const router = useRouter();
  const {
    user,
    isAdmin,
    isModerator,
    getRegisteredUsers,
    removeMemberFromApp,
    adminUpdateUserProfile,
    resetMemberPassword,
    suspendMember,
    reactivateMember,
    approveMember
  } = useAuth();

  // Active view tab
  const [activeTab, setActiveTab] = useState('members'); // 'members' | 'groups'

  // Members state
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [presenceFilter, setPresenceFilter] = useState('ALL');

  // Groups state
  const [officeGroups, setOfficeGroups] = useState(DEFAULT_OFFICE_GROUPS);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null); // group object when modifying members
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupEmoji, setNewGroupEmoji] = useState('💼');
  const [newGroupAvatarUrl, setNewGroupAvatarUrl] = useState(null);
  const [selectedMembersForGroup, setSelectedMembersForGroup] = useState([]);
  const [createGroupLoading, setCreateGroupLoading] = useState(false);
  const groupAvatarFileRef = useRef(null);

  // Modals state
  const [inspectUser, setInspectUser] = useState(null);
  const [removingUser, setRemovingUser] = useState(null);
  const [removeLoading, setRemoveLoading] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);

  // Role Edit Modal
  const [editingRoleUser, setEditingRoleUser] = useState(null);
  const [editRoleValue, setEditRoleValue] = useState('অফিস মেম্বার');
  const [savingRole, setSavingRole] = useState(false);

  // Toast / notification
  const [toast, setToast] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Load Registered Members
  const loadMembers = async (silent = false) => {
    if (!silent) setLoadingUsers(true);
    try {
      const data = await getRegisteredUsers();
      setUsersList(data || []);
    } catch (e) {
      console.error('Failed to load members:', e);
      if (!silent) showToast('মেম্বার তালিকা লোড করতে সমস্যা হয়েছে', 'error');
    } finally {
      if (!silent) setLoadingUsers(false);
    }
  };

  // Load Office Groups
  const loadGroups = () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('rg_custom_groups');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setOfficeGroups(parsed);
            return;
          }
        } catch (e) {}
      }
      setOfficeGroups(DEFAULT_OFFICE_GROUPS);
    }
  };

  useEffect(() => {
    loadMembers();
    loadGroups();

    // Auto-refresh periodically for real-time member updates
    const timer = setInterval(() => {
      loadMembers(true);
    }, 4000);

    const handleUserUpdate = () => loadMembers(true);
    const handleGroupsUpdate = () => loadGroups();

    if (typeof window !== 'undefined') {
      window.addEventListener('rg_user_updated', handleUserUpdate);
      window.addEventListener('rg_member_removed', handleUserUpdate);
      window.addEventListener('rg_groups_updated', handleGroupsUpdate);
      window.addEventListener('storage', handleGroupsUpdate);
    }

    return () => {
      clearInterval(timer);
      if (typeof window !== 'undefined') {
        window.removeEventListener('rg_user_updated', handleUserUpdate);
        window.removeEventListener('rg_member_removed', handleUserUpdate);
        window.removeEventListener('rg_groups_updated', handleGroupsUpdate);
        window.removeEventListener('storage', handleGroupsUpdate);
      }
    };
  }, []);

  // Filtered members
  const filteredUsers = usersList.filter((u) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      u.name?.toLowerCase().includes(q) ||
      u.nickname?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q);

    const matchesRole =
      roleFilter === 'ALL' ||
      (roleFilter === 'ADMIN' && (u.role?.toLowerCase().includes('admin') || u.role?.toLowerCase().includes('অ্যাডমিন'))) ||
      (roleFilter === 'MODERATOR' && (u.role?.toLowerCase().includes('মডারেটর') || u.role?.toLowerCase().includes('লিড'))) ||
      (roleFilter === 'MEMBER' && (u.role?.toLowerCase().includes('মেম্বার') || u.role?.toLowerCase().includes('সদস্য'))) ||
      (roleFilter === 'ENGINEER' && (u.role?.toLowerCase().includes('ইঞ্জিনিয়ার') || u.role?.toLowerCase().includes('ডেভলপার')));

    const matchesPresence =
      presenceFilter === 'ALL' ||
      (presenceFilter === 'ONLINE' && u.presence === 'online') ||
      (presenceFilter === 'BUSY' && u.presence === 'busy') ||
      (presenceFilter === 'AWAY' && u.presence === 'away');

    return matchesQuery && matchesRole && matchesPresence;
  });

  // Copy app link for coworkers
  const handleCopyInviteLink = () => {
    if (typeof window !== 'undefined') {
      const inviteUrl = `${window.location.origin}/login`;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(inviteUrl);
        setCopiedLink(true);
        showToast('অফিস লগইন ও রেজিস্ট্রেশন লিংক কপি করা হয়েছে!');
        setTimeout(() => setCopiedLink(false), 3000);
      }
    }
  };

  // Delete Member Confirm
  const handleConfirmRemove = async () => {
    if (!removingUser) return;
    setRemoveLoading(true);
    try {
      const res = await removeMemberFromApp(removingUser.id, removingUser.email);
      if (res.success) {
        showToast(res.message);
        setRemovingUser(null);
        await loadMembers();
        loadGroups();
      } else {
        showToast(res.message || 'মেম্বার ডিলিট করা সম্ভব হয়নি', 'error');
      }
    } catch (e) {
      showToast('মেম্বার রিমুভ করতে ত্রুটি হয়েছে', 'error');
    } finally {
      setRemoveLoading(false);
    }
  };

  // Reset Password Confirm
  const handleConfirmResetPassword = async (e) => {
    e.preventDefault();
    if (!resetPasswordUser || !newPasswordInput) return;
    if (newPasswordInput.length < 6) {
      showToast('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে', 'error');
      return;
    }
    setResetSubmitting(true);
    try {
      const res = await resetMemberPassword(resetPasswordUser.email, newPasswordInput);
      if (res.success) {
        showToast(`"${resetPasswordUser.name}" এর নতুন পাসওয়ার্ড সেট করা হয়েছে!`);
        setResetPasswordUser(null);
        setNewPasswordInput('');
      } else {
        showToast(res.message, 'error');
      }
    } catch (e) {
      showToast('পাসওয়ার্ড রিসেট ব্যর্থ হয়েছে', 'error');
    } finally {
      setResetSubmitting(false);
    }
  };

  // Save updated role
  const handleSaveRole = async (e) => {
    e.preventDefault();
    if (!editingRoleUser) return;
    setSavingRole(true);
    try {
      const res = await adminUpdateUserProfile(editingRoleUser.id, editingRoleUser.email, {
        role: editRoleValue
      });
      if (res.success) {
        showToast(`"${editingRoleUser.name}" এর পদবি সফলভাবে পরিবর্তন হয়েছে!`);
        setEditingRoleUser(null);
        await loadMembers();
      } else {
        showToast(res.message || 'পদবি আপডেট করতে ব্যর্থ', 'error');
      }
    } catch (e) {
      showToast('পদবি আপডেটে ত্রুটি হয়েছে', 'error');
    } finally {
      setSavingRole(false);
    }
  };

  // Create Group
  const handleCreateGroupSubmit = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      showToast('গ্রুপের নাম প্রদান করুন', 'error');
      return;
    }

    setCreateGroupLoading(true);
    try {
      const currentAdminEmail = user?.email || DEFAULT_ADMIN_ACCOUNT.email;
      const membersToInclude = Array.from(new Set([currentAdminEmail, ...selectedMembersForGroup]));

      const newGroupId = 'grp_' + Date.now();
      const newGroup = {
        id: newGroupId,
        name: newGroupName.trim(),
        desc: newGroupDesc.trim() || 'অফিস প্রজেক্ট গ্রুপ',
        emoji: newGroupEmoji || '💼',
        avatarUrl: newGroupAvatarUrl || null,
        createdBy: currentAdminEmail,
        createdByName: user?.name || 'চিফ অ্যাডমিন',
        members: membersToInclude,
        createdAt: new Date().toISOString()
      };

      const updated = [...officeGroups.filter(g => g.id !== newGroupId), newGroup];
      setOfficeGroups(updated);
      if (typeof window !== 'undefined') {
        localStorage.setItem('rg_custom_groups', JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('rg_groups_updated', { detail: updated }));
      }

      // Initialize room message in database
      try {
        await supabase.from('messages').insert([
          {
            room: newGroupId,
            sender: 'সিস্টেম অ্যাডমিন',
            content: JSON.stringify({
              text: `🎉 "${newGroup.name}" নতুন কাজের গ্রুপ তৈরি হয়েছে!\nঅ্যাডমিন কর্তৃক নির্বাচিত ${membersToInclude.length} জন সদস্যের সাথে গ্রুপ সক্রিয় করা হলো।`,
              isSystem: true,
              isGroupInit: true,
              groupName: newGroup.name,
              groupId: newGroupId,
              membersCount: membersToInclude.length,
              createdBy: user?.name || 'চিফ অ্যাডমিন'
            }),
            created_at: new Date().toISOString()
          }
        ]);
      } catch (dbErr) {
        console.warn('Group room insert fallback:', dbErr);
      }

      showToast(`"${newGroup.name}" গ্রুপ সফলভাবে তৈরি হয়েছে!`);
      setIsCreateGroupOpen(false);
      setNewGroupName('');
      setNewGroupDesc('');
      setNewGroupEmoji('💼');
      setNewGroupAvatarUrl(null);
      setSelectedMembersForGroup([]);
    } catch (err) {
      showToast('গ্রুপ তৈরিতে সমস্যা হয়েছে', 'error');
    } finally {
      setCreateGroupLoading(false);
    }
  };

  // Save changes to existing group's members
  const handleSaveGroupMembers = (groupId) => {
    const updated = officeGroups.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          members: selectedMembersForGroup
        };
      }
      return g;
    });

    setOfficeGroups(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('rg_custom_groups', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('rg_groups_updated', { detail: updated }));
    }
    showToast('গ্রুপ মেম্বার তালিকা সফলভাবে আপডেট হয়েছে!');
    setEditingGroup(null);
  };

  // Delete Group
  const handleDeleteGroup = (groupId) => {
    if (groupId === 'grp_office_updates') {
      showToast('ডিফল্ট সার্বিক আপডেট গ্রুপটি ডিলিট করা যাবে না', 'error');
      return;
    }
    const filtered = officeGroups.filter(g => g.id !== groupId);
    setOfficeGroups(filtered);
    if (typeof window !== 'undefined') {
      localStorage.setItem('rg_custom_groups', JSON.stringify(filtered));
      window.dispatchEvent(new CustomEvent('rg_groups_updated', { detail: filtered }));
    }
    showToast('গ্রুপটি সফলভাবে মুছে ফেলা হয়েছে!');
  };

  // Toggle select all members for group
  const handleToggleSelectAll = () => {
    const allEmails = usersList.map(u => u.email).filter(Boolean);
    if (selectedMembersForGroup.length === allEmails.length) {
      setSelectedMembersForGroup([]);
    } else {
      setSelectedMembersForGroup(allEmails);
    }
  };

  // Custom group avatar upload
  const handleGroupAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setNewGroupAvatarUrl(ev.target.result);
      showToast('গ্রুপের ছবি লোড হয়েছে!');
    };
    reader.readAsDataURL(file);
  };

  const isChiefAdmin = user ? isChiefAdminEmail(user.email) : false;
  const canManage = isChiefAdmin || isAdmin;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6" id="members-page-container">
      
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border text-sm font-semibold transition animate-in fade-in slide-in-from-bottom-5 duration-200 ${
            toast.type === 'error'
              ? 'bg-rose-950/90 border-rose-700 text-rose-200'
              : 'bg-emerald-950/90 border-emerald-700 text-emerald-200'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          )}
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)} className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider font-mono flex items-center gap-1.5 shadow-sm">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                অফিস মেম্বার ও টিম সিস্টেম
              </span>
              {canManage && (
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  চিফ অ্যাডমিন কন্ট্রোল সক্রিয়
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <span>সদস্য তালিকা ও কাজের গ্রুপসমূহ</span>
            </h1>

            <p className="text-slate-300 text-xs md:text-sm max-w-2xl leading-relaxed">
              আপনার অফিসের সহকর্মীদের সাথে সংযোগ স্থাপন করুন, গ্রুপ গঠন করে নির্দিষ্ট প্রজেক্টে যুক্ত করুন অথবা প্রয়োজনে মেম্বার অ্যাক্সেস নিয়ন্ত্রণ করুন।
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <button
              onClick={() => {
                loadMembers();
                loadGroups();
                showToast('তথ্য রিফ্রেশ করা হয়েছে');
              }}
              disabled={loadingUsers}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2 font-bold transition active:scale-95 shadow-md"
              title="মেম্বার তালিকা রিফ্রেশ করুন"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${loadingUsers ? 'animate-spin' : ''}`} />
              <span>রিফ্রেশ</span>
            </button>

            {canManage && (
              <button
                onClick={() => {
                  setSelectedMembersForGroup([]);
                  setIsCreateGroupOpen(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 font-bold transition shadow-lg shadow-indigo-600/30 active:scale-95"
              >
                <FolderPlus className="w-4 h-4" />
                <span>নতুন গ্রুপ তৈরি করুন</span>
              </button>
            )}

            <Link
              href="/"
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2 font-bold transition"
            >
              <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
              <span>মেসেঞ্জারে যান</span>
            </Link>
          </div>
        </div>

        {/* Coworker Invite Link Share Box */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Share2 className="w-4 h-4 text-indigo-400" />
              <span>সহকর্মীদের যুক্ত করার ভেরসেল / অ্যাপ লিংক:</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed max-w-2xl">
              সহকর্মীদের এই লিংকটি দিন। তারা তাদের জিমেইল এবং নিজস্ব পাসওয়ার্ড দিয়ে সাইনআপ বা লগইন করলেই তাদের নিজস্ব প্রোফাইল স্বয়ংক্রিয়ভাবে তৈরি হবে এবং নিচের মেম্বার লিস্টে তাদের নাম যোগ হয়ে যাবে।
            </p>
          </div>

          <button
            type="button"
            onClick={handleCopyInviteLink}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shrink-0 transition active:scale-95 ${
              copiedLink
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white border border-indigo-500/40'
            }`}
          >
            {copiedLink ? <CheckCircle className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
            <span>{copiedLink ? 'কপি সম্পন্ন!' : 'ইনভাইট লিংক কপি করুন'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">মোট মেম্বার সংখ্যা</span>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white">{usersList.length}</p>
          <p className="text-[11px] text-slate-500">নিবন্ধিত অফিস সদস্য</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">লাইভ ও অনলাইন</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-400">
            {usersList.filter(u => u.presence === 'online').length}
          </p>
          <p className="text-[11px] text-emerald-500/80">সরাসরি অ্যাক্টিভ মেম্বার</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">কাজের গ্রুপসমূহ</span>
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-purple-300">{officeGroups.length}</p>
          <p className="text-[11px] text-slate-500">সক্রিয় টিম ও প্রজেক্ট গ্রুপ</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">আপনার ভূমিকা</span>
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <p className="text-base font-extrabold text-indigo-300 truncate">
            {canManage ? '👑 চিফ অ্যাডমিন' : user?.role || 'অফিস মেম্বার'}
          </p>
          <p className="text-[11px] text-slate-500">
            {canManage ? 'পূর্ণ ডিলিট ও গ্রুপ ক্ষমতা' : 'চ্যাট ও মেম্বার এক্সেস'}
          </p>
        </div>
      </div>

      {/* Main Tabs Header */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-1">
        <button
          onClick={() => setActiveTab('members')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'members'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>মেম্বার তালিকা ({usersList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('groups')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'groups'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>কাজের গ্রুপসমূহ ({officeGroups.length})</span>
        </button>
      </div>

      {/* TAB 1: MEMBERS DIRECTORY */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          
          {/* Search & Filter Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="নাম, ইমেইল বা পদবি দিয়ে খুঁজুন..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white text-xs pl-9 pr-4 py-2.5 rounded-xl focus:outline-none transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3 text-indigo-400" />
                ফিল্টার:
              </span>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold"
              >
                <option value="ALL">সকল রোল ({usersList.length})</option>
                <option value="ADMIN">অ্যাডমিন</option>
                <option value="MODERATOR">মডারেটর</option>
                <option value="MEMBER">সাধারণ মেম্বার</option>
                <option value="ENGINEER">ইঞ্জিনিয়ার</option>
              </select>

              <select
                value={presenceFilter}
                onChange={(e) => setPresenceFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold"
              >
                <option value="ALL">সকল প্রেজেন্স</option>
                <option value="ONLINE">শুধুমাত্র অনলাইন</option>
                <option value="BUSY">ব্যস্ত</option>
                <option value="AWAY">বাইরে</option>
              </select>
            </div>
          </div>

          {/* Members Table */}
          {loadingUsers ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
              <p className="text-sm text-slate-400 font-medium">মেম্বার তালিকা লোড হচ্ছে...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="bg-slate-900 border border-dashed border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <UserX className="w-10 h-10 text-slate-500 mx-auto" />
              <h3 className="text-base font-bold text-white">কোনো মেম্বার পাওয়া যায়নি</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchQuery ? `"${searchQuery}" এর জন্য কোনো মেম্বার মেলেনি।` : 'ডিরেক্টরিতে কোনো ইউজার নেই।'}
              </p>
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-xs text-indigo-400 hover:underline font-bold">
                  সার্চ রিসেট করুন
                </button>
              )}
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                      <th className="py-3.5 px-4">মেম্বার ও পরিচয়</th>
                      <th className="py-3.5 px-4">ইমেইল ও যোগাযোগ</th>
                      <th className="py-3.5 px-4">নির্ধারিত রোল</th>
                      <th className="py-3.5 px-4">স্ট্যাটাস ও প্রেজেন্স</th>
                      <th className="py-3.5 px-4 text-right">অ্যাকশন ও কন্ট্রোল</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-xs">
                    {filteredUsers.map((usr, idx) => {
                      const isRootAdmin = isChiefAdminEmail(usr.email);
                      const isSelf = user?.email?.toLowerCase() === usr.email?.toLowerCase();

                      return (
                        <tr key={usr.email ? `mem_row_${usr.email}` : (usr.id ? `mem_row_${usr.id}` : `mem_row_${idx}`)} className="hover:bg-slate-800/40 transition">
                          
                          {/* Avatar & Name */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                {usr.custom_avatar_url || usr.avatar_url ? (
                                  <img
                                    src={usr.custom_avatar_url || usr.avatar_url}
                                    alt={usr.name}
                                    className="w-10 h-10 rounded-xl object-cover border border-slate-700 shadow"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl shadow-inner">
                                    {usr.avatar_emoji || '🧑‍💻'}
                                  </div>
                                )}
                                <span
                                  className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
                                    usr.presence === 'online'
                                      ? 'bg-emerald-500'
                                      : usr.presence === 'busy'
                                      ? 'bg-rose-500'
                                      : usr.presence === 'away'
                                      ? 'bg-amber-500'
                                      : 'bg-slate-500'
                                  }`}
                                  title={usr.presence || 'offline'}
                                />
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="font-bold text-white truncate text-sm">{usr.name || 'ইউজার'}</p>
                                  {isRootAdmin && (
                                    <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded font-mono font-bold">
                                      চিফ অ্যাডমিন
                                    </span>
                                  )}
                                  {isSelf && (
                                    <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/40 px-1.5 py-0.2 rounded font-mono font-bold">
                                      আপনি
                                    </span>
                                  )}
                                </div>
                                {usr.nickname && (
                                  <p className="text-[11px] text-slate-400 truncate">ডাকনাম: {usr.nickname}</p>
                                )}
                                {usr.bio && (
                                  <p className="text-[10px] text-slate-500 truncate max-w-xs">{usr.bio}</p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Email & Phone */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-slate-300 font-mono text-[11px]">
                                <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                <span className="truncate max-w-[180px]">{usr.email || '—'}</span>
                              </div>
                              {usr.phone && (
                                <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                                  <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                  <span>{usr.phone}</span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Role */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                                usr.role?.toLowerCase().includes('admin') || usr.role?.toLowerCase().includes('অ্যাডমিন')
                                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                                  : usr.role?.toLowerCase().includes('মডারেটর') || usr.role?.toLowerCase().includes('লিড')
                                  ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40'
                                  : 'bg-slate-800 text-slate-300 border-slate-700'
                              }`}
                            >
                              <Shield className="w-3 h-3" />
                              {usr.role || 'অফিস মেম্বার'}
                            </span>
                          </td>

                          {/* Status & Presence */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1 max-w-[200px]">
                              {usr.status ? (
                                <p className="text-[11px] text-slate-200 font-medium truncate bg-slate-950/80 px-2 py-1 rounded-lg border border-slate-800">
                                  {usr.status}
                                </p>
                              ) : (
                                <span className="text-[11px] text-slate-500 italic block">কোনো স্ট্যাটাস নেই</span>
                              )}
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    usr.presence === 'online'
                                      ? 'bg-emerald-400'
                                      : usr.presence === 'busy'
                                      ? 'bg-rose-400'
                                      : 'bg-slate-500'
                                  }`}
                                />
                                <span className="capitalize">{usr.presence || 'offline'}</span>
                              </div>
                            </div>
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              
                              {/* Direct Chat in Messenger */}
                              {!isSelf && (
                                <Link
                                  href={`/?chatWith=${encodeURIComponent(usr.email)}`}
                                  className="p-2 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-xl border border-blue-500/30 transition active:scale-95"
                                  title="সরাসরি চ্যাট করুন"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </Link>
                              )}

                              {/* Inspect Profile */}
                              <button
                                onClick={() => setInspectUser(usr)}
                                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition"
                                title="প্রোফাইল দেখুন"
                              >
                                <Eye className="w-3.5 h-3.5 text-indigo-400" />
                              </button>

                              {/* Admin Features */}
                              {canManage && (
                                <>
                                  {/* Edit Role */}
                                  <button
                                    onClick={() => {
                                      setEditingRoleUser(usr);
                                      setEditRoleValue(usr.role || 'অফিস মেম্বার');
                                    }}
                                    className="p-2 bg-indigo-950/40 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-xl border border-indigo-700/50 transition"
                                    title="পদবি পরিবর্তন করুন"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Reset Password */}
                                  <button
                                    onClick={() => {
                                      setResetPasswordUser(usr);
                                      setNewPasswordInput('');
                                    }}
                                    className="p-2 bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 rounded-xl border border-slate-700 transition"
                                    title="পাসওয়ার্ড রিসেট করুন"
                                  >
                                    <Key className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Delete Member (Chief Admin Power) */}
                                  {isRootAdmin ? (
                                    <span
                                      className="p-2 text-slate-600 cursor-not-allowed rounded-xl border border-slate-800"
                                      title="চিফ অ্যাডমিন সুরক্ষিত"
                                    >
                                      <Lock className="w-3.5 h-3.5" />
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => setRemovingUser(usr)}
                                      className="p-2 bg-rose-950/40 hover:bg-rose-600 text-rose-300 hover:text-white rounded-xl border border-rose-700/40 transition active:scale-95"
                                      title="অ্যাপ থেকে ইউজার ডিলিট করুন"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="p-3 bg-slate-950/70 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>মোট মেম্বার প্রদর্শিত: {filteredUsers.length} জন</span>
                {canManage && (
                  <span className="text-[11px] text-indigo-400 font-semibold">
                    👑 চিফ অ্যাডমিন হিসেবে আপনি যেকোনো মেম্বার ডিলিট ও পাসওয়ার্ড রিসেট করতে পারবেন।
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: GROUPS MANAGEMENT (Create Groups & Add Members) */}
      {activeTab === 'groups' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-purple-400" />
                <span>কাজের গ্রুপসমূহ ও টিম সদস্য</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                বিভিন্ন প্রজেক্ট বা কাজের জন্য আলাদা গ্রুপ তৈরি করুন এবং নির্দিষ্ট মেম্বারদের যুক্ত করুন।
              </p>
            </div>

            {canManage && (
              <button
                onClick={() => {
                  setSelectedMembersForGroup([]);
                  setIsCreateGroupOpen(true);
                }}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-purple-600/30 shrink-0 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>নতুন কাজের গ্রুপ তৈরি করুন</span>
              </button>
            )}
          </div>

          {/* Groups Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {officeGroups.map((grp) => {
              const isDefault = grp.id === 'grp_office_updates';
              const memberCount = (grp.members || []).includes('ALL')
                ? usersList.length
                : (grp.members || []).length;

              return (
                <div
                  key={grp.id}
                  className="bg-slate-900 border border-slate-800 hover:border-purple-500/40 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4 transition group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {grp.avatarUrl ? (
                          <img
                            src={grp.avatarUrl}
                            alt={grp.name}
                            className="w-12 h-12 rounded-2xl object-cover border border-purple-500/40 shadow-md"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-2xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-center text-2xl shadow-inner shrink-0">
                            {grp.emoji || '💼'}
                          </div>
                        )}
                        <div>
                          <h4 className="text-sm font-extrabold text-white group-hover:text-purple-300 transition">
                            {grp.name}
                          </h4>
                          <span className="text-[10px] text-slate-500 font-mono">ID: {grp.id}</span>
                        </div>
                      </div>

                      {canManage && !isDefault && (
                        <button
                          onClick={() => handleDeleteGroup(grp.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                          title="গ্রুপ মুছুন"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed min-h-[36px]">
                      {grp.desc || 'কোনো বিবরণ দেওয়া নেই'}
                    </p>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1.5 font-semibold text-purple-300">
                        <Users className="w-3.5 h-3.5" />
                        {(grp.members || []).includes('ALL') ? `সকল মেম্বার (@ALL - ${memberCount} জন)` : `${memberCount} জন সদস্য`}
                      </span>
                      <span className="font-mono text-[10px] text-slate-500">
                        {new Date(grp.createdAt || Date.now()).toLocaleDateString('bn-BD')}
                      </span>
                    </div>

                    {/* Member Avatars preview */}
                    <div className="flex items-center gap-1 overflow-hidden pt-1">
                      {usersList
                        .filter(u => (grp.members || []).includes('ALL') || (grp.members || []).includes(u.email))
                        .slice(0, 6)
                        .map((m, idx) => (
                          <span
                            key={idx}
                            className="text-sm bg-slate-800 border border-slate-700 rounded-full w-6 h-6 flex items-center justify-center shadow-xs"
                            title={`${m.name} (${m.email})`}
                          >
                            {m.avatar_emoji || '🧑‍💻'}
                          </span>
                        ))}
                      {memberCount > 6 && (
                        <span className="text-[10px] font-bold text-slate-400 pl-1">
                          +{memberCount - 6} জন
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-2 border-t border-slate-800/80">
                    <Link
                      href={`/?room=${grp.id}`}
                      className="flex-1 py-2 bg-purple-600/20 hover:bg-purple-600 text-purple-200 hover:text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-purple-500/30"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>চ্যাট থ্রেড খুলুন</span>
                    </Link>

                    {canManage && !isDefault && (
                      <button
                        onClick={() => {
                          setEditingGroup(grp);
                          setSelectedMembersForGroup(grp.members || []);
                        }}
                        className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition border border-slate-700"
                        title="মেম্বার পরিবর্তন করুন"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE WORK GROUP */}
      {isCreateGroupOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-purple-400">
                <div className="p-2 bg-purple-600/20 rounded-xl border border-purple-500/30">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">নতুন কাজের গ্রুপ তৈরি</h3>
                  <p className="text-[11px] text-slate-400">মেম্বার নির্বাচন করে গ্রুপ চ্যাট শুরু করুন</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateGroupOpen(false)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGroupSubmit} className="space-y-4">
              
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  গ্রুপের নাম <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="যেমন: ডিজাইন টিম, সাপোর্ট টিম, প্রজেক্ট আলফা..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  গ্রুপের উদ্দেশ্য ও বিবরণ
                </label>
                <input
                  type="text"
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="এই গ্রুপের কাজের মূল দায়িত্ব বা বিষয়..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition"
                />
              </div>

              {/* Icon / Avatar */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  গ্রুপের প্রতীক / আইকন
                </label>
                <div className="flex items-center gap-3 p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  {newGroupAvatarUrl ? (
                    <div className="relative">
                      <img
                        src={newGroupAvatarUrl}
                        alt="Group"
                        className="w-12 h-12 rounded-xl object-cover border border-purple-500"
                      />
                      <button
                        type="button"
                        onClick={() => setNewGroupAvatarUrl(null)}
                        className="absolute -top-1 -right-1 p-0.5 bg-rose-600 rounded-full text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-center text-2xl">
                      {newGroupEmoji}
                    </div>
                  )}

                  <div className="flex-1 space-y-1">
                    <input
                      type="file"
                      ref={groupAvatarFileRef}
                      onChange={handleGroupAvatarUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => groupAvatarFileRef.current?.click()}
                      className="w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700"
                    >
                      <Camera className="w-3.5 h-3.5 text-purple-400" />
                      <span>ছবি আপলোড করুন</span>
                    </button>
                    <p className="text-[10px] text-slate-500">অথবা নিচের যেকোনো একটি ইমোজি নির্বাচন করুন</p>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 mt-2 p-1.5 bg-slate-950 rounded-xl border border-slate-800 max-h-20 overflow-y-auto">
                  {GROUP_PRESET_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setNewGroupEmoji(emoji);
                        setNewGroupAvatarUrl(null);
                      }}
                      className={`text-lg p-1 rounded-lg border transition ${
                        !newGroupAvatarUrl && newGroupEmoji === emoji
                          ? 'bg-purple-600/30 border-purple-500 scale-105 shadow'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Member Selection Checkbox List */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-purple-400" />
                    <span>সদস্য নির্বাচন করুন ({selectedMembersForGroup.length} জন নির্বাচিত)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="text-[11px] text-purple-400 hover:underline font-bold"
                  >
                    {selectedMembersForGroup.length === usersList.length ? 'সব আনচেক করুন' : 'সবাইকে যুক্ত করুন'}
                  </button>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-2 max-h-48 overflow-y-auto space-y-1">
                  {usersList.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4">কোনো মেম্বার পাওয়া যায়নি</p>
                  ) : (
                    usersList.map((usr) => {
                      const isChecked = selectedMembersForGroup.includes(usr.email);
                      return (
                        <div
                          key={usr.email}
                          onClick={() => {
                            if (isChecked) {
                              setSelectedMembersForGroup(selectedMembersForGroup.filter(e => e !== usr.email));
                            } else {
                              setSelectedMembersForGroup([...selectedMembersForGroup, usr.email]);
                            }
                          }}
                          className={`flex items-center justify-between p-2 rounded-xl cursor-pointer border transition text-xs ${
                            isChecked
                              ? 'bg-purple-600/20 border-purple-500/60 text-white'
                              : 'bg-slate-900/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <span className="text-lg">{usr.avatar_emoji || '🧑‍💻'}</span>
                            <div className="truncate">
                              <p className="font-bold truncate text-xs">{usr.name}</p>
                              <p className="text-[10px] text-slate-500 truncate">{usr.role || 'মেম্বার'} • {usr.email}</p>
                            </div>
                          </div>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition ${
                              isChecked
                                ? 'bg-purple-600 text-white border-purple-500'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {isChecked ? '✓ যুক্ত' : '+ যোগ করুন'}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateGroupOpen(false)}
                  disabled={createGroupLoading}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
                >
                  বাতিল
                </button>

                <button
                  type="submit"
                  disabled={createGroupLoading || !newGroupName.trim()}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/30 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>{createGroupLoading ? 'গ্রুপ তৈরি হচ্ছে...' : 'গ্রুপ তৈরি করুন'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT GROUP MEMBERS */}
      {editingGroup && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{editingGroup.emoji || '💼'}</span>
                <div>
                  <h3 className="text-base font-bold text-white">"{editingGroup.name}" সদস্য তালিকা পরিবর্তন</h3>
                  <p className="text-[11px] text-slate-400">প্রয়োজনীয় মেম্বার যুক্ত বা বাদ দিন</p>
                </div>
              </div>
              <button onClick={() => setEditingGroup(null)} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-2 max-h-60 overflow-y-auto space-y-1">
              {usersList.map((usr) => {
                const isChecked = selectedMembersForGroup.includes(usr.email);
                return (
                  <div
                    key={usr.email}
                    onClick={() => {
                      if (isChecked) {
                        setSelectedMembersForGroup(selectedMembersForGroup.filter(e => e !== usr.email));
                      } else {
                        setSelectedMembersForGroup([...selectedMembersForGroup, usr.email]);
                      }
                    }}
                    className={`flex items-center justify-between p-2 rounded-xl cursor-pointer border transition text-xs ${
                      isChecked
                        ? 'bg-purple-600/20 border-purple-500/60 text-white'
                        : 'bg-slate-900/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="text-lg">{usr.avatar_emoji || '🧑‍💻'}</span>
                      <div className="truncate">
                        <p className="font-bold truncate text-xs">{usr.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{usr.email}</p>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        isChecked ? 'bg-purple-600 text-white border-purple-500' : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {isChecked ? '✓ যুক্ত' : '+ যোগ করুন'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
              <button
                onClick={() => setEditingGroup(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
              >
                বাতিল
              </button>
              <button
                onClick={() => handleSaveGroupMembers(editingGroup.id)}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/30 transition"
              >
                পরিবর্তন সংরক্ষণ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: REMOVE MEMBER CONFIRMATION (Admin Exclusive) */}
      {removingUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-800/60 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="p-3 bg-rose-500/20 text-rose-400 rounded-2xl border border-rose-500/30 w-fit">
              <UserX className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-white">মেম্বার ডিলিট নিশ্চিতকরণ</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                আপনি কি নিশ্চিতভাবে <span className="text-rose-400 font-bold">{removingUser.name}</span> ({removingUser.email}) কে অফিস মেসেঞ্জার অ্যাপ থেকে স্থায়ীভাবে ডিলিট করতে চান?
              </p>
            </div>

            <div className="p-3 bg-rose-950/30 border border-rose-900/50 rounded-xl text-[11px] text-rose-300 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                ফলাফল:
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-rose-300/80">
                <li>ইউজারের অ্যাকাউন্ট মেম্বার তালিকা থেকে মুছে ফেলা হবে।</li>
                <li>কাজের গ্রুপসমূহ থেকে তার এক্সেস বাতিল হবে।</li>
                <li>ইউজারের বর্তমান লগইন সেশন বাতিল হবে।</li>
              </ul>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRemovingUser(null)}
                disabled={removeLoading}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
              >
                বাতিল করুন
              </button>

              <button
                type="button"
                onClick={handleConfirmRemove}
                disabled={removeLoading}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/30 transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{removeLoading ? 'ডিলিট হচ্ছে...' : 'হ্যাঁ, ডিলিট করুন'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: RESET PASSWORD */}
      {resetPasswordUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400">
                <Key className="w-5 h-5" />
                <h3 className="font-black text-white text-base">পাসওয়ার্ড রিসেট করুন</h3>
              </div>
              <button onClick={() => setResetPasswordUser(null)} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 flex items-center gap-3">
              <span className="text-2xl">{resetPasswordUser.avatar_emoji || '🧑‍💻'}</span>
              <div className="truncate">
                <p className="font-bold text-white text-sm truncate">{resetPasswordUser.name}</p>
                <p className="text-xs text-slate-400 truncate">{resetPasswordUser.email}</p>
              </div>
            </div>

            <form onSubmit={handleConfirmResetPassword} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  নতুন পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর):
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="উদাঃ pass12345"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setNewPasswordInput('rg' + Math.floor(100000 + Math.random() * 900000))}
                    className="absolute right-2 top-2 text-[10px] bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold px-2 py-1 rounded-lg border border-slate-700 transition"
                  >
                    অটো জেনারেট
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResetPasswordUser(null)}
                  disabled={resetSubmitting}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={resetSubmitting || !newPasswordInput.trim()}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-600/20 transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>{resetSubmitting ? 'সেভ হচ্ছে...' : 'নতুন পাসওয়ার্ড সেট করুন'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: EDIT ROLE */}
      {editingRoleUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-indigo-400">
                <Edit3 className="w-5 h-5" />
                <h3 className="font-bold text-white text-base">পদবি ও রোল পরিবর্তন</h3>
              </div>
              <button onClick={() => setEditingRoleUser(null)} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="space-y-4">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center gap-2.5">
                <span className="text-2xl">{editingRoleUser.avatar_emoji || '🧑‍💻'}</span>
                <div className="truncate">
                  <p className="font-bold text-white text-xs truncate">{editingRoleUser.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{editingRoleUser.email}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  নতুন পদবি নির্বাচন করুন:
                </label>
                <select
                  value={editRoleValue}
                  onChange={(e) => setEditRoleValue(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRoleUser(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={savingRole}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
                >
                  {savingRole ? 'সংরক্ষণ হচ্ছে...' : 'পদবি আপডেট করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: INSPECT PROFILE */}
      {inspectUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-white">মেম্বার প্রোফাইল বিস্তারিত</h3>
              <button onClick={() => setInspectUser(null)} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-4 p-4 bg-slate-950 rounded-2xl border border-slate-800">
              {inspectUser.custom_avatar_url || inspectUser.avatar_url ? (
                <img
                  src={inspectUser.custom_avatar_url || inspectUser.avatar_url}
                  alt={inspectUser.name}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-500 shadow-md"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-indigo-950 border-2 border-indigo-500/40 flex items-center justify-center text-3xl shrink-0">
                  {inspectUser.avatar_emoji || '🧑‍💻'}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <h4 className="text-base font-extrabold text-white truncate">{inspectUser.name}</h4>
                <p className="text-xs text-indigo-400 font-semibold">{inspectUser.role || 'অফিস মেম্বার'}</p>
                {inspectUser.nickname && (
                  <p className="text-[11px] text-slate-400">ডাকনাম: {inspectUser.nickname}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-500 font-semibold">ইমেইল:</span>
                <p className="font-mono text-white break-all">{inspectUser.email || '—'}</p>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-500 font-semibold">ফোন নম্বর:</span>
                <p className="text-white">{inspectUser.phone || 'দেওয়া হয়নি'}</p>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 sm:col-span-2">
                <span className="text-slate-500 font-semibold">স্ট্যাটাস:</span>
                <p className="text-indigo-300 font-medium">{inspectUser.status || 'কোনো স্ট্যাটাস নেই'}</p>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 sm:col-span-2">
                <span className="text-slate-500 font-semibold">বায়ো / পরিচয়:</span>
                <p className="text-slate-300 leading-relaxed">{inspectUser.bio || 'কোনো বিবরণ নেই'}</p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
              <Link
                href={`/?chatWith=${encodeURIComponent(inspectUser.email)}`}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>মেসেঞ্জারে চ্যাট করুন</span>
              </Link>
              <button
                onClick={() => setInspectUser(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
