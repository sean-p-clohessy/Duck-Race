import {config,categories} from './config.js';
import {isDemo,publicData} from './data.js';
import {escapeHtml as e,ranked,racePosition} from './domain.js';
import {createFeed} from './duck-feed.js';
import {registerRaceTool} from './webmcp.js';
const $=s=>document.querySelector(s);
const display=config.features.displayMode && new URLSearchParams(location.search).get('display')==='true';
document.body.classList.toggle('display-mode',display);
$('#demo-banner').hidden=!isDemo;
$('#department').textContent=config.department;
$('#season').textContent=`${config.academicYear} Championship`;
$('#season-tag').textContent=config.academicYear;
$('#footer-college').textContent=`${config.college} · ${config.department}`;
$('#principle').textContent=config.text.principle;
document.title=`${config.text.title} · ${config.department}`;
$('#display-link').hidden=!config.features.displayMode;
$('#earn').hidden=!config.features.earnSection;
$('#category-grid').innerHTML=categories.map(c=>`<article class="category-card"><span class="category-icon" aria-hidden="true">${c.icon}</span><h3>${e(c.name)}</h3><p>${e(c.description)}</p></article>`).join('');
const feed=createFeed();let data,expanded=false,loading=false,lastSignature;
function standings(){
  const row=r=>`<li><span class="rank">${String(r.rank).padStart(2,'0')}</span><span class="name">${e(r.name)}</span><span class="score">${r.total}<small aria-label="ducks">🦆</small></span></li>`;
  $('#overall-list').innerHTML=data.overall.slice(0,expanded?undefined:5).map(row).join('')||'<li class="empty">The starting line is ready. The first duck could be yours.</li>';
  $('#monthly-list').innerHTML=data.monthly.slice(0,config.monthlySize).map(row).join('')||'<li class="empty">A fresh month. Who will make the first move?</li>';
  $('#expand-standings').hidden=data.overall.length<=5;
  $('#expand-standings').textContent=expanded?'Show top five ↑':`View all ${data.overall.length} learners ↗`;
}
$('#expand-standings').onclick=()=>{expanded=!expanded;standings();};
async function refresh(){
  if(loading)return;loading=true;
  try{
    const next=await publicData();next.overall=ranked(next.overall);next.monthly=ranked(next.monthly);
    const signature=JSON.stringify(next);
    $('#month-heading').textContent=`${new Intl.DateTimeFormat('en-GB',{month:'long',timeZone:config.timeZone}).format(new Date())} leaders`;
    if(signature!==lastSignature){
      const previous=new Map((data?.overall||[]).map(r=>[r.id,racePosition(r.total,data.overall[0]?.total)]));
      data=next;lastSignature=signature;standings();
      $('#total-ducks').textContent=data.total;$('#total-racers').textContent=data.overall.length;
      $('#lanes').innerHTML=data.overall.slice(0,config.raceLanes).map((r,i)=>`<div class="lane" aria-label="Rank ${r.rank}, ${e(r.name)}, ${r.total} ducks"><span class="lane-rank">${String(r.rank).padStart(2,'0')}</span><span class="lane-name">${e(r.name)}${r.rank===1?'<small>RACE LEADER</small>':''}</span><div class="track" style="--position:${previous.get(r.id)??0}%" data-position="${racePosition(r.total,data.overall[0].total)}"><span class="trail"></span><span class="duck-position"><span class="duck" aria-hidden="true">🦆</span></span></div><span class="lane-total">${r.total}<small>DUCKS</small></span></div>`).join('')||'<p class="empty">No ducks awarded yet. Great things start with one.</p>';
      requestAnimationFrame(()=>requestAnimationFrame(()=>document.querySelectorAll('[data-position]').forEach(el=>el.style.setProperty('--position',`${el.dataset.position}%`))));
      feed.update(data.feed);
    }
    $('#connection-error').hidden=true;$('#live-status').textContent=isDemo?'● DEMO':'● LIVE';
    $('#live-status').title=`Updated ${new Date().toLocaleTimeString('en-GB')}`;
  }catch(error){$('#connection-error').hidden=false;$('#connection-error').textContent=`Unable to refresh the race. ${data?'Showing the last successful update. ':''}We’ll retry automatically.`;$('#live-status').textContent='● OFFLINE';console.error(error);}
  finally{loading=false;}
}
refresh();setInterval(refresh,config.refreshMs);window.addEventListener('storage',refresh);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
registerRaceTool(async()=>{if(!data)throw new Error('The race has not loaded yet.');return {demo:isDemo,academicYear:config.academicYear,...data};});
