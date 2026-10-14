import {test,expect} from '@playwright/test';
import {fidelityFixture} from './fixtures/browser-fidelity.mjs';
import {fidelityModel,analyzeFidelity} from '../rules/figma-browser-fidelity.mjs';
import {measureScreen} from './figma-browser-fidelity.mjs';
import {readFileSync} from 'node:fs';

for(const kind of ['layout','state','destination','modal','scroll','cards'])test(`${kind}: source geometry and settled browser baseline`,async({page})=>{
  await page.route('**/*',r=>r.abort());
  const f=fidelityFixture(kind);await page.setContent(f.html);await page.evaluate(()=>document.fonts.ready);
  const model=fidelityModel(f.projection,f.manifest);
  if(kind==='scroll')await page.locator('section').evaluate(el=>el.scrollTop=300);
  const measured=await measureScreen(page,model.screens[0]);
  expect(analyzeFidelity(model,[measured]).SOURCE_FIDELITY).toBe('PASS');
  await expect(page).toHaveScreenshot(`${kind}.png`);
});

test('meaningful regressions fail Playwright comparison without updating the baseline',async({page},testInfo)=>{
  test.skip(testInfo.config.updateSnapshots!=='none','Negative comparisons may never run in baseline-update mode.');
  const f=fidelityFixture();await page.setContent(f.html);
  const originalGolden=readFileSync(testInfo.snapshotPath('layout.png'));
  const expected=await page.screenshot({animations:'disabled',caret:'hide'});
  // Compare against a fixture-only golden; the negative output lives in test-results, never replaces it.
  expect(expected).toMatchSnapshot('layout.png');
  for(const change of ['move','text','fill','size']){
    await page.setContent(f.html);
    await page.evaluate(change=>{
      const button=document.querySelector('[data-figma-node="control"]');
      if(change==='move')button.style.left='124px';
      if(change==='text')document.querySelector('span').remove();
      if(change==='fill')button.style.background='red';
      if(change==='size')document.querySelector('section').style.width='400px';
    },change);
    const actual=await page.screenshot({animations:'disabled',caret:'hide'});
    let rejected=false;
    try{expect(actual).toMatchSnapshot('layout.png',{threshold:.05,maxDiffPixels:0});}catch{rejected=true;}
    expect(rejected,`${change} must be detected`).toBe(true);
    await testInfo.attach(`${change}-actual`,{body:actual,contentType:'image/png'});
  }
  expect(readFileSync(testInfo.snapshotPath('layout.png')).equals(originalGolden)).toBe(true);
});

test('DOM content, fill, missing control, font fallback and CSS size errors are distinguished',async({page})=>{
  const f=fidelityFixture(),model=fidelityModel(f.projection,f.manifest);
  for(const change of ['text','fill','missing','fallback','fontSize']){
    await page.setContent(f.html);
    await page.evaluate(change=>{
      const text=document.querySelector('span'),control=document.querySelector('[data-figma-node="control"]');
      if(change==='text')text.textContent='Wrong content';
      if(change==='fill')control.style.background='red';
      if(change==='missing')control.remove();
      if(change==='fallback')text.style.fontFamily='monospace';
      if(change==='fontSize')text.style.fontSize='40px';
    },change);
    const result=analyzeFidelity(model,[await measureScreen(page,model.screens[0])]);
    expect(result.SOURCE_FIDELITY).toBe(change==='fallback'?'WARN':'FAIL');
  }
});

test('modal size drift fails source geometry and the modal golden',async({page},testInfo)=>{
  test.skip(testInfo.config.updateSnapshots!=='none','Negative comparison cannot update goldens.');
  const f=fidelityFixture('modal'),model=fidelityModel(f.projection,f.manifest);
  await page.setContent(f.html);
  expect(await page.screenshot()).toMatchSnapshot('modal.png');
  await page.locator('section').evaluate(el=>el.style.width='460px');
  expect(analyzeFidelity(model,[await measureScreen(page,model.screens[0])]).SOURCE_FIDELITY).toBe('FAIL');
  let rejected=false;
  try{expect(await page.screenshot()).toMatchSnapshot('modal.png',{threshold:.05,maxDiffPixels:0});}catch{rejected=true;}
  expect(rejected).toBe(true);
});
