// 各业务服务的前端适配层。接口契约见 docs/API.md。
// 未接入时返回明确的“示例”或“未接入”状态，绝不伪造实时数据。

import { apiRequest, API_ENABLED, ApiUnavailableError } from './client';
import type { DataEnvelope } from './types';
import { SAMPLE_BONDS, type BondRecord } from '../data/sampleBonds';
import { DEMO_NEWS, type NewsItem } from '../data/news';
import type { PlanInput } from '../lib/finance/planning';

const now = () => new Date().toISOString();

/** 债券参考数据与价格。未接入时返回虚构示例债券。 */
export async function getBonds(): Promise<DataEnvelope<BondRecord[]>> {
  if (API_ENABLED) {
    try {
      return await apiRequest<DataEnvelope<BondRecord[]>>('/bonds');
    } catch (e) {
      return { status: 'missing', data: null, source: '债券数据服务', fetchedAt: now(), note: (e as Error).message };
    }
  }
  return {
    status: 'sample',
    data: SAMPLE_BONDS,
    source: '平台虚构示例（非真实债券、非可成交报价）',
    fetchedAt: now(),
  };
}

export async function getNews(): Promise<DataEnvelope<NewsItem[]>> {
  if (API_ENABLED) {
    try {
      return await apiRequest<DataEnvelope<NewsItem[]>>('/news');
    } catch (e) {
      return { status: 'missing', data: null, source: '新闻服务', fetchedAt: now(), note: (e as Error).message };
    }
  }
  return {
    status: 'sample',
    data: DEMO_NEWS,
    source: '演示条目（围绕虚构发行人，用于展示版式）',
    fetchedAt: now(),
    note: '新闻接口未接入。香港政策与利率宏观类请直接查阅下方官方来源。',
  };
}

export interface AnalysisRequest {
  question: string;
  /** 仅在用户明确授权时才附带的财务参数 */
  context?: Partial<PlanInput>;
}

/** AI 分析：后端只负责理解问题与组织解释；关键数字仍由本地确定性程序计算。 */
export async function requestAiInterpretation(req: AnalysisRequest): Promise<DataEnvelope<{ summary: string }>> {
  try {
    const data = await apiRequest<{ summary: string }>('/analysis', { method: 'POST', body: JSON.stringify(req) });
    return { status: 'live', data, source: 'AI 分析服务', fetchedAt: now() };
  } catch (e) {
    return {
      status: e instanceof ApiUnavailableError ? 'unconnected' : 'missing',
      data: null,
      source: 'AI 分析服务',
      note: e instanceof ApiUnavailableError ? 'AI 分析接口未接入，问题未发送到任何外部服务。' : (e as Error).message,
    };
  }
}

export interface ConsultIntent {
  domain: string;
  question: string;
  languages: string[];
  region: string;
  budget: string;
  acceptCommission: 'no' | 'yes' | 'unsure';
  shareItems: string[];
  contact: string;
}

/** 登记咨询意向。专家预约服务未接入时明确返回失败，不假装预约成功。 */
export async function submitConsultIntent(intent: ConsultIntent): Promise<{ ok: true; reference: string } | { ok: false; reason: string }> {
  try {
    const r = await apiRequest<{ reference: string }>('/consult-intents', { method: 'POST', body: JSON.stringify(intent) });
    return { ok: true, reference: r.reference };
  } catch (e) {
    return {
      ok: false,
      reason: e instanceof ApiUnavailableError ? '专家预约服务尚未接入，意向未发送，也没有完成任何预约。' : (e as Error).message,
    };
  }
}
