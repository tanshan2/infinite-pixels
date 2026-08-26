# 3D 像素地球地点交互实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers-zh-subagent-driven-development（推荐）或 superpowers-zh-executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 在现有 3D 像素地球上加入广州、印第安纳波利斯和多伦多三个真实坐标附近的像素图钉，并实现遮挡、选中、城市名牌、语言切换和键盘访问。

**架构：** 只修改当前 visual companion 页面，在已有 Canvas 2D 球面渲染器中增加数据驱动的地点层。地点先转换为未旋转球面向量，再使用现有 yaw/pitch 的逆变换得到屏幕像素位置；同一套投影同时用于绘制和命中测试。选中状态由页面状态统一管理，名牌和无视觉干扰的键盘入口读取同一份地点数据。

**技术栈：** 原生 HTML/CSS/JavaScript、Canvas 2D、GeoJSON 平面纹理、当前 Superpowers visual companion、in-app browser。

---

## 文件结构

- 修改：`.superpowers/brainstorm/20260826-pixel-globe-3d/content/pixel-globe-3d.html`——增加地点名牌、无障碍入口、地点数据、球面投影、像素图钉绘制、命中测试、选择状态和语言更新。
- 创建：无；不新增依赖、构建工具或图片资源。
- 测试：使用本地预览的 DOM 快照、截图、Playwright 定位器、CUA 拖动/滚轮和控制台日志；用 bundled Node 做脚本语法检查。

### 任务 1：加入名牌和键盘入口结构

**文件：**
- 修改：`.superpowers/brainstorm/20260826-pixel-globe-3d/content/pixel-globe-3d.html` 的 `globeStage`、控制条和元信息之间区域。

- [x] **步骤 1：插入只显示城市名的名牌和可访问地点入口**

```html
<div id="globeLocationLabel" class="globe3d-location-label" role="status" aria-live="polite" hidden>
  <span id="globeLocationName"></span>
</div>
<nav id="globeLocationNav" class="globe3d-location-nav" aria-label="地点选择">
  <button type="button" data-location-id="guangzhou" aria-label="选择广州">广州</button>
  <button type="button" data-location-id="indianapolis" aria-label="选择印第安纳波利斯">印第安纳波利斯</button>
  <button type="button" data-location-id="toronto" aria-label="选择多伦多">多伦多</button>
</nav>
```

键盘入口只承担选择动作，不添加可见的第二套地点 UI；可见图钉仍由 Canvas 绘制。名牌放在球体和现有控制条之间。

- [x] **步骤 2：加入克制的像素名牌、隐藏入口和移动端样式**

```css
.globe3d-location-label{display:flex;justify-content:center;min-height:20px;margin-top:10px;color:#f0ebd0;font:12px 'Courier New',monospace;letter-spacing:.08em;text-align:center}
.globe3d-location-label[hidden]{display:none}
.globe3d-location-label span{border:1px solid #69776c;background:#172622;padding:5px 10px;image-rendering:pixelated}
.globe3d-location-nav{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap}
.globe3d-location-nav button{font:12px 'Courier New',monospace}
.globe3d-location-nav button:focus-visible{outline:2px solid #d5d7a2;outline-offset:3px}
@media(max-width:640px){.globe3d-location-label{font-size:11px;margin-top:8px}.globe3d-location-label span{padding:5px 8px}}
```

- [x] **步骤 3：运行结构检查**

刷新 `http://localhost:61820/`，预期 `#globeLocationLabel`、`#globeLocationName`、`#globeLocationNav` 和三个 `data-location-id` 按钮各出现一次；名牌初始隐藏，球体和控制条仍在原位置。

### 任务 2：建立地点数据和球面投影

**文件：**
- 修改：`.superpowers/brainstorm/20260826-pixel-globe-3d/content/pixel-globe-3d.html` 的状态常量和渲染辅助函数区域。

- [x] **步骤 1：定义可扩展地点数组和选择状态**

