// Exercises real computed/intermediate/final DOM behavior, not hooks alone.
export async function verifyBrowserMotion(page, manifest, baseUrl) {
  const rows = [];
  const selector = (key,id) => `[data-figma-${key}=${JSON.stringify(id)}]`;
  const source = i => page.locator(selector('screen',i.sourceScreenId)).locator(selector('node',i.sourceId));
  const screen = id => page.locator(selector('screen',id));
  const app = page.locator('[data-figma-app]');
  for (const mode of ['no-preference','reduce']) {
    await page.emulateMedia({ reducedMotion:mode });
    for (const i of manifest.interactions.filter(i => i.motion?.token)) {
      const m = i.motion;
      let passed = false, evidence = {};
      try {
        await page.goto(baseUrl + `#/screen/${i.sourceScreenId}`,{waitUntil:'networkidle'});
        const el = source(i);
        if (m.kind === 'state') {
          const style = () => el.evaluate(el => {
            const s = getComputedStyle(el);
            return {duration:s.transitionDuration,easing:s.transitionTimingFunction,values:[s.backgroundColor,s.color,s.opacity,s.borderRadius,s.transform]};
          });
          const press = (typeof i.trigger === 'object' ? i.trigger.type : i.trigger) === 'ON_PRESS';
          await page.mouse.move(-10,-10);
          if (press) await el.hover();
          await page.waitForTimeout(m.durationMs + 60);
          const before = await style();
          if (press) await page.mouse.down(); else await el.hover();
          await page.waitForTimeout(m.durationMs + 60);
          const after = await style();
          const reached = await el.getAttribute('data-figma-state') === i.destinationId;
          if (press) await page.mouse.up();
          const durations = after.duration.split(',').map(v => parseFloat(v) * (v.trim().endsWith('ms') ? 1 : 1000));
          passed = reached && JSON.stringify(before.values) !== JSON.stringify(after.values) && durations.every(v => mode === 'reduce' ? v <= 1 : Math.abs(v-m.durationMs) <= 5) && after.easing.split(',').every(v => v.trim() === 'ease-out');
          evidence = {before,after,trigger:i.trigger};
        } else if (['fade','spatial'].includes(m.kind)) {
          await el.evaluate(el => el.click());
          evidence = await page.evaluate(async ({from,to}) => {
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            const find = id => [...document.querySelectorAll('[data-figma-screen]')].find(el => el.dataset.figmaScreen === id);
            const a = find(from), b = find(to), root = document.querySelector('[data-figma-app]');
            const style = el => ({hidden:el.hidden,opacity:+getComputedStyle(el).opacity,transform:getComputedStyle(el).transform});
            return {outgoing:style(a),incoming:style(b),state:root.dataset.figmaMotionState,duration:+root.dataset.figmaMotionDuration,route:location.hash};
          },{from:i.sourceScreenId,to:i.destinationId});
          await page.waitForTimeout(m.durationMs + 180);
          const final = await screen(i.destinationId).isVisible() && !await screen(i.sourceScreenId).isVisible();
          const intermediate = m.kind === 'fade' ? evidence.incoming.opacity > 0 && evidence.incoming.opacity < 1 && evidence.outgoing.opacity > 0 && evidence.outgoing.opacity < 1 : [evidence.incoming.transform,evidence.outgoing.transform].some(v => v !== 'none' && v !== 'matrix(1, 0, 0, 1, 0, 0)');
          let direction = true;
          if (m.kind === 'spatial' && mode !== 'reduce') {
            const type = m.native.type, incoming = ['PUSH','MOVE_IN','SLIDE_IN'].includes(type);
            const transform = incoming ? evidence.incoming.transform : evidence.outgoing.transform;
            const values = transform.match(/matrix\(([^)]+)\)/)?.[1].split(',').map(Number);
            const horizontal = ['LEFT','RIGHT'].includes(m.direction), sign = ['LEFT','TOP'].includes(m.direction) ? -1 : 1;
            direction = !!values && Math.sign(values[horizontal ? 4 : 5]) === (incoming ? -sign : sign) && Math.abs(values[horizontal ? 5 : 4]) < 1;
          }
          passed = final && evidence.route === `#/screen/${i.destinationId}` && (mode === 'reduce' ? evidence.state === 'settled' && evidence.duration <= 1 : evidence.state === 'running' && intermediate && direction && evidence.duration === m.durationMs);
        } else if (m.kind === 'overlay') {
          const hash = await page.evaluate(() => location.hash);
          await el.evaluate(el => el.click());
          const middle = await screen(i.destinationId).evaluate(async el => {
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            return {opacity:+getComputedStyle(el).opacity,focus:el.contains(document.activeElement)};
          });
          await page.waitForTimeout(m.durationMs + 80);
          const open = await screen(i.destinationId).isVisible() && await screen(i.sourceScreenId).isVisible();
          const close = manifest.interactions.find(c => c.action === 'CLOSE' && c.sourceScreenId === i.destinationId);
          if (!close) throw new Error('Existing CLOSE control required for modal test');
          await page.locator(selector('node',close.sourceId)).click();
          await page.waitForTimeout(m.durationMs + 80);
          const closed = !await screen(i.destinationId).isVisible() && await screen(i.sourceScreenId).isVisible();
          const restored = await el.evaluate(el => document.activeElement === el);
          passed = open && closed && restored && middle.focus && await page.evaluate(() => location.hash) === hash && (mode === 'reduce' ? middle.opacity === 1 : middle.opacity > 0 && middle.opacity < 1);
          evidence = {middle,open,closed,restored,hash};
        } else if (['scroll','scroll-native'].includes(m.kind)) {
          evidence = await page.evaluate(async ({sourceId,destinationId,containerId,duration}) => {
            const find = id => [...document.querySelectorAll('[data-figma-node],[data-figma-screen]')].find(el => el.dataset.figmaNode === id || el.dataset.figmaScreen === id);
            const container = find(containerId), target = find(destinationId), control = find(sourceId);
            container.scrollTo({top:0,left:0,behavior:'instant'});
            const rect = target.getBoundingClientRect(), outer = container.getBoundingClientRect(), style = getComputedStyle(container);
            const expected = {x:/(auto|scroll)/.test(style.overflowX) ? Math.max(0,Math.min(container.scrollWidth-container.clientWidth,rect.left-outer.left-container.clientLeft)) : 0,y:/(auto|scroll)/.test(style.overflowY) ? Math.max(0,Math.min(container.scrollHeight-container.clientHeight,rect.top-outer.top-container.clientTop)) : 0};
            const position = () => ({x:container.scrollLeft,y:container.scrollTop});
            control.click(); const immediate = position(), root = document.querySelector('[data-figma-app]');
            const samples = [];
            const start = performance.now();
            while (performance.now()-start < duration+100) {
              await new Promise(resolve => requestAnimationFrame(resolve)); samples.push(position());
            }
            return {expected,immediate,samples,final:position(),state:root.dataset.figmaMotionState,duration:+root.dataset.figmaMotionDuration,easing:root.dataset.figmaMotionEasing,token:root.dataset.figmaMotion};
          },{sourceId:i.sourceId,destinationId:i.destinationId,containerId:m.containerId,duration:m.durationMs});
          const same = p => Math.abs(p.x-evidence.expected.x)<=1 && Math.abs(p.y-evidence.expected.y)<=1;
          const intermediate = evidence.samples.some(p => !same(p) && (p.x>0 || p.y>0));
          passed = same(evidence.final) && evidence.state === 'settled' && evidence.token === m.token && (mode === 'reduce' || m.kind === 'scroll-native' ? same(evidence.immediate) : !same(evidence.immediate) && intermediate && evidence.duration === m.durationMs && evidence.easing === 'ease-out');
        }
      } catch (error) { evidence = {error:error.message}; }
      rows.push({sourceId:i.sourceId,token:m.token,parity:mode === 'reduce' ? 'REDUCED_MOTION_OVERRIDE' : m.parity,mode,passed,evidence});
    }
  }
  await page.emulateMedia({ reducedMotion:'reduce' });
  return rows;
}
