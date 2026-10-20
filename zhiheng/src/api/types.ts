// 数据层统一信封：每一份数据都必须带状态、来源和时间，界面据此标注。

export type DataStatus =
  | 'live' // 实时（来自已接入的接口）
  | 'delayed' // 延迟
  | 'sample' // 示例／虚构，用于演示版式与计算
  | 'missing' // 缺失：没有可用数据
  | 'stale' // 过期：超过有效期
  | 'unconnected'; // 服务未接入

export interface DataEnvelope<T> {
  status: DataStatus;
  data: T | null;
  source: string;
  /** 数据本身的时间（如价格时间、发布时间） */
  asOf?: string;
  /** 平台获取时间 */
  fetchedAt?: string;
  note?: string;
}

export const STATUS_LABEL: Record<DataStatus, string> = {
  live: '实时',
  delayed: '延迟',
  sample: '示例数据',
  missing: '数据缺失',
  stale: '已过期',
  unconnected: '未接入',
};
