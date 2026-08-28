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
  assert.match(body, /assets\/earth-texture-v3\.png/);
});

test('中文初始界面没有文字品牌或技术英文', () => {
  assert.doesNotMatch(visibleBody, />\s*Infinite Pixels\s*</i);
  assert.doesNotMatch(visibleBody, />\s*无限像素\s*</);
  assert.doesNotMatch(visibleBody, /PIXEL SOURCE|LOADING REAL|ALL WORKS|中文 · EN/);
  assert.match(visibleBody, /中文 · 英文/);
  assert.match(visibleBody, /鼠标双击地球唤醒/);
  assert.match(visibleBody, /全部作品/);
});

test('键盘事件、暖光与安全存储接线存在', () => {
  assert.match(html, /event\.target!==stage\|\|!isActivationKey\(event\.key\)/);
  assert.match(html, /\.portal-gate\.is-entering\{/);
  assert.match(html, /\.portal-gate\{[^}]*scale\(\.85\)/);
  assert.match(html, /function buildTextureFromImage\(image\)/);
  assert.match(html, /const TEXTURE_URL = 'assets\/earth-texture-v3\.png';/);
  assert.match(html, /\.globe3d-canvas\{[^}]*opacity:1/);
  assert.match(html, /try\{return sessionStorage\.getItem/);
  assert.match(html, /try\{sessionStorage\.setItem/);
  assert.match(html, /min-width:44px;min-height:44px/);
});

test('主页接入实时球面体素渲染器', () => {
  assert.match(html, /from '\.\/scripts\/webgl-voxel-globe\.mjs'/);
  assert.match(html, /from '\.\/scripts\/voxel-globe-renderer\.mjs'/);
  assert.match(body, /id="globeOverlay"/);
  assert.match(html, /TEX_W = 720, TEX_H = 360/);
  assert.match(html, /function rebuildVoxelGrid\(force=false\)/);
  assert.match(html, /createWebGlVoxelRenderer\(canvas\)/);
  assert.match(html, /webGlRenderer\.setInstances\(voxelCells,density\)/);
  assert.doesNotMatch(html, /function drawVoxelCell\(projected\)/);
  assert.doesNotMatch(html, /function drawCoastSides\(projected\)/);
  assert.doesNotMatch(html, /createImageData\(RENDER_SIZE,RENDER_SIZE\)/);
});
