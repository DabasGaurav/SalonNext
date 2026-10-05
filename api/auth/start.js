const crypto = require('node:crypto');
const { CALLBACK, STATE_COOKIE, cookie, seal, noStore } = require('../../lib/instagram');
module.exports = (req, res) => {
  noStore(res);
  if (req.method !== 'GET') return res.status(405).end();
  if (!process.env.INSTAGRAM_APP_ID || !process.env.INSTAGRAM_APP_SECRET || !process.env.SALONNEXT_SESSION_KEY) return res.redirect('/login.html?error=setup');
  const state = crypto.randomBytes(24).toString('base64url');
  res.setHeader('Set-Cookie', cookie(STATE_COOKIE, seal({ state, exp: Date.now() + 600000 }), 600));
  const url = new URL('https://www.instagram.com/oauth/authorize');
  url.searchParams.set('client_id', process.env.INSTAGRAM_APP_ID);
  url.searchParams.set('redirect_uri', CALLBACK);
  url.searchParams.set('scope', 'instagram_business_basic,instagram_business_manage_insights');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('state', state);
  res.redirect(302, url.toString());
};
