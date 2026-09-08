import {config} from './config.js';
import {snapshot} from './domain.js';
import {createDemo,demoKey} from './demo.js';
import {connection} from './env.js';
const {url,key}=connection;
export const isDemo=!url && !key;
let client;
export async function db(){
  if(isDemo) return null;
  if(!url || !key) throw new Error('Supabase configuration is incomplete. Set both public connection values.');
  if(!client){const {createClient}=await import('./supabase.js');client=createClient(url,key);}
  return client;
}
export function demoData(){try{const raw=localStorage.getItem(demoKey);if(raw)return JSON.parse(raw);}catch{}const data=createDemo();try{saveDemo(data);}catch{}return data;}
function saveDemo(data){localStorage.setItem(demoKey,JSON.stringify(data));}
function check({data,error}){if(error)throw error;return data;}
export async function publicData(){
  if(isDemo)return snapshot(demoData());
  return check(await (await db()).rpc('public_race',{season_start:config.seasonStart,season_end:config.seasonEnd,feed_limit:config.feedSize}));
}
export async function staffProfile(){
  if(isDemo)return null;
  const s=await db();const {data:{user},error}=await s.auth.getUser();if(error||!user)return null;
  return check(await s.from('staff').select('*').eq('id',user.id).eq('active',true).maybeSingle());
}
export async function staffData(){
  if(isDemo)return demoData();
  const s=await db();
  // Page through records rather than silently losing awards at the API row limit.
  async function all(table,order){const rows=[];for(let start=0;;start+=500){const page=check(await s.from(table).select('*').order(order).order('id').range(start,start+499));rows.push(...page);if(page.length<500)return rows;}}
  const [learners,awards]=await Promise.all([all('learners','first_name'),all('duck_awards','awarded_at')]);return {learners,awards};
}
export async function awardDuck(learnerId,category,message,staffId,id){
  const award={id,learner_id:learnerId,category,public_message:message.trim()||null,staff_id:staffId};
  if(isDemo){const d=demoData();if(!d.awards.some(a=>a.id===id))d.awards.push({...award,awarded_at:new Date().toISOString(),created_at:new Date().toISOString()});saveDemo(d);return;}
  const result=await (await db()).from('duck_awards').insert(award);if(result.error?.code!=='23505')check(result);
}
export async function deleteAward(id){if(isDemo){const d=demoData();d.awards=d.awards.filter(a=>a.id!==id);saveDemo(d);}else {const rows=check(await (await db()).from('duck_awards').delete().eq('id',id).select());if(!rows?.length)throw new Error('This award is already removed, or you no longer have administrator access.');}}
export async function saveLearner(learner){
  if(isDemo){const d=demoData();const i=d.learners.findIndex(l=>l.id===learner.id);if(i<0)d.learners.push({...learner,id:crypto.randomUUID(),created_at:new Date().toISOString()});else d.learners[i]={...d.learners[i],...learner};saveDemo(d);return;}
  const s=await db();const rows=check(await (learner.id?s.from('learners').update(learner).eq('id',learner.id):s.from('learners').insert(learner)).select());if(!rows?.length)throw new Error('No learner was saved. Check your administrator access.');
}
export async function manageStaff(action,payload={}){
  if(isDemo)throw new Error('Staff invitations are available on the live site.');
  return check(await (await db()).functions.invoke('manage-staff',{body:{action,...payload}}));
}
