# 高密度体素地球渲染器 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-en-subagent-driven-development (recommended) or superpowers-en-executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把主页地球改为高密度、可实时旋转的球面体素渲染，并保持传送门层级、中文默认界面和现有交互完整可用。

**Architecture:** 新建纯函数模块负责密度选择、球面网格、旋转投影、陆地抬高和色彩计算，使关键视觉规则可在 Node 中直接测试。`index.html` 继续负责 GeoJSON 栅格化、Canvas 绘制和页面交互，只把每帧几何与颜色决策委托给该模块；既有 UI 状态机不改职责。

**Tech Stack:** 原生 HTML/CSS、Canvas 2D、JavaScript ES modules、Node.js 内置测试运行器、GeoJSON。

## Global Constraints

- 不引入 WebGL、Three.js 或新的运行时依赖。
- 桌面端密度为 88 × 44，手机端密度为 64 × 32，断点为 760 CSS 像素。
- 陆地表面半径为海洋半径的 1.045 倍，并在陆海交界处绘制侧面。
- 海洋保持深青绿色；陆地保持橄榄绿至金黄色；固定左上光源，右下和球体边缘变暗。
- 传送门图片、前景层级、0.85 缩放和全部现有交互行为保持不变。
- 中文是默认界面；除 UI、AI 等专业词汇外不新增普通英文文案。
- 参考图只用于视觉对照，不作为生产资源，不允许带入棋盘背景。

---

### Task 1: 可测试的球面体素几何与材质

**Files:**
- Create: `scripts/voxel-globe-renderer.mjs`
- Create: `tests/voxel-globe-renderer.test.mjs`

**Interfaces:**
- Consumes: `isLand(lonRadians: number, latRadians: number): boolean`，由页面的陆地遮罩采样器提供。
- Produces: `selectGridDensity(viewportWidth)`, `createVoxelGrid(options)`, `rotateVector(vector, view)`, `projectCell(cell, view)`, `projectSurfacePoint(vector, view)`, `surfaceColor(input)`, `rgbToCss(rgb)`。

- [ ] **Step 1: 写密度与球面网格的失败测试**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createVoxelGrid,
  selectGridDensity,
} from '../scripts/voxel-globe-renderer.mjs';

test('桌面和手机使用已确认的体素密度', () => {
  assert.deepEqual(selectGridDensity(1280), { longitudeSegments: 88, latitudeSegments: 44 });
  assert.deepEqual(selectGridDensity(760), { longitudeSegments: 64, latitudeSegments: 32 });
});

test('球面网格记录陆海类型、相邻海岸和稳定色差', () => {
  const cells = createVoxelGrid({
    longitudeSegments: 8,
    latitudeSegments: 4,
    isLand: (lon) => lon >= 0,
  });
  assert.equal(cells.length, 32);
  assert.equal(cells.some((cell) => cell.isLand), true);
  assert.equal(cells.some((cell) => !cell.isLand), true);
  assert.equal(cells.some((cell) => cell.isLand && cell.coastEdges.length > 0), true);
  assert.equal(cells.every((cell) => cell.variation >= -0.08 && cell.variation <= 0.08), true);
});
```

- [ ] **Step 2: 运行测试并确认因模块不存在而失败**

Run: `node --test tests/voxel-globe-renderer.test.mjs`

Expected: FAIL，错误包含 `ERR_MODULE_NOT_FOUND`。

- [ ] **Step 3: 实现密度选择和预计算网格**

```js
export const LAND_LIFT = 1.045;

export function selectGridDensity(viewportWidth) {
  return viewportWidth <= 760
    ? { longitudeSegments: 64, latitudeSegments: 32 }
    : { longitudeSegments: 88, latitudeSegments: 44 };
}

function unitVector(lon, lat) {
  const cosLat = Math.cos(lat);
  return { x: cosLat * Math.sin(lon), y: Math.sin(lat), z: cosLat * Math.cos(lon) };
}

