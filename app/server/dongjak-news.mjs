/** Server-side news aggregation with official Dongjak board fallbacks. */
const TTL_MS=10*60*1000;
// The browser terminates news requests after 14.5 seconds. External feeds must
// race within a shared bounded window; do not download publisher pages inline.
const cache=new Map();
const MAX_ITEMS=16;
const OFFICIAL_NOTICE_URL='https://www.dongjak.go.kr/portal/bbs/B0000022/list.do?menuNo=200638';
const OFFICIAL_PRESS_URL='https://www.dongjak.go.kr/portal/bbs/B0000171/list.do?menuNo=200647';
const OFFICIAL_NEWSLETTER_URL='https://enews.dongjak.go.kr/newHome/newsLetterList.action';
const PORTAL='https://www.dongjak.go.kr/portal/main/main.do';
const cleanText=(value,max=180)=>String(value??'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ')
  .replace(/\s+/g,' ').trim().slice(0,max);
const sanitizeText=(value,max=180)=>cleanText(decodeXmlText(value),max);

export function decodeXmlText(text=''){
  return String(text).replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/,'$1')
    .replace(/&#(x[\da-f]+|\d+);/gi,(m,n)=>{
      const code=n.toLowerCase().startsWith('x')?parseInt(n.slice(1),16):Number(n);
      return code>0&&code<=0x10ffff?String.fromCodePoint(code):m;
    })
    .replace(/&(amp|lt|gt|quot|apos|nbsp|ndash|mdash|#39);/gi,(m,n)=>({
      amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',ndash:'–',mdash:'—','#39':"'"
    }[n.toLowerCase()]||m));
}
const xmlTag=(item,tag)=>{
  const match=item.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,'i'));
  return match?decodeXmlText(match[1].trim()):'';
};
function safeUrl(raw,allowedHost){
  try{
    const url=new URL(String(raw||''));
    if(url.protocol!=='https:' || url.username || url.password || (allowedHost&&!allowedHost(url.hostname)))return '';
    return url.href;
  }catch{return '';}
}
function safeNewsLink(raw){
  return safeUrl(raw,host=>{
    const value=String(host||'').toLowerCase();
    const ipv4=/^\d{1,3}(?:\.\d{1,3}){3}$/.test(value);
    return value.includes('.')&&!ipv4&&!/^(localhost|127\.0\.0\.1)$/i.test(value)&&!value.endsWith('.local');
  });
}
function safeDongjakBoardUrl(raw,baseUrl){
  try{
    const href=decodeXmlText(String(raw||'')).replace(/&amp;/gi,'&');
    const url=new URL(href,baseUrl);
    if(url.protocol!=='https:'||!['www.dongjak.go.kr','dongjak.go.kr'].includes(url.hostname))return '';
    if(!/^\/portal\/bbs\/B\d+\/view\.do$/.test(url.pathname)||! /^\d+$/.test(url.searchParams.get('nttId')||''))return '';
    return url.href;
  }catch{return '';}
}
export function rssImageUrl(raw){
  const text=String(raw||'');
  const tags=[...text.matchAll(/<(?:media:thumbnail|media:content|enclosure)\b[^>]*>/gi)].map(x=>x[0]);
  for(const tag of tags){
    const candidate=tag.match(/\burl=["']([^"']+)["']/i)?.[1]||'';
    const type=tag.match(/\btype=["']([^"']+)["']/i)?.[1]||'';
    if(tag.toLowerCase().startsWith('<enclosure')&&!/^image\//i.test(type))continue;
    const safe=safeUrl(decodeXmlText(candidate));
    if(safe)return safe;
  }
  const encoded=xmlTag(text,'content:encoded');
  const description=encoded||xmlTag(text,'description');
  const candidate=description.match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i)?.[1]||'';
  return safeUrl(decodeXmlText(candidate));
}
export function parseDongjakGoogleNewsRss(xml){
  const results=[];
  for(const [,raw] of String(xml||'').matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)){
    const title=sanitizeText(xmlTag(raw,'title'));
    const url=safeNewsLink(xmlTag(raw,'link'));
    if(!title||!url)continue;
    results.push({title,url,publishedAt:xmlTag(raw,'pubDate'),
      source:sanitizeText(xmlTag(raw,'source')||xmlTag(raw,'news:source')||'뉴스 검색',50),
      imageUrl:rssImageUrl(raw)});
    if(results.length>=MAX_ITEMS)break;
  }
  return results;
}
export const parseDongjakNewsRss=parseDongjakGoogleNewsRss;

