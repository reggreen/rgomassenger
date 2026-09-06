// Server-Side Web Push Notification Engine
import webpush from 'web-push';

export const DEFAULT_VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BNOk3yG7SvrIXZ2md4sV9aU0O1Jat5B0robYOux6P9O0aRuTSLuXfR9x0yJQhR6mWXs52UMmKs-gm27J1UxupUc';

export const DEFAULT_VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY ||
  'OsXz6tdFoum8NDQvgm4D5U6Xum7QDkPRHa7sQJhQPDk';

export const DEFAULT_VAPID_SUBJECT =
  process.env.VAPID_SUBJECT ||
  'mailto:redgreenonline1013@gmail.com';

let isConfigured = false;

export function configureWebPush() {
  if (isConfigured) return;
  try {
    webpush.setVapidDetails(
      DEFAULT_VAPID_SUBJECT,
      DEFAULT_VAPID_PUBLIC_KEY,
      DEFAULT_VAPID_PRIVATE_KEY
    );
    isConfigured = true;
  } catch (err) {
    console.warn('[WebPush] Error setting VAPID details:', err);
  }
}

export default webpush;
