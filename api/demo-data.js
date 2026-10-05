const { posts } = require('../lib/demo');
module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=3600');
  if (req.method !== 'GET') return res.status(405).end();
  return res.status(200).json({ account: { username: 'sample_salon' }, posts, measured_posts: posts.filter(p => p.reach > 0 && ['likes', 'comments', 'saves', 'shares'].every(k => p[k] !== null)).length, captioned_posts: posts.filter(p => p.caption).length, synthetic: true });
};
