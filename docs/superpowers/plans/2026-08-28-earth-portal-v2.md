# Earth Portal V2 Visual Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-en-subagent-driven-development (recommended) or superpowers-en-executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the visible procedural globe with the approved voxel Earth asset and scale the complete portal courtyard/platform to 0.85 on the homepage.

**Architecture:** Add a transparent `earth-model-v2.png` visual layer inside the existing globe stage. Keep the current Canvas and state machine as the interaction/accessibility compatibility layer, but make the new Earth image the visible model. Keep the existing transparent portal foreground asset and apply a uniform 0.85 scale to its complete button group, including hover and entering states.

**Tech Stack:** Native HTML/CSS/JavaScript, Canvas 2D compatibility layer, transparent PNG assets, Node `node:test`, local HTTP server for visual QA.

## Global Constraints

- Change only the homepage's visible Earth asset and complete portal/platform scale.
- Keep the Earth, labels, language button, portal label, controls, state machine, and responsive breakpoints functional.
- Preserve exact existing text: `全部作品`, `中文 · 英文`, `多伦多`, `广州`, `印第安纳波利斯`, and `鼠标双击地球唤醒`.
- Do not add runtime dependencies or external network assets.
- Save image assets in `assets/` and do not overwrite the existing portal asset.

---

### Task 1: Create and validate the new transparent Earth asset

**Files:**
- Create: `assets/earth-model-v2.png`
- Source: `C:/Users/tant2/.codex/generated_images/01a048b2-c824-79b3-af65-6f3f1529ddd0/exec-8e9e64a9-2678-44b3-b52c-b9c0a7db12bf.png`

**Interfaces:**
- Consumes: the approved full-scene image as the edit target/reference.
- Produces: a transparent PNG containing only the large new voxel Earth, with no labels, platform, UI text, or background.

- [ ] **Step 1: Generate the isolated Earth with built-in Image Gen**

  Use the attached full-scene image as the edit target and request a precise background extraction: preserve the new voxel globe's sphere shape, block detail, teal/olive palette, lighting, and perspective; remove the dark background, labels, UI, and lower portal platform; keep true transparency.

- [ ] **Step 2: Copy the selected generated asset into the worktree**

  Copy the final generated PNG to `assets/earth-model-v2.png` without overwriting any existing asset.

- [ ] **Step 3: Validate the asset**

  Inspect the image visually and verify that it contains only the Earth with transparent pixels outside its silhouette. Verify dimensions and alpha with the bundled Python runtime:

  ```powershell
  & 'C:\Users\tant2\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -c "from PIL import Image; im=Image.open('assets/earth-model-v2.png').convert('RGBA'); print(im.size, im.getchannel('A').getextrema())"
  ```

  Expected: a landscape-friendly or square asset large enough for desktop rendering, alpha extrema containing both `0` and `255`, and no visible text/background.

### Task 2: Make the new Earth model the visible stage layer

**Files:**
- Modify: `index.html`
- Modify: `tests/homepage-structure.test.mjs`

**Interfaces:**
- Consumes: `assets/earth-model-v2.png` and the existing globe stage/state machine.
- Produces: `#earthArtwork` as the visible Earth model; the existing `#globeCanvas` remains the pointer/accessibility compatibility layer but is not visibly painted over the new asset.

- [ ] **Step 1: Add a failing structure assertion**

  Add this assertion to the homepage structure test:

  ```js
  assert.match(body, /id=["']earthArtwork["']/);
  assert.match(body, /assets\/earth-model-v2\.png/);
  ```

- [ ] **Step 2: Run the focused structure test and confirm it fails**

  ```powershell
  & 'C:\Users\tant2\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test tests/homepage-structure.test.mjs
  ```

  Expected: FAIL because the new image node and asset reference do not exist yet.

- [ ] **Step 3: Add the visual Earth node and layer CSS**

  Insert the image before the Canvas in `#globeStage`:

  ```html
  <img id="earthArtwork" class="earth-artwork" src="assets/earth-model-v2.png" alt="" draggable="false">
  ```

  Add CSS that positions it in the center of the stage, keeps it behind labels and the Canvas hit layer, disables its pointer events, and hides the old Canvas paint without removing its event target:

  ```css
  .earth-artwork{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;pointer-events:none;user-select:none;image-rendering:auto}
  .globe3d-canvas{position:relative;z-index:1;opacity:0}
  .globe3d-loading{z-index:2}
  .globe3d-location-nav{z-index:3}
  ```

  Keep the existing stage z-index and location-button behavior unchanged.

- [ ] **Step 4: Run the focused structure test and confirm it passes**

  Run the command from Step 2. Expected: all homepage structure assertions PASS.

### Task 3: Scale the complete portal courtyard/platform group

**Files:**
- Modify: `index.html`
- Modify: `tests/homepage-structure.test.mjs`

**Interfaces:**
- Consumes: existing `#portalGate` button and `assets/portal-foreground.png`.
- Produces: one uniform 0.85 scale for the full foreground portal/platform group in normal, hover/focus, entering, and reduced-motion states.

- [ ] **Step 1: Add a failing style assertion**

  Add an assertion that the base portal style includes the requested scale:

  ```js
  assert.match(html, /\.portal-gate\{[^}]*scale\(\.85\)/);
  ```

- [ ] **Step 2: Run the focused structure test and confirm it fails**

  Run the homepage structure test. Expected: FAIL because the base portal transform does not include `scale(.85)`.

- [ ] **Step 3: Apply the 0.85 scale consistently**

  Update the portal transforms so the image, sign label, trees, courtyard paving, stone rim, flags, lamps, and character remain one scaled group:

  ```css
  .portal-gate{transform:translateX(-50%) scale(.85);transform-origin:50% 100%}
  .portal-gate:hover,.portal-gate:focus-visible{transform:translateX(-50%) translateY(-2px) scale(.85)}
  .portal-gate.is-entering{transform:translateX(-50%) translateY(-3px) scale(.86)}
  ```

  Preserve the current width/bottom positioning and filters; do not separately resize `.portal-artwork` or `.portal-label`.

- [ ] **Step 4: Run the focused structure test and confirm it passes**

  Expected: all homepage structure assertions PASS.

### Task 4: Verify behavior and visual layout

**Files:**
- Modify: `design-qa.md` only if the final visual check changes its status or notes.

- [ ] **Step 1: Run all Node tests and whitespace validation**

  ```powershell
  & 'C:\Users\tant2\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test tests/*.test.mjs
  git diff --check
  ```

  Expected: zero test failures and no whitespace errors.

- [ ] **Step 2: Start the local server**

  ```powershell
  & 'C:\Users\tant2\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -m http.server 4173 --bind 127.0.0.1
  ```

- [ ] **Step 3: Inspect desktop and mobile layouts**

  Confirm the new Earth is visible behind the portal, the entire lower portal/platform group is visibly smaller and centered, the portal label remains aligned, there is no duplicate old globe, and there is no horizontal overflow at desktop and 390×844.

- [ ] **Step 4: Commit the implementation**

  ```powershell
  git add -- assets/earth-model-v2.png index.html tests/homepage-structure.test.mjs design-qa.md
  git commit -m "feat: integrate revised earth portal visual"
  ```

