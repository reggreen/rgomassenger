import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase, sendTypingStatus } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Send, Hash, User, Users, Smile, Shield, Sparkles, MessageSquare, Edit3, Check, AlertTriangle, Trash2, X, Link as LinkIcon, UserCheck, ChevronDown, CheckCircle, Image as ImageIcon, Pin, Plus, FolderPlus, MoreVertical, Database, Copy, Code } from 'lucide-react';

const SUPABASE_SQL_SCRIPT = `-- =========================================================
-- COMPLETE SUPABASE SCHEMA & RLS FIX SCRIPT FOR RGOMASSENGER
-- =========================================================

-- 1. MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room text NOT NULL DEFAULT 'general',
  sender text NOT NULL DEFAULT 'Anonymous',
  content text NOT NULL DEFAULT '',
  created_at timestamp with time zone DEFAULT now()
);

-- Ensure all columns exist in case table was created differently
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS room text DEFAULT 'general';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sender text DEFAULT 'Anonymous';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS content text DEFAULT '';

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
  { id: 'general', name: 'সাধারণ আলোচনা (General)', desc: 'কমিউনিটির সবার সাথে সাধারণ কুশল বিনিময়' },
  { id: 'announcements', name: 'ঘোষণা ও আপডেট (Updates)', desc: 'কমিউনিটির গুরুত্বপূর্ণ নোটিশ ও ভবিষ্যৎ পরিকল্পনা' },
  { id: 'tech-talk', name: 'টেক আড্ডা (Tech)', desc: 'কোডিং, ডিজাইন ও প্রযুক্তি বিষয়ক আলোচনা' },
  { id: 'fun', name: 'বিনোদন ও আড্ডা (Fun)', desc: 'হাসি-ঠাট্টা ও হালকা বিনোদন' }
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

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
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
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  
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

  // Initialize nickname, avatar, active room, custom groups, and draft message from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Restore custom groups
      let loadedCustom = [];
      const savedGroups = localStorage.getItem('rg_custom_groups');
      if (savedGroups) {
        try {
          loadedCustom = JSON.parse(savedGroups);
          setCustomGroups(loadedCustom);
        } catch (e) {}
      }

      // Restore active channel / group room
      const allValid = [...CHANNELS, ...loadedCustom];
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

    if (user?.name) {
      setUsername(user.name);
      setTempUsername(user.name);
      localStorage.setItem('rg_username', user.name);
      return;
    }

    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('rg_username');
      let currentUsername = '';
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

      const savedAvatar = localStorage.getItem('rg_avatar_id');
      if (savedAvatar) {
        setSelectedAvatarId(savedAvatar);
      } else {
        const defaultAv = getAvatarForUsername(currentUsername);
        setSelectedAvatarId(defaultAv.id);
        localStorage.setItem('rg_avatar_id', defaultAv.id);
      }
    }
  }, [user]);

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

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
          image: selectedImage
        });
      } else {
        finalContent = JSON.stringify({
          text: inputText.trim(),
          avatar: selectedAvatarId,
          image: selectedImage
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

  const handleSelectRoom = (roomId) => {
    setActiveRoom(roomId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('rg_active_room', roomId);
      const savedDraft = localStorage.getItem(`rg_chat_draft_${roomId}`) || '';
      setInputText(savedDraft);
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
    localStorage.setItem('rg_avatar_id', avatarId);
    setIsAvatarPickerOpen(false);
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
    }))
  ];
  const currentRoomObj = allRooms.find(r => r.id === activeRoom) || CHANNELS[0];

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
                  className={`relative flex items-center justify-center w-11 h-11 rounded-full bg-gradient-to-tr ${
                    (PRESET_AVATARS.find((a) => a.id === selectedAvatarId) || PRESET_AVATARS[0]).bg
                  } text-xl shadow-md cursor-pointer select-none active:scale-95 transition-transform duration-150 border border-slate-700/50 group`}
                  title="অ্যাভাটার পরিবর্তন করুন"
                >
                  {(PRESET_AVATARS.find((a) => a.id === selectedAvatarId) || PRESET_AVATARS[0]).emoji}
                  <div className="absolute -bottom-1 -right-1 bg-slate-900 border border-slate-800 rounded-full p-0.5 text-[8px] text-slate-400 group-hover:text-white group-hover:border-slate-600 transition">
                    <ChevronDown className="w-2.5 h-2.5" />
                  </div>
                </button>

                {/* Avatar Picker Dropdown Panel */}
                {isAvatarPickerOpen && (
                  <div className="absolute left-0 mt-2 p-3 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 w-52 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">অ্যাভাটার সিলেক্ট করুন</span>
                      <button
                        type="button"
                        onClick={() => setIsAvatarPickerOpen(false)}
                        className="text-slate-500 hover:text-white p-0.5 rounded"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {PRESET_AVATARS.map((av) => {
                        const isSel = av.id === selectedAvatarId;
                        return (
                          <button
                            key={av.id}
                            type="button"
                            onClick={() => handleSelectAvatar(av.id)}
                            className={`flex items-center justify-center h-10 w-10 rounded-lg bg-gradient-to-tr ${av.bg} text-lg transition duration-150 hover:scale-105 active:scale-90 relative ${
                              isSel ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:opacity-95'
                            }`}
                            title={av.label}
                          >
                            {av.emoji}
                            {isSel && (
                              <div className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full p-0.5">
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
                return (
                  <button
                    key={channel.id}
                    onClick={() => handleSelectRoom(channel.id)}
                    className={`w-full text-left flex items-start gap-3 p-2.5 rounded-xl transition duration-150 ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/10'
                        : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`}
                  >
                    <Hash className={`w-5 h-5 mt-0.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                    <div className="truncate">
                      <p className="text-sm font-semibold truncate">{channel.name}</p>
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

          {/* Guidelines / Help box */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 space-y-2">
            <h5 className="font-bold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
              গুরুত্বপূর্ণ টিপস
            </h5>
            <p className="leading-relaxed">
              আপনি একই সাথে অন্য একটি ব্রাউজার ট্যাব বা উইন্ডো খুলে এই চ্যাট পেইজটিতে প্রবেশ করুন। সেখানে অন্য নাম দিয়ে বার্তা লিখে পাঠান—দেখবেন রিয়েল-টাইমে মেসেজ আদান-প্রদান হচ্ছে!
            </p>
          </div>
        </div>
      </div>

      {/* Right Chat Area */}
      <div className="flex-1 flex flex-col bg-slate-900/40 h-full overflow-hidden relative min-w-0">
        {/* Chat Room Header */}
        <div className="px-4 md:px-6 py-3.5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between flex-shrink-0 z-10">
          <div className="flex items-center gap-2.5">
            {currentRoomObj.isCustom ? (
              <span className="text-xl flex-shrink-0">{currentRoomObj.emoji || '💬'}</span>
            ) : (
              <Hash className="w-5 h-5 text-blue-500" />
            )}
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>{currentRoomObj.name}</span>
                {currentRoomObj.isCustom && (
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-normal">
                    কাস্টম গ্রুপ
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                {currentRoomObj.desc}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsSqlModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 rounded-xl text-xs font-bold transition shadow-sm"
              title="ডাটাবেস সেটিংস ও SQL ফিক্স গাইড"
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">SQL সেটিংস</span>
            </button>
            <div className="flex items-center gap-1 text-slate-400 text-xs">
              <Users className="w-4 h-4 text-slate-500" />
              <span className="font-mono">কমিউনিটি লাইভ</span>
            </div>
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
                } catch (e) {
                  // Fallback
                }
              }

              // Retrieve the correct avatar object
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
                  <div 
                    className={`flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-tr ${avatarObj.bg} text-sm flex items-center justify-center shadow select-none`}
                    title={`${msg.sender} (${avatarObj.label})`}
                  >
                    {avatarObj.emoji}
                  </div>

                  {/* Message Bubble + Meta Column */}
                  <div className={`flex flex-col max-w-[80%] ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-1.5 mb-1 text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-400">{msg.sender}</span>
                      <span>•</span>
                      <span className="font-mono">
                        {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'এখনই'}
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
                          ? 'bg-blue-600 text-white rounded-tr-none' 
                          : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700/60'
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
                      </div>

                      {/* Action buttons (Reply, Edit, Delete) - Shows on Hover */}
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
                            <>
                              <button 
                                onClick={() => handleStartEdit(msg)}
                                className="p-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition shadow-md border border-slate-700/30"
                                title="সম্পাদনা করুন"
                                type="button"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => setDeletingMessageId(msg.id)}
                                className="p-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-400 hover:text-rose-300 rounded-lg transition shadow-md border border-rose-900/30"
                                title="ডিলিট করুন"
                                type="button"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
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
        <form onSubmit={handleSendMessage} className="p-3 md:p-4 border-t border-slate-800 bg-slate-900/95 backdrop-blur-md flex-shrink-0 sticky bottom-0 z-10">
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
            <input
              type="text"
              value={inputText}
              onChange={handleInputChange}
              placeholder={editingMessage ? "বার্তাটি সম্পাদন করুন..." : "আপনার বার্তা এখানে লিখুন..."}
              className="flex-1 bg-slate-950 border border-slate-800 focus:border-blue-500 text-white text-sm px-4 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all duration-200 placeholder:text-slate-600"
            />
            <button
              type="submit"
              disabled={isSending || (!inputText.trim() && !selectedImage)}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white font-bold p-3.5 rounded-xl shadow-lg shadow-blue-500/10 active:scale-95 transition-all duration-150 flex items-center justify-center flex-shrink-0"
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
      </div>
  );
}
