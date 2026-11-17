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
 const mine=page.locator('#bottom-nav .nav-tab[data-tab="mine"]');
 await mine.click({timeout:12000,noWaitAfter:true});
 await expect(page.locator('#app')).toHaveAttribute('data-tab','mine');
 console.log('AUDIT theme controls='+JSON.stringify(await page.locator('button,[role="button"]').evaluateAll(nodes=>nodes.filter(n=>n.getBoundingClientRect().width>0&&n.getBoundingClientRect().height>0).map(n=>({id:n.id,label:n.getAttribute('aria-label'),text:n.textContent.trim().slice(0,100)})).filter(n=>/테마|다크|라이트|화면 모드|theme|dark/i.test(JSON.stringify(n))))));
 await page.getByRole('button',{name:/화면 테마/}).click({timeout:12000,noWaitAfter:true});
 await page.waitForTimeout(1500);
 console.log('AUDIT visible text='+JSON.stringify((await page.locator('body').innerText()).split('\n').filter(s=>/테마|다크|라이트|어둡|밝은|dark|light/i.test(s)).slice(0,40)));
 console.log('AUDIT theme choices='+JSON.stringify(await page.locator('button,[role="button"],[role="radio"],label').evaluateAll(nodes=>nodes.filter(n=>n.getBoundingClientRect().width>0&&n.getBoundingClientRect().height>0).map(n=>({id:n.id,label:n.getAttribute('aria-label'),text:n.textContent.trim().slice(0,100)})).filter(n=>/테마|다크|라이트|dark/i.test(JSON.stringify(n))))));
 const control=page.getByText(/^(다크|다크 모드|다크모드|어두운 테마|어두운 모드|Dark)$/i).filter({visible:true}).first();
 console.log('AUDIT visible='+await control.isVisible());
 if(await page.locator('#app').getAttribute('data-theme')!=='dark')await control.click({timeout:12000,noWaitAfter:true});
 await expect(page.locator('#app')).toHaveAttribute('data-theme','dark',{timeout:15000});
});
