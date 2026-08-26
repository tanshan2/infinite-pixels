# 像素地球 3D 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers-zh-subagent-driven-development（推荐）或 superpowers-zh-executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将已确认的 `128×64` 真实陆地像素平面图投影成一个可旋转、可缩放的 3D 像素地球预览，不加入标点或标签。

**架构：** 在现有 Superpowers visual companion 内容目录中新增一个独立 HTML 预览。页面先用真实 GeoJSON 生成与平面图同源的 `128×64` 硬像素纹理，再在 `160×160` 的低分辨率画布上逐像素反投影到球面，最后用最近邻放大到响应式显示尺寸。球面渲染只绘制可见半球，并根据球面法线计算自然光照。

**技术栈：** 原生 HTML/CSS/JavaScript、Canvas 2D、真实世界 GeoJSON、Superpowers visual companion、本地 in-app browser。

---

## 文件结构

- 创建：`.superpowers/brainstorm/20260826-pixel-globe-3d/content/pixel-globe-3d.html`——3D 像素地球的完整视觉预览、GeoJSON 纹理生成、球面投影和交互。
- 修改：无。现有 `flat-pixel-world-map-v2.html` 保留作为已确认的 2D 参考底稿。
- 创建：无自动化测试文件；使用浏览器 DOM、截图和交互检查作为本 visual companion 的验证层。

### 任务 1：建立 3D 预览外壳

**文件：**
- 创建：`.superpowers/brainstorm/20260826-pixel-globe-3d/content/pixel-globe-3d.html`

- [ ] **步骤 1：创建页面结构和设计变量**

写入单文件页面，包含一个仅用于球体渲染的 `#globeCanvas`、加载状态 `#globeLoading`、右上角 `中文 · EN` 开关和简短的交互提示。CSS 固定深炭青背景、响应式球体容器 `width:min(100%,520px)`，并为画布设置 `image-rendering:pixelated`、`image-rendering:crisp-edges`。

```html
<div class="globe-shell">
  <button id="langToggle" class="lang-toggle" type="button" aria-pressed="false">中文 · EN</button>
  <div class="globe-stage">
    <canvas id="globeCanvas" width="160" height="160" aria-label="可旋转的像素地球"></canvas>
    <div id="globeLoading">LOADING REAL COASTLINES · 正在加载真实海岸线…</div>
  </div>
  <p id="interactionHint">拖动旋转 · 滚轮缩放</p>
</div>
```

- [ ] **步骤 2：运行页面加载检查**

刷新 `http://localhost:51534/`，预期 DOM 中存在 `#globeCanvas`、`#langToggle` 和 `#globeLoading`，页面没有控制台错误；加载提示在数据请求完成前可见。

### 任务 2：从真实陆地生成硬像素纹理

**文件：**
- 修改：`.superpowers/brainstorm/20260826-pixel-globe-3d/content/pixel-globe-3d.html`

- [ ] **步骤 1：定义与 2D 底稿一致的纹理常量和投影函数**

使用与平面图相同的源和尺寸，避免重新手绘大陆：

```js
const DATA_URL = 'https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson';
const TEX_W = 128, TEX_H = 64;
const texCanvas = document.createElement('canvas');
texCanvas.width = TEX_W; texCanvas.height = TEX_H;
const texCtx = texCanvas.getContext('2d', {alpha:true, willReadFrequently:true});
function lonLatToTex(lon, lat) {
  return {x:(lon + 180) / 360 * TEX_W, y:(90 - lat) / 180 * TEX_H};
}
```

- [ ] **步骤 2：绘制 GeoJSON 并二值化陆地遮罩**

将 Polygon/MultiPolygon 的环转换成整数像素路径；填充后读取 `ImageData`，保留 alpha 大于等于 32 的像素并将其设为完全不透明，其他像素设为透明。这样可以保留非洲和南美洲的窄部位，同时移除抗锯齿半透明边缘。

```js
function hardenLand(ctx, width, height) {
  const image = ctx.getImageData(0, 0, width, height);
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < mask.length; i += 1) {
    const p = i * 4;
    if (image.data[p + 3] >= 32) {
      mask[i] = 1;
      image.data[p] = 115; image.data[p + 1] = 155; image.data[p + 2] = 96; image.data[p + 3] = 255;
    } else {
      image.data[p + 3] = 0;
    }
  }
  ctx.putImageData(image, 0, 0);
  return mask;
}
```

- [ ] **步骤 3：添加有限色板、方块纹理和硬海岸线**

仅在透明陆地层内使用固定绿色色板，每次以 `1–2` 个纹理像素绘制；通过四邻域扫描把陆地边缘改成深青绿色单像素块。禁止渐变、经纬网格和 Canvas 平滑描边。

### 任务 3：实现低分辨率球面投影

**文件：**
- 修改：`.superpowers/brainstorm/20260826-pixel-globe-3d/content/pixel-globe-3d.html`

- [ ] **步骤 1：定义球面状态和初始太平洋朝向**

```js
const state = {yaw: Math.PI, pitch: -0.14, zoom: 1};
const RENDER_SIZE = 160;
function normalize(v) {
  const length = Math.hypot(v.x, v.y, v.z) || 1;
  return {x:v.x / length, y:v.y / length, z:v.z / length};
}
const light = normalize({x:-0.45, y:-0.62, z:0.64});
```

`yaw:Math.PI` 作为初始太平洋方向，`pitch:-0.14` 对应轻微向上倾斜；不启动定时器，不加入自动旋转或惯性。

