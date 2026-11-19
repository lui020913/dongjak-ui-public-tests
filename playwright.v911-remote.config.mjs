import {defineConfig} from '@playwright/test';

const iphone='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const android='Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36';
const screens=[
  ['mobile375',375,812,iphone],
  ['mobile390',390,844,iphone],
  ['mobile430',430,932,android]
];
export default defineConfig({
  testDir:'tests',testMatch:'v911-anonymous-ui.spec.mjs',timeout:180000,expect:{timeout:20000},
  // Each test has a fresh anonymous Playwright browser context. Permit tests
  // from the same spec to run concurrently; keep a bounded worker pool for WebGL.
  fullyParallel:true,workers:4,retries:0,reporter:[['list'],['html',{open:'never'}]],
  use:{baseURL:process.env.DONGJAK_TARGET_URL,browserName:'chromium',screenshot:'only-on-failure',trace:'off',video:'off',launchOptions:{args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}},
  projects:[...screens.map(([name,width,height,userAgent])=>({name,use:{viewport:{width,height},isMobile:true,hasTouch:true,userAgent}})),{name:'mobile390-webkit-header',grep:/layer header follows a real pointer|phone update history rises monotonically/,use:{browserName:'webkit',viewport:{width:390,height:844},isMobile:true,hasTouch:true,userAgent:iphone,launchOptions:{args:[]}}}]
});
