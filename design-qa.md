# Infinite Pixels 全屏主页 Design QA

## Source visual truth

- Source screenshot: C:/Users/tant2/AppData/Local/Temp/codex-clipboard-22895eda-5d6a-416f-aa5f-d04076562d81.png
- Source pixels / CSS viewport: 737 × 678 / reference capture (device density not reported)
- Intended state: 初始中文状态、真实地图已加载、无地点名牌、无滚动

## Rendered implementation evidence

- Local URL: http://localhost:4173/
- Browser-rendered screenshot: implementation-fullscreen-1280x720.png
- Implementation pixels / CSS viewport: 1280 × 720 / 1280 × 720
- Device density: browser capture at 1 CSS pixel per screenshot pixel
- Normalization: source and implementation were reviewed together at original resolution; viewport widths differ, so comparison uses proportional placement and responsive rules rather than raw pixel distances.

## Evidence and comparison

The source and implementation screenshots were opened together. Both show the same sparse composition: a dark full-screen field, a large pixel globe aligned to the left/center, the language control in the upper-right corner, and the zoom/reset row plus metadata along the bottom-left axis. The implementation has no visible title, intro, card border, note, or footer.

The implementation's desktop stage is min(60vw, 64vh, 560px) and its narrow-screen rule is min(88vw, 64vh, 560px), which preserves the source's left-weighted composition at the reference aspect ratio while centering the globe on narrow screens. scrollHeight and clientHeight both resolve to 720 in the local desktop capture.

## Required fidelity surfaces

- Fonts / typography: existing Courier-style pixel UI font is retained; button labels, metadata, letter spacing, and compact line-height match the reference's monospaced treatment.
- Spacing / layout rhythm: language toggle is inset approximately 8–10px from the top/right; globe, controls, and metadata share a left-axis center; outer padding, card radius, and section gaps are removed.
- Colors / tokens: background remains #111716; controls use the existing muted green-gray border and cream text palette visible in the reference.
- Image quality / asset fidelity: the existing Canvas globe continues to use the real data/world.geojson texture, 160 × 160 internal pixels, and image-rendering: pixelated; no placeholder or CSS-drawn globe was introduced.
- Copy / content: visible copy is limited to 中文 · EN, −, 重置, ＋, 拖动旋转 · 滚轮缩放 · 双指缩放, and PIXEL SOURCE 128×64. SEO metadata remains in <head> only.

## Focused regions

No separate crop was needed: the reference's only focused UI regions (top-right language toggle and bottom control/meta row) remain legible in the original-resolution paired screenshots, and their alignment is directly measurable from the DOM rectangles.

## Interaction checks

- Map loading: #globeLoading becomes display: none; Canvas remains 160 × 160.
- Locations: guangzhou, indianapolis, and toronto buttons remain present.
- Nameplate: hidden initially; clicking the visible Guangzhou marker reveals 广州; language toggle changes it to Guangzhou; clicking empty globe space clears it.
- Controls: zoom in/out changes the render; reset restores the view; drag and wheel/pinch paths change the render; no automatic rotation or inertia was added.
- Console: dev.logs() returned [].

## Comparison history

### Iteration 1 — fullscreen DOM/CSS

- Earlier finding: old layout exposed title, intro, card border, note, footer, and a fixed-height shell that did not match the supplied screenshot.
- Fix: removed visible chrome and applied the responsive full-viewport layout rules in index.html.
- Post-fix evidence: paired source/local screenshots show only the requested globe, language control, controls, and metadata; local scroll lock and interaction checks pass.

### Public verification

- Public URL: https://tanshan2.github.io/infinite-pixels/
- Browser-rendered screenshot: implementation-public-fullscreen-1280x720.png
- GitHub Actions run #3 for commit f59e08a completed with conclusion success.
- Public DOM reports loading display:none, scrollWidth/scrollHeight 1280/720, no wrap border, the three location IDs, and the expected − / 重置 / ＋ controls.
- Public interaction smoke test passed: nameplate hidden initially, visible Guangzhou marker reveals 广州, language toggle changes it to Guangzhou, and dev.logs() returned [].
- Public robots.txt and sitemap.xml both returned HTTP 200 via the bundled runtime fetch.

## Findings

No actionable P0, P1, or P2 visual findings remain in the local implementation. The different screenshot widths are intentional evidence of responsive behavior, not a layout defect.

## Implementation Checklist

- [x] Full-screen viewport with no page scrolling.
- [x] Only screenshot-approved visible UI remains.
- [x] Real pixel globe and three location interactions preserved.
- [x] Responsive desktop/narrow-screen placement rules verified.
- [x] Local interaction and console checks pass.
- [x] Public GitHub Pages screenshot and SEO endpoints verified.

## Follow-up Polish

None required for this handoff; the default globe orientation remains unchanged intentionally so the map content and existing location behavior are not altered by the visual-only revision.

final result: passed
