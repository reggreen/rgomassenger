import { useState, useEffect, useRef } from 'react';
import { appwrite as supabase } from '../lib/appwrite';
import { Bell, Calendar, Clock, Mail, Plus, X, CheckCircle, AlertTriangle, Search, Trash2, Edit3, AlertCircle, Sparkles, Volume2, ShieldCheck } from 'lucide-react';
import { syncAllAlarmsWithServiceWorker, scheduleServiceWorkerAlarm, cancelServiceWorkerAlarm, triggerTestSWAlarm } from '../utils/alarmScheduler';
import { requestNotificationPermission, playTaskAlarmRingtone } from '../utils/messengerSound';

const CATEGORIES = ['সব ক্যাটাগরি', 'মিটিং/আলোচনা', 'ইভেন্ট নোটিশ', 'বিলিং ডেডলাইন', 'গুরুত্বপূর্ণ রিমাইন্ডার', 'অন্যান্য'];
const PRIORITIES = ['সাধারণ', 'মাঝারি', 'জরুরি'];

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [emailLogs, setEmailLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('সব ক্যাটাগরি');
  const [dbError, setDbError] = useState(null);
  const [modalError, setModalError] = useState(null);
  
  // Modal & Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [deletingTaskId, setDeletingTaskId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('মিটিং/আলোচনা');
  const [priority, setPriority] = useState('মাঝারি');
  const [dueDate, setDueDate] = useState('');
  const [channels, setChannels] = useState('Both'); // 'In-app', 'Email', 'Both'
  const [email, setEmail] = useState('redgreenonline2023@gmail.com');

  // Trigger load
  useEffect(() => {
    fetchTasks();
    fetchEmailLogs();

    const handleEmailsUpdated = () => {
      fetchEmailLogs();
    };

    const handleTasksUpdated = () => {
      fetchTasks();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('rg_sent_emails_updated', handleEmailsUpdated);
      window.addEventListener('rg_tasks_updated', handleTasksUpdated);
    }

    // Listen to real-time sync for tasks
    const subscription = supabase
      .channel('public:tasks')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => {
          fetchTasks();
          fetchEmailLogs();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener('rg_sent_emails_updated', handleEmailsUpdated);
        window.removeEventListener('rg_tasks_updated', handleTasksUpdated);
      }
    };
  }, []);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('due_date', { ascending: true });
      if (error) {
        console.error(error);
        setDbError(error.message || JSON.stringify(error));
      } else {
        setDbError(null);
        if (data) {
          setTasks(data);
          // Sync all pending tasks with background Service Worker scheduler
          syncAllAlarmsWithServiceWorker(data);
        }
      }
    } catch (err) {
      console.error(err);
      setDbError(err.message || String(err));
    }
  };

  const fetchEmailLogs = () => {
    if (typeof window !== 'undefined') {
      const logs = localStorage.getItem('rg_sent_emails');
      if (logs) {
        setEmailLogs(JSON.parse(logs).sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at)));
      } else {
        setEmailLogs([]);
      }
    }
  };

  const handleOpenModal = () => {
    setEditingTaskId(null);
    setTitle('');
    setDescription('');
    setCategory('মিটিং/আলোচনা');
    setPriority('মাঝারি');
    setModalError(null);
    
    // Default to current time + 1 hour formatted for datetime-local input
    const nextHour = new Date();
    nextHour.setHours(nextHour.getHours() + 1);
    nextHour.setMinutes(0);
    const tzoffset = nextHour.getTimezoneOffset() * 60000; //offset in milliseconds
    const localISOTime = (new Date(nextHour - tzoffset)).toISOString().slice(0, 16);
    
    setDueDate(localISOTime);
    setChannels('Both');
    setEmail('redgreenonline2023@gmail.com');
    setIsModalOpen(true);
  };

  const handleStartEdit = (task) => {
    setEditingTaskId(task.id);
    setTitle(task.title);
    setDescription(task.description || '');
    setCategory(task.category || 'মিটিং/আলোচনা');
    setPriority(task.priority || 'মাঝারি');
    setModalError(null);
    
    // Parse ISO date to datetime-local format
    if (task.due_date) {
      const d = new Date(task.due_date);
      const tzoffset = d.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(d - tzoffset)).toISOString().slice(0, 16);
      setDueDate(localISOTime);
    } else {
      setDueDate('');
    }
    
    setChannels(task.channels || 'Both');
    setEmail(task.email || 'redgreenonline2023@gmail.com');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTaskId(null);
    setModalError(null);
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    if (!title.trim() || !dueDate || isSubmitting) return;

    setIsSubmitting(true);
    setModalError(null);
    const taskData = {
      title: title.trim(),
      description: description.trim(),
      category: category,
      priority: priority,
      due_date: new Date(dueDate).toISOString(),
      channels: channels,
      email: (channels === 'Email' || channels === 'Both') ? email.trim() : '',
      status: 'Pending',
      alerted: false
    };

    try {
      if (editingTaskId) {
        // Keep original status and alerted settings if same due date
        const oldTask = tasks.find(t => t.id === editingTaskId);
        if (oldTask) {
          taskData.status = oldTask.status;
          // If the due date was changed, reset alerted flag so it fires again
          if (oldTask.due_date !== taskData.due_date) {
            taskData.alerted = false;
          } else {
            taskData.alerted = oldTask.alerted;
          }
        }

        const { error } = await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', editingTaskId);
        if (error) {
          console.error(error);
          setModalError('রিমাইন্ডার আপডেট করতে ব্যর্থ হয়েছে: ' + (error.message || JSON.stringify(error)));
          setIsSubmitting(false);
          return;
        }
      } else {
        const { error } = await supabase.from('tasks').insert(taskData);
        if (error) {
          console.error(error);
          setModalError('রিমাইন্ডার যোগ করতে ব্যর্থ হয়েছে: ' + (error.message || JSON.stringify(error)));
          setIsSubmitting(false);
          return;
        }
      }
      handleCloseModal();
      fetchTasks();
    } catch (err) {
      console.error(err);
      setModalError('একটি অজানা ত্রুটি ঘটেছে: ' + (err.message || String(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async (id) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);
      if (error) {
        console.error(error);
      } else {
        setTasks(prev => prev.filter(t => t.id !== id));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingTaskId(null);
    }
  };

  const handleToggleStatus = async (task) => {
    const nextStatus = task.status === 'Pending' ? 'Completed' : 'Pending';
    try {
      // Optimistic update
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: nextStatus } : t));
      
      const { error } = await supabase
        .from('tasks')
        .update({ status: nextStatus })
        .eq('id', task.id);
      
      if (error) {
        console.error(error);
        fetchTasks(); // rollback
      }
    } catch (err) {
      console.error(err);
    }
  };

  const clearEmailLogs = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('rg_sent_emails');
      fetchEmailLogs();
    }
  };

  // Filters logic
  const filteredTasks = tasks.filter(task => {
    const matchesCategory = selectedCategory === 'সব ক্যাটাগরি' || task.category === selectedCategory;
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Calculate stats
  const pendingCount = tasks.filter(t => t.status === 'Pending').length;
  const completedCount = tasks.filter(t => t.status === 'Completed').length;
  const alertedCount = tasks.filter(t => t.alerted).length;

  return (
      <div className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6 bg-slate-900/10" id="tasks-container">
      {/* Top Banner Board */}
      <div className="bg-gradient-to-r from-violet-950/40 to-slate-900 border border-violet-900/30 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs font-semibold text-violet-400">
            <Bell className="w-3.5 h-3.5 animate-bounce" />
            স্মার্ট টাস্ক ও সিডিউল নোটিফিকেশন সিস্টেম
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white">রিমাইন্ডার ও নোটিফিকেশন সেন্টার</h2>
          <p className="text-slate-400 text-sm max-w-2xl">
            যেকোনো ইভেন্ট, বিলিং ডেডলাইন বা মিটিংয়ের নির্দিষ্ট তারিখ ও সময় সেট করে রিমাইন্ডার তৈরি করুন। নির্ধারিত সময় আসামাত্র স্ক্রিনে ইন-অ্যাপ অ্যালার্ট এবং ইমেইলে নোটিফিকেশন চলে যাবে।
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={async () => {
              await requestNotificationPermission();
              playTaskAlarmRingtone(4000);
              await triggerTestSWAlarm();
            }}
            className="bg-slate-800 hover:bg-slate-700 text-violet-300 hover:text-white border border-violet-500/30 font-bold px-4 py-3 rounded-xl shadow-md active:scale-95 transition flex items-center gap-2 text-xs"
            title="সার্ভিস ওয়ার্কার ব্যাকগ্রাউন্ড সাউন্ড ও অ্যালার্ম নোটিফিকেশন টেস্ট করুন"
          >
            <Volume2 className="w-4 h-4 text-amber-400" />
            <span>অ্যালার্ম সাউন্ড টেস্ট</span>
          </button>

          <button
            onClick={handleOpenModal}
            className="bg-violet-600 hover:bg-violet-500 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-violet-500/15 active:scale-95 transition-all duration-150 flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন রিমাইন্ডার যোগ করুন</span>
          </button>
        </div>
      </div>

      {/* Database Setup Error Notice */}
      {dbError && (
        <div className="bg-rose-950/30 border border-rose-500/40 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in slide-in-from-top duration-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-rose-400 flex-shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <p className="text-sm font-bold text-rose-200">সুপাবেস ডাটাবেস সংযোগে সমস্যা বা টেবিল পাওয়া যায়নি</p>
              <p className="text-xs text-rose-300/85 mt-1 leading-relaxed">
                আপনার সুপাবেস ডাটাবেসে <code className="bg-rose-950/80 px-1.5 py-0.5 rounded font-mono text-pink-300">tasks</code> টেবিলটি খুঁজে পাওয়া যাচ্ছে না অথবা ত্রুটি রয়েছে।
                দয়া করে ওপরে <strong>"কিভাবে লাইভ করবেন? (গাইড)"</strong> বাটনে ক্লিক করে নতুন SQL স্ক্রিপ্টটি কপি করে আপনার সুপাবেস SQL Editor-এ রান করুন।
              </p>
              <p className="text-[10px] text-rose-400/70 font-mono mt-1">টেকনিক্যাল ইরর: {dbError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Mini Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-slate-850 p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">অপেক্ষমান টাস্ক</p>
            <p className="text-2xl font-extrabold text-violet-400 mt-1">{pendingCount} টি</p>
          </div>
          <div className="bg-violet-500/10 text-violet-400 p-3 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-slate-900/60 border border-slate-850 p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">সম্পন্ন রিমাইন্ডার</p>
            <p className="text-2xl font-extrabold text-emerald-400 mt-1">{completedCount} টি</p>
          </div>
          <div className="bg-emerald-500/10 text-emerald-400 p-3 rounded-xl">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-slate-900/60 border border-slate-850 p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">সফল অ্যালার্ট</p>
            <p className="text-2xl font-extrabold text-blue-400 mt-1">{alertedCount} বার</p>
          </div>
          <div className="bg-blue-500/10 text-blue-400 p-3 rounded-xl">
            <Bell className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Filter & Task list */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    selectedCategory === cat
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-600/15'
                      : 'bg-slate-900 border border-slate-850 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64 flex-shrink-0">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="রিমাইন্ডারের বিষয় খুঁজুন..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-violet-500 placeholder:text-slate-600"
              />
            </div>
          </div>

          {/* Tasks List */}
          <div className="space-y-4">
            {filteredTasks.length === 0 ? (
              <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-3">
                <Bell className="w-12 h-12 text-violet-500/30 animate-pulse" />
                <div>
                  <p className="text-slate-300 font-bold">কোনো নোটিফিকেশন রিমাইন্ডার পাওয়া যায়নি</p>
                  <p className="text-slate-500 text-xs mt-1">সব টাস্ক সম্পন্ন হয়েছে অথবা নতুন সিডিউল যোগ করুন!</p>
                </div>
              </div>
            ) : (
              filteredTasks.map((task) => {
                const isOverdue = new Date(task.due_date) < new Date() && task.status === 'Pending';
                
                return (
                  <div 
                    key={task.id} 
                    className={`bg-slate-900 border transition duration-200 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-start relative overflow-hidden group p-5 rounded-2xl ${
                      task.status === 'Completed' 
                        ? 'border-slate-850/60 opacity-60' 
                        : isOverdue 
                          ? 'border-rose-900/30 hover:border-rose-800/50 bg-rose-950/5' 
                          : 'border-slate-850 hover:border-slate-700/80'
                    }`}
                  >
                    {/* Deletion Confirmation */}
                    {deletingTaskId === task.id && (
                      <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 z-20 text-center animate-in fade-in duration-150">
                        <AlertTriangle className="w-8 h-8 text-rose-500 mb-1.5 animate-bounce" />
                        <p className="text-xs font-bold text-white mb-1">আপনি কি এই রিমাইন্ডারটি চিরতরে ডিলিট করতে চান?</p>
                        <p className="text-[10px] text-slate-400 mb-3 px-4">"{task.title}" রিমাইন্ডারটি মুছে যাবে।</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDeleteConfirm(task.id)}
                            className="bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg active:scale-95 transition"
                            type="button"
                          >
                            হ্যাঁ, মুছুন
                          </button>
                          <button
                            onClick={() => setDeletingTaskId(null)}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold px-3 py-1.5 rounded-lg active:scale-95 transition"
                            type="button"
                          >
                            না, থাক
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Left: Checkbox + Info */}
                    <div className="flex items-start gap-4 flex-1">
                      {/* Checkbox */}
                      <button
                        onClick={() => handleToggleStatus(task)}
                        className={`mt-1.5 w-5 h-5 flex-shrink-0 rounded-md border flex items-center justify-center transition-all duration-150 ${
                          task.status === 'Completed'
                            ? 'bg-emerald-600 border-emerald-500 text-white'
                            : isOverdue
                              ? 'border-rose-500/40 hover:border-rose-400 bg-rose-500/5 text-transparent'
                              : 'border-slate-700 hover:border-violet-500 bg-slate-950 text-transparent'
                        }`}
                        title={task.status === 'Completed' ? 'Pending হিসেবে চিহ্নিত করুন' : 'সম্পন্ন হিসেবে চিহ্নিত করুন'}
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                      </button>

                      {/* Details */}
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="bg-slate-950 text-slate-400 border border-slate-800 text-[9px] px-2 py-0.5 rounded-md font-bold">
                            {task.category}
                          </span>
                          <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold border ${
                            task.priority === 'জরুরি'
                              ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                              : task.priority === 'মাঝারি'
                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                : 'bg-slate-800 border-slate-750 text-slate-300'
                          }`}>
                            {task.priority} অগ্রাধিকার
                          </span>
                          {task.alerted && (
                            <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                              অ্যালার্টেড
                            </span>
                          )}
                        </div>

                        <div>
                          <h3 className={`text-base font-bold text-white leading-snug ${
                            task.status === 'Completed' ? 'line-through text-slate-500' : ''
                          }`}>
                            {task.title}
                          </h3>
                          {task.description && (
                            <p className="text-slate-400 text-xs mt-1 leading-relaxed whitespace-pre-wrap">{task.description}</p>
                          )}
                        </div>

                        {/* Date and channels indicator */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400 font-medium">
                          <span className={`flex items-center gap-1 ${isOverdue ? 'text-rose-400' : 'text-violet-400'}`}>
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(task.due_date).toLocaleDateString('bn-BD', { month: 'long', day: 'numeric', year: 'numeric' })}
                          </span>
                          <span className="flex items-center gap-1 text-slate-500 font-mono">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(task.due_date).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-slate-600">|</span>
                          <span className="flex items-center gap-1 text-slate-400">
                            <Mail className="w-3.5 h-3.5 text-slate-500" />
                            চ্যানেল: {
                              task.channels === 'Both' ? 'ইন-অ্যাপ ও ইমেইল' :
                              task.channels === 'Email' ? 'শুধুমাত্র ইমেইল' : 'শুধুমাত্র ইন-অ্যাপ'
                            }
                            {task.email && ` (${task.email})`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex sm:flex-col items-center gap-1.5 justify-end self-stretch sm:self-auto pt-3 sm:pt-0 border-t border-slate-800/50 sm:border-0">
                      <button
                        onClick={() => handleStartEdit(task)}
                        className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition text-xs flex items-center gap-1 flex-1 sm:flex-initial"
                        type="button"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span className="sm:hidden font-bold">এডিট</span>
                      </button>
                      <button
                        onClick={() => setDeletingTaskId(task.id)}
                        className="p-2 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 rounded-xl transition text-xs flex items-center gap-1 flex-1 sm:flex-initial"
                        type="button"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="sm:hidden font-bold">মুছুন</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Notification Log / Email simulation */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-violet-400" />
                ইমেইল নোটিফিকেশন লগ
              </h3>
              {emailLogs.length > 0 && (
                <button
                  onClick={clearEmailLogs}
                  className="text-[10px] text-rose-400 hover:text-rose-300 font-bold"
                >
                  ক্লিয়ার করুন
                </button>
              )}
            </div>
            
            <p className="text-[11px] text-slate-400 leading-relaxed">
              সিস্টেম যখনই কোনো ইমেইল নোটিফিকেশন পাঠায়, সেই রিয়েল-টাইম ইমেইল ডেলিভারি লগ এখানে জমা হয়।
            </p>

            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {emailLogs.length === 0 ? (
                <div className="bg-slate-950/50 border border-slate-850/60 rounded-xl p-6 text-center text-slate-500 text-xs">
                  কোনো ইমেইল নোটিফিকেশন এখনও পাঠানো হয়নি।
                </div>
              ) : (
                emailLogs.map((log) => (
                  <div key={log.id} className="bg-slate-950/80 border border-slate-850/80 rounded-xl p-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-mono text-violet-400">STATUS: SENT 📧</span>
                      <span>{new Date(log.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    </div>
                    <div>
                      <p className="text-slate-300 font-bold text-[11px]">{log.subject}</p>
                      <p className="text-slate-500 text-[10px] mt-0.5">প্রাপক: <span className="font-semibold text-slate-400">{log.recipient}</span></p>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded-lg text-slate-400 border border-slate-850 text-[10px] leading-relaxed">
                      {log.body}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Scheduler Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="border-b border-slate-800 p-5 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-2 text-violet-500">
                <Bell className="w-5 h-5" />
                <h3 className="text-sm font-bold text-white">
                  {editingTaskId ? 'রিমাইন্ডার টাস্ক এডিট করুন' : 'নতুন রিমাইন্ডার নোটিফিকেশন সেট করুন'}
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
            <form onSubmit={handleSaveTask} className="p-5 space-y-4">
              {modalError && (
                <div className="bg-rose-950/40 border border-rose-500/30 text-rose-300 rounded-xl p-3.5 text-xs flex gap-2.5 items-start">
                  <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">রিমাইন্ডার সংরক্ষণ করা যায়নি:</p>
                    <p className="text-rose-300/80 leading-relaxed text-[11px]">
                      {modalError.includes('relation "tasks" does not exist') 
                        ? 'আপনার সুপাবেস ডাটাবেসে "tasks" টেবিলটি তৈরি করা নেই। ওপরের গাইড থেকে SQL স্ক্রিপ্টটি নিয়ে রান করুন।'
                        : modalError}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">টাস্ক / রিমাইন্ডার ক্যাটাগরি</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500"
                  >
                    {CATEGORIES.slice(1).map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">অগ্রাধিকার (Priority)</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500"
                  >
                    {PRIORITIES.map((pr) => (
                      <option key={pr} value={pr}>{pr}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">রিমাইন্ডার শিরোনাম / বিষয়</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="উদা: গ্রুপ ফান্ড কালেকশন মিটিং"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">নির্ধারিত তারিখ ও সময় (Due Date/Time)</label>
                  <input
                    type="datetime-local"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">নোটিফিকেশন চ্যানেল</label>
                  <select
                    value={channels}
                    onChange={(e) => setChannels(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="In-app">শুধুমাত্র ইন-অ্যাপ (In-app Alert)</option>
                    <option value="Email">শুধুমাত্র ইমেইল (Email Notification)</option>
                    <option value="Both">উভয়ই (Both Channels)</option>
                  </select>
                </div>
              </div>

              {(channels === 'Email' || channels === 'Both') && (
                <div className="animate-in fade-in slide-in-from-top-1.5 duration-150">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">ইমেইল এড্রেস</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="উদা: demo@example.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    টাস্কের সময় আসামাত্র এই ইমেইলে চমৎকার ডেলিভারি নোটিফিকেশন মেল চলে যাবে।
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">টাস্কের অতিরিক্ত বিবরণ (Description)</label>
                <textarea
                  rows="3"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="রিমাইন্ডারের ব্যাপারে বিস্তারিত নোট লিখে রাখুন..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500 resize-none"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-violet-500/10 active:scale-95 transition-all duration-150 flex items-center justify-center text-sm"
              >
                {isSubmitting ? 'সেভ হচ্ছে...' : editingTaskId ? 'আপডেট করুন' : 'রিমাইন্ডার যুক্ত করুন'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
