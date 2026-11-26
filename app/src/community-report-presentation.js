/** Presentation only; retain stored text and API payloads. */
export function splitCommunityReportBody(value,category){
 const raw=String(value??'');
 if(category!=='보행 불편')return {type:'',priority:'',body:raw};
 const match=raw.match(/^\[보행불편 유형:[ \t]*([^\]\r\n]+)\][ \t]*\[현장 확인:[ \t]*([^\]\r\n]+)\](?:\r?\n|[ \t]*)/u);
 if(!match)return {type:'',priority:'',body:raw};
 const type=match[1].trim(),priority=match[2].trim();
 if(!type||!priority)return {type:'',priority:'',body:raw};
 return {type,priority,body:raw.slice(match[0].length)};
}
