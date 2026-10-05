const { CALLBACK, SESSION_COOKIE, STATE_COOKIE, cookie, seal, state, noStore, metaJson, profile } = require('../../lib/instagram');
module.exports = async (req, res) => {
  noStore(res);
  if (req.method !== 'GET') return res.status(405).end();
  const saved = state(req);
  if (!saved || !req.query.state || saved.state !== req.query.state || !req.query.code) return res.redirect('/login.html?error=authorization');
  res.setHeader('Set-Cookie', cookie(STATE_COOKIE, '', 0));
  try {
    const form = new URLSearchParams({ client_id: process.env.INSTAGRAM_APP_ID, client_secret: process.env.INSTAGRAM_APP_SECRET, grant_type: 'authorization_code', redirect_uri: CALLBACK, code: req.query.code });
    const short = await metaJson('https://api.instagram.com/oauth/access_token', { method: 'POST', body: form });
    const longUrl = new URL('https://graph.instagram.com/access_token');
    longUrl.searchParams.set('grant_type', 'ig_exchange_token');
    longUrl.searchParams.set('client_secret', process.env.INSTAGRAM_APP_SECRET);
    longUrl.searchParams.set('access_token', short.access_token);
    const long = await metaJson(longUrl);
    const account = await profile(long.access_token);
    const exp = Date.now() + Math.min(Number(long.expires_in || 5184000) * 1000, 5184000000);
    res.setHeader('Set-Cookie', [cookie(STATE_COOKIE, '', 0), cookie(SESSION_COOKIE, seal({ token: long.access_token, id: account.id, username: account.username, exp }), Math.floor((exp - Date.now()) / 1000))]);
    return res.redirect(302, '/app.html');
  } catch (error) {
    console.error('Instagram authorization failed:', error.message);
    return res.redirect('/login.html?error=connection');
  }
};
