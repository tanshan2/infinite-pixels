# 3D 像素地球控制条实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers-zh-subagent-driven-development（推荐）或 superpowers-zh-executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 在现有 3D 像素地球下方加入 `− / 重置 / ＋` 像素控制条，同时完整保留原有模型和旋转、缩放交互。

**架构：** 只修改现有 visual companion 页面，在球体画布和交互提示之间插入一个语义化按钮组。按钮通过现有 `state.zoom/yaw/pitch` 和 `render()` 接口控制视图，不创建第二个地球渲染器、不改变 GeoJSON 纹理。

**技术栈：** 原生 HTML/CSS/JavaScript、Canvas 2D、当前 Superpowers visual companion、in-app browser。

---

## 文件结构

- 修改：`.superpowers/brainstorm/20260826-pixel-globe-3d/content/pixel-globe-3d.html`——增加控制条样式、按钮结构、缩放/重置事件和无障碍属性。
- 不修改：GeoJSON 数据、球面投影、像素纹理、自然光照和现有拖动/滚轮/触摸逻辑。
- 测试：使用浏览器 DOM 快照、控制台日志、截图和按钮交互，不新增依赖或测试框架。

### 任务 1：加入控制条结构和像素样式

**文件：**
- 修改：`.superpowers/brainstorm/20260826-pixel-globe-3d/content/pixel-globe-3d.html`

- [ ] **步骤 1：在球体和提示之间加入语义化按钮组**

```html
<div id="globeControls" class="globe3d-controls" role="group" aria-label="地球视图控制">
  <button id="zoomOut" type="button" aria-label="缩小">−</button>
  <button id="resetView" type="button" aria-label="重置地球视角">重置</button>
  <button id="zoomIn" type="button" aria-label="放大">＋</button>
</div>
```

- [ ] **步骤 2：添加不遮挡球体的底部像素样式**

```css
.globe3d-controls{display:flex;justify-content:center;gap:6px;margin-top:14px}
.globe3d-controls button{min-width:40px;height:36px;border:1px solid #627268;border-radius:2px;background:#172622;color:#ede8ce;font:12px 'Courier New',monospace;cursor:pointer;image-rendering:pixelated}
.globe3d-controls button:hover{background:#253b31;border-color:#aebd86}
.globe3d-controls button:focus-visible{outline:2px solid #d5d7a2;outline-offset:2px}
.globe3d-controls button:active{transform:translateY(1px)}
```

- [ ] **步骤 3：运行结构检查**

刷新 `http://localhost:61820/`，预期 DOM 中出现 `#globeControls` 和三个按钮；球体位置、尺寸和像素纹理与修改前一致，控制条位于球体下方，不覆盖画布。

### 任务 2：实现缩放和视角重置

**文件：**
- 修改：`.superpowers/brainstorm/20260826-pixel-globe-3d/content/pixel-globe-3d.html`

- [ ] **步骤 1：定义统一视图常量和缩放函数**

```js
const DEFAULT_VIEW = {yaw:Math.PI, pitch:-0.14, zoom:1};
function setZoom(nextZoom){
  state.zoom = Math.max(0.78, Math.min(1.55, nextZoom));
  render();
}
function resetView(){
  state.yaw = DEFAULT_VIEW.yaw;
  state.pitch = DEFAULT_VIEW.pitch;
  state.zoom = DEFAULT_VIEW.zoom;
  render();
}
```

- [ ] **步骤 2：绑定三个按钮**

```js
document.getElementById('zoomOut').addEventListener('click', () => setZoom(state.zoom - 0.1));
document.getElementById('zoomIn').addEventListener('click', () => setZoom(state.zoom + 0.1));
document.getElementById('resetView').addEventListener('click', resetView);
```

按钮只调用已有状态和 `render()`；不启动动画、不修改 `textureData`，也不触发画布拖动。

- [ ] **步骤 3：隔离画布指针事件**

控制条按钮不放在 `#globeStage` 内；点击按钮时只发生按钮事件，不经过画布的 `pointerdown`。保持 `#globeStage{touch-action:none}`，控制条本身不阻止页面滚动。

### 任务 3：无障碍和响应式细节

**文件：**
- 修改：`.superpowers/brainstorm/20260826-pixel-globe-3d/content/pixel-globe-3d.html`

- [ ] **步骤 1：确认键盘可操作**

三个按钮使用原生 `button`，保留 Tab 顺序、Enter/Space 默认行为、`aria-label` 和可见 `:focus-visible` 状态。

- [ ] **步骤 2：确认窄屏触控尺寸**

在 `max-width:640px` 样式下保持 `min-width:40px`、高度 `36px` 和 `6px` 间距；控制条不产生横向溢出，并保持水平居中。

### 任务 4：浏览器回归验收与提交

**文件：**
- 修改：`.superpowers/brainstorm/20260826-pixel-globe-3d/content/pixel-globe-3d.html`

- [ ] **步骤 1：运行 DOM 和控制台检查**

```js
await tab.playwright.locator('#globeCanvas').count();       // 1
await tab.playwright.locator('#globeControls').count();     // 1
await tab.playwright.locator('#zoomOut').count();           // 1
await tab.playwright.locator('#resetView').count();         // 1
await tab.playwright.locator('#zoomIn').count();            // 1
await tab.dev.logs({levels:['error'], limit:20});           // []
```

- [ ] **步骤 2：运行行为检查**

记录初始截图；点击 `＋` 后截图应显示球体变大，点击 `−` 后球体变小，点击 `重置` 后恢复初始太平洋朝向和默认大小。拖动球体仍改变朝向，滚轮仍改变大小，松手后等待 `350ms` 画面保持稳定。

- [ ] **步骤 3：运行像素视觉检查**

截图确认球体仍使用硬像素外轮廓、深青海洋、绿色陆地和自然光照；主要大陆可辨认；没有新标点、标签、路线、星空或霓虹。

- [ ] **步骤 4：提交实现**

```bash
git add .superpowers/brainstorm/20260826-pixel-globe-3d/content/pixel-globe-3d.html
git commit -m "feat: add pixel globe controls"
```

## 计划自检

- 规格中的底部布局、三按钮语义、缩放步长、重置状态、无惯性和无标点均有对应任务。
- 现有 3D 模型只被引用，不被替换；纹理、投影和自然光照没有变更任务。
- 桌面拖动、滚轮、移动端手势和语言开关由回归验收覆盖。
- 计划没有未定义的文件路径、变量或函数；`state` 和 `render()` 已存在于现有 3D 页面，`DEFAULT_VIEW`、`setZoom()`、`resetView()` 在任务 2 中定义。
- 计划未包含占位内容或模糊的验证描述。
