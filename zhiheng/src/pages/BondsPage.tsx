import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getBonds } from '../api/services';
import type { DataEnvelope } from '../api/types';
import { ISSUER_TYPE_LABEL, type BondRecord, type IssuerType } from '../data/sampleBonds';
import { analyzeRecord } from '../lib/bondView';
import { pct } from '../lib/format';

type Filter = 'all' | IssuerType;

export function BondsPage() {
  const [env, setEnv] = useState<DataEnvelope<BondRecord[]> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setEnv(null);
    setError(null);
    getBonds()
      .then((r) => alive && setEnv(r))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [attempt]);

  const list = env?.data?.filter((b) => filter === 'all' || b.issuerType === filter) ?? [];

  return (
    <>
      <header className="page-head">
        <h1>美元债</h1>
        <p>点开一只债券，先看“一年大概能赚多少”，再看风险和条款。下面 4 只都是虚构的示例，价格不能用来交易。</p>
      </header>

      <div className="tabs" role="tablist" aria-label="按发行人类型筛选">
        {(['all', 'sovereign', 'corporate', 'financial'] as Filter[]).map((f) => (
          <button key={f} type="button" role="tab" aria-selected={filter === f} onClick={() => setFilter(f)}>
            {f === 'all' ? '全部' : ISSUER_TYPE_LABEL[f]}
          </button>
        ))}
      </div>

      {!env && !error && (
        <p role="status" className="btn-row"><span className="spinner" aria-hidden="true" /> 正在载入债券数据…</p>
      )}
      {error && (
        <div className="notice error" role="alert">
          <p>债券数据载入失败：{error}</p>
          <button type="button" className="btn secondary" onClick={() => setAttempt((n) => n + 1)}>重试</button>
        </div>
      )}
      {env && !env.data && (
        <div className="notice error" role="alert">
          <p>债券数据暂不可用（{env.note ?? '无数据'}）。</p>
          <button type="button" className="btn secondary" onClick={() => setAttempt((n) => n + 1)}>重试</button>
        </div>
      )}
      {env?.data && list.length === 0 && <p className="muted">该类别下暂无债券。</p>}

      {list.length > 0 && (
        <div role="table" aria-label="债券列表">
          <div className="bond-row simple head" role="row">
            <span role="columnheader">债券</span>
            <span role="columnheader">类型</span>
            <span role="columnheader">每年利息</span>
            <span role="columnheader">到期日</span>
            <span role="columnheader">保守估计每年约</span>
          </div>
          {list.map((b) => {
            const a = analyzeRecord(b);
            return (
              <div className="bond-row simple" role="row" key={b.id}>
                <div role="cell">
                  <Link className="name" to={`/bonds/${b.id}`}>{b.name}</Link>
                  <div className="meta">{b.issuer} · 评级 {b.rating.value}（示例）</div>
                </div>
                <span role="cell" className="col">{ISSUER_TYPE_LABEL[b.issuerType]}</span>
                <span role="cell" className="col num">{pct(b.terms.couponRate)}</span>
                <span role="cell" className="col num">{b.terms.maturity || '永续'}</span>
                <span role="cell" className="col keep num" style={{ fontWeight: 600 }}>
                  {a.supported ? pct(a.ytw) : <span className="small muted" style={{ fontWeight: 400 }}>暂不支持计算</span>}
                </span>
              </div>
            );
          })}
        </div>
      )}
      {env && (
        <p className="small muted" style={{ marginTop: 16 }}>
          数据来源：{env.source} · 平台获取时间 {env.fetchedAt?.slice(0, 16).replace('T', ' ')} UTC
        </p>
      )}
    </>
  );
}
