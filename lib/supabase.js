// =========================================================================
// UNIVERSAL SUPABASE ADAPTER (REAL SUPABASE + MOCK FALLBACK)
// =========================================================================

import { createClient } from '@supabase/supabase-js';

// 1. Detect Supabase Environment Variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
                        process.env.SUPABASE_ANON_KEY || 
                        process.env.SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = !!(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'your_supabase_project_url' &&
  supabaseUrl !== 'your-supabase-project-url' &&
  supabaseUrl.startsWith('http')
);

// Cross-tab typing status & event broadcast
const typingChannel = typeof window !== 'undefined' ? new BroadcastChannel('rg_typing_channel') : null;
const localTypingListeners = new Set();

// 2. Initialize Real Supabase Client if credentials exist
let realSupabaseClient = null;
if (isSupabaseConfigured) {
  try {
    realSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
  }
}

// Enhance realSupabaseClient channel if present
if (realSupabaseClient) {
  const originalChannel = realSupabaseClient.channel.bind(realSupabaseClient);
  realSupabaseClient.channel = (channelName, opts) => {
    const supChannel = originalChannel(channelName, opts);
    const origOn = supChannel.on.bind(supChannel);

    supChannel.on = (eventType, filter, callback) => {
      try {
        origOn(eventType, filter, callback);
      } catch (e) {
        console.warn('Supabase channel .on warning:', e);
      }

      // Attach typing status listener if callback provided
      const cb = typeof filter === 'function' ? filter : callback;
      if (cb) {
        const handleTypingMessage = (e) => {
          if (e && e.event === 'TYPING') {
            cb(e);
          }
        };
        if (typingChannel) {
          typingChannel.addEventListener('message', (event) => handleTypingMessage(event.data));
        }
        localTypingListeners.add(handleTypingMessage);
      }

      return supChannel;
    };

    return supChannel;
  };
}

// LocalStorage helpers for Mock mode
const getLocalData = (key, defaultVal = []) => {
  if (typeof window === 'undefined') return defaultVal;
  const stored = localStorage.getItem(key);
  if (!stored) {
    localStorage.setItem(key, JSON.stringify(defaultVal));
    return defaultVal;
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    return defaultVal;
  }
};

const setLocalData = (key, data) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(data));
  }
};

// Seed initial mock data if localStorage is empty
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
  if (!localStorage.getItem('rg_email_logs')) {
    setLocalData('rg_email_logs', []);
  }
}

// Mock Chain Generator for LocalStorage queries
const createMockChain = (table) => {
  const storageKey = `rg_${table}`;
  
  let filterFn = () => true;
  let sortFn = null;
  let isSingle = false;
  let limitNum = null;

  const getFilteredData = () => {
    let data = getLocalData(storageKey);
    if (filterFn) data = data.filter(filterFn);
    if (sortFn) data.sort(sortFn);
    if (limitNum !== null) data = data.slice(0, limitNum);
    return isSingle ? (data[0] || null) : data;
  };

  const chain = {
    select: () => chain,
    eq: (col, val) => {
      const prevFilter = filterFn;
      filterFn = (item) => prevFilter(item) && item[col] === val;
      return chain;
    },
    order: (col, { ascending = true } = {}) => {
      sortFn = (a, b) => {
        const valA = a[col] || '';
        const valB = b[col] || '';
        return ascending ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
      };
      return chain;
    },
    limit: (num) => {
      limitNum = num;
      return chain;
    },
    single: () => {
      isSingle = true;
      return chain;
    },
    then: (onfulfilled, onrejected) => {
      const data = getFilteredData();
      return Promise.resolve({ data, error: null }).then(onfulfilled, onrejected);
    },
    catch: (onrejected) => {
      const data = getFilteredData();
      return Promise.resolve({ data, error: null }).catch(onrejected);
    },
    insert: (rows) => {
      const data = getLocalData(storageKey);
      const newRows = Array.isArray(rows) ? rows : [rows];
      const rowsWithId = newRows.map(r => ({
        id: r.id || Math.random().toString(36).substr(2, 9),
        created_at: new Date().toISOString(),
        ...r
      }));
      const updated = [...data, ...rowsWithId];
      setLocalData(storageKey, updated);

      const payload = { table, event: 'INSERT', new: rowsWithId[0] };
      if (typingChannel) typingChannel.postMessage(payload);
      localTypingListeners.forEach(listener => listener(payload));

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
            if (typingChannel) typingChannel.postMessage(payload);
            localTypingListeners.forEach(listener => listener(payload));
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
            if (typingChannel) typingChannel.postMessage(payload);
            localTypingListeners.forEach(listener => listener(payload));
          }
          return Promise.resolve({ data: updated, error: null });
        }
      };
    }
  };

  return chain;
};

// Mock Supabase fallback object
const mockSupabase = {
  from: (table) => createMockChain(table),
  channel: (channelName) => {
    const mockChan = {
      presenceState: () => ({}),
      track: () => Promise.resolve('ok'),
      untrack: () => Promise.resolve('ok'),
      on: (eventType, filter, callback) => {
        const cb = typeof filter === 'function' ? filter : callback;
        if (cb) {
          const handleMsg = (e) => {
            if (!filter || typeof filter === 'function' || !filter.table || e.table === filter.table || e.event === 'TYPING') {
              cb(e);
            }
          };

          if (typingChannel) {
            typingChannel.addEventListener('message', (event) => handleMsg(event.data));
          }
          localTypingListeners.add(handleMsg);
        }
        return mockChan;
      },
      subscribe: (callback) => {
        if (typeof callback === 'function') {
          setTimeout(() => callback('SUBSCRIBED'), 10);
        }
        return mockChan;
      },
      unsubscribe: () => {
        return mockChan;
      }
    };
    return mockChan;
  },
  auth: {
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signOut: () => Promise.resolve({ error: null })
  },
  rpc: () => Promise.resolve({ data: null, error: null })
};

// Export active client or fallback mock
export const supabase = realSupabaseClient || mockSupabase;

// Typing status sender function
export const sendTypingStatus = (room, sender, isTyping) => {
  const payload = { table: 'messages', event: 'TYPING', room, sender, isTyping };
  if (typingChannel) typingChannel.postMessage(payload);
  localTypingListeners.forEach(listener => listener(payload));
};

export default supabase;
