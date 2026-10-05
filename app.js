const $ = selector => document.querySelector(selector);
const form = $('#planner');
const status = $('#status');
const result = $('#result');
const button = $('#generate');
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
function safeLink(value) {
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; }
  catch { return ''; }
}
function updateUsage(usage) {
  if (!usage) return;
  $('#plans-left').textContent = `${usage.remaining} / ${usage.limit}`;
  $('#plans-used').textContent = `${usage.used} plan${usage.used === 1 ? '' : 's'} made in this browser · from Supabase`;
  button.disabled = usage.remaining === 0;
  if (usage.remaining === 0) button.textContent = 'Five-plan limit reached';
}
async function loadUsage() {
  try {
    const response = await fetch('/api/recommend', { credentials: 'same-origin', cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Usage is unavailable');
    updateUsage(data.usage);
  } catch { $('#plans-used').textContent = 'Usage temporarily unavailable'; }
}
function postCard(post) {
  const link = safeLink(post.url);
  if (!link) return '';
  const counts = [post.likes == null ? null : `${Number(post.likes).toLocaleString()} likes`, post.comments == null ? null : `${Number(post.comments).toLocaleString()} comments`].filter(Boolean).join(' · ');
  return `<a class="post-card" href="${escapeHTML(link)}" target="_blank" rel="noopener noreferrer"><span>${escapeHTML(post.type || 'Post')} · ${escapeHTML(post.date || 'date unavailable')}</span><strong>${escapeHTML(post.caption || 'No public caption')}</strong><small>${escapeHTML(counts || 'Public counts unavailable')} ↗</small></a>`;
}
function render(data) {
  const plan = data.plan || {};
  const evidence = data.evidence || {};
  const posts = Array.isArray(evidence.posts) ? evidence.posts : [];
  const competitors = Array.isArray(evidence.competitor_posts) ? evidence.competitor_posts : [];
  const sources = (evidence.sources || []).map(source => {
    const href = safeLink(source.url);
    return href ? `<a href="${escapeHTML(href)}" target="_blank" rel="noopener noreferrer">${escapeHTML(source.title || new URL(href).hostname)} ↗</a>` : '';
  }).join('');
  $('#posts-used').textContent = posts.length;
  $('#competitor-posts').textContent = competitors.length;
  result.innerHTML = `<div class="result-head"><div><p class="eyebrow">Your next Reel · one plan</p><h2>${escapeHTML(plan.title || 'Your next Reel')}</h2><p>${escapeHTML(plan.angle || '')}</p></div><span class="badge">${posts.length} public post${posts.length === 1 ? '' : 's'} used</span></div>
    <div class="evidence"><article><small>Why it fits your salon</small><p>${escapeHTML(plan.why_this_fits)}</p></article><article><small>Why now</small><p>${escapeHTML(plan.why_now)}</p></article></div>
    <div class="content-grid"><div class="content-block"><small>First-three-second hook</small><p>${escapeHTML(plan.hook)}</p></div><div class="content-block"><small>Spoken script</small><p>${escapeHTML(plan.spoken_script)}</p></div><div class="content-block wide"><small>Shots to film</small><ol>${(plan.shots || []).map(shot => `<li>${escapeHTML(shot)}</li>`).join('')}</ol></div><div class="content-block"><small>Caption</small><p>${escapeHTML(plan.caption)}</p></div><div class="content-block"><small>Booking call to action</small><p>${escapeHTML(plan.booking_cta)}</p></div></div>
    <div class="research-card"><small>Comparable salon angle</small><p>${escapeHTML(plan.competitor_angle)}</p></div>
    <div class="research-card"><small>Evidence receipt</small><p>${escapeHTML(plan.evidence_note)}</p>${posts.length ? `<div class="post-list">${posts.map(postCard).join('')}</div>` : '<p class="data-warning">Instagram did not expose recent posts to this request. The idea uses only your entered salon details.</p>'}${competitors.length ? `<p class="hint">Comparable public posts: ${competitors.length}. Their visible content can inspire a distinct angle; it does not reveal bookings or private analytics.</p>` : ''}${sources ? `<div class="source-list">${sources}</div>` : ''}</div>`;
  result.hidden = false;
  result.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  button.disabled = true;
  button.textContent = 'Checking public posts…';
  status.textContent = 'Reading public posts, then preparing one Reel plan. This may take a little while.';
  result.hidden = true;
  try {
    const input = Object.fromEntries(new FormData(form));
    const response = await fetch('/api/recommend', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
    const data = await response.json();
    if (!response.ok) throw Object.assign(new Error(data.error || 'The plan could not be generated.'), { usage: data.usage });
    render(data);
    updateUsage(data.usage);
    status.textContent = `Your Reel plan is ready. ${data.usage.remaining} of ${data.usage.limit} plans left in this browser.`;
  } catch (error) {
    if (error.usage) updateUsage(error.usage);
    status.textContent = error.message || 'The plan could not be generated. Please try again.';
  } finally {
    if (!button.disabled || button.textContent !== 'Five-plan limit reached') { button.disabled = false; button.textContent = 'Find my next Reel ↗'; }
  }
});
$('#menu').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
document.querySelectorAll('.sidebar nav a').forEach(link => link.addEventListener('click', () => $('#sidebar').classList.remove('open')));
loadUsage();
