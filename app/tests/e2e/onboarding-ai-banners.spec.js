import {test,expect} from '@playwright/test';

const pages=[
 ['map-overview','01-map-overview.png'],
 ['safety-layers','02-safety-layers.png'],
 ['walking-route','03-walking-route.png'],
 ['local-discovery','04-local-discovery.png'],
 ['account-favorites','05-account-favorites.png']
];

test('existing five onboarding pages display 2:1 green AI banners without disturbing navigation',async({page})=>{
 test.setTimeout(260000);
 await page.goto('/',{waitUntil:'domcontentloaded',timeout:50000});
 const overlay=page.locator('#dj860-onboarding');
 await expect(overlay).toBeVisible({timeout:90000});
 for(const [i,[slot,file]] of pages.entries()){
   const visual=overlay.locator('.dj860-visual');
   await expect(visual).toHaveAttribute('data-image-slot',slot,{timeout:20000});
   const image=visual.locator('img.dj860-screen-image');
   await expect(image).toHaveAttribute('src','/onboarding/'+file);
   await expect.poll(async()=>image.evaluate(n=>n.complete?n.naturalWidth:0),{
     timeout:30000,intervals:[250,500,1000]
   }).toBe(1440);
   await expect(visual).toHaveClass(/dj860-has-photo/);
   await expect(visual.locator('.dj860-art-svg')).toHaveCount(0);
   // The artwork itself is rectangular: no rounded clipping on its own frame.
   const radii=await visual.evaluate(n=>({
     frame:getComputedStyle(n).borderTopLeftRadius,
     image:getComputedStyle(n.querySelector('img')).borderTopLeftRadius
   }));
   expect(radii.frame).toBe('0px');
   expect(radii.image).toBe('0px');
   const dimensions=await visual.evaluate(n=>{
     const pane=n.closest('.dj860-visual-pane');
     const r=n.getBoundingClientRect(), p=pane.getBoundingClientRect();
     const img=n.querySelector('img');
     const ir=img.getBoundingClientRect();
     return {
       visualWidth:r.width, visualHeight:r.height,
       paneWidth:p.width, paneHeight:p.height,
       imageWidth:ir.width, imageHeight:ir.height,
       leftGap:r.left-p.left, rightGap:p.right-r.right,
       topGap:r.top-p.top, bottomGap:p.bottom-r.bottom,
       imageLeftGap:ir.left-p.left, imageRightGap:p.right-ir.right,
       fit:getComputedStyle(img).objectFit,
       padding:getComputedStyle(pane).paddingLeft
     };
   });
   console.log('ONBOARDING HERO DIMENSIONS '+JSON.stringify({slot,...dimensions}));
   expect(Math.abs(dimensions.leftGap)).toBeLessThanOrEqual(2);
   expect(Math.abs(dimensions.rightGap)).toBeLessThanOrEqual(2);
   expect(Math.abs(dimensions.topGap)).toBeLessThanOrEqual(2);
   expect(Math.abs(dimensions.bottomGap)).toBeLessThanOrEqual(2);
   expect(Math.abs(dimensions.imageLeftGap)).toBeLessThanOrEqual(2);
   expect(Math.abs(dimensions.imageRightGap)).toBeLessThanOrEqual(2);
   expect(dimensions.visualWidth).toBeGreaterThan(150);
   expect(dimensions.visualHeight).toBeGreaterThan(65);
   expect(Math.abs(dimensions.paneWidth-dimensions.visualWidth)).toBeLessThanOrEqual(2);
   expect(Math.abs(dimensions.paneHeight-dimensions.visualHeight)).toBeLessThanOrEqual(2);
   expect(Math.abs(dimensions.paneWidth-dimensions.imageWidth)).toBeLessThanOrEqual(2);
   expect(Math.abs(dimensions.paneHeight-dimensions.imageHeight)).toBeLessThanOrEqual(2);
   expect(dimensions.padding).toBe('0px');
   expect(dimensions.fit).toBe('cover');
   await expect(overlay.locator('#dj860-count')).toContainText(String(i+1).padStart(2,'0')+' / 05');
   // Screenshot-driven footer request: bold Skip, dots at far right,
   // and Prev/Next aligned to the same right edge.
   const footer=await overlay.evaluate(root=>{
     const skip=root.querySelector('.dj860-skip');
     const dots=root.querySelector('.dj860-dots');
     const lastDot=dots.querySelector('.dj860-dot:last-child');
     const actions=root.querySelector('.dj860-actions');
     const next=root.querySelector('.dj860-next');
     const prev=root.querySelector('.dj860-prev');
     const d=dots.getBoundingClientRect(), dot=lastDot.getBoundingClientRect();
     const a=actions.getBoundingClientRect(), n=next.getBoundingClientRect();
     return {
       skipWeight:Number(getComputedStyle(skip).fontWeight),
       dotsJustify:getComputedStyle(dots).justifyContent,
       actionsJustify:getComputedStyle(actions).justifyContent,
       dotRightGap:d.right-dot.right,
       nextRightGap:a.right-n.right,
       prevVisible:getComputedStyle(prev).display!=='none'
     };
   });
   expect(footer.skipWeight).toBeGreaterThanOrEqual(800);
   expect(['flex-end','flow-end','end']).toContain(footer.dotsJustify);
   expect(['flex-end','flow-end','end']).toContain(footer.actionsJustify);
   expect(Math.abs(footer.dotRightGap)).toBeLessThanOrEqual(3);
   expect(Math.abs(footer.nextRightGap)).toBeLessThanOrEqual(3);
   expect(footer.prevVisible).toBe(i>0);
   if(i<pages.length-1){
     const next=overlay.locator('[data-dj860-action="next"]');
     await next.click({noWaitAfter:true,timeout:45000});
   }
 }
 await expect(overlay.locator('[data-dj860-action="next"]')).toContainText('시작하기');
});
