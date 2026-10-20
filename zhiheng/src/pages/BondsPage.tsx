import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getBonds } from '../api/services';
import type { DataEnvelope } from '../api/types';
import { StatusBadge } from '../components/Badges';
import { ISSUER_TYPE_LABEL, PRICE_KIND_LABEL, type BondRecord, type IssuerType } from '../data/sampleBonds';
import { analyzeRecord } from '../lib/bondView';
import { num, pct } from '../lib/format';

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
        <p className="eyebrow">美元债研究与测算</p>
        <h1>先看懂条款，再看收益率</h1>
        <p>
          每只债券都区分票息、到期收益率与最差收益率，并展示现金流、久期、债务顺位与压力测算。
          平台不给综合评分：风险需要逐项理解，而不是被一个数字概括。
        </p>
      </header>

      <div className="notice" style={{ marginBottom: 20 }}>
        <p>
          <b>债券数据未接入。</b>以下 4 只均为<b>虚构示例</b>，名称、代码、评级与价格都不对应真实证券；价格不是报价，不能据此成交。
        </p>
      </div>

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
          <div className="bond-row head" role="row">
            <span role="columnheader">债券</span>
            <span role="columnheader">类型</span>
            <span role="columnheader">评级（示例）</span>
            <span role="columnheader">到期日</span>
            <span role="columnheader">票息</span>
            <span role="columnheader">净价</span>
            <span role="columnheader">最差收益率</span>
          </div>
          {list.map((b) => {
            const a = analyzeRecord(b);
            return (
              <div className="bond-row" role="row" key={b.id}>
                <div role="cell">
                  <Link className="name" to={`/bonds/${b.id}`}>{b.name}</Link>
                  <div className="meta">{b.issuer} · {b.country} · <span className="num">{b.isin}</span></div>
                  <div className="meta"><StatusBadge status="sample" label={PRICE_KIND_LABEL[b.price.kind]} /> {b.price.time}</div>
                </div>
                <span role="cell" className="col">{ISSUER_TYPE_LABEL[b.issuerType]}</span>
                <span role="cell" className="col num">{b.rating.value}</span>
                <span role="cell" className="col num">{b.terms.maturity || '永续'}</span>
                <span role="cell" className="col num">{pct(b.terms.couponRate)}</span>
                <span role="cell" className="col num">{num(b.price.clean)}</span>
                <span role="cell" className="col keep num">
                  {a.supported ? pct(a.ytw) : <span className="small muted" style={{ fontFamily: 'var(--font-sans)' }}>结构暂不支持</span>}
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
