// Small REST adapter for the Supabase Auth and PostgREST endpoints used by V1.
// Tokens are scoped to a browser tab and never put in URLs. Database RLS is the
// authority; having a session or changing frontend code does not grant staff access.
export function createClient(url,key){
  const origin=new URL(url);if(origin.protocol!=='https:' && !['localhost','127.0.0.1'].includes(origin.hostname))throw new Error('Supabase must use HTTPS.');
  const base=url.replace(/\/$/,''),storageKey=`duck-staff-session:${origin.hostname}`,listeners=new Set();
  let session=null,refreshing=null;
  try{session=JSON.parse(sessionStorage.getItem(storageKey)||'null');}catch{}
  function store(next){session=next;try{if(next)sessionStorage.setItem(storageKey,JSON.stringify(next));else sessionStorage.removeItem(storageKey);}catch{}}
  function emit(event){listeners.forEach(fn=>fn(event,session));}
  async function request(path,{method='GET',body,token=key,headers={}}={}){
    try{
      const authorization=token?.startsWith('sb_publishable_')?{}:{Authorization:`Bearer ${token}`};
      const response=await fetch(`${base}${path}`,{method,headers:{apikey:key,...authorization,'Content-Type':'application/json',...headers},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
      const text=await response.text();let data;try{data=text?JSON.parse(text):null;}catch{data=null;}
      if(!response.ok)return {data:null,error:{message:data?.msg||data?.message||data?.error_description||`Request failed (${response.status}).`,code:data?.code,status:response.status}};
      return {data,error:null};
    }catch(error){return {data:null,error:{message:error.name==='TimeoutError'?'The request timed out. Please retry.':'Cannot reach the service. Check your connection.'}};}
  }
  async function accessToken(){
    if(!session)return key;
    if(session.expires_at*1000>Date.now()+60000)return session.access_token;
    if(!refreshing)refreshing=(async()=>{
      const result=await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:session.refresh_token}});
      if(result.error){if(result.error.status===400||result.error.status===401){store(null);emit('SIGNED_OUT');}throw new Error(result.error.message);}
      store({...result.data,expires_at:result.data.expires_at||Math.floor(Date.now()/1000)+result.data.expires_in});
      return session.access_token;
    })().finally(()=>refreshing=null);
    return refreshing;
  }
  const auth={
    acceptInviteFromUrl(){const hash=new URLSearchParams(location.hash.slice(1)),access_token=hash.get('access_token'),refresh_token=hash.get('refresh_token');if(!access_token||!refresh_token)return false;store({access_token,refresh_token,expires_in:Number(hash.get('expires_in')||3600),expires_at:Math.floor(Date.now()/1000)+Number(hash.get('expires_in')||3600),token_type:'bearer'});history.replaceState(null,'',location.pathname+location.search);emit('SIGNED_IN');return hash.get('type')==='invite'||new URLSearchParams(location.search).get('invite')==='1';},
    async signInWithPassword(credentials){const result=await request('/auth/v1/token?grant_type=password',{method:'POST',body:credentials});if(!result.error){store({...result.data,expires_at:result.data.expires_at||Math.floor(Date.now()/1000)+result.data.expires_in});emit('SIGNED_IN');}return result;},
    async updateUser(attributes){try{const result=await request('/auth/v1/user',{method:'PUT',body:attributes,token:await accessToken()});return {data:{user:result.data},error:result.error};}catch(error){return {data:{user:null},error};}},
    async getUser(){try{if(!session)return {data:{user:null},error:null};const result=await request('/auth/v1/user',{token:await accessToken()});if(result.error?.status===401){store(null);emit('SIGNED_OUT');}return {data:{user:result.data},error:result.error};}catch(error){return {data:{user:null},error};}},
    async signOut(){try{const token=await accessToken();if(session){const result=await request('/auth/v1/logout?scope=local',{method:'POST',token});if(result.error&&result.error.status!==401)return result;}return {error:null};}finally{store(null);emit('SIGNED_OUT');}},
    onAuthStateChange(callback){listeners.add(callback);return {data:{subscription:{unsubscribe:()=>listeners.delete(callback)}}};}
  };
  function from(table){
    let method='GET',body,maybeSingle=false;const params=new URLSearchParams(),headers={};
    const query={
      select(columns='*'){params.set('select',columns);if(method!=='GET')headers.Prefer='return=representation';return query;},
      eq(column,value){params.set(column,`eq.${value}`);return query;},
      order(column){params.set('order',[params.get('order'),`${column}.asc`].filter(Boolean).join(','));return query;},
      range(start,end){params.set('offset',start);params.set('limit',end-start+1);return query;},
      maybeSingle(){maybeSingle=true;return query;},
      insert(value){method='POST';body=value;return query;},
      update(value){method='PATCH';body=value;return query;},
      delete(){method='DELETE';return query;},
      async then(resolve,reject){try{const result=await request(`/rest/v1/${encodeURIComponent(table)}?${params}`,{method,body,headers,token:await accessToken()});if(maybeSingle&&!result.error){if(result.data.length>1)result.error={message:'Multiple matching records.'};result.data=result.data[0]||null;}return resolve(result);}catch(error){return reject?reject(error):Promise.reject(error);}}
    };return query;
  }
  return {auth,from,functions:{async invoke(name,{body}={}){try{return await request(`/functions/v1/${encodeURIComponent(name)}`,{method:'POST',body,token:await accessToken()});}catch(error){return {data:null,error};}}},async rpc(name,args){return request(`/rest/v1/rpc/${encodeURIComponent(name)}`,{method:'POST',body:args});}};
}
