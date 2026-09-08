import {createClient} from 'npm:@supabase/supabase-js@2';

const allowedOrigins=new Set(['https://sean-p-clohessy.github.io']);
const localOrigin=(origin:string|null)=>Boolean(origin&&/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));
const cors=(origin:string|null)=>({'Access-Control-Allow-Origin':origin&&(allowedOrigins.has(origin)||localOrigin(origin))?origin:'https://sean-p-clohessy.github.io','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'});
const json=(body:unknown,status=200,origin:string|null=null)=>new Response(JSON.stringify(body),{status,headers:{...cors(origin),'Content-Type':'application/json'}});
const secretKey=()=>{const modern=Deno.env.get('SUPABASE_SECRET_KEYS');if(modern){const keys=JSON.parse(modern);return Object.values(keys)[0] as string;}return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';};

Deno.serve(async req=>{
  const origin=req.headers.get('origin');
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors(origin)});
  if(req.method!=='POST')return json({message:'Method not allowed.'},405,origin);
  if(origin&&!allowedOrigins.has(origin)&&!localOrigin(origin))return json({message:'Origin not allowed.'},403,origin);
  try{
    const url=Deno.env.get('SUPABASE_URL')||'',secret=secretKey(),token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'')||'';
    if(!url||!secret||!token)return json({message:'Authentication is required.'},401,origin);
    const admin=createClient(url,secret,{auth:{autoRefreshToken:false,persistSession:false}});
    const {data:{user},error:userError}=await admin.auth.getUser(token);
    if(userError||!user)return json({message:'Your session is no longer valid. Sign in again.'},401,origin);
    const {data:caller}=await admin.from('staff').select('id,role,active').eq('id',user.id).maybeSingle();
    if(!caller?.active||caller.role!=='admin')return json({message:'Administrator access is required.'},403,origin);
    const body=await req.json(),action=body?.action;
    if(action==='list'){
      const {data,error}=await admin.from('staff').select('id,name,email,role,active').order('name');
      if(error)throw error;
      return json({staff:data},200,origin);
    }
    if(action==='invite'){
      const name=String(body.name||'').trim(),email=String(body.email||'').trim().toLowerCase();
      if(name.length<2||name.length>80)return json({message:'Enter a display name between 2 and 80 characters.'},400,origin);
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)return json({message:'Enter a valid staff email address.'},400,origin);
      const {data:users,error:listError}=await admin.auth.admin.listUsers({page:1,perPage:1000});
      if(listError)throw listError;
      let invited=users.users.find(item=>item.email?.toLowerCase()===email);
      if(!invited){
        const result=await admin.auth.admin.inviteUserByEmail(email,{redirectTo:'https://sean-p-clohessy.github.io/Duck-Race/admin/?invite=1',data:{display_name:name}});
        if(result.error)throw result.error;
        invited=result.data.user;
      }
      if(!invited)return json({message:'The invitation could not be created.'},500,origin);
      const {data:staff,error}=await admin.from('staff').upsert({id:invited.id,name,email,role:'staff',active:true},{onConflict:'id'}).select('id,name,email,role,active').single();
      if(error)throw error;
      return json({staff,invited:!users.users.some(item=>item.id===invited!.id)},200,origin);
    }
    if(action==='set-active'){
      const staffId=String(body.staffId||''),active=body.active;
      if(staffId===user.id)return json({message:'You cannot pause your own administrator account.'},400,origin);
      if(!/^[0-9a-f-]{36}$/i.test(staffId)||typeof active!=='boolean')return json({message:'Invalid staff update.'},400,origin);
      const {data,error}=await admin.from('staff').update({active}).eq('id',staffId).eq('role','staff').select('id,name,email,role,active').maybeSingle();
      if(error)throw error;
      if(!data)return json({message:'Only staff access can be changed here. Manage administrators in Supabase.'},400,origin);
      return json({staff:data},200,origin);
    }
    return json({message:'Unknown staff action.'},400,origin);
  }catch(error){return json({message:error instanceof Error?error.message:'Staff management failed.'},500,origin);}
});
