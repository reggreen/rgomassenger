// Service Worker for rgomassenger: Background Task Alarm Engine & Push Notifications

const DB_NAME = 'rg_task_alarms_db';
const DB_VERSION = 1;
const STORE_NAME = 'scheduled_alarms';

// IndexedDB Helper Functions inside Service Worker
function openAlarmDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('dateTime', 'dateTime', { unique: false });
        store.createIndex('isTriggered', 'isTriggered', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getAllPendingAlarmsFromDB() {
  try {
    const db = await openAlarmDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        const alarms = request.result || [];
        resolve(alarms.filter((a) => !a.isTriggered));
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('[SW] Error reading IndexedDB alarms:', err);
    return [];
  }
}

async function saveAlarmToDB(alarm) {
  try {
    const db = await openAlarmDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(alarm);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('[SW] Error saving alarm to IndexedDB:', err);
    return false;
  }
}

async function bulkSaveAlarmsToDB(alarms) {
  try {
    const db = await openAlarmDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      // Clear existing to avoid stale entries
      store.clear();
      alarms.forEach((alarm) => {
        store.put(alarm);
      });
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (err) {
    console.warn('[SW] Error bulk saving alarms to IndexedDB:', err);
    return false;
  }
}

async function markAlarmAsTriggeredInDB(alarmId) {
  try {
    const db = await openAlarmDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getReq = store.get(alarmId);
      getReq.onsuccess = () => {
        const item = getReq.result;
        if (item) {
          item.isTriggered = true;
          item.triggeredAt = new Date().toISOString();
          store.put(item);
        }
        resolve(true);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  } catch (err) {
    console.warn('[SW] Error marking alarm triggered:', err);
    return false;
  }
}

async function removeAlarmFromDB(alarmId) {
  try {
    const db = await openAlarmDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const delReq = store.delete(alarmId);
      delReq.onsuccess = () => resolve(true);
      delReq.onerror = () => reject(delReq.error);
    });
  } catch (err) {
    console.warn('[SW] Error removing alarm from IndexedDB:', err);
    return false;
  }
}

// -------------------------------------------------------------
// Background Alarm Scheduler & Periodic Checker
// -------------------------------------------------------------
let nextTimerId = null;

function scheduleNextAlarmCheck() {
  if (nextTimerId) {
    clearTimeout(nextTimerId);
    nextTimerId = null;
  }

  // Check immediately and then schedule next
  checkAndTriggerPendingAlarms().then((nextDelayMs) => {
    // Re-check regularly every 2.5 seconds minimum or at next alarm time
    const delay = Math.max(1000, Math.min(nextDelayMs || 2500, 5000));
    nextTimerId = setTimeout(() => {
      scheduleNextAlarmCheck();
    }, delay);
  });
}

async function checkAndTriggerPendingAlarms() {
  const pendingAlarms = await getAllPendingAlarmsFromDB();
  const now = Date.now();
  let nearestUpcomingDelay = 3000;

  for (const alarm of pendingAlarms) {
    const alarmTime = new Date(alarm.dateTime || alarm.due_date).getTime();
    if (isNaN(alarmTime)) continue;

    const diff = alarmTime - now;

    if (diff <= 1000 && !alarm.isTriggered) {
      // Time is due! Trigger Alarm Notification & Audio Broadcast
      await triggerAlarmNotification(alarm);
      await markAlarmAsTriggeredInDB(alarm.id);
    } else if (diff > 0 && diff < nearestUpcomingDelay) {
      nearestUpcomingDelay = diff;
    }
  }

  return nearestUpcomingDelay;
}

// Trigger high-priority persistent native notification and broadcast to audio clients
async function triggerAlarmNotification(alarm) {
  const formattedTime = new Date(alarm.dateTime || alarm.due_date).toLocaleTimeString('bn-BD', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const title = `⏰ [টাস্ক অ্যালার্ম সংকেত] ${alarm.title || 'নির্ধারিত টাস্ক'}`;
  const bodyText = `নির্ধারিত সময়: ${formattedTime}\nক্যাটাগরি: ${alarm.category || 'টাস্ক'} • গুরুত্ব: ${alarm.priority || 'মাঝারি'}${alarm.description ? '\n' + alarm.description : ''}`;

  const options = {
    body: bodyText,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    image: undefined,
    // Repeating alarm vibration pattern (ringing buzz rhythm)
    vibrate: [500, 150, 500, 150, 500, 150, 800, 300, 500, 200, 500],
    tag: `task-alarm-${alarm.id}`,
    renotify: true,
    requireInteraction: true, // Remains on screen until user interacts
    silent: false,
    data: {
      url: alarm.url || '/tasks',
      taskId: alarm.id,
      alarmData: alarm
    },
    actions: [
      { action: 'view_task', title: '🔍 টাস্ক দেখুন' },
      { action: 'complete_task', title: '✅ সম্পন্ন' },
      { action: 'dismiss', title: '❌ বন্ধ' }
    ]
  };

  try {
    await self.registration.showNotification(title, options);
  } catch (err) {
    console.warn('[SW] showNotification error:', err);
  }

  // Broadcast to all open window clients so any background or foreground tab plays audio ringtone
  try {
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientList) {
      client.postMessage({
        type: 'TASK_ALARM_FIRED',
        alarm: alarm
      });
    }
  } catch (e) {
    console.warn('[SW] Failed to broadcast alarm to clients:', e);
  }
}

// -------------------------------------------------------------
// Service Worker Lifecycle Events
// -------------------------------------------------------------
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.clients.claim().then(() => {
      scheduleNextAlarmCheck();
    })
  );
});

