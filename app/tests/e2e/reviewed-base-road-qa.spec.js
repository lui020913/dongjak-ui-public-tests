import {test,expect} from '@playwright/test';
import {dismissOnboarding,clickRealPointer} from './helpers.js';
// Coordinates are based on the checked-in Seoul bus stop registry; the
// screenshot centers are approximate offsets south of the named stops.
for(const site of [
 {key:'campus',lng:126.9563,lat:37.5035},
 {key:'sangdo-elementary',lng:126.93615,lat:37.50235},
 {key:'nodeul-sayuksin',lng:126.94865,lat:37.5122},
]){
test('reviewed base roads load at '+site.key+' and return to original on zoom out',async({page})=>{
 test.skip(process.env.DONGJAK_ROAD_REVIEW_QA!=='1','Pinned reviewed asset package is required');
 test.setTimeout(240000);
 await page.addInitScript((location)=>localStorage.setItem('dongjak_safety_community_v15_posts',JSON.stringify([{id:'qa-road-campus',title:'도로 검증 위치',body:'기본 지도 검증',nickname:'검증 주민',category:'동네 질문',dong:'상도1동',created:Date.now(),location,comments:[],likes:0}])),{lng:site.lng,lat:site.lat});
 const requested=new Set(),failed=[];
 page.on('response',r=>{const u=new URL(r.url());if((u.pathname.startsWith('/data/road-display-review/')||u.pathname.startsWith('/data/road-display-repair/'))){if(r.ok())requested.add(u.pathname);else failed.push(u.pathname+':'+r.status())}});
 await page.goto('/',{waitUntil:'domcontentloaded'});
 const menu=page.locator('#dj-install-menu');await expect(menu).toBeAttached({timeout:20000});
 if(await menu.isVisible()){await menu.getByRole('button',{name:'웹에서 바로 이용하기'}).click();await expect(menu).toBeHidden();}
 const startup=page.locator('#map-startup-overlay'),next=page.locator('#map-startup-continue');
 await expect.poll(async()=>!await startup.isVisible()||await next.isVisible(),{timeout:60000}).toBe(true);
 if(await startup.isVisible()&&await next.isVisible())await clickRealPointer(page,next,'startup continue');
 await expect(startup).toBeHidden({timeout:30000});await dismissOnboarding(page);
 const app=page.locator('#app');
 await page.locator('#bottom-nav [data-tab="participate"]').click();
 await page.locator('.community-open-detail').filter({hasText:'도로 검증 위치'}).click();
 await page.locator('.community-location-link').click();
 await expect(app).toHaveAttribute('data-tab','map');await expect(page.locator('#participation-panel')).toBeHidden();
 await expect(page.locator('#dj-community-location-card')).toBeVisible();
 // Wait for the camera jump before closing the location card; closing the
 // marker too early can legitimately cancel its deferred camera movement.
 await expect(app).toHaveAttribute('data-dj-reviewed-base-roads','selective-operational',{timeout:90000});
 await page.locator('#dj-community-location-card').getByRole('button',{name:'제보 위치 닫기'}).click();
 expect(failed).toEqual([]);
 expect(requested.has('/data/road-display-review/manifest.json')).toBe(true);
 if(process.env.DONGJAK_RECOVERED_ROADS_QA==='1')expect(requested.has('/data/road-display-repair/recovered-surfaces.geojson')).toBe(true);
 const count=[...requested].filter(p=>/\/road-\d+-\d+-\d+\.geojson$/.test(p)).length;
 expect(count).toBeGreaterThan(0);expect(count).toBeLessThan(90);
 await page.screenshot({path:'test-results/reviewed-base-'+site.key+'.png'});
 // Wheel zoom out is an actual map input; no map object exposure required.
 const canvas=page.locator('#map canvas.maplibregl-canvas').first();const rect=await canvas.boundingBox();
 await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);
 for(let i=0;i<8;i++){await page.mouse.wheel(0,300);await page.waitForTimeout(180);}
 await expect(app).not.toHaveAttribute('data-dj-reviewed-base-roads',/operational$/,{timeout:30000});
 console.log('ACTUAL_APP_BASE_ROAD_QA_OK',JSON.stringify({site:site.key,viewportFiles:count,selectiveNativeReplacement:true,zoomFallback:true}));
});

}
