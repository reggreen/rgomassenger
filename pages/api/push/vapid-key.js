import { DEFAULT_VAPID_PUBLIC_KEY } from '../../../lib/webPushConfig';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return res.status(200).json({
    publicKey: DEFAULT_VAPID_PUBLIC_KEY
  });
}
