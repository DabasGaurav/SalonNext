const crypto = require('node:crypto');

const CALLBACK = 'https://salonnext-landing.vercel.app/api/auth/callback';
const GRAPH = 'https://graph.instagram.com/v25.0';
const SESSION_COOKIE = 'salonnext_ig';
const STATE_COOKIE = 'salonnext_oauth_state';

function cookies(req) {
  return Object.fromEntries(String(req.headers.cookie || '').split(';').map(x => x.trim().split(/=(.*)/s).slice(0, 2)).filter(x => x[0]));
}
function key() {
  const value = process.env.SALONNEXT_SESSION_KEY || '';
  const decoded = Buffer.from(value, 'base64');
  if (decoded.length !== 32) throw new Error('Session encryption is not configured');
  return decoded;
}
function seal(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
}
function open(value) {
  try {
    const data = Buffer.from(value || '', 'base64url');
    if (data.length < 29) return null;
    const decipher = crypto.createDecipheriv('aes-256-gcm', key(), data.subarray(0, 12));
    decipher.setAuthTag(data.subarray(12, 28));
    const result = JSON.parse(Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString());
    return result.exp > Date.now() ? result : null;
  } catch { return null; }
}
function cookie(name, value, maxAge) {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
function session(req) { return open(cookies(req)[SESSION_COOKIE]); }
async function refreshedSession(req, res) {
  const current = session(req);
  if (!current || current.exp - Date.now() > 7 * 86400000) return current;
  try {
    const url = new URL('https://graph.instagram.com/refresh_access_token');
    url.searchParams.set('grant_type', 'ig_refresh_token');
    url.searchParams.set('access_token', current.token);
    const refreshed = await metaJson(url);
    const exp = Date.now() + Math.min(Number(refreshed.expires_in || 5184000) * 1000, 5184000000);
    const updated = { ...current, token: refreshed.access_token, exp };
    res.setHeader('Set-Cookie', cookie(SESSION_COOKIE, seal(updated), Math.floor((exp - Date.now()) / 1000)));
    return updated;
  } catch (error) {
    console.error('Instagram token refresh failed:', error.message);
    return current;
  }
}
function state(req) { return open(cookies(req)[STATE_COOKIE]); }
function noStore(res) { res.setHeader('Cache-Control', 'no-store'); }
async function metaJson(url, options) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(15000) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) {
    const code = data.error?.code || response.status;
    throw new Error(`Instagram API error (${code})`);
  }
  return data;
}
async function graph(path, token, params = {}) {
  const url = new URL(`${GRAPH}/${path.replace(/^\//, '')}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return metaJson(url, { headers: { Authorization: `Bearer ${token}` } });
}
async function profile(token) { return graph('me', token, { fields: 'id,username,account_type,media_count' }); }
async function posts(token, id) {
  const page = await graph(`${id}/media`, token, { fields: 'id,caption,media_type,media_product_type,timestamp,permalink,like_count,comments_count', limit: '30' });
  const media = (page.data || []).slice(0, 12);
  const results = await Promise.all(media.map(async item => {
    const metrics = {};
    try {
      const result = await graph(`${item.id}/insights`, token, { metric: 'reach,likes,comments,shares,saved' });
      for (const insight of result.data || []) {
        const value = insight.values?.[0]?.value ?? insight.total_value?.value;
        if (value !== null && value !== undefined && Number.isFinite(Number(value))) metrics[insight.name === 'saved' ? 'saves' : insight.name] = Number(value);
      }
    } catch {
      // Some media types reject a combined metric request. Recover the key
      // measurements without treating missing insights as zero.
      for (const metric of ['reach', 'saved', 'shares']) {
        try {
          const result = await graph(`${item.id}/insights`, token, { metric });
          const value = result.data?.[0]?.values?.[0]?.value ?? result.data?.[0]?.total_value?.value;
          if (value !== null && value !== undefined && Number.isFinite(Number(value))) metrics[metric === 'saved' ? 'saves' : metric] = Number(value);
        } catch { /* This metric is unavailable for the post. */ }
      }
    }
    return { caption: item.caption || null, media_type: item.media_product_type || item.media_type || 'POST', reach: metrics.reach ?? null, likes: metrics.likes ?? item.like_count ?? null, comments: metrics.comments ?? item.comments_count ?? null, saves: metrics.saves ?? null, shares: metrics.shares ?? null, timestamp: item.timestamp, permalink: item.permalink };
  }));
  return results;
}
module.exports = { CALLBACK, SESSION_COOKIE, STATE_COOKIE, cookie, cookies, seal, open, session, refreshedSession, state, noStore, metaJson, graph, profile, posts };
