# 地球与传送门 UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-en-subagent-driven-development (recommended) or superpowers-en-executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把选定第三版落实为主页第一屏：无文字品牌、旗帜像素徽记、前景传送门、后景休眠地球、双击激活和按需控件。

**Architecture:** 保留静态单页与 Canvas 地球渲染；新增透明传送门前景图片，并把可测试 UI 状态抽到 ES module。Node 内置测试负责休眠/激活、语言、会话和结构回归，Codex in-app browser 负责最终视觉与手势验收。

**Tech Stack:** 原生 HTML/CSS/JavaScript、Canvas 2D、ES modules、Node `node:test`、透明 PNG、Codex in-app browser。

## Global Constraints

- 当前只制作主页地球与传送门 UI；不制作作品、漂浮岛、公寓、工作室或地点子页面。
- 视觉目标固定为 `design-references/earth-portal-ui-v3.png`。
- 中文模式不显示普通英文，不显示“无限像素”文字标识，不显示 `PIXEL SOURCE 128×64`。
- 无文字品牌徽记只融入传送门旗帜。
- 地球始终位于传送门后方；传送门从加载开始可用。
- 地球默认休眠；双击、Enter 或 Space 激活；拖动暂停自动转动，松手两秒后恢复。
- 缩小、重置、放大控件只在激活后的移入、触摸或键盘聚焦状态显示。
- 不新增运行时依赖、数据库、分析、子页面或线上发布步骤。

---

## File Structure

- Create: `assets/portal-foreground.png` — 透明体素石门、旗帜、庭院平台和中央角色；牌匾留空。
- Create: `scripts/globe-ui-state.mjs` — 纯函数状态机、语言文案、会话序列化和自动转动判定。
- Create: `tests/globe-ui-state.test.mjs` — 状态机红绿测试。
- Create: `tests/homepage-structure.test.mjs` — 主页结构和中文初始文案测试。
- Modify: `index.html` — 场景层级、传送门 DOM、响应式样式和事件接线。
- Modify: `design-qa.md` — 最终视觉 QA。
- Create: `implementation-earth-portal-1672x941.png` — 最终同视口截图。

### Task 1: 生成并验证透明传送门前景

**Files:**
- Create: `assets/portal-foreground.png`

**Interfaces:**
- Consumes: `design-references/earth-portal-ui-v3.png` 和用户原始参考图。
- Produces: `assets/portal-foreground.png`，供 `#portalArtwork` 使用。

- [ ] **Step 1: 用内置 Image Gen 生成独立资产**

使用以下完整提示，附上选定视觉稿：

```text
Use case: background-extraction
Asset type: transparent foreground for a responsive desktop homepage
Primary request: isolate and recreate only the complete voxel portal garden foreground from the selected third UI design; include the warm-stone gate, blank dark-red signboard, cream-and-gold icon-only crests woven into every red flag, lanterns, trees, flowerbeds, semicircular stone platform, stairs, and the small central pixel character.
Composition: straight-on symmetrical foreground; platform spans the canvas width; portal centered; transparent pixels everywhere outside the diorama.
Text: no text anywhere; the signboard must be blank.
Constraints: true transparent background; no globe; no page background; no letters; no wordmark; no watermark; no glow beyond bounds; crisp voxel edges and warm natural lighting.
```

- [ ] **Step 2: 保存并验证 alpha**

复制为 `assets/portal-foreground.png`，运行：

```powershell
& 'C:\Users\tant2\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -c "from PIL import Image; im=Image.open('assets/portal-foreground.png').convert('RGBA'); print(im.size, im.getchannel('A').getextrema())"
```

Expected: 至少 `1200×600`，alpha extrema 为 `(0, 255)`。

- [ ] **Step 3: 视觉检查**

确认背景透明、牌匾无字、旗帜只有无文字徽记、没有地球残影，平台与中央角色完整。

