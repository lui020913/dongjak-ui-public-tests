/** Run after `wrangler d1 create dongjak-seoul-facilities` (not before). */
import {readFile,writeFile} from 'node:fs/promises';
const id=String(process.argv[2]||'').trim();
if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)){
 console.error('사용법: node scripts/configure-seoul-facilities.mjs <D1 database_id (UUID)>');process.exit(1);
}
for(const path of ['wrangler.jsonc','wrangler.seoul-facilities.jsonc']){
  const conf=JSON.parse(await readFile(path,'utf8'));
  const existing=Array.isArray(conf.d1_databases)?conf.d1_databases:[];
  const definition={binding:'SEOUL_FACILITIES_DB',database_name:'dongjak-seoul-facilities',database_id:id};
  conf.d1_databases=[...existing.filter(i=>i.binding!==definition.binding),definition];
  await writeFile(path,JSON.stringify(conf,null,2)+'\n');
  console.log('[설정 완료]',path);
}
console.log('이후 npx wrangler d1 execute dongjak-seoul-facilities --remote --file migrations/0001_seoul_facility_cache.sql');
