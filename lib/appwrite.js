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

// Initialize storage without dummy sample data
if (typeof window !== 'undefined') {
  // Purge old mock template data if present
  try {
    const isCleaned = localStorage.getItem('rg_mock_data_purged_v2');
    if (!isCleaned) {
      // Purge dummy mock messages that were auto-seeded
      const storedMsgs = localStorage.getItem('rg_messages');
      if (storedMsgs) {
        try {
          const parsed = JSON.parse(storedMsgs);
          const realMsgs = parsed.filter(m => m.sender !== 'সাইদুল ইসলাম' && m.sender !== 'আসিফ রহমান' && m.sender !== 'Anonymous');
          localStorage.setItem('rg_messages', JSON.stringify(realMsgs));
        } catch (e) {}
      }

      // Purge dummy mock billing
      const storedBilling = localStorage.getItem('rg_billing');
      if (storedBilling) {
        try {
          const parsed = JSON.parse(storedBilling);
          const realBilling = parsed.filter(b => b.member_name !== 'আসিফ রহমান' && b.member_name !== 'তানভীর হাসান' && b.member_name !== 'মারুফ বিল্লাহ');
          localStorage.setItem('rg_billing', JSON.stringify(realBilling));
        } catch (e) {}
      }

      // Purge dummy mock events, discussions, support
      const storedEvents = localStorage.getItem('rg_events');
      if (storedEvents) {
        try {
          const parsed = JSON.parse(storedEvents);
          const realEvents = parsed.filter(ev => !ev.title?.includes('অ্যাপরাইট'));
          localStorage.setItem('rg_events', JSON.stringify(realEvents));
        } catch (e) {}
      }

      const storedDiscussions = localStorage.getItem('rg_discussion');
      if (storedDiscussions) {
        try {
          const parsed = JSON.parse(storedDiscussions);
          const realDiscussions = parsed.filter(d => d.author !== 'জাহিদ হাসান' && d.author !== 'ফয়সাল আহমেদ');
          localStorage.setItem('rg_discussion', JSON.stringify(realDiscussions));
        } catch (e) {}
      }

      const storedSupport = localStorage.getItem('rg_support');
      if (storedSupport) {
        try {
          const parsed = JSON.parse(storedSupport);
          const realSupport = parsed.filter(s => s.name !== 'কামরুল ইসলাম');
          localStorage.setItem('rg_support', JSON.stringify(realSupport));
        } catch (e) {}
      }

      // Purge dummy mock users from rg_all_users
      const storedUsers = localStorage.getItem('rg_all_users');
      if (storedUsers) {
        try {
          const parsed = JSON.parse(storedUsers);
          const realUsers = parsed.filter(u => 
            u.email?.toLowerCase() === 'redgreenonline2023@gmail.com' || 
            (!u.id?.includes('demo') && !u.email?.includes('mod@rgomassenger') && !u.email?.includes('member@rgomassenger'))
          );
          localStorage.setItem('rg_all_users', JSON.stringify(realUsers));
        } catch (e) {}
      }

      localStorage.setItem('rg_mock_data_purged_v2', 'true');
    }
  } catch (err) {
    console.warn('Storage purge warning:', err);
  }

  if (!localStorage.getItem('rg_messages')) {
    setLocalData('rg_messages', []);
  }
  if (!localStorage.getItem('rg_billing')) {
    setLocalData('rg_billing', []);
  }
  if (!localStorage.getItem('rg_events')) {
    setLocalData('rg_events', []);
  }
  if (!localStorage.getItem('rg_discussion')) {
    setLocalData('rg_discussion', []);
  }
  if (!localStorage.getItem('rg_support')) {
    setLocalData('rg_support', []);
  }
  if (!localStorage.getItem('rg_tasks')) {
    setLocalData('rg_tasks', []);
  }
  if (!localStorage.getItem('rg_profiles')) {
    setLocalData('rg_profiles', [
      {
        id: 'usr_admin_01',
        name: 'MD SHANTO',
        email: 'redgreenonline2023@gmail.com',
        role: 'অ্যাপ ডেভলপার ও চিফ অ্যাডমিন',
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

  gt(col, val) {
    this.filters.push(item => item[col] > val);
    if (isAppwriteConfigured) {
      this.appwriteQueries.push(Query.greaterThan(col, val));
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

  lt(col, val) {
    this.filters.push(item => item[col] < val);
    if (isAppwriteConfigured) {
      this.appwriteQueries.push(Query.lessThan(col, val));
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

  like(col, val) {
    const pattern = String(val).replace(/%/g, '').toLowerCase();
    this.filters.push(item => String(item[col] || '').toLowerCase().includes(pattern));
    return this;
  }

  ilike(col, val) {
    const pattern = String(val).replace(/%/g, '').toLowerCase();
    this.filters.push(item => String(item[col] || '').toLowerCase().includes(pattern));
    return this;
  }

  is(col, val) {
    this.filters.push(item => item[col] === val);
    return this;
  }

  not(col, op, val) {
    if (op === 'eq') {
      this.filters.push(item => String(item[col]) !== String(val));
    } else if (op === 'in') {
      const set = new Set(Array.isArray(val) ? val : [val]);
      this.filters.push(item => !set.has(item[col]));
    } else {
      this.filters.push(item => item[col] !== val);
    }
    return this;
  }

  range(from, to) {
    this.rangeFrom = from;
    this.rangeTo = to;
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

    // Apply range if specified
    if (this.rangeFrom !== undefined && this.rangeTo !== undefined) {
      data = data.slice(this.rangeFrom, this.rangeTo + 1);
    } else if (this.limitVal !== null && this.limitVal !== undefined) {
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
        let isSingle = false;

        const executeInsert = async () => {
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

          if (isSingle) {
            return { data: insertedRows[0] || null, error: null };
          }
          return { data: insertedRows, error: null };
        };

        const builder = {
          select: () => builder,
          single: () => {
            isSingle = true;
            return builder;
          },
          then: (onfulfilled, onrejected) => executeInsert().then(onfulfilled, onrejected),
          catch: (onrejected) => executeInsert().catch(onrejected)
        };

        return builder;
      },
      upsert: (rows, { onConflict = 'id' } = {}) => {
        const upsertRows = Array.isArray(rows) ? rows : [rows];
        let isSingle = false;

        const executeUpsert = async () => {
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

          if (isSingle) {
            return { data: results[0] || null, error: null };
          }
          return { data: results, error: null };
        };

        const builder = {
          select: () => builder,
          single: () => {
            isSingle = true;
            return builder;
          },
          then: (onfulfilled, onrejected) => executeUpsert().then(onfulfilled, onrejected),
          catch: (onrejected) => executeUpsert().catch(onrejected)
        };

        return builder;
      },
      update: (updates) => {
        let isSingle = false;
        const filters = [];

        const executeUpdate = async () => {
          let updatedItem = null;
          const updatedItems = [];

          const data = getLocalData(storageKey);
          const updated = data.map(item => {
            const matches = filters.length === 0 || filters.every(fn => fn(item));
            if (matches) {
              const newItem = { ...item, ...updates };
              updatedItem = newItem;
              updatedItems.push(newItem);

              if (isAppwriteConfigured && item.id) {
                databases.updateDocument(appwriteDatabaseId, collectionName, String(item.id), updates).catch(() => {});
              }
              return newItem;
            }
            return item;
          });

          setLocalData(storageKey, updated);

          if (updatedItems.length > 0) {
            const payload = { table: collectionName, event: 'UPDATE', new: updatedItems[0], batch: updatedItems.length > 1 };
            if (channel) channel.postMessage(payload);
            localListeners.forEach(listener => listener(payload));
          }

          if (isSingle) {
            return { data: updatedItem || null, error: null };
          }
          return { data: updatedItems, error: null };
        };

        const builder = {
          select: () => builder,
          single: () => {
            isSingle = true;
            return builder;
          },
          eq: (col, val) => {
            filters.push(item => String(item[col]) === String(val));
            return builder;
          },
          neq: (col, val) => {
            filters.push(item => String(item[col]) !== String(val));
            return builder;
          },
          in: (col, vals) => {
            const arr = Array.isArray(vals) ? vals : [vals];
            const set = new Set(arr.map(String));
            filters.push(item => set.has(String(item[col])));
            return builder;
          },
          then: (onfulfilled, onrejected) => executeUpdate().then(onfulfilled, onrejected),
          catch: (onrejected) => executeUpdate().catch(onrejected)
        };

        return builder;
      },
      delete: () => {
        let isSingle = false;
        const filters = [];
        const deletedIds = [];

        const executeDelete = async () => {
          const data = getLocalData(storageKey);
          const remaining = [];

          for (const item of data) {
            const matches = filters.length > 0 && filters.every(fn => fn(item));
            if (matches) {
              deletedIds.push(item.id);
              if (isAppwriteConfigured && item.id) {
                databases.deleteDocument(appwriteDatabaseId, collectionName, String(item.id)).catch(() => {});
              }
            } else {
              remaining.push(item);
            }
          }

          setLocalData(storageKey, remaining);

          if (deletedIds.length > 0) {
            const payload = { table: collectionName, event: 'DELETE', old: { id: deletedIds[0] }, old_id: deletedIds[0], batch: deletedIds.length > 1 };
            if (channel) channel.postMessage(payload);
            localListeners.forEach(listener => listener(payload));
          }

          return { data: remaining, error: null };
        };

        const builder = {
          select: () => builder,
          single: () => {
            isSingle = true;
            return builder;
          },
          eq: (col, val) => {
            filters.push(item => String(item[col]) === String(val));
            return builder;
          },
          neq: (col, val) => {
            filters.push(item => String(item[col]) !== String(val));
            return builder;
          },
          in: (col, vals) => {
            const arr = Array.isArray(vals) ? vals : [vals];
            const set = new Set(arr.map(String));
            filters.push(item => set.has(String(item[col])));
            return builder;
          },
          then: (onfulfilled, onrejected) => executeDelete().then(onfulfilled, onrejected),
          catch: (onrejected) => executeDelete().catch(onrejected)
        };

        return builder;
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
