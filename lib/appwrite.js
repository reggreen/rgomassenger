import { Client, Databases, Account, Storage, ID, Query, Permission, Role } from 'appwrite';

// Appwrite Environment Credentials
const appwriteEndpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const appwriteProjectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const appwriteDatabaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'rg_database';
const appwriteBucketId = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID || 'rg_storage';

export const isAppwriteConfigured = !!(
  appwriteProjectId && 
  appwriteProjectId !== 'your-project-id' && 
  appwriteProjectId !== 'your_appwrite_project_id' &&
  appwriteProjectId.trim() !== ''
);

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
export const storage = new Storage(appwriteClient);
export { ID, Query, Permission, Role };

// --- Real-time Fallback & Sync Engine (LocalStorage + BroadcastChannel) ---
// Ensures 100% real-time functionality across tabs and instant transition when Appwrite Cloud credentials are provided.
const channel = typeof window !== 'undefined' ? new BroadcastChannel('rg_appwrite_realtime') : null;
const localListeners = new Set();
const presenceStateStore = {};

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
      { id: '1', room: 'general', sender: 'সাইদুল ইসলাম', content: 'আসসালামু আলাইকুম সবাইকে। আমাদের মেসেঞ্জার গ্রূপে স্বাগতম (Appwrite ব্যাকএন্ড কানেকশন সক্রিয়)!', created_at: new Date(Date.now() - 3600000 * 5).toISOString() },
      { id: '2', room: 'general', sender: 'আসিফ রহমান', content: 'ওয়া আলাইকুম আসসালাম। অ্যাপরাইট রিয়েল-টাইম মেসেজ ব্যাকএন্ড টেস্ট করা হচ্ছে।', created_at: new Date(Date.now() - 3600000 * 4).toISOString() },
      { id: '3', room: 'general', sender: 'সাইদুল ইসলাম', content: 'রিয়েলটাইম মেসেজ আদান-প্রদান অ্যাপরাইট ও ব্রডকাস্ট দিয়ে লাইভ কাজ করছে!', created_at: new Date(Date.now() - 3600000 * 3).toISOString() }
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
  if (!localStorage.getItem('rg_profiles')) {
    setLocalData('rg_profiles', [
      {
        id: 'usr_admin_01',
        name: 'MD SHANTO',
        email: 'redgreenonline2023@gmail.com',
        role: 'অ্যাডমিন / কমিউনিটি প্রধান',
        avatar_emoji: '🧑‍💻',
        created_at: new Date().toISOString()
      }
    ]);
  }
}

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

  neq(col, val) {
    this.filters.push(item => String(item[col]) !== String(val));
    if (isAppwriteConfigured) {
      this.appwriteQueries.push(Query.notEqual(col, val));
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
        console.warn(`Appwrite fetch notice for ${this.collectionName}, using local sync:`, err);
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

  catch(onrejected) {
    return this.execute().catch(onrejected);
  }
}

class RealtimeChannel {
  constructor(channelName, opts = {}) {
    this.name = channelName;
    this.opts = opts;
    this.listeners = [];
    this.appwriteUnsubscribes = [];
    this.isSubscribed = false;
  }

  presenceState() {
    return presenceStateStore;
  }

  async track(presenceObj) {
    if (presenceObj?.username) {
      presenceStateStore[presenceObj.username] = [presenceObj];
      const payload = { event: 'PRESENCE_SYNC', presence: presenceStateStore };
      if (channel) channel.postMessage(payload);
      localListeners.forEach(listener => listener(payload));
    }
    return 'ok';
  }

  async untrack() {
    return 'ok';
  }

  on(eventType, filter, callback) {
    const cb = typeof filter === 'function' ? filter : callback;
    const filterTable = filter?.table || (typeof filter === 'string' ? filter : null);

    const handleMsg = (e) => {
      if (!e) return;
      if (eventType === 'presence' || eventType === 'PRESENCE_SYNC') {
        if (e.event === 'PRESENCE_SYNC' || e.event === 'sync' || e.event === 'join' || e.event === 'leave') {
          cb(e);
        }
        return;
      }
      if (filterTable) {
        if (e.table === filterTable || e.table === `public.${filterTable}` || e.event === 'TYPING') {
          cb(e);
        }
      } else {
        cb(e);
      }
    };

    this.listeners.push(handleMsg);
    localListeners.add(handleMsg);

    if (channel) {
      channel.addEventListener('message', (event) => handleMsg(event.data));
    }

    // Appwrite SDK Realtime Subscription if configured
    if (isAppwriteConfigured && filterTable) {
      try {
        const unsub = appwriteClient.subscribe(
          `databases.${appwriteDatabaseId}.collections.${filterTable}.documents`,
          (response) => {
            const eventName = response.events.some(ev => ev.includes('create')) ? 'INSERT'
              : response.events.some(ev => ev.includes('update')) ? 'UPDATE'
              : 'DELETE';
            cb({
              table: filterTable,
              eventType: eventName,
              event: eventName,
              new: { ...response.payload, id: response.payload.$id },
              old: { id: response.payload.$id }
            });
          }
        );
        if (unsub) this.appwriteUnsubscribes.push(unsub);
      } catch (e) {
        console.warn('Appwrite subscription notice:', e);
      }
    }

    return this; // Enable fluent method chaining: presenceChan.on(...).on(...).subscribe(...)
  }

  subscribe(subCallback) {
    this.isSubscribed = true;
    if (typeof subCallback === 'function') {
      setTimeout(() => subCallback('SUBSCRIBED'), 10);
    }
    return this;
  }

  unsubscribe() {
    this.isSubscribed = false;
    this.listeners.forEach(fn => {
      localListeners.delete(fn);
    });
    this.appwriteUnsubscribes.forEach(unsub => {
      if (typeof unsub === 'function') {
        try { unsub(); } catch (e) {}
      }
    });
    this.listeners = [];
    this.appwriteUnsubscribes = [];
    return this;
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
                  const docId = r.id && typeof r.id === 'string' && !r.id.startsWith('temp_') ? r.id : ID.unique();
                  const dataToInsert = { ...r };
                  delete dataToInsert.id;
                  const res = await databases.createDocument(appwriteDatabaseId, collectionName, docId, dataToInsert);
                  insertedRows.push({ ...res, id: res.$id });
                }
              } catch (err) {
                console.warn('Appwrite insert notice, utilizing local sync:', err);
              }
            }

            if (insertedRows.length === 0) {
              const data = getLocalData(storageKey);
              insertedRows = newRows.map(r => ({
                id: r.id || Math.random().toString(36).substr(2, 9),
                created_at: r.created_at || new Date().toISOString(),
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
      upsert: (rows, { onConflict = 'id' } = {}) => {
        const upsertRows = Array.isArray(rows) ? rows : [rows];
        return {
          then: async (onfulfilled, onrejected) => {
            const data = getLocalData(storageKey);
            let updatedList = [...data];
            const results = [];

            for (const r of upsertRows) {
              const conflictKey = onConflict || 'id';
              const matchVal = r[conflictKey];
              const idx = updatedList.findIndex(item => String(item[conflictKey]) === String(matchVal));

              if (idx >= 0) {
                updatedList[idx] = { ...updatedList[idx], ...r };
                results.push(updatedList[idx]);
              } else {
                const newObj = {
                  id: r.id || Math.random().toString(36).substr(2, 9),
                  created_at: new Date().toISOString(),
                  ...r
                };
                updatedList.push(newObj);
                results.push(newObj);
              }

              if (isAppwriteConfigured) {
                try {
                  const docId = r.id || (idx >= 0 ? updatedList[idx].id : ID.unique());
                  await databases.createDocument(appwriteDatabaseId, collectionName, docId, r);
                } catch (e) {
                  try {
                    await databases.updateDocument(appwriteDatabaseId, collectionName, r.id, r);
                  } catch (err) {}
                }
              }
            }

            setLocalData(storageKey, updatedList);
            const payload = { table: collectionName, event: 'UPDATE', new: results[0] };
            if (channel) channel.postMessage(payload);
            localListeners.forEach(listener => listener(payload));

            return Promise.resolve({ data: results, error: null }).then(onfulfilled, onrejected);
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
                    const res = await databases.updateDocument(appwriteDatabaseId, collectionName, String(val), updates);
                    updatedItem = { ...res, id: res.$id };
                  } catch (e) {
                    console.warn('Appwrite update notice:', e);
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
          },
          in: (col, vals) => {
            const arr = Array.isArray(vals) ? vals : [vals];
            const set = new Set(arr.map(String));
            return {
              then: async (onfulfilled, onrejected) => {
                const data = getLocalData(storageKey);
                const updated = data.map(item => {
                  if (set.has(String(item[col]))) {
                    if (isAppwriteConfigured && item.id) {
                      databases.updateDocument(appwriteDatabaseId, collectionName, item.id, updates).catch(() => {});
                    }
                    return { ...item, ...updates };
                  }
                  return item;
                });
                setLocalData(storageKey, updated);

                const payload = { table: collectionName, event: 'UPDATE', batch: true };
                if (channel) channel.postMessage(payload);
                localListeners.forEach(listener => listener(payload));

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
                    await databases.deleteDocument(appwriteDatabaseId, collectionName, String(val));
                  } catch (e) {
                    console.warn('Appwrite delete notice:', e);
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
          },
          in: (col, vals) => {
            const arr = Array.isArray(vals) ? vals : [vals];
            const set = new Set(arr.map(String));
            return {
              then: async (onfulfilled, onrejected) => {
                if (isAppwriteConfigured) {
                  arr.forEach(id => databases.deleteDocument(appwriteDatabaseId, collectionName, String(id)).catch(() => {}));
                }
                const data = getLocalData(storageKey);
                const updated = data.filter(item => !set.has(String(item[col])));
                setLocalData(storageKey, updated);

                const payload = { table: collectionName, event: 'DELETE', batch: true };
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
    getUser: async () => {
      if (isAppwriteConfigured) {
        try {
          const appwriteUser = await account.get();
          if (appwriteUser) {
            return { data: { user: { id: appwriteUser.$id, email: appwriteUser.email, name: appwriteUser.name } }, error: null };
          }
        } catch (e) {}
      }
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('rg_current_user');
        if (stored) {
          try {
            return { data: { user: JSON.parse(stored) }, error: null };
          } catch (e) {}
        }
      }
      return { data: { user: null }, error: null };
    },
    getSession: async () => {
      return { data: { session: null }, error: null };
    },
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signOut: async () => {
      if (isAppwriteConfigured) {
        try { await account.deleteSession('current'); } catch (e) {}
      }
      if (typeof window !== 'undefined') {
        localStorage.removeItem('rg_current_user');
      }
      return { error: null };
    }
  },
  channel: (channelName, opts = {}) => {
    return new RealtimeChannel(channelName, opts);
  },
  removeChannel: (chan) => {
    if (chan && typeof chan.unsubscribe === 'function') {
      chan.unsubscribe();
    }
  },
  removeAllChannels: () => {},
  storage: {
    from: (bucket = appwriteBucketId) => ({
      upload: async (fileName, fileOrBlob) => {
        return uploadVoiceRecording(fileOrBlob, fileName, bucket);
      },
      getPublicUrl: (fileId, bucketName = bucket) => {
        return getVoiceRecordingUrl(fileId, bucketName);
      }
    })
  }
};

/**
 * Upload voice audio blob or file to Appwrite Storage bucket with resilient fallback
 * @param {Blob|File} blob - Audio Blob or File object
 * @param {string} fileName - File name (e.g. voice_12345.webm)
 * @param {string} bucketId - Storage bucket ID (default: rg_storage)
 * @returns {Promise<{url: string, fileId: string, error: any}>}
 */
export const uploadVoiceRecording = async (blob, fileName = `voice_${Date.now()}.webm`, bucketId = appwriteBucketId) => {
  if (!blob) return { url: null, fileId: null, error: 'No audio blob provided' };

  const fileId = 'aud_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

  // If Appwrite is configured and active, attempt upload to Appwrite Storage
  if (isAppwriteConfigured) {
    try {
      const mimeType = blob.type || 'audio/webm';
      const file = new File([blob], fileName, { type: mimeType });
      const uploaded = await storage.createFile(bucketId, fileId, file, [
        Permission.read(Role.any()),
        Permission.write(Role.any())
      ]);
      
      if (uploaded && uploaded.$id) {
        // Generate Appwrite direct file view URL
        const viewUrl = storage.getFileView(bucketId, uploaded.$id).toString();
        return { url: viewUrl, fileId: uploaded.$id, error: null };
      }
    } catch (err) {
      console.warn('Appwrite Storage upload notice, falling back to instant local audio data URL:', err);
    }
  }

  // Resilient fallback: Convert Blob to high-fidelity Data URL for instant, seamless playback across clients
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve({ url: reader.result, fileId, error: null });
    };
    reader.onerror = (err) => {
      console.error('Blob to data URL conversion error:', err);
      // Fallback to object URL if reader fails
      const objectUrl = typeof window !== 'undefined' ? URL.createObjectURL(blob) : '';
      resolve({ url: objectUrl, fileId, error: err });
    };
    reader.readAsDataURL(blob);
  });
};

/**
 * Get Appwrite file view / download URL
 */
export const getVoiceRecordingUrl = (fileId, bucketId = appwriteBucketId) => {
  if (isAppwriteConfigured && fileId) {
    try {
      return storage.getFileView(bucketId, fileId).toString();
    } catch (e) {}
  }
  return null;
};

export const sendTypingStatus = (room, sender, isTyping, extra = {}) => {
  const payload = {
    table: 'messages',
    eventType: 'TYPING',
    event: 'TYPING',
    room,
    sender,
    isTyping: !!isTyping,
    timestamp: Date.now(),
    ...extra
  };
  if (channel) channel.postMessage(payload);
  localListeners.forEach(listener => listener(payload));
};

export const sendOnlinePresence = (username, presenceData = {}) => {
  if (!username) return;
  const now = Date.now();
  const presenceObj = {
    username,
    status: presenceData.status || 'online',
    statusText: presenceData.statusText || 'অনলাইনে আছেন',
    avatar_emoji: presenceData.avatar_emoji || presenceData.avatarEmoji || '🧑‍💻',
    custom_avatar_url: presenceData.custom_avatar_url || presenceData.customAvatarUrl || null,
    room: presenceData.room || 'general',
    lastSeen: now,
    updatedAt: new Date().toISOString(),
    ...presenceData
  };

  presenceStateStore[username] = [presenceObj];

  const payload = {
    event: 'PRESENCE_SYNC',
    eventType: 'PRESENCE_SYNC',
    presence: presenceStateStore,
    user: username,
    data: presenceObj
  };

  if (channel) channel.postMessage(payload);
  localListeners.forEach(listener => listener(payload));
};

export const subscribeToPresence = (callback) => {
  if (typeof callback !== 'function') return () => {};
  const handler = (e) => {
    if (e?.event === 'PRESENCE_SYNC' || e?.eventType === 'PRESENCE_SYNC') {
      callback(e.presence || presenceStateStore);
    }
  };
  localListeners.add(handler);
  if (channel) channel.addEventListener('message', (ev) => handler(ev.data));
  return () => {
    localListeners.delete(handler);
    if (channel) channel.removeEventListener('message', handler);
  };
};

export const subscribeToTyping = (callback) => {
  if (typeof callback !== 'function') return () => {};
  const handler = (e) => {
    if (e?.event === 'TYPING' || e?.eventType === 'TYPING') {
      callback(e);
    }
  };
  localListeners.add(handler);
  if (channel) channel.addEventListener('message', (ev) => handler(ev.data));
  return () => {
    localListeners.delete(handler);
    if (channel) channel.removeEventListener('message', handler);
  };
};

export const getOnlineUsersSnapshot = () => ({ ...presenceStateStore });

// Exports
export const appwrite = appwriteService;
export const supabase = appwriteService; // Alias for seamless compatibility across existing components
export default appwriteService;
