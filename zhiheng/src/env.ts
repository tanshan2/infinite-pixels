// 嵌入模式：打包为单文件网页（如在 claude.ai 预览）时，
// 页面运行在受限框架中，无法打印或触发下载，路由也不写入地址栏。
export const EMBED = import.meta.env.VITE_EMBED === 'true';
