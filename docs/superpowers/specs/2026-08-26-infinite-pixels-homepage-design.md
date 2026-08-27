# Infinite Pixels 主页面与 GitHub Pages 设计规格

## 目标

把当前 3D 像素地球原型整理成一个可以公开部署的单页个人与游戏工作室网站。网站名称为 **Infinite Pixels**，发布目标为 GitHub Pages 项目站点：

`https://tanshan2.github.io/infinite-pixels/`

主页面只保留 3D 像素地球作为核心内容，不在本阶段加入广州、印第安纳波利斯和多伦多的独立子页面、作品卡片或复杂站内菜单。

## 已确认的内容与视觉方向

- SEO 描述使用：`Infinite Pixels 是我的个人与游戏工作室网站，记录我在中国、美国和加拿大的旅游、生活、学习和创作经历，并以 3D 像素地球连接广州、印第安纳波利斯与多伦多。`
- 继续使用当前深炭灰/深青色背景、低分辨率硬边像素、自然光照、绿色陆地和深青海洋。
- 页面顶部显示 `Infinite Pixels`，右上角保留中文/英文切换。
- 中央显示同一份真实陆地数据投影出的 3D 像素地球。
- 保留鼠标拖动旋转、滚轮缩放、触摸拖动/双指缩放、三地点图钉、城市名牌和重置控制。
- 不自动旋转，不使用惯性、霓虹、粒子、星空或科幻 HUD。
- 地球下方保留一段简短的个人与工作室简介，供访问者和搜索引擎理解页面主题；不扩展为额外内容区。

## 页面结构

```text
index.html
├─ head
│  ├─ title / description / canonical
│  ├─ Open Graph / X metadata
│  └─ WebSite JSON-LD
├─ header
│  ├─ Infinite Pixels
│  └─ 中文 · EN
├─ main
│  ├─ h1：Infinite Pixels
│  ├─ 简短中英文简介
│  ├─ 3D 像素地球 canvas
│  ├─ 广州 / Indianapolis / Toronto 图钉交互
│  └─ 缩放、重置、交互提示
├─ noscript fallback
└─ footer
   └─ 站点主题和版权文字
```

`canvas` 负责视觉渲染，但标题、简介、地点名称、交互说明和错误提示都使用普通 HTML 文本保留在文档中，确保无 JavaScript 时仍有可读内容。

## 数据与运行时

- 把当前使用的真实世界 GeoJSON 固化为 `data/world.geojson`，由页面相对路径加载。
- 删除对外部 raw GitHub 地图地址的运行时依赖，避免第三方网络故障导致大陆消失。
- 维持现有 128×64 纹理、160×160 内部渲染和最近邻采样；2D 平面纹理与 3D 球面继续共享同一份 GeoJSON 来源。
- GeoJSON 加载失败时，保留海洋球体、显示清晰的中英文错误提示，并不抛出未捕获异常。
- 地图数据不包含用户隐私、账号信息或第三方密钥。

## SEO 与分享

在 `index.html` 中加入：

- 唯一的中英文页面标题，包含 `Infinite Pixels` 和 `3D Pixel Globe` 主题。
- 用户确认的中文 `description`，以及简短英文描述。
- 指向 GitHub Pages 项目站点的 canonical URL。
- `og:type=website`、标题、描述和 URL；没有专门的社交图片时不伪造 `og:image`。
- X/Twitter 卡片的标题、描述和 URL。
- `WebSite` JSON-LD，名称为 `Infinite Pixels`，URL 使用 GitHub Pages 项目地址，描述使用用户确认文案。
- 可见的 `h1`、地点名称和简短站点说明，不依赖 canvas 像素内容作为唯一文字。

新增根目录文件：

- `robots.txt`：允许公开抓取，并指向 `/infinite-pixels/sitemap.xml`。
- `sitemap.xml`：只列出主页的绝对 URL和更新时间。

Google 收录不是发布后即时保证的；发布成功后，用户需要在 Google Search Console 添加站点并提交 sitemap。站点会以公开页面、可抓取文本和 sitemap 为收录基础。

## GitHub Pages 发布

- 新建公开仓库 `tanshan2/infinite-pixels`。
- 以 `main` 分支作为发布源。
- 新增 `.github/workflows/pages.yml`，在 `main` 推送时上传仓库根目录静态文件并部署到 GitHub Pages。
- workflow 使用官方 Pages artifact/deploy actions，不引入构建步骤，不修改用户的 GitHub 权限设置。
- 根目录的 `index.html` 是唯一主页入口；相对资源路径必须兼容项目站点前缀 `/infinite-pixels/`。
- 发布后验证主页返回 200，页面标题、描述、canonical、sitemap 和 `robots.txt` 均使用正确的项目站点地址。

## 无障碍与响应式

- `canvas` 有描述性 `aria-label`，并提供普通文本 fallback。
- 中文/英文切换按钮、重置和缩放按钮有可读的 `aria-label` 与键盘焦点样式。
- 地点按钮保留键盘入口；选中状态同步 `aria-pressed`，名牌使用 `aria-live=polite`。
- 桌面端地球居中，移动端按视口缩放，不产生横向滚动；图钉命中区域略大于实际像素形状。
- 不用颜色作为唯一状态提示；选中地点同时使用名牌和图钉轮廓。

## 错误处理

- 静态资源不存在、GeoJSON 解析失败或 canvas 不可用时，页面仍显示站点标题、简介和错误说明。
- 所有地点层异常只影响图钉和名牌，不破坏语言切换、旋转、缩放或重置。
- 不记录访问者数据，不添加分析脚本或外部追踪器。

## 验收标准

1. GitHub Pages 项目地址打开后能看到 `Infinite Pixels` 标题和当前 3D 像素地球。
2. 真实陆地数据从仓库本地加载，非洲、南美洲、北美洲、亚洲、欧洲和澳大利亚仍可辨认。
3. 三个城市图钉、中文/英文切换、名牌、旋转、缩放和重置行为与当前原型一致。
4. `robots.txt`、`sitemap.xml`、canonical、description、Open Graph/X metadata 和 JSON-LD 内容正确指向公开项目站点。
5. 移除 JavaScript 后，页面仍有标题、简介、地点名称和站点主题说明。
6. 页面在桌面和移动窄屏下没有横向溢出，控制台无 error/warn。
7. GitHub Actions 工作流能够在 `main` 推送后完成 Pages 部署；部署失败时不删除已有页面。

## 非目标

- 本阶段不制作三个地区的独立子页面。
- 本阶段不添加作品项目、联系表单、登录、数据库、统计分析或第三方广告。
- 本阶段不保证 Google 立刻显示结果；只完成可抓取页面、站点地图和发布基础。
