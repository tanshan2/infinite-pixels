# Infinite Pixels 主页面实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers-zh-subagent-driven-development（推荐）或 superpowers-zh-executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将现有 3D 像素地球原型整理为 `tanshan2/infinite-pixels` 的可部署单页，并准备 GitHub Pages 与 Google 收录基础。

**架构：** 使用无构建步骤的静态 HTML 页面，保留现有 Canvas 2D 球面渲染器和地点交互；根目录 `index.html` 负责页面、元数据和脚本，`data/world.geojson` 负责本地真实陆地边界，根目录 SEO 文件和 GitHub Actions 负责公开发布。视觉 companion 文件继续保留作为设计原型，不作为发布入口。

**技术栈：** 原生 HTML/CSS/JavaScript、Canvas 2D、GeoJSON、GitHub Pages Actions、bundled Node、in-app browser。

---

## 文件结构

- 创建：`index.html`——公开主页、语义文本、SEO metadata、3D 像素地球和地点交互。
- 创建：`data/world.geojson`——本地真实世界陆地边界数据。
- 创建：`robots.txt`——允许抓取并声明 sitemap 地址。
- 创建：`sitemap.xml`——公开主页的绝对 URL。
- 创建：`.github/workflows/pages.yml`——`main` 分支推送后部署静态文件到 GitHub Pages。
- 不修改：`.superpowers/brainstorm/20260826-pixel-globe-3d/content/pixel-globe-3d.html`——继续作为当前 visual companion 版本。
- 不提交：`.superpowers/brainstorm/20260826-pixel-globe-3d/content/ui-control-layout-options.html`——布局比较草稿保持未跟踪。

## 任务 1：建立公开主页壳

**文件：**
- 创建：`index.html`
- 测试：bundled Node 静态结构检查

- [ ] **步骤 1：创建语义 HTML 文档并复制当前地球体验**

以当前 visual companion 的地球结构和脚本为基础，创建完整 HTML 文档。`head` 必须包含以下公开站点信息：

```html
<title>Infinite Pixels — 3D Pixel Globe Portfolio</title>
<meta name="description" content="Infinite Pixels 是我的个人与游戏工作室网站，记录我在中国、美国和加拿大的旅游、生活、学习和创作经历，并以 3D 像素地球连接广州、印第安纳波利斯与多伦多。">
<meta name="robots" content="index,follow">
<link rel="canonical" href="https://tanshan2.github.io/infinite-pixels/">
<meta property="og:type" content="website">
<meta property="og:title" content="Infinite Pixels — 3D Pixel Globe Portfolio">
<meta property="og:description" content="A personal and game studio site connected by a 3D pixel globe.">
<meta property="og:url" content="https://tanshan2.github.io/infinite-pixels/">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="Infinite Pixels — 3D Pixel Globe Portfolio">
<meta name="twitter:description" content="A personal and game studio site connected by a 3D pixel globe.">
```

页面正文保留 `h1`、中文简介、英文简介、canvas、地点名称的文本 fallback、控制按钮和 footer；不加入独立子页面链接或作品卡片。

- [ ] **步骤 2：运行主页结构检查**

运行：

```powershell
$node = 'C:\Users\tant2\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $node -e "const fs=require('fs');const html=fs.readFileSync('index.html','utf8');for(const s of ['<title>Infinite Pixels','<h1>Infinite Pixels','id=\"globeCanvas\"','canonical','application/ld+json'])if(!html.includes(s))throw new Error('missing '+s);console.log('homepage structure: PASS');"
```

预期输出：`homepage structure: PASS`。

- [ ] **步骤 3：Commit**

```powershell
git add -- index.html
git commit -m "feat: add Infinite Pixels homepage"
```

## 任务 2：固化真实地图数据并接入相对路径

**文件：**
- 创建：`data/world.geojson`
- 修改：`index.html` 中地图数据 URL
- 测试：JSON 解析和资源引用检查

- [ ] **步骤 1：下载并保存真实世界 GeoJSON**

使用当前原型所依赖的世界边界源保存到 `data/world.geojson`，保持原始 `FeatureCollection` 结构，不手绘或删减非洲、南美洲、北美洲、亚洲、欧洲和澳大利亚。

- [ ] **步骤 2：改用仓库内相对路径**

将主页脚本中的外部地址替换为：

```js
const DATA_URL = 'data/world.geojson';
```

保留 `buildTexture()`、最近邻采样、自然光照、地点投影和前后遮挡逻辑不变。