- [ ] **Step 4: Commit**

```powershell
git add -- assets/portal-foreground.png
git commit -m "feat: add voxel portal foreground"
```

### Task 2: 以 TDD 建立 UI 状态机

**Files:**
- Create: `scripts/globe-ui-state.mjs`
- Create: `tests/globe-ui-state.test.mjs`

**Interfaces:**
- Produces: `createUiState(options)`, `activateGlobe(state)`, `pauseAutoRotation(state, now)`, `shouldAutoRotate(state, now)`, `setControlsIntent(state, source, visible)`, `controlsVisible(state)`, `copyFor(language, coarsePointer)`, `serializeSession(state)`, `restoreSession(raw)`。

- [ ] **Step 1: 写失败测试**

创建 `tests/globe-ui-state.test.mjs`：

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  activateGlobe, controlsVisible, copyFor, createUiState,
  pauseAutoRotation, restoreSession, serializeSession,
  setControlsIntent, shouldAutoRotate,
} from '../scripts/globe-ui-state.mjs';

test('初始休眠且控件隐藏', () => {
  const state = createUiState({ reducedMotion: false });
  assert.equal(state.active, false);
  assert.equal(controlsVisible(state), false);
  assert.equal(shouldAutoRotate(state, 1000), false);
});

test('激活后转动，交互后暂停两秒', () => {
  let state = activateGlobe(createUiState({ reducedMotion: false }));
  assert.equal(shouldAutoRotate(state, 1000), true);
  state = pauseAutoRotation(state, 1000);
  assert.equal(shouldAutoRotate(state, 2999), false);
  assert.equal(shouldAutoRotate(state, 3000), true);
});

test('减少动态效果时不自动转动', () => {
  const state = activateGlobe(createUiState({ reducedMotion: true }));
  assert.equal(shouldAutoRotate(state, 5000), false);
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
  const source = { ...createUiState({ reducedMotion: false }), active: true, yaw: 2, pitch: 0.2, zoom: 1.2 };
  const restored = restoreSession(serializeSession(source));
  assert.deepEqual(
    { active: restored.active, yaw: restored.yaw, pitch: restored.pitch, zoom: restored.zoom },
    { active: true, yaw: 2, pitch: 0.2, zoom: 1.2 },
  );
  assert.equal(restoreSession('{bad json'), null);
});
```

- [ ] **Step 2: 运行并确认 RED**

```powershell
& 'C:\Users\tant2\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test tests/globe-ui-state.test.mjs
```

Expected: FAIL，因为 `scripts/globe-ui-state.mjs` 尚不存在。

- [ ] **Step 3: 写最小实现**

实现不可变状态对象；固定 `AUTO_RESUME_MS = 2000`。会话恢复必须验证有限数值，并把 pitch 限制到 `[-1.25,1.25]`、zoom 限制到 `[0.78,1.3]`。

- [ ] **Step 4: 运行并确认 GREEN**

运行 Step 2。Expected: 6 tests PASS，0 FAIL。

- [ ] **Step 5: Commit**

```powershell
git add -- scripts/globe-ui-state.mjs tests/globe-ui-state.test.mjs
git commit -m "feat: add globe UI state machine"
```

### Task 3: 用结构测试锁定第三版主页层级

**Files:**
- Create: `tests/homepage-structure.test.mjs`
- Modify: `index.html`

**Interfaces:**
- Produces: `#globeStage`, `#portalGate`, `#portalArtwork`, `#portalLabel`, `#globeControls`, `#interactionHint`, `#uiStatus`, `#transitionVeil`。

- [ ] **Step 1: 写失败结构测试**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const body = html.match(/<body[\s\S]*<\/body>/i)?.[0] ?? '';

test('第三版包含前景传送门和状态节点', () => {
  for (const id of ['portalGate','portalArtwork','portalLabel','globeStage','globeControls','interactionHint','uiStatus','transitionVeil']) {
    assert.match(body, new RegExp(`id=["']${id}["']`));
  }
  assert.match(body, /assets\/portal-foreground\.png/);
});

