# Infinite Pixels 全屏主页 Design QA

## Source visual truth

- Source screenshot: user-provided reference image (737 × 678)
- Source pixels / CSS viewport: 737 × 678 / reference capture (device density not reported)
- Intended state: 初始中文状态、真实地图已加载、无地点名牌、无滚动

## Rendered implementation evidence

- Local URL: http://localhost:4173/
- Browser-rendered screenshot: local implementation capture (1280 × 720)
- Implementation pixels / CSS viewport: 1280 × 720 / 1280 × 720
- Device density: browser capture at 1 CSS pixel per screenshot pixel
- Normalization: source and implementation were reviewed together at original resolution; viewport widths differ, so comparison uses proportional placement and responsive rules rather than raw pixel distances.

## Evidence and comparison

The source and implementation screenshots were opened together. Both show the same sparse composition: a dark full-screen field, a large pixel globe, the language control in the upper-right corner, and the zoom/reset row plus metadata below the globe. The implementation has no visible title, intro, card border, note, or footer. The follow-up user instruction to center the globe supersedes the screenshot's earlier left-weighted placement.

The implementation's desktop stage is min(60vw, 64vh, 560px) and its narrow-screen rule is min(88vw, 64vh, 560px); both use a 50% viewport anchor with a -50% transform. scrollHeight and clientHeight both resolve to 720 in the local desktop capture, and the measured stage center matches the viewport center with 0px error.

The zoom boundary is now tied to the fixed 160 × 160 render canvas: MAX_ZOOM is 1.1, producing a 75.68px sphere radius inside the 80px canvas half-size and leaving a 4.32px internal margin. This keeps the globe circular at the largest supported zoom instead of exposing the square canvas edge.

## Required fidelity surfaces

- Fonts / typography: existing Courier-style pixel UI font is retained; button labels, metadata, letter spacing, and compact line-height match the reference's monospaced treatment.
- Spacing / layout rhythm: language toggle is inset approximately 8–10px from the top/right; globe, controls, and metadata share the viewport center axis; outer padding, card radius, and section gaps are removed.
- Colors / tokens: background remains #111716; controls use the existing muted green-gray border and cream text palette visible in the reference.
- Image quality / asset fidelity: the existing Canvas globe continues to use the real data/world.geojson texture, 160 × 160 internal pixels, and image-rendering: pixelated; no placeholder or CSS-drawn globe was introduced.
- Copy / content: visible copy is limited to 中文 · EN, −, 重置, ＋, 拖动旋转 · 滚轮缩放 · 双指缩放, and PIXEL SOURCE 128×64. SEO metadata remains in <head> only.

## Focused regions

No separate crop was needed: the reference's only focused UI regions (top-right language toggle and bottom control/meta row) remain legible in the original-resolution paired screenshots, and their alignment is directly measurable from the DOM rectangles.

## Interaction checks

- Map loading: #globeLoading becomes display: none; Canvas remains 160 × 160.
- Locations: guangzhou, indianapolis, and toronto buttons remain present.
- Nameplate: hidden initially; clicking the visible Guangzhou marker reveals 广州; language toggle changes it to Guangzhou; clicking empty globe space clears it.
- Controls: zoom in/out changes the render and clamps at the shared 1.1 maximum; reset restores the view; drag and wheel/pinch paths change the render; no automatic rotation or inertia was added.
- Console: dev.logs() returned [].

## Comparison history

### Iteration 1 — fullscreen DOM/CSS

- Earlier finding: old layout exposed title, intro, card border, note, footer, and a fixed-height shell that did not match the supplied screenshot.
- Fix: removed visible chrome and applied the responsive full-viewport layout rules in index.html.
- Post-fix evidence: paired source/local screenshots show only the requested globe, language control, controls, and metadata; local scroll lock and interaction checks pass.

### Public verification

- Public URL: https://tanshan2.github.io/infinite-pixels/
- Browser-rendered screenshot: public implementation capture (1280 × 720)
- GitHub Actions run #5 for commit 0b8cc29 completed with conclusion success.
- Public DOM reports loading display:none, scrollWidth/scrollHeight 1280/720, no wrap border, the three location IDs, and the expected − / 重置 / ＋ controls.
- Public center assertion reports stage center 640px, viewport center 640px, centerDelta 0px, controls center 640px, and metadata center 640px.
- Public interaction smoke test passed: nameplate hidden initially, visible Guangzhou marker reveals 广州, language toggle changes it to Guangzhou, and dev.logs() returned [].
- Public zoom-boundary smoke test passed on run #7: after 20 zoom-in clicks, the 160 × 160 render remained inside the 461 × 461 stage with 10px left/right and 12px top/bottom margins; `touchesStageEdge: false` and scroll stayed locked at 1280 × 720.
- Public robots.txt and sitemap.xml both returned HTTP 200 via the bundled runtime fetch.

### Iteration 2 — centered globe follow-up

- Earlier finding: the first fullscreen implementation intentionally followed the screenshot's left-weighted desktop placement, but the user then requested the globe to be in the exact center.
- Fix: changed the desktop stage, controls, metadata, and conditional nameplate anchors to 50% with centered transforms; narrow-screen behavior remains centered.
- Post-fix evidence: local center assertion passed with 0px error, controls/meta centers equal 640px in a 1280px viewport, and the public page reports the same centered rectangles with no console errors.

### Iteration 3 — safe zoom boundary follow-up

- Earlier finding: repeated zoom-in clicks allowed state.zoom to reach 1.55, which made the rendered sphere radius 106.64px on a 160px canvas; the sphere touched all four canvas edges and appeared as a square crop.
- Fix: added shared MIN_ZOOM/MAX_ZOOM constants, capped MAX_ZOOM at 1.1, and reused one globeRadius() calculation for the render and location projection.
- Post-fix evidence: screenshot pixel scans at default, minimum, and maximum zoom reported no stage-edge contact. The maximum-zoom scan measured a 10px left/right and 12px top/bottom stage margin in the 1280 × 720 capture; scroll stayed locked at 1280 × 720.

## Findings

No actionable P0, P1, or P2 visual findings remain in the local implementation. The different screenshot widths are intentional evidence of responsive behavior, not a layout defect.

## Implementation Checklist

- [x] Full-screen viewport with no page scrolling.
- [x] Only screenshot-approved visible UI remains.
- [x] Real pixel globe and three location interactions preserved.
- [x] Centered desktop/narrow-screen placement rules verified.
- [x] Safe maximum zoom prevents square canvas clipping at default/minimum/maximum states.
- [x] Local interaction and console checks pass.
- [x] Public GitHub Pages screenshot and SEO endpoints verified.

## Follow-up Polish

None required for this handoff; the default globe orientation remains unchanged intentionally so the map content and existing location behavior are not altered by the centered-layout revision.

final result: passed
