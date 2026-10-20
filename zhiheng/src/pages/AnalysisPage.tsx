import { useEffect, useId, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { classifyQuestion, TOPIC_LABEL, type Topic } from '../lib/intent';
import { requestAiInterpretation } from '../api/services';
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
  const [loading, setLoading] = useState(Boolean(question));

  useEffect(() => {
    if (!question) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    // 财务参数不随问题发送；只有用户主动授权的接口才会附带上下文
    requestAiInterpretation({ question }).then((r) => {
      if (alive) {
        setAi(r);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, [question]);

  if (loading) {
    return (
      <div className="panel" role="status" aria-live="polite" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <span className="spinner" aria-hidden="true" /> 正在理解问题并调用计算…
      </div>
    );
  }

  return (
    <>
      <nav aria-label="面包屑" className="small muted" style={{ marginBottom: 12 }}>
        <Link to="/">工作台</Link> / 分析结果
      </nav>

      {ai?.status === 'live' && ai.data && (
        <p className="notice info"><b>AI 解读（观点，供参考）：</b>{ai.data.summary}</p>
      )}
      {topic !== 'unknown' && (
        <p className="small muted" style={{ marginBottom: 16 }}>
          {question ? <>按关键词理解为“{TOPIC_LABEL[topic]}”（AI 解读未接入，问题没有发送出去）。</> : null}
          想问的是别的？
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
          <label htmlFor={selectId}>看哪只债券（虚构示例）</label>
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
