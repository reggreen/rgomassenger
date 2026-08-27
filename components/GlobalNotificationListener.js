import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Bell, Mail, X, CheckSquare, MessageSquare, Volume2, Sparkles, VolumeX } from 'lucide-react';
import Link from 'next/link';
import { playMessengerSound, playTaskAlarmRingtone, sendMessengerNotification, requestNotificationPermission } from '../utils/messengerSound';

export default function GlobalNotificationListener() {
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [incomingMessageToast, setIncomingMessageToast] = useState(null);
  const [notificationPermissionGranted, setNotificationPermissionGranted] = useState(false);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);

  useEffect(() => {
    // Check permission state
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        setNotificationPermissionGranted(true);
      } else if (Notification.permission === 'default') {
        // Show subtle permission banner on mobile/desktop
        setShowPermissionPrompt(true);
      }
    }

    // 1. Task Reminders check every 10s
    checkPendingTasks();
    const taskInterval = setInterval(() => {
      checkPendingTasks();
    }, 10000);

    // 2. Listen to Background Service Worker Alarm triggers
    const handleSWAlarmEvent = (e) => {
      const alarm = e.detail;
      if (!alarm) return;
      
      // Play 10s alarm ringtone immediately
      playTaskAlarmRingtone(10000);

      setActiveAlerts((prev) => {
        if (prev.some((a) => String(a.id) === String(alarm.id))) {
          return prev;
        }
        return [alarm, ...prev];
      });
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('rg_task_alarm_fired', handleSWAlarmEvent);
      window.addEventListener('rg_task_alarm_received', handleSWAlarmEvent);
    }

    // 3. Realtime Messages Listener for instant sound & notifications
    let currentUsername = '';
    if (typeof window !== 'undefined') {
      currentUsername = localStorage.getItem('rg_username') || '';
    }

    const messageChannel = supabase
      .channel('public:messages_global_listener')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          if (!payload.new) return;
          const msg = payload.new;

          // Check logged in user to avoid notifying self
          const myUser = typeof window !== 'undefined' ? (localStorage.getItem('rg_username') || '') : '';
          if (msg.sender && myUser && msg.sender.trim().toLowerCase() === myUser.trim().toLowerCase()) {
            return;
          }

          // Trigger Sound & Desktop/Mobile Push Notification
          sendMessengerNotification(msg.sender || 'নতুন মেসেজ', msg.content || 'একটি মেসেজ পাঠানো হয়েছে');

          // Trigger in-app Floating Toast Banner
          setIncomingMessageToast({
            id: msg.id || Math.random().toString(36).substr(2, 8),
            sender: msg.sender || 'মেসেঞ্জার ইউজার',
            content: msg.content || 'মেসেজ এসেছে',
            room: msg.room || 'general',
            created_at: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })
          });

          // Auto-hide toast after 6 seconds
          setTimeout(() => {
            setIncomingMessageToast((prev) => (prev && prev.id === msg.id ? null : prev));
          }, 6000);
        }
      )
      .subscribe();

    return () => {
      clearInterval(taskInterval);
      messageChannel.unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener('rg_task_alarm_fired', handleSWAlarmEvent);
        window.removeEventListener('rg_task_alarm_received', handleSWAlarmEvent);
      }
    };
  }, []);

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setNotificationPermissionGranted(granted);
    setShowPermissionPrompt(false);
  };

  const checkPendingTasks = async () => {
    try {
      const { data: tasks, error } = await supabase.from('tasks').select('*');
      if (error || !tasks) return;

      const now = new Date();
      const triggeredAlerts = [];

      for (const task of tasks) {
        const dueDate = new Date(task.due_date);
        if (task.status === 'Pending' && !task.alerted && dueDate <= now) {
          await supabase.from('tasks').update({ alerted: true }).eq('id', task.id);
          triggeredAlerts.push(task);

          if (task.channels === 'Email' || task.channels === 'Both') {
            const currentLogs = JSON.parse(localStorage.getItem('rg_sent_emails') || '[]');
            const newLog = {
              id: Math.random().toString(36).substr(2, 9),
              task_id: task.id,
              recipient: task.email || 'redgreenonline2023@gmail.com',
              subject: `🔔 [নোটিফিকেশন অ্যালার্ট] ${task.title}`,
              body: `প্রিয় গ্রাহক,\nআপনার নির্ধারিত টাস্ক "${task.title}" এর সময় এসে গেছে।\n\nক্যাটাগরি: ${task.category}\nঅগ্রাধিকার: ${task.priority}\nনির্ধারিত সময়: ${new Date(task.due_date).toLocaleString('bn-BD')}\n\nবিবরণ:\n${task.description || 'কোনো অতিরিক্ত বিবরণ দেয়া হয়নি।'}\n\nধন্যবাদ,\nrgomassenger টাস্ক নোটিফিকেশন টিম`,
              sent_at: new Date().toISOString()
            };

            localStorage.setItem('rg_sent_emails', JSON.stringify([...currentLogs, newLog]));
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new Event('rg_sent_emails_updated'));
            }
          }
        }
      }

      if (triggeredAlerts.length > 0) {
        setActiveAlerts(prev => [...prev, ...triggeredAlerts]);
        playMessengerSound();
      }
    } catch (err) {
      console.error('Error checking tasks:', err);
    }
  };

  const handleDismissAlert = (id) => {
    setActiveAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  const handleCompleteTask = async (task) => {
    try {
      await supabase.from('tasks').update({ status: 'Completed' }).eq('id', task.id);
      handleDismissAlert(task.id);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('rg_tasks_updated'));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      {/* 1. Mobile & Desktop Sound/Notification Permission Unlock Bar */}
      {showPermissionPrompt && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[1000] w-11/12 max-w-md bg-gradient-to-r from-indigo-900/90 via-blue-900/90 to-slate-900/90 backdrop-blur-md border border-indigo-500/40 rounded-2xl p-3 shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-indigo-600/30 rounded-xl border border-indigo-400/30 shrink-0 text-amber-400">
              <Volume2 className="w-4 h-4 animate-bounce" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">মেসেঞ্জার সাউন্ড ও নোটিফিকেশন</p>
              <p className="text-[10px] text-slate-300 truncate">মেসেজের রিয়েল-টাইম সাউন্ড শুনতে নোটিফিকেশন এলাউ করুন</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleEnableNotifications}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[11px] px-3 py-1.5 rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>অন করুন</span>
            </button>
            <button
              onClick={() => setShowPermissionPrompt(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Instant Realtime Messenger Message Toast Notification */}
      {incomingMessageToast && (
        <div className="fixed top-16 right-4 z-[999] max-w-sm w-full px-2 sm:px-0 animate-in slide-in-from-top-2 duration-300">
          <div className="bg-slate-900/95 border border-indigo-500/40 rounded-2xl p-4 shadow-2xl shadow-indigo-500/10 backdrop-blur-md relative overflow-hidden flex flex-col gap-2">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-600/20 text-blue-400 rounded-lg">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-indigo-300">নতুন মেসেঞ্জার মেসেজ</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">{incomingMessageToast.created_at}</span>
            </div>

            <div>
              <p className="text-xs font-bold text-white">{incomingMessageToast.sender}</p>
              <p className="text-xs text-slate-300 line-clamp-2 mt-0.5">{incomingMessageToast.content}</p>
            </div>

            <div className="flex items-center justify-between border-t border-slate-800/60 pt-2 mt-1">
              <span className="text-[10px] text-slate-400">রুম: #{incomingMessageToast.room}</span>
              <Link
                href={`/?room=${incomingMessageToast.room}`}
                onClick={() => setIncomingMessageToast(null)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1 rounded-lg text-xs transition"
              >
                মেসেজে যান
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 3. Task Reminder Alerts */}
      {activeAlerts.length > 0 && (
        <div className="fixed bottom-6 right-6 z-[999] flex flex-col gap-3.5 max-w-sm w-full px-4 sm:px-0">
          {activeAlerts.map((task) => {
            const isUrgent = task.priority === 'জরুরি';
            return (
              <div 
                key={task.id}
                className={`border rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom duration-300 flex flex-col gap-3 backdrop-blur-md relative overflow-hidden ${
                  isUrgent 
                    ? 'bg-rose-950/95 border-rose-500/30 shadow-rose-500/5' 
                    : 'bg-slate-900/95 border-violet-500/30 shadow-violet-500/5'
                }`}
              >
                <div className={`absolute top-0 left-0 right-0 h-1 ${isUrgent ? 'bg-rose-500' : 'bg-violet-500'}`}></div>

                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase">
                    <Bell className="w-4 h-4 text-violet-400 animate-bounce" />
                    <span className={isUrgent ? 'text-rose-400' : 'text-violet-400'}>
                      {isUrgent ? 'জরুরি নোটিফিকেশন!' : 'নোটিফিকেশন রিমাইন্ডার'}
                    </span>
                  </div>
                  <button 
                    onClick={() => handleDismissAlert(task.id)}
                    className="text-slate-400 hover:text-white p-0.5 rounded-md hover:bg-slate-800/50 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white leading-snug">{task.title}</h4>
                  {task.description && (
                    <p className="text-slate-300 text-xs line-clamp-2 leading-relaxed">{task.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 border-t border-slate-800/40 pt-2.5 mt-0.5">
                  <button
                    onClick={() => handleCompleteTask(task)}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 rounded-lg text-xs transition flex items-center justify-center gap-1"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>সম্পন্ন করুন</span>
                  </button>
                  <Link
                    href="/tasks"
                    onClick={() => handleDismissAlert(task.id)}
                    className="px-3 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold py-1.5 rounded-lg text-xs transition border border-slate-700/50 text-center"
                  >
                    দেখুন
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