test('中文初始界面没有文字品牌或技术英文', () => {
  assert.doesNotMatch(body, />\s*Infinite Pixels\s*</i);
  assert.doesNotMatch(body, />\s*无限像素\s*</);
  assert.doesNotMatch(body, /PIXEL SOURCE|LOADING REAL|ALL WORKS|中文 · EN/);
  assert.match(body, /中文 · 英文/);
  assert.match(body, /鼠标双击地球唤醒/);
  assert.match(body, /全部作品/);
});
```

- [ ] **Step 2: 运行并确认 RED**

运行 Node test。Expected: FAIL，缺少传送门节点且旧中文界面含英文。

- [ ] **Step 3: 修改 DOM**

```html
<div id="globeStage" class="globe3d-stage" tabindex="0" aria-label="休眠中的像素地球，双击或按回车键唤醒">
  <canvas id="globeCanvas" class="globe3d-canvas" width="160" height="160"></canvas>
  <div id="globeLoading" class="globe3d-loading">正在加载真实海岸线…</div>
</div>
<button id="portalGate" class="portal-gate" type="button" aria-label="进入全部作品">
  <img id="portalArtwork" src="assets/portal-foreground.png" alt="" draggable="false">
  <span id="portalLabel" class="portal-label">全部作品</span>
</button>
<div id="globeControls" class="globe3d-controls" hidden>…</div>
<p id="interactionHint">鼠标双击地球唤醒</p>
<p id="uiStatus" class="sr-only" aria-live="polite"></p>
<div id="transitionVeil" class="transition-veil" aria-hidden="true"></div>
```

CSS 固定层级：背景 0、地球 1、提示/语言/控件 3、传送门 4、过渡层 10。桌面传送门宽 `min(92vw,1220px)`；窄屏用 `object-position:center bottom` 裁减两侧花园。

- [ ] **Step 4: 运行并确认 GREEN**

Expected: 2 tests PASS，0 FAIL。

- [ ] **Step 5: Commit**

```powershell
git add -- index.html tests/homepage-structure.test.mjs
git commit -m "feat: layer portal over pixel globe"
```

### Task 4: 接入激活、自动转动和按需控件

**Files:**
- Modify: `index.html`
- Modify: `tests/globe-ui-state.test.mjs`

**Interfaces:**
- Consumes: Task 2 状态机。
- Produces: `activateFromInput()`, `scheduleRenderLoop()`, `syncControlsVisibility()`, `saveSessionView()`。

- [ ] **Step 1: 增加失败测试**

增加非法会话 zoom 被夹紧到 1.3、pitch 被夹紧到 ±1.25、多个 controls intent 互不覆盖的测试。

- [ ] **Step 2: 运行并确认 RED**

Expected: 新断言 FAIL。

- [ ] **Step 3: 接线地球交互**

把脚本改为 `type="module"` 并导入状态 API。拖动、滚轮、地点和按钮事件先检查 `state.active`。激活目标 zoom 为 1.08；动画循环每秒增加约 0.05 yaw。双击用 `dblclick`；触摸双击用 320ms 内两次 `pointerup`；键盘只响应 Enter/Space。

- [ ] **Step 4: 接线暂停与按需控件**

拖动开始调用 `pauseAutoRotation(state, performance.now())`。hover、touch、focus intent 分开记录；同步 `hidden` 与 `aria-hidden`。休眠始终隐藏。

- [ ] **Step 5: 运行全部 Node 测试**

```powershell
& 'C:\Users\tant2\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test tests/*.test.mjs
```

Expected: 全部 PASS，0 FAIL。

- [ ] **Step 6: Commit**

```powershell
git add -- index.html scripts/globe-ui-state.mjs tests/globe-ui-state.test.mjs
git commit -m "feat: activate globe on demand"
```

### Task 5: 接入语言、传送门反馈和减少动态效果

**Files:**
- Modify: `index.html`
- Modify: `tests/globe-ui-state.test.mjs`

**Interfaces:**
- Consumes: `copyFor(language, coarsePointer)`。
- Produces: `setLanguage(language)`, `runPortalPreview()`。

- [ ] **Step 1: 写失败测试**

补充英文文案完整断言，以及中文桌面/触摸提示分别为“鼠标双击地球唤醒”和“双击地球唤醒”。

- [ ] **Step 2: 运行并确认 RED**

Expected: 英文和触摸文案断言 FAIL。

- [ ] **Step 3: 同步语言**

同步语言按钮、牌匾、地球 aria-label、地点名、加载/错误、操作提示和传送门 aria-label。中文按钮为“中文 · 英文”，英文模式才为 `中文 · EN`。

- [ ] **Step 4: 实现传送门预览反馈**

点击设置 entering/veil 状态，450ms 后撤销并让 `uiStatus` 报告“作品空间正在设计中”。减少动态效果时立即报告。不得创建不存在的子页面链接。

- [ ] **Step 5: 全量测试并 Commit**

运行 Task 4 Step 5，预期 0 FAIL，然后：

```powershell
git add -- index.html scripts/globe-ui-state.mjs tests/globe-ui-state.test.mjs
git commit -m "feat: localize portal globe UI"
```

### Task 6: 浏览器视觉与交互验收

**Files:**
- Modify: `design-qa.md`
- Create: `implementation-earth-portal-1672x941.png`

**Interfaces:**
- Consumes: 原始参考图、选定视觉稿和完整主页。
- Produces: `design-qa.md` 的 `final result: passed` 或明确 `blocked`。

- [ ] **Step 1: 启动本地服务**

```powershell
& 'C:\Users\tant2\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -m http.server 4173 --bind 127.0.0.1
```

- [ ] **Step 2: 休眠态验收**

在 Codex in-app browser 以 1672×941 打开主页，等待地图加载。确认传送门在地球前方、控件隐藏、提示正确、拖动/滚轮/地点不改变视图、控制台无 error/warn。

- [ ] **Step 3: 激活态验收**

双击地球，确认安全放大和慢转；拖动时暂停，松手两秒后恢复；地点可选；移入/离开按需显示/隐藏控件；Enter/Space 等效。

- [ ] **Step 4: 传送门、语言与减弱动画验收**

确认传送门 450ms 暖光/淡出后留在主页并播报状态；中英切换无残留；390×844 无横向滚动；减少动态效果时无自动转动和过渡，但功能保留。

- [ ] **Step 5: Design QA**

保存同视口截图。把原始参考、选定稿、实现截图并排检查布局、字体、色彩、资产裁切和层级；修复所有 P0/P1/P2，更新 `design-qa.md` 直到：

```text
final result: passed
```

- [ ] **Step 6: 最终验证与提交**

```powershell
& 'C:\Users\tant2\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test tests/*.test.mjs
git diff --check
git add -- index.html assets/portal-foreground.png scripts/globe-ui-state.mjs tests design-qa.md implementation-earth-portal-1672x941.png
git commit -m "feat: build earth portal homepage UI"
```

Expected: Node 测试 0 FAIL，`git diff --check` 无输出，`design-qa.md` 为 `final result: passed`。

## Plan Self-Review

- 规格覆盖：第三版徽记、中文规则、休眠/激活、自动转动、按需控件、传送门层级、减少动态效果、响应式和视觉 QA 都有对应任务。
- 范围控制：没有作品子页面、漂浮岛、公寓、工作室或地点页面实现。
- 接口一致：状态函数在测试、实现和 DOM 接线任务中同名。
- 无占位步骤：生成提示、测试代码、命令、预期失败/通过结果和验收断言均明确。

