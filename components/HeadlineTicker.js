import { useState, useEffect } from 'react';
import { appwrite as supabase } from '../lib/appwrite';
import { Megaphone, Clock, ChevronLeft, ChevronRight, Sparkles, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';

export default function HeadlineTicker() {
  const [tasks, setTasks] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('due_date', { ascending: true });
      
      if (error) {
        console.error('Ticker fetch error:', error);
        return;
      }

      if (data) {
        // Filter for pending tasks
        const active = data.filter(t => t.status === 'Pending' || t.status === 'In Progress');
        setTasks(active);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();

    // Subscribe to task updates for instant sync
    const subscription = supabase
      .channel('public:tasks-ticker')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => {
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Auto rotate headlines every 5 seconds
  useEffect(() => {
    if (tasks.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % tasks.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [tasks]);

  const handleNext = () => {
    if (tasks.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % tasks.length);
  };

  const handlePrev = () => {
    if (tasks.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + tasks.length) % tasks.length);
  };

  const formatBengaliDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      const day = d.getDate();
      const monthNames = [
        'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
        'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
      ];
      const month = monthNames[d.getMonth()];
      let hour = d.getHours();
      const minute = d.getMinutes().toString().padStart(2, '0');
      const ampm = hour >= 12 ? 'PM' : 'AM';
      hour = hour % 12;
      hour = hour ? hour : 12; // the hour '0' should be '12'
      
      // Convert numbers to Bengali
      const toBengaliNum = (num) => {
        const bnNums = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
        return String(num).split('').map(digit => bnNums[Number(digit)] || digit).join('');
      };

      return `${toBengaliNum(day)} ${month}, ${toBengaliNum(hour)}:${toBengaliNum(minute)} ${ampm}`;
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="w-full bg-slate-950/85 border-b border-slate-900 shadow-lg relative overflow-hidden" id="headline-ticker-root">
      {/* Visual neon line at the bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-violet-500/0 via-violet-500/40 to-pink-500/0"></div>

      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3.5">
        {/* News Badge */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="bg-rose-500/10 border border-rose-500/25 text-rose-400 px-2.5 py-1 rounded-lg text-[11px] font-extrabold flex items-center gap-1.5 uppercase tracking-wider shadow-inner">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            <Megaphone className="w-3.5 h-3.5" />
            <span>নিউজ ডেসক</span>
          </div>
        </div>

        {/* Dynamic sliding announcements */}
        <div className="flex-1 min-w-0 relative h-7 flex items-center">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs text-slate-500 font-medium animate-pulse"
              >
                রিমাইন্ডার এবং হেডলাইন লোড হচ্ছে...
              </motion.div>
            ) : tasks.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="text-xs text-slate-400 font-medium truncate flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
                <span>আজকে কোনো জরুরি রিমাইন্ডার নেই। নতুন রিমাইন্ডার সেট করতে <Link href="/tasks" className="text-violet-400 hover:underline font-bold">টাস্ক পেজে</Link> যান।</span>
              </motion.div>
            ) : (
              <motion.div
                key={tasks[currentIndex].id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ type: 'spring', stiffness: 220, damping: 20 }}
                className="w-full flex items-center justify-between gap-2.5"
              >
                <div className="text-xs font-semibold text-slate-200 truncate flex items-center gap-2">
                  {/* Category Badge */}
                  <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                    tasks[currentIndex].priority === 'জরুরি'
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      : tasks[currentIndex].priority === 'মাঝারি'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}>
                    {tasks[currentIndex].category || 'টাস্ক'}
                  </span>
                  
                  {/* Divider */}
                  <span className="text-slate-700">•</span>

                  {/* Task Title */}
                  <Link href="/tasks" className="hover:text-violet-400 transition cursor-pointer truncate font-bold">
                    {tasks[currentIndex].title}
                  </Link>

                  {/* Date Badge */}
                  <span className="text-[11px] text-slate-400 bg-slate-900 border border-slate-850 px-2 py-0.5 rounded-md flex items-center gap-1 font-medium flex-shrink-0">
                    <Clock className="w-3 h-3 text-violet-400" />
                    <span>সময়: {formatBengaliDate(tasks[currentIndex].due_date)}</span>
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Controls */}
        {tasks.length > 1 && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={handlePrev}
              className="p-1 hover:bg-slate-900 text-slate-400 hover:text-white rounded-md border border-transparent hover:border-slate-800 transition"
              title="পূর্ববর্তী"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="p-1 hover:bg-slate-900 text-slate-400 hover:text-white rounded-md border border-transparent hover:border-slate-800 transition"
              title="পরবর্তী"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
