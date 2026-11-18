import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./tests/e2e',testMatch:'v910-request-completion.spec.js',timeout:180000,
 expect:{timeout:20000},workers:1,retries:0,reporter:[['list'],['html',{outputFolder:'playwright-v910-report',open:'never'}]],
 use:{baseURL:'http://127.0.0.1:5195',browserName:'chromium',...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{}),screenshot:'only-on-failure',trace:{mode:'retain-on-failure',screenshots:false,snapshots:true,sources:true},launchOptions:{args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}},
 projects:[{name:'mobile375',use:{viewport:{width:375,height:812},isMobile:true,hasTouch:true}},{name:'mobile390',use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}},{name:'tablet768',use:{viewport:{width:768,height:1024},hasTouch:true}},{name:'tablet1024',use:{viewport:{width:1024,height:768},hasTouch:true}},{name:'pc1440',use:{viewport:{width:1440,height:900}}}],
 webServer:{command:'npm run dev:ui',url:'http://127.0.0.1:5195',reuseExistingServer:!process.env.CI,timeout:120000}
});
