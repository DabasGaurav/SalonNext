const { SESSION_COOKIE, cookie, noStore } = require('../../lib/instagram');
module.exports = (req, res) => {
  noStore(res);
  if (req.method !== 'POST') return res.status(405).end();
  res.setHeader('Set-Cookie', cookie(SESSION_COOKIE, '', 0));
  res.status(200).json({ ok: true });
};