export function createVoxelGrid({ longitudeSegments, latitudeSegments, isLand }) {
  const lonStep = Math.PI * 2 / longitudeSegments;
  const latStep = Math.PI / latitudeSegments;
  const land = Array.from({ length: latitudeSegments }, (_, row) =>
    Array.from({ length: longitudeSegments }, (_, column) => {
      const lon = -Math.PI + (column + 0.5) * lonStep;
      const lat = -Math.PI / 2 + (row + 0.5) * latStep;
      return Boolean(isLand(lon, lat));
    }));
  return land.flatMap((rowValues, row) => rowValues.map((isLandCell, column) => {
    const lon0 = -Math.PI + column * lonStep;
    const lon1 = lon0 + lonStep;
    const lat0 = -Math.PI / 2 + row * latStep;
    const lat1 = lat0 + latStep;
    const neighbor = (x, y) => land[Math.max(0, Math.min(latitudeSegments - 1, y))][(x + longitudeSegments) % longitudeSegments];
    const coastEdges = isLandCell ? [
      ['north', neighbor(column, row + 1)],
      ['east', neighbor(column + 1, row)],
      ['south', neighbor(column, row - 1)],
      ['west', neighbor(column - 1, row)],
    ].filter(([, adjacentLand]) => !adjacentLand).map(([edge]) => edge) : [];
    const variation = ((((column * 37 + row * 53) % 17) - 8) / 100);
    return {
      row, column, isLand: isLandCell, coastEdges, variation,
      center: unitVector((lon0 + lon1) / 2, (lat0 + lat1) / 2),
      corners: [unitVector(lon0, lat1), unitVector(lon1, lat1), unitVector(lon1, lat0), unitVector(lon0, lat0)],
    };
  }));
}
```

- [ ] **Step 4: 运行测试并确认密度与网格测试通过**

Run: `node --test tests/voxel-globe-renderer.test.mjs`

Expected: PASS，2 个测试通过。

- [ ] **Step 5: 写投影、抬高和材质的失败测试**

```js
import {
  projectCell,
  projectSurfacePoint,
  rgbToCss,
  rotateVector,
  surfaceColor,
} from '../scripts/voxel-globe-renderer.mjs';

test('背面体素被剔除且陆地比海洋抬高', () => {
  const view = { yaw: 0, pitch: 0, center: 180, radius: 150 };
  const front = { center: { x: 0, y: 0, z: 1 }, corners: Array(4).fill({ x: 0, y: 0, z: 1 }), isLand: true };
  const back = { ...front, center: { x: 0, y: 0, z: -1 } };
  assert.equal(projectCell(back, view), null);
  assert.equal(projectCell(front, view).radiusScale, 1.045);
  assert.deepEqual(projectSurfacePoint({ x: 0, y: 0, z: 1 }, view, true), { x: 180, y: 180, depth: 1, radiusScale: 1.045 });
});

test('旋转使用与地点投影相同的偏航和俯仰约定', () => {
  const rotated = rotateVector({ x: 0, y: 0, z: 1 }, { yaw: Math.PI / 2, pitch: 0 });
  assert.ok(Math.abs(rotated.x + 1) < 1e-9);
  assert.ok(Math.abs(rotated.z) < 1e-9);
});

