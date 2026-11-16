import { test, expect } from '@playwright/test';
const viewports = [
  { name:'pc-1920',project:'desktop',width:1920,height:1080 },
  { name:'pc-1440',project:'desktop',width:1440,height:900 },
  { name:'pc-1280',project:'desktop',width:1280,height:800 },
  { name:'mobile-430',project:'mobile',width:430,height:932 },
  { name:'mobile-390',project:'mobile',width:390,height:844 },
  { name:'mobile-375',project:'mobile',width:375,height:812 }
];
for (const viewport of viewports) {
  test('anonymous responsive capture ' + viewport.name, async ({page}, info) => {
    test.skip(info.project.name !== viewport.project, 'Other device class');
    await page.setViewportSize({width:viewport.width,height:viewport.height});
    const response = await page.goto('/', { waitUntil:'domcontentloaded' });
    expect(response, 'No HTTP response').toBeTruthy();
    expect(response.status(), 'Bad HTTP status').toBeLessThan(400);
    await expect(page.locator('#map')).toBeVisible({timeout:30000});
    await page.waitForTimeout(500);
    const layout = await page.evaluate(() => {
      const width = document.documentElement.clientWidth;
      const selectors = ['#app','#map','#bottom-nav','#route-panel','#detail-sheet'];
      const panels = Object.fromEntries(selectors.map(selector => {
        const el = document.querySelector(selector);
        if (!el) return [selector,null];
        const r = el.getBoundingClientRect();
        return [selector,{left:Math.round(r.left),right:Math.round(r.right),width:Math.round(r.width),visible:r.width>0&&r.height>0}];
      }));
      return { viewport:{width,height:innerHeight},documentOverflowPx:Math.max(0,document.documentElement.scrollWidth-width),panels };
    });
    await info.attach(viewport.name + '-layout.json',{body:Buffer.from(JSON.stringify(layout,null,2)),contentType:'application/json'});
    await info.attach(viewport.name + '.png',{body:await page.screenshot({animations:'disabled',fullPage:false}),contentType:'image/png'});
    console.log(viewport.name,'document overflow:',layout.documentOverflowPx,'px');
  });
}