// Periodic Sync (for supported browsers when app is closed)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-task-alarms') {
    event.waitUntil(checkAndTriggerPendingAlarms());
  }
});

// Background Sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-task-alarms') {
    event.waitUntil(checkAndTriggerPendingAlarms());
  }
});

// -------------------------------------------------------------
// Client Messaging Dispatcher (from React frontend)
// -------------------------------------------------------------
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || !data.type) return;

  switch (data.type) {
    case 'SCHEDULE_ALARM': {
      if (data.alarm) {
        saveAlarmToDB(data.alarm).then(() => {
          scheduleNextAlarmCheck();
        });
      }
      break;
    }

    case 'SYNC_ALL_ALARMS': {
      if (Array.isArray(data.alarms)) {
        bulkSaveAlarmsToDB(data.alarms).then(() => {
          scheduleNextAlarmCheck();
        });
      }
      break;
    }

    case 'CANCEL_ALARM': {
      if (data.alarmId) {
        removeAlarmFromDB(data.alarmId).then(() => {
          scheduleNextAlarmCheck();
        });
      }
      break;
    }

    case 'TEST_ALARM_NOTIFICATION': {
      const testAlarm = {
        id: 'test_' + Date.now(),
        title: data.title || 'টেস্ট অ্যালার্ম সংকেত',
        description: 'ব্যাকগ্রাউন্ড সার্ভিস ওয়ার্কার সাউন্ড ও নোটিফিকেশন সফলভাবে কাজ করছে!',
        category: 'টেস্ট',
        priority: 'জরুরি',
        dateTime: new Date().toISOString(),
        isTriggered: false
      };
      triggerAlarmNotification(testAlarm);
      break;
    }

    case 'PING_ALARM_WORKER': {
      scheduleNextAlarmCheck();
      if (event.source && event.source.postMessage) {
        event.source.postMessage({ type: 'PONG_ALARM_WORKER', timestamp: Date.now() });
      }
      break;
    }

    default:
      break;
  }
});

// -------------------------------------------------------------
// Push Notifications (Server push events)
// -------------------------------------------------------------
self.addEventListener('push', (event) => {
  let data = { title: '💬 Rgomassenger', body: 'নতুন একটি বার্তা এসেছে' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const isAlarm = data.isAlarm || (data.title && data.title.includes('অ্যালার্ম'));
  const isMessage = data.room || (data.title && data.title.includes('বার্তা')) || (data.title && data.title.includes('গ্রুপ'));

  const options = {
    body: data.body || 'নতুন মেসেজ এসেছে',
    icon: data.icon || '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: isAlarm
      ? [500, 150, 500, 150, 500, 150, 800]
      : [250, 100, 250, 100, 250], // Messenger-style distinctive double vibration
    data: {
      url: data.url || (data.room ? `/?room=${encodeURIComponent(data.room)}` : (isAlarm ? '/tasks' : '/')),
      room: data.room || 'general',
      sender: data.sender || '',
      isAlarm: !!isAlarm,
      isMessage: !!isMessage
    },
    tag: isAlarm ? `task-alarm-${Date.now()}` : (data.room ? `msg-${data.room}` : `messenger-msg-${Date.now()}`),
    renotify: true,
    requireInteraction: true,
    actions: isAlarm
      ? [
          { action: 'view_task', title: '🔍 টাস্ক দেখুন' },
          { action: 'dismiss', title: '❌ বন্ধ' }
        ]
      : [
          { action: 'open_chat', title: '💬 মেসেজে যান' },
          { action: 'dismiss', title: '❌ বন্ধ' }
        ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'মেসেঞ্জার নোটিফিকেশন', options).then(async () => {
      // Broadcast to any open or background clients so sound can play
      try {
        const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of clientList) {
          client.postMessage({
            type: 'PUSH_MESSAGE_RECEIVED',
            payload: data
          });
        }
      } catch (e) {}
    })
  );
});

// -------------------------------------------------------------
// Notification Click and Action Handling
// -------------------------------------------------------------
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const notifData = event.notification.data || {};
  const targetUrl = notifData.url || '/';

  if (action === 'dismiss') {
    return;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clientList) => {
      // If action is complete_task, send message to client to mark it completed
      if (action === 'complete_task' && notifData.taskId) {
        for (const client of clientList) {
          client.postMessage({
            type: 'COMPLETE_TASK_FROM_SW',
            taskId: notifData.taskId
          });
        }
      }

      // Check if there is already a window open with app
      for (const client of clientList) {
        if ('focus' in client) {
          if (client.url && (client.url.includes(targetUrl) || client.url.includes('/?room='))) {
            if (client.navigate && targetUrl && !client.url.endsWith(targetUrl)) {
              await client.navigate(targetUrl);
            }
            return client.focus();
          } else if (client.navigate) {
            await client.navigate(targetUrl);
            return client.focus();
          }
        }
      }

      // If no window is open, open a new window directly to the chat
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});


// Start scheduler immediately on load
scheduleNextAlarmCheck();
