// =========================================================================
// BACKUP FILE: SUPABASE CONFIGURATION & MOCK IMPLEMENTATION
// (স্বয়ংক্রিয় ব্যাকআপ: এই ফাইলটি বর্তমানে নিষ্ক্রিয় এবং অ্যাপে ব্যবহৃত হচ্ছে না।
//  ভবিষ্যতে প্রয়োজন হলে এখান থেকে কোড পুনরুদ্ধার করা যাবে।)
// =========================================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
                        process.env.SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'your-supabase-project-url');

// Real Supabase Client
let realSupabase = null;
if (isSupabaseConfigured) {
  try {
    realSupabase = createClient(supabaseUrl, supabaseAnonKey);
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
  }
}

// --- Mock Supabase Client using LocalStorage + BroadcastChannel ---
const channel = typeof window !== 'undefined' ? new BroadcastChannel('rgomassenger_realtime') : null;

const getLocalData = (key, defaultVal = []) => {
  if (typeof window === 'undefined') return defaultVal;
  const stored = localStorage.getItem(key);
  if (!stored) {
    localStorage.setItem(key, JSON.stringify(defaultVal));
    return defaultVal;
  }
  return JSON.parse(stored);
};

const setLocalData = (key, data) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(data));
  }
};

// Seed initial data if empty
if (typeof window !== 'undefined') {
  if (!localStorage.getItem('rg_messages')) {
    setLocalData('rg_messages', [
      { id: '1', room: 'general', sender: 'সাইদুল ইসলাম', content: 'আসসালামু আলাইকুম সবাইকে। আমাদের কমিনিটি গ্রুপে স্বাগতম!', created_at: new Date(Date.now() - 3600000 * 5).toISOString() },
      { id: '2', room: 'general', sender: 'আসিফ রহমান', content: 'ওয়া আলাইকুম আসসালাম। ভাইয়া, আমাদের নতুন প্রোজেক্টের আপডেট কি?', created_at: new Date(Date.now() - 3600000 * 4).toISOString() },
      { id: '3', room: 'general', sender: 'সাইদুল ইসলাম', content: 'আজকে রাত ১২টায় আমাদের একটি লাইভ সেশন আছে। সেখানে সব বলবো।', created_at: new Date(Date.now() - 3600000 * 3).toISOString() }
    ]);
  }
  if (!localStorage.getItem('rg_billing')) {
    setLocalData('rg_billing', [
      { id: '1', member_name: 'আসিফ রহমান', amount: 500, month: 'জুন ২০২৬', status: 'Paid', payment_date: '2026-06-10', tx_id: 'TXN891238' },
      { id: '2', member_name: 'তানভীর হাসান', amount: 500, month: 'জুন ২০২৬', status: 'Unpaid', payment_date: null, tx_id: null },
      { id: '3', member_name: 'মারুফ বিল্লাহ', amount: 500, month: 'জুন ২০২৬', status: 'Paid', payment_date: '2026-06-12', tx_id: 'TXN891245' }
    ]);
  }
  if (!localStorage.getItem('rg_events')) {
    setLocalData('rg_events', [
      { id: '1', title: 'কমিনিটি আড্ডা ও গেট-টুগেদার', date: '2026-07-15T18:00', location: 'ধানমন্ডি লেক, ঢাকা', description: 'সবাই একসাথে আড্ডা দিবো ও ফিউচার প্ল্যান নিয়ে কথা বলবো।' },
      { id: '2', title: 'টেকনিক্যাল ওয়েবিনার: নেক্সট-জেএস এবং সুপাবেস', date: '2026-07-20T21:00', location: 'অনলাইন (গুগল মিট)', description: 'কিভাবে রিয়েল-টাইম ডাটাবেস ও ফ্রন্টএন্ড কানেক্ট করতে হয় তা শিখবো।' }
    ]);
  }
  if (!localStorage.getItem('rg_discussion')) {
    setLocalData('rg_discussion', [
      { id: '1', title: 'আমাদের কমিউনিটির লোগো কেমন হওয়া উচিত?', author: 'জাহিদ হাসান', content: 'বন্ধুরা, আমাদের rgomassenger এর জন্য একটি সুন্দর লোগো দরকার। কারো কোনো আইডিয়া আছে?', category: 'ডিজাইন', likes: 12, replies: 4, created_at: new Date(Date.now() - 3600000 * 24).toISOString() },
      { id: '2', title: 'নেক্সট-জেএস ১৫ এর নতুন ফিচারগুলো নিয়ে মতামত', author: 'ফয়সাল আহমেদ', content: 'সার্ভার অ্যাকশন এবং আংশিক প্রি-রেন্ডারিং নিয়ে কার কার অভিজ্ঞতা কেমন?', category: 'প্রোগ্রামিং', likes: 8, replies: 2, created_at: new Date(Date.now() - 3600000 * 12).toISOString() }
    ]);
  }
  if (!localStorage.getItem('rg_support')) {
    setLocalData('rg_support', [
      { id: '1', title: 'পেমেন্ট ভেরিফিকেশন সমস্যা', name: 'কামরুল ইসলাম', description: 'আমি ৫০০ টাকা পেমেন্ট করেছি কিন্তু স্ট্যাটাস এখনও আনপেইড দেখাচ্ছে। ট্রানজেকশন আইডি: TXN89221', category: 'বিলিং', status: 'Open', created_at: new Date(Date.now() - 3600000 * 2).toISOString() }
    ]);
  }
  if (!localStorage.getItem('rg_tasks')) {
    setLocalData('rg_tasks', [
      { 
        id: 'task-1', 
        title: 'গ্রুপ মিটিং ও ফিচার আলোচনা', 
        description: 'rgomassenger এর নতুন টাস্ক ও নোটিফিকেশন মডিউল রিভিউ করতে হবে এবং সবাই মিলে আপডেট চেক করবো।', 
        category: 'মিটিং/আলোচনা', 
        due_date: new Date(Date.now() + 3600000 * 3).toISOString(),
        email: 'redgreenonline2023@gmail.com',
        channels: 'Both',
        priority: 'জরুরি',
        status: 'Pending',
        alerted: false,
        created_at: new Date(Date.now() - 3600000 * 4).toISOString() 
      },
      { 
        id: 'task-2', 
        title: 'বিলিং ডেডলাইন রিমাইন্ডার', 
        description: 'জুন মাসের ফান্ড পেমেন্ট করার শেষ দিন। যারা এখনও সাবস্ক্রিপশন ফি জমা দেয়নি তাদের তালিকা চূড়ান্ত করতে হবে।', 
        category: 'বিলিং ডেডলাইন', 
        due_date: new Date(Date.now() + 3600000 * 24).toISOString(),
        email: 'redgreenonline2023@gmail.com',
        channels: 'In-app',
        priority: 'মাঝারি',
        status: 'Pending',
        alerted: false,
        created_at: new Date(Date.now() - 3600000 * 8).toISOString() 
      }
    ]);
  }
}

