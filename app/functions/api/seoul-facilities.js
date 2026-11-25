import {facilitySearchTerms,facilityCategorySearchTerms,normalizeFacilityRecord} from '../../src/facility-display-names.js';
/** Read-only query for Dongjak official public POIs. No Seoul API key is sent to browsers. */
const reply=(body,status=200,cache='public, max-age=120')=>Response.json(body,{status,headers:{'Cache-Control':cache,'X-Content-Type-Options':'nosniff'}});
const finite=s=>{const n=Number(s);return Number.isFinite(n)?n:null;};
export async function onRequestGet({request,env}){
 const db=env.SEOUL_FACILITIES_DB;
 if(!db)return reply({ok:false,configured:false,places:[],message:'서울시 시설 데이터베이스가 연결되지 않았습니다.'},503,'no-store');
 try{
   const u=new URL(request.url),params=u.searchParams;
   const max=Number(params.get('limit')||1500),offset=Number(params.get('offset')||0);
   if(!Number.isSafeInteger(max)||max<1||max>2000||!Number.isSafeInteger(offset)||offset<0||offset>100000)
     return reply({ok:false,message:'limit 또는 offset 값이 올바르지 않습니다.'},400,'no-store');
   const category=params.get('category')||'',q=(params.get('q')||'').trim();
   const allowed=['','약국','동물약국','음식점','카페','휴게음식점','편의점'];
   if(!allowed.includes(category)||q.length>80)return reply({ok:false,message:'검색 조건이 올바르지 않습니다.'},400,'no-store');
   const args=[],predicates=[];
   if(category){predicates.push('category=?');args.push(category);}
   if(q.length>=2){
     const terms=facilitySearchTerms(q);
     const categoryTerms=facilityCategorySearchTerms(q);
     const like=t=>'%'+t.replace(/[\\%_]/g,'\\$&')+'%';
     const compact=t=>like(t.replace(/\s+/g,''));
     predicates.push('('+terms.map(()=>"(name LIKE ? ESCAPE '\\' OR replace(name,' ','') LIKE ? ESCAPE '\\')").join(' OR ')+" OR category LIKE ? ESCAPE '\\')");
     for(const term of terms)args.push(like(term),compact(term));
     args.push(like(q));
     if(categoryTerms.length){
       const last=predicates.length-1;
       predicates[last]='('+predicates[last]+' OR category IN ('+categoryTerms.map(()=>'?').join(',')+'))';
       args.push(...categoryTerms);
     }
   }
   const bbox=params.get('bbox');
   if(bbox){
     const nums=bbox.split(',').map(finite);
     if(nums.length!==4||nums.some(n=>n===null)||nums[0]>=nums[2]||nums[1]>=nums[3]
       ||nums[0]<126.5||nums[2]>127.3||nums[1]<37.2||nums[3]>37.8)
       return reply({ok:false,message:'bbox는 서울시 범위의 west,south,east,north 형식이어야 합니다.'},400,'no-store');
     predicates.push('lng BETWEEN ? AND ? AND lat BETWEEN ? AND ?');args.push(nums[0],nums[2],nums[1],nums[3]);
   }
   const where=predicates.length?' WHERE '+predicates.join(' AND '):'';
   const stmt=db.prepare('SELECT id,name,category,lng,lat,address,phone,website,source,updated FROM seoul_facilities'+where+' ORDER BY category,name,id LIMIT ? OFFSET ?');
   const result=await stmt.bind(...args,max,offset).all();
   const status=await db.prepare('SELECT source_id,last_success,row_count,received_count,status FROM seoul_facility_sync ORDER BY source_id').all();
   return reply({ok:true,configured:true,places:(result.results||[]).map(normalizeFacilityRecord),sync:status.results||[],hasMore:(result.results?.length||0)===max});
 }catch(error){console.error('[서울시 시설 조회]',String(error?.message||error).slice(0,160));return reply({ok:false,message:'저장된 서울시 시설 데이터를 읽지 못했습니다.',places:[]},503,'no-store');}
}
