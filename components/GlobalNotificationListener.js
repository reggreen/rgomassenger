import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Bell, Mail, X, CheckSquare, Clock, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function GlobalNotificationListener() {
  const [activeAlerts, setActiveAlerts] = useState([]);

  useEffect(() => {
    // Immediate check on mount, then every 10 seconds
    checkPendingTasks();
    const interval = setInterval(() => {
      checkPendingTasks();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const checkPendingTasks = async () => {
    try {
      const { data: tasks, error } = await supabase.from('tasks').select('*');
      if (error || !tasks) return;

      const now = new Date();
      const triggeredAlerts = [];

      for (const task of tasks) {
        const dueDate = new Date(task.due_date);
        if (task.status === 'Pending' && !task.alerted && dueDate <= now) {
          // 1. Mark task as alerted in the mock/real database
          await supabase.from('tasks').update({ alerted: true }).eq('id', task.id);

          // 2. Add to active alerts list to show on UI
          triggeredAlerts.push(task);

          // 3. Dispatch Email Notification if selected
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
            
            // Dispatch custom window event to trigger re-fetch in tasks page instantly
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new Event('rg_sent_emails_updated'));
            }
          }
        }
      }

      if (triggeredAlerts.length > 0) {
        // Append new alerts to list
        setActiveAlerts(prev => [...prev, ...triggeredAlerts]);
        
        // Play notification sound using browser Web Audio API (reliable, offline-safe, no external source error)
        try {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (AudioContext) {
            const ctx = new AudioContext();
            
            // First chime (G5)
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(783.99, ctx.currentTime); // G5
            gain1.gain.setValueAtTime(0.1, ctx.currentTime);
            gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start();
            osc1.stop(ctx.currentTime + 0.3);

            // Second chime (C6) slightly delayed
            setTimeout(() => {
              try {
                const osc2 = ctx.createOscillator();
                const gain2 = ctx.createGain();
                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(1046.50, ctx.currentTime); // C6
                gain2.gain.setValueAtTime(0.1, ctx.currentTime);
                gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
                osc2.connect(gain2);
                gain2.connect(ctx.destination);
                osc2.start();
                osc2.stop(ctx.currentTime + 0.4);
              } catch (e) {}
            }, 120);
          }
        } catch (e) {
          // Ignore audio play block policy
        }
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
      
      // Let the main page refresh if active
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('rg_tasks_updated'));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (activeAlerts.length === 0) return null;

  return (
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
            {/* Header / Accent Ribbon */}
            <div className={`absolute top-0 left-0 right-0 h-1 ${isUrgent ? 'bg-rose-500' : 'bg-violet-500'}`}></div>

            {/* Title & Close */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase">
                {isUrgent ? (
                  <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
                ) : (
                  <Bell className="w-4 h-4 text-violet-400 animate-bounce" />
                )}
                <span className={isUrgent ? 'text-rose-400' : 'text-violet-400'}>
                  {isUrgent ? 'জরুরি নোটিফিকেশন!' : 'নোটিফিকেশন রিমাইন্ডার'}
                </span>
              </div>
              <button 
                onClick={() => handleDismissAlert(task.id)}
                className="text-slate-400 hover:text-white p-0.5 rounded-md hover:bg-slate-800/50 transition"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Message Body */}
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white leading-snug">{task.title}</h4>
              {task.description && (
                <p className="text-slate-300 text-xs line-clamp-2 leading-relaxed">{task.description}</p>
              )}
            </div>

            {/* Email notice indicator */}
            {(task.channels === 'Email' || task.channels === 'Both') && (
              <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold bg-emerald-500/5 border border-emerald-500/10 px-2.5 py-1 rounded-lg self-start">
                <Mail className="w-3 h-3" />
                <span>ইমেইল নোটিফিকেশন পাঠানো হয়েছে</span>
              </div>
            )}

            {/* Buttons */}
            <div className="flex items-center gap-2 border-t border-slate-800/40 pt-2.5 mt-0.5">
              <button
                onClick={() => handleCompleteTask(task)}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 rounded-lg text-xs transition active:scale-95 flex items-center justify-center gap-1"
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
  );
}