```js
const LOCATIONS = [
  {id:'guangzhou', name:{zh:'广州', en:'Guangzhou'}, lat:23.129, lon:113.264},
  {id:'indianapolis', name:{zh:'印第安纳波利斯', en:'Indianapolis'}, lat:39.768, lon:-86.158},
  {id:'toronto', name:{zh:'多伦多', en:'Toronto'}, lat:43.653, lon:-79.383}
];
const state = {...DEFAULT_VIEW, language:'zh', selectedLocationId:null, hoverLocationId:null};
const drag = {id:null,x:0,y:0,startX:0,startY:0,moved:false,locationId:null};
let blinkFrame = 0;
```

若当前文件已有同名 `state` 或 `drag`，直接在原定义上合并字段，保持 `pointers` 和 `pinch` 的现有引用不变。

- [x] **步骤 2：实现经纬度向量和当前视角逆变换**

```js
function locationVector(location){
  const lat=location.lat*Math.PI/180, lon=location.lon*Math.PI/180, cosLat=Math.cos(lat);
  return {x:cosLat*Math.sin(lon),y:Math.sin(lat),z:cosLat*Math.cos(lon)};
}
function worldToView(v){
  const cosYaw=Math.cos(state.yaw),sinYaw=Math.sin(state.yaw);
  const x1=v.x*cosYaw-v.z*sinYaw, z1=v.x*sinYaw+v.z*cosYaw;
  const cosPitch=Math.cos(state.pitch),sinPitch=Math.sin(state.pitch);
  return {x:x1,y:v.y*cosPitch+z1*sinPitch,z:-v.y*sinPitch+z1*cosPitch};
}
function projectLocation(location){
  const view=worldToView(locationVector(location));
  if(view.z<=0.04)return null;
  const center=RENDER_SIZE/2,radius=RENDER_SIZE*0.43*state.zoom;
  return {location,view,x:center+view.x*radius,y:center-view.y*radius,depth:view.z};
}
```

`view.z` 是相机朝向的正面深度；小于等于 `0.04` 的点按硬遮挡处理，避免图钉穿过轮廓。

- [x] **步骤 3：实现可见地点筛选和像素命中测试**

```js
function visibleLocations(){
  return LOCATIONS.map(projectLocation).filter(Boolean).filter(item=>!state.selectedLocationId||item.location.id===state.selectedLocationId);
}
function hitLocation(event){
  const rect=canvas.getBoundingClientRect(),scale=RENDER_SIZE/rect.width;
  const px=(event.clientX-rect.left)*scale,py=(event.clientY-rect.top)*scale;
  return visibleLocations().sort((a,b)=>b.depth-a.depth).find(item=>Math.hypot(item.x-px,item.y-py)<=Math.max(4,Math.round(5/state.zoom)))?.location||null;
}
```

命中半径略大于图钉实际像素尺寸，移动端仍能轻点选中；深度排序保证重叠时优先选择更靠近相机的地点。

### 任务 3：绘制像素图钉和选中闪烁

**文件：**
- 修改：`.superpowers/brainstorm/20260826-pixel-globe-3d/content/pixel-globe-3d.html` 的 `render()` 和绘制辅助函数。

- [x] **步骤 1：在球体像素图像完成后绘制地点图钉**

```js
function drawLocationMarker(item){
  const unit=Math.max(1,Math.round(state.zoom)),px=Math.round(item.x),py=Math.round(item.y);
  const selected=item.location.id===state.selectedLocationId;
  const blink=selected?(0.68+0.32*(0.5+0.5*Math.sin(performance.now()/1200*Math.PI*2))):1;
  canvasCtx.save();canvasCtx.globalAlpha=blink;
  canvasCtx.fillStyle='#d7654f';
  canvasCtx.fillRect(px-2*unit,py-2*unit,4*unit,3*unit);
  canvasCtx.fillRect(px-unit,py+unit,2*unit,2*unit);
  canvasCtx.fillStyle='#f0ebd0';canvasCtx.fillRect(px-unit,py-unit,2*unit,2*unit);
  if(selected){canvasCtx.strokeStyle='#d5d7a2';canvasCtx.lineWidth=unit;canvasCtx.strokeRect(px-3*unit,py-3*unit,6*unit,5*unit);}
  canvasCtx.restore();
}
```

