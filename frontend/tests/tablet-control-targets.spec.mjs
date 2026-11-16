import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

for (const [name,width,height] of [
  ['tablet-portrait',768,1024],
  ['tablet-landscape',1024,768]
]) {
  test(name+' header/map tool 44px hit boxes, focus and non-overlap',async({page})=>{
    await page.setViewportSize({width,height});
    await page.goto('/');
    const targets=page.locator('.top-actions .circle-btn, .tool-stack .tool-btn');
    await expect(targets.first()).toBeVisible();
    const rects=[];
    for(const target of await targets.all()){
      const rect=await target.boundingBox();
      expect(rect?.width).toBeGreaterThanOrEqual(44);
      expect(rect?.height).toBeGreaterThanOrEqual(44);
      rects.push({label:await target.getAttribute('aria-label'),rect});
    }
    const search=await page.locator('.search-field').boundingBox();
    const header=await page.locator('.topbar').boundingBox();
    expect(search.x).toBeGreaterThanOrEqual(header.x);
    expect(search.x+search.width).toBeLessThanOrEqual(header.x+header.width+1);
    for(const item of rects){
      const r=item.rect;
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.x+r.width).toBeLessThanOrEqual(width+1);
      expect(r.y+r.height).toBeLessThanOrEqual(height+1);
    }
    await targets.first().focus();
    const focus=await targets.first().evaluate(el=>({
      outline:getComputedStyle(el).outlineStyle,
      width:getComputedStyle(el).outlineWidth
    }));
    expect(focus.outline).not.toBe('none');
    mkdirSync('visual-artifacts/tablet-controls',{recursive:true});
    await page.screenshot({path:'visual-artifacts/tablet-controls/'+name+'-light.png',animations:'disabled'});
    await page.locator('.top-actions [data-action="theme"]').click();
    await expect(page.locator('#app-shell')).toHaveClass(/theme-dark/);
    await page.screenshot({path:'visual-artifacts/tablet-controls/'+name+'-dark.png',animations:'disabled'});
    writeFileSync('visual-artifacts/tablet-controls/'+name+'.json',JSON.stringify({width,height,rects,search,header,focus},null,2));
  });
}
