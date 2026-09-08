import {mkdir,readFile,writeFile,cp} from 'node:fs/promises';
import './categories.js';
const env={...process.env};
try{for(const line of (await readFile('.env','utf8')).split(/\r?\n/)){const m=line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);if(m && env[m[1]]===undefined)env[m[1]]=m[2].replace(/^(['"])(.*)\1$/,'$2');}}catch(error){if(error.code!=='ENOENT')throw error;}
const url=env.VITE_SUPABASE_URL||'',key=env.VITE_SUPABASE_ANON_KEY||'';
if(Boolean(url)!==Boolean(key))throw new Error('Set both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, or neither for demo.');
if(key.startsWith('sb_secret_'))throw new Error('A secret key must never be included in the frontend. Use a publishable/anon key.');
if(key.split('.').length===3){try{if(JSON.parse(Buffer.from(key.split('.')[1],'base64url')).role==='service_role')throw new Error('Private service-role key rejected.');}catch(error){if(error.message.includes('service-role'))throw error;}}
await mkdir('dist',{recursive:true});
for(const entry of ['index.html','admin','css','js'])await cp(entry,`dist/${entry}`,{recursive:true});
// Relative URLs work at both an account root and /repository/ on GitHub Pages.
for(const entry of ['index.html','admin/index.html']){const prefix=entry.startsWith('admin/')?'../':'./';let html=await readFile(`dist/${entry}`,'utf8');html=html.replaceAll('href="/css/',`href="${prefix}css/`).replaceAll('src="/js/',`src="${prefix}js/`);await writeFile(`dist/${entry}`,html);}
await writeFile('dist/js/env.js',`export const connection=${JSON.stringify({url,key})};\n`);
await writeFile('dist/.nojekyll','');
console.log(`Built static Duck Race in dist/ (${url?'Supabase':'fictional demo'} mode).`);
