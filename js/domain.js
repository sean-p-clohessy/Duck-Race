import {config} from './config.js';
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const learnerName = l => `${l.first_name} ${l.surname_initial}.`;
export function dateKey(date=new Date()) {return new Intl.DateTimeFormat('en-CA',{timeZone:config.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(date));}
export function ranked(rows) {
  const sorted=[...rows].sort((a,b)=>b.total-a.total || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  return sorted.map((r,i)=>({...r,rank:i && r.total===sorted[i-1].total ? sorted.findIndex(s=>s.total===r.total)+1 : i+1}));
}
export function snapshot(data, now=new Date()) {
  const today=dateKey(now), month=today.slice(0,7);
  const active=new Map(data.learners.filter(l=>l.active).map(l=>[l.id,l]));
  const awards=data.awards.filter(a=>active.has(a.learner_id) && dateKey(a.awarded_at)>=config.seasonStart && dateKey(a.awarded_at)<config.seasonEnd && new Date(a.awarded_at)<=now);
  const totals=new Map(), monthly=new Map();
  for(const a of awards){totals.set(a.learner_id,(totals.get(a.learner_id)||0)+1);if(dateKey(a.awarded_at).slice(0,7)===month) monthly.set(a.learner_id,(monthly.get(a.learner_id)||0)+1);}
  const rows=map=>ranked([...map].map(([id,total])=>({id,name:learnerName(active.get(id)),total})));
  return {overall:rows(totals),monthly:rows(monthly),total:awards.length,feed:[...awards].sort((a,b)=>new Date(b.awarded_at)-new Date(a.awarded_at)).slice(0,config.feedSize).map(a=>({id:a.id,name:learnerName(active.get(a.learner_id)),category:a.category,public_message:a.public_message,awarded_at:a.awarded_at}))};
}
export const racePosition=(total,leader)=>Math.max(0,Math.min(100,total/(Math.max(leader,1)+Math.max(3,Math.ceil(leader*.2)))*100));