// RSS feeds routinely omit article imagery even when the original newsroom page
// has a prominent lead photograph. Fetch metadata for a small publisher whitelist
// without downloading or copying copyrighted pictures into our project.
const IMAGE_PUBLISHERS=new Set([
  'www.khan.co.kr','www.yna.co.kr','www.news1.kr','www.hani.co.kr',
  'www.seoul.co.kr','m.seoul.co.kr','www.ohmynews.com','www.donga.com',
  'www.hankookilbo.com','www.kmib.co.kr','www.newsis.com',
  'www.sedaily.com','www.segye.com','www.joongang.co.kr',
  'www.chosun.com','www.hankyung.com','www.mk.co.kr',
  'www.yonhapnewstv.co.kr','www.etnews.com',
  'weekly.hankooki.com','www.weekly.hankooki.com','www.hankooki.com',
  'www.newspim.com','www.edaily.co.kr','www.fnnews.com','view.asiae.co.kr',
  'www.asiae.co.kr','www.ajunews.com','www.nocutnews.co.kr','www.kukinews.com'
]);
const VERIFIED_ARTICLE_IMAGES=new Map([
  ['https://www.khan.co.kr/article/202611011142001',
   'https://img.khan.co.kr/news/2026/11/01/news-p.v1.20261101.16f6e6f0b763432b9d169d7de683c870_P1.png']
]);
export function newsImageMetadata(html=''){
  const text=String(html||'').slice(0,280000);
  const tags=[...text.matchAll(/<meta\b[^>]*>/gi)].map(x=>x[0]);
  for(const wanted of ['og:image:secure_url','og:image','twitter:image','twitter:image:src']){
    for(const tag of tags){
      const attrs=Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gi)]
        .map(x=>[x[1].toLowerCase(),decodeXmlText(x[3])]));
      if((attrs.property||attrs.name||'').toLowerCase()!==wanted)continue;
      const image=safeNewsLink(attrs.content);
      if(image)return image;
    }
  }
  // Some publisher templates use image_src rather than Open Graph tags.
  for(const [,attr] of text.matchAll(/<link\b([^>]+)>/gi)){
    if(!/\brel\s*=\s*["']image_src["']/i.test(attr))continue;
    const candidate=attr.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
    const image=safeNewsLink(decodeXmlText(candidate));
    if(image)return image;
  }
  // JSON-LD article schema commonly carries the real lead photo URL.
  const blocks=[...text.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for(const [,raw] of blocks){
    try{
      const root=JSON.parse(raw),entries=Array.isArray(root)?root:[root];
      for(const item of entries){
        for(const node of [...(Array.isArray(item?.['@graph'])?item['@graph']:[]),item]){
          const image=node?.image;
          const values=Array.isArray(image)?image:[image];
          for(const value of values){
            const img=safeNewsLink(typeof value==='string'?value:value?.url||value?.contentUrl);
            if(img)return img;
          }
        }
      }
    }catch{}
  }
  return '';
}
const publisherHostFrom=(url)=>{
  const clean=safeNewsLink(url);
  if(!clean)return '';
  const hostname=new URL(clean).hostname.toLowerCase();
  return IMAGE_PUBLISHERS.has(hostname)?clean:'';
};
function publisherLinkFromGoogleHtml(html){
  const text=String(html||'').slice(0,200000);
  for(const tag of text.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi)||[]){
    const href=tag.match(/href=["']([^"']+)["']/i)?.[1];
    const clean=publisherHostFrom(decodeXmlText(href));
    if(clean)return clean;
  }
  return '';
}
/** Resolve only known publisher redirect destinations; reject arbitrary redirects. */
export async function resolveNewsPublisherUrl(url,{fetchImpl=fetch,timeout=1800}={}){
  const initial=safeNewsLink(url);
  if(!initial)return '';
  if(publisherHostFrom(initial))return initial;
  if(new URL(initial).hostname!=='news.google.com')return '';
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeout);
  try{
    const response=await fetchImpl(initial,{signal:ctrl.signal,redirect:'manual',headers:{Accept:'text/html'}});
    const location=response.headers?.get?.('location');
    const resolved=location?publisherHostFrom(new URL(location,initial).href):'';
    if(resolved)return resolved;
    if(response.ok){
      const finalUrl=publisherHostFrom(response.url);
      if(finalUrl)return finalUrl;
      return publisherLinkFromGoogleHtml(await response.text());
    }
    return '';
  }catch{return '';}finally{clearTimeout(timer);}
}
export async function enrichNewsImage(item,{fetchImpl=fetch,timeout=2200}={}){
  if(item.imageUrl)return item;
  const url=safeNewsLink(item.url);
  if(!url)return item;
  const fallback=VERIFIED_ARTICLE_IMAGES.get(url.replace(/\?.*$/,''));
  if(fallback)return {...item,imageUrl:fallback,imageCredit:item.source||'원문 제공'};
  const publisherUrl=await resolveNewsPublisherUrl(url,{fetchImpl,timeout:Math.min(1900,timeout)});
  if(!publisherUrl)return item;
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeout);
  try{
    const response=await fetchImpl(publisherUrl,{signal:ctrl.signal,redirect:'error',headers:{Accept:'text/html,application/xhtml+xml'}});
    if(!response.ok||!String(response.headers?.get?.('content-type')||'text/html').includes('html'))return item;
    const html=await response.text();
    const imageUrl=newsImageMetadata(html);
    return imageUrl?{...item,imageUrl,imageCredit:item.source||'원문 제공'}:item;
  }catch{return item;}finally{clearTimeout(timer);}
}
export async function enrichNewsImages(items,{fetchImpl=fetch,max=9}={}){
  const result=[...items];
  for(let i=0;i<Math.min(max,result.length);i+=3){
    const group=await Promise.all(result.slice(i,i+3).map(item=>enrichNewsImage(item,{fetchImpl})));
    result.splice(i,group.length,...group);
  }
  return result;
}


