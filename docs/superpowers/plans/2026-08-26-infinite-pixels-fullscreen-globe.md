# Infinite Pixels 全屏像素地球实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers-zh-subagent-driven-development（推荐）或 superpowers-zh-executing-plans 逐任务实现此计划。步骤使用复选框（\`- [ ]\`）语法来跟踪进度。

**目标：** 将 \`index.html\` 改造成与用户截图一致的全屏极简 3D 像素地球主页，同时保留真实 GeoJSON、地点标记、地点名牌交互和 SEO 源码信息。

**架构：** 保留现有单页 Canvas 地球渲染器和 \`data/world.geojson\`，只重排可见 DOM 与 CSS。主页根容器改为固定视口画布；地球、控件、提示和语言按钮通过绝对定位响应式布局，城市名牌继续由现有 JavaScript 按需显示。

**技术栈：** 原生 HTML/CSS/JavaScript、Canvas 2D、GeoJSON、GitHub Pages Actions。

---

## 文件职责

- 修改：\`index.html\` — 移除可见页面 chrome，加入全屏布局覆盖样式，保留现有 Canvas 渲染与交互逻辑。
- 创建：\`docs/superpowers/specs/2026-08-26-infinite-pixels-fullscreen-globe.md\` — 已确认的视觉规格（已提交）。
- 创建：\`docs/superpowers/plans/2026-08-26-infinite-pixels-fullscreen-globe.md\` — 本实现计划。
- 修改：\`design-qa.md\` — 记录参考截图与本地/线上截图的视觉验收结果。
- 不修改：\`data/world.geojson\`、\`robots.txt\`、\`sitemap.xml\`、\`.github/workflows/pages.yml\`。

### 任务 1：建立全屏主页 DOM 边界

**文件：**
- 修改：\`index.html:46-78\`
- 测试：浏览器 DOM 快照（本地 \`http://localhost:4173/\`）

- [x] **步骤 1：记录实现前的行为基线**

在本地预览页执行以下浏览器评估，确认现有地图数据与交互入口存在：

~~~
({
  canvas: !!document.querySelector('#globeCanvas'),
  locationButtons: document.querySelectorAll('[data-location-id]').length,
  languageButton: !!document.querySelector('#langToggle'),
  dataUrl: 'data/world.geojson'
})
~~~

预期：\`canvas: true\`、\`locationButtons: 3\`、\`languageButton: true\`。

- [x] **步骤 2：收敛可见 DOM**

在 \`index.html\` 中删除可见的 \`.site-header\`、标题/简介、地球 \`h2\`、\`.subtitle\`、\`.globe3d-note\` 和页脚；保留组件本身的 \`#globeCanvas\`、\`#globeLoading\`、\`#langToggle\`、\`#globeControls\`、\`.globe3d-meta\`、地点选择导航及地点名牌。将根节点改为：

~~~
<main class="globe-page" aria-label="Infinite Pixels 3D 像素地球">
  <h1 class="sr-only">Infinite Pixels</h1>
  <section class="globe3d-wrap" aria-label="可旋转的 3D 像素地球">
    <!-- 现有 globe3d-topline、globe3d-stage、location label/nav、controls、meta -->
  </section>
  <noscript class="site-noscript">需要启用 JavaScript 才能旋转地球。</noscript>
</main>
~~~

保留 \`<head>\` 中的标题、description、canonical、Open Graph、Twitter 与 JSON-LD；这些内容不渲染为可见 UI。

- [x] **步骤 3：运行结构检查**

刷新本地页并执行：

~~~
({
  headings: [...document.querySelectorAll('h1,h2,h3')].map((node) => ({text: node.textContent.trim(), visible: !!(node.offsetWidth || node.offsetHeight || node.getClientRects().length)})),
  visibleChrome: [...document.querySelectorAll('.site-header,.site-lede,.subtitle,.globe3d-note,.site-footer')].filter((node) => getComputedStyle(node).display !== 'none').length,
  controls: [...document.querySelectorAll('#globeControls button')].map((node) => node.textContent.trim())
})
~~~

预期：只有视觉隐藏的 \`h1\`，\`visibleChrome: 0\`，\`controls: ['−','重置','＋']\`。

### 任务 2：实现截图构图与响应式全屏 CSS

**文件：**
- 修改：\`index.html:30-43\` 与组件 \`<style>\` 中的 \`.globe3d-*\` 规则
- 测试：本地桌面与窄屏截图、滚动高度评估

- [x] **步骤 1：先添加失败验收条件**

在浏览器中执行下列断言，记录当前页面会因旧卡片布局失败：

~~~
({
  viewport: [innerWidth, innerHeight],
  scrollLocked: document.documentElement.scrollHeight <= innerHeight + 1 && document.body.scrollHeight <= innerHeight + 1,
  shellBorder: getComputedStyle(document.querySelector('.globe3d-wrap')).borderStyle,
  shellMinHeight: getComputedStyle(document.querySelector('.globe3d-wrap')).minHeight
})
~~~

预期（改造前）：\`scrollLocked\` 为 \`false\` 或外层仍有边框/固定最小高度，证明验收条件能区分旧布局。

- [x] **步骤 2：写入全屏布局规则**

在现有样式末尾加入以下确定性覆盖（颜色沿用截图的 \`#111716\` 背景与既有像素调色板）：

~~~
html, body { width: 100%; height: 100%; overflow: hidden; }
body { min-width: 320px; min-height: 100%; background: #111716; }
.site-shell, .site-stage { width: 100%; height: 100%; margin: 0; padding: 0; }
.site-header, .site-footer, .globe3d-note { display: none; }
.globe-page { position: relative; width: 100vw; height: 100dvh; min-height: 100vh; overflow: hidden; background: #111716; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); clip-path: inset(50%); white-space: nowrap; border: 0; }
.globe3d-wrap { position: relative; width: 100%; height: 100%; min-height: 0; padding: 0; border: 0; border-radius: 0; background: #111716; }
.globe3d-topline { position: absolute; top: 8px; right: 10px; z-index: 4; }
.globe3d-topline strong { display: none; }
.globe3d-stage { position: absolute; left: 0; top: 50%; width: min(60vw, 64vh, 560px); margin: 0; transform: translateY(-50%); }
.globe3d-controls { position: absolute; left: min(30vw, 32vh, 280px); bottom: clamp(45px, 7vh, 68px); margin: 0; transform: translateX(-50%); }
.globe3d-meta { position: absolute; left: min(30vw, 32vh, 280px); bottom: clamp(9px, 2vh, 16px); margin: 0; transform: translateX(-50%); white-space: nowrap; }
.globe3d-location-label { position: absolute; left: min(30vw, 32vh, 280px); top: calc(50% + min(30vw, 32vh, 280px) + 8px); margin: 0; transform: translateX(-50%); }
.site-noscript { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); }
@media (max-width: 760px) {
  .globe3d-stage { left: 50%; width: min(88vw, 64vh, 560px); transform: translate(-50%, -50%); }
  .globe3d-controls, .globe3d-meta, .globe3d-location-label { left: 50%; }
}
~~~

- [x] **步骤 3：运行通过验收条件**

在 1280×720 和 737×678 两个视口执行：

~~~
({
  bodySize: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
  viewport: [innerWidth, innerHeight],
  shellBorder: getComputedStyle(document.querySelector('.globe3d-wrap')).borderStyle,
  stage: (() => { const r = document.querySelector('#globeStage').getBoundingClientRect(); return {left: Math.round(r.left), width: Math.round(r.width), top: Math.round(r.top)}; })(),
  visibleText: [...document.querySelectorAll('body *')].filter((node) => { const s = getComputedStyle(node); return s.display !== 'none' && s.visibility !== 'hidden' && node.textContent.trim() && node.children.length === 0; }).map((node) => node.textContent.trim())
})
~~~

预期：页面尺寸不超过视口、\`shellBorder: 'none'\`；桌面 stage 左侧贴近 0，窄屏 stage 水平居中；可见文字只包含 \`中文 · EN\`、\`−\`、\`重置\`、\`＋\`、操作提示和 \`PIXEL SOURCE 128×64\`（加载完成后不含加载文字）。

### 任务 3：回归地图与地点名牌交互

**文件：**
- 修改：\`index.html\`（仅在布局改动需要时调整现有交互节点）
- 测试：本地浏览器交互与控制台日志

- [ ] **步骤 1：等待真实地图纹理完成**

在本地页等待 \`#globeLoading\` 的 \`display\` 变为 \`none\`，并执行：

~~~
({
  loading: getComputedStyle(document.querySelector('#globeLoading')).display,
  canvasSize: [document.querySelector('#globeCanvas').width, document.querySelector('#globeCanvas').height],
  locationButtons: [...document.querySelectorAll('[data-location-id]')].map((node) => node.dataset.locationId)
})
~~~

预期：\`loading: 'none'\`、canvas 内部尺寸仍为 \`[160,160]\`、地点 ID 为 \`guangzhou\`、\`indianapolis\`、\`toronto\`。

- [ ] **步骤 2：验证名牌默认隐藏与点击显示**

执行：

~~~
({ hiddenInitially: document.querySelector('#globeLocationLabel').hidden })
~~~

然后点击一个当前可见 marker；若当前朝向没有 marker，使用隐藏的地点按钮作为等价可访问入口：

~~~
document.querySelector('[data-location-id="guangzhou"]').click();
({ hiddenAfterClick: document.querySelector('#globeLocationLabel').hidden, label: document.querySelector('#globeLocationName').textContent.trim() })
~~~

预期：初始 \`hiddenInitially: true\`；点击后 \`hiddenAfterClick: false\` 且 label 为 \`广州\`（切换英文后为 \`Guangzhou\`）。

- [ ] **步骤 3：验证旋转、缩放、重置与语言切换**

记录 canvas 截图长度或像素数据摘要，分别调用 \`#zoomIn\`、\`#zoomOut\`、\`#resetView\`，并点击 \`#langToggle\`。预期：缩放改变 globe state/截图，重置恢复初始视角，语言按钮切换提示文案；\`dev.logs()\` 为空数组。

### 任务 4：视觉 QA、提交与 GitHub Pages 发布

**文件：**
- 创建/修改：\`design-qa.md\`
- 修改：\`index.html\`
- 测试：本地 HTTP、GitHub Actions、公开 Pages URL

- [ ] **步骤 1：运行静态与本地检查**

执行：

~~~
node --version
Invoke-WebRequest http://localhost:4173/ -UseBasicParsing | Select-Object -ExpandProperty StatusCode
Select-String -Path index.html -Pattern '100dvh|globe3d-stage|langToggle|world.geojson'
~~~

预期：Node 可用、本地 HTTP 状态 \`200\`，并能找到全屏规则、语言按钮和真实数据 URL。

- [ ] **步骤 2：生成 \`design-qa.md\` 并记录结果**

记录参考截图的布局测量、本地桌面/窄屏截图检查、公开页截图检查；最终写明 \`final result: passed\`，并列出未发现 P0/P1/P2 视觉问题。

- [ ] **步骤 3：提交主页改动**

~~~
git add index.html design-qa.md docs/superpowers/plans/2026-08-26-infinite-pixels-fullscreen-globe.md
git commit -m "feat: make pixel globe homepage fullscreen"
~~~

- [ ] **步骤 4：同步 \`main\` 并发布 Pages**

将已验证提交快进到本地 \`main\` 后推送：

~~~
git branch --show-current
git log -1 --oneline
git push origin HEAD:main
~~~

预期：远端 \`main\` 指向本次主页提交，GitHub Pages workflow 为绿色。

- [ ] **步骤 5：验证公开页面**

打开 \`https://tanshan2.github.io/infinite-pixels/\`，重复任务 2、任务 3 的 DOM/截图检查，并确认 \`robots.txt\`、\`sitemap.xml\` 仍返回 HTTP 200。只有本地与公开页面都满足验收标准后才报告完成。
