# 预留后端接口契约

前端只调用同源 `/api/*`（开发时由 `ZHIHENG_API_TARGET` 代理）。所有第三方密钥（数据商、新闻、模型服务）只存在于后端。设置 `VITE_API_ENABLED=true` 才会启用调用。

所有读取接口返回统一信封：

```ts
interface DataEnvelope<T> {
  status: 'live' | 'delayed' | 'sample' | 'missing' | 'stale' | 'unconnected';
  data: T | null;
  source: string;      // 数据来源名称
  asOf?: string;       // 数据本身的时间（价格时间 / 发布时间）
  fetchedAt?: string;  // 平台获取时间
  note?: string;
}
```

| 方法 | 路径 | 请求 | 返回 | 说明 |
|---|---|---|---|---|
| GET | `/api/bonds` | — | `DataEnvelope<BondRecord[]>` | `price.kind` 必须区分 `indicative`（参考价，不可成交）与 `executable`（可成交报价）；超时效价格标 `stale` |
| GET | `/api/news` | — | `DataEnvelope<NewsItem[]>` | 每条必须有 `source`、`publishedAt`、`fetchedAt`、`url`；`facts` 与 `interpretation` 分开 |
| POST | `/api/analysis` | `{ question, context? }` | `{ summary }` | 只返回解读文字。`context` 仅在用户明确授权时附带；不得返回或覆盖计算数字 |
| POST | `/api/consult-intents` | `ConsultIntent` | `{ reference }` | 登记意向，不等于预约；需记录用户授权共享的资料范围 |

类型定义见 `src/data/sampleBonds.ts`（`BondRecord`）、`src/data/news.ts`（`NewsItem`）、`src/api/services.ts`（`ConsultIntent`）。
