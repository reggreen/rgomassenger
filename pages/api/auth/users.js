import { getCentralUsers, syncCentralUsers } from '../../../lib/serverAuthStore';

export default async function handler(req, res) {
  // Allow cross-origin and proper headers
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method === 'GET') {
    try {
      const users = getCentralUsers();
      return res.status(200).json({ success: true, users });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { users, credentials } = req.body || {};
      const synced = syncCentralUsers(users, credentials);
      return res.status(200).json({ success: true, users: synced });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}
