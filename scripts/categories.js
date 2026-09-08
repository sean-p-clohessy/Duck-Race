import {categories} from '../js/config.js';
import {writeFileSync} from 'node:fs';
const quote=s=>`'${s.replaceAll("'","''")}'`;
writeFileSync(new URL('../supabase/categories.sql',import.meta.url),`-- Generated from js/config.js by pnpm build. Run after schema.sql.\n-- Removed categories stay as inactive history; never delete referenced categories.\nbegin;\nupdate public.award_categories set active=false;\ninsert into public.award_categories(id,name,description,active) values\n${categories.map(c=>`(${quote(c.id)},${quote(c.name)},${quote(c.description)},true)`).join(',\n')}\non conflict(id) do update set name=excluded.name,description=excluded.description,active=true;\ncommit;\n`);
