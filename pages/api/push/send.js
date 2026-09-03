import webpush, { configureWebPush } from '../../../lib/webPushConfig';
import {
  getSubscriptionsForUser,
  getSubscriptionsExcludingUser,
  removeSubscriptionByEndpoint,
  getAllSubscriptions
} from '../../../lib/subscriptionStore';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    configureWebPush();

    const {
      sender = 'মেসেঞ্জার ইউজার',
      room = 'general',
      text = '',
      isGroup = true,
      groupName = '',
      targetUsername = '',
      customAvatarUrl = null,
      hasAudio = false,
      hasImage = false,
      clientSubscriptions = []
    } = req.body || {};

    // 1. Determine Title & Body Preview
    let title = '';
    if (isGroup && groupName) {
      title = `💬 [গ্রুপ: ${groupName}] ${sender}`;
    } else if (isGroup && (room === 'general' || room === 'all')) {
      title = `💬 [সাধারণ গ্রুপ] ${sender}`;
    } else if (!isGroup || targetUsername || room.startsWith('dm_')) {
      title = `💬 [ব্যক্তিগত বার্তা] ${sender}`;
    } else {
      title = `💬 [মেসেঞ্জার বার্তা] ${sender}`;
    }

    let previewText = text;
    if (hasAudio && !previewText) {
      previewText = '🎤 একটি ভয়েস অডিও বার্তা পাঠিয়েছেন';
    } else if (hasImage && !previewText) {
      previewText = '📷 একটি ছবি পাঠিয়েছেন';
    } else if (!previewText) {
      previewText = 'নতুন একটি বার্তা পাঠিয়েছেন';
    }

    // Limit preview length
    if (previewText.length > 120) {
      previewText = previewText.substring(0, 117) + '...';
    }

    const payload = JSON.stringify({
      title,
      body: previewText,
      icon: customAvatarUrl || '/icon-192.png',
      badge: '/icon-192.png',
      tag: `msg-${room}-${Date.now()}`,
      room: room,
      sender: sender,
      isGroup: !!isGroup,
      groupName: groupName || '',
      url: `/?room=${encodeURIComponent(room)}`,
      timestamp: Date.now()
    });

    // 2. Select Recipient Subscriptions
    let recipients = [];
    if (targetUsername) {
      recipients = getSubscriptionsForUser(targetUsername);
    } else {
      recipients = getSubscriptionsExcludingUser(sender);
    }

    // Merge any client-supplied subscriptions (vital for Vercel/serverless where ephemeral disk is fresh)
    if (Array.isArray(clientSubscriptions) && clientSubscriptions.length > 0) {
      const normalizedSender = (sender || '').trim().toLowerCase();
      const normalizedTarget = (targetUsername || '').trim().toLowerCase();

      for (const clientSub of clientSubscriptions) {
        const subData = clientSub.subscription || clientSub;
        const subUser = (clientSub.username || '').trim().toLowerCase();

        if (!subData || !subData.endpoint) continue;

        // Skip sender
        if (subUser && subUser === normalizedSender) continue;

        // If direct message, match target username
        if (normalizedTarget && subUser && subUser !== normalizedTarget) continue;

        const alreadyExists = recipients.some((r) => r.endpoint === subData.endpoint);
        if (!alreadyExists) {
          recipients.push({
            endpoint: subData.endpoint,
            keys: subData.keys || {},
            username: clientSub.username || ''
          });
        }
      }
    }

    // Fallback: If target username had no subscriptions or recipient is empty, and room is not private, broadcast to all other devices
    if (recipients.length === 0 && !targetUsername && !room.startsWith('dm_')) {
      recipients = getSubscriptionsExcludingUser(sender);
    }

    if (recipients.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No external active background devices found for recipients',
        sentCount: 0,
        totalRecipients: 0
      });
    }

    let sentCount = 0;
    const sendPromises = recipients.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys
          },
          payload,
          {
            TTL: 86400, // 24 hours
            urgency: 'high'
          }
        );
        sentCount++;
      } catch (err) {
        // If expired or unregistered, remove from subscription store
        if (err.statusCode === 404 || err.statusCode === 410) {
          removeSubscriptionByEndpoint(sub.endpoint);
        } else {
          console.warn('[WebPush] Error dispatching to device:', err.message || err);
        }
      }
    });

    await Promise.allSettled(sendPromises);

    return res.status(200).json({
      success: true,
      message: `Push notification dispatched to ${sentCount} device(s)`,
      sentCount,
      totalRecipients: recipients.length
    });
  } catch (err) {
    console.error('[WebPush Send Error]:', err);
    return res.status(500).json({
      error: 'Failed to send push notifications',
      details: err.message
    });
  }
}
