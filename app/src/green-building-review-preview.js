// Audit artifact 15083118052, 2026-11-26. Unverified visual review only.
// Geometry fingerprints are scoped by sheet; changes to source geometry fail open.
import {hasNamedBuilding} from './building-display-detail.js';
const raw={
  "2": "1cijxi7,1ibgyjo,2ivv1q,qzf9pb,100hsnz,118fyvl,11e2425,12qqtdf,14kibp2,17p1jwf,18npkuu,18nu25x,19nwysh,1bgfs3h,1bvhu3,1eeajlk,1gujer9,1hxnx2l,1jp0d6e,1mluv71,1myrm8j,1pve58g,1q38t2g,1qfh1ak,1s4oj8w,1sn7m7d,1u0980p,1u1qigl,1upn5vm,1wb78y4,1xq5jko,1xtaw0g,4777x6,4q5vxl,4uvqma,4zvdtw,5b67j,5c3q9k,6sd18z,73t8t2,7o5p0x,afamlo,b57rrc,bzqz5z,e7mfqg,ewqtzb,gsmi70,ha3hpw,j0to86,ju8ox8,my66lm,ngu48k,q6hjak,qgxjjh,tfmdak,v016m4,vc7i4g",
  "3": "153zbb7,172isu,1ety82o,1kvx9zi,1sy1nh2,1tuefp2,1uq76yx,1xj5qj2,1xwpyp7,1y6e7ea,1yqvwit,5xkys2,bemdt4,ke9esa,m39nhc,o9ehai,om24kv,or4pmg,p40mt4,qy9wbg,r5i95d,wjhieg,yzzcx6,153j9mk,172k7c8,19dbb34,1cao2yi,1czygks,1uby9x,6y99ik,7l3mpr,zyy8ox",
  "4": "15g6g14,1texq6t,1xlbqsx",
  "5": "120dfhp,15slnff,160w9jd,1mh1tgi,1p1doiv,34gg0i,bf7hxd,cp9ju4,i4ota9,lpd8i8",
  "6": "10zdqi5,12hsee6,15tiogf,17aem4u,17h6m1w,194wf53,1b7fq2s,1f1l7q2,1hdh844,1j4gn7e,1lr15mg,1n0lnd7,1oxrjok,1pswin4,1q5pu5s,1qkk5h9,1ug3ato,1wpbfd0,2uefeb,3lujqb,3ylwso,54moqs,816bea,cipcgr,klaqrb,mwtvw1,sqrrzg,t62mzh,w6puaw,105ley,10qrcwl,111gna9,115w2oj,1161xax,11xqbcz,122nue7,12cd69m,12wx95m,12zyhx5,133pwgi,137dzb9,13s249j,13xeveh,146vtkn,149w0ac,14dawo6,14q3qyd,15gwnz,15kxbau,15mh3al,15uy7s7,16a1rfs,16g4hh2,16gc6ml,170cl3i,187pptc,18avtij,1973c3u,199jjkj,19ritrt,1a3sdj1,1a9ejsl,1ao084f,1arfvyd,1ayly9k,1az7bwd,1b2r9cc,1c4tysa,1c6bd2z,1cltl1d,1cwywx9,1cycg1a,1dag0ih,1di9iw4,1dtq5g2,1e8n5s8,1euv3nd,1fj1uvm,1fkxidr,1frascl,1fvzm2q,1fw30ez,1fw62tg,1gc1b3h,1ggglxl,1hif81j,1hjmv7n,1i6eh6p,1i9uidl,1ifgbqj,1ijhdpn,1it0lry,1iw6zvh,1jaeyfo,1je8bc5,1kkv92h,1knulog,1kr5yyw,1ktsc0v,1kultgq,1l1lpy2,1l7pxgf,1m7hges,1m7iqxv,1meew41,1n0s3ty,1n2utlp,1n4ao9p,1norpur,1ntn869,1nxn961,1nzik0s,1o6dvwu,1oqmgrv,1oqnnzx,1p872j,1pkatv2,1pu0ok3,1pxyl19,1qaf4j3,1qh417b,1qpf2kr,1r00kl5,1ruhaxc,1rwlkjl,1sfvbog,1shxte6,1skkusi,1sq4yw7,1t56vcu,1t8ncoj,1t8yrup,1vseq3z,1wc9738,1wk2bwa,1ww2c6f,1xabatj,1xivm9o,1xxd67,1y55gqo,1yfesg7,1yg0hv2,1ylwgs,1yzpcai,2jz1hb,2s0pz6,31wz94,350n2o,42rbvx,4xv814,5c9mrw,67oi8k,6ojab3,6opt6e,770z6q,7oe0f2,7ptiyo,8321b5,8ojwbo,a7tol8,ahdtxk,aup9cg,btm3vf,d71xix,d8d63g,dn0m7m,egxwf1,ei7vz7,ev2d1w,eydkob,f4wmxr,fiqs67,gf7ah9,gzki9j,h2w7em,h775t8,hp3gkm,hugn6p,hzwehc,j0fuj2,k3fyap,kbyvhh,kdgkjw,l1gmzh,lzqqpt,m2vua5,m3b73a,ma9f8f,mu7yvd,mvvy8c,n546du,ndcnuz,ngk143,nlsgvw,oiazgp,ojsk9i,orwyji,pqc2w5,qjz0zl,sq8rry,t5qcsx,ti39dh,u1h6hs,uad8rv,v8ghru,vqllwz,vs8u0q,wagpz4,wmb76,wow93e,x8xafh,xejklo,xz1ybi,yakf61,ydqs1k,ywf6to,yza3td,zao0mc,zlpb9s",
  "7": "10e3ufb,10zy2fq,11hldk2,11iclx9,11qu3ft,1215kyj,12694at,13jzls2,13o0bac,15kd6fe,16cqf82,16hwjuk,17sij76,17ue311,17zgely,1bg1fy9,1bxxfu3,1e97yvl,1e98qn3,1eey3kj,1eo0g8h,1f94afa,1fmfkqw,1fvit42,1g3tn60,1g6atu8,1gqxa2w,1hw8pr6,1icqe4n,1jgozyd,1jupask,1k0vpzq,1k26jfl,1lbtm9c,1lubfml,1nmi6rn,1ojvqti,1oysxrj,1prby8c,1q7ihop,1qwpf9p,1rfzpno,1tzea51,1vevvq2,1wre4yt,1wxwngj,1x1hqpy,1x3ggi7,1x9urwj,1xe3ids,1yd29x8,2vbxlt,4675i8,4jxzzk,56ougj,5sg44m,649uuu,6eosxq,71gcug,7e827,7of3v7,7ptgzs,8h33yw,a3e8z,a73mun,azllbk,b7kvit,bh0u3k,bhu1iq,ccrymz,d0etz,dtorh0,dwz3zn,e35df7,fzi4hz,g48b3o,hphtiw,iqqbwp,je91sq,l2erp9,n1uthc,nn8a06,nt9fm,o5cof6,p3t712,phgrpm,pi2s67,q5mn82,qdw05x,qrbnn8,r51rf3,sw4cke,tvl3rq,tzdwlx,u0fo9d,uip3n8,uz7l8w,v5xsw3,v604tg,v8q450,wlpu53,wtpqya,x55jpj,y1xl2e,yy1ewm,z0824x,zlra4d,13jbpk4,15o58ai,1df7tjy,1g3klbn,1l6iugy,1liszip,1lsoe8n,1n4916s,1nvd88m,1w2q03s,1x1p8cu,2d5gk7,6650fj,af8wmp,dczfl3,mel90k,n33bg7",
  "8": "11vjav6,1cbxk68,1ihukji,1j8eoro,1vsvy4q,1wh27is,9rnyki,dzw8hq,g26akm,g26mwj,j7g01c,jkyvkg,l853t2,waoipn,x5uz1n,145vjip,8ockv0,bc6k8s,fk3p1,ftmbz,k6xni1,l2gmcr,ncqfnt,phvxkx,ynsoqq"
};
const candidates=new Map(Object.entries(raw).map(([id,s])=>[Number(id),new Set(s.split(','))]));
export const GREEN_REVIEW_COUNT=[...candidates.values()].reduce((sum,s)=>sum+s.size,0);
export function greenReviewPreviewEnabled(search=''){return new URLSearchParams(search||'').get('greenBuildingPreview')==='1';}
export function geometryReviewKey(geometry){
 let hash=2166136261;
 function visit(a){if(!Array.isArray(a))return;if(typeof a[0]==='number'){for(const v of a.slice(0,2))hash=Math.imul(hash^Math.round(v*1e6),16777619)>>>0;}else for(const v of a)visit(v);}
 visit(geometry?.coordinates);return hash.toString(36);
}
export function partitionGreenReview(sheet,features,enabled=false){
 if(!enabled)return {visible:features,reviewExcluded:[]};
 const visible=[],reviewExcluded=[],keys=candidates.get(Number(sheet));
 for(const f of features){
  const p=f.properties||{};
  const protectedFacility=hasNamedBuilding(f)||Boolean(p.amenity||p.office||p.healthcare||p.emergency||p.public_service);
  (keys?.has(geometryReviewKey(f.geometry))&&!protectedFacility?reviewExcluded:visible).push(f);
 }
 return {visible,reviewExcluded};
}
