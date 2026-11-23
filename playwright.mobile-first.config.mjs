import {defineConfig} from '@playwright/test';

const sizes=[
  {name:'mobile375',width:375,height:812,isMobile:true,hasTouch:true},
  {name:'mobile390',width:390,height:844,isMobile:true,hasTouch:true},
  {name:'mobile430',width:430,height:932,isMobile:true,hasTouch:true},
  {name:'tablet768',width:768,height:1024,isMobile:false,hasTouch:true},
  {name:'tablet820',width:820,height:1180,isMobile:false,hasTouch:true},
  {name:'tablet1024',width:1024,height:768,isMobile:false,hasTouch:true},
  {name:'tablet1180',width:1180,height:820,isMobile:false,hasTouch:true},
  {name:'desktop1280',width:1280,height:800,isMobile:false,hasTouch:false},
  {name:'desktop1440',width:1440,height:900,isMobile:false,hasTouch:false},
  {name:'desktop1920',width:1920,height:1080,isMobile:false,hasTouch:false}
];

export default defineConfig({
  testDir:'./tests',
  testMatch:'mobile-first-unified-layout.spec.mjs',
  // A single software-WebGL browser owns the mobile viewport smoke run.
  // Three simultaneous map contexts caused nondeterministic pointer-action
  // timeouts in CI; keep all 12 scenarios and all three viewport projects.
  fullyParallel:true,
  workers:1,
  reporter:[['list'],['html',{outputFolder:'playwright-report-mobile-first',open:'never'}]],
  outputDir:'test-results-mobile-first',
  timeout:30000,
  expect:{timeout:8000},
  use:{
    baseURL:'http://127.0.0.1:4173',
    headless:true,
    trace:'retain-on-failure',
    screenshot:'only-on-failure'
  },
  projects:sizes.map(({name,width,height,isMobile,hasTouch})=>({
    name,
    use:{viewport:{width,height},isMobile,hasTouch}
  })),
  webServer:{
    command:'cd app && npx vite preview --host 127.0.0.1 --port 4173 --strictPort',
    url:'http://127.0.0.1:4173',
    reuseExistingServer:!process.env.CI,
    timeout:120000,
    stdout:'ignore',
    stderr:'pipe'
  }
});
