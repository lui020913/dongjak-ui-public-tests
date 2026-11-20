import {test,expect} from './live-qa-fixture.mjs';
test('live QA capture synthetic moving sheet',async({page})=>{
  await page.route('https://audit-fixture.invalid/',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><meta name="viewport" content="width=device-width"><style>body{margin:0;background:#e4ebe4}#djNext-layer-panel{position:fixed;bottom:0;width:100%;height:240px;display:flex;flex-direction:column;background:white;transform:translateY(180px);transition:transform 300ms linear}#djNext-layer-panel.open{transform:none}header{height:40px;flex:none}.djNext-layer-scroll{overflow:auto;flex:1}.djNext-layer-action{height:48px;display:block;width:100%}</style><button id="show" onclick="document.querySelector('#djNext-layer-panel').classList.add('open')">open</button><div id="djNext-layer-panel" class="djNext-modal-body"><header>Layers</header><div class="djNext-modal-body"><div class="djNext-layer-scroll">${Array.from({length:12},(_,i)=>'<button class="djNext-layer-action">Layer '+i+'</button>').join('')}</div></div></div>`}));
  await page.goto('https://audit-fixture.invalid/');
  await page.waitForTimeout(350);
  await page.locator('#show').click();
  await page.waitForTimeout(500);
  await expect(page.locator('#djNext-layer-panel')).toHaveClass(/open/);
  await page.waitForTimeout(350);
});
