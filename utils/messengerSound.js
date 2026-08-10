// Messenger Notification Sound & Push Notification Engine

let audioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Play original Messenger-style double chime sound
export function playMessengerSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Tone 1: First high pop (E6 - 1318.51 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1318.51, now); // E6
    osc1.frequency.exponentialRampToValueAtTime(1567.98, now + 0.08); // G6 quick pitch pop

    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.15);

    // Tone 2: Second harmonizing chime (C6 - 1046.50 Hz -> E6 - 1318.51 Hz) slightly delayed
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1046.50, now + 0.07);
    osc2.frequency.exponentialRampToValueAtTime(1318.51, now + 0.22);

    gain2.gain.setValueAtTime(0.2, now + 0.07);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now + 0.07);
    osc2.stop(now + 0.28);
  } catch (err) {
    console.warn('Audio chime play blocked or failed:', err);
  }
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

// Show Native Mobile/Desktop Push Notification
export function sendMessengerNotification(title, body, sender) {
  if (typeof window === 'undefined') return;

  // Play audio sound first
  playMessengerSound();

  // Trigger System Push Notification
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
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
