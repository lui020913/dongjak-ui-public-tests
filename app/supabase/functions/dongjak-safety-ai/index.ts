import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2.57.0";
import {explanationMode,protectionSubtype,matchesProtectionSubtype,evidenceAnswer} from "./answer-policy.mjs";

const headers={"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"};

const STOP=new Set(["동작구","상도1동","상도동","서울시","서울","어디","어떤","알려줘","알려주세요","찾아줘","보여줘","있어","있나요","위치","근처","주변","정보","관련","하고","대한","지도"]);
const DICTIONARY:[RegExp,string[]][]=[
  [/사고|다발|충돌|위험/,["사고","다발","보행자"]],
  [/어린이|아이|학생|통학|초등학교|유치원|어린이집/,["어린이","보호구역","학교"]],
  [/노인|어르신|고령|경로당|요양/,["노인","보호구역"]],
  [/보호구역|안전구역/,["보호구역"]],
  [/리치타운/,["리치타운"]],
  [/주민센터/,["주민센터"]],
  [/숭실대/,["숭실대"]]
];
const UNSUPPORTED=/경사|완만|휠체어|무장애|최단|최적|안전한\s*길|안전경로|길찾기|이동경로|결빙|빙결|조도|밝은\s*길|가장\s*안전/;
const CONCEPT:Record<string,string>={
  protection_zone:"designated pedestrian protection zone around a school kindergarten or senior care facility",
  accident_hotspot:"official statistical area with aggregated historical pedestrian traffic accident records"
};
function extract(q:string):string[]{
  const set=new Set<string>();
  for(const [re,terms] of DICTIONARY)if(re.test(q))for(const term of terms)set.add(term);
  for(const word of q.replace(/[^\p{L}\p{N}]+/gu," ").split(/\s+/)){
    const token=word.replace(/(?:에서는|에서|으로|에게|까지|부터|을|를|은|는|이|가|에|의|와|과)$/u,"");
    if(token.length>=2&&token.length<=30&&!STOP.has(token))set.add(token);
  }
  return [...set].slice(0,15);
}
function intent(q:string){
  if(/사고|다발|충돌/.test(q)&&!/보호구역|통학/.test(q))return "accident_hotspot";
  if(/보호구역|통학|유치원|초등학교/.test(q)&&!/사고|다발/.test(q))return "protection_zone";
  return null;
}
const cosine=(a:number[],b:number[])=>{
  let dot=0,aa=0,bb=0;
  for(let i=0;i<a.length;i++){dot+=a[i]*b[i];aa+=a[i]*a[i];bb+=b[i]*b[i];}
  return dot/(Math.sqrt(aa)*Math.sqrt(bb)||1);
};
function englishIntent(q:string):string {
  if(/사고|다발|충돌|위험/.test(q))return CONCEPT.accident_hotspot;
  if(/어린이|학생|통학|유치원|보호구역|노인|어르신|경로당/.test(q))return CONCEPT.protection_zone;
  return "public pedestrian safety evidence, designated school zones and historical accident statistics";
}
Deno.serve(async(req:Request)=>{
  const origin=req.headers.get("origin");
  const trusted=!!origin&&(
    /^https:\/\/(?:[a-z0-9-]+\.)?dongjak-walk-safety-preview\.pages\.dev$/i.test(origin)||
    /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(origin)
  );
  const cors=trusted?{"access-control-allow-origin":origin!,"vary":"Origin"}:{};
  const send=(payload:unknown,status=200)=>new Response(JSON.stringify(payload),{status,headers:{...headers,...cors}});
  if(req.method==="OPTIONS")return new Response(null,{status:trusted?204:403,headers:{...cors,"access-control-allow-methods":"POST,OPTIONS","access-control-allow-headers":"authorization,apikey,content-type,x-client-info"}});
  if(req.method!=="POST")return send({message:"POST만 지원합니다."},405);
  if(origin&&!trusted)return send({message:"허용되지 않은 출처입니다."},403);
  if(!/application\/json/i.test(req.headers.get("content-type")||""))return send({message:"JSON만 지원합니다."},415);
  if(Number(req.headers.get("content-length")||0)>1500)return send({message:"요청이 너무 깁니다."},413);
  let body:{query?:unknown;explanation?:unknown};
  try{const raw=await req.text();if(raw.length>1500)return send({message:"요청 크기 초과"},413);body=JSON.parse(raw);}catch{return send({message:"질문 형식을 확인해 주세요."},400);}
  const query=typeof body?.query==="string"?body.query.trim().replace(/[\u0000-\u001f]/g," "):"";
  if(query.length<2||query.length>220)return send({message:"2~220자 질문을 입력해 주세요."},400);
  const token=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
  if(token.length<15)return send({message:"로그인 후 AI 검색을 이용할 수 있습니다."},401);
  const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_ANON_KEY")||Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if(!url||!key)return send({message:"Supabase 서버 설정을 확인해야 합니다."},503);
  const client=createClient(url,key,{global:{headers:{Authorization:"Bearer "+token}},auth:{autoRefreshToken:false,persistSession:false}});
  const {data:auth,error:authError}=await client.auth.getUser(token);
  if(authError||!auth?.user)return send({message:"로그인 정보가 만료됐습니다. 다시 로그인해 주세요."},401);
  const disclaimer="공식 자료의 보호구역 지정 기록과 사고다발지역 통계만 조회합니다. 안전등급·실제 도로 경사도·보행 접근성은 추정하지 않습니다.";
  if(UNSUPPORTED.test(query))return send({query,results:[],limited:true,semanticMode:"not_applicable",disclaimer,
    answer:"현재 자료로는 안전한 도보 경로·경사도·휠체어 접근성·결빙 위험을 검증할 수 없습니다. 실제 보행면 조사 자료가 필요합니다."});
  const mode=explanationMode(body.explanation);
  const category=intent(query),subtype=category==='protection_zone'?protectionSubtype(query):null;
  const terms=subtype?[subtype,...extract(query).filter(t=>t!=='보호구역'&&t!==subtype)]:extract(query);
  if(!terms.length)return send({query,results:[],limited:true,semanticMode:"no_matches",disclaimer,
    answer:"보호구역·사고다발지역 관련 시설명이나 장소를 포함해 질문해 주세요."});
  const {data,error}=await client.rpc("dj_safety_ai_find",{p_terms:terms,p_limit:10});
  if(error){console.warn("[dj-safety-ai] lookup failed",error.code);return send({message:"검색 자료를 불러오지 못했습니다."},503);}
  const candidates=(Array.isArray(data)?data:[]).filter((r:any)=>(!category||r.category===category)&&matchesProtectionSubtype(r,subtype));
  let semanticMode="verified_korean_keyword_search",sim:Record<string,number>={};
  // gte-small only supports English. Use it only on *fixed English category
  // descriptions*, not Korean strings; keyword matching remains authoritative.
  if(candidates.length>1){
    try{
      const session=new Supabase.ai.Session("gte-small");
      const sentences=[englishIntent(query),...new Set(candidates.map((r:any)=>CONCEPT[r.category]).filter(Boolean))];
      const vectors:number[][]=[];
      for(const sentence of sentences){
        const output=await session.run(sentence,{mean_pool:true,normalize:true});
        if(!Array.isArray(output)||output.length!==384||!output.every(Number.isFinite))throw new Error("bad vector");
        vectors.push(output);
      }
      for(let i=1;i<sentences.length;i++)sim[sentences[i]]=cosine(vectors[0],vectors[i]);
      semanticMode="supabase_gte_small_english_category_assist";
    }catch{ /* Accuracy of grounded keyword results does not depend on embeddings. */ }
  }
  const results=candidates.map((r:any)=>({
    id:r.id,category:r.category,title:r.title,description:r.description,
    sourceName:r.source_name,sourcePath:r.source_path,sourceDate:r.source_date,
    limitations:r.limitations,longitude:r.longitude,latitude:r.latitude,
    keywordScore:r.score,semanticScore:sim[CONCEPT[r.category]]??null
  })).sort((a:any,b:any)=>b.keywordScore-a.keywordScore||(b.semanticScore??0)-(a.semanticScore??0)).slice(0,7);
  const answer=evidenceAnswer(results,mode,category,subtype);
  return send({query,answer,results,explanation:mode,sourceCount:18,limited:true,semanticMode,disclaimer});
});