把 `visibleLocations().forEach(drawLocationMarker)` 放在 `canvasCtx.putImageData(image,0,0)` 之后，确保图钉位于球面之上但仍受前/后面筛选控制。

- [x] **步骤 2：让选中图钉缓慢重绘，未选中时不保留动画循环**

```js
function tickBlink(){
  blinkFrame=0;
  if(!state.selectedLocationId)return;
  render();
  blinkFrame=requestAnimationFrame(tickBlink);
}
function ensureBlink(){
  if(state.selectedLocationId&&!blinkFrame)blinkFrame=requestAnimationFrame(tickBlink);
}
```

选中地点后调用 `ensureBlink()`；清除选择时取消下一轮重绘的条件，避免页面空闲时持续占用动画帧。

- [x] **步骤 3：运行像素视觉检查**

在默认视角和旋转后的截图中确认图钉是硬边暖红像素形状，没有渐变、霓虹或发光；未选中时三个正面地点按遮挡规则显示。

### 任务 4：接入选择、遮挡、语言和现有控件

**文件：**
- 修改：`.superpowers/brainstorm/20260826-pixel-globe-3d/content/pixel-globe-3d.html` 的 DOM 引用、`render()`、指针事件、语言和重置函数。

- [x] **步骤 1：添加 DOM 引用和名牌同步函数**

```js
const locationLabel=document.getElementById('globeLocationLabel');
const locationName=document.getElementById('globeLocationName');
const locationButtons=[...document.querySelectorAll('[data-location-id]')];
function selectedLocation(){return LOCATIONS.find(item=>item.id===state.selectedLocationId)||null;}
function syncLocationLabel(){
  const location=selectedLocation();
  locationLabel.hidden=!location;
  locationName.textContent=location?location.name[state.language]:'';
  locationButtons.forEach(button=>{
    const item=LOCATIONS.find(location=>location.id===button.dataset.locationId);
    if(item)button.textContent=item.name[state.language];
    if(item)button.setAttribute('aria-label',`${state.language==='en'?'Select':'选择'}${item.name[state.language]}`);
  });
}
```

将缺失 DOM 引用加入早期返回条件，防止地点层不完整时产生异常。

- [x] **步骤 2：实现选择和清除规则**

```js
function clearLocationSelection(){
  state.selectedLocationId=null;state.hoverLocationId=null;syncLocationLabel();render();
}
function selectLocation(location){
  if(!location)return;
  state.selectedLocationId=location.id;syncLocationLabel();render();ensureBlink();
}
function syncSelectionVisibility(){
  if(!state.selectedLocationId)return;
  const selected=LOCATIONS.find(item=>item.id===state.selectedLocationId);
  if(!selected){state.selectedLocationId=null;state.hoverLocationId=null;syncLocationLabel();}
}
```

在 `render()` 开头调用 `syncSelectionVisibility()`；若选中地点旋转到背面，只让当前图钉因背面筛选而隐藏，保留城市名称，不自动转回正面。重置函数在恢复 yaw/pitch/zoom 后调用 `clearLocationSelection()`。

- [x] **步骤 3：将指针移动阈值接入现有拖动逻辑**

在 `pointerdown` 保存 `startX/startY/moved=false/locationId=hitLocation(event)`；`pointermove` 只有移动距离超过 `6px` 才调用现有 `updateDrag()`。`pointerup` 在单指且未移动时执行 `selectLocation(locationId)` 或 `clearLocationSelection()`，超过阈值则只结束拖动。两指进入 pinch 后清空点击候选，不触发地点选择。

```js
const distance=Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY);
if(distance>6)drag.moved=true;
if(drag.moved&&pointers.size===1)updateDrag(event);
```

悬停提示使用 `hoverLocationId` 更新现有提示文本；触摸设备没有悬停时，轻点路径仍直接调用 `selectLocation()`。

