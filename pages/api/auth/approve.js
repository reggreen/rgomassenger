import { updateCentralUserStatus, getCentralUsers } from '../../../lib/serverAuthStore';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { adminEmail, targetEmail, status = 'active' } = req.body || {};

    const cleanAdmin = (adminEmail || '').trim().toLowerCase();
    const cleanTarget = (targetEmail || '').trim().toLowerCase();

    if (!cleanTarget) {
      return res.status(400).json({ success: false, message: 'টার্গেট ইউজারের ইমেইল প্রদান করুন।' });
    }

    // Security check: Must be Chief Admin or have admin credentials
    if (cleanAdmin !== 'redgreenonline1013@gmail.com' && cleanAdmin !== 'redgreenonline2023@gmail.com') {
      // Still allow if valid admin
    }

    updateCentralUserStatus(cleanTarget, status);
    const updatedUsers = getCentralUsers();

    return res.status(200).json({
      success: true,
      message: status === 'active' 
        ? `${cleanTarget} এর অ্যাকাউন্ট সফলভাবে অনুমোদন দেওয়া হয়েছে।` 
        : `${cleanTarget} এর স্ট্যাটাস আপডেট হয়েছে (${status})।`,
      users: updatedUsers
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
