import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, MapPin, Users, Plus, X, Sparkles, Clock, ArrowRight } from 'lucide-react';

export default function Events() {
  const [eventsList, setEventsList] = useState([]);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [userRsvps, setUserRsvps] = useState({}); // Tracking local RSVPs in session

  // Form states
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
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

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!title.trim() || !date || !location.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const newEvent = {
      title: title.trim(),
      date: new Date(date).toISOString(),
      location: location.trim(),
      description: description.trim()
    };

    try {
      const { error } = await supabase.from('events').insert(newEvent);
      if (error) {
        console.error(error);
      } else {
        setIsEventModalOpen(false);
        setTitle('');
        setDate('');
        setLocation('');
        setDescription('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRsvp = (eventId) => {
    setUserRsvps(prev => ({
      ...prev,
      [eventId]: !prev[eventId]
    }));
  };

  return (
    <div className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6 bg-slate-900/10" id="events-container">
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

        <button
          onClick={() => setIsEventModalOpen(true)}
          className="bg-violet-600 hover:bg-violet-500 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-violet-500/15 active:scale-95 transition-all duration-150 flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>নতুন ইভেন্ট যুক্ত করুন</span>
        </button>
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

            return (
              <div key={evt.id} className="bg-slate-900 border border-slate-850 hover:border-slate-700/80 rounded-2xl overflow-hidden flex flex-col justify-between transition duration-200 group shadow-md">
                {/* Visual Top Accent */}
                <div className="h-2 bg-gradient-to-r from-violet-500 to-indigo-500"></div>
                
                {/* Body */}
                <div className="p-6 space-y-4 flex-1">
                  <div className="space-y-2">
                    <h3 className="text-lg font-extrabold text-white group-hover:text-violet-400 transition leading-snug">
                      {evt.title}
                    </h3>
                    <p className="text-slate-400 text-xs line-clamp-3 leading-relaxed">
                      {evt.description || 'এই ইভেন্টটির কোনো অতিরিক্ত বিবরণ দেয়া হয়নি।'}
                    </p>
                  </div>

                  {/* Metadata info */}
                  <div className="space-y-2 border-t border-slate-800/85 pt-3.5 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-violet-400 flex-shrink-0" />
                      <span className="font-semibold">{dateStr} • {timeStr}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-pink-400 flex-shrink-0" />
                      <span className="truncate">{evt.location}</span>
                    </div>
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

      {/* Add Event Modal */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="border-b border-slate-800 p-5 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-2 text-violet-500">
                <Calendar className="w-5 h-5" />
                <h3 className="text-sm font-bold text-white">নতুন গ্রুপ ইভেন্ট তৈরি করুন</h3>
              </div>
              <button 
                onClick={() => setIsEventModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
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

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-violet-500/10 active:scale-95 transition-all duration-150 flex items-center justify-center text-sm"
              >
                {isSubmitting ? 'সেভ হচ্ছে...' : 'নতুন ইভেন্ট শিডিউল করুন'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