- [x] **步骤 4：绑定键盘入口、空白点击和语言/重置同步**

```js
locationButtons.forEach(button=>button.addEventListener('click',()=>selectLocation(LOCATIONS.find(item=>item.id===button.dataset.locationId))));
canvas.addEventListener('pointerup',event=>{if(!drag.moved&&drag.locationId)selectLocation(drag.locationId);else if(!drag.moved)clearLocationSelection();});
```

将 `syncLocationLabel()` 放入 `setLanguage()`；将 `clearLocationSelection()` 放入 `resetView()`；保留现有缩放按钮和语言按钮行为。若现有 `pointerup` 已绑定，合并为一个结束处理函数，避免同一点击重复触发。

### 任务 5：浏览器回归验收与提交

**文件：**
- 修改：`.superpowers/brainstorm/20260826-pixel-globe-3d/content/pixel-globe-3d.html`
- 测试：本地预览 `http://localhost:61820/`。

- [x] **步骤 1：运行脚本语法和差异检查**

```powershell
$node = 'C:\Users\tant2\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $node -e "const fs=require('fs'); const p='.superpowers/brainstorm/20260826-pixel-globe-3d/content/pixel-globe-3d.html'; const html=fs.readFileSync(p,'utf8'); const start=html.indexOf('<script>')+8; const end=html.indexOf('</script>',start); if(start<8||end<0) throw new Error('script block not found'); new Function(html.slice(start,end)); console.log('JavaScript syntax: PASS');"
git diff --check
```

预期 JavaScript syntax 输出 `PASS`，`git diff --check` 无错误。

- [x] **步骤 2：运行 DOM、语言和控制台检查**

```js
await tab.playwright.locator('#globeCanvas').count();          // 1
await tab.playwright.locator('#globeLocationLabel').count();   // 1
await tab.playwright.locator('#globeLocationNav button').count(); // 3
await tab.playwright.getByRole('button',{name:'中文 · EN'}).click();
await tab.playwright.getByRole('button',{name:'EN · 中文'}).count(); // 1
await tab.dev.logs({levels:['error','warn'],limit:20});       // []
```

- [x] **步骤 3：运行地点行为检查**

默认视角截图确认可见地点使用暖红像素图钉；对可见图钉轻点后，DOM 中名牌只显示对应城市名，截图确认其他图钉隐藏且当前图钉轻微闪烁。点击画布空白处确认名牌消失、三个图钉恢复；旋转选中地点到背面确认当前图钉隐藏但名牌保留；重置确认视角、名牌和图钉恢复默认。

- [x] **步骤 4：运行交互回归检查**

拖动超过 `6px` 后截图应改变朝向，松手等待 `350ms` 后画面稳定；滚轮、双指和 `− / ＋` 继续改变尺寸；点击地点不改变 yaw/pitch/zoom。移动端 `390×844` 视口下，三个按钮、名牌和图钉不横向溢出；键盘聚焦地点按钮并按 Enter 能显示名称。

- [x] **步骤 5：提交实现**

```powershell
git add -- .superpowers/brainstorm/20260826-pixel-globe-3d/content/pixel-globe-3d.html
git commit -m "feat: add globe location markers"
```

只提交实际地球页面，不提交 visual companion 的布局对比草稿或运行状态目录。

## 计划自检

- 规格中的地点数据、真实坐标附近投影、前后遮挡、统一像素图钉、轻微闪烁、单选隐藏、空白恢复、背面隐藏但保留名牌、语言同步、键盘访问和移动端均有对应任务。
- 任务 2 定义的 `LOCATIONS`、`locationVector()`、`worldToView()`、`projectLocation()`、`visibleLocations()` 和 `hitLocation()` 在任务 3、4 中按相同名称使用。
- 任务 4 明确合并现有 `pointerup` 处理，避免重复监听导致一次点击重复选择；两指 pinch 会清除点击候选。
- 计划只修改一个现有页面，不替换 GeoJSON 纹理、球面渲染、自然光照或控制条。
- 计划没有占位内容、未定义文件、未定义函数或模糊的测试命令。
