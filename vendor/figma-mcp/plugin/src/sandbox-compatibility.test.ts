import {test,expect} from 'bun:test';
import {readFileSync,readdirSync} from 'node:fs';
import ts from 'typescript';

// Figma's older QuickJS compiler fails before startup on for-of + yielded iterable.
function unsafeIterables(source:string) {
  const file=ts.createSourceFile('plugin.js',source,ts.ScriptTarget.Latest,true);
  let count=0;
  function suspends(node:ts.Node):boolean {
    if(ts.isAwaitExpression(node)||ts.isYieldExpression(node))return true;
    if(ts.isFunctionLike(node))return false;
    return ts.forEachChild(node,suspends)===true;
  }
  function visit(node:ts.Node) {
    if(ts.isForOfStatement(node)&&suspends(node.expression))count++;
    ts.forEachChild(node,visit);
  }
  visit(file);return count;
}
test('sandbox regression detector catches awaited and lowered yielded iterables',()=>{
  expect(unsafeIterables('async function f(){for(const x of await read()) {}}')).toBe(1);
  expect(unsafeIterables('function* f(){for(const x of yield read()) {}}')).toBe(1);
  expect(unsafeIterables('async function f(){const items=await read();for(const x of items) {}}')).toBe(0);
});
test('plugin source avoids the Figma compiler stack-underflow pattern',()=>{
  for(const path of readdirSync(import.meta.dir).filter(p=>p.endsWith('.ts')&&!p.endsWith('.test.ts')))
    expect(unsafeIterables(readFileSync(new URL(path,import.meta.url),'utf8')),path).toBe(0);
});
