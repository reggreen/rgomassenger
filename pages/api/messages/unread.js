import { appwrite as supabase } from '../../../lib/appwrite';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username = '', since = 0 } = req.query;

  try {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch messages' });
    }

    const sinceTime = Number(since) || 0;
    const filtered = (messages || []).filter((msg) => {
      const msgTime = new Date(msg.created_at).getTime();
      const isNotSelf = !username || (msg.sender && msg.sender.toLowerCase() !== username.toLowerCase());
      return msgTime > sinceTime && isNotSelf;
    });

    return res.status(200).json({
      success: true,
      unreadCount: filtered.length,
      latestMessage: filtered[0] || null
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
