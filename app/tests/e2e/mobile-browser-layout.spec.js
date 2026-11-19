import {test,expect} from '@playwright/test';
const mode=async page=>page.evaluate(()=>document.documentElement.dataset.djRunMode);
const navHeight=async page=>page.evaluate(()=>{
  const app=document.getElementById('app');
  return getComputedStyle(app).getPropertyValue('--dj829-nav-h').trim();
});

for(const [width,height,expected] of [[375,812,'66px'],[390,844,'66px'],[430,932,'66px'],[375,667,'60px']]){
  test(`phone browser ${width}x${height} gets a separate dock profile`,async({page},testInfo)=>{
    test.skip(testInfo.project.name!=='mobile','Mobile browser test');
    await page.setViewportSize({width,height});
    await page.goto('/',{waitUntil:'domcontentloaded'});
    await expect.poll(()=>mode(page)).toBe('browser');
    await expect.poll(()=>navHeight(page)).toBe(expected);
    expect(await page.evaluate(()=>document.documentElement.style.getPropertyValue('--dj-browser-vvh'))).toMatch(/px$/);
    expect(await page.evaluate(()=>document.querySelector('#bottom-nav')!==null)).toBe(true);
  });
}
test('iOS home-screen standalone never inherits browser geometry',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='mobile','Mobile PWA test');
  await page.addInitScript(()=>{
    Object.defineProperty(navigator,'standalone',{configurable:true,get:()=>true});
  });
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await expect.poll(()=>mode(page)).toBe('pwa');
  expect(await page.evaluate(()=>document.documentElement.style.getPropertyValue('--dj-browser-vvh'))).toBe('');
  expect(await navHeight(page)).not.toBe('66px');
});
test('desktop does not inherit phone browser profile',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop','Desktop test');
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await expect.poll(()=>mode(page)).toBe('desktop');
  expect(await page.evaluate(()=>document.documentElement.style.getPropertyValue('--dj-browser-vvh'))).toBe('');
});
