import { useEffect, useId, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { classifyQuestion, TOPIC_LABEL, type Topic } from '../lib/intent';
import { requestAiInterpretation } from '../api/services';
import { API_ENABLED } from '../api/client';
import type { DataEnvelope } from '../api/types';
import { ReserveResult } from '../components/results/ReserveResult';
import { CouponYieldResult, RateImpactResult } from '../components/results/BondResults';
import { InsufficientResult } from '../components/results/InsufficientResult';
import { useAppState } from '../state/AppState';
import { findBond, SAMPLE_BONDS } from '../data/sampleBonds';

const TOPICS: Topic[] = ['reserve', 'coupon-yield', 'rate-impact'];
const DEFAULT_BOND: Partial<Record<Topic, string>> = { 'coupon-yield': 'demo-energy-2029', 'rate-impact': 'demo-sov-2034' };

export function AnalysisPage() {
  const [params, setParams] = useSearchParams();
  const question = params.get('q')?.slice(0, 500) ?? undefined;
  const topicParam = params.get('topic') as Topic | null;
  const topic: Topic = topicParam && (TOPICS as string[]).includes(topicParam) ? topicParam : question ? classifyQuestion(question) : 'unknown';
  const bond = findBond(params.get('bond') ?? DEFAULT_BOND[topic]);
  const { plan, planIsSample } = useAppState();
  const selectId = useId();

  const [ai, setAi] = useState<DataEnvelope<{ summary: string }> | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => { setAi(null); }, [question]);
  const askAi = async () => {
    if (!question || loading) return;
    setLoading(true);
    try { setAi(await requestAiInterpretation({ question })); }
    finally { setLoading(false); }
  };

  return (
    <>
      <nav aria-label="面包屑" className="small muted" style={{ marginBottom: 12 }}>
        <Link to="/">工作台</Link> / 分析结果
      </nav>

      {question && API_ENABLED && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <p>可选 AI 概念解读：点击后仅将这段问题发送给外部 AI 服务（Anthropic），不发送规划参数。请勿在问题中填写证件、账户或联系方式。关键数字仍由本地计算。</p>
          <button className="btn" onClick={askAi} disabled={loading}>{loading ? '正在生成解读…' : '同意发送问题并获取 AI 解读'}</button>
          {ai && ai.status !== 'live' && <p role="status">{ai.note}</p>}
        </div>
      )}
      {ai?.status === 'live' && ai.data && (
        <p className="notice info"><b>AI 解读（观点，供参考）：</b>{ai.data.summary}</p>
      )}
      {topic !== 'unknown' && (
        <p className="small muted" style={{ marginBottom: 16 }}>
          {question ? <>已按规则归类为“{TOPIC_LABEL[topic]}”（规则分流；外部 AI 解读需单独确认）。</> : null}
          切换分析模板：
          {TOPICS.filter((t) => t !== topic).map((t) => (
            <button
              key={t}
              type="button"
              className="btn ghost"
              style={{ minHeight: 0, margin: '0 6px', fontSize: 'inherit' }}
              onClick={() => {
                const next = new URLSearchParams(params);
                next.set('topic', t);
                next.delete('bond');
                setParams(next);
              }}
            >
              {TOPIC_LABEL[t]}
            </button>
          ))}
        </p>
      )}

      {(topic === 'coupon-yield' || topic === 'rate-impact') && (
        <div className="field" style={{ maxWidth: 460 }}>
          <label htmlFor={selectId}>分析对象（虚构示例债券）</label>
          <select
            id={selectId}
            value={bond?.id ?? ''}
            onChange={(e) => {
              const next = new URLSearchParams(params);
              next.set('topic', topic);
              next.set('bond', e.target.value);
              setParams(next);
            }}
          >
            {SAMPLE_BONDS.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      )}

      {topic === 'reserve' && <ReserveResult plan={plan} isSample={planIsSample} question={question} />}
      {topic === 'coupon-yield' && (bond ? <CouponYieldResult bond={bond} question={question} /> : <InsufficientResult question={question} reason="找不到指定的债券。" />)}
      {topic === 'rate-impact' && (bond ? <RateImpactResult bond={bond} question={question} /> : <InsufficientResult question={question} reason="找不到指定的债券。" />)}
      {topic === 'unknown' && <InsufficientResult question={question} />}
    </>
  );
}
