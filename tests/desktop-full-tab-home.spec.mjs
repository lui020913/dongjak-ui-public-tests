import { test, expect } from '@playwright/test';

test('desktop full-tab route to Home preserves map state', async ({page},info) => {
  test.setTimeout(150000); // Full desktop map initialization can exceed 110 seconds on public hosted runners.
  const events=[];
  page.on('pageerror',e=>events.push({type:'pageerror',message:String(e).slice(0,240)}));
  page.on('framenavigated',frame=>{if(frame===page.mainFrame())events.push({type:'navigation',url:frame.url()});});
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#app')).toBeVisible({timeout:30000});
  await expect(page.locator('#map')).toBeVisible({timeout:30000});
  await expect(page.locator('#map-startup-overlay')).toBeHidden({timeout:30000});
  await expect(page.locator('#app')).toHaveAttribute('data-dj-auth-state',/^(signed-out|signed-in)$/,{timeout:30000});
  await page.waitForTimeout(450);

  const state=async()=>page.evaluate(()=>{
    const app=document.getElementById('app');
    return {url:location.href,appTab:app?.getAttribute('data-tab'),
      connected:app?.isConnected,activeTabs:[...document.querySelectorAll('#bottom-nav .nav-tab.active')].map(x=>x.dataset.tab),
      openPages:[...document.querySelectorAll('#route-panel,#participation-panel,#news-panel,#mine-panel')].filter(x=>!x.hidden).map(x=>x.id),
      onboardingVisible:!!document.querySelector('#dj860-onboarding:not([hidden])')
    };
  });
  const clickKey=async key=>{
    const legacy=page.locator('#bottom-nav .nav-tab[data-tab="'+key+'"]');
    const loc=key==='map' && !await legacy.isVisible().catch(()=>false)
      ? page.getByRole('navigation',{name:'앱 주요 기능'}).getByRole('button',{name:/안전지도/})
      : legacy;
    await expect(loc).toBeVisible();
    const b=await loc.boundingBox();
    expect(b,key+' button needs a click region').toBeTruthy();
    const x=b.x+b.width/2,y=b.y+b.height/2;
    const hit=await page.evaluate(({x,y,key})=>{
      const button=document.elementFromPoint(x,y)?.closest?.('#bottom-nav button');
      return Boolean(button && (button.dataset.tab===key ||
        (key==='map' && ((button.getAttribute('aria-label')||'').includes('안전지도') ||
          (button.textContent||'').includes('안전지도')))));
    },{x,y,key});
    expect(hit,key+' center must not be covered').toBe(true);
    await page.mouse.click(x,y);
    await page.waitForTimeout(350);
  };
  const dismiss=async()=>{
    const dialog=page.locator('#dj860-onboarding');
    if(!await dialog.isVisible().catch(()=>false))return;
    const skip=dialog.locator('[data-dj860-action="skip"]');
    await expect(skip).toBeVisible();
    const b=await skip.boundingBox();expect(b).toBeTruthy();
    await page.mouse.click(b.x+b.width/2,b.y+b.height/2);
    await expect(dialog).toBeHidden({timeout:9000});
  };
  try {
    await dismiss();
    events.push({stage:'initial',state:await state()});
    for(const [key,panel] of [
      ['route','#route-panel'],['participate','#participation-panel'],
      ['news','#news-panel'],['mine','#mine-panel']
    ]){
      await dismiss();
      await clickKey(key);
      events.push({stage:key,state:await state()});
      await expect(page.locator('#app')).toHaveAttribute('data-tab',key);
      await expect(page.locator(panel)).toBeVisible();
    }
    await dismiss();
    await clickKey('map');
    events.push({stage:'map-after-350ms',state:await state()});
    await expect(page.locator('#app')).toHaveAttribute('data-tab','map',{timeout:7500});
    await expect(page.locator('#map')).toBeVisible();
    for(const id of ['#route-panel','#participation-panel','#news-panel','#mine-panel']){
      await expect(page.locator(id)).toBeHidden();
    }
  } finally {
    console.log('DJ_EXACT_HOME_ROUTE',JSON.stringify(events).slice(0,18000));
    await info.attach('full-tab-state.json',{body:Buffer.from(JSON.stringify(events,null,2)),contentType:'application/json'});
    // Do not await screenshot/fonts.ready in a diagnostic finally block.\n    // Playwright already captures a screenshot on assertion failure.
  }
});