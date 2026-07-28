import { Client, Databases, Account, ID, Query } from 'appwrite';

// Appwrite Environment Credentials
const appwriteEndpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const appwriteProjectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const appwriteDatabaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'rg_database';

export const isAppwriteConfigured = !!(appwriteProjectId && appwriteProjectId !== 'your-project-id');

// Initialize Real Appwrite SDK Client
export const appwriteClient = new Client();
if (isAppwriteConfigured) {
  try {
    appwriteClient
      .setEndpoint(appwriteEndpoint)
      .setProject(appwriteProjectId);
  } catch (err) {
    console.error('Appwrite Client setup error:', err);
  }
}

export const databases = new Databases(appwriteClient);
export const account = new Account(appwriteClient);
export { ID, Query };

// --- Real-time Fallback Engine (LocalStorage + BroadcastChannel) ---
// Ensures the app functions 100% out-of-the-box in preview mode and transitions automatically when Appwrite credentials are added.
const channel = typeof window !== 'undefined' ? new BroadcastChannel('rg_appwrite_realtime') : null;

const getLocalData = (key, defaultVal = []) => {
  if (typeof window === 'undefined') return defaultVal;
  const stored = localStorage.getItem(key);
  if (!stored) {
    localStorage.setItem(key, JSON.stringify(defaultVal));
    return defaultVal;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return defaultVal;
  }
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
      { id: '1', room: 'general', sender: 'সাইদুল ইসলাম', content: 'আসসালামু আলাইকুম সবাইকে। আমাদের মেসেঞ্জার গ্রূপে স্বাগতম (Appwrite কনফিগারেশন সক্রিয়)!', created_at: new Date(Date.now() - 3600000 * 5).toISOString() },
      { id: '2', room: 'general', sender: 'আসিফ রহমান', content: 'ওয়া আলাইকুম আসসালাম। অ্যাপরাইট ব্যাকএন্ড কানেকশন টেস্ট করা হচ্ছে।', created_at: new Date(Date.now() - 3600000 * 4).toISOString() },
      { id: '3', room: 'general', sender: 'সাইদুল ইসলাম', content: 'রিয়েলটাইম মেসেজ আদান-প্রদান অ্যাপরাইট দিয়ে লাইভ কাজ করছে!', created_at: new Date(Date.now() - 3600000 * 3).toISOString() }
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
      { id: '1', title: 'কমিউনিটি আড্ডা ও অ্যাপরাইট সেটআপ', date: '2026-07-15T18:00', location: 'ধানমন্ডি লেক, ঢাকা', description: 'সবাই একসাথে আড্ডা দিবো ও অ্যাপরাইট ক্লাউড ফিচার দেখবো।' },
      { id: '2', title: 'টেকনিক্যাল ওয়েবিনার: অ্যাপরাইট ডাটাবেস ও নেক্সট-জেএস', date: '2026-07-20T21:00', location: 'অনলাইন (গুগল মিট)', description: 'কিভাবে অ্যাপরাইট রিয়েল-টাইম ডাটাবেস কানেক্ট করতে হয়।' }
    ]);
  }
  if (!localStorage.getItem('rg_discussion')) {
    setLocalData('rg_discussion', [
      { id: '1', title: 'অ্যাপরাইট ফ্রন্টএন্ড ইন্টিগ্রেশন অভিজ্ঞতা', author: 'জাহিদ হাসান', content: 'অ্যাপরাইটের অফিশিয়াল এসডিকে ব্যবহারের মাধ্যমে আমাদের অ্যাপ অনেক দ্রুত লোড হচ্ছে।', category: 'প্রোগ্রামিং', likes: 14, replies: 5, created_at: new Date(Date.now() - 3600000 * 24).toISOString() },
      { id: '2', title: 'ফ্রি অ্যাপরাইট ক্লাউড প্রোজেক্ট সেটআপ', author: 'ফয়সাল আহমেদ', content: 'appwrite.io-তে অ্যাকাউন্ট খুলে প্রজেক্ট ও কানেকশন যুক্ত করার গাইড।', category: 'টিউটোরিয়াল', likes: 10, replies: 3, created_at: new Date(Date.now() - 3600000 * 12).toISOString() }
    ]);
  }
  if (!localStorage.getItem('rg_support')) {
    setLocalData('rg_support', [
      { id: '1', title: 'পেমেন্ট ভেরিফিকেশন টিকিটিং', name: 'কামরুল ইসলাম', description: 'আমি ৫০০ টাকা পেমেন্ট করেছি কিন্তু স্ট্যাটাস এখনও আনপেইড দেখাচ্ছে। ট্রানজেকশন আইডি: TXN89221', category: 'বিলিং', status: 'Open', created_at: new Date(Date.now() - 3600000 * 2).toISOString() }
    ]);
  }
  if (!localStorage.getItem('rg_tasks')) {
    setLocalData('rg_tasks', [
      { 
        id: 'task-1', 
        title: 'অ্যাপরাইট ক্লাউড কানেকশন চেক', 
        description: 'rgomassenger এর নতুন অ্যাপরাইট ব্যাকএন্ড কানেকশন রিভিউ করতে হবে এবং সবাই মিলে টেস্ট করবো।', 
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

class QueryBuilder {
  constructor(collectionName) {
    this.collectionName = collectionName;
    this.storageKey = `rg_${collectionName}`;
    this.filters = [];
    this.appwriteQueries = [];
    this.sortCol = null;
    this.ascending = true;
    this.limitVal = null;
    this.isSingle = false;
  }

  select(columns) {
    return this;
  }

  eq(col, val) {
    this.filters.push(item => String(item[col]) === String(val));
    if (isAppwriteConfigured) {
      this.appwriteQueries.push(Query.equal(col, val));
    }
    return this;
  }

  or(filterStr) {
    if (filterStr) {
      const conditions = filterStr.split(',').map(s => s.trim());
      const parsed = conditions.map(cond => {
        const parts = cond.split('.');
        const field = parts[0];
        const operator = parts[1] || 'eq';
        const val = parts.slice(2).join('.');
        return { field, operator, val };
      });

      this.filters.push(item => {
        return parsed.some(({ field, operator, val }) => {
          const itemVal = item[field];
          if (operator === 'eq') return String(itemVal) === String(val);
          if (operator === 'neq') return String(itemVal) !== String(val);
          if (operator === 'gt') return itemVal > val;
          if (operator === 'gte') return itemVal >= val;
          if (operator === 'lt') return itemVal < val;
          if (operator === 'lte') return itemVal <= val;
          return true;
        });
      });
    }
    return this;
  }

  order(col, { ascending = true } = {}) {
    this.sortCol = col;
    this.ascending = ascending;
    if (isAppwriteConfigured) {
      this.appwriteQueries.push(ascending ? Query.orderAsc(col) : Query.orderDesc(col));
    }
    return this;
  }

  limit(n) {
    this.limitVal = n;
    if (isAppwriteConfigured) {
      this.appwriteQueries.push(Query.limit(n));
    }
    return this;
  }

  gte(col, val) {
    this.filters.push(item => item[col] >= val);
    if (isAppwriteConfigured) {
      this.appwriteQueries.push(Query.greaterThanEqual(col, val));
    }
    return this;
  }

  lte(col, val) {
    this.filters.push(item => item[col] <= val);
    if (isAppwriteConfigured) {
      this.appwriteQueries.push(Query.lessThanEqual(col, val));
    }
    return this;
  }

  in(col, vals) {
    const arr = Array.isArray(vals) ? vals : [vals];
    const set = new Set(arr);
    this.filters.push(item => set.has(item[col]));
    if (isAppwriteConfigured) {
      this.appwriteQueries.push(Query.equal(col, arr));
    }
    return this;
  }

  single() {
    this.isSingle = true;
    this.limitVal = 1;
    return this;
  }

  async execute() {
    let data = [];
    if (isAppwriteConfigured) {
      try {
        const res = await databases.listDocuments(appwriteDatabaseId, this.collectionName, this.appwriteQueries);
        data = res.documents.map(doc => ({ ...doc, id: doc.$id }));
      } catch (err) {
        console.warn(`Appwrite fetch error for ${this.collectionName}, falling back to local:`, err);
        data = getLocalData(this.storageKey);
      }
    } else {
      data = getLocalData(this.storageKey);
    }

    // Apply local filters
    for (const fn of this.filters) {
      data = data.filter(fn);
    }

    // Apply sorting
    if (this.sortCol) {
      const col = this.sortCol;
      const asc = this.ascending;
      data = [...data].sort((a, b) => {
        const valA = a[col] ?? '';
        const valB = b[col] ?? '';
        return asc ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
      });
    }

    // Apply limit
    if (this.limitVal !== null && this.limitVal !== undefined) {
      data = data.slice(0, this.limitVal);
    }

    if (this.isSingle) {
      return { data: data[0] || null, error: null };
    }

    return { data, error: null };
  }

  then(onfulfilled, onrejected) {
    return this.execute().then(onfulfilled, onrejected);
  }
}

// Unified Appwrite Client Interface for Database Query & Subscriptions
export const appwriteService = {
  from: (collectionName) => {
    const storageKey = `rg_${collectionName}`;

    return {
      select: (columns) => {
        const qb = new QueryBuilder(collectionName);
        return qb.select(columns);
      },
      insert: (rows) => {
        const newRows = Array.isArray(rows) ? rows : [rows];
        return {
          then: async (onfulfilled, onrejected) => {
            let insertedRows = [];

            if (isAppwriteConfigured) {
              try {
                for (const r of newRows) {
                  const res = await databases.createDocument(appwriteDatabaseId, collectionName, ID.unique(), r);
                  insertedRows.push({ ...res, id: res.$id });
                }
              } catch (err) {
                console.error('Appwrite insert error:', err);
              }
            }

            if (insertedRows.length === 0) {
              const data = getLocalData(storageKey);
              insertedRows = newRows.map(r => ({
                id: Math.random().toString(36).substr(2, 9),
                created_at: new Date().toISOString(),
                ...r
              }));
              const updated = [...data, ...insertedRows];
              setLocalData(storageKey, updated);
            }

            const payload = { table: collectionName, event: 'INSERT', new: insertedRows[0] };
            if (channel) channel.postMessage(payload);
            localListeners.forEach(listener => listener(payload));

            return Promise.resolve({ data: insertedRows, error: null }).then(onfulfilled, onrejected);
          }
        };
      },
      update: (updates) => {
        return {
          eq: (col, val) => {
            return {
              then: async (onfulfilled, onrejected) => {
                let updatedItem = null;

                if (isAppwriteConfigured) {
                  try {
                    const res = await databases.updateDocument(appwriteDatabaseId, collectionName, val, updates);
                    updatedItem = { ...res, id: res.$id };
                  } catch (e) {
                    console.warn('Appwrite update error:', e);
                  }
                }

                const data = getLocalData(storageKey);
                const updated = data.map(item => {
                  if (String(item[col]) === String(val)) {
                    updatedItem = updatedItem || { ...item, ...updates };
                    return { ...item, ...updates };
                  }
                  return item;
                });
                setLocalData(storageKey, updated);

                if (updatedItem) {
                  const payload = { table: collectionName, event: 'UPDATE', new: updatedItem };
                  if (channel) channel.postMessage(payload);
                  localListeners.forEach(listener => listener(payload));
                }
                return Promise.resolve({ data: updated, error: null }).then(onfulfilled, onrejected);
              }
            };
          }
        };
      },
      delete: () => {
        return {
          eq: (col, val) => {
            return {
              then: async (onfulfilled, onrejected) => {
                if (isAppwriteConfigured) {
                  try {
                    await databases.deleteDocument(appwriteDatabaseId, collectionName, val);
                  } catch (e) {
                    console.warn('Appwrite delete error:', e);
                  }
                }

                const data = getLocalData(storageKey);
                const updated = data.filter(item => String(item[col]) !== String(val));
                setLocalData(storageKey, updated);

                const payload = { table: collectionName, event: 'DELETE', old: { id: val }, old_id: val };
                if (channel) channel.postMessage(payload);
                localListeners.forEach(listener => listener(payload));

                return Promise.resolve({ data: updated, error: null }).then(onfulfilled, onrejected);
              }
            };
          }
        };
      }
    };
  },
  auth: {
    getUser: async () => ({ data: { user: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
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

        // Appwrite SDK Realtime Subscription
        let unsubscribeAppwrite = null;
        if (isAppwriteConfigured && filter.table) {
          try {
            unsubscribeAppwrite = appwriteClient.subscribe(
              `databases.${appwriteDatabaseId}.collections.${filter.table}.documents`,
              (response) => {
                const eventName = response.events.some(ev => ev.includes('create')) ? 'INSERT'
                  : response.events.some(ev => ev.includes('update')) ? 'UPDATE'
                  : 'DELETE';
                callback({
                  table: filter.table,
                  event: eventName,
                  new: { ...response.payload, id: response.payload.$id }
                });
              }
            );
          } catch (e) {
            console.warn('Appwrite subscription error:', e);
          }
        }

        return {
          subscribe: () => {
            return {
              unsubscribe: () => {
                localListeners.delete(handleMsg);
                if (channel) {
                  channel.removeEventListener('message', handleMsg);
                }
                if (typeof unsubscribeAppwrite === 'function') {
                  unsubscribeAppwrite();
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

// Exports
export const appwrite = appwriteService;
export const supabase = appwriteService; // Alias to support smooth transition
