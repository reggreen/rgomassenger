import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { appwrite as supabase } from '../lib/appwrite';
import { Calendar, MapPin, Users, Plus, X, Sparkles, Clock, ArrowRight, Edit3, Trash2, AlertTriangle, Bell, CheckSquare, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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

export default function Events() {
  const { user } = useAuth();
  const [eventsList, setEventsList] = useState([]);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [userRsvps, setUserRsvps] = useState({}); // Tracking local RSVPs in session
  const [editingEventId, setEditingEventId] = useState(null);
  const [deletingEventId, setDeletingEventId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // Form states
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [eventImage, setEventImage] = useState('');
  const [priority, setPriority] = useState('মাঝারি'); // 'সাধারণ', 'মাঝারি', 'জরুরি'
  const [lightboxImage, setLightboxImage] = useState(null);
  const fileInputRef = useRef(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load and subscribe
  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true });
      
      if (error) {
        console.error(error);
        return;
      }
      if (data) {
        setEventsList(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    let active = true;

    fetchEvents();

    const subscription = supabase
      .channel('public:events')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        () => {
          if (active) {
            fetchEvents();
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleOpenAddModal = () => {
    setEditingEventId(null);
    setTitle('');
    setDate('');
    setLocation('');
    setDescription('');
    setEventImage('');
    setPriority('মাঝারি');
    setIsEventModalOpen(true);
  };

  const handleStartEdit = (evt) => {
    setEditingEventId(evt.id);
    setTitle(evt.title);
    setPriority(evt.priority || 'মাঝারি');
    
    // Format the date for input: datetime-local needs YYYY-MM-DDTHH:MM
    try {
      const dateObj = new Date(evt.date);
      const tzOffset = dateObj.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(dateObj - tzOffset)).toISOString().slice(0, 16);
      setDate(localISOTime);
    } catch (e) {
      setDate('');
    }

    setLocation(evt.location);

    let descText = evt.description || '';
    let descImg = '';
    if (evt.description && evt.description.startsWith('{"text":')) {
      try {
        const parsed = JSON.parse(evt.description);
        descText = parsed.text || '';
        descImg = parsed.image || '';
      } catch (e) {
        descText = evt.description;
      }
    }
    setDescription(descText);
    setEventImage(descImg);
    setIsEventModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsEventModalOpen(false);
    setEditingEventId(null);
    setTitle('');
    setDate('');
    setLocation('');
    setDescription('');
    setEventImage('');
    setPriority('মাঝারি');
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!title.trim() || !date || !location.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const finalDescription = eventImage ? JSON.stringify({
      text: description.trim(),
      image: eventImage
    }) : description.trim();

    const eventData = {
      title: title.trim(),
      date: new Date(date).toISOString(),
      location: location.trim(),
      description: finalDescription,
      priority: priority
    };

    try {
      if (editingEventId) {
        // Update mode
        const { error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', editingEventId);
        
        if (error) {
          console.error(error);
        } else {
          handleCloseModal();
          fetchEvents(); // Fallback reload
        }
      } else {
        // Create mode
        const { error } = await supabase.from('events').insert(eventData);
        if (error) {
          console.error(error);
        } else {
          handleCloseModal();
          fetchEvents(); // Fallback reload
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async (id) => {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error(error);
      } else {
        setEventsList(prev => prev.filter(evt => evt.id !== id));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingEventId(null);
    }
  };

  const handleRsvp = (eventId) => {
    setUserRsvps(prev => ({
      ...prev,
      [eventId]: !prev[eventId]
    }));
  };

  const handleSetTaskReminder = async (evt, descText) => {
    try {
      const taskData = {
        title: `🔔 [ইভেন্ট] ${evt.title}`,
        description: `স্থান: ${evt.location}\n\nবিবরণ: ${descText || 'কোনো অতিরিক্ত বিবরণ দেয়া হয়নি।'}`,
        category: 'ইভেন্ট নোটিশ',
        priority: evt.priority || 'মাঝারি',
        due_date: evt.date,
        channels: 'Both',
        email: user?.email || 'redgreenonline1013@gmail.com',
        status: 'Pending',
        alerted: false
      };

      const { error } = await supabase.from('tasks').insert(taskData);
      if (error) {
        console.error(error);
        if (error.message && error.message.includes('relation "tasks" does not exist')) {
          setToastMessage('ত্রুটি: আপনার সুপাবেস ডাটাবেসে "tasks" টেবিলটি নেই! অনুগ্রহ করে টাস্ক পেজের গাইড থেকে SQL রান করুন।');
        } else {
          setToastMessage(`রিমাইন্ডার সেট করতে সমস্যা হয়েছে: ${error.message || 'ডাটাবেস ত্রুটি'}`);
        }
      } else {
        setToastMessage(`"${evt.title}" এর জন্য সাকসেসফুলি রিমাইন্ডার ও ইমেইল নোটিফিকেশন সেট করা হয়েছে!`);
        setTimeout(() => setToastMessage(''), 4000);
      }
    } catch (err) {
      console.error(err);
      setToastMessage('রিমাইন্ডার সেট করতে সমস্যা হয়েছে।');
    }
  };

  return (
      <div className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6 bg-slate-900/10" id="events-container">
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-emerald-600/95 border border-emerald-500/30 backdrop-blur-md text-white font-bold px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 max-w-md w-full mx-4 sm:mx-0">
          <Bell className="w-5 h-5 text-emerald-100 animate-bounce" />
          <span className="text-xs flex-1 leading-snug">{toastMessage}</span>
          <button onClick={() => setToastMessage('')} className="p-1 hover:bg-emerald-700/50 rounded-lg text-emerald-100 transition">
            <X className="w-4.5 h-4.5" />
          </button>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-violet-900/40 to-slate-900 border border-violet-900/30 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs font-semibold text-violet-400">
            <Sparkles className="w-3.5 h-3.5" />
            গ্রুপ ইভেন্টস ও মিটআপ ক্যালেন্ডার
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white">কমিউনিটি ইভেন্টস</h2>
          <p className="text-slate-400 text-sm max-w-2xl">
            অনলাইন সেমিনার, গুরুত্বপূর্ণ ডেভেলপমেন্ট সেশন এবং অফলাইন গেট-টুগেদার এর শিডিউল দেখুন। অংশগ্রহণ নিশ্চিত করে বন্ধুদের সাথে আড্ডা দিন।
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <Link
            href="/tasks"
            className="w-full sm:w-auto bg-slate-800/80 hover:bg-slate-750 text-slate-200 font-bold px-5 py-3 rounded-xl border border-slate-700/50 shadow hover:text-white transition active:scale-95 flex items-center justify-center gap-2 text-sm text-center"
          >
            <Bell className="w-4 h-4 text-violet-400" />
            <span>টাস্ক ও নোটিফিকেশন</span>
          </Link>
          <button
            onClick={handleOpenAddModal}
            className="w-full sm:w-auto bg-violet-600 hover:bg-violet-500 text-white font-bold px-5 py-3 rounded-xl shadow-lg shadow-violet-500/15 active:scale-95 transition-all duration-150 flex items-center justify-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন ইভেন্ট যুক্ত করুন</span>
          </button>
        </div>
      </div>

      {/* Events bento grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {eventsList.length === 0 ? (
          <div className="col-span-full bg-slate-900/60 border border-slate-850 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-3">
            <Calendar className="w-12 h-12 text-violet-500/45" />
            <div>
              <p className="text-slate-300 font-bold">কোনো ইভেন্ট তালিকাভুক্ত নেই</p>
              <p className="text-slate-500 text-xs mt-1">কমিউনিটির প্রথম চমৎকার ইভেন্টটি আপনি এখনই তৈরি করুন!</p>
            </div>
          </div>
        ) : (
          eventsList.map((evt) => {
            const hasRsvped = !!userRsvps[evt.id];
            const eventDate = new Date(evt.date);
            const dateStr = eventDate.toLocaleDateString('bn-BD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            const timeStr = eventDate.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });

            let descText = evt.description || '';
            let descImg = '';
            if (evt.description && evt.description.startsWith('{"text":')) {
              try {
                const parsed = JSON.parse(evt.description);
                descText = parsed.text || '';
                descImg = parsed.image || '';
              } catch (e) {
                descText = evt.description;
              }
            }

            const isUrgent = evt.priority === 'জরুরি';
            const isMedium = evt.priority === 'মাঝারি' || !evt.priority;
            
            let cardBorder = 'border-slate-850 hover:border-slate-750';
            if (isUrgent) {
              cardBorder = 'border-rose-500/30 hover:border-rose-500/50 shadow-lg shadow-rose-500/5';
            } else if (isMedium) {
              cardBorder = 'border-amber-500/25 hover:border-amber-500/45';
            }

            return (
              <div key={evt.id} className={`bg-slate-900 border ${cardBorder} rounded-2xl overflow-hidden flex flex-col justify-between transition duration-200 group relative shadow-md`}>
                {/* Visual Top Accent / Cover image */}
                {descImg ? (
                  <div className="relative h-44 w-full overflow-hidden bg-slate-950 border-b border-slate-850 cursor-zoom-in group/img">
                    <img 
                      src={descImg} 
                      alt={evt.title} 
                      onClick={() => setLightboxImage(descImg)}
                      className="w-full h-full object-cover group-hover/img:scale-105 transition duration-300"
                    />
                    <div className="absolute top-2.5 right-2.5 bg-slate-950/80 backdrop-blur px-2.5 py-1 rounded-lg text-[10px] text-violet-400 font-bold border border-violet-500/10">
                      ইভেন্ট ইমেজ
                    </div>
                  </div>
                ) : (
                  <div className={`h-2 bg-gradient-to-r ${isUrgent ? 'from-rose-500 to-pink-500' : isMedium ? 'from-amber-500 to-orange-500' : 'from-violet-500 to-indigo-500'}`}></div>
                )}

                {/* Inline Delete Confirmation Overlay */}
                {deletingEventId === evt.id && (
                  <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 z-20 text-center animate-in fade-in duration-150">
                    <AlertTriangle className="w-10 h-10 text-rose-500 mb-2 animate-bounce" />
                    <p className="text-sm font-bold text-white mb-1">আপনি কি নিশ্চিতভাবে মুছে ফেলতে চান?</p>
                    <p className="text-xs text-slate-400 mb-4 px-4">"{evt.title}" ইভেন্টটি চিরতরে মুছে যাবে।</p>
                    <div className="flex gap-2.5">
                      <button
                        onClick={() => handleDeleteConfirm(evt.id)}
                        className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-4 py-2 rounded-xl active:scale-95 transition"
                        type="button"
                      >
                        হ্যাঁ, ডিলিট করুন
                      </button>
                      <button
                        onClick={() => setDeletingEventId(null)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-4 py-2 rounded-xl active:scale-95 transition"
                        type="button"
                      >
                        না, থাক
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Body */}
                <div className="p-6 space-y-4 flex-1">
                  <div className="space-y-2">
                    {/* Priority Badge */}
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isUrgent 
                          ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' 
                          : isMedium 
                            ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' 
                            : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                      }`}>
                        {evt.priority || 'মাঝারি'} অগ্রাধিকার
                      </span>
                    </div>

                    <div className="flex justify-between items-start gap-4">
                      <h3 className="text-base font-extrabold text-white group-hover:text-violet-400 transition leading-snug flex-1">
                        {evt.title}
                      </h3>
                      <div className="flex items-center gap-1 opacity-80 md:opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex-shrink-0">
                        <button
                          onClick={() => handleStartEdit(evt)}
                          className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
                          title="সম্পাদনা করুন"
                          type="button"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingEventId(evt.id)}
                          className="p-1.5 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 rounded-lg transition"
                          title="ডিলিট করুন"
                          type="button"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-slate-400 text-xs line-clamp-3 leading-relaxed">
                      {descText || 'এই ইভেন্টটির কোনো অতিরিক্ত বিবরণ দেয়া হয়নি।'}
                    </p>
                  </div>

                  {/* Metadata info */}
                  <div className="space-y-3.5 border-t border-slate-800/85 pt-3.5">
                    <div className="space-y-2 text-xs text-slate-400">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-violet-400 flex-shrink-0" />
                        <span className="font-semibold">{dateStr} • {timeStr}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-pink-400 flex-shrink-0" />
                        <span className="truncate">{evt.location}</span>
                      </div>
                    </div>

                    {/* Set Task Reminder Trigger Button */}
                    <button
                      onClick={() => handleSetTaskReminder(evt, descText)}
                      className="w-full bg-slate-950 hover:bg-violet-950/20 text-slate-300 hover:text-violet-400 border border-slate-850 hover:border-violet-500/30 text-[10px] font-bold py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-inner"
                      type="button"
                    >
                      <Bell className="w-3.5 h-3.5 text-violet-400" />
                      <span>নোটিফিকেশন রিমাইন্ডার সেট করুন</span>
                    </button>
                  </div>
                </div>

                {/* Footer RSVP */}
                <div className="px-6 py-4 bg-slate-950/60 border-t border-slate-800/60 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Users className="w-4 h-4" />
                    <span>{hasRsvped ? '২ জন যুক্ত' : '১ জন যুক্ত'}</span>
                  </div>
                  <button
                    onClick={() => handleRsvp(evt.id)}
                    className={`text-xs font-bold px-4 py-2.5 rounded-xl border transition-all ${
                      hasRsvped
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-slate-900 border-slate-800 hover:border-violet-700 hover:text-violet-300 text-slate-300'
                    }`}
                  >
                    {hasRsvped ? 'অংশগ্রহণ করছেন ✓' : 'অংশগ্রহণ করব'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add/Edit Event Modal */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="border-b border-slate-800 p-5 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-2 text-violet-500">
                <Calendar className="w-5 h-5" />
                <h3 className="text-sm font-bold text-white">
                  {editingEventId ? 'গ্রুপ ইভেন্ট সম্পাদন করুন' : 'নতুন গ্রুপ ইভেন্ট তৈরি করুন'}
                </h3>
              </div>
              <button 
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateEvent} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">ইভেন্টের শিরোনাম</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="উদা: উইকেন্ড টেকনিক্যাল গেট-টুগেদার"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">অগ্রাধিকার স্তর (Event Priority)</label>
                <div className="grid grid-cols-3 gap-2">
                  {['সাধারণ', 'মাঝারি', 'জরুরি'].map((p) => {
                    const isSel = priority === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          isSel
                            ? p === 'জরুরি'
                              ? 'bg-rose-500/20 border-rose-500/45 text-rose-400'
                              : p === 'মাঝারি'
                                ? 'bg-amber-500/20 border-amber-500/45 text-amber-400'
                                : 'bg-emerald-500/20 border-emerald-500/45 text-emerald-400'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-750'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">তারিখ ও সময়</label>
                  <input
                    type="datetime-local"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">স্থান (Location)</label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="উদা: জুম বা ধানমন্ডি লেক, ঢাকা"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">বিস্তারিত বর্ণনা (Description)</label>
                <textarea
                  required
                  rows="3"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="ইভেন্টটির উদ্দেশ্য এবং কি কি বিষয় নিয়ে আলোচনা করা হবে..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500 resize-none"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">ইভেন্ট কাভার ইমেজ (Image Cover)</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const compressed = await resizeImage(file, 1000, 1000, 0.7);
                      setEventImage(compressed);
                    } catch (err) {
                      console.error('Image processing error:', err);
                    }
                  }}
                  accept="image/*"
                  className="hidden"
                />
                <div className="flex gap-3 items-center">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white px-4 py-2.5 rounded-xl border border-slate-700/50 text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <ImageIcon className="w-4 h-4 text-violet-400" />
                    <span>ইমেজ সিলেক্ট করুন</span>
                  </button>
                  {eventImage && (
                    <button
                      type="button"
                      onClick={() => {
                        setEventImage('');
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="text-rose-400 hover:text-rose-300 text-xs font-bold transition-all"
                    >
                      ছবি মুছুন
                    </button>
                  )}
                </div>
                {eventImage && (
                  <div className="mt-3 relative rounded-xl overflow-hidden border border-slate-850 max-h-32 bg-slate-950 flex items-center justify-center">
                    <img 
                      src={eventImage} 
                      alt="Event Preview" 
                      className="max-h-32 object-contain"
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-violet-500/10 active:scale-95 transition-all duration-150 flex items-center justify-center text-sm"
              >
                {isSubmitting ? 'সেভ হচ্ছে...' : editingEventId ? 'ইভেন্ট আপডেট করুন' : 'নতুন ইভেন্ট শিডিউল করুন'}
              </button>
            </form>
          </div>
        </div>
      )}

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
    </div>
  );
}
