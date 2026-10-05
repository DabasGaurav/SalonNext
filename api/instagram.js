const { refreshedSession, noStore, profile, posts } = require('../lib/instagram');
module.exports = async (req, res) => {
  noStore(res);
  if (req.method !== 'GET') return res.status(405).end();
  const connected = await refreshedSession(req, res);
  if (!connected) return res.status(401).json({ error: 'Connect your Instagram account first.' });
  try {
    const account = await profile(connected.token);
    const media = await posts(connected.token, connected.id);
    res.status(200).json({ account, posts: media, measured_posts: media.filter(p => p.reach !== null && ['likes', 'comments', 'saves', 'shares'].every(k => p[k] !== null)).length, captioned_posts: media.filter(p => p.caption).length });
  } catch (error) {
    console.error('Instagram sync failed:', error.message);
    res.status(502).json({ error: 'Instagram data could not be read right now. Please reconnect or try again.' });
  }
};
