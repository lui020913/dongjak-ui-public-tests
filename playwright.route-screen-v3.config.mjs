import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir:'./tests',
  testMatch:'route-screen-v3.spec.mjs',
  workers:1,
  fullyParallel:false,
  reporter:[['list'],['html',{outputFolder:'playwright-report-route-v3',open:'never'}]],
  outputDir:'test-results-route-v3',
  timeout:90000,
  expect:{timeout:20000},
  use:{
    baseURL:'http://127.0.0.1:4173',
    headless:true,
    screenshot:'only-on-failure',
    trace:'retain-on-failure'
  },
  projects:[
    {name:'mobile375',use:{viewport:{width:375,height:812},isMobile:true,hasTouch:true}},
    {name:'mobile390',use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}},
    {name:'mobile430',use:{viewport:{width:430,height:932},isMobile:true,hasTouch:true}}
  ],
  webServer:{
    command:'cd app && npx vite preview --host 127.0.0.1 --port 4173 --strictPort',
    url:'http://127.0.0.1:4173',
    reuseExistingServer:!process.env.CI,
    timeout:120000,
    stdout:'ignore',stderr:'pipe'
  }
});