- [ ] **步骤 3：运行地图数据检查**

运行：

```powershell
$node = 'C:\Users\tant2\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $node -e "const fs=require('fs');const geo=JSON.parse(fs.readFileSync('data/world.geojson','utf8'));if(geo.type!=='FeatureCollection'||!Array.isArray(geo.features)||geo.features.length<100)throw new Error('invalid world GeoJSON');const html=fs.readFileSync('index.html','utf8');if(!html.includes(\"const DATA_URL = 'data/world.geojson';\"))throw new Error('homepage does not use local map data');console.log('local map data: PASS',geo.features.length,'features');"
```

预期输出包含：`local map data: PASS` 和大于 100 的 feature 数量。

- [ ] **步骤 4：Commit**

```powershell
git add -- data/world.geojson index.html
git commit -m "feat: bundle world map data"
```

## 任务 3：加入 Google 收录文件与 GitHub Pages workflow

**文件：**
- 创建：`robots.txt`
- 创建：`sitemap.xml`
- 创建：`.github/workflows/pages.yml`
- 修改：`index.html` 增加 JSON-LD
- 测试：文本内容和 workflow 关键字段检查

- [ ] **步骤 1：加入 JSON-LD、robots 和 sitemap**

在 `index.html` 的 `head` 增加：

```html
<script type="application/ld+json">
{
  "@context":"https://schema.org",
  "@type":"WebSite",
  "name":"Infinite Pixels",
  "url":"https://tanshan2.github.io/infinite-pixels/",
  "description":"Infinite Pixels 是我的个人与游戏工作室网站，记录我在中国、美国和加拿大的旅游、生活、学习和创作经历，并以 3D 像素地球连接广州、印第安纳波利斯与多伦多。",
  "inLanguage":["zh-CN","en"]
}
</script>
```

`robots.txt` 内容：

```text
User-agent: *
Allow: /
Sitemap: https://tanshan2.github.io/infinite-pixels/sitemap.xml
```

`sitemap.xml` 只包含主页：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://tanshan2.github.io/infinite-pixels/</loc>
  </url>
