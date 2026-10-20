// 把 dist-single/ 的构建产物合并成一个自包含的 HTML 片段（脚本与样式内联），
// 用于在只允许单文件的环境中预览。输出：dist-single/zhiheng.html
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = 'dist-single';
let html = readFileSync(join(dir, 'index.html'), 'utf8');
const asset = (href) => readFileSync(join(dir, href.replace(/^\.\//, '')), 'utf8');

html = html.replace(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g, (_, href) => `<style>${asset(href)}</style>`);
html = html.replace(/<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g, (_, src) =>
  `<script type="module">${asset(src).replace(/<\/script/gi, '<\\/script')}</script>`,
);
// 预览环境自带文档骨架：去掉 doctype/html/head/body 标签，保留其中内容
html = html
  .replace(/<!doctype html>/i, '')
  .replace(/<\/?html[^>]*>/gi, '')
  .replace(/<\/?head>/gi, '')
  .replace(/<\/?body>/gi, '')
  .replace(/<meta charset[^>]*>/i, '')
  .replace(/<meta name="viewport"[^>]*>/i, '<meta name="claude:viewport-fit-sides" content="cover" />');
// 标题放在最前面
const title = html.match(/<title>[\s\S]*?<\/title>/)[0];
html = title + '\n' + html.replace(title, '');
if (/src="\.\/assets|href="\.\/assets/.test(html)) throw new Error('仍有未内联的资源');
writeFileSync(join(dir, 'zhiheng.html'), html.trim() + '\n');
console.log(`zhiheng.html ${(html.length / 1024).toFixed(0)} KB`);
