import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

for (const [name,width,height] of [
  ['pc-1280',1280,800],
  ['pc-1440',1440,900],
  ['pc-1920',1920,1080]
]) {
  test(name+' map tool target size and alignment',async({page})=>{
    await page.setViewportSize({width,height});
    await page.goto('/');
    const stack=page.locator('.tool-stack');
    const tools=stack.locator('.tool-btn');
    await expect(tools).toHaveCount(5);
    mkdirSync('visual-artifacts/desktop-map-tools',{recursive:true});
    // Baseline CSS is the original 39px rule, isolated for comparison without modifying source.
    await page.addStyleTag({content:'@media (min-width:1100px){.tool-stack .tool-btn{width:39px!important;height:39px!important}}'});
    const before=await tools.first().boundingBox();
    expect(before.width).toBe(39);
    await page.screenshot({path:'visual-artifacts/desktop-map-tools/'+name+'-before.png',animations:'disabled'});
    await page.locator('style').last().evaluate(el=>el.remove());
    const bounds=[];
    for(const tool of await tools.all()){
      const r=await tool.boundingBox();
      expect(r.width).toBeGreaterThanOrEqual(44);
      expect(r.height).toBeGreaterThanOrEqual(44);
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.x+r.width).toBeLessThanOrEqual(width+1);
      bounds.push({name:await tool.getAttribute('aria-label'),...r});
    }
    const search=await page.locator('.search-field').boundingBox();
    const header=await page.locator('.topbar').boundingBox();
    expect(search.x).toBeGreaterThanOrEqual(header.x);
    expect(search.x+search.width).toBeLessThanOrEqual(header.x+header.width+1);
    const stackRect=await stack.boundingBox();
    expect(stackRect.y).toBeGreaterThanOrEqual(header.y+header.height);
    await tools.first().focus();
    const focus=await tools.first().evaluate(el=>({style:getComputedStyle(el).outlineStyle,width:getComputedStyle(el).outlineWidth}));
    expect(focus.style).not.toBe('none');
    await page.screenshot({path:'visual-artifacts/desktop-map-tools/'+name+'-after.png',animations:'disabled'});
    await page.locator('.top-actions [data-action="theme"]').click();
    await expect(page.locator('#app-shell')).toHaveClass(/theme-dark/);
    await page.screenshot({path:'visual-artifacts/desktop-map-tools/'+name+'-dark.png',animations:'disabled'});
    writeFileSync('visual-artifacts/desktop-map-tools/'+name+'.json',JSON.stringify({width,height,before,after:bounds,search,header,stack:stackRect,focus},null,2));
  });
}