test('陆地为橄榄金色、海洋为深青色且侧面更暗', () => {
  const normal = { x: -0.45, y: -0.62, z: 0.64 };
  const landTop = surfaceColor({ isLand: true, normal, depth: 0.9, variation: 0, side: false });
  const landSide = surfaceColor({ isLand: true, normal, depth: 0.9, variation: 0, side: true });
  const ocean = surfaceColor({ isLand: false, normal, depth: 0.9, variation: 0, side: false });
  assert.ok(landTop[0] > landTop[2] && landTop[1] > landTop[2]);
  assert.ok(ocean[1] > ocean[0] && ocean[2] > ocean[0]);
  assert.ok(landSide.reduce((sum, value) => sum + value, 0) < landTop.reduce((sum, value) => sum + value, 0));
  assert.equal(rgbToCss([12, 34, 56]), 'rgb(12 34 56)');
});
```

- [ ] **Step 6: 运行测试并确认因函数未导出而失败**

Run: `node --test tests/voxel-globe-renderer.test.mjs`

Expected: FAIL，错误指出 `projectCell`、`rotateVector` 或 `surfaceColor` 尚未导出。

- [ ] **Step 7: 实现旋转、投影和固定光照材质**

实现时使用以下公开约定：

```js
const LIGHT = (() => {
  const source = { x: -0.45, y: -0.62, z: 0.64 };
  const length = Math.hypot(source.x, source.y, source.z);
  return { x: source.x / length, y: source.y / length, z: source.z / length };
})();

export function rotateVector(vector, { yaw = 0, pitch = 0 }) {
  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);
  const x1 = vector.x * cosYaw - vector.z * sinYaw;
  const z1 = vector.x * sinYaw + vector.z * cosYaw;
  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);
  return {
    x: x1,
    y: vector.y * cosPitch + z1 * sinPitch,
    z: -vector.y * sinPitch + z1 * cosPitch,
  };
}

function projectedPoint(vector, view, radiusScale) {
  const rotated = rotateVector(vector, view);
  return {
    x: view.center + rotated.x * view.radius * radiusScale,
    y: view.center - rotated.y * view.radius * radiusScale,
    depth: rotated.z,
  };
}

export function projectSurfacePoint(vector, view, isLand = false) {
  const rotated = rotateVector(vector, view);
  if (rotated.z <= 0.015) return null;
  const radiusScale = isLand ? LAND_LIFT : 1;
  return {
    x: view.center + rotated.x * view.radius * radiusScale,
    y: view.center - rotated.y * view.radius * radiusScale,
    depth: rotated.z,
    radiusScale,
  };
}

export function projectCell(cell, view) {
  const center = projectSurfacePoint(cell.center, view, cell.isLand);
  if (!center) return null;
  const radiusScale = cell.isLand ? LAND_LIFT : 1;
  return {
    ...center,
    normal: rotateVector(cell.center, view),
    top: cell.corners.map((corner) => projectedPoint(corner, view, radiusScale)),
    base: cell.corners.map((corner) => projectedPoint(corner, view, 1)),
  };
}

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

export function surfaceColor({ isLand, normal, depth, variation = 0, side = false }) {
  const base = isLand ? [146, 151, 18] : [8, 82, 84];
  const diffuse = Math.max(0, normal.x * LIGHT.x + normal.y * LIGHT.y + normal.z * LIGHT.z);
  const rim = 0.58 + 0.42 * Math.sqrt(Math.max(0, Math.min(1, depth)));
  const sideFactor = side ? 0.58 : 1;
  const brightness = Math.max(0.24, (0.42 + diffuse * 0.58 + variation) * rim) * sideFactor;
  return base.map((channel) => clampByte(channel * brightness));
}

