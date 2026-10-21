import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 相对路径部署：dist/ 可放在任意子目录下打开。
// 开发时 /api 代理到本地后端（若存在）；密钥只放在后端，前端不持有。
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    proxy: process.env.ZHIHENG_API_TARGET
      ? { '/api': { target: process.env.ZHIHENG_API_TARGET, changeOrigin: true } }
      : undefined,
  },
});
