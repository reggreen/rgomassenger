import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Hash,
  Users,
  Smile,
  MessageSquare,
  Edit3,
  Check,
  CheckCheck,
  AlertTriangle,
  Trash2,
  X,
  ChevronDown,
  Image as ImageIcon,
  Pin,
  Database,
  Sun,
  Moon,
  Mic,
  Square,
  Bell,
  Phone,
  Video,
  Info,
  ThumbsUp,
  SlidersHorizontal,
  Share2,
  CornerDownRight,
  Sparkles,
  Smartphone,
  ArrowLeft,
  Search,
  RotateCcw
} from 'lucide-react';
import VoiceMessageBubble from './VoiceMessageBubble';
import ImageMessageBubble from './ImageMessageBubble';

const EMOJI_CATEGORIES = [
  {
    id: 'popular',
    name: 'জনপ্রিয়',
    icon: '🔥',
    emojis: ['👍', '❤️', '😂', '🔥', '👏', '🎉', '🙌', '🙏', '😊', '😍', '✨', '👌', '💯', '🚀']
  },
  {
    id: 'smileys',
    name: 'মুখভাব',
    icon: '😄',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😋', '😜', '🤪', '😝', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😏', '😒', '🙄', '😬', '😌', '😔', '😪', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓']
  },
  {
    id: 'gestures',
    name: 'হাত ও অনুভূতি',
    icon: '👍',
    emojis: ['👋', '🤚', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '💪']
  },
  {
    id: 'hearts',
    name: 'ভালোবাসা',
    icon: '❤️',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟']
  },
  {
    id: 'work',
    name: 'অফিস ও কাজ',
    icon: '💼',
    emojis: ['💼', '📁', '📂', '📄', '📊', '📈', '📉', '📋', '📌', '📍', '📎', '📏', '✂️', '🔒', '🔑', '💡', '💻', '🖥️', '⌨️', '📱', '📞', '✉️', '📧', '📦', '⏰', '⏱️', '⏳', '📅', '🗓️', '✅', '❌', '⚠️', '🚨']
  },
  {
    id: 'celebrate',
    name: 'উৎসব ও পার্টি',
    icon: '🎉',
    emojis: ['🎉', '🎊', '🎈', '🎂', '🎁', '🏆', '🥇', '🥈', '🥉', '🎖️', '🏅', '⭐', '🌟', '✨', '⚡', '💥', '🔥', '🎯', '🚀', '🔮', '☕', '🍕', '🍔', '🍰']
  }
];

