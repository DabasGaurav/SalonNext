const { chromium: playwright } = require('playwright-core');

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const HANDLE = /^[a-zA-Z0-9._]{1,30}$/;

function normaliseHandle(value) {
  const raw = String(value || '').trim().replace(/^@/, '');
  if (!HANDLE.test(raw)) throw new Error('Enter a valid public Instagram username.');
  return raw.toLowerCase();
}

function decode(value) {
  return String(value || '').replace(/&(#\d+|#x[0-9a-f]+|quot|amp|lt|gt|apos);/gi, (_, entity) => {
    const named = { quot: '"', amp: '&', lt: '<', gt: '>', apos: "'" };
    if (entity[0] === '#') {
      const n = entity[1]?.toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : '';
    }
    return named[entity.toLowerCase()] || '';
  });
}

function meta(html, key, attribute = 'property') {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = html.match(new RegExp(`<meta ${attribute}="${escaped}" content="([\\s\\S]*?)"\\s*/?>`, 'i'));
  return decode(match?.[1] || '');
}

function count(value) {
  if (!value) return null;
  const match = String(value).replace(/,/g, '').match(/^([\d.]+)\s*([KMB])?$/i);
  if (!match) return null;
  const multiplier = { K: 1e3, M: 1e6, B: 1e9 }[match[2]?.toUpperCase()] || 1;
  return Math.round(Number(match[1]) * multiplier);
}

async function htmlAt(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(9000) });
  if (!response.ok) throw new Error(`Public Instagram page returned ${response.status}`);
  return response.text();
}

function parsePost(url, html) {
  const description = meta(html, 'og:description') || meta(html, 'description', 'name');
  const match = description.match(/^([\d,.KMB]+) likes?, ([\d,.KMB]+) comments?\s*-\s*[^\n]*? on ([^:]+):\s*([\s\S]*)$/i);
  const date = match ? Date.parse(`${match[3].trim()} GMT`) : NaN;
  return {
    url,
    type: url.includes('/reel/') ? 'Reel' : 'Post',
    date: Number.isFinite(date) ? new Date(date).toISOString().slice(0, 10) : null,
    likes: match ? count(match[1]) : null,
    comments: match ? count(match[2]) : null,
    caption: (match?.[4] || meta(html, 'og:title')).replace(/\s+/g, ' ').replace(/^"|"\.\s*$/g, '').trim().slice(0, 900),
    image: meta(html, 'og:image') || null,
  };
}

async function discover(handles) {
  const localChrome = process.env.LOCAL_CHROME_PATH;
  const chrome = localChrome ? null : (await import('@sparticuz/chromium')).default;
  const browser = await playwright.launch({
    executablePath: localChrome || await chrome.executablePath(),
    args: localChrome ? ['--no-sandbox'] : chrome.args,
    headless: true,
  });
  const found = {};
  try {
    const page = await browser.newPage({ userAgent: USER_AGENT, viewport: { width: 1280, height: 900 } });
    for (const [handle, limit] of handles) {
      const profileUrl = `https://www.instagram.com/${handle}/`;
      try {
        await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 18000 });
        await page.locator('a[href*="/reel/"],a[href*="/p/"]').first().waitFor({ timeout: 7000 }).catch(() => {});
        const links = await page.locator('a[href*="/reel/"],a[href*="/p/"]').evaluateAll(nodes => nodes.map(node => node.href));
        const unique = [...new Set(links)].filter(url => {
          try { const parsed = new URL(url); return parsed.hostname === 'www.instagram.com' && /^\/(?:[a-zA-Z0-9._]+)\/(?:reel|p)\/[a-zA-Z0-9_-]+\/$/.test(parsed.pathname); }
          catch { return false; }
        }).slice(0, limit);
        found[handle] = { profileUrl, links: unique };
      } catch (error) {
        found[handle] = { profileUrl, links: [], error: error.message };
      }
    }
  } finally { await browser.close(); }
  return found;
}

async function scanPublicProfiles(ownHandle, competitorHandle) {
  const own = normaliseHandle(ownHandle);
  const competitor = competitorHandle ? normaliseHandle(competitorHandle) : null;
  const requests = [[own, 9], ...(competitor && competitor !== own ? [[competitor, 3]] : [])];
  const discovered = await discover(requests);
  const profiles = {};
  for (const [handle] of requests) {
    const info = discovered[handle];
    const results = await Promise.allSettled(info.links.map(async url => parsePost(url, await htmlAt(url))));
    let description = '';
    try { description = meta(await htmlAt(info.profileUrl), 'description', 'name'); } catch { /* A missing bio does not block a post scan. */ }
    profiles[handle] = {
      handle, url: info.profileUrl, description: description.slice(0, 600),
      posts: results.filter(result => result.status === 'fulfilled').map(result => result.value),
      status: info.links.length ? 'public-posts' : 'posts-unavailable',
    };
  }
  return { own: profiles[own], competitor: competitor ? profiles[competitor] || null : null };
}

module.exports = { normaliseHandle, parsePost, scanPublicProfiles };