const localListeners = new Set();

const mockSupabase = {
  from: (table) => {
    const storageKey = `rg_${table}`;

    return {
      select: () => {
        const chain = {
          then: (onfulfilled) => {
            const data = getLocalData(storageKey);
            return Promise.resolve({ data, error: null }).then(onfulfilled);
          },
          order: (col, { ascending = true } = {}) => {
            const data = getLocalData(storageKey);
            const sorted = [...data].sort((a, b) => {
              const valA = a[col] || '';
              const valB = b[col] || '';
              return ascending ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
            });
            return Promise.resolve({ data: sorted, error: null });
          },
          eq: (col, val) => {
            const data = getLocalData(storageKey);
            const filtered = data.filter(item => item[col] === val);
            return Promise.resolve({ data: filtered, error: null });
          }
        };
        return chain;
      },
      insert: (rows) => {
        const data = getLocalData(storageKey);
        const newRows = Array.isArray(rows) ? rows : [rows];
        const rowsWithId = newRows.map(r => ({
          id: Math.random().toString(36).substr(2, 9),
          created_at: new Date().toISOString(),
          ...r
        }));
        const updated = [...data, ...rowsWithId];
        setLocalData(storageKey, updated);

        const payload = { table, event: 'INSERT', new: rowsWithId[0] };
        if (channel) channel.postMessage(payload);
        localListeners.forEach(listener => listener(payload));

        return Promise.resolve({ data: rowsWithId, error: null });
      },
      update: (updates) => {
        return {
          eq: (col, val) => {
            const data = getLocalData(storageKey);
            let updatedItem = null;
            const updated = data.map(item => {
              if (item[col] === val) {
                updatedItem = { ...item, ...updates };
                return updatedItem;
              }
              return item;
            });
            setLocalData(storageKey, updated);

            if (updatedItem) {
              const payload = { table, event: 'UPDATE', new: updatedItem };
              if (channel) channel.postMessage(payload);
              localListeners.forEach(listener => listener(payload));
            }
            return Promise.resolve({ data: updated, error: null });
          }
        };
      },
      delete: () => {
        return {
          eq: (col, val) => {
            const data = getLocalData(storageKey);
            const itemToDelete = data.find(item => item[col] === val);
            const updated = data.filter(item => item[col] !== val);
            setLocalData(storageKey, updated);

            if (itemToDelete) {
              const payload = { table, event: 'DELETE', old: { id: val }, old_id: val };
              if (channel) channel.postMessage(payload);
              localListeners.forEach(listener => listener(payload));
            }
            return Promise.resolve({ data: updated, error: null });
          }
        };
      }
    };
  },
  channel: (channelName) => {
    return {
      on: (eventType, filter, callback) => {
        const handleMsg = (e) => {
          if (filter.table && e.table === filter.table) {
            callback(e);
          }
        };
        
        if (channel) {
          channel.addEventListener('message', (event) => handleMsg(event.data));
        }
        localListeners.add(handleMsg);

        return {
          subscribe: () => {
            return {
              unsubscribe: () => {
                localListeners.delete(handleMsg);
                if (channel) {
                  channel.removeEventListener('message', handleMsg);
                }
              }
            };
          }
        };
      }
    };
  }
};

export const sendTypingStatus = (room, sender, isTyping) => {
  const payload = { table: 'messages', event: 'TYPING', room, sender, isTyping };
  if (channel) channel.postMessage(payload);
  localListeners.forEach(listener => listener(payload));
};

export const supabase = realSupabase || mockSupabase;
