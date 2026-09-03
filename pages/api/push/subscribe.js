import { saveSubscription, getSubscriptionStats, getAllSubscriptions } from '../../../lib/subscriptionStore';

export default function handler(req, res) {
  if (req.method === 'GET') {
    const stats = getSubscriptionStats();
    return res.status(200).json({
      success: true,
      stats
    });
  }

  if (req.method === 'POST') {
    const { subscription, username, userEmail, userRole, deviceInfo } = req.body || {};

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Valid subscription object is required' });
    }

    const saved = saveSubscription({
      subscription,
      username: username || 'মেসেঞ্জার ইউজার',
      userEmail: userEmail || '',
      userRole: userRole || 'মেম্বার',
      deviceInfo: deviceInfo || {}
    });

    const stats = getSubscriptionStats();

    return res.status(200).json({
      success: true,
      message: 'Background push subscription registered successfully',
      device: saved,
      stats
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
