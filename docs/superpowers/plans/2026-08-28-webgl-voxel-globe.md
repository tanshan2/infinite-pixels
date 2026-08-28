# WebGL 高细节体素地球 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-en-subagent-driven-development (recommended) or superpowers-en-executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用真实三维实例化体素替换二维方格地球，使细节密度、块体结构和光照接近参考图，同时完整保留传送门与交互。

**Architecture:** 新建原生 WebGL2 渲染模块，GPU 根据经纬实例数据生成球面上的倒角块体；页面保留 GeoJSON 遮罩、UI 状态机和地点投影，并新增透明覆盖层绘制地点标记。WebGL 不可用时保留中文错误状态和传送门入口。

**Tech Stack:** 原生 HTML/CSS、JavaScript ES modules、WebGL2、Canvas 2D 覆盖层、Node.js 内置测试运行器、GeoJSON。

## Global Constraints

- 不新增第三方运行时依赖。
- 宽度大于 480 像素时密度 256 × 128，窄屏手机密度 160 × 80；地理遮罩 720 × 360。
- 每格必须有顶面、倒角面、侧面和独立光照；陆地高于海洋。
- 传送门、前景层级、双击激活和现有交互规则保持不变。
- 中文为默认界面，不新增普通英文文案。

---

### Task 1: 倒角网格与实例数据

**Files:**
- Create: `scripts/webgl-voxel-globe.mjs`
- Create: `tests/webgl-voxel-globe.test.mjs`
- Modify: `scripts/voxel-globe-renderer.mjs`
- Modify: `tests/voxel-globe-renderer.test.mjs`

**Interfaces:**
- Produces: `createBeveledVoxelMesh()`, `createVoxelInstanceData(cells)`, `createWebGlVoxelRenderer(canvas)`, `selectGridDensity(width)`。

- [ ] 写密度、倒角面数量、法线单位长度、实例数量与陆海标志的失败测试。
- [ ] 运行测试并确认因新接口不存在而失败。
- [ ] 实现倒角八边形柱体网格与实例化数据。
- [ ] 把密度改为桌面 256 × 128、移动 160 × 80。
- [ ] 运行模块测试并提交。

### Task 2: WebGL2 实例化渲染器

**Files:**
- Modify: `scripts/webgl-voxel-globe.mjs`
- Modify: `tests/webgl-voxel-globe.test.mjs`

**Interfaces:**
- Produces: `renderer.setInstances(cells, density)`, `renderer.draw(view)`, `renderer.resize()`, `renderer.dispose()`。

- [ ] 写着色器源码、公开接口和无 WebGL2 返回空值的失败测试。
- [ ] 运行测试并确认失败原因正确。
- [ ] 实现着色器编译、缓冲区、实例属性、深度测试、背面剔除和自适应分辨率。
- [ ] 运行模块测试并提交。

### Task 3: 页面接入与地点覆盖层

**Files:**
- Modify: `index.html`
- Modify: `tests/homepage-structure.test.mjs`

**Interfaces:**
- Consumes: WebGL 渲染器和既有地球 UI 状态机。
- Produces: WebGL 主画布、2D 地点覆盖层与 720 × 360 地理遮罩。

- [ ] 写 WebGL 导入、覆盖层、遮罩分辨率和旧二维绘制移除的失败结构测试。
- [ ] 运行测试并确认旧页面导致失败。
- [ ] 接入 WebGL 渲染器、覆盖层和新默认视角；保留全部交互。
- [ ] 运行全部自动化测试并提交。

### Task 4: 浏览器与视觉验收

**Files:**
- Modify: `design-qa.md`
- Create: `implementation-webgl-voxel-desktop-1280x720.png`
- Create: `implementation-webgl-voxel-mobile-390x844.png`

- [ ] 在内置浏览器验证默认、激活、拖拽、缩放、地点与传送门。
- [ ] 同时打开参考图和实现截图进行桌面与手机视觉比较。
- [ ] 修复所有 P0/P1/P2 差异并重新截图。
- [ ] 运行 `node --test tests/*.test.mjs` 与 `git diff --check`。
- [ ] 只有视觉验收通过后才更新 `design-qa.md` 为 `final result: passed` 并提交。
