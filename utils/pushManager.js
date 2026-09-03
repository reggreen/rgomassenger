// Client-Side Web Push & Background Messenger Service Manager

/**
 * Convert VAPID public key to Uint8Array for PushManager
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check if the browser supports Service Worker Push Notifications
 */
export function isPushNotificationSupported() {
  if (typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * Register device with Web Push Server so notifications arrive even when app is closed
 */
export async function registerPushNotifications(username, userEmail = '', userRole = '') {
  if (!isPushNotificationSupported()) {
    console.warn('[PushManager] Web Push is not supported in this browser environment.');
    return { success: false, reason: 'unsupported' };
  }

  try {
    // 1. Request notification permission if not granted
    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return { success: false, reason: 'permission_denied' };
      }
    }

    // 2. Wait for Service Worker registration
    const registration = await navigator.serviceWorker.ready;
    if (!registration) {
      return { success: false, reason: 'no_service_worker' };
    }

    // 3. Fetch VAPID public key
    let publicKey = '';
    try {
      const keyRes = await fetch('/api/push/vapid-key');
      const keyData = await keyRes.json();
      publicKey = keyData.publicKey;
    } catch (e) {
      console.warn('[PushManager] Failed to fetch VAPID key from API, using fallback');
      publicKey = 'BNOk3yG7SvrIXZ2md4sV9aU0O1Jat5B0robYOux6P9O0aRuTSLuXfR9x0yJQhR6mWXs52UMmKs-gm27J1UxupUc';
    }

    if (!publicKey) {
      return { success: false, reason: 'missing_key' };
    }

    // 4. Check existing subscription or create new
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const convertedKey = urlBase64ToUint8Array(publicKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey
      });
    }

    // 5. Send subscription to server
    const payload = {
      subscription,
      username: username || 'মেসেঞ্জার ইউজার',
      userEmail: userEmail || '',
      userRole: userRole || 'মেম্বার',
      deviceInfo: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        timestamp: new Date().toISOString()
      }
    };

    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (typeof window !== 'undefined') {
      localStorage.setItem('rg_push_registered', 'true');
      localStorage.setItem('rg_push_registered_time', String(Date.now()));
      try {
        localStorage.setItem('rg_my_push_sub', JSON.stringify(subscription));
        // Sync subscription to user profile in rg_all_users
        const storedUsers = localStorage.getItem('rg_all_users');
        if (storedUsers) {
          const users = JSON.parse(storedUsers);
          const updated = users.map((u) => {
            if (u.username && u.username.toLowerCase() === (username || '').toLowerCase()) {
              return { ...u, pushSubscription: subscription, pushActive: true };
            }
            return u;
          });
          localStorage.setItem('rg_all_users', JSON.stringify(updated));
        }
      } catch (e) {}
      window.dispatchEvent(new CustomEvent('rg_push_status_changed', { detail: { isRegistered: true } }));
    }

    return { success: true, data };
  } catch (err) {
    console.warn('[PushManager] Registration failed:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Dispatch server-side push notification to recipient devices when a message is sent
 */
export async function sendPushForMessage({
  sender,
  room = 'general',
  text = '',
  isGroup = true,
  groupName = '',
  targetUsername = '',
  customAvatarUrl = null,
  hasAudio = false,
  hasImage = false
}) {
  if (!sender) return;

  try {
    // Gather any user subscriptions from local user directory for serverless resilience
    let clientSubscriptions = [];
    if (typeof window !== 'undefined') {
      try {
        const storedUsers = localStorage.getItem('rg_all_users');
        if (storedUsers) {
          const users = JSON.parse(storedUsers);
          clientSubscriptions = users
            .filter((u) => u.pushSubscription && u.pushSubscription.endpoint)
            .map((u) => ({
              username: u.username,
              subscription: u.pushSubscription
            }));
        }
      } catch (e) {}
    }

    const res = await fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender,
        room,
        text,
        isGroup,
        groupName,
        targetUsername,
        customAvatarUrl,
        hasAudio,
        hasImage,
        clientSubscriptions
      })
    });
    return await res.json();
  } catch (err) {
    console.warn('[PushManager] Dispatch push error:', err);
    return null;
  }
}

/**
 * Send a test background push notification to verify mobile receipt
 */
export async function sendTestPushNotification(username = '') {
  try {
    const res = await fetch('/api/push/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}
