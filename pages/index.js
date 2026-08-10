import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase, sendTypingStatus } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { playMessengerSound, sendMessengerNotification, requestNotificationPermission } from '../utils/messengerSound';
import { Send, Hash, User, Users, Smile, Shield, Sparkles, MessageSquare, Edit3, Check, CheckCheck, AlertTriangle, Trash2, X, Link as LinkIcon, UserCheck, ChevronDown, CheckCircle, Image as ImageIcon, Pin, Plus, FolderPlus, MoreVertical, Database, Copy, Code, Camera, Upload, Volume2, Sun, Moon, Search, UserPlus, Mic, Square, Play, Pause, VolumeX } from 'lucide-react';

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

const CHANNELS = [
  { id: 'general', name: 'সাধারণ আলোচনা (General)', desc: 'কমিউনিটির সবার সাথে সাধারণ কুশল বিনিময়', minRole: 'member', minRoleLabel: 'সকল সদস্য' },
  { id: 'tech-talk', name: 'টেক আড্ডা (Tech)', desc: 'কোডিং, ডিজাইন ও প্রযুক্তি বিষয়ক আলোচনা', minRole: 'member', minRoleLabel: 'সকল সদস্য' },
  { id: 'fun', name: 'বিনোদন ও আড্ডা (Fun)', desc: 'হাসি-ঠাট্টা ও হালকা বিনোদন', minRole: 'member', minRoleLabel: 'সকল সদস্য' },
  { id: 'announcements', name: 'ঘোষণা ও আপডেট (Updates)', desc: 'কমিউনিটির অফিসিয়াল নোটিশ বোর্ড (মডারেটর ও অ্যাডমিন পোস্ট)', minRole: 'moderator', minRoleLabel: 'মডারেটর ও অ্যাডমিন' },
  { id: 'admin-lounge', name: 'অ্যাডমিন লাউঞ্জ (Admin Only)', desc: 'গোপন ও সংরক্ষিত অ্যাডমিন স্ট্র্যাটেজি চ্যানেল', minRole: 'admin', minRoleLabel: 'শুধুমাত্র অ্যাডমিন' }
];

