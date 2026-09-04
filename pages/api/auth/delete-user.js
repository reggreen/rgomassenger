import { deleteCentralUser, getCentralUsers } from '../../../lib/serverAuthStore';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { targetEmail } = req.body || {};

    if (!targetEmail) {
      return res.status(400).json({ success: false, message: 'ইউজারের ইমেইল প্রদান করুন।' });
    }

    deleteCentralUser(targetEmail);
    const updatedUsers = getCentralUsers();

    return res.status(200).json({
      success: true,
      message: `${targetEmail} কে সফলভাবে বাতিল ও মুছে ফেলা হয়েছে।`,
      users: updatedUsers
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