export function rgbToCss([r, g, b]) { return `rgb(${r} ${g} ${b})`; }
```

固定光源向量为归一化后的 `{ x: -0.45, y: -0.62, z: 0.64 }`。海洋基础色为 `[8, 82, 84]`，陆地基础色为 `[146, 151, 18]`；亮度由 `0.42 + diffuse * 0.58`、边缘衰减和稳定色差共同构成，侧面再乘 `0.58`。

- [ ] **Step 8: 运行全部模块测试**

Run: `node --test tests/voxel-globe-renderer.test.mjs`

Expected: PASS，5 个测试通过且无警告。

- [ ] **Step 9: 提交纯渲染模块**

```bash
git add scripts/voxel-globe-renderer.mjs tests/voxel-globe-renderer.test.mjs
git commit -m "feat: add voxel globe geometry"
```

### Task 2: 接入 Canvas 体素绘制

**Files:**
- Modify: `index.html:98-370`
- Modify: `tests/homepage-structure.test.mjs`

**Interfaces:**
- Consumes: Task 1 的 `selectGridDensity`, `createVoxelGrid`, `projectCell`, `projectSurfacePoint`, `surfaceColor`, `rgbToCss`。
- Produces: 页面级 `voxelCells` 缓存、`rebuildVoxelGrid()`, `drawVoxelCell(projected)`, `drawCoastSides(projected)`, `render()`。

- [ ] **Step 1: 写 Canvas 接线的失败结构测试**

在 `tests/homepage-structure.test.mjs` 新增：

```js
test('主页接入实时球面体素渲染器', () => {
  assert.match(html, /from '\.\/scripts\/voxel-globe-renderer\.mjs'/);
  assert.match(html, /width="360" height="360"/);
  assert.match(html, /function rebuildVoxelGrid\(\)/);
  assert.match(html, /function drawVoxelCell\(projected\)/);
  assert.doesNotMatch(html, /createImageData\(RENDER_SIZE,RENDER_SIZE\)/);
});
```

- [ ] **Step 2: 运行测试并确认旧渲染器导致失败**

Run: `node --test tests/homepage-structure.test.mjs`

Expected: FAIL，缺少体素模块导入并仍存在逐像素 `createImageData` 渲染。

- [ ] **Step 3: 导入模块并建立自适应单元缓存**

在现有模块导入后加入：

```js
import {
  createVoxelGrid,
  projectCell,
  projectSurfacePoint,
  rgbToCss,
  selectGridDensity,
  surfaceColor,
} from './scripts/voxel-globe-renderer.mjs';
```

把 Canvas 尺寸改为 `360 × 360`，把 `RENDER_SIZE` 改为 `360`。新增 `voxelCells` 与 `gridDensityKey`；`rebuildVoxelGrid()` 读取 `selectGridDensity(window.innerWidth)`，以现有 `sampleTexture(lon, lat)[3] > 0` 作为 `isLand`，仅在密度键变化时重建。

- [ ] **Step 4: 以深度排序绘制海洋顶面、陆地侧面与陆地顶面**

`render()` 必须按以下顺序工作：

```js
const view = { yaw: state.yaw, pitch: state.pitch, center: RENDER_SIZE / 2, radius: globeRadius() };
const projected = voxelCells.map((cell) => ({ cell, shape: projectCell(cell, view) })).filter((item) => item.shape).sort((a, b) => a.shape.depth - b.shape.depth);
canvasCtx.clearRect(0, 0, RENDER_SIZE, RENDER_SIZE);
projected.filter(({ cell }) => !cell.isLand).forEach(({ cell, shape }) => drawVoxelCell({ cell, shape }));
projected.filter(({ cell }) => cell.isLand).forEach(({ cell, shape }) => drawCoastSides({ cell, shape }));
projected.filter(({ cell }) => cell.isLand).forEach(({ cell, shape }) => drawVoxelCell({ cell, shape }));
```

`drawVoxelCell(projected)` 用四角路径填充 `surfaceColor(...)`，再以 0.55–0.9 像素的深色描边建立格缝，并沿顶部两条边添加低透明度暖色高光。`drawCoastSides(projected)` 只遍历 `cell.coastEdges`，把对应的外层边与基础半径边连接成四边形，使用 `side: true` 的颜色。

- [ ] **Step 5: 让地点标记使用陆地抬高投影**

将 `projectLocation(location)` 改为使用：

```js
const projected = projectSurfacePoint(locationVector(location), {
  yaw: state.yaw,
  pitch: state.pitch,
  center: RENDER_SIZE / 2,
  radius: globeRadius(),
}, true);
```

继续返回现有 `{ location, view, x, y, depth }` 形状，使地点按钮和命中测试无需改写。地图渲染完成后仍最后绘制地点标记。

- [ ] **Step 6: 加入断点重建和失败保护**

监听 `resize`，只在 `selectGridDensity(window.innerWidth)` 的键发生变化时调用 `rebuildVoxelGrid()` 和 `render()`。GeoJSON 或纹理图成功建立 `textureData` 后立即调用 `rebuildVoxelGrid()`。若 Canvas 上下文为空或绘制抛错，保留加载错误文字与传送门按钮，不移除页面导航。

- [ ] **Step 7: 运行结构与状态回归测试**

Run: `node --test tests/homepage-structure.test.mjs tests/globe-ui-state.test.mjs`

Expected: PASS，现有 UI 状态测试与新增 Canvas 接线测试全部通过。

- [ ] **Step 8: 提交 Canvas 接入**

```bash
git add index.html tests/homepage-structure.test.mjs
git commit -m "feat: render raised voxel globe"
```

### Task 3: 浏览器交互与视觉校准

**Files:**
- Modify: `index.html`
- Create: `implementation-voxel-globe-desktop-1280x720.png`
- Create: `implementation-voxel-globe-mobile-390x844.png`
- Modify: `design-qa.md`

**Interfaces:**
- Consumes: Task 2 的完整主页。
- Produces: 经桌面与手机视口验证的交互页面和视觉对照记录。

- [ ] **Step 1: 运行完整自动化测试作为浏览器基线**

Run: `node --test tests/*.test.mjs`

Expected: PASS，所有测试通过且无警告。

- [ ] **Step 2: 启动本地预览并检查桌面默认状态**

Run: `python -m http.server 4173 --bind 127.0.0.1`

在用户选定的内置浏览器打开 `http://127.0.0.1:4173/`，以 1280 × 720 检查：传送门覆盖地球下部、地球静止、中文初始文案无普通英文、无横向滚动、控制按钮在未激活时隐藏。

- [ ] **Step 3: 验证桌面核心交互**

依次验证：双击地球后放大并自动转动；拖拽改变视角；滚轮缩放限制在安全范围；停止操作两秒后继续转动；地点标记随陆地移动且可点击；点击传送门出现进入过渡；语言切换后可切回中文。

- [ ] **Step 4: 验证手机核心交互**

以 390 × 844 检查 64 × 32 密度、双触唤醒、单指拖动、双指缩放、触控按钮 44 像素命中区、传送门前景层级和无横向滚动。

- [ ] **Step 5: 把参考图和实现截图放入同一视觉比较输入**

对照输入必须同时包含：

- `C:/Users/tant2/AppData/Local/Temp/codex-clipboard-5c6d69c9-cae7-4c14-8d4e-3c02b70320d4.png`
- `C:/Users/tant2/AppData/Local/Temp/codex-clipboard-aeda261a-b93e-4ce1-9475-6c28f37dde46.png`
- `implementation-voxel-globe-desktop-1280x720.png`
- `implementation-voxel-globe-mobile-390x844.png`

记录并修正可见差异：体素过疏或过密、陆地不够抬高、海洋偏蓝或偏黑、陆地缺少金黄高光、右下阴影不足、球体边缘不圆、海岸不够阶梯化、标记脱离表面、传送门层级错误。

- [ ] **Step 6: 重新截图并更新设计验收记录**

在 `design-qa.md` 写入最终桌面/手机截图路径、浏览器视口、已验证交互、与参考图仍存在但可接受的差异。不得仅以“截图看起来正常”作为结论。

- [ ] **Step 7: 再次运行完整验证**

Run: `node --test tests/*.test.mjs`

Run: `git diff --check`

Expected: 全部测试通过，`git diff --check` 无输出。

- [ ] **Step 8: 提交视觉校准与验收记录**

```bash
git add index.html design-qa.md implementation-voxel-globe-desktop-1280x720.png implementation-voxel-globe-mobile-390x844.png
git commit -m "test: verify voxel globe experience"
```
