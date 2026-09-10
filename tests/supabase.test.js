import test from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '../js/supabase.js';
const memory=new Map();
globalThis.sessionStorage={getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value),removeItem:key=>memory.delete(key)};
function setup(responses){memory.clear();const calls=[];globalThis.fetch=async(url,options)=>{calls.push({url,options});const item=responses.shift();if(item instanceof Error)throw item;assert(item,'Unexpected HTTP request');return new Response(item.body===null?null:JSON.stringify(item.body),{status:item.status||200});};return calls;}
const session=(expires=3600)=>({access_token:'test-access',refresh_token:'test-refresh',expires_in:expires,user:{id:'staff-id'}});
test('password sign-in, authorised REST calls, and logout use proper headers and tab storage',async()=>{
  const calls=setup([{body:session()},{body:[{id:'staff-id',role:'admin'}]},{status:204,body:null}]);const client=createClient('https://example.supabase.co','public-key');
  const result=await client.auth.signInWithPassword({email:'staff@example.test',password:'test-password'});assert.equal(result.error,null);assert.equal(memory.size,1);
  const profile=await client.from('staff').select('*').eq('id','staff-id').maybeSingle();assert.equal(profile.data.role,'admin');assert.equal(calls[1].options.headers.Authorization,'Bearer test-access');assert.equal(calls[1].options.headers.apikey,'public-key');assert(!calls[1].url.includes('test-access'));
  await client.auth.signOut();assert.equal(memory.size,0);assert(calls[2].url.includes('/auth/v1/logout?scope=local'));
});
test('expired sessions refresh once before accessing records',async()=>{
  const calls=setup([{body:session(-1)},{body:{...session(),access_token:'refreshed-token'}},{body:[]},{body:[]}]);const client=createClient('https://example.supabase.co','public-key');await client.auth.signInWithPassword({email:'e',password:'p'});
  await Promise.all([client.from('learners').select(),client.from('duck_awards').select()]);assert.equal(calls.filter(c=>c.url.includes('grant_type=refresh_token')).length,1);assert.equal(calls[2].options.headers.Authorization,'Bearer refreshed-token');
});
test('invalid refresh signs out and never submits a mutation',async()=>{
  const calls=setup([{body:session(-1)},{status:400,body:{msg:'Invalid refresh token'}}]);const client=createClient('https://example.supabase.co','public-key');let signedOut=false;client.auth.onAuthStateChange(e=>{if(e==='SIGNED_OUT')signedOut=true;});await client.auth.signInWithPassword({email:'e',password:'p'});
  await assert.rejects(async()=>await client.from('duck_awards').insert({}),/Invalid refresh/);assert(signedOut);assert.equal(memory.size,0);assert.equal(calls.length,2);
});
test('public race uses only anonymous key even with a staff session',async()=>{
  const calls=setup([{body:session()},{body:{overall:[],monthly:[],feed:[],total:0}}]);const client=createClient('https://example.supabase.co','public-key');await client.auth.signInWithPassword({email:'e',password:'p'});await client.rpc('public_race',{season_start:'2026-08-01',season_end:'2027-08-01'});assert.equal(calls[1].options.headers.Authorization,'Bearer public-key');
});
test('admin RPCs use the signed-in staff session',async()=>{const calls=setup([{body:session()},{body:true}]);const client=createClient('https://example.supabase.co','public-key');await client.auth.signInWithPassword({email:'e',password:'p'});await client.rpc('delete_learner',{target_id:'learner-id'},{authenticated:true});assert.equal(calls[1].options.headers.Authorization,'Bearer test-access');assert.deepEqual(JSON.parse(calls[1].options.body),{target_id:'learner-id'});});
test('REST filtering, pagination and writes preserve request data',async()=>{
  const calls=setup([{body:[]},{body:null},{status:409,body:{code:'23505',message:'duplicate'}}]);const client=createClient('https://example.supabase.co','public-key');
  await client.from('learners').select('*').order('first_name').order('id').range(500,999);const url=new URL(calls[0].url);assert.equal(url.searchParams.get('offset'),'500');assert.equal(url.searchParams.get('limit'),'500');assert.equal(url.searchParams.get('order'),'first_name.asc,id.asc');
  await client.from('learners').update({active:false}).eq('id','test');assert.equal(calls[1].options.method,'PATCH');assert.equal(JSON.parse(calls[1].options.body).active,false);
  const failure=await client.from('duck_awards').insert({id:'same'});assert.equal(failure.error.code,'23505');
});
test('network failures return errors without replaying a write',async()=>{const calls=setup([new Error('offline')]);const client=createClient('https://example.supabase.co','public-key');const result=await client.from('duck_awards').insert({id:'one'});assert.match(result.error.message,/connection/);assert.equal(calls.length,1);});
test('rejects non-HTTPS remote backend',()=>assert.throws(()=>createClient('http://example.com','key'),/HTTPS/));
test('publishable keys are sent as apikey, not as a JWT bearer',async()=>{const calls=setup([{body:{overall:[],monthly:[],feed:[],total:0}}]);const client=createClient('https://example.supabase.co','sb_publishable_test');await client.rpc('public_race',{});assert.equal(calls[0].options.headers.apikey,'sb_publishable_test');assert(!('Authorization' in calls[0].options.headers));});
test('staff function and password update use the signed-in staff session',async()=>{const calls=setup([{body:session()},{body:{staff:[]}},{body:{id:'staff-id'}}]);const client=createClient('https://example.supabase.co','public-key');await client.auth.signInWithPassword({email:'e',password:'p'});await client.functions.invoke('manage-staff',{body:{action:'list'}});await client.auth.updateUser({password:'new-password',current_password:'old-password'});assert(calls[1].url.endsWith('/functions/v1/manage-staff'));assert.equal(calls[1].options.headers.Authorization,'Bearer test-access');assert.deepEqual(JSON.parse(calls[1].options.body),{action:'list'});assert.equal(calls[2].options.method,'PUT');assert(calls[2].url.endsWith('/auth/v1/user'));assert.deepEqual(JSON.parse(calls[2].options.body),{password:'new-password',current_password:'old-password'});});
