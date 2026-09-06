import { registerCentralUser } from '../../../lib/serverAuthStore';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { name, email, password, role, avatar_emoji, phone, bio } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'নাম, ইমেইল এবং পাসওয়ার্ড আবশ্যক।' });
    }

    const result = registerCentralUser({
      name,
      email,
      password,
      role,
      avatar_emoji,
      phone,
      bio
    });

    return res.status(200).json({
      success: true,
      user: result.user,
      isPending: result.isPending,
      message: result.isPending
        ? 'রেজিস্ট্রেশন সফল হয়েছে! অ্যাকাউন্টটি চিফ অ্যাডমিন (redgreenonline1013@gmail.com) অনুমোদনের অপেক্ষায় রয়েছে।'
        : 'অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে।'
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}