/** Parse the public Dongjak-gu notice/press-release board without relying on port 8088. */
export function parseDongjakBoardHtml(html,{baseUrl=OFFICIAL_NOTICE_URL,sourceLabel='동작구청'}={}){
  const sourceRows=[];
  const rowMatches=[...String(html||'').matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)];
  const anchorsFrom=fragment=>[...fragment.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  const seen=new Set();
  for(const rowMatch of rowMatches){
    const row=rowMatch[0];
    const anchor=anchorsFrom(row).find(([,href])=>/view\.do/i.test(href)&&/nttId=/i.test(href));
    if(!anchor)continue;
    const url=safeDongjakBoardUrl(anchor[1],baseUrl);
    const title=sanitizeText(anchor[2],180);
    if(!url||!title||seen.has(url))continue;
    const cells=[...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(x=>sanitizeText(x[1],100)).filter(Boolean);
    const publishedAt=cells.find(x=>/20\d{2}[-./]\d{1,2}[-./]\d{1,2}/.test(x))||'';
    const department=cells.find(x=>/(과|담당관|센터|팀|사업단|추진단)$/.test(x)&&x!==title)||'';
    seen.add(url);
    sourceRows.push({title,url,publishedAt,source:department||sourceLabel});
    if(sourceRows.length>=MAX_ITEMS)break;
  }
  // Some board templates use list <li> rather than table rows.
  if(!sourceRows.length){
    for(const [,href,inner] of String(html||'').matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
      if(!/view\.do/i.test(href)||!/nttId=/i.test(href))continue;
      const url=safeDongjakBoardUrl(href,baseUrl),title=sanitizeText(inner,180);
      if(!url||!title||seen.has(url))continue;
      seen.add(url);sourceRows.push({title,url,publishedAt:'',source:sourceLabel});
      if(sourceRows.length>=MAX_ITEMS)break;
    }
  }
  return sourceRows;
}
/** Official Dongjak-gu newsletter list is a separate, clearly attributed backup feed.
 * It is NOT a replacement for the official notice board, and no items are fabricated.
 */
export function parseDongjakNewsletterHtml(html){
  const text=String(html||'');
  const rows=[],seen=new Set();
  for(const match of text.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
    let absolute='';
    try{absolute=new URL(decodeXmlText(match[1]),OFFICIAL_NEWSLETTER_URL).href;}catch{}
    const url=safeUrl(absolute,host=>host==='enews.dongjak.go.kr');
    // Only the actual published newsletter pages, never login/search links.
    if(!url||!/^\/mzin\/20\d{6}\/[^/]+\.html$/.test(new URL(url).pathname)||seen.has(url))continue;
    const pathDate=new URL(url).pathname.match(/\/mzin\/(20\d{6})\//)?.[1]||'';
    if(!pathDate)continue;
    const nearby=text.slice(Math.max(0,match.index-450),Math.min(text.length,match.index+200));
    const publishedAt=nearby.match(/20\d{2}[-./]\d{1,2}[-./]\d{1,2}/)?.[0]
      ||`${pathDate.slice(0,4)}-${pathDate.slice(4,6)}-${pathDate.slice(6,8)}`;
    const label=sanitizeText(match[2],80);
    const issue=nearby.match(/제\s*\d+\s*호\s*뉴스레터/)?.[0];
    rows.push({title:label&&/뉴스레터/.test(label)?label:issue||`동작구청 뉴스레터 (${publishedAt})`,
      url,publishedAt,source:'동작구청 뉴스레터'});
    seen.add(url);
    if(rows.length>=MAX_ITEMS)break;
  }
  return rows;
}
async function fetchOfficialNewsletter(fetchImpl){
  const html=await fetchText(fetchImpl,OFFICIAL_NEWSLETTER_URL,{timeout:4400});
  const items=parseDongjakNewsletterHtml(html);
  if(!items.length)throw new Error('공식 뉴스레터 목록에서 발행호를 찾지 못했습니다.');
  return items;
}
/** Even non-cooperative upstream adapters cannot hold an API response indefinitely. */
async function withinDeadline(job,limitMs){
  let timer;
  try{
    return await Promise.race([
      Promise.resolve().then(job),
      new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('SOURCE_DEADLINE_EXCEEDED')),limitMs);})
    ]);
  }finally{clearTimeout(timer);}
}

