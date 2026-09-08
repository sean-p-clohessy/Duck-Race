import {config,category} from './config.js';
import {escapeHtml as e,dateKey} from './domain.js';
export function createFeed(){
  let items=[],index=0,paused=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $=s=>document.querySelector(s);
  function render(){
    const item=items[index];
    $('#feed-item').innerHTML=item?`<div class="feed-top"><strong>${e(item.name)} gained a duck</strong><span class="feed-plus">+1 🦆</span></div><p class="feed-category">${e(category(item.category).name.toUpperCase())}</p><p class="feed-message">${e(item.public_message||'A moment worth recognising.')}</p>`:'<p class="empty">The next great moment belongs here.</p>';
    $('#feed-index').textContent=item?`${dateKey(item.awarded_at)===dateKey()?'TODAY':new Date(item.awarded_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:config.timeZone}).toUpperCase()} · ${index+1} / ${items.length}`:'';
    $('#feed-pause').textContent=paused?'▶':'Ⅱ';$('#feed-pause').setAttribute('aria-label',paused?'Play feed':'Pause feed');
    for(const id of ['#feed-prev','#feed-next','#feed-pause'])$(id).disabled=items.length<2;
  }
  function move(direction){if(items.length){index=(index+direction+items.length)%items.length;render();}}
  $('#feed-prev').onclick=()=>move(-1);$('#feed-next').onclick=()=>move(1);$('#feed-pause').onclick=()=>{paused=!paused;render();};
  setInterval(()=>{if(!paused&&!document.hidden&&!$('.feed-content').matches(':hover, :focus-within'))move(1);},config.feedMs);
  return {update(next){const id=items[index]?.id;items=next;index=Math.max(0,items.findIndex(i=>i.id===id));render();}};
}
