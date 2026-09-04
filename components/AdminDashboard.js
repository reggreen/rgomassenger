import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth, DEFAULT_ADMIN_ACCOUNT } from '../context/AuthContext';
import { appwrite as supabase } from '../lib/appwrite';
import {
  Shield,
  Users,
  Megaphone,
  CheckCircle,
  Trash2,
  UserCheck,
  Key,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  UserX,
  Edit3,
  Search,
  Phone,
  Mail,
  Plus,
  SlidersHorizontal,
  FolderPlus,
  UserPlus,
  X,
  Briefcase,
  Check,
  MessageSquare,
  Clock,
  Eye,
  Camera,
  Activity,
  Send,
  Lock,
  Copy,
  ExternalLink,
  Ban,
  ShieldAlert
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

const GROUP_PRESET_EMOJIS = ['💼', '🚀', '🔥', '🏢', '💡', '🛡️', '📊', '💻', '🎯', '✨', '☕', '📢'];

const ROLE_OPTIONS = [
  'অফিস মেম্বার',
  'মডারেটর / টিম লিড',
  'অ্যাডমিন / কমিউনিটি প্রধান',
  'এইচআর ও অপারেশনস',
  'সফটওয়্যার ইঞ্জিনিয়ার',
  'ডিজাইনার ও ক্রিয়েটিভ'
];

export default function AdminDashboard() {
  const {
    user,
    isAdmin,
    isModerator,
    getRegisteredUsers,
    adminUpdateUserProfile,
    removeMemberFromApp,
    updateUserRole,
    approveMember,
    suspendMember,
    reactivateMember,
    resetMemberPassword
  } = useAuth();

  // Active Tab
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'pending' | 'groups' | 'broadcast'

  // Users Directory States
  const [usersList, setUsersList] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Password Reset Modal
  const [resettingUser, setResettingUser] = useState(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);

  // Inspect / View User Profile Modal
  const [inspectUser, setInspectUser] = useState(null);

  // Edit User Profile Modal
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    nickname: '',
    email: '',
    phone: '',
    role: '',
    bio: '',
    status: '',
    presence: 'online',
    avatar_emoji: '🧑‍💻'
  });
  const [editSaving, setEditSaving] = useState(false);

  // Remove User Confirmation Modal
  const [removingUser, setRemovingUser] = useState(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  // Group Management & Create Group (Admin Exclusive) States
  const [officeGroups, setOfficeGroups] = useState(DEFAULT_OFFICE_GROUPS);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupEmoji, setNewGroupEmoji] = useState('💼');
  const [newGroupAvatarUrl, setNewGroupAvatarUrl] = useState(null);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);
  const [createGroupLoading, setCreateGroupLoading] = useState(false);
  const [createdGroupResult, setCreatedGroupResult] = useState(null);
  const groupAvatarFileInputRef = useRef(null);

  // Broadcast Notice States
  const [broadcastTarget, setBroadcastTarget] = useState('all');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastContent, setBroadcastContent] = useState('');
  const [broadcastUrgent, setBroadcastUrgent] = useState(false);
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);

  // General Toast / Notice
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch registered users
  const loadUsers = async (silent = false) => {
    if (!silent) setUsersLoading(true);
    try {
      const data = await getRegisteredUsers();
      setUsersList(data || []);
    } catch (err) {
      console.error('Load registered users error:', err);
      if (!silent) showToast('ইউজার তালিকা লোড করতে ত্রুটি হয়েছে', 'error');
    } finally {
      if (!silent) setUsersLoading(false);
    }
  };

  // Load Groups from localStorage
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
    loadUsers();
    loadGroups();

    // Auto-poll every 5 seconds for new registration requests across devices
    const pollTimer = setInterval(() => {
      loadUsers(true);
    }, 5000);

    // Listen for custom events
    const handleUserUpdated = () => loadUsers();
    const handleUserRemoved = () => {
      loadUsers();
      loadGroups();
    };
    const handleGroupsUpdated = () => loadGroups();

    if (typeof window !== 'undefined') {
      window.addEventListener('rg_user_updated', handleUserUpdated);
      window.addEventListener('rg_member_removed', handleUserRemoved);
      window.addEventListener('rg_groups_updated', handleGroupsUpdated);
      window.addEventListener('storage', handleGroupsUpdated);
    }

    return () => {
      clearInterval(pollTimer);
      if (typeof window !== 'undefined') {
        window.removeEventListener('rg_user_updated', handleUserUpdated);
        window.removeEventListener('rg_member_removed', handleUserRemoved);
        window.removeEventListener('rg_groups_updated', handleGroupsUpdated);
        window.removeEventListener('storage', handleGroupsUpdated);
      }
    };
  }, []);

  // Filtered Users List
  const filteredUsers = usersList.filter(u => {
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      u.name?.toLowerCase().includes(q) ||
      u.nickname?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q) ||
      u.bio?.toLowerCase().includes(q) ||
      u.status?.toLowerCase().includes(q);

    const matchesRole =
      roleFilter === 'ALL' ||
      (roleFilter === 'ADMIN' && (u.role?.toLowerCase().includes('admin') || u.role?.toLowerCase().includes('অ্যাডমিন'))) ||
      (roleFilter === 'MODERATOR' && (u.role?.toLowerCase().includes('মডারেটর') || u.role?.toLowerCase().includes('লিড'))) ||
      (roleFilter === 'MEMBER' && (u.role?.toLowerCase().includes('মেম্বার') || u.role?.toLowerCase().includes('সদস্য'))) ||
      (roleFilter === 'ENGINEER' && (u.role?.toLowerCase().includes('ইঞ্জিনিয়ার') || u.role?.toLowerCase().includes('ডেভলপার'))) ||
      (roleFilter === 'DESIGNER' && u.role?.toLowerCase().includes('ডিজাইনার'));

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ONLINE' && u.presence === 'online') ||
      (statusFilter === 'BUSY' && u.presence === 'busy') ||
      (statusFilter === 'AWAY' && u.presence === 'away');

    return matchesQuery && matchesRole && matchesStatus;
  });

  // Open Edit User Modal
  const handleOpenEditUser = (usr) => {
    setEditingUser(usr);
    setEditFormData({
      name: usr.name || '',
      nickname: usr.nickname || '',
      email: usr.email || '',
      phone: usr.phone || '',
      role: usr.role || 'অফিস মেম্বার',
      bio: usr.bio || '',
      status: usr.status || '',
      presence: usr.presence || 'online',
      avatar_emoji: usr.avatar_emoji || '🧑‍💻'
    });
  };

  // Submit Admin User Edit
  const handleSaveUserEdit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditSaving(true);
    try {
      const res = await adminUpdateUserProfile(editingUser.id, editingUser.email, {
        name: editFormData.name.trim(),
        nickname: editFormData.nickname.trim(),
        phone: editFormData.phone.trim(),
        role: editFormData.role,
        bio: editFormData.bio.trim(),
        status: editFormData.status.trim(),
        presence: editFormData.presence,
        avatar_emoji: editFormData.avatar_emoji
      });

      if (res.success) {
        showToast(`"${editFormData.name}" এর প্রোফাইল সফলভাবে আপডেট করা হয়েছে!`);
        setEditingUser(null);
        await loadUsers();
      } else {
        showToast(res.message || 'আপডেট ব্যর্থ হয়েছে', 'error');
      }
    } catch (err) {
      console.error('Save user edit error:', err);
      showToast('প্রোফাইল আপডেট করতে সমস্যা হয়েছে', 'error');
    } finally {
      setEditSaving(false);
    }
  };

  // Execute User Removal (Option to remove users from application)
  const handleConfirmRemoveUser = async () => {
    if (!removingUser) return;
    setRemoveLoading(true);
    try {
      const res = await removeMemberFromApp(removingUser.id, removingUser.email);
      if (res.success) {
        showToast(res.message);
        setRemovingUser(null);
        await loadUsers();
      } else {
        showToast(res.message || 'রিমুভ করা সম্ভব হয়নি', 'error');
      }
    } catch (err) {
      console.error('Remove member error:', err);
      showToast('ইউজার রিমুভ করতে ব্যর্থ হয়েছে', 'error');
    } finally {
      setRemoveLoading(false);
    }
  };

  // Member Approval Handler (Admin Exclusive)
  const handleApproveUser = async (targetUser) => {
    try {
      const res = await approveMember(targetUser.id, targetUser.email);
      if (res.success) {
        showToast(res.message);
        await loadUsers();
      } else {
        showToast(res.message, 'error');
      }
    } catch (e) {
      showToast('অনুমোদনে ত্রুটি হয়েছে', 'error');
    }
  };

  // Member Suspend Handler (Admin Exclusive)
  const handleSuspendUser = async (targetUser) => {
    try {
      const res = await suspendMember(targetUser.id, targetUser.email);
      if (res.success) {
        showToast(res.message, 'error');
        await loadUsers();
      } else {
        showToast(res.message, 'error');
      }
    } catch (e) {
      showToast('সাসপেন্ড করতে সমস্যা হয়েছে', 'error');
    }
  };

  // Member Reactivate Handler (Admin Exclusive)
  const handleReactivateUser = async (targetUser) => {
    try {
      const res = await reactivateMember(targetUser.id, targetUser.email);
      if (res.success) {
        showToast(res.message);
        await loadUsers();
      } else {
        showToast(res.message, 'error');
      }
    } catch (e) {
      showToast('সচল করতে ত্রুটি হয়েছে', 'error');
    }
  };

  // Reset Member Password Submit Handler
  const handleConfirmResetPassword = async (e) => {
    e.preventDefault();
    if (!resettingUser || !newPasswordInput) return;
    if (newPasswordInput.length < 6) {
      showToast('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে', 'error');
      return;
    }
    setResetSubmitting(true);
    try {
      const res = await resetMemberPassword(resettingUser.email, newPasswordInput);
      if (res.success) {
        showToast(`"${resettingUser.name}" এর নতুন পাসওয়ার্ড সফলভাবে সেট করা হয়েছে!`);
        setResettingUser(null);
        setNewPasswordInput('');
      } else {
        showToast(res.message, 'error');
      }
    } catch (err) {
      showToast('পাসওয়ার্ড রিসেট করতে সমস্যা হয়েছে', 'error');
    } finally {
      setResetSubmitting(false);
    }
  };

  // Create Group Handler (Exclusively for Admin to select members, name group & initialize persistent thread)
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast('শুধুমাত্র সিস্টেম অ্যাডমিন নতুন গ্রুপ তৈরি করতে পারেন।', 'error');
      return;
    }
    if (!newGroupName.trim()) {
      showToast('গ্রুপের নাম আবশ্যক', 'error');
      return;
    }

    setCreateGroupLoading(true);
    try {
      const currentAdminEmail = user?.email || DEFAULT_ADMIN_ACCOUNT.email;
      const initialMembers = Array.from(new Set([currentAdminEmail, ...selectedGroupMembers]));

      const newGroupId = 'grp_' + Date.now();
      const newGroupObj = {
        id: newGroupId,
        name: newGroupName.trim(),
        desc: newGroupDesc.trim() || 'অফিস প্রজেক্ট ও কাজের গ্রুপ',
        emoji: newGroupEmoji || '💼',
        avatarUrl: newGroupAvatarUrl || null,
        customAvatarUrl: newGroupAvatarUrl || null,
        createdBy: currentAdminEmail,
        createdByName: user?.name || 'চিফ অ্যাডমিন',
        members: initialMembers,
        createdAt: new Date().toISOString()
      };

      // 1. Save locally
      const updatedGroups = [...officeGroups.filter(g => g.id !== newGroupId), newGroupObj];
      setOfficeGroups(updatedGroups);
      if (typeof window !== 'undefined') {
        localStorage.setItem('rg_custom_groups', JSON.stringify(updatedGroups));
        window.dispatchEvent(new CustomEvent('rg_groups_updated', { detail: updatedGroups }));
      }

      // 2. Initialize Persistent Group Chat Thread in Database/Messages
      try {
        await supabase.from('messages').insert([
          {
            room: newGroupId,
            sender: 'সিস্টেম অ্যাডমিন',
            content: JSON.stringify({
              text: `🎉 "${newGroupObj.name}" কাজের গ্রুপ সফলভাবে চালু হয়েছে!\nঅ্যাডমিন কর্তৃক নির্বাচিত মোট ${initialMembers.length} জন সদস্যের সাথে এই চ্যাট থ্রেডটি সক্রিয় করা হলো।`,
              isSystem: true,
              isGroupInit: true,
              groupName: newGroupObj.name,
              groupId: newGroupId,
              membersCount: initialMembers.length,
              createdBy: user?.name || 'চিফ অ্যাডমিন'
            }),
            created_at: new Date().toISOString()
          }
        ]);
      } catch (dbErr) {
        console.warn('Persistent group message initialization fallback:', dbErr);
      }

      setCreatedGroupResult(newGroupObj);
      showToast(`"${newGroupObj.name}" গ্রুপ চ্যাট থ্রেড সফলভাবে শুরু হয়েছে!`);

      // Reset form
      setNewGroupName('');
      setNewGroupDesc('');
      setNewGroupEmoji('💼');
      setNewGroupAvatarUrl(null);
      setSelectedGroupMembers([]);
    } catch (err) {
      console.error('Create group error:', err);
      showToast('গ্রুপ তৈরি করতে সমস্যা হয়েছে', 'error');
    } finally {
      setCreateGroupLoading(false);
    }
  };

  // Group Avatar Upload Handler
  const handleGroupAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setNewGroupAvatarUrl(uploadEvent.target.result);
      showToast('গ্রুপের ছবি আপলোড হয়েছে!');
    };
    reader.readAsDataURL(file);
  };

  // Select all or clear all members for group creation
  const handleToggleSelectAllMembers = () => {
    const nonAdminEmails = usersList.map(u => u.email).filter(Boolean);
    if (selectedGroupMembers.length === nonAdminEmails.length) {
      setSelectedGroupMembers([]);
    } else {
      setSelectedGroupMembers(nonAdminEmails);
    }
  };

  // Delete an existing group
  const handleDeleteGroup = (groupId) => {
    if (!isAdmin) {
      showToast('শুধুমাত্র অ্যাডমিন গ্রুপ মুছে ফেলতে পারেন', 'error');
      return;
    }
    if (groupId === 'grp_office_updates') {
      showToast('ডিফল্ট অফিস আপডেট গ্রুপটি ডিলিট করা যাবে না', 'error');
      return;
    }
    const filtered = officeGroups.filter(g => g.id !== groupId);
    setOfficeGroups(filtered);
    if (typeof window !== 'undefined') {
      localStorage.setItem('rg_custom_groups', JSON.stringify(filtered));
      window.dispatchEvent(new CustomEvent('rg_groups_updated', { detail: filtered }));
    }
    showToast('গ্রুপটি সফলভাবে ডিলিট করা হয়েছে');
  };

  // Send Broadcast Notice
  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastContent.trim()) {
      showToast('শিরোনাম ও নোটিশের বিবরণ পূরণ করুন', 'error');
      return;
    }

    setBroadcastSending(true);
    try {
      const targetRoom = broadcastTarget === 'all' ? 'grp_office_updates' : broadcastTarget;
      await supabase.from('messages').insert([
        {
          room: targetRoom,
          sender: `📢 অফিস নোটিশ [অ্যাডমিন]`,
          content: JSON.stringify({
            title: broadcastTitle.trim(),
            text: broadcastContent.trim(),
            isNotice: true,
            isUrgent: broadcastUrgent,
            author: user?.name || 'অ্যাডমিন',
            timestamp: new Date().toISOString()
          }),
          created_at: new Date().toISOString()
        }
      ]);

      setBroadcastSuccess(true);
      showToast('অফিস নোটিশ সফলভাবে ব্রডকাস্ট করা হয়েছে!');
      setBroadcastTitle('');
      setBroadcastContent('');
      setBroadcastUrgent(false);
      setTimeout(() => setBroadcastSuccess(false), 5000);
    } catch (err) {
      console.error('Broadcast error:', err);
      showToast('নোটিশ পাঠাতে ব্যর্থ হয়েছে', 'error');
    } finally {
      setBroadcastSending(false);
    }
  };

  // Copy helper
  const copyToClipboard = (text, label = 'কপি') => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast(`${label} ক্লিপবোর্ডে কপি করা হয়েছে!`);
    }
  };

  // Calculate quick stats
  const totalUsersCount = usersList.length;
  const adminCount = usersList.filter(u => u.role?.toLowerCase().includes('admin') || u.role?.toLowerCase().includes('অ্যাডমিন')).length;
  const modCount = usersList.filter(u => u.role?.toLowerCase().includes('মডারেটর') || u.role?.toLowerCase().includes('লিড')).length;
  const onlineCount = usersList.filter(u => u.presence === 'online').length;
  const pendingUsers = usersList.filter(
    u => (u.approval_status === 'pending_approval' || u.auth_status === 'pending_approval' || u.status === 'pending_approval') &&
         (u.email || '').toLowerCase() !== 'redgreenonline2023@gmail.com'
  );

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6" id="admin-dashboard-container">
      
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border text-sm font-semibold transition animate-in fade-in slide-in-from-bottom-5 duration-200 ${
            toastMessage.type === 'error'
              ? 'bg-rose-950/90 border-rose-700 text-rose-200'
              : 'bg-emerald-950/90 border-emerald-700 text-emerald-200'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          )}
          <span>{toastMessage.msg}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Admin Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider font-mono flex items-center gap-1.5 shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                চিফ অ্যাডমিন ড্যাশবোর্ড
              </span>
              <span className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                <Activity className="w-3 h-3 text-emerald-400" />
                সিস্টেম অ্যাক্টিভ
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <Shield className="w-8 h-8 text-indigo-400 shrink-0" />
              অফিস অ্যাডমিন ও ইউজার ম্যানেজমেন্ট কন্ট্রোল
            </h1>

            <p className="text-slate-300 text-sm max-w-3xl leading-relaxed">
              অ্যাপ্লিকেশনের সকল নিবন্ধিত ইউজারের প্রোফাইল পর্যবেক্ষণ, ভূমিকা/পদবি নিয়ন্ত্রণ, মেম্বার অপসারণ এবং কাজের গ্রুপ ও নোটিশ সম্পূর্ণ প্রশাসনিক ক্ষমতায় পরিচালনা করুন।
            </p>
          </div>

          {/* Top Quick Actions */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <button
              onClick={() => {
                loadUsers();
                loadGroups();
                showToast('তথ্য রিফ্রেশ করা হয়েছে');
              }}
              disabled={usersLoading}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2 font-bold transition active:scale-95 shadow-md"
              title="তথ্য রিফ্রেশ করুন"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${usersLoading ? 'animate-spin' : ''}`} />
              <span>রিফ্রেশ</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => {
                  setCreatedGroupResult(null);
                  setIsCreateGroupModalOpen(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 font-bold transition shadow-lg shadow-indigo-600/30 active:scale-95"
                title="নতুন গ্রুপ তৈরি করুন"
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

        {/* Chief Admin Security & Approval Control Banner */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>সিস্টেম অ্যাক্সেস কন্ট্রোল:</span>
            <span className="font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-md">
              চিফ অ্যাডমিন নিয়ন্ত্রিত (হার্ড সিকিউরিটি)
            </span>
            <span className="text-slate-500 font-mono text-[11px] hidden sm:inline">
              redgreenonline2023@gmail.com
            </span>
          </div>

          <div className="flex items-center gap-2">
            {pendingUsers.length > 0 ? (
              <button
                onClick={() => setActiveTab('pending')}
                className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl font-bold transition flex items-center gap-1.5 animate-pulse"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>{pendingUsers.length} টি নতুন মেম্বার অনুমোদন অপেক্ষমাণ</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-xl">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>সমস্ত মেম্বার অনুমোদিত ও সক্রিয়</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">মোট নিবন্ধিত ইউজার</span>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white">{totalUsersCount}</p>
          <p className="text-[11px] text-slate-500">অফিস ডিরেক্টরি মেম্বার</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">অনলাইন ও সক্রিয়</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-400">{onlineCount}</p>
          <p className="text-[11px] text-emerald-500/80">লাইভ প্রেজেন্স ডিটেক্টেড</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">অপেক্ষমাণ রিকোয়েস্ট</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-300">{pendingUsers.length}</p>
          <p className="text-[11px] text-slate-500">অনুমোদনের অপেক্ষায়</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">কাজের গ্রুপসমূহ</span>
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-indigo-300">{officeGroups.length}</p>
          <p className="text-[11px] text-slate-500">পারসিস্টেন্ট গ্রুপ থ্রেড</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
            activeTab === 'users'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>নিবন্ধিত ইউজার তালিকা ({filteredUsers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 relative ${
            activeTab === 'pending'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
              : 'bg-slate-900/60 hover:bg-slate-800 text-amber-400 hover:text-amber-300 border border-amber-500/30'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>মেম্বার অনুমোদন</span>
          {pendingUsers.length > 0 && (
            <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
              {pendingUsers.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('groups')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
            activeTab === 'groups'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>অফিস গ্রুপ ম্যানেজমেন্ট ({officeGroups.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('broadcast')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
            activeTab === 'broadcast'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>অফিসিয়াল নোটিশ ব্রডকাস্ট</span>
        </button>
      </div>

      {/* TAB 1: USERS DIRECTORY & PROFILES (Requirement 1) */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          
          {/* Filter and Search Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
            
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="নাম, ইমেইল, পদবি বা ফোন দিয়ে খুঁজুন..."
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

            {/* Filter Pills */}
            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3 text-indigo-400" />
                রোল ফিল্টার:
              </span>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold"
              >
                <option value="ALL">সকল রোল ({usersList.length})</option>
                <option value="ADMIN">অ্যাডমিন</option>
                <option value="MODERATOR">মডারেটর / লিড</option>
                <option value="MEMBER">সাধারণ মেম্বার</option>
                <option value="ENGINEER">সফটওয়্যার ইঞ্জিনিয়ার</option>
                <option value="DESIGNER">ডিজাইনার</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold"
              >
                <option value="ALL">সকল প্রেজেন্স</option>
                <option value="ONLINE">শুধুমাত্র অনলাইন</option>
                <option value="BUSY">ব্যস্ত</option>
                <option value="AWAY">অনুপস্থিত</option>
              </select>
            </div>
          </div>

          {/* Users Table / Cards */}
          {usersLoading ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
              <p className="text-sm text-slate-400 font-medium">ইউজার তালিকা লোড হচ্ছে...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="bg-slate-900 border border-dashed border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <UserX className="w-10 h-10 text-slate-500 mx-auto" />
              <h3 className="text-base font-bold text-white">কোনো ইউজার পাওয়া যায়নি</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchQuery ? `"${searchQuery}" এর জন্য কোনো মেম্বার পাওয়া যায়নি।` : 'ডিরেক্টরিতে কোনো ইউজার নিবন্ধিত নেই।'}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-indigo-400 hover:underline font-bold"
                >
                  সার্চ রিসেট করুন
                </button>
              )}
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                      <th className="py-3.5 px-4">ইউজার ও এভারটার</th>
                      <th className="py-3.5 px-4">ইমেইল ও যোগাযোগ</th>
                      <th className="py-3.5 px-4">রোল ও পারমিশন</th>
                      <th className="py-3.5 px-4">স্ট্যাটাস ও প্রেজেন্স</th>
                      <th className="py-3.5 px-4 text-right">অ্যাডমিন অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-xs">
                    {filteredUsers.map((usr) => {
                      const isChiefAdmin = (usr.email || '').toLowerCase() === 'redgreenonline2023@gmail.com';
                      const isSelf = user?.email?.toLowerCase() === usr.email?.toLowerCase();

                      return (
                        <tr key={usr.email || usr.id} className="hover:bg-slate-800/40 transition">
                          
                          {/* User Avatar & Name */}
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
                                  {isChiefAdmin && (
                                    <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded font-mono font-bold">
                                      রুট চিফ
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
                                {usr.email && (
                                  <button
                                    onClick={() => copyToClipboard(usr.email, 'ইমেইল')}
                                    className="text-slate-500 hover:text-white p-0.5"
                                    title="ইমেইল কপি করুন"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                              {usr.phone && (
                                <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                                  <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                  <span>{usr.phone}</span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Role Badge */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                                  usr.role?.toLowerCase().includes('admin') || usr.role?.toLowerCase().includes('অ্যাডমিন')
                                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                                    : usr.role?.toLowerCase().includes('মডারেটর') || usr.role?.toLowerCase().includes('লিড')
                                    ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40'
                                    : usr.role?.toLowerCase().includes('ইঞ্জিনিয়ার')
                                    ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
                                    : usr.role?.toLowerCase().includes('ডিজাইনার')
                                    ? 'bg-pink-500/15 text-pink-300 border-pink-500/40'
                                    : 'bg-slate-800 text-slate-300 border-slate-700'
                                }`}
                              >
                                <Shield className="w-3 h-3" />
                                {usr.role || 'অফিস মেম্বার'}
                              </span>
                            </div>
                          </td>

                          {/* Status & Presence */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1.5 max-w-[200px]">
                              {/* Account Approval / Security Badge */}
                              <div>
                                {usr.approval_status === 'pending_approval' || usr.auth_status === 'pending_approval' ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    ⏳ অনুমোদন অপেক্ষমাণ
                                  </span>
                                ) : usr.approval_status === 'suspended' ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                    🚫 স্থগিত / সাসপেন্ড
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                    ⚡ অনুমোদিত মেম্বার
                                  </span>
                                )}
                              </div>

                              {usr.status ? (
                                <p className="text-[11px] text-slate-200 font-medium truncate bg-slate-950/80 px-2 py-1 rounded-lg border border-slate-800">
                                  {usr.status}
                                </p>
                              ) : (
                                <span className="text-[11px] text-slate-500 italic block">স্ট্যাটাস সেট নেই</span>
                              )}

                              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    usr.presence === 'online'
                                      ? 'bg-emerald-400'
                                      : usr.presence === 'busy'
                                      ? 'bg-rose-400'
                                      : usr.presence === 'away'
                                      ? 'bg-amber-400'
                                      : 'bg-slate-500'
                                  }`}
                                />
                                <span className="capitalize">{usr.presence || 'offline'}</span>
                              </div>
                            </div>
                          </td>

                          {/* Admin Action Buttons */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              
                              {/* Quick Approve button if pending */}
                              {(usr.approval_status === 'pending_approval' || usr.auth_status === 'pending_approval') && (
                                <button
                                  onClick={() => handleApproveUser(usr)}
                                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center gap-1"
                                  title="অ্যাকাউন্ট অনুমোদন করুন"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>অনুমোদন</span>
                                </button>
                              )}

                              {/* Suspend / Reactivate button for non-chief admin */}
                              {!isChiefAdmin && (
                                <>
                                  {usr.approval_status === 'suspended' ? (
                                    <button
                                      onClick={() => handleReactivateUser(usr)}
                                      className="p-2 bg-emerald-950/40 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-xl border border-emerald-600/40 transition active:scale-95"
                                      title="পুনরায় সচল করুন"
                                    >
                                      <RefreshCw className="w-3.5 h-3.5" />
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleSuspendUser(usr)}
                                      className="p-2 bg-amber-950/40 hover:bg-amber-600 text-amber-300 hover:text-white rounded-xl border border-amber-600/40 transition active:scale-95"
                                      title="অ্যাকাউন্ট সাসপেন্ড করুন"
                                    >
                                      <Ban className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </>
                              )}

                              {/* Reset Member Password */}
                              <button
                                onClick={() => {
                                  setResettingUser(usr);
                                  setNewPasswordInput('');
                                }}
                                className="p-2 bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 rounded-xl border border-slate-700 transition"
                                title="পাসওয়ার্ড রিসেট বা পরিবর্তন করুন"
                              >
                                <Key className="w-3.5 h-3.5" />
                              </button>

                              {/* Inspect Profile */}
                              <button
                                onClick={() => setInspectUser(usr)}
                                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition"
                                title="সম্পূর্ণ প্রোফাইল দেখুন"
                              >
                                <Eye className="w-3.5 h-3.5 text-blue-400" />
                              </button>

                              {/* Edit Profile */}
                              <button
                                onClick={() => handleOpenEditUser(usr)}
                                className="p-2 bg-indigo-950/40 hover:bg-indigo-600/30 text-indigo-300 hover:text-white rounded-xl border border-indigo-700/50 transition"
                                title="প্রোফাইল ও রোল সম্পাদনা করুন"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Remove User (Requirement 1) */}
                              {isChiefAdmin ? (
                                <span
                                  className="p-2 text-slate-600 cursor-not-allowed rounded-xl border border-slate-800"
                                  title="রুট চিফ অ্যাডমিন অ্যাকাউন্ট সুরক্ষিত"
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                </span>
                              ) : (
                                <button
                                  onClick={() => setRemovingUser(usr)}
                                  className="p-2 bg-rose-950/40 hover:bg-rose-600 text-rose-300 hover:text-white rounded-xl border border-rose-700/40 transition active:scale-95"
                                  title="অ্যাপ থেকে ইউজার রিমুভ করুন"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table Footer Summary */}
              <div className="p-3 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>মোট প্রদর্শিত: {filteredUsers.length} জন ইউজার</span>
                <span className="text-[11px] text-slate-500">
                  অ্যাডমিনদের সম্পূর্ণ এডিটিং ও রিমুভ অধিকার রয়েছে
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: PENDING MEMBER APPROVALS (CHIEF ADMIN CONTROL) */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">নতুন মেম্বার রেজিস্ট্রেশন অনুমোদন</h3>
                {pendingUsers.length > 0 && (
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black px-2 py-0.5 rounded-full">
                    {pendingUsers.length} টি রিকোয়েস্ট
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                নিরাপত্তার স্বার্থে নতুন রেজিস্ট্রেশন করা সকল ব্যবহারকারীর অ্যাকাউন্ট ডিফল্টভাবে স্থগিত থাকে। চিফ অ্যাডমিন অনুমোদন দেওয়ার পরেই কেবল ব্যবহারকারী অ্যাপে প্রবেশ করতে পারবেন।
              </p>
            </div>

            <button
              onClick={loadUsers}
              disabled={usersLoading}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs px-3 py-2 rounded-xl flex items-center gap-2 font-bold transition shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${usersLoading ? 'animate-spin' : ''}`} />
              <span>রিফ্রেশ করুন</span>
            </button>
          </div>

          {pendingUsers.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-white">কোনো অপেক্ষমাণ রিকোয়েস্ট নেই</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                বর্তমানে সকল রেজিস্ট্রেশনকৃত মেম্বার ইতিমধ্যে অনুমোদিত। নতুন কোনো ব্যবহারকারী রেজিস্টার করলে সাথে সাথে এই প্যানেলে চলে আসবে।
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingUsers.map((pendingUsr) => (
                <div
                  key={pendingUsr.id || pendingUsr.email}
                  className="bg-slate-900 border border-amber-500/30 rounded-2xl p-5 space-y-4 hover:border-amber-500/50 transition shadow-lg relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full pointer-events-none" />
                  
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl shrink-0">
                        {pendingUsr.avatar_emoji || '🧑‍💻'}
                      </div>
                      <div>
                        <h4 className="text-base font-black text-white">{pendingUsr.name}</h4>
                        <p className="text-xs text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                          <Mail className="w-3.5 h-3.5 text-amber-400" />
                          <span>{pendingUsr.email}</span>
                          <button
                            onClick={() => copyToClipboard(pendingUsr.email, 'ইমেইল')}
                            className="p-1 hover:text-white transition"
                            title="ইমেইল কপি করুন"
                          >
                            <Copy className="w-3 h-3 text-slate-500 hover:text-slate-300" />
                          </button>
                        </p>
                      </div>
                    </div>

                    <span className="bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                      ⏳ অপেক্ষমাণ
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-slate-500 block text-[10px]">পদবি / রোল:</span>
                      <span className="text-slate-200 font-bold">{pendingUsr.role || 'অফিস মেম্বার'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">ফোন নম্বর:</span>
                      <span className="text-slate-300 font-mono text-[11px]">{pendingUsr.phone || 'দেওয়া হয়নি'}</span>
                    </div>
                    {pendingUsr.created_at && (
                      <div className="col-span-2 text-[10px] text-slate-500 flex items-center gap-1 mt-1 border-t border-slate-800/80 pt-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>রেজিস্ট্রেশন তারিখ: {new Date(pendingUsr.created_at).toLocaleDateString('bn-BD', { dateStyle: 'medium' })}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleApproveUser(pendingUsr)}
                      className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-98"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>অনুমোদন দিন ও এক্সেস খুলুন</span>
                    </button>

                    <button
                      onClick={() => setRemovingUser(pendingUsr)}
                      className="py-2.5 px-3 bg-rose-950/40 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-700/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-98"
                      title="বাতিল ও মুছে ফেলুন"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>রিজেক্ট</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: OFFICE GROUPS MANAGEMENT */}
      {activeTab === 'groups' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div>
              <h3 className="text-base font-bold text-white">অফিস কাজের সার্বিক গ্রুপসমূহ</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                অফিসের প্রতিদিনের প্রজেক্ট, টিমভিত্তিক আলোচনা ও কাজের সার্বিক আপডেট থ্রেড।
              </p>
            </div>

            {isAdmin && (
              <button
                onClick={() => {
                  setCreatedGroupResult(null);
                  setIsCreateGroupModalOpen(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 font-bold transition shadow-lg shadow-indigo-600/30 active:scale-95"
              >
                <FolderPlus className="w-4 h-4" />
                <span>নতুন গ্রুপ তৈরি করুন</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {officeGroups.map((grp) => (
              <div
                key={grp.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4 hover:border-indigo-500/40 transition flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {grp.avatarUrl || grp.customAvatarUrl ? (
                        <img
                          src={grp.avatarUrl || grp.customAvatarUrl}
                          alt={grp.name}
                          className="w-12 h-12 rounded-2xl object-cover border border-slate-700 shadow"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center text-2xl shadow-inner shrink-0">
                          {grp.emoji || '💼'}
                        </div>
                      )}
                      <div>
                        <h4 className="text-sm font-extrabold text-white">{grp.name}</h4>
                        <span className="text-[10px] text-slate-400 font-mono">ID: {grp.id}</span>
                      </div>
                    </div>

                    {isAdmin && grp.id !== 'grp_office_updates' && (
                      <button
                        onClick={() => handleDeleteGroup(grp.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                        title="গ্রুপ মুছুন"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{grp.desc || 'কোনো বিবরণ দেওয়া নেই'}</p>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-indigo-400" />
                      {(grp.members || []).includes('ALL')
                        ? 'সকল সদস্য (@ALL)'
                        : `${(grp.members || []).length} জন সদস্য`}
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">
                      {new Date(grp.createdAt || Date.now()).toLocaleDateString('bn-BD')}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <Link
                    href={`/?room=${grp.id}`}
                    className="w-full py-2 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-indigo-500/30"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>গ্রুপ চ্যাট থ্রেডে যান</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: BROADCAST NOTICE */}
      {activeTab === 'broadcast' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-2xl mx-auto space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="p-3 bg-indigo-600/20 text-indigo-400 rounded-2xl border border-indigo-500/30">
              <Megaphone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">অফিসিয়াল নোটিশ ব্রডকাস্ট করুন</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                সকল নিবন্ধিত মেম্বার বা নির্দিষ্ট কোনো কাজের গ্রুপের চ্যাট ফিডে সরাসরি জরুরি নোটিশ পাঠান।
              </p>
            </div>
          </div>

          <form onSubmit={handleSendBroadcast} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                টার্গেট চ্যানেল / কাজের গ্রুপ
              </label>
              <select
                value={broadcastTarget}
                onChange={(e) => setBroadcastTarget(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-indigo-500"
              >
                <option value="all">📢 অফিস কাজের সার্বিক আপডেট (সকল মেম্বার)</option>
                {officeGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.emoji || '💼'} {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                নোটিশের শিরোনাম <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                placeholder="যেমন: জরুরি মিটিং বা কাজের ডেলিভারি আপডেট..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white text-xs px-3.5 py-2.5 rounded-xl focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                নোটিশের বিস্তারিত বিবরণ <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={4}
                required
                value={broadcastContent}
                onChange={(e) => setBroadcastContent(e.target.value)}
                placeholder="এখানে বিস্তারিত নোটিশ লিখুন যা সদস্যদের মেসেঞ্জার চ্যাটরুমে অফিসিয়াল ব্যাজ সহ প্রদর্শিত হবে..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white text-xs p-3.5 rounded-xl focus:outline-none transition resize-none"
              />
            </div>

            <div className="flex items-center gap-2 p-3 bg-slate-950 rounded-xl border border-slate-800">
              <input
                type="checkbox"
                id="urgentNotice"
                checked={broadcastUrgent}
                onChange={(e) => setBroadcastUrgent(e.target.checked)}
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 bg-slate-900 border-slate-700"
              />
              <label htmlFor="urgentNotice" className="text-xs text-slate-300 font-semibold cursor-pointer">
                🚨 এটি একটি অতীব জরুরি নোটিশ (হাই প্রায়োরিটি অ্যালার্ট)
              </label>
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                type="submit"
                disabled={broadcastSending}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{broadcastSending ? 'পাঠানো হচ্ছে...' : 'নোটিশ প্রকাশ করুন'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 1: INSPECT / VIEW USER PROFILE DETAILS (Requirement 1) */}
      {inspectUser && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative animate-in zoom-in-95 duration-150 space-y-5">
            
            <button
              onClick={() => setInspectUser(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="p-3 bg-blue-600/20 text-blue-400 rounded-2xl border border-blue-500/30">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">ব্যবহারকারীর প্রোফাইল বিস্তারিত</h3>
                <p className="text-xs text-slate-400 mt-0.5">অ্যাডমিন প্রোফাইল ভিজিবিলিটি ভিউ</p>
              </div>
            </div>

            {/* Profile Content Card */}
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-slate-950 rounded-2xl border border-slate-800">
                {inspectUser.custom_avatar_url || inspectUser.avatar_url ? (
                  <img
                    src={inspectUser.custom_avatar_url || inspectUser.avatar_url}
                    alt={inspectUser.name}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-500 shadow-md"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-indigo-950 border-2 border-indigo-500/40 flex items-center justify-center text-3xl shadow-inner shrink-0">
                    {inspectUser.avatar_emoji || '🧑‍💻'}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-extrabold text-white truncate">{inspectUser.name}</h4>
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        inspectUser.presence === 'online'
                          ? 'bg-emerald-400'
                          : inspectUser.presence === 'busy'
                          ? 'bg-rose-400'
                          : inspectUser.presence === 'away'
                          ? 'bg-amber-400'
                          : 'bg-slate-500'
                      }`}
                    />
                  </div>
                  <p className="text-xs text-indigo-400 font-semibold">{inspectUser.role || 'অফিস মেম্বার'}</p>
                  {inspectUser.nickname && (
                    <p className="text-[11px] text-slate-400">ডাকনাম: {inspectUser.nickname}</p>
                  )}
                </div>
              </div>

              {/* Detail fields grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-500 font-semibold">ইমেইল এড্রেস:</span>
                  <p className="font-mono text-white break-all">{inspectUser.email || 'উল্লেখ নেই'}</p>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-500 font-semibold">মোবাইল ফোন নম্বর:</span>
                  <p className="text-white">{inspectUser.phone || 'উল্লেখ নেই'}</p>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 sm:col-span-2">
                  <span className="text-slate-500 font-semibold">কাস্টম স্ট্যাটাস বার্তা:</span>
                  <p className="text-indigo-300 font-medium">{inspectUser.status || 'কোনো স্ট্যাটাস দেওয়া নেই'}</p>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 sm:col-span-2">
                  <span className="text-slate-500 font-semibold">বায়োগ্রাফি / পরিচয়:</span>
                  <p className="text-slate-300 leading-relaxed">{inspectUser.bio || 'কোনো বায়ো লেখা হয়নি'}</p>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-500 font-semibold">ইউজার আইডি (UID):</span>
                  <p className="font-mono text-[10px] text-slate-400 truncate">{inspectUser.id || 'usr_auto_registered'}</p>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-500 font-semibold">নিবন্ধনের তারিখ:</span>
                  <p className="text-slate-400 text-[11px]">
                    {new Date(inspectUser.created_at || inspectUser.updated_at || Date.now()).toLocaleDateString('bn-BD')}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-800">
              {/* Remove User Trigger */}
              {(inspectUser.email || '').toLowerCase() !== 'redgreenonline2023@gmail.com' ? (
                <button
                  onClick={() => {
                    const target = inspectUser;
                    setInspectUser(null);
                    setRemovingUser(target);
                  }}
                  className="px-3.5 py-2 bg-rose-950/40 hover:bg-rose-600 text-rose-300 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-rose-800/40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>অ্যাপ থেকে রিমুভ করুন</span>
                </button>
              ) : (
                <span className="text-[11px] text-amber-400 font-semibold">রুট চিফ অ্যাডমিন সুরক্ষিত</span>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const target = inspectUser;
                    setInspectUser(null);
                    handleOpenEditUser(target);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>সম্পাদনা করুন</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInspectUser(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
                >
                  বন্ধ করুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT USER PROFILE (Admin Full Editing Rights) */}
      {editingUser && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl relative animate-in zoom-in-95 duration-150 space-y-5">
            
            <button
              onClick={() => setEditingUser(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="p-3 bg-indigo-600/20 text-indigo-400 rounded-2xl border border-indigo-500/30">
                <Edit3 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">ইউজার প্রোফাইল সম্পাদনা (Admin Rights)</h3>
                <p className="text-xs text-slate-400 mt-0.5">{editingUser.email}</p>
              </div>
            </div>

            <form onSubmit={handleSaveUserEdit} className="space-y-4">
              
              {/* Name & Nickname */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    ডিসপ্লে নাম <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white text-xs px-3.5 py-2.5 rounded-xl focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    ডাকনাম (Nickname)
                  </label>
                  <input
                    type="text"
                    value={editFormData.nickname}
                    onChange={(e) => setEditFormData({ ...editFormData, nickname: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white text-xs px-3.5 py-2.5 rounded-xl focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Role & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    নির্ধারিত পদবি ও রোল <span className="text-indigo-400">*</span>
                  </label>
                  <select
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    ফোন নম্বর
                  </label>
                  <input
                    type="text"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    placeholder="+880 1700-000000"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white text-xs px-3.5 py-2.5 rounded-xl focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Status message & Presence */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    স্ট্যাটাস বার্তা
                  </label>
                  <input
                    type="text"
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    placeholder="যেমন: কাজে ব্যস্ত 🚀"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white text-xs px-3.5 py-2.5 rounded-xl focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    লাইভ প্রেজেন্স স্টেটাস
                  </label>
                  <select
                    value={editFormData.presence}
                    onChange={(e) => setEditFormData({ ...editFormData, presence: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold"
                  >
                    <option value="online">🟢 অনলাইন (Online)</option>
                    <option value="busy">🔴 ব্যস্ত (Busy)</option>
                    <option value="away">🟡 সাময়িক বাইরে (Away)</option>
                    <option value="offline">⚪ অদৃশ্য (Invisible)</option>
                  </select>
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  বায়োগ্রাফি / বিবরণ
                </label>
                <textarea
                  rows={3}
                  value={editFormData.bio}
                  onChange={(e) => setEditFormData({ ...editFormData, bio: e.target.value })}
                  placeholder="ইউজারের ভূমিকা ও দায়িত্বের সংক্ষিপ্ত পরিচয়..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white text-xs p-3.5 rounded-xl focus:outline-none transition resize-none"
                />
              </div>

              {/* Avatar Emoji Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  এভারটার ইমোজি
                </label>
                <div className="flex items-center gap-2 flex-wrap bg-slate-950 p-2 rounded-xl border border-slate-800">
                  {['🧑‍💻', '👨‍💼', '👩‍🎨', '🦁', '🚀', '💻', '🦄', '🔥', '☕', '👑'].map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setEditFormData({ ...editFormData, avatar_emoji: em })}
                      className={`text-xl p-2 rounded-xl border transition ${
                        editFormData.avatar_emoji === em
                          ? 'bg-indigo-600/30 border-indigo-500 scale-110 shadow'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
                >
                  বাতিল
                </button>

                <button
                  type="submit"
                  disabled={editSaving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{editSaving ? 'সংরক্ষণ হচ্ছে...' : 'পরিবর্তন সংরক্ষণ করুন'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: REMOVE USER CONFIRMATION (Requirement 1) */}
      {removingUser && (
        <div className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-rose-800/60 rounded-2xl p-6 w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-150 space-y-4">
            
            <div className="p-3 bg-rose-500/20 text-rose-400 rounded-2xl border border-rose-500/30 w-fit">
              <UserX className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-white">অ্যাপ্লিকেশন থেকে ইউজার রিমুভ নিশ্চিতকরণ</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                আপনি কি নিশ্চিতভাবে <span className="text-rose-400 font-bold">{removingUser.name}</span> ({removingUser.email}) কে সম্পূর্ণ অফিস মেসেঞ্জার অ্যাপ থেকে স্থায়ীভাবে রিমুভ করতে চান?
              </p>
            </div>

            <div className="p-3 bg-rose-950/30 border border-rose-900/50 rounded-xl text-[11px] text-rose-300 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                ফলাফল:
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-rose-300/80">
                <li>ইউজারের অ্যাকাউন্ট ডিরেক্টরি থেকে মুছে ফেলা হবে।</li>
                <li>সকল কাস্টম গ্রুপ ও চ্যাট চ্যানেল থেকে তার সদস্যপদ বাতিল হবে।</li>
                <li>ইউজারের বর্তমান লগইন সেশন বাতিল করা হবে।</li>
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
                onClick={handleConfirmRemoveUser}
                disabled={removeLoading}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/30 transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{removeLoading ? 'রিমুভ হচ্ছে...' : 'হ্যাঁ, রিমুভ করুন'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: CREATE GROUP INTERFACE (Requirement 3 - Admin Exclusive) */}
      {isCreateGroupModalOpen && (
        <div className="fixed inset-0 z-[115] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl relative animate-in zoom-in-95 duration-150 space-y-5">
            
            <button
              onClick={() => setIsCreateGroupModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>

            {createdGroupResult ? (
              /* Success State with link to Persistent Thread */
              <div className="text-center space-y-4 py-4">
                <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-lg">
                  {createdGroupResult.emoji || '🎉'}
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-xl font-extrabold text-white">গ্রুপ ও চ্যাট থ্রেড সক্রিয় হয়েছে!</h3>
                  <p className="text-xs text-slate-300">
                    <span className="text-indigo-400 font-bold">"{createdGroupResult.name}"</span> গ্রুপটি {createdGroupResult.members?.length} জন সদস্য সহ তৈরি হয়েছে এবং ডাটাবেজে পারসিস্টেন্ট চ্যাট থ্রেড চালু করা হয়েছে।
                  </p>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400">
                  <span>গ্রুপ আইডি: </span>
                  <span className="font-mono text-indigo-300 font-bold">{createdGroupResult.id}</span>
                </div>

                <div className="pt-2 flex items-center justify-center gap-3">
                  <button
                    onClick={() => {
                      setCreatedGroupResult(null);
                      setIsCreateGroupModalOpen(false);
                    }}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
                  >
                    ড্যাশবোর্ডে থাকুন
                  </button>

                  <Link
                    href={`/?room=${createdGroupResult.id}`}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>মেসেঞ্জারে চ্যাট থ্রেড খুলুন</span>
                  </Link>
                </div>
              </div>
            ) : (
              /* Form State */
              <>
                <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                  <div className="p-3 bg-indigo-600/20 text-indigo-400 rounded-2xl border border-indigo-500/30">
                    <FolderPlus className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-white">নতুন কাজের গ্রুপ তৈরি করুন</h3>
                      <span className="text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.2 rounded-full font-bold">
                        অ্যাডমিন এক্সক্লুসিভ
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      সদস্য নির্বাচন করুন, নাম নির্ধারণ করুন এবং পারসিস্টেন্ট চ্যাট থ্রেড শুরু করুন।
                    </p>
                  </div>
                </div>

                <form onSubmit={handleCreateGroup} className="space-y-4">
                  
                  {/* Group Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      গ্রুপের নাম <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="যেমন: মোবাইল অ্যাপ ডেভেলপমেন্ট টিম, কিউএ অডিট..."
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white text-xs px-3.5 py-2.5 rounded-xl focus:outline-none transition"
                    />
                  </div>

                  {/* Group Avatar / Emoji */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      গ্রুপের আইকন বা ছবি
                    </label>
                    
                    <div className="flex items-center gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                      {newGroupAvatarUrl ? (
                        <div className="relative">
                          <img
                            src={newGroupAvatarUrl}
                            alt="Group Icon"
                            className="w-14 h-14 rounded-2xl object-cover border-2 border-indigo-500 shadow-md"
                          />
                          <button
                            type="button"
                            onClick={() => setNewGroupAvatarUrl(null)}
                            className="absolute -top-1.5 -right-1.5 p-1 bg-rose-600 hover:bg-rose-500 text-white rounded-full text-xs shadow"
                            title="ছবি মুছুন"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-indigo-950 border-2 border-indigo-500/40 flex items-center justify-center text-3xl shadow-inner shrink-0">
                          {newGroupEmoji || '💼'}
                        </div>
                      )}

                      <div className="space-y-1.5 flex-1">
                        <input
                          type="file"
                          ref={groupAvatarFileInputRef}
                          onChange={handleGroupAvatarUpload}
                          accept="image/*"
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => groupAvatarFileInputRef.current?.click()}
                          className="w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 border border-slate-700"
                        >
                          <Camera className="w-3.5 h-3.5 text-indigo-400" />
                          <span>কাস্টম ছবি আপলোড করুন</span>
                        </button>
                        <p className="text-[10px] text-slate-500">অথবা নিচে থেকে একটি ইমোজি প্রতীক পছন্দ করুন</p>
                      </div>
                    </div>

                    {/* Emoji Presets */}
                    <div className="grid grid-cols-6 gap-1.5 mt-2 p-1 bg-slate-950 rounded-xl border border-slate-800 max-h-24 overflow-y-auto">
                      {GROUP_PRESET_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            setNewGroupEmoji(emoji);
                            setNewGroupAvatarUrl(null);
                          }}
                          className={`text-lg p-1.5 rounded-lg border transition ${
                            !newGroupAvatarUrl && newGroupEmoji === emoji
                              ? 'bg-indigo-600/30 border-indigo-500 scale-105 shadow'
                              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Group Description */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      গ্রুপের উদ্দেশ্য ও বিবরণ
                    </label>
                    <input
                      type="text"
                      value={newGroupDesc}
                      onChange={(e) => setNewGroupDesc(e.target.value)}
                      placeholder="কাজের ক্ষেত্র বা দায়িত্বের সংক্ষিপ্ত বিবরণ..."
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white text-xs px-3.5 py-2.5 rounded-xl focus:outline-none transition"
                    />
                  </div>

                  {/* Member Selection (Requirement 3: Admin to select members) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-indigo-400" />
                        <span>গ্রুপের সদস্য নির্বাচন করুন <span className="text-rose-400">*</span></span>
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleToggleSelectAllMembers}
                          className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold underline"
                        >
                          {selectedGroupMembers.length === usersList.length ? 'সব বাদ দিন' : 'সবাইকে সিলেক্ট করুন (@ALL)'}
                        </button>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                          {selectedGroupMembers.length} জন সিলেক্টেড
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-2 max-h-44 overflow-y-auto space-y-1">
                      {usersList.length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-3">কোনো নিবন্ধিত ইউজার পাওয়া যায়নি</p>
                      ) : (
                        usersList.map((usr) => {
                          const isSelected = selectedGroupMembers.includes(usr.email);
                          return (
                            <div
                              key={usr.email}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedGroupMembers(selectedGroupMembers.filter(e => e !== usr.email));
                                } else {
                                  setSelectedGroupMembers([...selectedGroupMembers, usr.email]);
                                }
                              }}
                              className={`flex items-center justify-between p-2 rounded-xl cursor-pointer border transition text-xs ${
                                isSelected
                                  ? 'bg-indigo-600/20 border-indigo-500/50 text-white'
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
                                  isSelected
                                    ? 'bg-indigo-600 text-white border-indigo-500'
                                    : 'bg-slate-800 text-slate-400 border-slate-700'
                                }`}
                              >
                                {isSelected ? '✅ যুক্ত' : '+ সিলেক্ট'}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsCreateGroupModalOpen(false)}
                      disabled={createGroupLoading}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
                    >
                      বাতিল
                    </button>

                    <button
                      type="submit"
                      disabled={createGroupLoading || !newGroupName.trim()}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{createGroupLoading ? 'গ্রুপ তৈরি হচ্ছে...' : 'গ্রুপ থ্রেড শুরু করুন'}</span>
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Password Reset Modal (Admin Super-Power) */}
      {resettingUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400">
                <Key className="w-5 h-5" />
                <h3 className="font-black text-white text-base">পাসওয়ার্ড রিসেট করুন</h3>
              </div>
              <button
                onClick={() => setResettingUser(null)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 flex items-center gap-3">
              <span className="text-2xl">{resettingUser.avatar_emoji || '🧑‍💻'}</span>
              <div className="truncate">
                <p className="font-bold text-white text-sm truncate">{resettingUser.name}</p>
                <p className="text-xs text-slate-400 truncate">{resettingUser.email}</p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              সিস্টেম অ্যাডমিন হিসেবে আপনি এই মেম্বারের জন্য সরাসরি একটি নতুন পাসওয়ার্ড সেট করে দিতে পারেন। ইউজার পরবর্তীতে এই নতুন পাসওয়ার্ড দিয়ে লগইন করবেন।
            </p>

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
                    placeholder="উদাঃ user12345"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
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
                  onClick={() => setResettingUser(null)}
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
    </div>
  );
}
