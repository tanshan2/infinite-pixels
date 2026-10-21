// 后端调用入口。前端只调用同源 /api，第三方密钥只存在于后端。
// 未开启（VITE_API_ENABLED !== 'true'）时不发出任何网络请求。

export const API_ENABLED = import.meta.env.VITE_API_ENABLED === 'true';

export class ApiUnavailableError extends Error {
  constructor(message = '服务未接入') {
    super(message);
    this.name = 'ApiUnavailableError';
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit & { timeoutMs?: number }): Promise<T> {
  if (!API_ENABLED) throw new ApiUnavailableError();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init?.timeoutMs ?? 10_000);
  try {
    const res = await fetch(`/api${path}`, {
      ...init,
      signal: controller.signal,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => null) as { error?: unknown } | null;
      throw new Error(typeof payload?.error === 'string' ? payload.error : `服务返回错误（HTTP ${res.status}）`);
    }
    return (await res.json()) as T;
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw new Error('请求超时，请稍后重试');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
