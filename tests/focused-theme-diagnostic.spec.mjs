import {test,expect} from '@playwright/test';
test('native theme transition diagnostic',async({page})=>{
 test.setTimeout(120000);
 await page.addInitScript(()=>{
  const observer=new MutationObserver(()=>{
   const app=document.querySelector('#app');
   if(app && app.dataset.theme!==window.__lastAuditTheme){
    window.__lastAuditTheme=app.dataset.theme;
    console.info('AUDIT theme='+app.dataset.theme);
   }
  });
  observer.observe(document,{subtree:true,attributes:true,attributeFilter:['data-theme']});
 });
 page.on('console',m=>{if(m.text().startsWith('AUDIT'))console.log(m.text());});
 page.on('framenavigated',f=>{if(f===page.mainFrame())console.log('AUDIT main frame navigation');});
 await page.goto('/');
 await expect(page.locator('#map-startup-overlay')).toBeHidden({timeout:30000});
 const tour=page.locator('#dj860-onboarding');
 if(await tour.isVisible())await tour.locator('[data-dj860-action="skip"]').click({timeout:20000});
 const control=page.locator('#theme-toggle');
 console.log('AUDIT visible='+await control.isVisible());
 if(await page.locator('#app').getAttribute('data-theme')!=='dark')await control.evaluate(b=>b.click());
 await expect(page.locator('#app')).toHaveAttribute('data-theme','dark',{timeout:15000});
});