export default function MainChatWindow({
  currentRoomObj = {},
  username = '',
  user = null,
  isAdmin = false,
  isDarkMode = true,
  setIsDarkMode = () => {},
  mobileView = 'chat',
  setMobileView = () => {},
  messages = [],
  onlineUsers = {},
  typingUsers = {},
  dbError = null,
  setIsSqlModalOpen = () => {},
  pinnedMessages = [],
  pinnedExpanded = false,
  setPinnedExpanded = () => {},
  scrollToMessage = () => {},
  handleTogglePinMessage = () => {},
  handleDeleteMessage = () => {},
  handleStartEdit = () => {},
  handleAddReaction = () => {},
  replyMessage = null,
  setReplyMessage = () => {},
  editingMessage = null,
  setEditingMessage = () => {},
  handleCancelEdit = () => {},
  inputText = '',
  setInputText = () => {},
  handleInputChange = () => {},
  handleSendMessage = () => {},
  handleSendQuickLike = () => {},
  isSending = false,
  selectedImage = null,
  setSelectedImage = () => {},
  fileInputRef = null,
  handlePasteImage = () => {},
  isRecording = false,
  recordingTime = 0,
  recordedAudioUrl = null,
  handleStartRecording = () => {},
  handleStopRecording = () => {},
  handleCancelRecording = () => {},
  setRecordedAudioUrl = () => {},
  setRecordedAudioBlob = () => {},
  setRecordingTime = () => {},
  formatExactDateTime = (d) => d,
  renderMessageText = (t) => t,
  formatRecordingTime = (s) => `${s}s`,
  getAvatarForUsername = () => ({ emoji: '👤', bg: 'from-blue-500 to-indigo-600', label: 'User' }),
  PRESET_AVATARS = [],
  profilesMap = {},
  customAvatarUrl = null,
  setLightboxImage = () => {},
  isInfoDrawerOpen = false,
  setIsInfoDrawerOpen = () => {},
  isPushSubscribed = false,
  handleEnablePushNotifications = () => {},
  handleSendTestPush = () => {},
  isPushRegistering = false,
  isSendingTestPush = false,
  pushStatusMessage = '',
  startCall = () => {},
  setIsTaskAlertModalOpen = () => {},
  messagesEndRef = null,
  inputRef = null
}) {
  // Emoji Picker State
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [selectedEmojiCategory, setSelectedEmojiCategory] = useState('popular');
  const [emojiSearch, setEmojiSearch] = useState('');
  const emojiPickerRef = useRef(null);
  const internalInputRef = useRef(null);
  const activeInputRef = inputRef || internalInputRef;

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setIsEmojiPickerOpen(false);
      }
    };
    if (isEmojiPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEmojiPickerOpen]);

  // Insert emoji into input
  const handleEmojiSelect = (emoji) => {
    setInputText((prev) => prev + emoji);
    if (activeInputRef?.current) {
      activeInputRef.current.focus();
    }
  };

  // Filter emojis based on search
  const currentCategoryObj = EMOJI_CATEGORIES.find((c) => c.id === selectedEmojiCategory) || EMOJI_CATEGORIES[0];
  const displayedEmojis = emojiSearch.trim()
    ? EMOJI_CATEGORIES.flatMap((cat) => cat.emojis).filter((emoji) => emoji.includes(emojiSearch.trim()))
    : currentCategoryObj.emojis;

  return (
    <main
      aria-label="প্রধান চ্যাট উইন্ডো"
      className={`flex-1 flex flex-col h-full overflow-hidden relative min-w-0 transition-colors duration-200 ${
        mobileView === 'contacts' ? 'hidden md:flex' : 'flex'
      } ${isDarkMode ? 'bg-slate-900/40' : 'bg-slate-50'}`}
    >
      {/* 1. Modern Chat Header */}
      <header
        className={`px-3 sm:px-4 md:px-6 py-3 border-b flex items-center justify-between flex-shrink-0 z-10 transition-colors duration-200 ${
          isDarkMode ? 'border-slate-800 bg-slate-900/95 backdrop-blur-md' : 'border-slate-200 bg-white shadow-sm'
        }`}
      >
        {/* Header Left: Avatar & Room Info */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          {/* Mobile Back Button to Contacts List */}
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
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
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
                      <span>টাইপ করছেন...</span>
                    </span>
                  ) : onlineUsers[currentRoomObj.targetName] ? (
                    <span className="text-emerald-400 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Active now (অনলাইন)
                    </span>
                  ) : (
                    <span className="text-slate-400">অফলাইন</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Public / Work Group Header */
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0 text-blue-400">
                <Hash className="w-5 h-5" />
              </div>
              <div className="truncate">
                <h3 className={`text-sm md:text-base font-bold truncate flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  <span>{currentRoomObj.name}</span>
                </h3>
                <p className={`text-xs truncate mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {currentRoomObj.desc || 'কাজের গ্রুপ চ্যাট'}
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
            className="p-2 md:px-3 md:py-2 bg-emerald-600/15 hover:bg-emerald-600/30 text-emerald-400 hover:text-emerald-300 rounded-full border border-emerald-500/30 text-xs font-bold transition flex items-center gap-1.5 active:scale-95 shadow-sm"
            title="ভিডিও কল করুন"
          >
            <Video className="w-4 h-4" />
            <span className="hidden lg:inline">ভিডিও কল</span>
          </button>

          {/* Task Alert / Alarm Button */}
          <button
            type="button"
            onClick={() => setIsTaskAlertModalOpen(true)}
            className="flex items-center gap-1.5 p-2 md:px-2.5 md:py-2 bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 hover:text-white border border-rose-500/30 rounded-full text-xs font-bold transition shadow-sm cursor-pointer"
            title="অ্যালার্ম সহ টাস্ক অ্যালার্ট দিন"
          >
            <Bell className="w-4 h-4 text-rose-400 animate-pulse" />
            <span className="hidden sm:inline">টাস্ক অ্যালার্ট</span>
          </button>

          {/* Info Details Toggle Button */}
          <button
            type="button"
            onClick={() => setIsInfoDrawerOpen(!isInfoDrawerOpen)}
            className={`p-2 rounded-full border text-xs font-bold transition shadow-sm cursor-pointer ${
              isInfoDrawerOpen
                ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700/60'
            }`}
            title="চ্যাট বিস্তারিত ও সেটিংস দেখুন"
          >
            <Info className="w-4 h-4" />
          </button>

          {/* Dark / Light Mode Toggle */}
          <button
            type="button"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2 rounded-full border transition active:scale-95 ${
              isDarkMode
                ? 'bg-slate-800 hover:bg-slate-700 text-amber-400 border-slate-700'
                : 'bg-slate-100 hover:bg-slate-200 text-indigo-600 border-slate-300'
            }`}
            title={isDarkMode ? 'লাইট মোড এ পরিবর্তন করুন' : 'ডার্ক মোড এ পরিবর্তন করুন'}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>
        </div>
      </header>

      {/* 2. Background Push Notification Status Bar */}
      <div
        className={`px-4 py-1.5 border-b text-xs flex flex-wrap items-center justify-between gap-2 transition-colors duration-200 z-10 ${
          isDarkMode ? 'bg-slate-950/60 border-slate-800/80 text-slate-300' : 'bg-indigo-50/70 border-indigo-100 text-slate-700'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {isPushSubscribed ? (
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium text-[11px]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="truncate">ব্যাকগ্রাউন্ড নোটিফিকেশন সক্রিয় (অ্যাপ বন্ধ থাকলেও অ্যালার্ট আসবে)</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-amber-400 font-medium text-[11px]">
              <Bell className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
              <span className="truncate">মোবাইলে ব্যাকগ্রাউন্ড পুশ নোটিফিকেশন চালু করুন</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {pushStatusMessage && (
            <span className="text-[10px] text-indigo-400 font-medium bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md animate-pulse">
              {pushStatusMessage}
            </span>
          )}
          {!isPushSubscribed ? (
            <button
              type="button"
              onClick={handleEnablePushNotifications}
              disabled={isPushRegistering}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] px-2.5 py-0.5 rounded-lg shadow-sm transition flex items-center gap-1 active:scale-95 disabled:opacity-50"
            >
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>{isPushRegistering ? 'চালু হচ্ছে...' : 'নোটিফিকেশন অন করুন'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSendTestPush}
              disabled={isSendingTestPush}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-[10px] px-2 py-0.5 rounded-lg transition flex items-center gap-1 active:scale-95 disabled:opacity-50"
              title="টেস্ট নোটিফিকেশন পাঠান"
            >
              <Smartphone className="w-3 h-3 text-emerald-400" />
              <span>{isSendingTestPush ? 'পাঠানো হচ্ছে...' : '🔔 টেস্ট পুশ'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Pinned Messages Banner */}
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

      {/* 4. Scrollable Message Feed with Message Bubbles & Timestamps */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {dbError && (
          <div className="bg-amber-950/40 border border-amber-800/80 rounded-xl p-4 text-xs text-amber-300 space-y-2 mb-4 animate-in fade-in duration-200">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-1.5 flex-1">
                <h4 className="font-bold text-amber-200">ডাটাবেস সংক্রান্ত সতর্কবার্তা</h4>
                <p className="leading-relaxed text-slate-300">
                  {dbError.message || JSON.stringify(dbError)}
                </p>
                <button
                  type="button"
                  onClick={() => setIsSqlModalOpen(true)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs inline-flex items-center gap-1.5 transition shadow"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>সমাধান গাইড দেখুন</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shadow-sm">
              <MessageSquare className="w-8 h-8" />
            </div>
            <div>
              <p className={`font-bold text-base ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                এই চ্যানেলে কোনো বার্তা নেই
              </p>
              <p className="text-slate-500 text-xs mt-1">
                নিচে বার্তা লিখে অথবা ভয়েস রেকর্ড করে আলাপ শুরু করুন!
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.sender === username;

            // Parse potential structured JSON message
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
              } catch (e) {}
            }

            // Determine Avatar
            const senderCustomAvatar =
              messageCustomAvatarUrl ||
              (msg.sender === username ? customAvatarUrl : null) ||
              onlineUsers[msg.sender]?.customAvatarUrl ||
              profilesMap[msg.sender] ||
              (user?.name === msg.sender ? user.custom_avatar_url : null);
            const avatarObj = messageAvatarId
              ? PRESET_AVATARS.find((a) => a.id === messageAvatarId) || getAvatarForUsername(msg.sender)
              : getAvatarForUsername(msg.sender);

            return (
              <div
                key={msg.id || index}
                id={`msg-${msg.id}`}
                className={`flex items-start gap-2.5 group relative mb-3.5 hover:bg-slate-800/10 p-2 rounded-2xl transition duration-200 ${
                  isMe ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                {/* Sender Avatar */}
                <div className="relative flex-shrink-0 mt-0.5">
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

                {/* Message Content Column */}
                <div className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                  {/* Sender Name & Prominent Timestamp Header */}
                  <div className="flex items-center gap-1.5 mb-1 text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-300 flex items-center gap-1">
                      {msg.sender}
                      {onlineUsers[msg.sender] && (
                        <span className="inline-flex items-center gap-1 text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded-full font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          অনলাইন
                        </span>
                      )}
                    </span>
                    <span>•</span>
                    {/* Timestamp Display */}
                    <span
                      className="font-mono text-[10px] text-slate-400 bg-slate-800/40 px-1.5 py-0.5 rounded-md border border-slate-700/30"
                      title={msg.created_at ? new Date(msg.created_at).toLocaleString('bn-BD') : ''}
                    >
                      {formatExactDateTime(msg.created_at)}
                    </span>
                    {isEdited && (
                      <span className="bg-slate-800/80 px-1.5 py-0.2 rounded text-[9px] text-slate-400 select-none">
                        (সম্পাদিত)
                      </span>
                    )}
                  </div>

                  {/* Message Bubble + Hover Actions Container */}
                  <div className="flex items-center gap-2 max-w-full relative">
                    {/* Hover Action Menu for Outgoing Messages (Left of bubble) */}
                    {isMe && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center gap-0.5 bg-slate-900/90 border border-slate-700/80 rounded-full px-1.5 py-1 shadow-md shrink-0">
                        <button
                          type="button"
                          onClick={() => setReplyMessage(msg)}
                          className="p-1 hover:text-blue-400 text-slate-400 rounded-full transition"
                          title="রিপ্লাই দিন"
                        >
                          <CornerDownRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTogglePinMessage(msg)}
                          className={`p-1 rounded-full transition ${isPinned ? 'text-amber-400' : 'text-slate-400 hover:text-amber-300'}`}
                          title={isPinned ? 'আনপিন করুন' : 'পিন করুন'}
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(msg)}
                          className="p-1 hover:text-amber-400 text-slate-400 rounded-full transition"
                          title="সম্পাদনা করুন"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="p-1 hover:text-rose-400 text-slate-400 rounded-full transition"
                          title="মুছে ফেলুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Actual Message Bubble */}
                    <div
                      className={`max-w-[100%] rounded-2xl px-4 py-2.5 text-sm shadow-sm relative ${
                        isMe
                          ? 'bg-blue-600 text-white rounded-tr-none shadow-md'
                          : isDarkMode
                          ? 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700/60'
                          : 'bg-white text-slate-900 rounded-tl-none border border-slate-200 shadow-sm'
                      } ${isPinned ? 'ring-1 ring-amber-400/80 shadow-md shadow-amber-500/10' : ''}`}
                    >
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

                      {/* Message Text Content */}
                      {contentText && (
                        <p className="whitespace-pre-wrap break-words leading-relaxed">{renderMessageText(contentText)}</p>
                      )}

                      {/* Image Message Bubble */}
                      {messageImage && (
                        <ImageMessageBubble
                          imageUrl={messageImage}
                          isMe={isMe}
                          onOpenLightbox={(url) => setLightboxImage(url)}
                        />
                      )}

                      {/* Voice Note Message Bubble with Waveform Player */}
                      {messageAudio && (
                        <VoiceMessageBubble
                          audioSrc={messageAudio}
                          duration={messageAudioDuration}
                          isMe={isMe}
                          isDarkMode={isDarkMode}
                        />
                      )}

                      {/* Seen / Delivery Receipts for My Messages */}
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
                            <span className="flex items-center gap-0.5 text-blue-200/80" title="পাঠানো হয়েছে">
                              <Check className="w-3 h-3" />
                              <span className="text-[9px]">পাঠানো হয়েছে</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Hover Action Menu for Incoming Messages (Right of bubble) */}
                    {!isMe && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center gap-0.5 bg-slate-900/90 border border-slate-700/80 rounded-full px-1.5 py-1 shadow-md shrink-0">
                        <button
                          type="button"
                          onClick={() => setReplyMessage(msg)}
                          className="p-1 hover:text-blue-400 text-slate-400 rounded-full transition"
                          title="রিপ্লাই দিন"
                        >
                          <CornerDownRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTogglePinMessage(msg)}
                          className={`p-1 rounded-full transition ${isPinned ? 'text-amber-400' : 'text-slate-400 hover:text-amber-300'}`}
                          title={isPinned ? 'আনপিন করুন' : 'পিন করুন'}
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="p-1 hover:text-rose-400 text-slate-400 rounded-full transition"
                            title="অ্যাডমিন হিসেবে মুছুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Emoji Reactions Bar */}
                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 mt-1.5">
                      {Object.entries(msg.reactions).map(([emoji, users]) => {
                        const hasReacted = users.includes(username);
                        return (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleAddReaction(msg.id, emoji)}
                            className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 transition active:scale-95 ${
                              hasReacted
                                ? 'bg-blue-600/30 border-blue-500 text-white shadow-sm'
                                : 'bg-slate-800/80 border-slate-700/60 text-slate-300 hover:bg-slate-700'
                            }`}
                            title={users.join(', ')}
                          >
                            <span>{emoji}</span>
                            <span className="font-mono text-[10px] font-bold">{users.length}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Typing Users Live Indicator */}
        {Object.keys(typingUsers).length > 0 && (
          <div className="flex items-center gap-2 text-xs text-slate-400 italic px-2 py-1">
            <div className="flex gap-1 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce"></span>
            </div>
            <span>{Object.keys(typingUsers).join(', ')} লিখছেন...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 5. PERSISTENT INPUT AREA DOCKED AT THE BOTTOM */}
      <footer
        className={`sticky bottom-0 z-20 border-t transition-colors duration-200 backdrop-blur-md ${
          isDarkMode ? 'border-slate-800 bg-slate-900/95' : 'border-slate-200 bg-white/95'
        }`}
      >
        {/* Replying Banner */}
        {replyMessage && (
          <div className="px-4 py-2 bg-blue-600/10 border-b border-blue-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-blue-400 truncate">
              <CornerDownRight className="w-3.5 h-3.5 shrink-0" />
              <span className="font-bold">{replyMessage.sender}</span>
              <span className="text-slate-400 truncate max-w-xs sm:max-w-md">কে রিপ্লাই দিচ্ছেন: {replyMessage.content}</span>
            </div>
            <button
              type="button"
              onClick={() => setReplyMessage(null)}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition"
              title="বাতিল করুন"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Editing Banner */}
        {editingMessage && (
          <div className="px-4 py-2 bg-amber-600/10 border-b border-amber-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-amber-400 truncate">
              <Edit3 className="w-3.5 h-3.5 shrink-0" />
              <span className="font-bold">বার্তা সম্পাদনা করছেন</span>
            </div>
            <button
              type="button"
              onClick={handleCancelEdit}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition"
              title="সম্পাদনা বাতিল করুন"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Image Attachment Preview */}
        {selectedImage && (
          <div className="px-4 pt-3 pb-1">
            <div className="relative inline-block border border-slate-700/80 rounded-xl overflow-hidden bg-slate-950/80 shadow-md">
              <img src={selectedImage} alt="Attachment Preview" className="max-h-24 rounded-lg object-contain" />
              <button
                type="button"
                onClick={() => {
                  setSelectedImage(null);
                  if (fileInputRef?.current) fileInputRef.current.value = '';
                }}
                className="absolute top-1.5 right-1.5 bg-slate-950/90 hover:bg-slate-900 text-rose-400 rounded-full p-1 border border-slate-800 transition shadow"
                title="ছবি বাদ দিন"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Voice Note Recorded Preview Card */}
        {recordedAudioUrl && (
          <div className="px-4 pt-3 pb-1">
            <div
              className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 ${
                isDarkMode ? 'bg-slate-950 border-rose-500/40' : 'bg-rose-50 border-rose-200'
              }`}
            >
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className="p-2 rounded-lg bg-rose-500/20 text-rose-500 shrink-0">
                  <Mic className="w-4 h-4 animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-[11px] font-bold text-rose-400 mb-1">
                    <span>রেকর্ড করা ভয়েস নোট (প্রস্তুত)</span>
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
                title="ভয়েস নোট মুছে ফেলুন"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Main Input Bar */}
        <form onSubmit={handleSendMessage} className="p-3 sm:p-4 relative">
          {/* Floating Emoji Picker Popover */}
          {isEmojiPickerOpen && (
            <div
              ref={emojiPickerRef}
              className={`absolute bottom-full mb-2 left-4 sm:left-6 z-50 w-72 sm:w-80 rounded-2xl shadow-2xl border flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 ${
                isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              {/* Emoji Search Header */}
              <div className="p-2.5 border-b border-slate-800 flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={emojiSearch}
                  onChange={(e) => setEmojiSearch(e.target.value)}
                  placeholder="ইমোজি খুঁজুন..."
                  className={`w-full text-xs bg-transparent outline-none ${
                    isDarkMode ? 'placeholder-slate-500 text-white' : 'placeholder-slate-400 text-slate-900'
                  }`}
                  autoFocus
                />
                {emojiSearch && (
                  <button type="button" onClick={() => setEmojiSearch('')} className="text-slate-400 hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsEmojiPickerOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-white transition"
                  title="বন্ধ করুন"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Emoji Category Navigation Tabs */}
              {!emojiSearch && (
                <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-800 bg-slate-900/50">
                  {EMOJI_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedEmojiCategory(cat.id)}
                      className={`p-1.5 rounded-lg text-sm transition ${
                        selectedEmojiCategory === cat.id
                          ? 'bg-blue-600/30 text-blue-400 scale-110 shadow-sm'
                          : 'opacity-60 hover:opacity-100 hover:bg-slate-800'
                      }`}
                      title={cat.name}
                    >
                      {cat.icon}
                    </button>
                  ))}
                </div>
              )}

              {/* Emoji Grid Area */}
              <div className="p-2.5 grid grid-cols-7 gap-1 max-h-48 overflow-y-auto">
                {displayedEmojis.map((emoji, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleEmojiSelect(emoji)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-lg hover:bg-slate-800/80 active:scale-90 transition cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Controls & Input Row */}
          <div className="flex items-center gap-2">
            {/* Hidden File Input for Images */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const reader = new FileReader();
                  reader.onload = () => setSelectedImage(reader.result);
                  reader.readAsDataURL(file);
                } catch (err) {
                  console.error('Image error:', err);
                }
              }}
              accept="image/*"
              className="hidden"
            />

            {/* Image Attachment Button */}
            <button
              type="button"
              onClick={() => fileInputRef?.current?.click()}
              className={`p-3 rounded-xl border font-bold active:scale-95 transition flex items-center justify-center shrink-0 ${
                isDarkMode
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700/60'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              }`}
              title="ছবি যুক্ত করুন"
            >
              <ImageIcon className="w-4 h-4" />
            </button>

            {/* Persistent Emoji Picker Trigger Button */}
            <button
              type="button"
              onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
              className={`p-3 rounded-xl border font-bold active:scale-95 transition flex items-center justify-center shrink-0 ${
                isEmojiPickerOpen
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
                  : isDarkMode
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700/60'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              }`}
              title="ইমোজি প্যানেল খুলুন"
            >
              <Smile className="w-4 h-4" />
            </button>

            {/* Persistent Voice Note Recording Button */}
            <button
              type="button"
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              className={`p-3 rounded-xl border font-bold active:scale-95 transition flex items-center justify-center shrink-0 ${
                isRecording
                  ? 'bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-600/30 animate-pulse'
                  : recordedAudioUrl
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                  : isDarkMode
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700/60'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              }`}
              title={isRecording ? 'ভয়েস রেকর্ডিং থামান' : 'ভয়েস নোট রেকর্ড করুন'}
            >
              <Mic className={`w-4 h-4 ${isRecording ? 'animate-bounce' : ''}`} />
            </button>

            {/* Active Recording Dock vs Text Input Field */}
            {isRecording ? (
              <div
                className={`flex-1 flex items-center justify-between gap-2.5 px-3 md:px-4 py-2.5 rounded-xl border ${
                  isDarkMode ? 'bg-slate-950 border-rose-500/60 text-white shadow-inner' : 'bg-rose-50 border-rose-300 text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                  <span className="text-xs font-bold text-rose-500 truncate">রেকর্ডিং চলছে...</span>
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
                    title="রেকর্ডিং শেষ করুন"
                  >
                    <Square className="w-3.5 h-3.5 fill-white" />
                    <span>থামান</span>
                  </button>
                </div>
              </div>
            ) : (
              <input
                ref={activeInputRef}
                type="text"
                value={inputText}
                onChange={handleInputChange}
                onPaste={handlePasteImage}
                placeholder={editingMessage ? 'বার্তাটি সম্পাদন করুন...' : 'বার্তা লিখুন বা ছবি পেস্ট করুন...'}
                className={`flex-1 border text-sm px-4 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition duration-200 ${
                  isDarkMode
                    ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-500 focus:border-blue-500'
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 shadow-inner'
                }`}
              />
            )}

            {/* Quick Like (👍) or Submit Button */}
            {!inputText.trim() && !selectedImage && !recordedAudioUrl && !editingMessage ? (
              <button
                type="button"
                onClick={handleSendQuickLike}
                disabled={isSending}
                className="bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 font-bold p-3 rounded-xl active:scale-90 transition flex items-center justify-center shrink-0 shadow-sm cursor-pointer"
                title="কুইক লাইক (👍) পাঠান"
              >
                <ThumbsUp className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSending || (!inputText.trim() && !selectedImage && !recordedAudioUrl)}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white font-bold p-3 rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition flex items-center justify-center shrink-0 cursor-pointer"
                title="বার্তা পাঠান"
              >
                {editingMessage ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              </button>
            )}
          </div>
        </form>
      </footer>
    </main>
  );
}
