import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const body = html.match(/<body[\s\S]*<\/body>/i)?.[0] ?? '';
const visibleBody = body
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/<style[\s\S]*?<\/style>/gi, '');

test('第三版包含前景传送门和状态节点', () => {
  for (const id of [
    'portalGate',
    'portalArtwork',
    'portalLabel',
    'globeStage',
    'globeControls',
    'interactionHint',
    'uiStatus',
    'transitionVeil',
  ]) {
    assert.match(body, new RegExp(`id=["']${id}["']`));
  }
  assert.match(body, /assets\/portal-foreground\.png/);
});

test('中文初始界面没有文字品牌或技术英文', () => {
  assert.doesNotMatch(visibleBody, />\s*Infinite Pixels\s*</i);
  assert.doesNotMatch(visibleBody, />\s*无限像素\s*</);
  assert.doesNotMatch(visibleBody, /PIXEL SOURCE|LOADING REAL|ALL WORKS|中文 · EN/);
  assert.match(visibleBody, /中文 · 英文/);
  assert.match(visibleBody, /鼠标双击地球唤醒/);
  assert.match(visibleBody, /全部作品/);
});