- [ ] **步骤 2：逐像素反投影可见半球**

对 `160×160` 输出画布的每个像素计算归一化球面坐标；当 `x²+y²>1` 时保持透明。对可见点计算经纬度，使用 `lonLatToTex` 取整到 `128×64` 纹理坐标，再读取纹理像素。这样 3D 球面只重排当前 2D 底稿像素，不产生第二套陆地数据。

```js
function sampleTexture(texture, u, v) {
  const x = Math.max(0, Math.min(TEX_W - 1, Math.floor(u * TEX_W)));
  const y = Math.max(0, Math.min(TEX_H - 1, Math.floor(v * TEX_H)));
  const p = (y * TEX_W + x) * 4;
  return [texture[p], texture[p + 1], texture[p + 2], texture[p + 3]];
}
```

- [ ] **步骤 3：应用自然光照和像素化球体轮廓**

按球面法线与左上方主光的点积计算亮度：正面陆地保持绿色色板，背光面降低亮度，海洋使用深青色；对最终 `ImageData` 逐像素写入，不使用阴影滤镜或模糊。球体外轮廓由 `x²+y²<=1` 的像素判断形成阶梯边缘。

### 任务 4：加入旋转、缩放和移动端手势

**文件：**
- 修改：`.superpowers/brainstorm/20260826-pixel-globe-3d/content/pixel-globe-3d.html`

- [ ] **步骤 1：实现鼠标拖动旋转和滚轮缩放**

监听 `pointerdown/pointermove/pointerup`，只有按住左键并且指针在球体画布上移动时更新 `state.yaw/state.pitch`；将 `pitch` 限制在 `[-1.25,1.25]`，将 `zoom` 限制在 `[0.78,1.55]`。`wheel` 只更新缩放并调用 `preventDefault()`，不启动惯性动画。

```js
canvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  state.zoom = Math.max(0.78, Math.min(1.55, state.zoom - event.deltaY * 0.001));
  render();
}, {passive:false});
```

- [ ] **步骤 2：实现单指旋转和双指缩放**

使用 `pointerId` 保存触摸指针；一个触点映射为旋转，两个触点根据两点距离变化缩放。触摸结束后清空指针状态，不保留速度向量，因此松手立即停止。

- [ ] **步骤 3：验证交互状态**

桌面浏览器中拖动画布应改变大陆朝向；滚轮应改变球体大小但不改变朝向；松开鼠标后球体停止。移动端触摸一指应旋转，双指应缩放，页面不应跟随滚动。

### 任务 5：完成无标点界面和加载容错

**文件：**
- 修改：`.superpowers/brainstorm/20260826-pixel-globe-3d/content/pixel-globe-3d.html`

- [ ] **步骤 1：实现中文/EN 开关的视觉状态**

点击 `#langToggle` 切换 `aria-pressed` 和按钮文本，当前页面没有国家标签、标点、路线或信息卡，因此不添加其他文字内容。

- [ ] **步骤 2：处理加载与请求失败**

GeoJSON 成功解析后隐藏 `#globeLoading` 并首次渲染；请求失败时显示双语错误提示，不绘制伪造大陆。所有 `fetch` 错误都进入同一个 `catch` 分支。

- [ ] **步骤 3：检查响应式布局**

在窄屏下将球体限制为 `min(86vw,520px)`，保持正方形画布和像素化采样；确认右上角开关不覆盖球体，提示文字不出现横向溢出。

### 任务 6：浏览器验收与提交

**文件：**
- 修改：`.superpowers/brainstorm/20260826-pixel-globe-3d/content/pixel-globe-3d.html`

- [ ] **步骤 1：执行 DOM 与控制台检查**

在当前 in-app browser 打开 visual companion，执行以下检查并预期全部通过：

```js
await tab.playwright.locator('#globeCanvas').count();       // 1
await tab.playwright.locator('#langToggle').count();        // 1
await tab.playwright.locator('#globeLoading').isVisible();  // 数据加载前 true，加载后 false
await tab.dev.logs({levels:['error'], limit:20});           // []
```

- [ ] **步骤 2：执行截图验收**

截图确认：球体居中、最大不超过约 520px；海洋为深青色；主要大陆可辨认；非洲和南美洲存在；球体外轮廓及陆地边缘为方块阶梯；没有标点、国家标签、路线、星空或霓虹。

- [ ] **步骤 3：执行交互验收**

拖动球体后截图对比前后 `yaw/pitch` 变化；滚轮前后检查 `zoom` 变化；松手等待 300ms 后确认没有继续旋转。移动端用触摸事件检查单指旋转和双指缩放。

- [ ] **步骤 4：提交实现**

```bash
git add .superpowers/brainstorm/20260826-worlds/content/pixel-globe-3d.html
git commit -m "feat: add interactive pixel globe preview"
```

预期提交成功，并且工作区只包含本次 3D 预览文件及之前已有的未跟踪 visual companion 内容，不修改已确认的 2D 底稿。

## 计划自检

- 规格中的投影一致性对应任务 2 和任务 3；未重新绘制大陆。
- 自然光照、深色非科幻背景、520px 响应式球体对应任务 1 和任务 3/5。
- 鼠标、滚轮、无自动旋转/无惯性、移动端手势对应任务 4。
- 无标点、无标签、仅保留中文/EN 对应任务 5。
- 非洲和南美洲的完整性由 alpha 阈值 32、整数路径和浏览器截图验收共同覆盖。
- 计划没有使用“待定”“TODO”或未定义函数作为任务步骤；所有路径、变量名和验收命令已明确。
