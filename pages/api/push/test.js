import webpush, { configureWebPush } from '../../../lib/webPushConfig';
import { getAllSubscriptions, getSubscriptionsForUser } from '../../../lib/subscriptionStore';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    configureWebPush();

    const { username = '', deviceOnly = false } = req.body || {};

    let targets = [];
    if (username) {
      targets = getSubscriptionsForUser(username);
    }
    if (targets.length === 0) {
      targets = getAllSubscriptions();
    }

    if (targets.length === 0) {
      return res.status(200).json({
        success: false,
        message: 'কোনো সক্রিয় ব্যাকগ্রাউন্ড ডিভাইস পাওয়া যায়নি। অনুগ্রহ করে প্রথমে ব্রাউজারে নোটিফিকেশন এলাউ (Allow) করুন।'
      });
    }

    const payload = JSON.stringify({
      title: '🔔 [টেস্ট নোটিফিকেশন] Rgomassenger',
      body: 'অভিনন্দন! আপনার ব্যাকগ্রাউন্ড মেসেঞ্জার নোটিফিকেশন সার্ভিস সফলভাবে চালু আছে। অ্যাপ বন্ধ থাকলেও মেসেজ এলে নোটিফিকেশন আসবে।',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'test-push-' + Date.now(),
      url: '/',
      timestamp: Date.now()
    });

    let sent = 0;
    await Promise.allSettled(
      targets.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: sub.keys
            },
            payload,
            { urgency: 'high' }
          );
          sent++;
        } catch (e) {
          console.warn('[WebPush Test] Error:', e.message);
        }
      })
    );

    return res.status(200).json({
      success: true,
      message: `${sent}টি ডিভাইসে টেস্ট নোটিফিকেশন সফলভাবে পাঠানো হয়েছে!`,
      sentCount: sent
    });
  } catch (err) {
    return res.status(500).json({
      error: 'Test push failed',
      details: err.message
    });
  }
}
