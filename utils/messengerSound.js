// Messenger Notification Sound & Push Notification Engine

let audioCtx = null;
let alarmAudioElement = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// Play original Messenger-style double chime sound
export function playMessengerSound() {
  if (typeof window === 'undefined') return;

  // Try Web Audio API first
  try {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'running') {
      const now = ctx.currentTime;

      // Tone 1: First high pop (E6 - 1318.51 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1318.51, now);
      osc1.frequency.exponentialRampToValueAtTime(1567.98, now + 0.08);

      gain1.gain.setValueAtTime(0.28, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.15);

      // Tone 2: Second harmonizing chime
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1046.50, now + 0.07);
      osc2.frequency.exponentialRampToValueAtTime(1318.51, now + 0.22);

      gain2.gain.setValueAtTime(0.22, now + 0.07);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.start(now + 0.07);
      osc2.stop(now + 0.28);
      return;
    }
  } catch (err) {
    // fallback below
  }

  // Fallback to HTML5 Audio element
  try {
    const audio = new Audio('/messenger.wav');
    audio.volume = 0.8;
    audio.play().catch(() => {});
  } catch (e) {}
}

// Play a continuous 8-10 second ringing alarm tone for scheduled tasks
export function playTaskAlarmRingtone(durationMs = 10000) {
  if (typeof window === 'undefined') return () => {};

  let isStopped = false;

  // 1. Play dedicated /alarm.wav audio element
  try {
    if (!alarmAudioElement) {
      alarmAudioElement = new Audio('/alarm.wav');
    }
    alarmAudioElement.currentTime = 0;
    alarmAudioElement.volume = 1.0;
    alarmAudioElement.loop = true;
    const playPromise = alarmAudioElement.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {});
    }
  } catch (e) {}

  // 2. Also run Web Audio chimes interval for high-frequency alarms
  const intervalId = setInterval(() => {
    if (isStopped) return;
    playMessengerSound();
  }, 650);

  playMessengerSound();

  const stopFn = () => {
    isStopped = true;
    clearInterval(intervalId);
    try {
      if (alarmAudioElement) {
        alarmAudioElement.pause();
        alarmAudioElement.currentTime = 0;
      }
    } catch (e) {}
  };

  // Auto stop after duration
  setTimeout(() => {
    stopFn();
  }, durationMs);

  return stopFn;
}

// Request permission for push notifications and unlock AudioContext
export async function requestNotificationPermission() {
  if (typeof window === 'undefined') return false;

  // Unlock audio context on user click
  try {
    const ctx = getAudioContext();
    if (ctx) {
      await ctx.resume();
      playMessengerSound(); // Test sound chime on unlock
    }
  } catch (e) {}

  if (!('Notification' in window)) {
    alert('আপনার ব্রাউজারে সিস্টেম নোটিফিকেশন সাপোর্ট নেই।');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

// Show Native Mobile/Desktop Push Notification via ServiceWorker or Web Notification
export async function sendMessengerNotification(title, body, sender) {
  if (typeof window === 'undefined') return;

  // Play audio sound first
  playMessengerSound();

  // Trigger System Push Notification via Service Worker or Native Notification
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if (registration && registration.showNotification) {
          registration.showNotification(`💬 ${title}`, {
            body: body || 'নতুন মেসেজ এসেছে',
            icon: '/icon.png',
            badge: '/icon.png',
            tag: 'messenger-msg-' + Date.now(),
            renotify: true,
            vibrate: [200, 100, 200],
            data: { url: '/' }
          });
          return;
        }
      }

      // Fallback to standard window Notification
      const notification = new Notification(`💬 ${title}`, {
        body: body || 'নতুন মেসেজ এসেছে',
        icon: '/icon.png',
        badge: '/icon.png',
        tag: 'messenger-msg-' + Date.now(),
        renotify: true,
        vibrate: [200, 100, 200]
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (e) {
      console.warn('Notification trigger failed:', e);
    }
  }
}
