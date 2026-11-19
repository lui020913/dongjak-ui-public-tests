/** Korean-aware, dependency-free search normalization and fuzzy matching. */
const L = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const V = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';
const T = ' ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ';
const L2='ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const V2='ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';
const T2='ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ';
const compat = new Map();
for (const c of L2) compat.set(c,{type:'L',value:c});
for (const c of V2) compat.set(c,{type:'V',value:c});
for (const c of T2) compat.set(c,{type:'T',value:c});
const COMPOUND_T = new Set(['ㄳ','ㄵ','ㄶ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅄ']);
function isSyllable(c){const n=c.charCodeAt(0)-0xAC00;return n>=0&&n<=11171;}
function composeCompatibilityJamo(input){
 const chars=Array.from(String(input||''));let out='';
 for(let i=0;i<chars.length;){
  const ch=chars[i],next=chars[i+1],after=chars[i+2];
  // Attach a trailing consonant to the preceding complete syllable when the
  // consonant is not followed by a vowel (e.g. 버 + ㄱ + 스 => 벅스).
  if(isSyllable(ch)&&Boolean(next)&&L2.includes(next)&&!V2.includes(after||'x')){
   const base=ch.charCodeAt(0)-0xAC00,li=Math.floor(base/588),vi=Math.floor((base%588)/28),ti=base%28;
   const tail=T.indexOf(next);
   if(tail>0&&ti===0){out+=String.fromCharCode(0xAC00+(li*21+vi)*28+tail);i+=2;continue;}
  }
  // Compose a leading consonant + vowel, optionally followed by a final consonant.
  if(L2.includes(ch)&&Boolean(next)&&V2.includes(next)){
   const l=L.indexOf(ch),v=V.indexOf(next);i+=2;let t=0;
   if(i<chars.length&&T2.includes(chars[i])&&chars[i]!==' '&&!V2.includes(chars[i+1]||'')){
    t=T.indexOf(chars[i]);if(t>0)i++;
   }
   out+=String.fromCharCode(0xAC00+(l*21+v)*28+t);continue;
  }
  out+=ch;i++;
 }
 return out;
}
export function normalizeKoreanSearch(value){
 return composeCompatibilityJamo(String(value??'').normalize('NFC').toLocaleLowerCase('ko-KR'))
  .replace(/[\s\u200b\u00a0·.,/\\()\[\]{}'"_\-]/g,'').replace(/[^\p{L}\p{N}]/gu,'');
}
export function koreanInitials(value){
 return Array.from(String(value||'')).map(c=>{if(!isSyllable(c))return c;return L[Math.floor((c.charCodeAt(0)-0xAC00)/588)]||c;}).join('');
}
function levenshtein(a,b){
 if(a===b)return 0;if(!a)return b.length;if(!b)return a.length;
 let prev=Array.from({length:b.length+1},(_,i)=>i);
 for(let i=1;i<=a.length;i++){const cur=[i];for(let j=1;j<=b.length;j++)cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));prev=cur;}
 return prev[b.length];
}
export function koreanSearchScore(query,candidate){
 const q=normalizeKoreanSearch(query),c=normalizeKoreanSearch(candidate);
 if(!q||!c)return 0;
 if(c===q)return 100;
 if(c.includes(q))return 95;
 const qi=koreanInitials(q),ci=koreanInitials(c);
 if(ci.startsWith(q)||ci.includes(q))return 88;
 if(qi.length>=2&&c.includes(qi))return 82;
 if(q.length<3)return 0;
 const distance=levenshtein(q,c);
 const max=Math.max(1,Math.floor(Math.min(q.length,c.length)*0.28));
 if(distance<=max)return Math.max(55,78-distance*8);
 // Compare against same-length windows so a longer place name can match a typoed core name.
 if(c.length>q.length){let best=Infinity;for(let i=0;i<=c.length-q.length;i++)best=Math.min(best,levenshtein(q,c.slice(i,i+q.length)));if(best<=1)return 68;}
 return 0;
}
export function rankKoreanSearch(query,items,{getText=x=>x?.name,limit=12,minScore=55}={}){
 return (items||[]).map((item,index)=>({item,index,score:koreanSearchScore(query,getText(item))}))
  .filter(x=>x.score>=minScore).sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,limit).map(x=>({...x.item,_searchScore:x.score}));
}
