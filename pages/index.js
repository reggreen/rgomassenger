import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Send, Hash, User, Users, Smile, Shield, Sparkles, MessageSquare, Edit3, Check, AlertTriangle } from 'lucide-react';

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

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [username, setUsername] = useState('');
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [tempUsername, setTempUsername] = useState('');
  const [activeRoom, setActiveRoom] = useState('general');
  const [isSending, setIsSending] = useState(false);
  const [dbError, setDbError] = useState(null);
  
  const messagesEndRef = useRef(null);

  // Initialize nickname
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('rg_username');
      if (saved) {
        setUsername(saved);
        setTempUsername(saved);
      } else {
        const randomName = PRESET_NAMES[Math.floor(Math.random() * PRESET_NAMES.length)] + ' (নতুন)';
        setUsername(randomName);
        setTempUsername(randomName);
        localStorage.setItem('rg_username', randomName);
      }
    }
  }, []);

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

    // 2. Subscribe to new messages (Supabase Replication)
    const subscription = supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          if (active && payload.new && payload.new.room === activeRoom) {
            setMessages((prev) => {
              // Avoid duplicate messages
              if (prev.some(msg => msg.id === payload.new.id)) return prev;
              return [...prev, payload.new];
            });
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [activeRoom]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;

    setIsSending(true);
    const newMsg = {
      room: activeRoom,
      sender: username,
      content: inputText.trim(),
    };

    try {
      const { data, error } = await supabase.from('messages').insert(newMsg);
      if (error) {
        console.error('Error sending message:', error);
        setDbError(error);
      } else {
        setDbError(null);
        setInputText('');
        // Optimistic local update for instantaneous experience (if mock is used, handles this inside insert)
        if (data) {
          setMessages((prev) => {
            if (prev.some(msg => msg.id === data[0].id)) return prev;
            return [...prev, data[0]];
          });
        }
      }
    } catch (err) {
      console.error('Send error:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveUsername = () => {
    if (tempUsername.trim()) {
      setUsername(tempUsername.trim());
      localStorage.setItem('rg_username', tempUsername.trim());
      setIsEditingUsername(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto overflow-hidden bg-slate-900 border-x border-slate-800" id="chat-applet">
      {/* Left Sidebar - Channels & Profiles */}
      <div className="w-full md:w-80 bg-slate-950 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col flex-shrink-0">
        
        {/* Profile Card */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2.5 rounded-full shadow-lg shadow-blue-500/10 text-white font-bold">
                <User className="w-5 h-5" />
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
                    onClick={() => setActiveRoom(channel.id)}
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
      <div className="flex-1 flex flex-col bg-slate-900/40 h-[65vh] md:h-[80vh] overflow-hidden">
        {/* Chat Room Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hash className="w-5 h-5 text-blue-500" />
            <div>
              <h3 className="text-base font-bold text-white">
                {CHANNELS.find(c => c.id === activeRoom)?.name}
              </h3>
              <p className="text-xs text-slate-400">
                {CHANNELS.find(c => c.id === activeRoom)?.desc}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-slate-400 text-xs">
            <Users className="w-4 h-4 text-slate-500" />
            <span className="font-mono">কমিউনিটি লাইভ</span>
          </div>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {dbError && (
            <div className="bg-amber-950/40 border border-amber-800/80 rounded-xl p-4 text-xs text-amber-300 space-y-2 mb-4 animate-in fade-in duration-200">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-200">সুপাবেস ডাটাবেস এরর ডিটেক্টেড!</h4>
                  <p className="mt-1 leading-relaxed text-slate-300">
                    আপনার সুপাবেস ডাটাবেসের টেবিল স্ট্রাকচার (Schema) সঠিক নয় অথবা পুরানো টেবিল রয়ে গেছে। এর ফলে বার্তা পাঠানো বা লোড করা যাচ্ছে না।
                  </p>
                  <p className="mt-2 text-slate-400 font-mono text-[10px]">
                    Error Details: {dbError.message || JSON.stringify(dbError)} (Code: {dbError.code})
                  </p>
                  <p className="mt-1.5 text-xs text-amber-400 font-semibold">
                    সমাধান: পেজের উপরে থাকা সবুজ "ডাটাবেস সেটিংস দেখুন" বাটনে ক্লিক করে পুরো SQL কোডটি কপি করুন এবং আপনার Supabase SQL Editor-এ রান (Run) করুন। এটি পুরানো টেবিলগুলো ডিলিট করে সঠিক নতুন কলামসহ টেবিল তৈরি করবে।
                  </p>
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
              return (
                <div key={msg.id || index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-1.5 mb-1 text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-400">{msg.sender}</span>
                    <span>•</span>
                    <span className="font-mono">
                      {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'এখনই'}
                    </span>
                  </div>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                    isMe 
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700/60'
                  }`}>
                    <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Bar */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800 bg-slate-900/80">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="আপনার বার্তা এখানে লিখুন..."
              className="flex-1 bg-slate-950 border border-slate-800 focus:border-blue-500 text-white text-sm px-4 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all duration-200 placeholder:text-slate-600"
            />
            <button
              type="submit"
              disabled={isSending || !inputText.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white font-bold p-3.5 rounded-xl shadow-lg shadow-blue-500/10 active:scale-95 transition-all duration-150 flex items-center justify-center flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
