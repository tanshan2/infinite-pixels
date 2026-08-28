export const MIN_ZOOM = 0.78;
export const MAX_ZOOM = 1.3;
export const MIN_PITCH = -1.25;
export const MAX_PITCH = 1.25;
export const AUTO_RESUME_MS = 2000;

const DEFAULT_VIEW = Object.freeze({
  yaw: 0,
  pitch: -0.14,
  zoom: 1,
});

const COPY = Object.freeze({
  zh: Object.freeze({
    languageToggle: '中文 · 英文',
    dormantHintDesktop: '鼠标双击地球唤醒',
    dormantHintTouch: '双击地球唤醒',
    activeHint: '拖动旋转 · 滚动缩放',
    portalLabel: '全部作品',
    portalPending: '作品空间正在设计中',
    loading: '正在加载真实海岸线…',
    loadError: '地球数据暂时无法加载，请刷新重试',
  }),
  en: Object.freeze({
    languageToggle: '中文 · EN',
    dormantHintDesktop: 'Double-click the globe to wake it',
    dormantHintTouch: 'Double-tap the globe to wake it',
    activeHint: 'Drag to rotate · Scroll to zoom',
    portalLabel: 'ALL WORKS',
    portalPending: 'The works space is being designed',
    loading: 'Loading real coastlines…',
    loadError: 'Globe data is unavailable. Please refresh and try again',
  }),
});

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function finiteOr(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

export function createUiState({ reducedMotion = false } = {}) {
  return {
    active: false,
    reducedMotion: Boolean(reducedMotion),
    autoResumeAt: 0,
    controlsIntent: {},
    language: 'zh',
    ...DEFAULT_VIEW,
  };
}

export function activateGlobe(state) {
  if (state.active) return state;
  return {
    ...state,
    active: true,
    zoom: Math.max(state.zoom, 1.08),
    autoResumeAt: 0,
  };
}

export function pauseAutoRotation(state, now) {
  return {
    ...state,
    autoResumeAt: finiteOr(now, 0) + AUTO_RESUME_MS,
  };
}

export function shouldAutoRotate(state, now) {
  return Boolean(
    state.active
    && !state.reducedMotion
    && finiteOr(now, 0) >= finiteOr(state.autoResumeAt, 0)
  );
}

export function setControlsIntent(state, source, visible) {
  return {
    ...state,
    controlsIntent: {
      ...state.controlsIntent,
      [source]: Boolean(visible),
    },
  };
}

export function controlsVisible(state) {
  return Boolean(state.active && Object.values(state.controlsIntent).some(Boolean));
}

export function copyFor(language = 'zh', coarsePointer = false) {
  const selected = language === 'en' ? COPY.en : COPY.zh;
  return {
    languageToggle: selected.languageToggle,
    dormantHint: coarsePointer ? selected.dormantHintTouch : selected.dormantHintDesktop,
    activeHint: selected.activeHint,
    portalLabel: selected.portalLabel,
    portalPending: selected.portalPending,
    loading: selected.loading,
    loadError: selected.loadError,
  };
}

export function isActivationKey(key) {
  return key === 'Enter' || key === ' ';
}

export function isDoubleTap(previousTime, currentTime, threshold = 320) {
  if (!Number.isFinite(previousTime) || !Number.isFinite(currentTime)) return false;
  const elapsed = currentTime - previousTime;
  return elapsed > 0 && elapsed <= threshold;
}

export function nextLanguage(language) {
  return language === 'en' ? 'zh' : 'en';
}

export function serializeSession(state) {
  return JSON.stringify({
    active: Boolean(state.active),
    language: state.language === 'en' ? 'en' : 'zh',
    yaw: finiteOr(state.yaw, DEFAULT_VIEW.yaw),
    pitch: clamp(finiteOr(state.pitch, DEFAULT_VIEW.pitch), MIN_PITCH, MAX_PITCH),
    zoom: clamp(finiteOr(state.zoom, DEFAULT_VIEW.zoom), MIN_ZOOM, MAX_ZOOM),
  });
}

export function restoreSession(raw) {
  if (typeof raw !== 'string' || raw.length === 0) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      ...createUiState({ reducedMotion: false }),
      active: Boolean(parsed.active),
      language: parsed.language === 'en' ? 'en' : 'zh',
      yaw: finiteOr(parsed.yaw, DEFAULT_VIEW.yaw),
      pitch: clamp(finiteOr(parsed.pitch, DEFAULT_VIEW.pitch), MIN_PITCH, MAX_PITCH),
      zoom: clamp(finiteOr(parsed.zoom, DEFAULT_VIEW.zoom), MIN_ZOOM, MAX_ZOOM),
    };
  } catch {
    return null;
  }
}
