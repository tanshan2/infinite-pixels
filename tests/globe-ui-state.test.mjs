import test from 'node:test';
import assert from 'node:assert/strict';
import {
  activateGlobe,
  controlsVisible,
  copyFor,
  createUiState,
  isActivationKey,
  isDoubleTap,
  nextLanguage,
  pauseAutoRotation,
  restoreSession,
  serializeSession,
  setControlsIntent,
  shouldAutoRotate,
} from '../scripts/globe-ui-state.mjs';

test('初始休眠且控件隐藏', () => {
  const state = createUiState({ reducedMotion: false });
  assert.equal(state.active, false);
  assert.equal(controlsVisible(state), false);
  assert.equal(shouldAutoRotate(state, 1000), false);
});

test('激活后转动，交互后暂停两秒', () => {
  let state = activateGlobe(createUiState({ reducedMotion: false }));
  assert.equal(state.zoom, 1.08);
  assert.equal(shouldAutoRotate(state, 1000), true);
  state = pauseAutoRotation(state, 1000);
  assert.equal(shouldAutoRotate(state, 2999), false);
  assert.equal(shouldAutoRotate(state, 3000), true);
});

test('减少动态效果时不自动转动', () => {
  const initial = {...createUiState({ reducedMotion: true }), zoom: 0.9};
  const state = activateGlobe(initial);
  assert.equal(shouldAutoRotate(state, 5000), false);
  assert.equal(state.zoom, 0.9);
});

test('控件需激活且存在显示意图', () => {
  let state = setControlsIntent(createUiState({ reducedMotion: false }), 'hover', true);
  assert.equal(controlsVisible(state), false);
  state = activateGlobe(state);
  assert.equal(controlsVisible(state), true);
});

test('中文文案无普通英文', () => {
  assert.deepEqual(copyFor('zh', false), {
    languageToggle: '中文 · 英文',
    dormantHint: '鼠标双击地球唤醒',
    activeHint: '拖动旋转 · 滚动缩放',
    portalLabel: '全部作品',
    portalPending: '作品空间正在设计中',
    loading: '正在加载真实海岸线…',
    loadError: '地球数据暂时无法加载，请刷新重试',
  });
});

test('会话只恢复安全视角', () => {
  const source = {
    ...createUiState({ reducedMotion: false }),
    active: true,
    yaw: 2,
    pitch: 0.2,
    zoom: 1.2,
  };
  const restored = restoreSession(serializeSession(source));
  assert.deepEqual(
    {
      active: restored.active,
      yaw: restored.yaw,
      pitch: restored.pitch,
      zoom: restored.zoom,
    },
    { active: false, yaw: 2, pitch: 0.2, zoom: 1.2 },
  );
  assert.equal(restoreSession('{bad json'), null);
});

test('键盘、触摸和语言输入使用同一组纯函数', () => {
  assert.equal(isActivationKey('Enter'), true);
  assert.equal(isActivationKey(' '), true);
  assert.equal(isActivationKey('Escape'), false);
  assert.equal(isDoubleTap(1000, 1319), true);
  assert.equal(isDoubleTap(1000, 1321), false);
  assert.equal(nextLanguage('zh'), 'en');
  assert.equal(nextLanguage('en'), 'zh');
});

test('非法会话视角被夹紧到安全范围', () => {
  const restored = restoreSession(JSON.stringify({
    active: true,
    language: 'zh',
    yaw: 1,
    pitch: 99,
    zoom: 99,
  }));
  assert.equal(restored.pitch, 1.25);
  assert.equal(restored.zoom, 1.3);
  assert.equal(restored.active, false);
});