export function parseDongjakOfficeNotices(json){
  const root=json?.DongjakNewsNoticeList;
  const code=root?.RESULT?.CODE||json?.RESULT?.CODE||'';
  if(code&&code!=='INFO-000'&&code!=='INFO-200')throw new Error(`동작구 공식 API 오류: ${code}`);
  const rows=Array.isArray(root?.row)?root.row:[];
  return rows.map(row=>({
    title:sanitizeText(row.SUBJECT),
    source:sanitizeText(row.DEPTNAME||'동작구청',50),
    publishedAt:String(row.REGDATE||''),
    url:PORTAL
  })).filter(row=>row.title).slice(0,MAX_ITEMS);
}
async function fetchText(fetchImpl,url,{timeout=8500,accept='text/html,application/rss+xml,application/xml;q=0.9,*/*;q=0.8'}={}){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeout);
  try{
    const response=await fetchImpl(url,{signal:controller.signal,headers:{
      Accept:accept,
      'User-Agent':'Mozilla/5.0 (compatible; DongjakSafetyMap/5.6; +https://www.dongjak.go.kr/)'
    }});
    if(!response.ok)throw new Error(`외부 소식 서버 HTTP ${response.status}`);
    const text=await response.text();
    if(text.length>5_000_000)throw new Error('외부 소식 응답이 너무 큽니다.');
    return text;
  }finally{clearTimeout(timer);}
}
async function fetchOfficialBoard(fetchImpl,url,sourceLabel,timeout=9000){
  const html=await fetchText(fetchImpl,url,{timeout});
  const items=parseDongjakBoardHtml(html,{baseUrl:url,sourceLabel});
  if(!items.length)throw new Error(`${sourceLabel} 목록에서 게시글을 찾지 못했습니다.`);
  return items;
}
async function fetchOfficialApiFallback(fetchImpl,openApiKey,fetchOfficialApi){
  if(!String(openApiKey||'').trim())return [];
  if(typeof fetchOfficialApi==='function')return parseDongjakOfficeNotices(await fetchOfficialApi('DongjakNewsNoticeList',[20]));
  const url=`http://openapi.seoul.go.kr:8088/${encodeURIComponent(openApiKey)}/json/DongjakNewsNoticeList/1/20/`;
  const raw=await fetchText(fetchImpl,url,{timeout:6500,accept:'application/json'});
  let json;
  try{json=JSON.parse(raw);}catch{throw new Error('서울 열린데이터광장 API가 JSON이 아닌 응답을 반환했습니다.');}
  return parseDongjakOfficeNotices(json);
}

