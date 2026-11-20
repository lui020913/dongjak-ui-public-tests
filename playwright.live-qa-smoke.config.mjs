import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'tests',testMatch:'live-qa-smoke.spec.mjs',workers:1,retries:0,timeout:20000,use:{browserName:'chromium',viewport:{width:390,height:844},isMobile:true,hasTouch:true}});
