import {defineConfig} from '@playwright/test';
const screens=[['mobile375',375,812],['mobile390',390,844],['tablet768',768,1024],['tablet1024',1024,768],['pc1440',1440,900]];
export default defineConfig({
 testDir:'tests',testMatch:'v911-anonymous-ui.spec.mjs',timeout:180000,expect:{timeout:20000},
 workers:1,retries:0,reporter:[['list'],['html',{open:'never'}]],
 use:{baseURL:process.env.DONGJAK_TARGET_URL,browserName:'chromium',screenshot:'only-on-failure',trace:'off',video:'off',launchOptions:{args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}},
 projects:screens.map(([name,width,height])=>({name,use:{viewport:{width,height},isMobile:width<700,hasTouch:width<1080}}))
});
