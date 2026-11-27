import { defineConfig } from 'vite';
import {statSync} from 'node:fs';
import {onRequestGet,onRequestPost} from './functions/api/place-insight.js';
import {serveDistrictRoadTile} from './server/district-road-tile.mjs';
import {onRequestPost as matchBusTrace} from './functions/api/basemap/bus-trace.js';
import {platformHtml} from './platforms/shared/platform-html.js';
// Cloudflare Pages serves the identical /api/place-insight route in production.
// Vite alone has no Workers AI binding. Use npm run dev:ai for local inference.
const outputs={
  'pc-chromium':'build/pc-chromium',
  'ios-pwa':'build/ios-pwa',
  android:'build/android'
};
function districtTileMiddleware(server){
 server.middlewares.use('/api/basemap/bus-trace',async(req,res,next)=>{
  if(req.method!=='POST')return next();
  try{const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>90000){res.writeHead(413);res.end();return;}chunks.push(chunk);}
   const reply=await matchBusTrace({request:new Request('http://localhost/api/basemap/bus-trace',{method:'POST',body:Buffer.concat(chunks)})});
   res.writeHead(reply.status,Object.fromEntries(reply.headers.entries()));res.end(Buffer.from(await reply.arrayBuffer()));
  }catch{res.writeHead(502);res.end();}
 });
 server.middlewares.use('/api/basemap/tile',async(req,res,next)=>{
  if(req.method!=='GET')return next();
  const reply=await serveDistrictRoadTile(new Request('http://localhost/api/basemap/tile'+req.url));
  res.writeHead(reply.status,Object.fromEntries(reply.headers.entries()));
  res.end(Buffer.from(await reply.arrayBuffer()));
 });
}
export default defineConfig(({mode})=>{
const target=outputs[mode]?mode:'universal';
const uiOnly=mode==='ui-only';
return ({
  define:{__DJ_PLATFORM_BUILD__:JSON.stringify(target),__DJ_GUIDEBOOK_BYTES__:JSON.stringify(statSync(new URL('./public/dongjak-guidebook.pdf',import.meta.url)).size)},
  build:{outDir:outputs[target]||'dist',emptyOutDir:true},

  plugins:[{name:'district-road-data',configureServer:districtTileMiddleware,configurePreviewServer:districtTileMiddleware},{name:'dongjak-platform-html',enforce:'pre',transformIndexHtml(html){return platformHtml(html,target);}},
    {name:'dongjak-ui-only-transport-fallback',configureServer(server){
      if(!uiOnly)return;
      server.middlewares.use('/api/transport',(req,res)=>{
        res.writeHead(503,{
          'content-type':'application/json; charset=utf-8',
          'cache-control':'no-store',
          'x-content-type-options':'nosniff'
        });
        res.end(JSON.stringify({
          status:'unavailable',
          available:false,
          mode:'ui-only',
          notice:'UI 작업 모드에서는 로컬 5178 교통 API 서버를 실행하지 않습니다. 실시간 교통정보 확인은 npm run dev에서 진행하세요.'
        }));
      });
    }},
    {name:'dongjak-local-place-ai',configureServer(server){
    server.middlewares.use('/api/place-insight',async(req,res,next)=>{
      if(req.method!=='POST'&&req.method!=='GET')return next();
      try{
        const chunks=[];let size=0;
        if(req.method==='POST')for await(const buf of req){size+=buf.length;if(size>3072){res.writeHead(413);res.end('요청 크기 초과');return;}chunks.push(buf);}
        const base=`http://${req.headers.host||'127.0.0.1:5195'}`;
        const request=new Request(new URL('/api/place-insight',base),{
          method:req.method,headers:{'content-type':'application/json',...(req.headers.origin?{origin:req.headers.origin}:{})},
          ...(req.method==='POST'?{body:Buffer.concat(chunks)}:{})
        });
        const env={}; // Do not emulate Cloudflare Workers AI using OpenAI secrets.
        const reply=await (req.method==='GET'?onRequestGet({env}):onRequestPost({request,env}));
        res.writeHead(reply.status,Object.fromEntries(reply.headers.entries()));
        res.end(await reply.text());
      }catch{res.writeHead(502,{'content-type':'application/json; charset=utf-8'});res.end(JSON.stringify({message:'AI 설명 서버 오류'}));}
    });
  }}],
  server:{
    host:'127.0.0.1',
    port:5195,
    strictPort:true,
    proxy:{
      ...(uiOnly?{}:{'/api/transport':{target:'http://127.0.0.1:5178',changeOrigin:true}}),
      '/routing':{
        target:'https://valhalla1.openstreetmap.de',
        changeOrigin:true,
        rewrite:path=>path.replace(/^\/routing/,''),
        configure(proxy){
          proxy.on('proxyReq', request=>request.setHeader('X-Client-Id','dongjak-safety-prototype'));
        }
      }
    }
  }
});
});