const PRESET_NAMES = [
  'সাইদুর রহমান', 'আসিফ ইকবাল', 'তানভীর হাসান', 'সাদিয়া তাসনিম', 'ফারিহা জাহান',
  'জাহিদ হাসান', 'নাবিলা আনজুম', 'রাফসান আহমেদ', 'মাহমুদ বিল্লাহ', 'ফারহান চৌধুরী'
];

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
  const { user, isAdmin, isModerator, userRole, getRegisteredUsers } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [username, setUsername] = useState('');
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [tempUsername, setTempUsername] = useState('');
  const [activeRoom, setActiveRoom] = useState('general');
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
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  
  // Custom Messenger Groups & Pin State
  const [customGroups, setCustomGroups] = useState([]);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupEmoji, setNewGroupEmoji] = useState('💬');
  const [pinnedExpanded, setPinnedExpanded] = useState(false);

  const [selectedImage, setSelectedImage] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const fileInputRef = useRef(null);

  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Online Users & Realtime Presence state
  const [onlineUsers, setOnlineUsers] = useState({});
  const [isOnlineListOpen, setIsOnlineListOpen] = useState(false);

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
          setCustomGroups(loadedCustom);
        } catch (e) {}
      }

      // Restore active channel / group / DM room
      const allValid = [...CHANNELS, ...loadedCustom, ...loadedDMs];
      const savedRoom = localStorage.getItem('rg_active_room');
      if (savedRoom && allValid.some(c => c.id === savedRoom)) {
        setActiveRoom(savedRoom);
        const savedDraft = localStorage.getItem(`rg_chat_draft_${savedRoom}`);
        if (savedDraft) setInputText(savedDraft);
      } else {
        const savedDraft = localStorage.getItem('rg_chat_draft_general');
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
        const randomName = PRESET_NAMES[Math.floor(Math.random() * PRESET_NAMES.length)] + ' (নতুন)';
        setUsername(randomName);
        setTempUsername(randomName);
        localStorage.setItem('rg_username', randomName);
        currentUsername = randomName;
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
      setActiveRoom('general');
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
    setRecordingTime(0);
  };

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
    if ((!inputText.trim() && !selectedImage) || isSending) return;

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
          audio: recordedAudioUrl,
          audioDuration: recordingTime
        });
      } else {
        finalContent = JSON.stringify({
          text: inputText.trim(),
          avatar: selectedAvatarId,
          customAvatarUrl: resolvedCustomAvatar,
          image: selectedImage,
          audio: recordedAudioUrl,
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
        }
      } catch (err) {
        console.error('Send error:', err);
      } finally {
        setIsSending(false);
      }
    }
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

  // Group Creation Handler
  const handleCreateGroup = (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    const newGroup = {
      id: 'group_' + Date.now(),
      name: newGroupName.trim(),
      desc: newGroupDesc.trim() || 'ম্যাসেঞ্জার কাস্টম গ্রুপ',
      emoji: newGroupEmoji || '💬',
      createdBy: username,
      createdAt: new Date().toISOString()
    };
    const updatedGroups = [...customGroups, newGroup];
    setCustomGroups(updatedGroups);
    if (typeof window !== 'undefined') {
      localStorage.setItem('rg_custom_groups', JSON.stringify(updatedGroups));
    }
    setNewGroupName('');
    setNewGroupDesc('');
    setNewGroupEmoji('💬');
    setIsCreateGroupOpen(false);
    handleSelectRoom(newGroup.id);
  };

  // Group Delete Handler
  const handleDeleteCustomGroup = (groupId, e) => {
    e.stopPropagation();
    const updated = customGroups.filter(g => g.id !== groupId);
    setCustomGroups(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('rg_custom_groups', JSON.stringify(updated));
    }
    if (activeRoom === groupId) {
      handleSelectRoom('general');
    }
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
    ...CHANNELS.map(c => ({ ...c, isCustom: false, emoji: null })),
    ...customGroups.map(g => ({
      id: g.id,
      name: g.name,
      desc: g.desc,
      isCustom: true,
      emoji: g.emoji || '💬',
      createdBy: g.createdBy
    })),
    ...directMessages.map(dm => ({
      id: dm.id,
      name: `💬 ${dm.targetName}`,
      desc: `ডাইরেক্ট মেসেজ (${dm.targetRole || 'সদস্য'})`,
      isCustom: true,
      isDM: true,
      emoji: dm.avatarEmoji || '👤',
      targetName: dm.targetName
    }))
  ];
  const currentRoomObj = allRooms.find(r => r.id === activeRoom) || CHANNELS[0];

  const filteredUsers = registeredUsersList.filter((usr) => {
    const q = (userSearchQuery || '').trim().toLowerCase();
    if (!q) return true;
    const nameMatch = (usr.name || '').toLowerCase().includes(q);
    const emailMatch = (usr.email || '').toLowerCase().includes(q);
    const roleMatch = (usr.role || '').toLowerCase().includes(q);
    return nameMatch || emailMatch || roleMatch;
  }).filter((usr) => usr.name !== username);

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
      <div className="flex-1 flex flex-col lg:flex-row w-full h-[calc(100vh-3.5rem)] min-h-[500px] overflow-hidden bg-slate-900 border-x border-slate-800/80" id="chat-applet">
        {/* Left Sidebar - Channels & Profiles */}
        <div className="w-full lg:w-80 bg-slate-950 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col flex-shrink-0 h-auto lg:h-full overflow-hidden">
        
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

        {/* User Search & Direct Chat Search Bar */}
        <div className={`p-3 border-b ${isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-100/80 border-slate-200'}`}>
          <div className="relative">
            <Search className={`w-3.5 h-3.5 absolute left-3 top-2.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} />
            <input
              type="text"
              placeholder="সদস্য বা বন্ধুদের খুঁজুন..."
              value={userSearchQuery}
              onChange={(e) => {
                setUserSearchQuery(e.target.value);
                if (!isUserSearchOpen) setIsUserSearchOpen(true);
              }}
              onFocus={() => setIsUserSearchOpen(true)}
              className={`w-full text-xs pl-8 pr-7 py-2 rounded-xl border focus:outline-none transition ${
                isDarkMode
                  ? 'bg-slate-900 border-slate-700/80 text-white placeholder-slate-500 focus:border-blue-500'
                  : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500 shadow-sm'
              }`}
            />
            {userSearchQuery && (
              <button
                type="button"
                onClick={() => {
                  setUserSearchQuery('');
                  setIsUserSearchOpen(false);
                }}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Results Dropdown Panel */}
          {isUserSearchOpen && (
            <div className={`mt-2 p-2.5 rounded-xl border shadow-2xl max-h-64 overflow-y-auto space-y-1.5 animate-in fade-in duration-150 relative z-30 ${
              isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200 shadow-lg'
            }`}>
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/60 px-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1">
                  <UserPlus className="w-3 h-3" />
                  সদস্য তালিকা ({filteredUsers.length})
                </span>
                <button
                  type="button"
                  onClick={() => setIsUserSearchOpen(false)}
                  className="text-[10px] text-slate-400 hover:text-slate-200 p-0.5 rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              {filteredUsers.length === 0 ? (
                <p className="text-[11px] text-slate-500 p-2 text-center">কোনো ইউজার খুঁজে পাওয়া যায়নি</p>
              ) : (
                filteredUsers.map((usr) => (
                  <div
                    key={usr.email || usr.id || usr.name}
                    className={`flex items-center justify-between p-2 rounded-lg border transition ${
                      isDarkMode
                        ? 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/80'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate min-w-0">
                      <span className="text-base flex-shrink-0">{usr.avatar_emoji || '🧑‍💻'}</span>
                      <div className="truncate">
                        <p className={`text-xs font-bold truncate ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                          {usr.name}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">{usr.role || 'সদস্য'}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleStartDirectMessage(usr)}
                      className="text-[10px] bg-blue-600 hover:bg-blue-500 text-white font-bold px-2.5 py-1 rounded-lg transition active:scale-95 shadow-sm shrink-0 flex items-center gap-1"
                      title={`${usr.name} কে মেসেজ পাঠান`}
                    >
                      <MessageSquare className="w-3 h-3" />
                      মেসেজ
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Channels List */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2 mb-2 flex items-center justify-between">
              <span>চ্যাট চ্যানেলসমূহ</span>
              <span className="text-[10px] font-mono">{CHANNELS.length} টি</span>
            </h4>
            <div className="space-y-1">
              {CHANNELS.map((channel) => {
                const isActive = activeRoom === channel.id;
                const isForbidden = (channel.minRole === 'admin' && !isAdmin) || (channel.minRole === 'moderator' && !isModerator);
                return (
                  <button
                    key={channel.id}
                    onClick={() => handleSelectRoom(channel.id)}
                    className={`w-full text-left flex items-start gap-3 p-2.5 rounded-xl transition duration-150 relative group ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/10'
                        : isForbidden
                        ? 'text-slate-500 bg-slate-950/50 hover:bg-slate-900/80 border border-slate-800/60'
                        : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`}
                  >
                    <div className="relative mt-0.5">
                      <Hash className={`w-5 h-5 ${isActive ? 'text-white' : isForbidden ? 'text-slate-600' : 'text-slate-500'}`} />
                      {isForbidden && (
                        <Shield className="w-3 h-3 text-amber-500 absolute -bottom-1 -right-1 bg-slate-950 rounded-full p-0.5" />
                      )}
                    </div>
                    <div className="truncate flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-sm font-semibold truncate">{channel.name}</p>
                        {channel.minRole === 'admin' && (
                          <span className="text-[9px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 px-1.5 py-0.2 rounded-full shrink-0">
                            অ্যাডমিন
                          </span>
                        )}
                        {channel.minRole === 'moderator' && (
                          <span className="text-[9px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.2 rounded-full shrink-0">
                            মডারেটর+
                          </span>
                        )}
                      </div>
                      <p className={`text-[11px] truncate mt-0.5 ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
                        {channel.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Messenger Groups Section */}
          <div className="pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between px-2 mb-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                <span>কাস্টম মেসেঞ্জার গ্রুপ</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsCreateGroupOpen(true)}
                className="text-[11px] bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white px-2 py-1 rounded-lg border border-blue-500/30 font-semibold flex items-center gap-1 transition active:scale-95 shadow-sm"
                title="নতুন মেসেঞ্জার গ্রুপ তৈরি করুন"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>গ্রুপ তৈরি</span>
              </button>
            </div>

            {customGroups.length === 0 ? (
              <div className="p-3 bg-slate-900/40 border border-dashed border-slate-800 rounded-xl text-center space-y-1.5">
                <p className="text-[11px] text-slate-400">কোনো কাস্টম মেসেঞ্জার গ্রুপ নেই</p>
                <button
                  type="button"
                  onClick={() => setIsCreateGroupOpen(true)}
                  className="text-xs text-blue-400 hover:text-blue-300 font-bold underline inline-flex items-center gap-1"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  নতুন গ্রুপ তৈরি করুন
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                {customGroups.map((group) => {
                  const isActive = activeRoom === group.id;
                  return (
                    <div
                      key={group.id}
                      onClick={() => handleSelectRoom(group.id)}
                      className={`w-full text-left flex items-center justify-between gap-2 p-2.5 rounded-xl transition duration-150 cursor-pointer group/grp ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                          : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 truncate min-w-0">
                        <span className="text-base flex-shrink-0 mt-0.5">{group.emoji || '💬'}</span>
                        <div className="truncate">
                          <p className="text-sm font-semibold truncate">{group.name}</p>
                          <p className={`text-[11px] truncate mt-0.5 ${isActive ? 'text-indigo-100' : 'text-slate-500'}`}>
                            {group.desc}
                          </p>
                        </div>
                      </div>
                      
                      {/* Delete group button */}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteCustomGroup(group.id, e)}
                        className="opacity-0 group-hover/grp:opacity-100 text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-950/60 transition flex-shrink-0"
                        title="গ্রুপ রিমুভ করুন"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Direct Messages Section */}
          {directMessages.length > 0 && (
            <div className="pt-2 border-t border-slate-800/80">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                  <span>ডাইরেক্ট মেসেজ (DMs)</span>
                </span>
                <span className="text-[10px] font-mono">{directMessages.length} টি</span>
              </h4>
              <div className="space-y-1">
                {directMessages.map((dm) => {
                  const isActive = activeRoom === dm.id;
                  return (
                    <div
                      key={dm.id}
                      onClick={() => handleSelectRoom(dm.id)}
                      className={`w-full text-left flex items-center justify-between gap-2 p-2 rounded-xl transition duration-150 cursor-pointer group/dm ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                          : isDarkMode
                          ? 'text-slate-300 hover:bg-slate-900 hover:text-white'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate min-w-0">
                        <span className="text-base flex-shrink-0">{dm.avatarEmoji || '👤'}</span>
                        <div className="truncate">
                          <p className="text-xs font-bold truncate">{dm.targetName}</p>
                          <p className={`text-[10px] truncate ${isActive ? 'text-indigo-100' : 'text-slate-500'}`}>
                            {dm.targetRole || 'ব্যক্তিগত চ্যাট'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteDM(dm.id, e)}
                        className="opacity-0 group-hover/dm:opacity-100 text-slate-400 hover:text-rose-400 p-1 rounded transition"
                        title="চ্যাট রিমুভ করুন"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Online Active Members Sidebar Section */}
          <div className="pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between px-2 mb-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>অনলাইনে আছেন ({onlineCount})</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsOnlineListOpen(true)}
                className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold hover:underline"
              >
                তালিকা দেখুন
              </button>
            </div>

            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {onlineUsersList.map((usr) => {
                const uAvUrl = usr.customAvatarUrl || (usr.username === username ? customAvatarUrl : null);
                const uAv = PRESET_AVATARS.find(a => a.id === usr.avatarId) || getAvatarForUsername(usr.username);
                const isCurrent = usr.username === username;
                const roomObj = CHANNELS.find(r => r.id === usr.room) || (customGroups || []).find(g => g.id === usr.room);
                return (
                  <div
                    key={usr.username}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs hover:bg-slate-800/60 transition"
                  >
                    <div className="flex items-center gap-2 truncate min-w-0">
                      <div className="relative flex-shrink-0">
                        {uAvUrl ? (
                          <img src={uAvUrl} alt={usr.username} className="w-6 h-6 rounded-full object-cover shadow-sm border border-slate-700/50" />
                        ) : (
                          <div className={`w-6 h-6 rounded-full bg-gradient-to-tr ${uAv.bg} text-xs flex items-center justify-center select-none shadow-sm`}>
                            {uAv.emoji}
                          </div>
                        )}
                        <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-slate-950" />
                      </div>
                      <div className="truncate min-w-0">
                        <p className="font-semibold text-slate-200 truncate leading-snug">
                          {usr.username} {isCurrent && <span className="text-[10px] text-emerald-400 font-normal">(আপনি)</span>}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {roomObj ? roomObj.name : 'সাধারণ চ্যাট'}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded-full font-medium">
                      সক্রিয়
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Guidelines / Help box */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 space-y-2">
            <h5 className="font-bold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
              গুরুত্বপূর্ণ টিপস
            </h5>
            <p className="leading-relaxed">
              আপনি একই সাথে অন্য একটি ব্রাউজার ট্যাব বা উইন্ডো খুলে এই চ্যাট পেইজটিতে প্রবেশ করুন। সেখানে অন্য নাম দিয়ে বার্তা লিখে পাঠান—দেখবেন রিয়েল-টাইমে মেসেজ আদান-প্রদান ও অনলাইন স্ট্যাটাস আপডেট হচ্ছে!
            </p>
          </div>
        </div>
      </div>

      {/* Right Chat Area */}
      <div className={`flex-1 flex flex-col h-full overflow-hidden relative min-w-0 transition-colors duration-200 ${isDarkMode ? 'bg-slate-900/40' : 'bg-slate-50'}`}>
        {/* Chat Room Header */}
        <div className={`px-4 md:px-6 py-3.5 border-b flex items-center justify-between flex-shrink-0 z-10 transition-colors duration-200 ${isDarkMode ? 'border-slate-800 bg-slate-900/90' : 'border-slate-200 bg-white shadow-sm'}`}>
          <div className="flex items-center gap-2.5">
            {currentRoomObj.isCustom ? (
              <span className="text-xl flex-shrink-0">{currentRoomObj.emoji || '💬'}</span>
            ) : (
              <Hash className="w-5 h-5 text-blue-500" />
            )}
            <div>
              <h3 className={`text-base font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                <span>{currentRoomObj.name}</span>
                {currentRoomObj.isCustom && (
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-full font-normal">
                    {currentRoomObj.isDM ? 'ডাইরেক্ট মেসেজ' : 'কাস্টম গ্রুপ'}
                  </span>
                )}
              </h3>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {currentRoomObj.desc}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={handleToggleTheme}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-xl text-xs font-bold transition shadow-sm cursor-pointer ${
                isDarkMode
                  ? 'bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border-amber-500/30'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
              }`}
              title={isDarkMode ? 'লাইট মোড এ পরিবর্তন করুন' : 'ডার্ক মোড এ পরিবর্তন করুন'}
            >
              {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-600" />}
              <span className="hidden sm:inline">{isDarkMode ? 'লাইট মোড' : 'ডার্ক মোড'}</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                await requestNotificationPermission();
                playMessengerSound();
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 hover:text-white border border-indigo-500/30 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
              title="মেসেঞ্জার সাউন্ড ও নোটিফিকেশন টেস্ট করুন"
            >
              <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">সাউন্ড টেস্ট</span>
            </button>
            <button
              type="button"
              onClick={() => setIsSqlModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 rounded-xl text-xs font-bold transition shadow-sm"
              title="ডাটাবেস সেটিংস ও SQL ফিক্স গাইড"
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">SQL সেটিংস</span>
            </button>
            <button
              type="button"
              onClick={() => setIsOnlineListOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer group/onl"
              title="অনলাইন সদস্যদের তালিকা দেখুন"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="font-mono text-emerald-300 group-hover/onl:text-emerald-200">
                {onlineCount} জন অনলাইনে
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-emerald-400 transition-transform group-hover/onl:translate-y-0.5" />
            </button>
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
              let contentText = msg.content;
              let messageAvatarId = null;
              let messageImage = null;
              let messageCustomAvatarUrl = null;
              let messageAudio = null;
              let messageAudioDuration = null;
              
              if (msg.content && msg.content.startsWith('{"text":')) {
                try {
                  const parsed = JSON.parse(msg.content);
                  contentText = parsed.text;
                  replyInfo = parsed.replyTo;
                  isReply = !!replyInfo;
                  isEdited = !!parsed.edited;
                  isPinned = !!parsed.pinned;
                  messageAvatarId = parsed.avatar;
                  messageImage = parsed.image;
                  messageCustomAvatarUrl = parsed.customAvatarUrl;
                  messageAudio = parsed.audio;
                  messageAudioDuration = parsed.audioDuration;
                } catch (e) {
                  // Fallback
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
                          <div className="mt-2 max-w-[280px] sm:max-w-xs overflow-hidden rounded-xl border border-slate-700/50 bg-slate-950/20 cursor-zoom-in group/img shadow-md">
                            <img 
                              src={messageImage} 
                              alt="ছবি" 
                              onClick={() => setLightboxImage(messageImage)}
                              className="max-h-56 w-full object-cover rounded-xl group-hover/img:scale-[1.02] transition duration-200"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}

                        {messageAudio && (
                          <div className={`mt-2 p-2.5 rounded-xl border flex flex-col gap-1.5 max-w-[280px] sm:max-w-xs shadow-md ${
                            isMe
                              ? 'bg-blue-700/60 border-blue-400/40 text-white'
                              : isDarkMode
                              ? 'bg-slate-900/90 border-slate-700/70 text-slate-200'
                              : 'bg-slate-100 border-slate-300 text-slate-800'
                          }`}>
                            <div className="flex items-center justify-between text-xs font-bold gap-2">
                              <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider opacity-90">
                                <Mic className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                                <span>ভয়েস মেসেজ</span>
                              </span>
                              {messageAudioDuration > 0 && (
                                <span className="text-[10px] font-mono opacity-80 px-1.5 py-0.5 rounded bg-black/20">
                                  {formatRecordingTime(messageAudioDuration)}
                                </span>
                              )}
                            </div>
                            <audio 
                              src={messageAudio} 
                              controls 
                              controlsList="nodownload" 
                              className="w-full h-8 rounded-lg outline-none"
                            />
                          </div>
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
            <div className="flex items-center gap-2 text-xs text-slate-400 italic px-2 animate-pulse mt-1 mb-2">
              <div className="flex gap-1 items-center justify-center py-1">
                <span className="h-1.5 w-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="h-1.5 w-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="h-1.5 w-1.5 bg-blue-400 rounded-full animate-bounce"></span>
              </div>
              <span>
                {Object.entries(typingUsers)
                  .filter(([user, isTyping]) => isTyping && user !== username)
                  .map(([user]) => user)
                  .join(', ')}{' '}
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
                placeholder={editingMessage ? "বার্তাটি সম্পাদন করুন..." : "আপনার বার্তা এখানে লিখুন..."}
                className={`flex-1 border text-sm px-4 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all duration-200 ${
                  isDarkMode
                    ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-blue-500'
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 shadow-inner'
                }`}
              />
            )}

            <button
              type="submit"
              disabled={isSending || (!inputText.trim() && !selectedImage && !recordedAudioUrl)}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white font-bold p-3.5 rounded-xl shadow-lg shadow-blue-500/10 active:scale-95 transition-all duration-150 flex items-center justify-center flex-shrink-0"
              title="বার্তা পাঠান"
            >
              {editingMessage ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </form>
      </div>

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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-150">
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

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  গ্রুপ ইমোজি/আইকন
                </label>
                <div className="flex items-center gap-2">
                  {['💬', '🚀', '🔥', '🎮', '⚽', '💡', '🎉', '❤️'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewGroupEmoji(emoji)}
                      className={`text-xl p-2 rounded-xl border transition ${
                        newGroupEmoji === emoji
                          ? 'bg-blue-600/30 border-blue-500 scale-110'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
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
      </div>
  );
}