</urlset>
```

- [ ] **步骤 2：创建 Actions 发布流程**

`.github/workflows/pages.yml` 使用 GitHub Pages 官方 artifact/deploy actions：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Checkout
        uses: actions/checkout@v6
      - name: Configure Pages
        uses: actions/configure-pages@v5
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v4
        with:
          path: '.'
      - name: Deploy Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **步骤 3：运行收录和 workflow 检查**

运行：

```powershell
$node = 'C:\Users\tant2\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $node -e "const fs=require('fs');const robots=fs.readFileSync('robots.txt','utf8');const map=fs.readFileSync('sitemap.xml','utf8');const wf=fs.readFileSync('.github/workflows/pages.yml','utf8');for(const s of ['Sitemap: https://tanshan2.github.io/infinite-pixels/sitemap.xml','https://tanshan2.github.io/infinite-pixels/'])if(!robots.includes(s)&&!map.includes(s))throw new Error('missing SEO URL');for(const s of ['actions/configure-pages@v5','actions/upload-pages-artifact@v4','actions/deploy-pages@v4','branches: [main]'])if(!wf.includes(s))throw new Error('missing workflow field '+s);console.log('SEO and Pages workflow: PASS');"
```

预期输出：`SEO and Pages workflow: PASS`。

- [ ] **步骤 4：Commit**

```powershell
git add -- index.html robots.txt sitemap.xml .github/workflows/pages.yml
git commit -m "feat: add Pages deployment and SEO"
```

## 任务 4：本地运行与浏览器回归

**文件：**
- 修改：`index.html`（只修复真实发现的运行问题）
- 测试：本地 HTTP 页面、in-app browser、bundled Node

- [ ] **步骤 1：启动静态 HTTP 服务并检查响应**

在仓库根目录执行下面的 bundled Node 命令，使用 Node 内置 `http`/`fs` 提供静态文件；它不增加项目依赖，也能让 `data/world.geojson` 通过相对路径 fetch：

```powershell
$node = 'C:\Users\tant2\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$server = Start-Process -FilePath $node -WorkingDirectory (Get-Location) -ArgumentList '-e', 'const http=require("http"),fs=require("fs"),path=require("path");const root=process.cwd(),mime={".html":"text/html",".js":"application/javascript",".css":"text/css",".json":"application/json",".txt":"text/plain",".xml":"application/xml"};http.createServer((req,res)=>{const clean=decodeURIComponent(req.url.split("?")[0]);const rel=clean==="/"?"index.html":clean.replace(/^\\//,"");const file=path.resolve(root,rel);if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end("Not found");}res.writeHead(200,{"Content-Type":mime[path.extname(file)]||"application/octet-stream"});res.end(data);});}).listen(4173,"127.0.0.1",()=>console.log("static server http://localhost:4173/"));' -PassThru
Invoke-WebRequest http://localhost:4173/ -UseBasicParsing | Select-Object StatusCode,Headers
```

预期 Node 输出 `static server http://localhost:4173/`，HTTP 响应 `StatusCode : 200`。

- [ ] **步骤 2：运行 JavaScript 语法和差异检查**

运行：

```powershell
$node = 'C:\Users\tant2\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $node -e "const fs=require('fs');const html=fs.readFileSync('index.html','utf8');const start=html.indexOf('<script>')+8;const end=html.indexOf('</script>',start);if(start<8||end<0)throw new Error('script block not found');new Function(html.slice(start,end));console.log('JavaScript syntax: PASS');"
git diff --check
```

预期 JavaScript 输出 `PASS`，`git diff --check` 无输出。

- [ ] **步骤 3：验证页面结构、地图和控制台**

在浏览器中检查：

```js
await tab.playwright.locator('#globeCanvas').count();       // 1
await tab.playwright.locator('h1').count();                 // 1
await tab.playwright.locator('#globeLocationNav button').count(); // 3
await tab.playwright.locator('link[rel="canonical"]').getAttribute('href'); // Pages URL
await tab.dev.logs({levels:['error','warn']});              // []
```

- [ ] **步骤 4：验证既有地球交互和 SEO 文本**

确认初始截图仍显示真实陆地和暖红像素图钉；点击三个可见地点时名牌只显示城市名；拖动旋转、滚轮缩放、重置、语言切换和点击空白清除均正常；选中地点转到背面时图钉隐藏而名牌保留。检查页面文本包含 `Infinite Pixels`、用户确认的中文描述和三个城市名称，即使不读取 canvas 也能找到这些文本。

- [ ] **步骤 5：Commit**

```powershell
git add -- index.html
git commit -m "test: verify static homepage interactions"
```

只有在真实修复了回归问题时才创建此提交；没有代码修复时不创建空提交。

## 任务 5：创建仓库、推送并验证 GitHub Pages

**文件：**
- GitHub 仓库：`tanshan2/infinite-pixels`
- 本地 Git：新增 `origin`，创建并推送 `main` 分支
- 测试：GitHub Actions 状态和公开 URL

- [ ] **步骤 1：通过 GitHub 登录会话创建公开空仓库**

创建 `infinite-pixels` 公开仓库，不自动添加 README、`.gitignore` 或 license，避免与本地历史产生无关合并；保持用户已授权的 GitHub 账号 `tanshan2`。

- [ ] **步骤 2：推送 main 发布分支**

保留当前 `codex/pixel-globe-3d` 分支，在当前提交创建 `main` 分支并推送：

```powershell
git remote add origin https://github.com/tanshan2/infinite-pixels.git
git branch main HEAD
git push -u origin main
```

- [ ] **步骤 3：检查 Actions 和公开页面**

确认 `Deploy to GitHub Pages` workflow 在 `main` 上成功运行；访问：

`https://tanshan2.github.io/infinite-pixels/`

确认主页返回 200、标题为 `Infinite Pixels — 3D Pixel Globe Portfolio`、GeoJSON 成功加载、浏览器控制台无 error/warn。

- [ ] **步骤 4：记录 Search Console 下一步**

向用户提供 Search Console 操作：添加 `https://tanshan2.github.io/infinite-pixels/`，提交 `https://tanshan2.github.io/infinite-pixels/sitemap.xml`。不代替用户进行 Google 账号验证。

## 计划自检

- 规格中的单页范围、3D 地球、三地点、双语、SEO metadata、JSON-LD、robots、sitemap、本地 GeoJSON、GitHub Pages workflow、无障碍和错误处理都有对应任务。
- 所有路径均为仓库内明确路径；没有未定义函数、类型、文件或构建工具。
- 方案无构建依赖，主页资源使用相对路径，适配 `tanshan2.github.io/infinite-pixels/` 项目前缀。
- 地图源从外部运行时依赖改为本地文件，避免网络故障破坏地球显示。
- 未引入子页面、作品内容、数据库、登录或追踪脚本，符合 Q3=C 的范围。
