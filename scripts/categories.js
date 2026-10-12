import {categories} from '../js/config.js';
import {readFileSync,writeFileSync} from 'node:fs';
const quote=s=>`'${s.replaceAll("'","''")}'`;
const target=new URL('../supabase/categories.sql',import.meta.url);
const content=`-- Generated from js/config.js by pnpm build. Run after schema.sql.\n-- Removed categories stay as inactive history; never delete referenced categories.\nbegin;\nupdate public.award_categories set active=false;\ninsert into public.award_categories(id,name,description,active) values\n${categories.map(c=>`(${quote(c.id)},${quote(c.name)},${quote(c.description)},true)`).join(',\n')}\non conflict(id) do update set name=excluded.name,description=excluded.description,active=true;\ncommit;\n`;
let current='';
try{current=readFileSync(target,'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
if(current!==content)writeFileSync(target,content);
