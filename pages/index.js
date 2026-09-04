import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { appwrite as supabase, uploadVoiceRecording, sendTypingStatus, sendOnlinePresence, subscribeToPresence, subscribeToTyping, isAppwriteConfigured } from '../lib/appwrite';
import { useAuth } from '../context/AuthContext';
import { playMessengerSound, playTaskAlarmRingtone, sendMessengerNotification, requestNotificationPermission } from '../utils/messengerSound';
import { scheduleServiceWorkerAlarm, cancelServiceWorkerAlarm, syncAllAlarmsWithServiceWorker } from '../utils/alarmScheduler';
import { registerPushNotifications, sendPushForMessage, sendTestPushNotification } from '../utils/pushManager';
import VoiceMessageBubble from '../components/VoiceMessageBubble';
import ImageMessageBubble from '../components/ImageMessageBubble';
import VideoCallModal from '../components/VideoCallModal';
import { Send, Hash, User, Users, Smile, Shield, Sparkles, MessageSquare, Edit3, Check, CheckCheck, AlertTriangle, Trash2, X, Link as LinkIcon, UserCheck, ChevronDown, CheckCircle, Image as ImageIcon, Pin, Plus, FolderPlus, MoreVertical, Database, Copy, Code, Camera, Upload, Volume2, Sun, Moon, Search, UserPlus, Mic, Square, Play, Pause, VolumeX, Bell, Clock, Calendar, AlertCircle, Phone, PhoneCall, PhoneOff, Video, VideoOff, Info, MoreHorizontal, ThumbsUp, MessageCircle, SlidersHorizontal, Share2, CornerDownRight, Download, ZoomIn, Settings, Crown, LogOut, UserMinus, ShieldCheck, Smartphone, SendHorizontal, ArrowLeft, ArrowRight } from 'lucide-react';

const GROUP_PRESET_EMOJIS = [
  '💬', '🚀', '🔥', '🎮', '⚽', '💡', '🎉', '❤️',
  '🏢', '👑', '🛡️', '📚', '☕', '🎨', '🎵', '🌟',
  '💻', '⚡', '🏆', '🌍', '✈️', '🍕', '🎯', '✨'
];

const SUPABASE_SQL_SCRIPT = `-- =========================================================
-- COMPLETE SUPABASE SCHEMA & RLS FIX SCRIPT FOR RGOMASSENGER
-- =========================================================

-- 1. MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room text NOT NULL DEFAULT 'general',
  sender text NOT NULL DEFAULT 'Anonymous',
  content text NOT NULL DEFAULT '',
  is_seen boolean DEFAULT false,
  seen_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Ensure all columns exist in case table was created differently
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS room text DEFAULT 'general';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sender text DEFAULT 'Anonymous';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS content text DEFAULT '';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_seen boolean DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS seen_at timestamp with time zone;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reactions jsonb DEFAULT '{}'::jsonb;

-- Enable RLS and grant full public permissions (Read/Insert/Update/Delete)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public select messages" ON public.messages;
CREATE POLICY "Public select messages" ON public.messages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert messages" ON public.messages;
CREATE POLICY "Public insert messages" ON public.messages FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update messages" ON public.messages;
CREATE POLICY "Public update messages" ON public.messages FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public delete messages" ON public.messages;
CREATE POLICY "Public delete messages" ON public.messages FOR DELETE USING (true);

-- Enable Realtime for Messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
`;

const PRESET_AVATARS = [
  { id: 'av-1', emoji: '🧑‍💻', bg: 'from-blue-600 to-indigo-600', label: 'কোডার' },
  { id: 'av-2', emoji: '👩‍🎨', bg: 'from-pink-500 to-rose-500', label: 'ডিজাইনার' },
  { id: 'av-3', emoji: '🦁', bg: 'from-amber-500 to-orange-500', label: 'সিংহ' },
  { id: 'av-4', emoji: '🦄', bg: 'from-purple-500 to-indigo-500', label: 'ইউনিকর্ন' },
  { id: 'av-5', emoji: '🦊', bg: 'from-orange-400 to-amber-600', label: 'শেয়াল' },
  { id: 'av-6', emoji: '🐼', bg: 'from-emerald-500 to-teal-600', label: 'পান্ডা' },
  { id: 'av-7', emoji: '🚀', bg: 'from-cyan-500 to-blue-500', label: 'রকেট' },
  { id: 'av-8', emoji: '🍿', bg: 'from-red-500 to-yellow-500', label: 'পপকর্ন' }
];

const getAvatarForUsername = (name) => {
  if (!name) return PRESET_AVATARS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PRESET_AVATARS.length;
  return PRESET_AVATARS[index];
};

const CHANNELS = [];

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

const PRESET_NAMES = ['অফিস মেম্বার'];

const getLinkPreview = (text) => {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/;
  const match = text.match(urlRegex);
  if (!match) return null;
  
  const url = match[0];
  let hostname = '';
  try {
    hostname = new URL(url).hostname;
  } catch (e) {
    hostname = url;
  }
  
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return {
      url,
      title: 'YouTube - ভিডিও শেয়ারিং প্ল্যাটফর্ম 🎥',
      description: 'ইউটিউবে আপনার প্রিয় গান, নাটক, সিনেমা এবং টিউটোরিয়ালগুলো দেখুন ও উপভোগ করুন।',
      siteName: 'youtube.com',
      image: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=600&q=80',
    };
  }
  if (url.includes('github.com')) {
    return {
      url,
      title: 'GitHub: Let\'s build from here 💻',
      description: 'বিশ্বের বৃহত্তম ডেভেলপার প্ল্যাটফর্ম। কোড শেয়ারিং, ভার্সন কন্ট্রোল এবং ওপেন সোর্স প্রজেক্টের আড্ডাঘর।',
      siteName: 'github.com',
      image: 'https://images.unsplash.com/photo-1618401471353-b98aedd07871?auto=format&fit=crop&w=600&q=80',
    };
  }
  if (url.includes('google.com')) {
    return {
      url,
      title: 'Google Search Engine 🔍',
      description: 'গুগল সার্চ ইঞ্জিন। যেকোনো তথ্যের জন্য বিশ্বের সবচেয়ে জনপ্রিয় এবং দ্রুততম সার্চ প্ল্যাটফর্ম।',
      siteName: 'google.com',
      image: 'https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?auto=format&fit=crop&w=600&q=80',
    };
  }
  if (url.includes('facebook.com')) {
    return {
      url,
      title: 'Facebook - সোশ্যাল নেটওয়ার্ক 👥',
      description: 'ফেসবুকে বন্ধুদের সাথে যুক্ত হোন, ছবি ও পোস্ট শেয়ার করুন এবং নতুন নতুন মানুষের সাথে পরিচিত হোন।',
      siteName: 'facebook.com',
      image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=600&q=80',
    };
  }
  if (url.includes('wikipedia.org')) {
    return {
      url,
      title: 'Wikipedia, the free encyclopedia 📖',
      description: 'উইকিপিডিয়া - একটি মুক্ত বিশ্বকোষ। বিশ্বের সকল বিষয়ের উপর নির্ভরযোগ্য ও বিস্তারিত তথ্যভান্ডার।',
      siteName: 'wikipedia.org',
      image: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=600&q=80',
    };
  }
  
  return {
    url,
    title: `${hostname} - ওয়েবসাইট লিংক 🔗`,
    description: `এই লিংকে ক্লিক করে ${hostname} ওয়েবসাইটটি ভিজিট করুন। বিস্তারিত জানতে ক্লিক করুন।`,
    siteName: hostname,
    image: 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=600&q=80',
  };
};

const renderMessageText = (text) => {
  if (!text) return '';
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a 
          key={i} 
          href={part} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-cyan-400 hover:text-cyan-300 underline break-all font-medium inline-flex items-center gap-1 hover:brightness-110 transition"
          onClick={(e) => e.stopPropagation()}
        >
          <LinkIcon className="w-3.5 h-3.5 inline flex-shrink-0" />
          {part}
        </a>
      );
    }
    return part;
  });
};

