import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { chromium } from '@playwright/test';
import { browserFixture, browserMotionCases } from './fixtures/browser-motion.mjs';
import { verifyBrowserMotion } from './figma-browser-motion-check.mjs';

test('source-shaped browser motion: all shipped tokens, vectors, reduced motion, history and local resources', async () => {
  let fixture=browserFixture(browserMotionCases[1]);
  const server=createServer((req,res)=>{const files={'/':fixture.html,'/app.js':fixture.app,'/styles.css':fixture.css};res.writeHead(200,{'Content-Type':req.url==='/app.js'?'text/javascript':req.url==='/styles.css'?'text/css':'text/html'});res.end(files[req.url]??'');});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url=`http://127.0.0.1:${server.address().port}/`, external=[];
  const browser=await chromium.launch({headless:true});
  try {
    const context=await browser.newContext({serviceWorkers:'block'});
    await context.route('**/*',route=>{if(!route.request().url().startsWith(url)){external.push(route.request().url());return route.abort();}return route.continue();});
    await context.routeWebSocket('**/*',socket=>{external.push(socket.url());socket.close();});
    const page=await context.newPage();
    let count=0;
    for(const example of browserMotionCases.filter(c=>!c.name.startsWith('experimental'))){
      fixture=browserFixture(example);
      await page.goto('about:blank');
      const rows=await verifyBrowserMotion(page,fixture.manifest,url);
      assert.equal(rows.length,2,example.name);count+=rows.length;
      for(const row of rows)assert.equal(row.passed,true,`${example.name} ${JSON.stringify(row)}`);
      if(example.navigation==='NAVIGATE'){
        await page.goto(url);await page.locator('a').press('Enter');await page.goBack();assert.equal(await page.locator('[data-figma-screen="fixture:a"]').isVisible(),true);
        await page.goForward();assert.equal(await page.locator('[data-figma-screen="fixture:b"]').isVisible(),true);
        await page.goto(url+'#/screen/fixture:b');assert.equal(await page.locator('[data-figma-screen="fixture:b"]').isVisible(),true);
        await page.goto(url+'#/screen/missing');assert.equal(await page.locator('[data-figma-screen="fixture:a"]').isVisible(),true);
      }
    }
    fixture=browserFixture(browserMotionCases.find(c=>c.name==='SCROLL_SMOOTH'));
    await page.goto('about:blank');await page.emulateMedia({reducedMotion:'no-preference'});await page.goto(url);
    const interruption=await page.evaluate(async()=>{
      const control=document.querySelector('[data-figma-node="fixture:control"]'),container=document.querySelector('[data-figma-node="fixture:scroller"]'),root=document.querySelector('[data-figma-app]');
      control.click();await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      container.dispatchEvent(new WheelEvent('wheel',{bubbles:true}));const stopped=container.scrollTop;
      await new Promise(resolve=>setTimeout(resolve,300));
      const cancelled=container.scrollTop===stopped&&root.dataset.figmaMotionState==='settled';
      control.click();await new Promise(resolve=>setTimeout(resolve,300));return{cancelled,final:container.scrollTop};
    });
    assert.equal(interruption.cancelled,true);assert.equal(interruption.final,fixture.expectedScrollEnd);
    await page.locator('[data-figma-node="fixture:scroller"]').evaluate(el=>el.scrollTop=0);
    await page.locator('[data-figma-node="fixture:control"]').evaluate(el=>el.click());
    await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(60);
    assert.equal(await page.locator('[data-figma-node="fixture:scroller"]').evaluate(el=>el.scrollTop),fixture.expectedScrollEnd);
    assert.equal(await page.locator('[data-figma-app]').getAttribute('data-figma-motion-state'),'settled');
    fixture=browserFixture(browserMotionCases.find(c=>c.name==='NAV_DEFAULT'));
    await page.goto('about:blank');await page.emulateMedia({reducedMotion:'no-preference'});await page.goto(url);
    await page.locator('[data-figma-node="fixture:label"]').click();
    await page.waitForFunction(()=>document.querySelector('[data-figma-app]').dataset.figmaMotion==='NAV_DEFAULT');
    assert.equal(await page.locator('[data-figma-app]').getAttribute('data-figma-motion'),'NAV_DEFAULT');
    await page.waitForTimeout(250);assert.equal(await page.locator('[data-figma-screen="fixture:b"]').isVisible(),true);
    assert.equal(count,50);assert.deepEqual(external,[]);
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
});

test('false motion hooks cannot replace actual crossfade behavior',async()=>{
  const fixture=browserFixture(browserMotionCases.find(c=>c.name==='NAV_DEFAULT'));
  const browser=await chromium.launch({headless:true});
  try {
    const page=await browser.newPage();
    await page.route('http://motion.invalid/**',route=>route.fulfill({contentType:'text/html',body:fixture.html.replace('<link rel="stylesheet" href="styles.css">',`<style>${fixture.css}</style>`).replace('<script src="app.js"></script>',`<script>Element.prototype.animate=function(){return{finished:Promise.resolve(),cancel(){}}};${fixture.app}</script>`)}));
    const rows=await verifyBrowserMotion(page,fixture.manifest,'http://motion.invalid/');
    assert.equal(rows.find(r=>r.mode==='no-preference').passed,false);
  }finally{await browser.close();}
});