export async function fetchDongjakNews({type='media',openApiKey='',fetchImpl=fetch,fetchOfficialApi,force=false,now=Date.now()}={}){
  if(!['official','media','seoul'].includes(type))throw Object.assign(new Error('지원하지 않는 소식 유형입니다.'),{status:400});
  const cached=cache.get(type);
  if(!force && cached && now-cached.at<TTL_MS)return cached.payload;

  let items=[],source='',failures=[];
  if(type==='seoul'){
    try{const xml=await fetchText(fetchImpl,'https://mediahub.seoul.go.kr/news/rss/',{timeout:6500,accept:'application/rss+xml,application/xml,text/xml,*/*'});items=parseDongjakNewsRss(xml).map(row=>({...row,source:'서울특별시 · 내 손안에 서울'}));source='서울특별시 공식 RSS';}catch(error){failures.push('서울시 RSS 조회 실패');}
  }else if(type==='official'){
    // A slow Seoul Open Data Plaza request must never delay an already working
    // official publisher. First usable, verified source wins within ~5 seconds.
    const sources=[
      {name:'동작구청 공지사항',label:'동작구청 알려드립니다 · 공식 홈페이지',job:()=>fetchOfficialBoard(fetchImpl,OFFICIAL_NOTICE_URL,'동작구청 알려드립니다',4600)},
      {name:'동작구청 보도자료',label:'동작구청 보도자료 · 공식 홈페이지',job:()=>fetchOfficialBoard(fetchImpl,OFFICIAL_PRESS_URL,'동작구청 보도자료',4600)},
      ...(String(openApiKey||'').trim()?[{name:'서울 열린데이터광장',label:'동작구청 알려드립니다 · 서울 열린데이터광장 API',job:()=>fetchOfficialApiFallback(fetchImpl,openApiKey,fetchOfficialApi)}]:[])
    ];
    const tasks=sources.map(async ({name,label,job})=>{
      try{
        const rows=await withinDeadline(job,4800);
        if(!Array.isArray(rows)||!rows.length)throw new Error('목록이 비어 있습니다.');
        return {items:rows,source:label};
      }catch(error){
        failures.push(`${name}: ${String(error?.message||'조회 실패').slice(0,90)}`);
        throw error;
      }
    });
    try{
      ({items,source}=await Promise.any(tasks));
    }catch{
      // Third independent official government publisher: a published newsletter
      // is explicitly labelled as a newsletter, never as a notice.
      try{
        items=await withinDeadline(()=>fetchOfficialNewsletter(fetchImpl),4600);
        source='동작구청 공식 뉴스레터 · 대체 자료';
      }catch(error){
        failures.push(`동작구청 뉴스레터: ${String(error?.message||'조회 실패').slice(0,90)}`);
      }
    }
  }else{
    const query='"동작구" OR "노량진" OR "상도동" OR "사당동" OR "흑석동"';
    const candidates=[
      {url:`https://www.bing.com/news/search?q=${encodeURIComponent(query)}&format=rss`,source:'Bing 뉴스'},
      {url:`https://news.google.com/rss/search?q=${encodeURIComponent('동작구 when:14d')}&hl=ko&gl=KR&ceid=KR:ko`,source:'Google 뉴스'},
      {url:`https://news.google.com/rss/search?q=${encodeURIComponent('동작구')}&hl=ko&gl=KR&ceid=KR:ko`,source:'Google 뉴스'}
    ];
    const settled=await Promise.allSettled(candidates.map(async candidate=>{
      const xml=await fetchText(fetchImpl,candidate.url,{timeout:5400,accept:'application/rss+xml,application/xml,text/xml,*/*'});
      const rows=parseDongjakNewsRss(xml);
      if(!rows.length)throw new Error('제공된 뉴스 항목 없음');
      return rows;
    }));
    for(let i=0;i<candidates.length;i++){
      if(settled[i].status==='fulfilled'){
        items=settled[i].value;source=candidates[i].source;break;
      }
      failures.push(`${candidates[i].source}: ${String(settled[i].reason?.message||'조회 실패')}`);
    }
    // Only after ALL independent media feeds fail, use VERIFIED, dated
    // Dongjak-gu press releases as a clearly labelled local-information fallback.
    // Never silently present them as independent newspaper reporting.
    if(!items.length){
      try{
        items=await withinDeadline(()=>fetchOfficialBoard(fetchImpl,OFFICIAL_PRESS_URL,'동작구청 보도자료',4300),4500);
        if(items.length)source='동작구청 보도자료 · 지역뉴스 대체';
      }catch(error){
        failures.push(`공식 보도자료 대체: ${String(error?.message||'조회 실패').slice(0,90)}`);
      }
    }
  }

  if(!items.length){
    if(cached?.payload)return {...cached.payload,stale:true};
    const message=type==='seoul'?'서울시 공식 RSS에서 소식을 가져오지 못했습니다.':type==='official'
      ?'동작구청 공식 게시판과 서울 열린데이터광장 API에서 소식을 가져오지 못했습니다.'
      :'지역 뉴스 RSS 및 공식 보도자료에서 소식을 가져오지 못했습니다.';
    throw Object.assign(new Error(message),{status:502,detail:failures.slice(0,3)});
  }
  // Image enrichment performs multiple outbound HTML requests. Those used to
  // delay headlines until the UI timed out. Keep verified RSS images; do not
  // block the primary news response on optional article thumbnails.
  const payload={type,items,source,updatedAt:new Date(now).toISOString(),stale:false,
    fallback:type==='media' && source.includes('보도자료 · 지역뉴스 대체')};
  cache.set(type,{at:now,payload});
  return payload;
}
