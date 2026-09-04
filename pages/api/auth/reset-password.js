import { resetCentralPassword } from '../../../lib/serverAuthStore';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { targetEmail, newPassword } = req.body || {};

    if (!targetEmail || !newPassword) {
      return res.status(400).json({ success: false, message: 'ইমেইল এবং নতুন পাসওয়ার্ড আবশ্যক।' });
    }

    resetCentralPassword(targetEmail, newPassword);

    return res.status(200).json({
      success: true,
      message: `${targetEmail} এর জন্য নতুন পাসওয়ার্ড সফলভাবে সেট করা হয়েছে।`
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
