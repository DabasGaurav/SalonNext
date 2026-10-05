const $=selector=>document.querySelector(selector);
const form=$('#planner'), rows=$('#post-rows'), statusEl=$('#status'), resultEl=$('#result');
const demoMode=new URLSearchParams(location.search).get('demo')==='1';
if(demoMode){$('#demo-notice').hidden=false;$('#posts-source').textContent='fictional sample data';$('#history-heading').textContent='Sample post history.';$('#post-hint').textContent='These are fictional sample posts for the classroom demo. A dash means a metric was intentionally left unavailable; it does not mean zero.';}
let connectedPosts=[];
$('#menu').addEventListener('click',()=>$('.sidebar').classList.toggle('open'));
document.querySelectorAll('.sidebar nav a').forEach(a=>a.addEventListener('click',()=>$('.sidebar').classList.remove('open')));
$('#sign-out').addEventListener('click',async()=>{if(!demoMode)await fetch('/api/auth/logout',{method:'POST'});location.href=demoMode?'/':'/login.html';});
function escapeHTML(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function rates(){return connectedPosts.map(p=>({...p,rate:p.reach>0&&['likes','comments','saves','shares'].every(k=>p[k]!==null&&p[k]!==undefined)?(p.likes+p.comments+p.saves+p.shares)/p.reach:null}));}
function updateMetrics(){const p=rates(),scored=p.filter(x=>x.rate!==null).sort((a,b)=>a.rate-b.rate);$('#metric-posts').textContent=p.length;$('#metric-engagement').textContent=scored.length?`${(((scored[Math.floor((scored.length-1)/2)].rate+scored[Math.floor(scored.length/2)].rate)/2)*100).toFixed(1)}%`:'—';$('#metric-angle').textContent=scored.length?(scored[scored.length-1].caption||'Uncaptioned post').slice(0,36):p.length?'Insights unavailable':'No posts yet';}
const draftKey=demoMode?'salonnext_demo_draft':'salonnext_draft';
function saveDraft(){const fd=new FormData(form);localStorage.setItem(draftKey,JSON.stringify(Object.fromEntries(fd.entries())));}
form.addEventListener('input',saveDraft);
if(demoMode&&!localStorage.getItem(draftKey)){
  for(const [key,value] of Object.entries({salon_name:'Saffron Studio (sample)',location:'Mumbai',audience:'Local working women',services:'Haircuts, hair repair, bridal styling'}))form.elements[key].value=value;
}
try{const draft=JSON.parse(localStorage.getItem(draftKey)||'null');for(const [key,value] of Object.entries(draft||{}))if(form.elements[key])form.elements[key].value=value;}catch{}
async function syncInstagram(){
  $('#sync-status').textContent=demoMode?'Loading fictional sample posts…':'Reading your recent posts and available Instagram insights…';
  try{
    const response=await fetch(demoMode?'/api/demo-data':'/api/instagram',{cache:'no-store'});
    if(response.status===401){location.replace('/login.html?error=authorization');return;}
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||'Instagram data unavailable.');
    const name=demoMode?'Sample salon':'@'+data.account.username;
    $('#signed-in').textContent=name;$('#avatar').textContent=demoMode?'S':data.account.username.charAt(0).toUpperCase();
    if(demoMode){$('.side-foot small').textContent='Illustrative demo';$('#refresh-posts').textContent='Reload sample posts';$('#sign-out').title='Exit demo';}
    connectedPosts=data.posts||[];
    rows.innerHTML=connectedPosts.map(p=>`<tr><td>${p.permalink?`<a href="${escapeHTML(p.permalink)}" target="_blank" rel="noopener noreferrer">${escapeHTML((p.caption||'Uncaptioned post').slice(0,90))}</a>`:escapeHTML((p.caption||'Uncaptioned post').slice(0,90))}</td>${['reach','likes','comments','saves','shares'].map(k=>`<td>${p[k]??'—'}</td>`).join('')}</tr>`).join('')||'<tr><td colspan="6">No posts were returned by Instagram.</td></tr>';
    $('#sync-status').textContent=demoMode?`Sample data: ${connectedPosts.length} fictional posts; ${data.measured_posts} have complete metrics. No real Instagram account is connected.`:`Loaded ${connectedPosts.length} recent posts from ${name}; ${data.captioned_posts} ${data.captioned_posts===1?'has a caption':'have captions'} and ${data.measured_posts} have complete engagement metrics. Missing values appear as a dash.`;
    updateMetrics();
  }catch(error){$('#sync-status').textContent=error.message;statusEl.innerHTML=demoMode?'Sample data could not load. Refresh this page.':'Instagram sync failed. <a href="/api/auth/start">Reconnect Instagram</a> or refresh this page.';}
}
$('#refresh-posts').addEventListener('click',syncInstagram);
syncInstagram();
function safeLink(url){try{const u=new URL(url);return ['https:','http:'].includes(u.protocol)?u.href:null;}catch{return null;}}
function renderResult(data){const x=data.recommendation||{}, analytics=data.analytics||{}, research=data.research||{};const sources=(research.sources||[]).map(s=>{const href=safeLink(s.url);return href?`<a href="${escapeHTML(href)}" target="_blank" rel="noopener noreferrer">${escapeHTML(s.title||new URL(href).hostname)} ↗</a>`:'';}).join('');const scoreText=Object.entries(x.scores||{}).map(([key,value])=>`<span class="score">${escapeHTML(key.replaceAll('_',' '))} · ${Math.round(Number(value)*100)}%</span>`).join('');const storyboard=Array.isArray(x.storyboard)?x.storyboard.join(' • '):x.storyboard;
  resultEl.innerHTML=`<div class="result-head"><div><p class="eyebrow">Your next move · ${escapeHTML(x.format||'Reel')}</p><h2>${escapeHTML(x.title||'Your next Reel')}</h2><p>${escapeHTML(x.angle||'')}</p></div><span class="badge">${escapeHTML(x.effort||'Film this week')}</span></div><div class="evidence"><article><small>Why this fits your salon</small><p>${escapeHTML(x.why_you||'')}</p></article><article><small>Why now</small><p>${escapeHTML(x.why_now||'')}</p></article></div><div class="research-card"><small>Competitor angle</small><p>${escapeHTML(x.competitor_gap||"No verified comparable salon observation was available.")}</p></div><p class="hint">Fit scores are heuristic; expected engagement uses a neutral 50% prior, not a prediction.</p><div class="scores">${scoreText}</div><div class="content-grid"><div class="content-block"><small>Hook · first 3 seconds</small><p>${escapeHTML(x.hook||'')}</p></div><div class="content-block"><small>Spoken script</small><p>${escapeHTML(x.script||'')}</p></div><div class="content-block wide"><small>Shot-by-shot plan</small><p>${escapeHTML(storyboard||'')}</p></div><div class="content-block"><small>Caption</small><p>${escapeHTML(x.caption||'')}</p></div><div class="content-block"><small>Call to action</small><p>${escapeHTML(x.cta||'')}</p></div></div><div class="research-card"><small>Evidence receipt</small><p>${escapeHTML(x.evidence_note||research.summary||'')}</p>${sources?`<div class="source-list">${sources}</div>`:''}<p class="hint">${escapeHTML(analytics.summary||'')}</p></div>${(data.alternatives||[]).length?`<div class="alternate"><h3>Other angles considered</h3><ul>${data.alternatives.map(a=>`<li>${escapeHTML(a.title)} — ${escapeHTML(a.angle)}</li>`).join('')}</ul></div>`:''}`;
  resultEl.hidden=false;resultEl.scrollIntoView({behavior:'smooth',block:'start'});$('#metric-total').textContent=data.usage?.total_requests??'—';
}
form.addEventListener('submit',async event=>{event.preventDefault();if(!form.reportValidity())return;const button=$('#generate');button.disabled=true;button.textContent='Researching and ranking…';statusEl.textContent='Reading post patterns, checking niche signals and preparing your filming plan. This can take a little while.';resultEl.hidden=true;const fd=new FormData(form);const input={...Object.fromEntries(fd.entries()),demo:demoMode};try{const response=await fetch('/api/recommend',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});const data=await response.json();if(response.status===401){location.href='/login.html?error=authorization';return;}if(!response.ok)throw new Error(data.error||'Unable to make a recommendation.');renderResult(data);statusEl.textContent=`Recommendation ready · ${data.usage?.requests_remaining??0} demo requests left for this ${demoMode?'browser':'Instagram account'}.`;}catch(error){statusEl.textContent=error.message||'Unable to generate. Please try again.';}finally{button.disabled=false;button.textContent='Find my next Reel ↗';}});
fetch('/api/recommend').then(r=>r.json()).then(d=>{$('#metric-total').textContent=d.total_requests??'—';}).catch(()=>{});