const resizeImage = (file, maxWidth = 800, maxHeight = 800, quality = 0.7) => {
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

const formatExactDateTime = (dateString) => {
  if (!dateString) return 'এখনই';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return 'এখনই';

  const dateFormatted = d.toLocaleDateString('bn-BD', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  const timeFormatted = d.toLocaleTimeString('bn-BD', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  return `${dateFormatted}, ${timeFormatted}`;
};

export default function Home() {
  const router = useRouter();
  const { user, isAdmin, isModerator, userRole, getRegisteredUsers, adminUpdateUserProfile, removeMemberFromApp } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [username, setUsername] = useState('');
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [tempUsername, setTempUsername] = useState('');
  const [activeRoom, setActiveRoom] = useState('grp_office_updates');
  const [adminEditUser, setAdminEditUser] = useState(null);
  const [adminRemoveUser, setAdminRemoveUser] = useState(null);
  const [adminActionStatus, setAdminActionStatus] = useState({ loading: false, msg: '', type: '' });
  const [isSending, setIsSending] = useState(false);
  const [dbError, setDbError] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [deletingMessageId, setDeletingMessageId] = useState(null);
  const [replyingToMessage, setReplyingToMessage] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});
  const [selectedAvatarId, setSelectedAvatarId] = useState('av-1');
  const [customAvatarUrl, setCustomAvatarUrl] = useState(null);
  const [profilesMap, setProfilesMap] = useState({});
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const profileFileInputRef = useRef(null);

  // Theme & User Search / Direct Messaging States
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [registeredUsersList, setRegisteredUsersList] = useState([]);
  const [directMessages, setDirectMessages] = useState([]);
  const [isUserSearchOpen, setIsUserSearchOpen] = useState(false);

  // Voice Recording States & Refs
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState(null);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState(null);
  const [isUploadingVoice, setIsUploadingVoice] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  
  // Custom Messenger Groups, Renaming & Avatar States
  const [customGroups, setCustomGroups] = useState([]);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupEmoji, setNewGroupEmoji] = useState('💬');
  const [newGroupAvatarUrl, setNewGroupAvatarUrl] = useState(null);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);
  const [isManageMembersModalOpen, setIsManageMembersModalOpen] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [pinnedExpanded, setPinnedExpanded] = useState(false);

  // Background Web Push Notification States (Messenger-style background alerts)
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [isPushRegistering, setIsPushRegistering] = useState(false);
  const [pushStatusMessage, setPushStatusMessage] = useState('');
  const [isSendingTestPush, setIsSendingTestPush] = useState(false);

  // Group Management & Edit Settings Modal State
  const [isEditGroupModalOpen, setIsEditGroupModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDesc, setEditGroupDesc] = useState('');
  const [editGroupEmoji, setEditGroupEmoji] = useState('💬');
  const [editGroupAvatarUrl, setEditGroupAvatarUrl] = useState(null);
  const [editGroupTab, setEditGroupTab] = useState('info'); // 'info' | 'members'
  const groupAvatarFileInputRef = useRef(null);
  const createGroupAvatarFileInputRef = useRef(null);

  // Task Alert & Scheduled Alarm States
  const [taskAlerts, setTaskAlerts] = useState([]);
  const [isTaskAlertModalOpen, setIsTaskAlertModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDateTime, setTaskDateTime] = useState('');
  const [taskTargetMembers, setTaskTargetMembers] = useState(['ALL']);
  const [triggeredAlarmModal, setTriggeredAlarmModal] = useState(null);

  const [selectedImage, setSelectedImage] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef(null);

  // Clipboard Paste Handler for Images
  const handlePasteImage = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          try {
            const compressed = await resizeImage(file, 1000, 1000, 0.75);
            setSelectedImage(compressed);
          } catch (err) {
            console.error('Image paste error:', err);
          }
          break;
        }
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
  };

  const handleDropFile = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        try {
          const compressed = await resizeImage(file, 1000, 1000, 0.75);
          setSelectedImage(compressed);
        } catch (err) {
          console.error('Image drop error:', err);
        }
      }
    }
  };

  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Online Users & Realtime Presence state
  const [onlineUsers, setOnlineUsers] = useState({});
  const [isOnlineListOpen, setIsOnlineListOpen] = useState(false);

  // Modern Messenger UI States: Tabs, Call Simulation, Info Drawer, Mobile Layout
  const [sidebarTab, setSidebarTab] = useState('all'); // 'all' | 'dms' | 'groups'
  const [mobileView, setMobileView] = useState('chat'); // 'contacts' | 'chat'
  const [isInfoDrawerOpen, setIsInfoDrawerOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [videoCallConfig, setVideoCallConfig] = useState({
    type: 'video',
    targetName: 'ব্যবহারকারী',
    targetAvatar: null
  });

  const handleCopySql = () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(SUPABASE_SQL_SCRIPT);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 3000);
    }
  };

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const [isTypingState, setIsTypingState] = useState(false);

  // Initialize nickname, avatar, active room, custom groups, theme, and DMs from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Restore theme
      const savedTheme = localStorage.getItem('rg_theme_dark');
      if (savedTheme !== null) {
        setIsDarkMode(savedTheme === 'true');
      }

      // Restore Direct Messages
      let loadedDMs = [];
      const savedDMs = localStorage.getItem('rg_direct_messages');
      if (savedDMs) {
        try {
          loadedDMs = JSON.parse(savedDMs);
          setDirectMessages(loadedDMs);
        } catch (e) {}
      }

      // Restore custom groups
      let loadedCustom = [];
      const savedGroups = localStorage.getItem('rg_custom_groups');
      if (savedGroups) {
        try {
          loadedCustom = JSON.parse(savedGroups);
        } catch (e) {}
      }
      if (!loadedCustom || loadedCustom.length === 0) {
        loadedCustom = DEFAULT_OFFICE_GROUPS;
        localStorage.setItem('rg_custom_groups', JSON.stringify(DEFAULT_OFFICE_GROUPS));
      }
      setCustomGroups(loadedCustom);

      // Restore scheduled task alerts
      const savedTaskAlerts = localStorage.getItem('rg_scheduled_task_alerts');
      if (savedTaskAlerts) {
        try {
          setTaskAlerts(JSON.parse(savedTaskAlerts));
        } catch (e) {}
      }

      // Restore active channel / group / DM room
      const allValid = [...loadedCustom, ...loadedDMs];
      const savedRoom = localStorage.getItem('rg_active_room');
      if (savedRoom && allValid.some(c => c.id === savedRoom)) {
        setActiveRoom(savedRoom);
        const savedDraft = localStorage.getItem(`rg_chat_draft_${savedRoom}`);
        if (savedDraft) setInputText(savedDraft);
      } else {
        const defaultRoomId = loadedCustom[0]?.id || 'grp_office_updates';
        setActiveRoom(defaultRoomId);
        const savedDraft = localStorage.getItem(`rg_chat_draft_${defaultRoomId}`);
        if (savedDraft) setInputText(savedDraft);
      }
    }

    if (getRegisteredUsers) {
      getRegisteredUsers().then((list) => {
        if (list && Array.isArray(list)) {
          setRegisteredUsersList(list);
        }
      });
    }

    let currentUsername = '';
    if (user?.name) {
      setUsername(user.name);
      setTempUsername(user.name);
      localStorage.setItem('rg_username', user.name);
      currentUsername = user.name;
    } else if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('rg_username');
      if (saved) {
        setUsername(saved);
        setTempUsername(saved);
        currentUsername = saved;
      } else {
        const fallbackName = user?.email ? user.email.split('@')[0] : 'অফিস মেম্বার';
        setUsername(fallbackName);
        setTempUsername(fallbackName);
        localStorage.setItem('rg_username', fallbackName);
        currentUsername = fallbackName;
      }
    }

    if (typeof window !== 'undefined') {
      const savedCustomAvatar = user?.custom_avatar_url || localStorage.getItem('rg_custom_avatar_url');
      if (savedCustomAvatar) {
        setCustomAvatarUrl(savedCustomAvatar);
        setSelectedAvatarId('custom');
      } else {
        const savedAvatar = localStorage.getItem('rg_avatar_id');
        if (savedAvatar) {
          setSelectedAvatarId(savedAvatar);
        } else {
          const defaultAv = getAvatarForUsername(currentUsername || 'ইউজার');
          setSelectedAvatarId(defaultAv.id);
          localStorage.setItem('rg_avatar_id', defaultAv.id);
        }
      }
    }
  }, [user]);

  // Fetch Supabase user profiles map for avatar resolution
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const { data, error } = await supabase.from('profiles').select('*');
        if (data && data.length > 0) {
          const map = {};
          data.forEach((p) => {
            const avatarUrl = p.custom_avatar_url || p.avatar_url;
            if (avatarUrl) {
              if (p.full_name) map[p.full_name] = avatarUrl;
              if (p.nickname) map[p.nickname] = avatarUrl;
              if (p.email) map[p.email] = avatarUrl;
              if (p.id) map[p.id] = avatarUrl;
            }
          });
          setProfilesMap(map);
        }
      } catch (e) {
        console.error('Error fetching profiles map:', e);
      }
    };
    fetchProfiles();
  }, [user]);

  // Background Web Push Notification Lifecycle (Messenger background alerts)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkPushStatus = () => {
      const isRegistered = localStorage.getItem('rg_push_registered') === 'true';
      setIsPushSubscribed(isRegistered);
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && username) {
        registerPushNotifications(username, user?.email || '', userRole || '')
          .then((res) => {
            if (res?.success) setIsPushSubscribed(true);
          })
          .catch(() => {});
      }
    };

    checkPushStatus();

    const handlePushStatusChanged = (e) => {
      if (e.detail?.isRegistered !== undefined) {
        setIsPushSubscribed(e.detail.isRegistered);
      }
    };

    window.addEventListener('rg_push_status_changed', handlePushStatusChanged);
    return () => {
      window.removeEventListener('rg_push_status_changed', handlePushStatusChanged);
    };
  }, [username, user?.email, userRole]);

  // Manual Push Notification Enable Trigger
  const handleEnablePushNotifications = async () => {
    if (!username) return;
    setIsPushRegistering(true);
    setPushStatusMessage('ব্যাকগ্রাউন্ড পুশ সার্ভিস চালু করা হচ্ছে...');
    try {
      const res = await registerPushNotifications(username, user?.email || '', userRole || '');
      if (res?.success) {
        setIsPushSubscribed(true);
        setPushStatusMessage('✅ ব্যাকগ্রাউন্ড মেসেঞ্জার নোটিফিকেশন সফলভাবে চালু হয়েছে!');
      } else if (res?.reason === 'permission_denied') {
        setPushStatusMessage('⚠️ ব্রাউজারে নোটিফিকেশন পারমিশন ব্লক করা আছে। সাইট সেটিংসে এলাউ করুন।');
      } else {
        setPushStatusMessage('⚠️ ব্যাকগ্রাউন্ড পুশ চালু করা সম্ভব হয়নি।');
      }
    } catch (e) {
      setPushStatusMessage('ত্রুটি: ' + (e.message || ''));
    } finally {
      setIsPushRegistering(false);
      setTimeout(() => setPushStatusMessage(''), 4500);
    }
  };

  // Test Push Notification Trigger
  const handleSendTestPush = async () => {
    setIsSendingTestPush(true);
    setPushStatusMessage('টেস্ট পুশ নোটিফিকেশন পাঠানো হচ্ছে...');
    try {
      const res = await sendTestPushNotification(username);
      if (res?.success) {
        setPushStatusMessage('🔔 টেস্ট নোটিফিকেশন পাঠানো হয়েছে! মোবাইলে/স্ক্রিনে চেক করুন।');
      } else {
        setPushStatusMessage(res?.message || 'টেস্ট নোটিফিকেশন পাঠানো সম্ভব হয়নি।');
      }
    } catch (e) {
      setPushStatusMessage('ত্রুটি: ' + (e.message || ''));
    } finally {
      setIsSendingTestPush(false);
      setTimeout(() => setPushStatusMessage(''), 4500);
    }
  };

  // Theme Toggle Handler
  const handleToggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('rg_theme_dark', String(next));
      }
      return next;
    });
  };

  // Direct Messaging Helper Functions
  const getDMRoomId = (u1, u2) => {
    const userA = (u1 || '').toLowerCase().trim();
    const userB = (u2 || '').toLowerCase().trim();
    const sorted = [userA, userB].sort();
    return `dm_${sorted[0]}_${sorted[1]}`.replace(/[^a-z0-9_]/g, '_');
  };

  const handleStartDirectMessage = (targetUser) => {
    if (!targetUser || !username) return;
    const targetName = targetUser.name || targetUser.email?.split('@')[0] || 'ইউজার';
    if (targetName === username) return;

    const dmId = getDMRoomId(username, targetName);

    const existingIndex = directMessages.findIndex((dm) => dm.id === dmId);
    let updatedDMs = [...directMessages];

    if (existingIndex < 0) {
      const newDM = {
        id: dmId,
        targetName: targetName,
        targetEmail: targetUser.email || '',
        avatarEmoji: targetUser.avatar_emoji || '👤',
        targetRole: targetUser.role || 'মেম্বার'
      };
      updatedDMs = [newDM, ...directMessages];
      setDirectMessages(updatedDMs);
      if (typeof window !== 'undefined') {
        localStorage.setItem('rg_direct_messages', JSON.stringify(updatedDMs));
      }
    }

    setActiveRoom(dmId);
    setMobileView('chat');
    if (typeof window !== 'undefined') {
      localStorage.setItem('rg_active_room', dmId);
    }
    setIsUserSearchOpen(false);
  };

  const handleDeleteDM = (dmId, e) => {
    e.stopPropagation();
    const filtered = directMessages.filter((dm) => dm.id !== dmId);
    setDirectMessages(filtered);
    if (typeof window !== 'undefined') {
      localStorage.setItem('rg_direct_messages', JSON.stringify(filtered));
    }
    if (activeRoom === dmId) {
      setActiveRoom(customGroups[0]?.id || 'grp_office_updates');
    }
  };

  // Voice Recording Functions
  const formatRecordingTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleStartRecording = async () => {
    try {
      if (typeof window === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('আপনার ব্রাউজারে মাইক্রোফোন সাপোর্ট নেই বা ব্লকড রয়েছে।');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      let options = {};
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm')) {
          options = { mimeType: 'audio/webm' };
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          options = { mimeType: 'audio/mp4' };
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          options = { mimeType: 'audio/ogg' };
        }
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        setRecordedAudioBlob(audioBlob);
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          setRecordedAudioUrl(reader.result);
        };
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone error:', err);
      alert('মাইক্রোফোন চালু করা যায়নি। দয়া করে ব্রাউজারের মাইক্রোফোন পারমিশন এনাবল করুন।');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    setIsRecording(false);
  };

  const handleCancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    setIsRecording(false);
    setRecordedAudioUrl(null);
    setRecordedAudioBlob(null);
    setRecordingTime(0);
  };

  // Task Alert Functions & Scheduled Alarm Engine
  const handleCreateTaskAlert = (e) => {
    e.preventDefault();
    if (!taskTitle.trim() || !taskDateTime) {
      alert('দয়া করে টাস্কের বিবরণ এবং নির্ধারিত তারিখ ও সময় পূরণ করুন।');
      return;
    }

    const newAlert = {
      id: 'task_' + Date.now(),
      title: taskTitle.trim(),
      dateTime: taskDateTime,
      targetMembers: taskTargetMembers.length > 0 ? taskTargetMembers : ['ALL'],
      room: activeRoom,
      createdByName: username,
      isTriggered: false,
      createdAt: new Date().toISOString()
    };

    const updated = [newAlert, ...taskAlerts];
    setTaskAlerts(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('rg_scheduled_task_alerts', JSON.stringify(updated));
    }

    // Register with Background Service Worker
    scheduleServiceWorkerAlarm(newAlert);

    setTaskTitle('');
    setTaskDateTime('');
    setTaskTargetMembers(['ALL']);
    setIsTaskAlertModalOpen(false);

    alert('⏰ টাস্ক অ্যালার্ট ও অ্যালার্ম সফলভাবে শিডিউল করা হয়েছে!');
  };

  const handleDeleteTaskAlert = (alertId) => {
    const updated = taskAlerts.filter((a) => a.id !== alertId);
    setTaskAlerts(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('rg_scheduled_task_alerts', JSON.stringify(updated));
    }
    // Cancel in Service Worker
    cancelServiceWorkerAlarm(alertId);
  };

  // Background Interval Checker for Scheduled Task Alerts
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTaskAlerts((prevAlerts) => {
        let updateNeeded = false;
        const nextAlerts = prevAlerts.map((alert) => {
          if (!alert.isTriggered && alert.dateTime) {
            const alertTime = new Date(alert.dateTime).getTime();
            if (alertTime <= now) {
              updateNeeded = true;

              // 1. Send automatic task alert message into room
              const targetTagStr = alert.targetMembers.includes('ALL')
                ? '@সকল_সদস্য'
                : alert.targetMembers.map((m) => `@${m}`).join(', ');

              const alertMessageContent = JSON.stringify({
                text: `⏰ [টাস্ক অ্যালার্ট ও অ্যালার্ম সংকেত]\n📌 টাস্ক: ${alert.title}\n📅 নির্ধারিত সময়: ${formatExactDateTime(alert.dateTime)}\n👥 লক্ষ্যবস্তু সদস্য: ${targetTagStr}`,
                isTaskAlert: true,
                taskTitle: alert.title,
                taskDateTime: alert.dateTime,
                targetMembers: alert.targetMembers,
                createdByName: alert.createdByName
              });

              supabase.from('messages').insert([{
                room: alert.room || 'general',
                sender: '⏰ টাস্ক অ্যালার্ট বোট',
                content: alertMessageContent
              }]).then(() => {});

              // 2. Check if current user is targeted
              const isTargeted = alert.targetMembers.includes('ALL') ||
                alert.targetMembers.includes(username) ||
                alert.createdByName === username;

              if (isTargeted) {
                // Play 10-second Continuous Ringing Alarm Chimes
                playTaskAlarmRingtone(10000);

                // Push System Notification
                sendMessengerNotification(`⏰ নির্ধারিত টাস্ক অ্যালার্ট!`, alert.title, alert.createdByName);

                // Open Alarm Popup Modal
                setTriggeredAlarmModal({
                  id: alert.id,
                  title: alert.title,
                  dateTime: alert.dateTime,
                  createdByName: alert.createdByName,
                  targetMembers: alert.targetMembers,
                  room: alert.room
                });
              }

              return { ...alert, isTriggered: true };
            }
          }
          return alert;
        });

        if (updateNeeded) {
          if (typeof window !== 'undefined') {
            localStorage.setItem('rg_scheduled_task_alerts', JSON.stringify(nextAlerts));
          }
        }
        return nextAlerts;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [username]);

  // Fetch messages and subscribe to real-time changes
  useEffect(() => {
    let active = true;

    // 1. Fetch initial messages
    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .order('created_at', { ascending: true });
        
        if (error) {
          console.error('Error fetching messages:', error);
          if (active) {
            setDbError(error);
          }
          return;
        }

        if (active) {
          setDbError(null);
          if (data) {
            // Filter by activeRoom (client side fallback in case database query is generic)
            const roomMessages = data.filter(msg => msg.room === activeRoom);
            setMessages(roomMessages);
          }
        }
      } catch (err) {
        console.error('Fetch error:', err);
      }
    };

    fetchMessages();

    // 2. Subscribe to new, updated, and deleted messages (Supabase Replication)
    const subscription = supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload) => {
          if (!active) return;

          const eventType = payload.eventType || payload.event;

          if (eventType === 'INSERT') {
            if (payload.new && payload.new.room === activeRoom) {
              if (payload.new.sender !== username) {
                playMessengerSound();
              }
              setMessages((prev) => {
                // Avoid duplicate messages
                if (prev.some(msg => msg.id === payload.new.id)) return prev;
                // Replace any optimistic temporary message with matching content and sender
                const hasTemp = prev.some(m => typeof m.id === 'string' && m.id.startsWith('temp_') && m.sender === payload.new.sender && m.content === payload.new.content);
                if (hasTemp) {
                  return prev.map(m => (typeof m.id === 'string' && m.id.startsWith('temp_') && m.sender === payload.new.sender && m.content === payload.new.content) ? payload.new : m);
                }
                return [...prev, payload.new];
              });
            }
          } else if (eventType === 'UPDATE') {
            if (payload.new && payload.new.room === activeRoom) {
              setMessages((prev) =>
                prev.map((msg) => (msg.id === payload.new.id ? payload.new : msg))
              );
            }
          } else if (eventType === 'DELETE') {
            const deletedId = payload.old?.id || payload.old_id || (payload.new ? payload.new.id : null);
            if (deletedId) {
              setMessages((prev) => prev.filter((msg) => msg.id !== deletedId));
            }
          } else if (eventType === 'TYPING') {
            if (payload.room === activeRoom && payload.sender !== username) {
              setTypingUsers((prev) => ({
                ...prev,
                [payload.sender]: payload.isTyping
              }));
            }
          }
        }
      )
      .subscribe();

    // Reset typing status on room switch
    setTypingUsers({});

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [activeRoom, username]);

  // Mark unread messages in activeRoom as seen
  useEffect(() => {
    if (!username || !activeRoom || messages.length === 0) return;

    const unreadMessages = messages.filter(
      (m) => m.sender !== username && !m.is_seen
    );

    if (unreadMessages.length > 0) {
      const unreadIds = unreadMessages
        .map((m) => m.id)
        .filter((id) => typeof id === 'string' && !id.startsWith('temp_'));

      if (unreadIds.length > 0) {
        const nowIso = new Date().toISOString();

        // Optimistically update local state immediately
        setMessages((prev) =>
          prev.map((m) => (unreadIds.includes(m.id) ? { ...m, is_seen: true, seen_at: nowIso } : m))
        );

        // Update database in background
        supabase
          .from('messages')
          .update({ is_seen: true, seen_at: nowIso })
          .in('id', unreadIds)
          .then(({ error }) => {
            if (error) {
              console.warn('Notice updating seen status in DB:', error.message);
            }
          });
      }
    }
  }, [activeRoom, username, messages]);

  // Realtime Presence & Active Users tracking
  useEffect(() => {
    if (!username) return;

    const currentAvatar = selectedAvatarId;
    const currentRoom = activeRoom;
    const myPresenceObj = {
      username,
      avatarId: currentAvatar,
      customAvatarUrl: customAvatarUrl,
      room: currentRoom,
      lastSeen: Date.now()
    };

    // 1. Supabase Presence Channel
    const presenceChan = supabase.channel('online_presence', {
      config: { presence: { key: username } }
    });

    const syncPresences = () => {
      const state = presenceChan.presenceState();
      const updated = {};

      // Always include current user
      updated[username] = myPresenceObj;

      Object.keys(state).forEach((key) => {
        const presences = state[key];
        if (presences && presences.length > 0) {
          const p = presences[presences.length - 1];
          updated[key] = {
            username: key,
            avatarId: p.avatarId || getAvatarForUsername(key).id,
            customAvatarUrl: p.customAvatarUrl || (key === username ? customAvatarUrl : null),
            room: p.room || 'general',
            lastSeen: Date.now()
          };
        }
      });

      setOnlineUsers((prev) => ({ ...prev, ...updated }));
    };

    presenceChan
      .on('presence', { event: 'sync' }, syncPresences)
      .on('presence', { event: 'join' }, () => syncPresences())
      .on('presence', { event: 'leave' }, () => syncPresences())
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          try {
            await presenceChan.track({
              username,
              avatarId: currentAvatar,
              customAvatarUrl: customAvatarUrl,
              room: currentRoom,
              onlineAt: new Date().toISOString()
            });
          } catch (e) {
            console.warn('Presence track error:', e);
          }
        }
      });

    // 2. BroadcastChannel + LocalStorage Heartbeat (works across tabs in mock and real mode)
    let bc = null;
    let intervalId = null;

    if (typeof window !== 'undefined') {
      if ('BroadcastChannel' in window) {
        try {
          bc = new BroadcastChannel('rg_presence_channel');
        } catch (e) {}
      }

      const sendHeartbeat = () => {
        const timestamp = Date.now();
        const hb = {
          type: 'HEARTBEAT',
          user: username,
          avatarId: currentAvatar,
          customAvatarUrl: customAvatarUrl,
          room: currentRoom,
          timestamp
        };

        if (bc) {
          try {
            bc.postMessage(hb);
          } catch (e) {}
        }

        // Sync local storage store
        try {
          const stored = JSON.parse(localStorage.getItem('rg_online_store') || '{}');
          stored[username] = {
            username,
            avatarId: currentAvatar,
            customAvatarUrl: customAvatarUrl,
            room: currentRoom,
            lastSeen: timestamp
          };
          // Filter stale entries > 30 seconds
          const now = Date.now();
          Object.keys(stored).forEach((k) => {
            if (now - (stored[k].lastSeen || 0) > 30000) {
              delete stored[k];
            }
          });
          localStorage.setItem('rg_online_store', JSON.stringify(stored));

          setOnlineUsers((prev) => {
            const merged = { ...prev, ...stored };
            merged[username] = myPresenceObj;
            return merged;
          });
        } catch (err) {}
      };

      if (bc) {
        bc.onmessage = (event) => {
          if (event.data && event.data.type === 'HEARTBEAT') {
            const { user, avatarId, customAvatarUrl: remoteCustomAv, room, timestamp } = event.data;
            setOnlineUsers((prev) => ({
              ...prev,
              [user]: {
                username: user,
                avatarId,
                customAvatarUrl: remoteCustomAv,
                room,
                lastSeen: timestamp
              }
            }));
          }
        };
      }

      sendHeartbeat();
      intervalId = setInterval(sendHeartbeat, 6000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (bc) {
        try { bc.close(); } catch (e) {}
      }
      try { presenceChan.unsubscribe(); } catch (e) {}
    };
  }, [username, selectedAvatarId, activeRoom, customAvatarUrl]);

  // Appwrite Real-time Presence & Typing Subscription Engine
  useEffect(() => {
    if (!username) return;

    // 1. Subscribe to real-time Typing broadcasts across rooms
    const unsubTyping = subscribeToTyping((payload) => {
      if (payload && payload.sender && payload.sender !== username) {
        if (payload.room === activeRoom) {
          setTypingUsers((prev) => ({
            ...prev,
            [payload.sender]: !!payload.isTyping
          }));
        }
      }
    });

    // 2. Subscribe to real-time Presence updates
    const unsubPresence = subscribeToPresence((presenceStore) => {
      if (presenceStore && typeof presenceStore === 'object') {
        const mapped = {};
        Object.entries(presenceStore).forEach(([usrKey, presList]) => {
          if (Array.isArray(presList) && presList.length > 0) {
            const p = presList[presList.length - 1];
            mapped[usrKey] = {
              username: usrKey,
              avatarId: p.avatarId || getAvatarForUsername(usrKey).id,
              customAvatarUrl: p.customAvatarUrl || null,
              room: p.room || 'general',
              status: p.status || 'online',
              lastSeen: Date.now()
            };
          }
        });
        setOnlineUsers((prev) => ({ ...prev, ...mapped }));
      }
    });

    return () => {
      unsubTyping();
      unsubPresence();
    };
  }, [username, activeRoom]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const [roomAccessError, setRoomAccessError] = useState(null);

  const handleSelectRoom = (roomId) => {
    const targetChannel = CHANNELS.find(c => c.id === roomId);
    if (targetChannel && targetChannel.minRole) {
      if (targetChannel.minRole === 'admin' && !isAdmin) {
        setRoomAccessError({
          title: 'অ্যাডমিন অ্যাক্সেস সংরক্ষিত',
          message: `"${targetChannel.name}" চ্যানেলটিতে প্রবেশ করতে "অ্যাডমিন" রোল প্রয়োজন। আপনার বর্তমান রোল: "${user?.role || 'সদস্য'}"।`
        });
        return;
      }
      if (targetChannel.minRole === 'moderator' && !isModerator) {
        setRoomAccessError({
          title: 'মডারেটর ও অ্যাডমিন অ্যাক্সেস সংরক্ষিত',
          message: `"${targetChannel.name}" চ্যানেলটিতে প্রবেশ করতে "মডারেটর" বা "অ্যাডমিন" রোল প্রয়োজন। আপনার বর্তমান রোল: "${user?.role || 'সদস্য'}"।`
        });
        return;
      }
    }
    setActiveRoom(roomId);
    setRoomAccessError(null);
    setMobileView('chat');
    if (typeof window !== 'undefined') {
      localStorage.setItem('rg_active_room', roomId);
      const savedDraft = localStorage.getItem(`rg_chat_draft_${roomId}`) || '';
      setInputText(savedDraft);
    }
  };

  const scrollToMessage = (msgId) => {
    const element = document.getElementById(`msg-${msgId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('bg-blue-600/20');
      setTimeout(() => {
        element.classList.remove('bg-blue-600/20');
      }, 1500);
    }
  };

  const handleReplyTo = (msg) => {
    setReplyingToMessage(msg);
    setEditingMessage(null); // Cancel edit if replying
  };

  const handleCancelReply = () => {
    setReplyingToMessage(null);
  };

  const handleStartEdit = (msg) => {
    setEditingMessage(msg);
    setReplyingToMessage(null); // Cancel reply if editing
    
    // Parse JSON if it has reply metadata
    let text = msg.content;
    if (msg.content.startsWith('{"text":')) {
      try {
        const parsed = JSON.parse(msg.content);
        text = parsed.text;
      } catch (e) {}
    }
    setInputText(text);
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setInputText('');
  };

  const handleDeleteMessage = async (msgId) => {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', msgId);

      if (error) {
        console.error('Error deleting message:', error);
        setDbError(error);
      } else {
        setDbError(null);
        // Optimistic local update
        setMessages((prev) => prev.filter(m => m.id !== msgId));
      }
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeletingMessageId(null);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!inputText.trim() && !selectedImage && !recordedAudioUrl) || isSending) return;

    setIsSending(true);

    // Turn off typing status
    setIsTypingState(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    sendTypingStatus(activeRoom, username, false);

    if (editingMessage) {
      // Message Editing Mode
      let newContent = inputText.trim();
      let replyTo = null;
      let existingImage = null;
      if (editingMessage.content.startsWith('{"text":')) {
        try {
          const parsed = JSON.parse(editingMessage.content);
          replyTo = parsed.replyTo;
          existingImage = parsed.image;
        } catch (e) {}
      }

      newContent = JSON.stringify({
        text: inputText.trim(),
        replyTo: replyTo,
        edited: true,
        avatar: selectedAvatarId,
        customAvatarUrl: customAvatarUrl,
        image: existingImage // keep the original image when editing text
      });

      try {
        const { error } = await supabase
          .from('messages')
          .update({ content: newContent })
          .eq('id', editingMessage.id);

        if (error) {
          console.error('Error updating message:', error);
          setDbError(error);
        } else {
          setDbError(null);
          setInputText('');
          setEditingMessage(null);
          
          // Optimistic local update
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === editingMessage.id ? { ...msg, content: newContent } : msg
            )
          );
        }
      } catch (err) {
        console.error('Update error:', err);
      } finally {
        setIsSending(false);
      }
    } else {
      // Message Sending Mode (normal or reply)
      const isReply = !!replyingToMessage;
      let finalContent = '';
      const resolvedCustomAvatar = customAvatarUrl || user?.custom_avatar_url || (typeof window !== 'undefined' ? localStorage.getItem('rg_custom_avatar_url') : null);

      let audioPayloadUrl = recordedAudioUrl;
      // If we have a recorded audio blob, upload to Appwrite Storage
      if (recordedAudioBlob) {
        setIsUploadingVoice(true);
        try {
          const uploadResult = await uploadVoiceRecording(
            recordedAudioBlob,
            `voice_${Date.now()}_${username.replace(/[^a-zA-Z0-9]/g, '_')}.webm`
          );
          if (uploadResult?.url) {
            audioPayloadUrl = uploadResult.url;
          }
        } catch (err) {
          console.warn('Appwrite storage upload notice, using fallback audio URL:', err);
        } finally {
          setIsUploadingVoice(false);
        }
      }

      if (isReply) {
        let replyText = replyingToMessage.content;
        if (replyingToMessage.content.startsWith('{"text":')) {
          try {
            replyText = JSON.parse(replyingToMessage.content).text;
          } catch (e) {}
        }
        finalContent = JSON.stringify({
          text: inputText.trim(),
          replyTo: {
            id: replyingToMessage.id,
            sender: replyingToMessage.sender,
            content: replyText
          },
          avatar: selectedAvatarId,
          customAvatarUrl: resolvedCustomAvatar,
          image: selectedImage,
          audio: audioPayloadUrl,
          audioDuration: recordingTime
        });
      } else {
        finalContent = JSON.stringify({
          text: inputText.trim(),
          avatar: selectedAvatarId,
          customAvatarUrl: resolvedCustomAvatar,
          image: selectedImage,
          audio: audioPayloadUrl,
          audioDuration: recordingTime
        });
      }

      const tempId = 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      const optimisticMsg = {
        id: tempId,
        room: activeRoom,
        sender: username,
        content: finalContent,
        created_at: new Date().toISOString()
      };

      // 1. Instantly update UI optimistically (0ms delay)
      setMessages((prev) => [...prev, optimisticMsg]);

      // 2. Clear input fields immediately for instant feedback
      setInputText('');
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`rg_chat_draft_${activeRoom}`);
      }
      setSelectedImage(null);
      setRecordedAudioUrl(null);
      setRecordedAudioBlob(null);
      setRecordingTime(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setReplyingToMessage(null);

      const newMsg = {
        room: activeRoom,
        sender: username,
        content: finalContent,
      };

      try {
        const { data, error } = await supabase
          .from('messages')
          .insert(newMsg)
          .select();

        if (error) {
          console.error('Error sending message:', error);
          setDbError(error);
        } else {
          setDbError(null);
          if (data && data.length > 0) {
            setMessages((prev) =>
              prev.map((msg) => (msg.id === tempId ? data[0] : msg))
            );
          }

          // Dispatch background Web Push notification to mobile and other devices
          try {
            let isGroupChat = true;
            let groupTitle = '';
            let dmRecipient = '';

            if (activeRoom.startsWith('dm_')) {
              isGroupChat = false;
              const participants = activeRoom.replace('dm_', '').split('_');
              dmRecipient = participants.find((p) => p !== username) || '';
            } else if (activeRoom.startsWith('group_')) {
              isGroupChat = true;
              const foundGrp = customGroups.find((g) => g.id === activeRoom);
              groupTitle = foundGrp?.name || 'কাজের গ্রুপ';
            } else {
              isGroupChat = true;
              groupTitle = activeRoom === 'general' ? 'সাধারণ গ্রুপ' : activeRoom;
            }

            sendPushForMessage({
              sender: username,
              room: activeRoom,
              text: inputText.trim(),
              isGroup: isGroupChat,
              groupName: groupTitle,
              targetUsername: dmRecipient,
              customAvatarUrl: resolvedCustomAvatar,
              hasAudio: !!recordedAudioBlob || !!audioPayloadUrl,
              hasImage: !!selectedImage
            }).catch((err) => console.warn('Push notification dispatch notice:', err));
          } catch (e) {}
        }
      } catch (err) {
        console.error('Send error:', err);
      } finally {
        setIsSending(false);
      }
    }
  };

  // Messenger Instant Quick Like (Thumbs-Up 👍) Handler
  const handleSendQuickLike = async () => {
    if (isSending || !username) return;
    setIsSending(true);
    const resolvedCustomAvatar = customAvatarUrl || user?.custom_avatar_url || (typeof window !== 'undefined' ? localStorage.getItem('rg_custom_avatar_url') : null);
    const finalContent = JSON.stringify({
      text: '👍',
      isQuickLike: true,
      avatar: selectedAvatarId,
      customAvatarUrl: resolvedCustomAvatar
    });

    const tempId = 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const optimisticMsg = {
      id: tempId,
      room: activeRoom,
      sender: username,
      content: finalContent,
      created_at: new Date().toISOString()
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    playMessengerSound();

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          room: activeRoom,
          sender: username,
          content: finalContent
        })
        .select();

      if (!error && data && data.length > 0) {
        setMessages((prev) =>
          prev.map((msg) => (msg.id === tempId ? data[0] : msg))
        );

        // Dispatch background Web Push notification for quick like
        try {
          let isGroupChat = true;
          let groupTitle = '';
          let dmRecipient = '';

          if (activeRoom.startsWith('dm_')) {
            isGroupChat = false;
            const participants = activeRoom.replace('dm_', '').split('_');
            dmRecipient = participants.find((p) => p !== username) || '';
          } else if (activeRoom.startsWith('group_')) {
            isGroupChat = true;
            const foundGrp = customGroups.find((g) => g.id === activeRoom);
            groupTitle = foundGrp?.name || 'কাজের গ্রুপ';
          } else {
            isGroupChat = true;
            groupTitle = activeRoom === 'general' ? 'সাধারণ গ্রুপ' : activeRoom;
          }

          sendPushForMessage({
            sender: username,
            room: activeRoom,
            text: '👍 লাইক পাঠিয়েছেন',
            isGroup: isGroupChat,
            groupName: groupTitle,
            targetUsername: dmRecipient,
            customAvatarUrl: resolvedCustomAvatar,
            hasAudio: false,
            hasImage: false
          }).catch((err) => console.warn('Push notification quick like notice:', err));
        } catch (e) {}
      }

    } catch (err) {
      console.error('Quick like error:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Messenger Audio/Video Call Handlers with MediaDevices Camera Preview
  const startCall = (type = 'video', targetName, targetAvatar = null) => {
    playMessengerSound();
    const resolvedTarget = targetName || (currentRoomObj?.targetName || currentRoomObj?.name || 'ব্যবহারকারী');
    let resolvedAvatar = targetAvatar;
    if (!resolvedAvatar && currentRoomObj?.targetName) {
      resolvedAvatar = profilesMap[currentRoomObj.targetName]?.custom_avatar_url || null;
    }
    setVideoCallConfig({
      type: type || 'video',
      targetName: resolvedTarget,
      targetAvatar: resolvedAvatar
    });
    setIsVideoModalOpen(true);
  };

  const handleSaveUsername = () => {
    if (tempUsername.trim()) {
      setUsername(tempUsername.trim());
      localStorage.setItem('rg_username', tempUsername.trim());
      setIsEditingUsername(false);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputText(val);

    if (typeof window !== 'undefined') {
      localStorage.setItem(`rg_chat_draft_${activeRoom}`, val);
    }

    if (!isTypingState && val.trim()) {
      setIsTypingState(true);
      sendTypingStatus(activeRoom, username, true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTypingState(false);
      sendTypingStatus(activeRoom, username, false);
    }, 2500);
  };

  const handleSelectAvatar = (avatarId) => {
    setSelectedAvatarId(avatarId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('rg_avatar_id', avatarId);
    }
    setIsAvatarPickerOpen(false);
  };

  const handleProfileImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const resized = await resizeImage(file, 250, 250, 0.85);
      setCustomAvatarUrl(resized);
      if (typeof window !== 'undefined') {
        localStorage.setItem('rg_custom_avatar_url', resized);
        localStorage.setItem('rg_avatar_id', 'custom');
      }
      setSelectedAvatarId('custom');
    } catch (err) {
      console.error('Profile image upload error:', err);
    } finally {
      if (profileFileInputRef.current) {
        profileFileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveCustomAvatar = () => {
    setCustomAvatarUrl(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('rg_custom_avatar_url');
      localStorage.setItem('rg_avatar_id', 'av-1');
    }
    setSelectedAvatarId('av-1');
  };

  // Group Creation Handler (Exclusively for Admin to select members, name group & initialize persistent thread)
  const handleCreateGroup = (e) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('শুধুমাত্র সিস্টেম অ্যাডমিন নতুন গ্রুপ তৈরি করতে পারেন।');
      return;
    }
    if (!newGroupName.trim()) return;
    const initialMembers = Array.from(new Set([username, ...selectedGroupMembers]));
    const newGroupId = 'group_' + Date.now();
    const newGroup = {
      id: newGroupId,
      name: newGroupName.trim(),
      desc: newGroupDesc.trim() || 'ম্যাসেঞ্জার কাস্টম গ্রুপ',
      emoji: newGroupEmoji || '💬',
      customAvatarUrl: newGroupAvatarUrl || null,
      avatarUrl: newGroupAvatarUrl || null,
      createdBy: username,
      members: initialMembers,
      createdAt: new Date().toISOString()
    };
    const updatedGroups = [...customGroups, newGroup];
    setCustomGroups(updatedGroups);
    if (typeof window !== 'undefined') {
      localStorage.setItem('rg_custom_groups', JSON.stringify(updatedGroups));
      window.dispatchEvent(new CustomEvent('rg_groups_updated', { detail: updatedGroups }));
    }

    // Initialize Persistent Group Chat Thread in Database
    try {
      supabase.from('messages').insert([
        {
          room: newGroupId,
          sender: 'সিস্টেম অ্যাডমিন',
          content: JSON.stringify({
            text: `🎉 "${newGroup.name}" কাজের গ্রুপ সফলভাবে চালু হয়েছে!\nসকল নির্বাচিত সদস্যদের স্বাগতম।`,
            isSystem: true,
            isGroupInit: true,
            groupName: newGroup.name,
            createdBy: username,
            createdAt: new Date().toISOString()
          }),
          created_at: new Date().toISOString()
        }
      ]).then(() => {}).catch(err => console.warn('Persistent group thread init fallback:', err));
    } catch (dbErr) {
      console.warn('Persistent group chat thread error:', dbErr);
    }

    setNewGroupName('');
    setNewGroupDesc('');
    setNewGroupEmoji('💬');
    setNewGroupAvatarUrl(null);
    setSelectedGroupMembers([]);
    setIsCreateGroupOpen(false);
    handleSelectRoom(newGroup.id);
  };

  // Group Management & Edit Open Handler
  const handleOpenEditGroup = (group) => {
    if (!group) return;
    const target = customGroups.find((g) => g.id === group.id) || group;
    setEditingGroupId(target.id);
    setEditGroupName(target.name || '');
    setEditGroupDesc(target.desc || '');
    setEditGroupEmoji(target.emoji || '💬');
    setEditGroupAvatarUrl(target.customAvatarUrl || target.avatarUrl || null);
    setEditGroupTab('info');
    setMemberSearchQuery('');
    setIsEditGroupModalOpen(true);
  };

  // Save Group Settings (Rename, Description, Avatar)
  const handleSaveGroupSettings = (groupId) => {
    if (!editGroupName.trim()) return;
    const updated = customGroups.map((g) => {
      if (g.id === groupId) {
        return {
          ...g,
          name: editGroupName.trim(),
          desc: editGroupDesc.trim(),
          emoji: editGroupEmoji || '💬',
          customAvatarUrl: editGroupAvatarUrl || null,
          avatarUrl: editGroupAvatarUrl || null,
          updatedAt: new Date().toISOString()
        };
      }
      return g;
    });
    setCustomGroups(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('rg_custom_groups', JSON.stringify(updated));
    }
    setIsEditGroupModalOpen(false);
  };

  // Group Avatar Upload Handler
  const handleGroupAvatarUpload = async (e, isEdit = true) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const resized = await resizeImage(file, 300, 300, 0.85);
      if (isEdit) {
        setEditGroupAvatarUrl(resized);
      } else {
        setNewGroupAvatarUrl(resized);
      }
    } catch (err) {
      console.error('Group avatar upload error:', err);
    }
  };

  // Member toggle handler for custom groups
  const handleToggleMemberInGroup = (groupId, memberName) => {
    const updated = customGroups.map((grp) => {
      if (grp.id === groupId) {
        const currentMembers = grp.members || [grp.createdBy || username];
        const hasMember = currentMembers.includes(memberName);
        const nextMembers = hasMember
          ? currentMembers.filter(m => m !== memberName)
          : [...currentMembers, memberName];
        return { ...grp, members: nextMembers };
      }
      return grp;
    });
    setCustomGroups(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('rg_custom_groups', JSON.stringify(updated));
    }
  };

  // Leave Custom Group Handler
  const handleLeaveGroup = (groupId) => {
    if (!confirm('আপনি কি নিশ্চিত যে এই গ্রুপটি ত্যাগ করতে চান?')) return;
    const targetGroup = customGroups.find((g) => g.id === groupId);
    if (!targetGroup) return;
    const currentMembers = targetGroup.members || [targetGroup.createdBy || username];
    const remainingMembers = currentMembers.filter((m) => m !== username);
    
    if (remainingMembers.length === 0) {
      handleDeleteCustomGroup(groupId);
    } else {
      const nextCreator = targetGroup.createdBy === username ? remainingMembers[0] : targetGroup.createdBy;
      const updated = customGroups.map((g) => {
        if (g.id === groupId) {
          return {
            ...g,
            members: remainingMembers,
            createdBy: nextCreator
          };
        }
        return g;
      });
      setCustomGroups(updated);
      if (typeof window !== 'undefined') {
        localStorage.setItem('rg_custom_groups', JSON.stringify(updated));
      }
      if (activeRoom === groupId) {
        handleSelectRoom(updated[0]?.id || 'grp_office_updates');
      }
    }
    setIsEditGroupModalOpen(false);
  };

  // Group Delete Handler
  const handleDeleteCustomGroup = (groupId, e) => {
    if (e) e.stopPropagation();
    const updated = customGroups.filter(g => g.id !== groupId);
    setCustomGroups(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('rg_custom_groups', JSON.stringify(updated));
    }
    if (activeRoom === groupId) {
      handleSelectRoom(updated[0]?.id || 'grp_office_updates');
    }
    setIsEditGroupModalOpen(false);
  };

  // Message Pin Toggle Handler
  const handleTogglePinMessage = async (msg) => {
    let contentObj = {};
    if (msg.content && msg.content.startsWith('{"text":')) {
      try {
        contentObj = JSON.parse(msg.content);
      } catch (e) {
        contentObj = { text: msg.content };
      }
    } else {
      contentObj = { text: msg.content || '' };
    }

    const currentPinned = !!contentObj.pinned;
    contentObj.pinned = !currentPinned;
    const newContent = JSON.stringify(contentObj);

    try {
      const { error } = await supabase
        .from('messages')
        .update({ content: newContent })
        .eq('id', msg.id);

      if (error) {
        console.error('Pin error:', error);
        setDbError(error);
      } else {
        setDbError(null);
        // Optimistic update
        setMessages((prev) =>
          prev.map((m) => (m.id === msg.id ? { ...m, content: newContent } : m))
        );
      }
    } catch (err) {
      console.error('Pin error:', err);
    }
  };

  // Reaction Handler
  const handleAddReaction = async (msg, emoji) => {
    if (!username) return;
    try {
      const currentReactions = msg.reactions || {};
      const userList = currentReactions[emoji] || [];

      let updatedUserList = [];
      if (userList.includes(username)) {
        // Toggle off if already reacted
        updatedUserList = userList.filter((u) => u !== username);
      } else {
        // Add reaction
        updatedUserList = [...userList, username];
      }

      const updatedReactions = { ...currentReactions };
      if (updatedUserList.length === 0) {
        delete updatedReactions[emoji];
      } else {
        updatedReactions[emoji] = updatedUserList;
      }

      // Optimistic update
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, reactions: updatedReactions } : m))
      );

      // Persist in DB
      const { error } = await supabase
        .from('messages')
        .update({ reactions: updatedReactions })
        .eq('id', msg.id);

      if (error) {
        console.warn('Reactions DB update warning:', error.message);
      }
    } catch (err) {
      console.error('Error toggling reaction:', err);
    }
  };

  // Calculate combined rooms & pinned messages
  const allRooms = [
    ...customGroups.map(g => ({
      id: g.id,
      name: g.name,
      desc: g.desc,
      isCustom: true,
      emoji: g.emoji || '💼',
      customAvatarUrl: g.customAvatarUrl || g.avatarUrl || null,
      avatarUrl: g.avatarUrl || g.customAvatarUrl || null,
      createdBy: g.createdBy,
      members: g.members || ['ALL'],
      createdAt: g.createdAt
    })),
    ...directMessages.map(dm => ({
      id: dm.id,
      name: `💬 ${dm.targetName}`,
      desc: `ডাইরেক্ট মেসেজ (${dm.targetRole || 'অফিস মেম্বার'})`,
      isCustom: true,
      isDM: true,
      emoji: dm.avatarEmoji || '👤',
      targetName: dm.targetName,
      targetEmail: dm.targetEmail || '',
      customAvatarUrl: dm.customAvatarUrl || null
    }))
  ];
  const currentRoomObj = allRooms.find(r => r.id === activeRoom) || customGroups[0] || DEFAULT_OFFICE_GROUPS[0];

  const filteredUsers = registeredUsersList.filter((usr) => {
    const q = (userSearchQuery || '').trim().toLowerCase();
    if (!q) return true;
    const nameMatch = (usr.name || '').toLowerCase().includes(q);
    const emailMatch = (usr.email || '').toLowerCase().includes(q);
    const roleMatch = (usr.role || '').toLowerCase().includes(q);
    return nameMatch || emailMatch || roleMatch;
  }).filter((usr) => usr.name !== username);

  const filteredOfficeGroups = customGroups.filter((g) => {
    const q = (userSearchQuery || '').trim().toLowerCase();
    if (!q) return true;
    return (g.name || '').toLowerCase().includes(q) || (g.desc || '').toLowerCase().includes(q);
  });

  const filteredOfficeMembers = registeredUsersList.filter((usr) => {
    const q = (userSearchQuery || '').trim().toLowerCase();
    if (!q) return true;
    return (
      (usr.name || '').toLowerCase().includes(q) ||
      (usr.email || '').toLowerCase().includes(q) ||
      (usr.role || '').toLowerCase().includes(q)
    );
  });

  const handleAdminSaveProfile = async (e) => {
    e.preventDefault();
    if (!adminEditUser) return;
    setAdminActionStatus({ loading: true, msg: 'তথ্য সংরক্ষণ করা হচ্ছে...', type: 'info' });
    const res = await adminUpdateUserProfile(adminEditUser.id, adminEditUser.email, {
      name: adminEditUser.name,
      role: adminEditUser.role,
      phone: adminEditUser.phone || '',
      bio: adminEditUser.bio || ''
    });
    setAdminActionStatus({ loading: false, msg: res.message, type: res.success ? 'success' : 'error' });
    if (res.success) {
      if (getRegisteredUsers) {
        const updated = await getRegisteredUsers();
        if (updated) setRegisteredUsersList(updated);
      }
      setTimeout(() => {
        setAdminEditUser(null);
        setAdminActionStatus({ loading: false, msg: '', type: '' });
      }, 1200);
    }
  };

  const handleAdminConfirmRemoveUser = async () => {
    if (!adminRemoveUser) return;
    setAdminActionStatus({ loading: true, msg: 'সম্পূর্ণ অ্যাপ থেকে রিমুভ করা হচ্ছে...', type: 'info' });
    const res = await removeMemberFromApp(adminRemoveUser.id, adminRemoveUser.email);
    setAdminActionStatus({ loading: false, msg: res.message, type: res.success ? 'success' : 'error' });
    if (res.success) {
      if (getRegisteredUsers) {
        const updated = await getRegisteredUsers();
        if (updated) setRegisteredUsersList(updated);
      }
      setDirectMessages((prev) => prev.filter(dm => (dm.targetEmail || '').toLowerCase() !== (adminRemoveUser.email || '').toLowerCase()));
      setCustomGroups((prev) => prev.map(g => ({
        ...g,
        members: (g.members || []).filter(m => m !== adminRemoveUser.name && m !== adminRemoveUser.email)
      })));
      setTimeout(() => {
        setAdminRemoveUser(null);
        setAdminActionStatus({ loading: false, msg: '', type: '' });
      }, 1200);
    }
  };

  const pinnedMessages = messages.filter((msg) => {
    if (!msg.content) return false;
    if (msg.content.startsWith('{"text":')) {
      try {
        const parsed = JSON.parse(msg.content);
        return !!parsed.pinned;
      } catch (e) {
        return false;
      }
    }
    return false;
  });

  const onlineUsersList = Object.values(onlineUsers).filter(
    (u) => Date.now() - (u.lastSeen || 0) < 40000
  );
  if (!onlineUsersList.some((u) => u.username === username) && username) {
    onlineUsersList.unshift({
      username,
      avatarId: selectedAvatarId,
      room: activeRoom,
      lastSeen: Date.now()
    });
  }
  const onlineCount = onlineUsersList.length;

  return (
      <div 
        className={`flex-1 w-full h-[calc(100vh-3.5rem)] min-h-[500px] overflow-hidden bg-slate-900 border-x border-slate-800/80 transition-all duration-200
          grid grid-cols-1 ${
            isInfoDrawerOpen 
              ? 'md:grid-cols-[280px_1fr] lg:grid-cols-[320px_1fr_288px] xl:grid-cols-[350px_1fr_320px]' 
              : 'md:grid-cols-[280px_1fr] lg:grid-cols-[320px_1fr] xl:grid-cols-[360px_1fr]'
          }`} 
        id="chat-applet"
      >
        {/* Left Sidebar - Contacts & Groups */}
        <aside 
          aria-label="পরিচিতি ও গ্রুপ সাইডবার"
          className={`w-full md:w-auto bg-slate-950 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col flex-shrink-0 h-full overflow-hidden ${
            mobileView === 'chat' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Mobile Quick Switch Bar to Jump to Active Chat */}
          <div className="md:hidden px-3.5 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-white">পরিচিতি ও গ্রুপ তালিকা</span>
            </div>
            <button
              type="button"
              onClick={() => setMobileView('chat')}
              className="px-3 py-1 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95 shadow-sm"
              title="বর্তমান চ্যাট উইন্ডোতে ফিরে যান"
            >
              <span>বর্তমান চ্যাট</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        
        {/* Profile Card */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Interactive Avatar Selector */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsAvatarPickerOpen(!isAvatarPickerOpen)}
                  className={`relative flex items-center justify-center w-11 h-11 rounded-full ${
                    customAvatarUrl ? 'bg-slate-800' : 'bg-gradient-to-tr ' + ((PRESET_AVATARS.find((a) => a.id === selectedAvatarId) || PRESET_AVATARS[0]).bg)
                  } text-xl shadow-md cursor-pointer select-none active:scale-95 transition-transform duration-150 border border-slate-700/50 group overflow-hidden`}
                  title="প্রোফাইল ছবি বা অ্যাভাটার পরিবর্তন করুন"
                >
                  {customAvatarUrl ? (
                    <img src={customAvatarUrl} alt={username} className="w-full h-full object-cover rounded-full" />
                  ) : (
                    (PRESET_AVATARS.find((a) => a.id === selectedAvatarId) || PRESET_AVATARS[0]).emoji
                  )}
                  <div className="absolute -bottom-1 -right-1 bg-slate-900 border border-slate-800 rounded-full p-0.5 text-[8px] text-slate-400 group-hover:text-white group-hover:border-slate-600 transition z-10">
                    <ChevronDown className="w-2.5 h-2.5" />
                  </div>
                </button>

                {/* Avatar Picker Dropdown Panel */}
                {isAvatarPickerOpen && (
                  <div className="absolute left-0 mt-2 p-3.5 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 w-64 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="flex items-center justify-between mb-2.5 pb-1.5 border-b border-slate-800">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-blue-400" />
                        প্রোফাইল ছবি ও অ্যাভাটার
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsAvatarPickerOpen(false)}
                        className="text-slate-500 hover:text-white p-0.5 rounded-lg hover:bg-slate-800 transition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Custom Image Upload Option */}
                    <div className="mb-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                      <input
                        type="file"
                        ref={profileFileInputRef}
                        accept="image/*"
                        onChange={handleProfileImageUpload}
                        className="hidden"
                      />
                      {customAvatarUrl ? (
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <img src={customAvatarUrl} alt="Custom Profile" className="w-9 h-9 rounded-full object-cover border border-blue-500/50 shadow flex-shrink-0" />
                            <div className="truncate">
                              <p className="text-xs font-bold text-white truncate">কাস্টম ছবি যুক্ত</p>
                              <p className="text-[10px] text-emerald-400 font-medium">সক্রিয় রয়েছে</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleRemoveCustomAvatar}
                            className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-[10px] font-bold transition flex items-center gap-1 flex-shrink-0"
                            title="ছবি মুছুন"
                          >
                            <Trash2 className="w-3 h-3" />
                            মুছুন
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => profileFileInputRef.current?.click()}
                          className="w-full py-2 px-3 bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-blue-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 group cursor-pointer"
                        >
                          <Upload className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                          <span>গ্যালারি থেকে ছবি আপলোড</span>
                        </button>
                      )}
                    </div>

                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">অথবা ইমোজি সিলেক্ট করুন</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {PRESET_AVATARS.map((av) => {
                        const isSel = !customAvatarUrl && av.id === selectedAvatarId;
                        return (
                          <button
                            key={av.id}
                            type="button"
                            onClick={() => {
                              if (customAvatarUrl) {
                                setCustomAvatarUrl(null);
                                if (typeof window !== 'undefined') {
                                  localStorage.removeItem('rg_custom_avatar_url');
                                }
                              }
                              handleSelectAvatar(av.id);
                            }}
                            className={`flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-tr ${av.bg} text-lg transition duration-150 hover:scale-105 active:scale-90 relative ${
                              isSel ? 'ring-2 ring-blue-500 shadow-lg scale-105' : 'hover:opacity-95'
                            }`}
                            title={av.label}
                          >
                            {av.emoji}
                            {isSel && (
                              <div className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full p-0.5 shadow">
                                <Check className="w-2.5 h-2.5" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold font-mono">আপনার ডাকনাম</p>
                {isEditingUsername ? (
                  <div className="flex items-center gap-1.5 mt-1">
                    <input
                      type="text"
                      value={tempUsername}
                      onChange={(e) => setTempUsername(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveUsername()}
                      className="bg-slate-800 border border-slate-700 text-xs px-2 py-1 rounded text-white focus:outline-none focus:border-blue-500 w-36"
                    />
                    <button
                      onClick={handleSaveUsername}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white p-1 rounded"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm font-semibold text-white truncate max-w-[130px]">{username}</span>
                    <button
                      onClick={() => setIsEditingUsername(true)}
                      className="text-slate-400 hover:text-white transition"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              অনলাইন
            </div>
          </div>
        </div>

        {/* Office Search Bar */}
        <div className={`p-3 border-b ${isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-100/80 border-slate-200'}`}>
          <div className="relative">
            <Search className={`w-3.5 h-3.5 absolute left-3 top-2.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} />
            <input
              type="text"
              placeholder="অফিস গ্রুপ বা মেম্বার খুঁজুন..."
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              className={`w-full text-xs pl-8 pr-7 py-2 rounded-full border focus:outline-none transition ${
                isDarkMode
                  ? 'bg-slate-900 border-slate-700/80 text-white placeholder-slate-500 focus:border-indigo-500'
                  : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-500 shadow-sm'
              }`}
            />
            {userSearchQuery && (
              <button
                type="button"
                onClick={() => setUserSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Contacts & Groups Navigation Tabs */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-slate-800 bg-slate-950/70 flex-shrink-0">
          <button
            type="button"
            onClick={() => setSidebarTab('all')}
            className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              sidebarTab === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <span>সব ({filteredOfficeGroups.length + filteredOfficeMembers.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSidebarTab('dms')}
            className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              sidebarTab === 'dms'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>পরিচিতি ({filteredOfficeMembers.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSidebarTab('groups')}
            className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              sidebarTab === 'groups'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>গ্রুপ ({filteredOfficeGroups.length})</span>
          </button>
        </div>

        {/* Office Messenger Content Feed */}
        <div className="p-3 flex-1 overflow-y-auto space-y-5 custom-scrollbar">
          
          {/* Section 1: Office Work Groups */}
          {(sidebarTab === 'all' || sidebarTab === 'groups') && (
            <div>
              <div className="flex items-center justify-between px-1 mb-2.5">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                <span>কাজের গ্রুপসমূহ ({filteredOfficeGroups.length})</span>
              </h4>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setIsCreateGroupOpen(true)}
                  className="text-[11px] bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded-xl border border-indigo-500/40 font-bold flex items-center gap-1 transition active:scale-95 shadow-sm"
                  title="অ্যাডমিন হিসেবে নতুন কাজের গ্রুপ তৈরি করুন"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>নতুন গ্রুপ</span>
                </button>
              )}
            </div>

            {filteredOfficeGroups.length === 0 ? (
              <div className="p-4 bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl text-center space-y-1.5">
                <p className="text-xs text-slate-400">কোনো কাজের গ্রুপ পাওয়া যায়নি</p>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setIsCreateGroupOpen(true)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-bold underline inline-flex items-center gap-1"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    নতুন গ্রুপ তৈরি করুন
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredOfficeGroups.map((group) => {
                  const isActive = activeRoom === group.id;
                  const memberCount = (group.members || []).length;
                  const groupAvatar = group.customAvatarUrl || group.avatarUrl;
                  return (
                    <div
                      key={group.id}
                      onClick={() => handleSelectRoom(group.id)}
                      className={`w-full text-left flex items-center justify-between gap-2.5 p-2.5 rounded-2xl transition duration-150 cursor-pointer group/grp ${
                        isActive
                          ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-600/25'
                          : 'text-slate-300 hover:bg-slate-900 hover:text-white border border-transparent hover:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate min-w-0">
                        {groupAvatar ? (
                          <img
                            src={groupAvatar}
                            alt={group.name}
                            className="w-10 h-10 rounded-2xl object-cover border border-indigo-500/30 flex-shrink-0 shadow-sm"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-2xl bg-indigo-950/80 border border-indigo-500/30 flex items-center justify-center text-lg flex-shrink-0 shadow-sm">
                            {group.emoji || '💼'}
                          </div>
                        )}
                        <div className="truncate">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold truncate">{group.name}</p>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-indigo-300'}`}>
                              {group.members && group.members.includes('ALL') ? 'সবাই' : `${memberCount} জন`}
                            </span>
                          </div>
                          <p className={`text-[11px] truncate mt-0.5 ${isActive ? 'text-indigo-100' : 'text-slate-500'}`}>
                            {group.desc}
                          </p>
                        </div>
                      </div>
                      
                      {/* Admin Group Controls */}
                      {isAdmin && (
                        <div className="flex items-center gap-1 opacity-80 group-hover/grp:opacity-100 transition flex-shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditGroup(group);
                            }}
                            className="text-slate-400 hover:text-indigo-300 p-1.5 rounded-lg hover:bg-slate-950/60 transition"
                            title="গ্রুপ সম্পাদনা ও মেম্বার তালিকা"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`আপনি কি "${group.name}" গ্রুপটি ডিলিট করতে চান?`)) {
                                handleDeleteCustomGroup(group.id, e);
                              }
                            }}
                            className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-950/60 transition"
                            title="গ্রুপ ডিলিট করুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          )}

          {/* Section 2: Office Registered Members & Direct Chat */}
          {(sidebarTab === 'all' || sidebarTab === 'dms') && (
            <div className={sidebarTab === 'all' ? 'pt-3 border-t border-slate-800/80' : ''}>
              <div className="flex items-center justify-between px-1 mb-2.5">
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>অফিস মেম্বারগণ ({filteredOfficeMembers.length})</span>
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5">শুধুমাত্র লগইনকৃত অফিস মেম্বার</p>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                অফিস টিম
              </span>
            </div>

            {filteredOfficeMembers.length === 0 ? (
              <div className="p-4 bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl text-center">
                <p className="text-xs text-slate-400">কোনো মেম্বার খুঁজে পাওয়া যায়নি</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredOfficeMembers.map((usr) => {
                  const isSelf = usr.email?.toLowerCase() === user?.email?.toLowerCase() || usr.name === username;
                  const isUserOnline = !!onlineUsers[usr.name] || isSelf;
                  const isChiefAdmin = usr.email?.toLowerCase() === 'redgreenonline2023@gmail.com';
                  const userDMId = !isSelf ? getDMRoomId(username, usr.name || usr.email) : null;
                  const isCurrentDM = activeRoom === userDMId;

                  return (
                    <div
                      key={usr.id || usr.email}
                      onClick={() => {
                        if (!isSelf) handleStartDirectMessage(usr);
                      }}
                      className={`w-full text-left flex items-center justify-between gap-2.5 p-2.5 rounded-2xl transition duration-150 border ${
                        isCurrentDM
                          ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                          : isDarkMode
                          ? 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-800/80 text-slate-300'
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800 shadow-sm'
                      } ${!isSelf ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <div className="flex items-center gap-2.5 truncate min-w-0">
                        {/* Avatar with Online Indicator */}
                        <div className="relative flex-shrink-0">
                          {usr.custom_avatar_url ? (
                            <img
                              src={usr.custom_avatar_url}
                              alt={usr.name}
                              className="w-10 h-10 rounded-full object-cover border border-slate-700 shadow-sm"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-base shadow-sm">
                              {usr.avatar_emoji || (isChiefAdmin ? '👑' : '👤')}
                            </div>
                          )}
                          <span
                            className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-slate-950 ${
                              isUserOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'
                            }`}
                            title={isUserOnline ? 'অনলাইন' : 'অফলাইন'}
                          />
                        </div>

                        {/* Name, Role & Email */}
                        <div className="truncate">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold truncate">
                              {usr.name}
                              {isSelf && <span className="text-[10px] text-blue-300 ml-1 font-normal">(আপনি)</span>}
                            </p>
                          </div>
                          
                          {/* Role Tag */}
                          <div className="flex items-center gap-1 mt-0.5">
                            {isChiefAdmin ? (
                              <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded-full font-semibold flex items-center gap-0.5">
                                <Crown className="w-2.5 h-2.5" /> অ্যাডমিন ও ডেভেলপার
                              </span>
                            ) : (
                              <span className={`text-[10px] truncate ${isCurrentDM ? 'text-blue-100' : 'text-slate-400'}`}>
                                {usr.role || 'অফিস মেম্বার'}
                              </span>
                            )}
                          </div>
                          <p className={`text-[9px] font-mono truncate ${isCurrentDM ? 'text-blue-200' : 'text-slate-500'}`}>
                            {usr.email}
                          </p>
                        </div>
                      </div>

                      {/* Right Action Buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Direct Chat Button */}
                        {!isSelf && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartDirectMessage(usr);
                            }}
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition active:scale-95 flex items-center gap-1 ${
                              isCurrentDM
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30'
                            }`}
                            title={`${usr.name} এর সাথে চ্যাট করুন`}
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>{isCurrentDM ? 'সক্রিয়' : 'চ্যাট'}</span>
                          </button>
                        )}

                        {/* Admin Controls: Edit Profile & Remove Member */}
                        {isAdmin && !isSelf && !isChiefAdmin && (
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAdminEditUser({ ...usr });
                              }}
                              className="p-1 text-slate-400 hover:text-indigo-300 hover:bg-slate-800 rounded-lg transition"
                              title="মেম্বার প্রোফাইল ও পদবী নিয়ন্ত্রণ (অ্যাডমিন)"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAdminRemoveUser({ ...usr });
                              }}
                              className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                              title="সম্পূর্ণ অ্যাপ থেকে এই মেম্বারকে রিমুভ করুন (অ্যাডমিন)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          )}
        </div>

        {/* Sidebar Presence Footer */}
        <div className="p-2.5 px-3 border-t border-slate-800/80 bg-slate-950 flex items-center justify-between flex-shrink-0 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-medium">{onlineCount} জন অনলাইনে সক্রিয়</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">লাইভ ড্যাশবোর্ড</span>
        </div>
      </aside>

      {/* Right Main Chat Area */}
      <main 
        aria-label="প্রধান চ্যাট উইন্ডো"
        className={`flex-1 flex flex-col h-full overflow-hidden relative min-w-0 transition-colors duration-200 ${
          mobileView === 'contacts' ? 'hidden md:flex' : 'flex'
        } ${isDarkMode ? 'bg-slate-900/40' : 'bg-slate-50'}`}
      >
        {/* Modern Facebook Messenger Style Chat Header */}
        <header className={`px-3 sm:px-4 md:px-6 py-3 border-b flex items-center justify-between flex-shrink-0 z-10 transition-colors duration-200 ${isDarkMode ? 'border-slate-800 bg-slate-900/95 backdrop-blur-md' : 'border-slate-200 bg-white shadow-sm'}`}>
          
          {/* Header Left: Avatar & Meta */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile Back Button to Contacts */}
            <button
              type="button"
              onClick={() => setMobileView('contacts')}
              className="md:hidden p-2 -ml-1 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition flex items-center gap-1 text-xs font-bold shrink-0 shadow-sm active:scale-95"
              title="পরিচিতি ও গ্রুপ তালিকায় ফিরুন"
            >
              <ArrowLeft className="w-4 h-4 text-blue-400" />
              <span className="hidden xs:inline">তালিকা</span>
            </button>
            {currentRoomObj.isDM ? (
              /* 1-on-1 Personal Messenger Header */
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-lg shadow-sm">
                    {currentRoomObj.avatarEmoji || '👤'}
                  </div>
                  {onlineUsers[currentRoomObj.targetName] ? (
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-slate-900 shadow-sm" />
                  ) : (
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-slate-500 ring-2 ring-slate-900" />
                  )}
                </div>
                <div className="truncate">
                  <h3 className={`text-sm md:text-base font-bold truncate flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    <span>{currentRoomObj.targetName || currentRoomObj.name}</span>
                    <span className="text-[10px] bg-blue-500/15 text-blue-400 border border-blue-500/30 px-2 py-0.2 rounded-full font-normal hidden sm:inline">
                      {currentRoomObj.targetRole || 'সদস্য'}
                    </span>
                  </h3>
                  <div className="text-xs flex items-center gap-1.5 truncate mt-0.5">
                    {typingUsers[currentRoomObj.targetName] ? (
                      <span className="text-blue-400 font-bold flex items-center gap-1.5 animate-pulse">
                        <span className="flex gap-0.5 items-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:-0.3s]"></span>
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:-0.15s]"></span>
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce"></span>
                        </span>
                        <span>টাইপ করছেন... (Typing...)</span>
                      </span>
                    ) : onlineUsers[currentRoomObj.targetName] ? (
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Active now (অনলাইনে আছেন)
                      </span>
                    ) : (
                      <span className="text-slate-400">অফলাইন</span>
                    )}
                  </div>
                </div>
              </div>
            ) : currentRoomObj.isCustom ? (
              /* Custom Group Messenger Header */
              <div
                onClick={() => handleOpenEditGroup(currentRoomObj)}
                className="flex items-center gap-3 min-w-0 cursor-pointer group/hdr hover:opacity-95 transition"
                title="গ্রুপের তথ্য, নাম ও এভারটার পরিবর্তন করতে ক্লিক করুন"
              >
                {currentRoomObj.customAvatarUrl || currentRoomObj.avatarUrl ? (
                  <img
                    src={currentRoomObj.customAvatarUrl || currentRoomObj.avatarUrl}
                    alt={currentRoomObj.name}
                    className="w-10 h-10 rounded-2xl object-cover border border-indigo-500/40 flex-shrink-0 shadow-sm"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-2xl bg-indigo-950/80 border border-indigo-500/30 flex items-center justify-center text-xl flex-shrink-0 shadow-sm">
                    {currentRoomObj.emoji || '💬'}
                  </div>
                )}
                <div className="truncate">
                  <h3 className={`text-sm md:text-base font-bold truncate flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    <span className="group-hover/hdr:text-indigo-400 transition">{currentRoomObj.name}</span>
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.2 rounded-full font-normal hidden sm:inline">
                      মেসেঞ্জার গ্রুপ
                    </span>
                    <Edit3 className="w-3 h-3 text-slate-500 group-hover/hdr:text-indigo-400 transition opacity-0 group-hover/hdr:opacity-100 hidden sm:inline" />
                  </h3>
                  <div className="text-xs text-slate-400 truncate mt-0.5 flex items-center gap-2">
                    {Object.entries(typingUsers).filter(([u, isTyping]) => isTyping && u !== username).length > 0 ? (
                      <span className="text-blue-400 font-semibold flex items-center gap-1.5 animate-pulse">
                        <span className="flex gap-0.5 items-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:-0.3s]"></span>
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:-0.15s]"></span>
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce"></span>
                        </span>
                        <span>{Object.entries(typingUsers).filter(([u, isTyping]) => isTyping && u !== username).map(([u]) => u).join(', ')} লিখছেন...</span>
                      </span>
                    ) : (
                      <span>{(currentRoomObj.members || [currentRoomObj.createdBy || username]).length} জন সদস্য • {onlineCount} জন অনলাইনে</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Public Channel Header */
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                  <Hash className="w-5 h-5 text-blue-400" />
                </div>
                <div className="truncate">
                  <h3 className={`text-sm md:text-base font-bold truncate flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    <span>{currentRoomObj.name}</span>
                  </h3>
                  <p className={`text-xs truncate mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {currentRoomObj.desc}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Header Right: Call Actions & Controls */}
          <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
            {/* Audio Call Button */}
            <button
              type="button"
              onClick={() => startCall('audio', currentRoomObj.targetName || currentRoomObj.name)}
              className="p-2 md:px-3 md:py-2 bg-blue-600/15 hover:bg-blue-600/30 text-blue-400 hover:text-blue-300 rounded-full border border-blue-500/30 text-xs font-bold transition flex items-center gap-1.5 active:scale-95 shadow-sm"
              title="অডিও কল করুন"
            >
              <Phone className="w-4 h-4" />
              <span className="hidden lg:inline">অডিও কল</span>
            </button>

            {/* Video Call Button */}
            <button
              type="button"
              onClick={() => startCall('video', currentRoomObj.targetName || currentRoomObj.name)}
              className="p-2 md:px-3 md:py-2 bg-indigo-600/15 hover:bg-indigo-600/30 text-indigo-400 hover:text-indigo-300 rounded-full border border-indigo-500/30 text-xs font-bold transition flex items-center gap-1.5 active:scale-95 shadow-sm"
              title="ভিডিও কল করুন"
            >
              <Video className="w-4 h-4" />
              <span className="hidden lg:inline">ভিডিও কল</span>
            </button>

            {/* Group Settings & Member Management Button for Custom Groups */}
            {currentRoomObj.isCustom && !currentRoomObj.isDM && (
              <>
                <button
                  type="button"
                  onClick={() => handleOpenEditGroup(currentRoomObj)}
                  className="flex items-center gap-1.5 px-2.5 py-2 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 hover:text-white border border-indigo-500/30 rounded-full text-xs font-bold transition shadow-sm cursor-pointer"
                  title="গ্রুপের নাম, এভারটার ও তথ্য সম্পাদনা করুন"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="hidden sm:inline">গ্রুপ সেটিংস</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleOpenEditGroup(currentRoomObj);
                    setEditGroupTab('members');
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 hover:text-white border border-blue-500/30 rounded-full text-xs font-bold transition shadow-sm cursor-pointer"
                  title="গ্রুপে সদস্য যোগ বা রিমুভ করুন"
                >
                  <UserPlus className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden sm:inline">সদস্য</span>
                  <span className="text-[10px] bg-blue-500/20 px-1.5 py-0.2 rounded-full font-mono">
                    {(currentRoomObj.members || [currentRoomObj.createdBy || username]).length}
                  </span>
                </button>
              </>
            )}

            {/* Info Details Toggle Button */}
            <button
              type="button"
              onClick={() => setIsInfoDrawerOpen(!isInfoDrawerOpen)}
              className={`p-2 rounded-full border text-xs font-bold transition shadow-sm cursor-pointer ${
                isInfoDrawerOpen
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700/60'
              }`}
              title="চ্যাট বিস্তারিত ও তথ্য দেখুন"
            >
              <Info className="w-4 h-4" />
            </button>

            {/* Task Alert & Alarm Button */}
            <button
              type="button"
              onClick={() => setIsTaskAlertModalOpen(true)}
              className="flex items-center gap-1.5 p-2 md:px-2.5 md:py-2 bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 hover:text-white border border-rose-500/30 rounded-full text-xs font-bold transition shadow-sm cursor-pointer relative"
              title="টাস্ক অ্যালার্ট ও নির্ধারিত সময়ে সাউন্ড অ্যালার্ম সেট করুন"
            >
              <Bell className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden xl:inline">টাস্ক অ্যালার্ট</span>
              {taskAlerts.filter(a => !a.isTriggered).length > 0 && (
                <span className="bg-rose-500 text-white font-mono text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                  {taskAlerts.filter(a => !a.isTriggered).length}
                </span>
              )}
            </button>

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={handleToggleTheme}
              className={`p-2 border rounded-full text-xs font-bold transition shadow-sm cursor-pointer ${
                isDarkMode
                  ? 'bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border-amber-500/30'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
              }`}
              title={isDarkMode ? 'লাইট মোড এ পরিবর্তন করুন' : 'ডার্ক মোড এ পরিবর্তন করুন'}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>
          </div>
        </header>

        {/* Background Messenger Push Notification Status Bar */}
        <div className={`px-4 py-1.5 border-b text-xs flex flex-wrap items-center justify-between gap-2 transition-colors duration-200 z-10 ${
          isDarkMode ? 'bg-slate-950/60 border-slate-800/80 text-slate-300' : 'bg-indigo-50/70 border-indigo-100 text-slate-700'
        }`}>
          <div className="flex items-center gap-2 min-w-0">
            {isPushSubscribed ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="truncate">
                  ব্যাকগ্রাউন্ড মেসেঞ্জার সক্রিয় (অ্যাপ বন্ধ থাকলেও মোবাইলে নোটিফিকেশন যাবে)
                </span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                <Bell className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                <span className="truncate">
                  অ্যাপ বন্ধ থাকা অবস্থায় মোবাইলে নোটিফিকেশন পেতে পুশ সার্ভিস অন করুন
                </span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {pushStatusMessage && (
              <span className="text-[11px] text-indigo-400 font-medium bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md animate-pulse">
                {pushStatusMessage}
              </span>
            )}

            {!isPushSubscribed ? (
              <button
                type="button"
                onClick={handleEnablePushNotifications}
                disabled={isPushRegistering}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] px-2.5 py-1 rounded-lg shadow-sm transition flex items-center gap-1 active:scale-95 disabled:opacity-50"
              >
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>{isPushRegistering ? 'চালু হচ্ছে...' : 'নোটিফিকেশন অন করুন'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSendTestPush}
                disabled={isSendingTestPush}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-[11px] px-2 py-0.5 rounded-lg transition flex items-center gap-1 active:scale-95 disabled:opacity-50"
                title="আপনার ডিভাইসে টেস্ট পুশ নোটিফিকেশন পাঠান"
              >
                <Smartphone className="w-3 h-3 text-emerald-400" />
                <span>{isSendingTestPush ? 'পাঠানো হচ্ছে...' : '🔔 টেস্ট পুশ পাঠান'}</span>
              </button>
            )}
          </div>
        </div>


        {/* Pinned Messages Banner */}
        {pinnedMessages.length > 0 && (
          <div className="bg-slate-950/90 border-b border-slate-800 px-4 py-2 flex flex-col gap-2 transition duration-200 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-amber-400 font-bold">
                <Pin className="w-3.5 h-3.5 fill-amber-400 text-amber-400 animate-pulse" />
                <span>📌 পিন করা চ্যাট বার্তা ({pinnedMessages.length}টি)</span>
              </div>
              <button
                type="button"
                onClick={() => setPinnedExpanded(!pinnedExpanded)}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 font-mono transition"
              >
                {pinnedExpanded ? 'সংকুচিত করুন' : 'সব দেখুন'}
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${pinnedExpanded ? 'rotate-180' : ''}`} />
              </button>
            </div>

            <div className={`space-y-1.5 ${pinnedExpanded ? 'max-h-48 overflow-y-auto' : 'max-h-8 overflow-hidden'}`}>
              {pinnedMessages.map((pMsg) => {
                let pText = pMsg.content;
                try {
                  pText = JSON.parse(pMsg.content).text;
                } catch (e) {}
                return (
                  <div 
                    key={pMsg.id}
                    onClick={() => scrollToMessage(pMsg.id)}
                    className="flex items-center justify-between gap-3 bg-slate-900/90 hover:bg-slate-800 p-2 rounded-xl border border-amber-500/30 text-xs cursor-pointer group/pin transition"
                  >
                    <div className="flex items-center gap-2 truncate min-w-0">
                      <span className="font-bold text-amber-300 truncate max-w-[110px]">{pMsg.sender}:</span>
                      <span className="text-slate-200 truncate">{pText}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] text-slate-500 group-hover/pin:text-blue-400 font-medium">লাফিয়ে যান →</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePinMessage(pMsg);
                        }}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-950 transition"
                        title="আনপিন করুন"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {dbError && (
            <div className="bg-amber-950/40 border border-amber-800/80 rounded-xl p-4 text-xs text-amber-300 space-y-2 mb-4 animate-in fade-in duration-200">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-1.5 flex-1">
                  <h4 className="font-bold text-amber-200">সুপাবেস ডাটাবেস সতর্কবার্তা!</h4>
                  <p className="leading-relaxed text-slate-300">
                    আপনার সুপাবেস ডাটাবেসে RLS পারমিশন অথবা কলাম স্ট্রাকচার সংক্রান্ত ইস্যু ডিটেক্ট হয়েছে। (মেসেজ অফলাইনে আদান-প্রদান চালু আছে)
                  </p>
                  <p className="text-slate-400 font-mono text-[10px] bg-slate-950/60 p-1.5 rounded border border-amber-900/40">
                    Error Details: {dbError.message || JSON.stringify(dbError)} {dbError.code ? `(Code: ${dbError.code})` : ''}
                  </p>
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setIsSqlModalOpen(true)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs inline-flex items-center gap-1.5 transition shadow"
                    >
                      <Database className="w-3.5 h-3.5" />
                      <span>সুপাবেস SQL সমাধান গাইড দেখুন</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
              <div className="bg-slate-800 p-4 rounded-full text-slate-500">
                <MessageSquare className="w-10 h-10 text-blue-500" />
              </div>
              <div>
                <p className="text-slate-300 font-bold">এই চ্যানেলে কোনো বার্তা নেই</p>
                <p className="text-slate-500 text-xs mt-1">প্রথম বার্তা লিখে চ্যাট শুরু করুন!</p>
              </div>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isMe = msg.sender === username;
              
              // Parse potential JSON message (for Reply & Edited status)
              let isReply = false;
              let replyInfo = null;
              let isEdited = false;
              let isPinned = false;
              let isTaskAlert = false;
              let contentText = msg.content;
              let messageAvatarId = null;
              let messageImage = null;
              let messageCustomAvatarUrl = null;
              let messageAudio = null;
              let messageAudioDuration = null;
              
              if (msg.content && typeof msg.content === 'string' && msg.content.trim().startsWith('{')) {
                try {
                  const parsed = JSON.parse(msg.content);
                  if (parsed && typeof parsed === 'object') {
                    contentText = parsed.text !== undefined ? parsed.text : msg.content;
                    replyInfo = parsed.replyTo;
                    isReply = !!replyInfo;
                    isEdited = !!parsed.edited;
                    isPinned = !!parsed.pinned;
                    isTaskAlert = !!parsed.isTaskAlert;
                    messageAvatarId = parsed.avatar;
                    messageImage = parsed.image;
                    messageCustomAvatarUrl = parsed.customAvatarUrl;
                    messageAudio = parsed.audio;
                    messageAudioDuration = parsed.audioDuration;
                  }
                } catch (e) {
                  // Fallback to plain text
                }
              }

              // Retrieve the correct avatar object or custom URL
              const senderCustomAvatar = 
                messageCustomAvatarUrl || 
                (msg.sender === username ? customAvatarUrl : null) || 
                onlineUsers[msg.sender]?.customAvatarUrl || 
                profilesMap[msg.sender] || 
                (msg.sender === username && typeof window !== 'undefined' ? localStorage.getItem('rg_custom_avatar_url') : null) ||
                (user?.name === msg.sender ? user.custom_avatar_url : null);
              const avatarObj = messageAvatarId 
                ? (PRESET_AVATARS.find(a => a.id === messageAvatarId) || getAvatarForUsername(msg.sender))
                : getAvatarForUsername(msg.sender);

              return (
                <div 
                  key={msg.id || index} 
                  id={`msg-${msg.id}`}
                  className={`flex items-start gap-2.5 group relative mb-3 hover:bg-slate-800/10 p-2 rounded-xl transition duration-200 ${
                    isMe ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  {/* Sender Avatar Column */}
                  <div className="relative flex-shrink-0">
                    {senderCustomAvatar ? (
                      <img
                        src={senderCustomAvatar}
                        alt={msg.sender}
                        className="w-8 h-8 rounded-full object-cover shadow border border-slate-700/50 select-none"
                        title={msg.sender}
                      />
                    ) : (
                      <div 
                        className={`w-8 h-8 rounded-full bg-gradient-to-tr ${avatarObj.bg} text-sm flex items-center justify-center shadow select-none`}
                        title={`${msg.sender} (${avatarObj.label})`}
                      >
                        {avatarObj.emoji}
                      </div>
                    )}
                    {onlineUsers[msg.sender] && (
                      <span 
                        className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900 shadow-sm"
                        title="অনলাইনে আছেন"
                      />
                    )}
                  </div>

                  {/* Message Bubble + Meta Column */}
                  <div className={`flex flex-col max-w-[80%] ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-1.5 mb-1 text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-400 flex items-center gap-1">
                        {msg.sender}
                        {onlineUsers[msg.sender] && (
                          <span className="inline-flex items-center gap-1 text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded-full font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            অনলাইন
                          </span>
                        )}
                      </span>
                      <span>•</span>
                      <span className="font-mono text-[10px] text-slate-400" title={msg.created_at ? new Date(msg.created_at).toLocaleString('bn-BD') : ''}>
                        {formatExactDateTime(msg.created_at)}
                      </span>
                      {isEdited && (
                        <span className="bg-slate-800/80 px-1.5 py-0.2 rounded text-[9px] text-slate-400 select-none">
                          (সম্পাদিত)
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 max-w-full relative">
                      {/* Message Bubble */}
                      <div className={`max-w-[100%] rounded-2xl px-4 py-2.5 text-sm shadow-sm relative ${
                        isMe 
                          ? 'bg-blue-600 text-white rounded-tr-none shadow-md' 
                          : isDarkMode
                          ? 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700/60'
                          : 'bg-white text-slate-900 rounded-tl-none border border-slate-200 shadow-sm'
                      } ${isPinned ? 'ring-1 ring-amber-400/80 shadow-md shadow-amber-500/10' : ''}`}>
                        
                        {/* Pinned Badge inside Bubble */}
                        {isPinned && (
                          <div className="mb-1.5 flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded-full w-fit">
                            <Pin className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span>পিন করা বার্তা</span>
                          </div>
                        )}

                        {/* Task Alert Badge inside Bubble */}
                        {isTaskAlert && (
                          <div className="mb-2 p-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 flex items-center gap-2">
                            <Bell className="w-4 h-4 text-rose-400 animate-pulse shrink-0" />
                            <span className="text-xs font-bold">⏰ অ্যালার্ম সংকেতযুক্ত টাস্ক অ্যালার্ট</span>
                          </div>
                        )}

                        {/* Quoted Reply Box */}
                        {isReply && replyInfo && (
                          <div 
                            onClick={() => scrollToMessage(replyInfo.id)}
                            className={`mb-2 pl-2.5 border-l-2 text-xs py-1 rounded bg-slate-950/30 hover:bg-slate-950/50 transition cursor-pointer select-none max-w-md ${
                              isMe ? 'border-blue-300 text-blue-100' : 'border-blue-500 text-slate-400'
                            }`}
                          >
                            <div className="font-bold text-[10px] uppercase mb-0.5">{replyInfo.sender}</div>
                            <div className="truncate italic">{replyInfo.content}</div>
                          </div>
                        )}
                        
                        {contentText && (
                          <p className="whitespace-pre-wrap break-words leading-relaxed">{renderMessageText(contentText)}</p>
                        )}

                        {messageImage && (
                          <ImageMessageBubble 
                            imageUrl={messageImage}
                            isMe={isMe}
                            onOpenLightbox={(url) => setLightboxImage(url)}
                          />
                        )}

                        {messageAudio && (
                          <VoiceMessageBubble 
                            audioSrc={messageAudio}
                            duration={messageAudioDuration}
                            isMe={isMe}
                            isDarkMode={isDarkMode}
                          />
                        )}

                        {/* Web Preview Card */}
                        {(() => {
                          const preview = getLinkPreview(contentText);
                          if (!preview) return null;
                          return (
                            <a 
                              href={preview.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-3 block rounded-xl bg-slate-950/60 hover:bg-slate-950/80 border border-slate-700/40 overflow-hidden transition-all duration-200 max-w-[280px] sm:max-w-xs group/preview text-left"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {preview.image && (
                                <div className="relative h-24 w-full overflow-hidden">
                                  <img 
                                    src={preview.image} 
                                    alt={preview.title}
                                    className="w-full h-full object-cover group-hover/preview:scale-105 transition-transform duration-300"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="absolute top-1.5 left-1.5 bg-slate-950/80 backdrop-blur px-1.5 py-0.2 rounded text-[9px] text-slate-400 font-mono">
                                    {preview.siteName}
                                  </div>
                                </div>
                              )}
                              <div className="p-2 bg-slate-900/40">
                                <h4 className="text-[11px] font-bold text-slate-200 line-clamp-1 group-hover/preview:text-cyan-400 transition">
                                  {preview.title}
                                </h4>
                                <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2 leading-tight">
                                  {preview.description}
                                </p>
                              </div>
                            </a>
                          );
                        })()}

                        {/* Message Reactions display */}
                        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                          <div className={`flex flex-wrap items-center gap-1 mt-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                            {Object.entries(msg.reactions).map(([emoji, users]) => {
                              const hasReacted = users.includes(username);
                              return (
                                <button
                                  key={emoji}
                                  onClick={() => handleAddReaction(msg, emoji)}
                                  className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition active:scale-95 shadow-sm ${
                                    hasReacted
                                      ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500/50'
                                      : 'bg-slate-900/60 text-slate-300 border-slate-700/50 hover:bg-slate-800'
                                  }`}
                                  title={`${users.join(', ')} রিঅ্যাক্ট করেছেন`}
                                >
                                  <span>{emoji}</span>
                                  <span className="text-[10px] font-bold text-slate-300">{users.length}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Seen / Read Receipt Badge for Sent Messages */}
                        {isMe && (
                          <div className="flex items-center justify-end gap-1 mt-1.5 text-[10px] select-none">
                            {msg.is_seen ? (
                              <span 
                                className="flex items-center gap-1 text-cyan-200 font-semibold bg-slate-950/40 px-2 py-0.5 rounded-full border border-cyan-500/30 shadow-sm"
                                title={msg.seen_at ? `দেখেছেন: ${formatExactDateTime(msg.seen_at)}` : 'মেসেজটি দেখেছেন'}
                              >
                                <CheckCheck className="w-3.5 h-3.5 text-cyan-300" />
                                <span className="text-[9px]">দেখা হয়েছে</span>
                              </span>
                            ) : (
                              <span 
                                className="flex items-center gap-1 text-slate-300/80 font-medium bg-slate-950/20 px-2 py-0.5 rounded-full border border-slate-700/30"
                                title="পৌঁছেছে (ডেলিভার্ড)"
                              >
                                <CheckCheck className="w-3.5 h-3.5 text-slate-300/70" />
                                <span className="text-[9px]">ডেলিভার্ড</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action buttons (Reactions, Reply, Edit, Delete) - Shows on Hover */}
                      {deletingMessageId === msg.id ? (
                        <div className="flex items-center gap-1.5 animate-in fade-in duration-100 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800 shadow-lg ml-2">
                          <span className="text-[10px] text-slate-400 font-bold">মুছবেন?</span>
                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="bg-rose-600 hover:bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-md font-bold transition"
                            type="button"
                          >
                            হ্যাঁ
                          </button>
                          <button
                            onClick={() => setDeletingMessageId(null)}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] px-2 py-0.5 rounded-md font-bold transition"
                            type="button"
                          >
                            না
                          </button>
                        </div>
                      ) : (
                        <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 ${
                          isMe ? 'mr-2 order-first' : 'ml-2'
                        }`}>
                          {/* Quick Emoji Reaction Buttons */}
                          <div className="flex items-center gap-0.5 bg-slate-900/90 border border-slate-700/60 rounded-xl p-1 shadow-md">
                            {['❤️', '👍', '😂', '😮', '🔥'].map((emoji) => (
                              <button
                                key={emoji}
                                onClick={() => handleAddReaction(msg, emoji)}
                                className="p-1 hover:bg-slate-800 rounded text-xs transition hover:scale-125"
                                title={`${emoji} রিঅ্যাকশন দিন`}
                                type="button"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>

                          <button 
                            onClick={() => handleTogglePinMessage(msg)}
                            className={`p-1.5 rounded-lg transition shadow-md border ${
                              isPinned 
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30' 
                                : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700/30'
                            }`}
                            title={isPinned ? "আনপিন করুন" : "বার্তাটি পিন করুন"}
                            type="button"
                          >
                            <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-amber-400 text-amber-400' : ''}`} />
                          </button>
                          <button 
                            onClick={() => handleReplyTo(msg)}
                            className="p-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition shadow-md border border-slate-700/30"
                            title="রিপ্লাই দিন"
                            type="button"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                          {isMe && (
                            <button 
                              onClick={() => handleStartEdit(msg)}
                              className="p-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition shadow-md border border-slate-700/30"
                              title="সম্পাদনা করুন"
                              type="button"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {(isMe || isAdmin || isModerator) && (
                            <button 
                              onClick={() => setDeletingMessageId(msg.id)}
                              className="p-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-400 hover:text-rose-300 rounded-lg transition shadow-md border border-rose-900/30"
                              title="ডিলিট করুন"
                              type="button"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          {/* Real-time Typing Indicators list */}
          {Object.entries(typingUsers).filter(([user, isTyping]) => isTyping && user !== username).length > 0 && (
            <div className="flex items-center gap-2.5 px-3 py-2 bg-slate-900/60 border border-slate-800/80 rounded-2xl w-fit animate-in fade-in slide-in-from-bottom-2 duration-200 mt-2 mb-2 shadow-sm">
              <div className="w-6 h-6 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-xs">
                💬
              </div>
              <div className="flex gap-1 items-center justify-center py-1">
                <span className="h-1.5 w-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="h-1.5 w-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="h-1.5 w-1.5 bg-blue-400 rounded-full animate-bounce"></span>
              </div>
              <span className="text-xs text-slate-300 font-medium">
                <strong className="text-blue-400">
                  {Object.entries(typingUsers)
                    .filter(([user, isTyping]) => isTyping && user !== username)
                    .map(([user]) => user)
                    .join(', ')}
                </strong>{' '}
                টাইপ করছেন...
              </span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply/Edit Indicator Bar */}
        {(replyingToMessage || editingMessage) && (
          <div className="px-4 py-2 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between animate-in slide-in-from-bottom duration-150">
            <div className="flex items-center gap-2.5 truncate">
              <div className="text-blue-500 flex-shrink-0">
                {replyingToMessage ? <MessageSquare className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
              </div>
              <div className="text-xs truncate">
                <span className="font-bold text-slate-300">
                  {replyingToMessage 
                    ? `${replyingToMessage.sender}-কে রিপ্লাই দিচ্ছেন:` 
                    : 'বার্তা সম্পাদনা করছেন:'}
                </span>{' '}
                <span className="text-slate-400 italic">
                  {(() => {
                    const msg = replyingToMessage || editingMessage;
                    let text = msg.content;
                    if (msg.content.startsWith('{"text":')) {
                      try {
                        text = JSON.parse(msg.content).text;
                      } catch (e) {}
                    }
                    return text;
                  })()}
                </span>
              </div>
            </div>
            <button
              onClick={replyingToMessage ? handleCancelReply : handleCancelEdit}
              className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition"
              type="button"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Chat Input Bar */}
        <form onSubmit={handleSendMessage} className={`p-3 md:p-4 border-t transition-colors duration-200 flex-shrink-0 sticky bottom-0 z-10 ${
          isDarkMode ? 'border-slate-800 bg-slate-900/95 backdrop-blur-md' : 'border-slate-200 bg-white shadow-lg'
        }`}>
          {/* Quick Emoji Panel */}
          <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-800 select-none">
            <span className="text-[11px] text-slate-500 font-medium mr-1 flex items-center gap-1">
              <Smile className="w-3.5 h-3.5 text-blue-500" />
              কুইক ইমোজি:
            </span>
            {['😄', '😂', '😍', '👍', '🔥', '👏', '🎉', '❤️', '🙌', '😮', '😢', '🙏'].map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setInputText(prev => prev + emoji)}
                className="w-7 h-7 flex items-center justify-center text-sm rounded-lg bg-slate-800/40 hover:bg-slate-800 text-slate-300 hover:text-white active:scale-90 transition duration-150"
              >
                {emoji}
              </button>
            ))}
          </div>

          {selectedImage && (
            <div className="mb-3 relative inline-block">
              <div className="relative rounded-xl overflow-hidden border border-slate-700/80 bg-slate-950/40 p-1 max-w-xs shadow-md">
                <img 
                  src={selectedImage} 
                  alt="Selected Attachment" 
                  className="max-h-24 rounded-lg object-contain"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedImage(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="absolute top-2 right-2 bg-slate-950/90 hover:bg-slate-900 text-rose-400 hover:text-rose-300 rounded-full p-1.5 transition shadow-lg border border-slate-800"
                  title="ছবি বাদ দিন"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Voice Audio Preview Card */}
          {recordedAudioUrl && (
            <div className={`mb-3 p-2.5 rounded-xl border flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
              isDarkMode ? 'bg-slate-950 border-rose-500/40' : 'bg-rose-50 border-rose-200'
            }`}>
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className="p-2 rounded-lg bg-rose-500/20 text-rose-500 shrink-0">
                  <Mic className="w-4 h-4 animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-[11px] font-bold text-rose-400 mb-1">
                    <span>রেকর্ড করা ভয়েস মেসেজ (রেডি)</span>
                    {recordingTime > 0 && <span className="font-mono">{formatRecordingTime(recordingTime)}</span>}
                  </div>
                  <audio src={recordedAudioUrl} controls className="w-full h-8 outline-none rounded-lg" />
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRecordedAudioUrl(null);
                  setRecordedAudioBlob(null);
                  setRecordingTime(0);
                }}
                className="p-2 text-slate-400 hover:text-rose-400 rounded-lg transition shrink-0"
                title="ভয়েস মেসেজটি মুছে ফেলুন"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const compressed = await resizeImage(file, 1000, 1000, 0.7);
                  setSelectedImage(compressed);
                } catch (err) {
                  console.error('Image processing error:', err);
                }
              }}
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white font-bold p-3.5 rounded-xl border border-slate-700/60 active:scale-95 transition-all duration-150 flex items-center justify-center flex-shrink-0"
              title="ছবি যুক্ত করুন"
            >
              <ImageIcon className="w-4 h-4" />
            </button>

            {/* Voice Record Button */}
            <button
              type="button"
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              className={`font-bold p-3.5 rounded-xl border active:scale-95 transition-all duration-150 flex items-center justify-center flex-shrink-0 ${
                isRecording
                  ? 'bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-600/30 animate-pulse'
                  : recordedAudioUrl
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                  : isDarkMode
                  ? 'bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border-slate-700/60'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              }`}
              title={isRecording ? "রেকর্ডিং থামান" : "ভয়েস মেসেজ রেকর্ড করুন"}
            >
              <Mic className={`w-4 h-4 ${isRecording ? 'animate-bounce' : ''}`} />
            </button>

            {isRecording ? (
              <div className={`flex-1 flex items-center justify-between gap-2.5 px-3 md:px-4 py-2.5 rounded-xl border ${
                isDarkMode ? 'bg-slate-950 border-rose-500/60 text-white shadow-inner' : 'bg-rose-50 border-rose-300 text-slate-900'
              }`}>
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                  <span className="text-xs font-bold text-rose-500 truncate">
                    রেকর্ডিং চলছে...
                  </span>
                  <span className="text-xs font-mono font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20 shrink-0">
                    {formatRecordingTime(recordingTime)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleCancelRecording}
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg transition"
                    title="রেকর্ডিং বাতিল করুন"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleStopRecording}
                    className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-2.5 py-1.5 rounded-lg text-xs transition flex items-center gap-1 shadow-sm active:scale-95"
                    title="রেকর্ডিং শেষ করে প্রিভিউ করুন"
                  >
                    <Square className="w-3.5 h-3.5 fill-white" />
                    <span>থামান</span>
                  </button>
                </div>
              </div>
            ) : (
              <input
                type="text"
                value={inputText}
                onChange={handleInputChange}
                onPaste={handlePasteImage}
                placeholder={editingMessage ? "বার্তাটি সম্পাদন করুন..." : "আপনার বার্তা লিখুন বা ছবি পেস্ট করুন..."}
                className={`flex-1 border text-sm px-4 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all duration-200 ${
                  isDarkMode
                    ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-blue-500'
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 shadow-inner'
                }`}
              />
            )}

            {/* Quick Like 👍 or Send Button */}
            {!inputText.trim() && !selectedImage && !recordedAudioUrl && !editingMessage ? (
              <button
                type="button"
                onClick={handleSendQuickLike}
                disabled={isSending}
                className="bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 font-bold p-3.5 rounded-xl active:scale-90 transition-all duration-150 flex items-center justify-center flex-shrink-0 shadow-sm cursor-pointer"
                title="কুইক লাইক (👍) পাঠান"
              >
                <ThumbsUp className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSending || (!inputText.trim() && !selectedImage && !recordedAudioUrl)}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white font-bold p-3.5 rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all duration-150 flex items-center justify-center flex-shrink-0"
                title="বার্তা পাঠান"
              >
                {editingMessage ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              </button>
            )}
          </div>
        </form>
      </main>

      {/* Messenger Right Info Drawer / Details Sidebar */}
      {isInfoDrawerOpen && (
        <aside 
          aria-label="চ্যাট বিবরণ ও সেটিংস সাইডবার"
          className={`w-full lg:w-auto border-t lg:border-t-0 lg:border-l flex flex-col flex-shrink-0 h-full overflow-y-auto z-20 animate-in slide-in-from-right duration-200 ${
            isDarkMode ? 'border-slate-800 bg-slate-950 text-slate-200' : 'border-slate-200 bg-white text-slate-800'
          }`}
        >
          {/* Drawer Header */}
          <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-400" />
              <span>চ্যাট বিবরণ ও সেটিংস</span>
            </span>
            <button
              onClick={() => setIsInfoDrawerOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="বন্ধ করুন"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Contact / Group Info Card */}
          <div className="p-5 text-center border-b border-slate-800/60 flex flex-col items-center">
            {currentRoomObj.isDM ? (
              <div className="relative mb-3">
                <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-blue-500/50 flex items-center justify-center text-2xl shadow-md">
                  {currentRoomObj.avatarEmoji || '👤'}
                </div>
                {onlineUsers[currentRoomObj.targetName] && (
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-slate-900 shadow-sm" />
                )}
              </div>
            ) : currentRoomObj.isCustom ? (
              <div className="relative mb-3">
                {currentRoomObj.customAvatarUrl || currentRoomObj.avatarUrl ? (
                  <img
                    src={currentRoomObj.customAvatarUrl || currentRoomObj.avatarUrl}
                    alt={currentRoomObj.name}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-500/40 shadow-md"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-indigo-950/80 border-2 border-indigo-500/40 flex items-center justify-center text-3xl shadow-md">
                    {currentRoomObj.emoji || '💬'}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleOpenEditGroup(currentRoomObj)}
                  className="absolute -bottom-1 -right-1 p-1 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow border border-slate-900 transition"
                  title="এভারটার পরিবর্তন করুন"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border-2 border-blue-500/40 flex items-center justify-center mb-3">
                <Hash className="w-8 h-8 text-blue-400" />
              </div>
            )}

            <h4 className="text-sm font-extrabold text-white truncate max-w-full flex items-center gap-1.5 justify-center">
              <span>{currentRoomObj.targetName || currentRoomObj.name}</span>
              {currentRoomObj.isCustom && !currentRoomObj.isDM && (
                <button
                  onClick={() => handleOpenEditGroup(currentRoomObj)}
                  className="text-slate-400 hover:text-indigo-300 p-0.5"
                  title="গ্রুপ সম্পাদনা"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
              )}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              {currentRoomObj.isDM
                ? (onlineUsers[currentRoomObj.targetName] ? '🟢 Active Now' : '⚪ Offline')
                : currentRoomObj.isCustom
                ? `${(currentRoomObj.members || []).length || 1} জন সদস্য`
                : 'পাবলিক কমিউনিটি চ্যানেল'}
            </p>
            {currentRoomObj.isCustom && !currentRoomObj.isDM && (
              <span className="text-[10px] text-indigo-300/80 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full mt-1.5 flex items-center gap-1">
                <Crown className="w-3 h-3 text-amber-400" />
                ক্রিয়েটর: {currentRoomObj.createdBy || 'অ্যাডমিন'}
              </span>
            )}

            {/* Action Buttons inside Drawer */}
            <div className="flex items-center gap-3 mt-4">
              <button
                type="button"
                onClick={() => startCall('audio', currentRoomObj.targetName || currentRoomObj.name)}
                className="p-2.5 rounded-full bg-blue-600/15 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-500/30 transition active:scale-95"
                title="অডিও কল"
              >
                <Phone className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => startCall('video', currentRoomObj.targetName || currentRoomObj.name)}
                className="p-2.5 rounded-full bg-indigo-600/15 text-indigo-400 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 transition active:scale-95"
                title="ভিডিও কল"
              >
                <Video className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleSendQuickLike}
                className="p-2.5 rounded-full bg-slate-800 text-blue-400 hover:bg-slate-700 hover:text-blue-300 border border-slate-700 transition active:scale-95"
                title="লাইক পাঠান"
              >
                <ThumbsUp className="w-4 h-4 fill-current" />
              </button>
            </div>
          </div>

          {/* Drawer Menu Sections */}
          <div className="p-4 space-y-4 text-xs">
            {/* Custom Group Management Controls Section */}
            {currentRoomObj.isCustom && !currentRoomObj.isDM && (
              <div className="space-y-2.5 pb-3 border-b border-slate-800">
                <h5 className="font-bold text-indigo-300 flex items-center justify-between">
                  <span>গ্রুপ অপশন ও নিয়ন্ত্রণ</span>
                  <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                </h5>
                <button
                  type="button"
                  onClick={() => handleOpenEditGroup(currentRoomObj)}
                  className="w-full text-left p-2.5 rounded-xl bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-500/30 flex items-center justify-between text-indigo-200 transition"
                >
                  <div className="flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-indigo-400" />
                    <span>নাম, বিবরণ ও এভারটার এডিট</span>
                  </div>
                  <span className="text-[10px] text-indigo-400 font-bold">এডিট &rarr;</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleOpenEditGroup(currentRoomObj);
                    setEditGroupTab('members');
                  }}
                  className="w-full text-left p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 flex items-center justify-between text-slate-300 transition"
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-400" />
                    <span>সদস্য ব্যবস্থাপনা ({currentRoomObj.members?.length || 1})</span>
                  </div>
                  <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded-full font-mono font-bold">+ যোগ</span>
                </button>

                {/* Inline Group Members Preview */}
                <div className="bg-slate-900/40 rounded-xl p-2 border border-slate-800/80 space-y-1.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">গ্রুপের সদস্যবৃন্দ</p>
                  <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                    {(currentRoomObj.members || [currentRoomObj.createdBy || username]).map((memName) => {
                      const isCreator = memName === currentRoomObj.createdBy;
                      const isSelf = memName === username;
                      return (
                        <div key={memName} className="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/50 text-[11px]">
                          <div className="flex items-center gap-2 truncate">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="font-medium text-slate-200 truncate">
                              {memName} {isSelf && '(আপনি)'}
                            </span>
                          </div>
                          {isCreator && (
                            <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded-full flex items-center gap-0.5 shrink-0">
                              <Crown className="w-2.5 h-2.5" /> অ্যাডমিন
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleLeaveGroup(currentRoomObj.id)}
                    className="flex-1 py-2 px-2.5 rounded-xl bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/30 font-bold text-[11px] transition flex items-center justify-center gap-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    গ্রুপ ত্যাগ
                  </button>
                  {currentRoomObj.createdBy === username && (
                    <button
                      type="button"
                      onClick={() => handleDeleteCustomGroup(currentRoomObj.id)}
                      className="py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 border border-slate-700/60 text-[11px] transition flex items-center justify-center gap-1"
                      title="গ্রুপ ডিলিট করুন"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}
            {/* Shared Media Section */}
            <div className="space-y-2">
              <h5 className="font-bold text-slate-400 flex items-center justify-between">
                <span>শেয়ার করা মিডিয়া ও ফাইল</span>
                <span className="text-[10px] font-mono text-slate-500">
                  {messages.filter(m => m.content && m.content.includes('"image":')).length} টি ছবি
                </span>
              </h5>
              <div className="grid grid-cols-3 gap-1.5">
                {messages
                  .filter(m => m.content && m.content.includes('"image":'))
                  .slice(0, 6)
                  .map((m, idx) => {
                    let imgUrl = '';
                    try { imgUrl = JSON.parse(m.content).image; } catch(e) {}
                    if (!imgUrl) return null;
                    return (
                      <div
                        key={idx}
                        onClick={() => setLightboxImage(imgUrl)}
                        className="aspect-square rounded-lg overflow-hidden border border-slate-800 bg-slate-900 cursor-pointer hover:opacity-80 transition"
                      >
                        <img src={imgUrl} alt="Media" className="w-full h-full object-cover" />
                      </div>
                    );
                  })}
              </div>
              {messages.filter(m => m.content && m.content.includes('"image":')).length === 0 && (
                <p className="text-[11px] text-slate-500 italic">এখনো কোনো ছবি শেয়ার করা হয়নি</p>
              )}
            </div>

            {/* Pinned Messages Count */}
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pin className="w-4 h-4 text-amber-400" />
                <span className="font-medium text-slate-300">পিন করা বার্তা</span>
              </div>
              <span className="font-bold text-amber-400 font-mono text-xs">
                {pinnedMessages.length} টি
              </span>
            </div>

            {/* Privacy & Notification Settings */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <h5 className="font-bold text-slate-400">প্রাইভেসি ও সহায়তা</h5>
              <button
                type="button"
                onClick={async () => {
                  await requestNotificationPermission();
                  playMessengerSound();
                }}
                className="w-full text-left p-2.5 rounded-xl bg-slate-900/40 hover:bg-slate-900 border border-slate-800/80 flex items-center justify-between text-slate-300 transition"
              >
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-indigo-400" />
                  <span>নোটিফিকেশন সাউন্ড</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold">চালু</span>
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Video / Audio Call Simulation with MediaDevices Preview */}
      <VideoCallModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        targetUser={videoCallConfig.targetName}
        targetAvatar={videoCallConfig.targetAvatar}
        currentUsername={username}
        currentUserAvatar={customAvatarUrl || user?.custom_avatar_url}
        isDarkMode={isDarkMode}
        callType={videoCallConfig.type}
      />

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 cursor-zoom-out"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex items-center justify-center">
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-12 right-0 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white p-2.5 rounded-xl transition border border-slate-800"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              src={lightboxImage} 
              alt="বড় ভিউ" 
              className="max-h-[80vh] max-w-full rounded-2xl object-contain shadow-2xl border border-slate-850"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Supabase SQL Fix Modal */}
      {isSqlModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">সুপাবেস ডাটাবেস ও SQL ফিক্স গাইড</h3>
                  <p className="text-xs text-slate-400">PGRST204 বা RLS এরর দূর করতে নিচের SQL কোডটি রান করুন</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSqlModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <h4 className="font-bold text-emerald-400 flex items-center gap-1.5 text-xs">
                  <CheckCircle className="w-4 h-4" />
                  সহজ ৩ ধাপে ডাটাবেস ফিক্স করুন:
                </h4>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 leading-relaxed pl-1">
                  <li>আপনার <strong className="text-white">Supabase Dashboard</strong> এ প্রবেশ করে প্রজেক্ট সিলেক্ট করুন।</li>
                  <li>বাম পাশের মেনু থেকে <strong className="text-emerald-300">SQL Editor</strong> এ যান।</li>
                  <li>নিচের SQL কোডটি কপি করে পেস্ট করুন এবং <strong className="text-emerald-300">Run</strong> বাটনে চাপুন।</li>
                </ol>
              </div>

              {/* SQL Code Box */}
              <div className="relative">
                <div className="flex items-center justify-between bg-slate-950 px-4 py-2 border-t border-x border-slate-800 rounded-t-xl text-slate-400 font-mono text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <Code className="w-3.5 h-3.5 text-emerald-400" />
                    fix_messages_table.sql
                  </span>
                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-sans font-bold transition text-xs shadow-sm"
                  >
                    {copiedSql ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>কপি হয়েছে!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>কপি করুন (Copy SQL)</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-4 bg-slate-950 text-emerald-300 font-mono text-[11px] leading-relaxed rounded-b-xl border border-slate-800 overflow-x-auto max-h-60 select-all">
                  {SUPABASE_SQL_SCRIPT}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">SQL রান করার পর পেজটি রিলোড দিন।</span>
              <button
                type="button"
                onClick={() => setIsSqlModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition text-xs"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Custom Messenger Group Modal */}
      {isCreateGroupOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl relative animate-in zoom-in-95 duration-150">
            <button
              onClick={() => setIsCreateGroupOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-3 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
                <FolderPlus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">নতুন মেসেঞ্জার গ্রুপ তৈরি করুন</h3>
                <p className="text-xs text-slate-400 mt-0.5">আপনার বন্ধুদের সাথে চ্যাট করতে কাস্টম গ্রুপ খুলুন</p>
              </div>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  গ্রুপের নাম <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: ডেভেলপার আড্ডা, বন্ধু মহল..."
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 text-white text-sm px-3.5 py-2.5 rounded-xl focus:outline-none transition"
                />
              </div>

              {/* Group Avatar Selection & Photo Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  গ্রুপের ছবি / এভারটার
                </label>
                <div className="flex items-center gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                  {newGroupAvatarUrl ? (
                    <div className="relative">
                      <img
                        src={newGroupAvatarUrl}
                        alt="Group Avatar"
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
                    <div className="w-14 h-14 rounded-2xl bg-indigo-950 border-2 border-indigo-500/40 flex items-center justify-center text-2xl shadow-inner shrink-0">
                      {newGroupEmoji || '💬'}
                    </div>
                  )}

                  <div className="space-y-1.5 flex-1">
                    <input
                      type="file"
                      ref={createGroupAvatarFileInputRef}
                      onChange={(e) => handleGroupAvatarUpload(e, false)}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => createGroupAvatarFileInputRef.current?.click()}
                      className="w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 border border-slate-700"
                    >
                      <Camera className="w-3.5 h-3.5 text-indigo-400" />
                      <span>কাস্টম ছবি আপলোড করুন</span>
                    </button>
                    <p className="text-[10px] text-slate-500">অথবা নিচে থেকে একটি ইমোজি ব্যাজ সিলেক্ট করুন</p>
                  </div>
                </div>

                {/* Emoji presets grid */}
                <div className="grid grid-cols-8 gap-1.5 mt-2 max-h-24 overflow-y-auto p-1 bg-slate-950 rounded-xl border border-slate-800">
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
                          ? 'bg-blue-600/30 border-blue-500 scale-105 shadow'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  গ্রুপের বিবরণ
                </label>
                <input
                  type="text"
                  placeholder="গ্রুপের উদ্দেশ্য বা নিয়মকানুনের সংক্ষেপ..."
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 text-white text-sm px-3.5 py-2.5 rounded-xl focus:outline-none transition"
                />
              </div>

              {/* Select Members during Group Creation */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>গ্রুপের সদস্য নির্বাচন করুন</span>
                  <span className="text-[10px] text-blue-400 font-mono">
                    {selectedGroupMembers.length} জন নির্বাচিত
                  </span>
                </label>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 max-h-36 overflow-y-auto space-y-1">
                  {registeredUsersList.filter(u => u.name !== username).length === 0 ? (
                    <p className="text-[11px] text-slate-500 text-center py-2">অন্য কোনো নিবন্ধিত সদস্য পাওয়া যায়নি</p>
                  ) : (
                    registeredUsersList.filter(u => u.name !== username).map((usr) => {
                      const isSelected = selectedGroupMembers.includes(usr.name);
                      return (
                        <div
                          key={usr.name}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedGroupMembers(selectedGroupMembers.filter(m => m !== usr.name));
                            } else {
                              setSelectedGroupMembers([...selectedGroupMembers, usr.name]);
                            }
                          }}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer border transition text-xs ${
                            isSelected
                              ? 'bg-blue-600/20 border-blue-500/50 text-white'
                              : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="text-base">{usr.avatar_emoji || '🧑‍💻'}</span>
                            <div className="truncate">
                              <p className="font-bold truncate">{usr.name}</p>
                              <p className="text-[10px] text-slate-500 truncate">{usr.role || 'সদস্য'}</p>
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-500'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}>
                            {isSelected ? 'যুক্ত' : '+ সিলেক্ট'}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateGroupOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={!newGroupName.trim()}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/20 transition flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  গ্রুপ তৈরি করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Comprehensive Group Management & Edit Settings Modal */}
      {isEditGroupModalOpen && editingGroupId && (
        <div className="fixed inset-0 z-[115] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl relative animate-in zoom-in-95 duration-150 overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>গ্রুপ সেটিংস ও ব্যবস্থাপনা</span>
                  </h3>
                  <p className="text-xs text-slate-400">নাম, বিবরণ, এভারটার এবং মেম্বার নিয়ন্ত্রণ করুন</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditGroupModalOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-800 bg-slate-950/50 px-5 pt-2 gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => setEditGroupTab('info')}
                className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 ${
                  editGroupTab === 'info'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>নাম, বিবরণ ও এভারটার</span>
              </button>
              <button
                type="button"
                onClick={() => setEditGroupTab('members')}
                className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 ${
                  editGroupTab === 'members'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>সদস্য তালিকা ও অনুমতি</span>
                <span className="text-[10px] bg-indigo-500/20 px-1.5 py-0.2 rounded-full font-mono">
                  {((customGroups.find(g => g.id === editingGroupId)?.members) || [username]).length}
                </span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
              {editGroupTab === 'info' ? (
                /* Tab 1: Info, Renaming & Avatar */
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      গ্রুপের নাম <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editGroupName}
                      onChange={(e) => setEditGroupName(e.target.value)}
                      placeholder="গ্রুপের নতুন নাম লিখুন..."
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white text-sm px-3.5 py-2.5 rounded-xl focus:outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      গ্রুপের বিবরণ
                    </label>
                    <input
                      type="text"
                      value={editGroupDesc}
                      onChange={(e) => setEditGroupDesc(e.target.value)}
                      placeholder="গ্রুপের বিবরণ বা উদ্দেশ্য..."
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white text-sm px-3.5 py-2.5 rounded-xl focus:outline-none transition"
                    />
                  </div>

                  {/* Avatar Upload & Emoji Badges */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      গ্রুপ এভারটার / ছবি পরিবর্তন
                    </label>
                    <div className="flex items-center gap-3.5 p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                      {editGroupAvatarUrl ? (
                        <div className="relative">
                          <img
                            src={editGroupAvatarUrl}
                            alt="Group Avatar"
                            className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-500 shadow-md"
                          />
                          <button
                            type="button"
                            onClick={() => setEditGroupAvatarUrl(null)}
                            className="absolute -top-1.5 -right-1.5 p-1 bg-rose-600 hover:bg-rose-500 text-white rounded-full text-xs shadow"
                            title="ছবি মুছুন এবং ইমোজি ব্যবহার করুন"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-indigo-950 border-2 border-indigo-500/40 flex items-center justify-center text-3xl shadow-inner shrink-0">
                          {editGroupEmoji || '💬'}
                        </div>
                      )}

                      <div className="space-y-2 flex-1">
                        <input
                          type="file"
                          ref={groupAvatarFileInputRef}
                          onChange={(e) => handleGroupAvatarUpload(e, true)}
                          accept="image/*"
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => groupAvatarFileInputRef.current?.click()}
                          className="w-full py-2 px-3 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border border-indigo-500/30"
                        >
                          <Camera className="w-4 h-4 text-indigo-400" />
                          <span>নতুন ছবি আপলোড করুন</span>
                        </button>
                        {editGroupAvatarUrl && (
                          <button
                            type="button"
                            onClick={() => setEditGroupAvatarUrl(null)}
                            className="w-full text-center text-[11px] text-rose-400 hover:underline"
                          >
                            ছবি মুছে ইমোজি আইকন ব্যবহার করুন
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Preset Emoji Badges Selector */}
                    <div className="mt-3">
                      <p className="text-[11px] font-bold text-slate-400 mb-1.5">অথবা ইমোজি আইকন পছন্দ করুন:</p>
                      <div className="grid grid-cols-8 gap-1.5 max-h-28 overflow-y-auto p-1.5 bg-slate-950 rounded-xl border border-slate-800">
                        {GROUP_PRESET_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => {
                              setEditGroupEmoji(emoji);
                              setEditGroupAvatarUrl(null);
                            }}
                            className={`text-lg p-2 rounded-xl border transition ${
                              !editGroupAvatarUrl && editGroupEmoji === emoji
                                ? 'bg-indigo-600/30 border-indigo-500 scale-110 shadow'
                                : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Tab 2: Members Management */
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
                    <input
                      type="text"
                      placeholder="সদস্য সার্চ করুন (নাম বা রোল)..."
                      value={memberSearchQuery}
                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-white text-xs pl-8 pr-8 py-2.5 rounded-xl focus:border-indigo-500 focus:outline-none transition"
                    />
                    {memberSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setMemberSearchQuery('')}
                        className="absolute right-3 top-3 text-slate-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                    {registeredUsersList
                      .filter((usr) => {
                        if (!memberSearchQuery.trim()) return true;
                        const q = memberSearchQuery.toLowerCase();
                        return (usr.name || '').toLowerCase().includes(q) || (usr.role || '').toLowerCase().includes(q);
                      })
                      .map((usr) => {
                        const targetGroup = customGroups.find(g => g.id === editingGroupId);
                        const currentMembers = targetGroup?.members || [targetGroup?.createdBy || username];
                        const isMember = currentMembers.includes(usr.name);
                        const isCreator = usr.name === targetGroup?.createdBy;

                        return (
                          <div
                            key={usr.name}
                            className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                              isMember
                                ? 'bg-indigo-950/30 border-indigo-800/60'
                                : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/60'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate min-w-0">
                              <span className="text-lg shrink-0">{usr.avatar_emoji || '🧑‍💻'}</span>
                              <div className="truncate">
                                <p className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                                  <span>{usr.name}</span>
                                  {isCreator && (
                                    <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded-full font-semibold flex items-center gap-0.5">
                                      <Crown className="w-2.5 h-2.5" /> ক্রিয়েটর
                                    </span>
                                  )}
                                </p>
                                <p className="text-[10px] text-slate-400 truncate">{usr.role || 'সদস্য'}</p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleToggleMemberInGroup(editingGroupId, usr.name)}
                              disabled={isCreator}
                              className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition active:scale-95 shrink-0 flex items-center gap-1 ${
                                isMember
                                  ? 'bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border-rose-500/30'
                                  : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                              } ${isCreator ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              {isMember ? (
                                <>
                                  <UserMinus className="w-3.5 h-3.5" />
                                  <span>রিমুভ</span>
                                </>
                              ) : (
                                <>
                                  <UserPlus className="w-3.5 h-3.5" />
                                  <span>যুক্ত করুন</span>
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })}
                  </div>

                  {/* Danger Zone: Leave or Delete Group */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleLeaveGroup(editingGroupId)}
                      className="text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-rose-500/10 transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>গ্রুপ থেকে বের হয়ে যান</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('আপনি কি নিশ্চিত যে এই গ্রুপটি সম্পূর্ণ মুছে ফেলতে চান?')) {
                          handleDeleteCustomGroup(editingGroupId);
                        }
                      }}
                      className="text-xs font-bold text-slate-500 hover:text-rose-400 flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-slate-800 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>গ্রুপ ডিলিট</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                {editGroupTab === 'info' ? 'পরিবর্তন সংরক্ষণ করতে সেভ বাটনে চাপুন' : 'সদস্য তালিকা তাৎক্ষণিক কার্যকর হয়'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditGroupModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
                >
                  বন্ধ করুন
                </button>
                {editGroupTab === 'info' && (
                  <button
                    type="button"
                    onClick={() => handleSaveGroupSettings(editingGroupId)}
                    disabled={!editGroupName.trim()}
                    className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/25 transition flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>সংরক্ষণ করুন</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manage Group Members Modal */}
      {isManageMembersModalOpen && currentRoomObj && currentRoomObj.isCustom && (
        <div className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl relative animate-in zoom-in-95 duration-150">
            <button
              onClick={() => setIsManageMembersModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30 shrink-0">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>{currentRoomObj.name}</span>
                  <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-mono border border-blue-500/30">
                    {(currentRoomObj.members || [currentRoomObj.createdBy || username]).length} জন সদস্য
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">গ্রুপে নতুন সদস্য যোগ করুন বা সদস্য তালিকা নিয়ন্ত্রণ করুন</p>
              </div>
            </div>

            {/* Member Search Bar */}
            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="সদস্য সার্চ করুন..."
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white text-xs pl-8 pr-8 py-2.5 rounded-xl focus:border-blue-500 focus:outline-none transition"
              />
              {memberSearchQuery && (
                <button
                  type="button"
                  onClick={() => setMemberSearchQuery('')}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Registered Users List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 my-1">
              {registeredUsersList
                .filter((usr) => {
                  if (!memberSearchQuery.trim()) return true;
                  const q = memberSearchQuery.toLowerCase();
                  return (usr.name || '').toLowerCase().includes(q) || (usr.role || '').toLowerCase().includes(q);
                })
                .map((usr) => {
                  const currentMembers = currentRoomObj.members || [currentRoomObj.createdBy || username];
                  const isMember = currentMembers.includes(usr.name);
                  const isCreator = usr.name === currentRoomObj.createdBy;

                  return (
                    <div
                      key={usr.name}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                        isMember
                          ? 'bg-blue-950/30 border-blue-800/60'
                          : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate min-w-0">
                        <span className="text-lg shrink-0">{usr.avatar_emoji || '🧑‍💻'}</span>
                        <div className="truncate">
                          <p className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                            <span>{usr.name}</span>
                            {isCreator && (
                              <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded-full font-semibold">
                                অ্যাডমিন
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">{usr.role || 'সদস্য'}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleMemberInGroup(currentRoomObj.id, usr.name)}
                        disabled={isCreator}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition active:scale-95 shrink-0 flex items-center gap-1 ${
                          isMember
                            ? 'bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border-rose-500/30'
                            : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500 shadow-md shadow-blue-600/20'
                        } ${isCreator ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {isMember ? (
                          <>
                            <Trash2 className="w-3 h-3" />
                            <span>রিমুভ</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3 h-3" />
                            <span>এড করুন</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between mt-2">
              <span className="text-[11px] text-slate-400">
                পরিবর্তনগুলো স্বয়ংক্রিয়ভাবে সংরক্ষিত হয়
              </span>
              <button
                type="button"
                onClick={() => setIsManageMembersModalOpen(false)}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow"
              >
                সম্পন্ন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Access Restriction Warning Modal */}
      {roomAccessError && (
        <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{roomAccessError.title}</h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                {roomAccessError.message}
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setRoomAccessError(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition"
              >
                বন্ধ করুন
              </button>
              <Link
                href="/profile"
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-blue-600/20"
              >
                <User className="w-3.5 h-3.5" />
                <span>প্রোফাইল ব্যাকআপ দেখুন</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Online Active Members List Modal */}
      {isOnlineListOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>অনলাইন ব্যবহারকারীগণ</span>
                    <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-mono font-bold border border-emerald-500/30">
                      {onlineCount} জন
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">বর্তমানে রিয়েল-টাইমে চ্যাটে সক্রিয় আছেন</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOnlineListOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Cards List */}
            <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
              {onlineUsersList.map((usr) => {
                const uAvUrl = usr.customAvatarUrl || (usr.username === username ? customAvatarUrl : null);
                const uAv = PRESET_AVATARS.find(a => a.id === usr.avatarId) || getAvatarForUsername(usr.username);
                const isCurrent = usr.username === username;
                const roomObj = CHANNELS.find(r => r.id === usr.room) || (customGroups || []).find(g => g.id === usr.room);

                return (
                  <div
                    key={usr.username}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-emerald-500/30 transition group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative flex-shrink-0">
                        {uAvUrl ? (
                          <img src={uAvUrl} alt={usr.username} className="w-10 h-10 rounded-full object-cover shadow border border-slate-700/50" />
                        ) : (
                          <div className={`w-10 h-10 rounded-full bg-gradient-to-tr ${uAv.bg} text-lg flex items-center justify-center shadow select-none`}>
                            {uAv.emoji}
                          </div>
                        )}
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-slate-950" />
                      </div>
                      <div className="truncate min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-bold text-white truncate">{usr.username}</h4>
                          {isCurrent && (
                            <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.2 rounded-full font-semibold border border-blue-500/30">
                              আপনি
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          চ্যানেল: <span className="text-slate-300 font-medium">{roomObj ? roomObj.name : 'সাধারণ চ্যাট'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="inline-flex items-center gap-1 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        অনলাইন
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                লাইভ প্রেজেন্স চালু আছে
              </span>
              <button
                type="button"
                onClick={() => setIsOnlineListOpen(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Alert & Scheduled Alarm Setup Modal */}
      {isTaskAlertModalOpen && (
        <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl relative animate-in zoom-in-95 duration-150 overflow-y-auto">
            <button
              onClick={() => setIsTaskAlertModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-rose-600/20 text-rose-400 rounded-xl border border-rose-500/30 shrink-0">
                <Bell className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>টাস্ক অ্যালার্ট ও সাউন্ড অ্যালার্ম</span>
                  <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full font-mono border border-rose-500/30">
                    অটোমেটিক সংকেত
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">নির্ধারিত তারিখ ও সময়ে টাস্ক মেসেজ অটো-পোস্ট এবং মেম্বারদের সাউন্ড সহ অ্যালার্ট দিবে</p>
              </div>
            </div>

            <form onSubmit={handleCreateTaskAlert} className="space-y-4">
              {/* Task Title / Content */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  টাস্কের বিবরণ / মেসেজ <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="যেমন: আজ বিকাল ৪টায় ক্লায়েন্ট মিটিং ও প্রজেক্ট জমা দেওয়া"
                  className="w-full bg-slate-950 border border-slate-800 text-white text-xs p-3 rounded-xl focus:border-rose-500 focus:outline-none transition placeholder:text-slate-600"
                />
              </div>

              {/* Scheduled Date & Time */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                  <span>নির্ধারিত তারিখ ও সময় (Date & Time) <span className="text-rose-400">*</span></span>
                  <Clock className="w-3.5 h-3.5 text-rose-400" />
                </label>
                <input
                  type="datetime-local"
                  required
                  value={taskDateTime}
                  onChange={(e) => setTaskDateTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white text-xs p-3 rounded-xl focus:border-rose-500 focus:outline-none transition [color-scheme:dark]"
                />
              </div>

              {/* Target Members Selection (কাকে কাকে অ্যালার্ম সংকেত দিবে) */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                  <span>কাকে কাকে অ্যালার্ম সংকেত পাঠাবে (ট্যাগড মেম্বার)</span>
                  <span className="text-[10px] text-rose-400 font-mono">
                    {taskTargetMembers.includes('ALL') ? 'সকল সদস্য' : `${taskTargetMembers.length} জন`}
                  </span>
                </label>
                
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 max-h-36 overflow-y-auto space-y-1">
                  {/* Option: ALL MEMBERS */}
                  <div
                    onClick={() => {
                      if (taskTargetMembers.includes('ALL')) {
                        setTaskTargetMembers([]);
                      } else {
                        setTaskTargetMembers(['ALL']);
                      }
                    }}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer border transition text-xs ${
                      taskTargetMembers.includes('ALL')
                        ? 'bg-rose-600/20 border-rose-500/60 text-white font-bold'
                        : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-rose-400" />
                      <span>@সকল_সদস্য (কমিউনিটির সবাইকে অ্যালার্ম দিবে)</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      taskTargetMembers.includes('ALL') ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-500'
                    }`}>
                      {taskTargetMembers.includes('ALL') ? 'সিলেক্টেড' : '+ সিলেক্ট'}
                    </span>
                  </div>

                  {/* Individual Registered Members */}
                  {registeredUsersList.filter(u => u.name !== username).map((usr) => {
                    const isSelected = !taskTargetMembers.includes('ALL') && taskTargetMembers.includes(usr.name);
                    return (
                      <div
                        key={usr.name}
                        onClick={() => {
                          if (taskTargetMembers.includes('ALL')) {
                            setTaskTargetMembers([usr.name]);
                          } else if (isSelected) {
                            setTaskTargetMembers(taskTargetMembers.filter(m => m !== usr.name));
                          } else {
                            setTaskTargetMembers([...taskTargetMembers, usr.name]);
                          }
                        }}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer border transition text-xs ${
                          isSelected
                            ? 'bg-rose-600/20 border-rose-500/60 text-white font-bold'
                            : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-base">{usr.avatar_emoji || '🧑‍💻'}</span>
                          <span className="truncate">{usr.name}</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          isSelected ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-500'
                        }`}>
                          {isSelected ? 'মার্কেড' : '+ মার্ক'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsTaskAlertModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-rose-600/20 flex items-center gap-1.5 active:scale-95"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>অ্যালার্ম শিডিউল করুন</span>
                </button>
              </div>
            </form>

            {/* List of Scheduled Pending Task Alerts */}
            {taskAlerts.length > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-800">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>চলতি শিডিউলড অ্যালার্মসমূহ</span>
                  <span className="text-[10px] font-mono text-rose-400">{taskAlerts.filter(a => !a.isTriggered).length} টি বাকী</span>
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {taskAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                        alert.isTriggered
                          ? 'bg-slate-950/40 border-slate-800 text-slate-500'
                          : 'bg-rose-950/20 border-rose-500/30 text-slate-200'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${alert.isTriggered ? 'bg-slate-600' : 'bg-rose-500 animate-pulse'}`} />
                          <p className="font-bold truncate">{alert.title}</p>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono">
                          ⏰ {formatExactDateTime(alert.dateTime)} • ট্যাগড: {alert.targetMembers.join(', ')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteTaskAlert(alert.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition shrink-0"
                        title="অ্যালার্ম মুছে ফেলুন"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Triggered Alarm Alert Banner / Modal */}
      {triggeredAlarmModal && (
        <div className="fixed inset-0 z-[150] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-gradient-to-b from-rose-950/90 via-slate-900 to-slate-900 border-2 border-rose-500 rounded-3xl p-6 w-full max-w-md shadow-2xl text-center relative animate-bounce-short">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border-2 border-rose-500 text-rose-400 flex items-center justify-center mx-auto mb-4 animate-pulse shadow-lg shadow-rose-500/40">
              <Bell className="w-8 h-8 animate-bounce" />
            </div>

            <span className="inline-block px-3 py-1 bg-rose-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-full mb-2 shadow">
              ⏰ নির্ধারিত অ্যালার্ম সংকেত!
            </span>

            <h3 className="text-xl font-black text-white mb-2 leading-tight">
              {triggeredAlarmModal.title}
            </h3>

            <p className="text-xs text-rose-300 font-mono mb-4 bg-rose-950/60 p-2 rounded-xl border border-rose-500/30">
              📅 নির্ধারিত সময়: {formatExactDateTime(triggeredAlarmModal.dateTime)}
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => playTaskAlarmRingtone(8000)}
                className="px-4 py-2 bg-rose-600/30 hover:bg-rose-600 text-rose-200 hover:text-white rounded-xl text-xs font-bold transition border border-rose-500/40 flex items-center gap-1.5"
              >
                <Volume2 className="w-4 h-4 animate-pulse" />
                <span>সাউন্ড আবার বাজান</span>
              </button>
              <button
                type="button"
                onClick={() => setTriggeredAlarmModal(null)}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black transition shadow-lg shadow-rose-600/30 active:scale-95"
              >
                ঠিক আছে (বন্ধ করুন)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Lightbox Image Modal */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setLightboxImage(null)}
        >
          {/* Top Controls Bar */}
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-3 z-10" onClick={(e) => e.stopPropagation()}>
            <a
              href={lightboxImage}
              download={`chat-image-${Date.now()}.jpg`}
              className="p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700/60 transition active:scale-95 shadow-lg flex items-center gap-1.5 text-xs font-bold"
              title="ছবি ডাউনলোড করুন"
            >
              <Download className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">ডাউনলোড</span>
            </a>
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="p-2.5 rounded-full bg-slate-900/80 hover:bg-rose-600 text-white border border-slate-700/60 transition active:scale-95 shadow-lg"
              title="বন্ধ করুন"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Centered Image */}
          <div 
            className="max-w-4xl max-h-[85vh] p-2 flex items-center justify-center relative select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxImage}
              alt="বড় ছবি"
              className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-slate-800"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}
      </div>
  );
}
