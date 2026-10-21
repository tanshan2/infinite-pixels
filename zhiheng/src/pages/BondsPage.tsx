import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getBonds } from '../api/services';
import type { DataEnvelope } from '../api/types';
import { ISSUER_TYPE_LABEL, type BondRecord, type IssuerType } from '../data/sampleBonds';
import { analyzeRecord } from '../lib/bondView';
import { num, pct } from '../lib/format';
import { DATA_AS_OF, PageTitle, SAMPLE_TAG } from '../components/PageTitle';

import { PublicBondPanel } from '../components/PublicBondPanel';

export function BondsPage(){
 const [mode,setMode]=useState<'public'|'sample'>('public');
 return <><div className="tabs" role="tablist" aria-label="资料类型"><button role="tab" aria-selected={mode==='public'} onClick={()=>setMode('public')}>真实公开资料</button><button role="tab" aria-selected={mode==='sample'} onClick={()=>setMode('sample')}>虚构教学示例</button></div>{mode==='public'?<PublicBondPanel/>:<SampleBondsPage/>}</>;
}

type Filter = 'all' | IssuerType;
type SortKey = 'name' | 'coupon' | 'maturity' | 'price' | 'ytm' | 'ytw' | 'duration';

interface Row {
  bond: BondRecord;
  ytm: number | null;
  ytw: number | null;
  duration: number | null;
}

const COLS: { key: SortKey; label: string; numeric: boolean; hideSm?: boolean }[] = [
  { key: 'name', label: '债券', numeric: false },
  { key: 'coupon', label: '票息', numeric: true, hideSm: true },
  { key: 'maturity', label: '到期日', numeric: true, hideSm: true },
  { key: 'price', label: '净价', numeric: true, hideSm: true },
  { key: 'ytm', label: 'YTM', numeric: true, hideSm: true },
  { key: 'ytw', label: 'YTW', numeric: true },
  { key: 'duration', label: '修正久期', numeric: true, hideSm: true },
];

function sortValue(r: Row, k: SortKey): number | string {
  switch (k) {
    case 'name': return r.bond.name;
    case 'coupon': return r.bond.terms.couponRate;
    case 'maturity': return r.bond.terms.maturity || '9999';
    case 'price': return r.bond.price.clean;
    case 'ytm': return r.ytm ?? Infinity;
    case 'ytw': return r.ytw ?? Infinity;
    case 'duration': return r.duration ?? Infinity;
  }
}

function SampleBondsPage() {
  const [env, setEnv] = useState<DataEnvelope<BondRecord[]> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'maturity', dir: 1 });
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

  const rows = useMemo<Row[]>(() => {
    const list = env?.data?.filter((b) => filter === 'all' || b.issuerType === filter) ?? [];
    const out = list.map((bond) => {
      const a = analyzeRecord(bond);
      return a.supported
        ? { bond, ytm: a.ytm, ytw: a.ytw, duration: a.risk.modifiedDuration }
        : { bond, ytm: null, ytw: null, duration: null };
    });
    return out.sort((x, y) => {
      const a = sortValue(x, sort.key);
      const b = sortValue(y, sort.key);
      // 无法计算的始终排在最后
      if (a === Infinity && b !== Infinity) return 1;
      if (b === Infinity && a !== Infinity) return -1;
      return (a < b ? -1 : a > b ? 1 : 0) * sort.dir;
    });
  }, [env, filter, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === 'name' || key === 'maturity' ? 1 : -1 }));

  return (
    <>
      <PageTitle
        section="美元债研究"
        title="美元债列表"
        desc="区分票息、到期收益率（YTM）与最差收益率（YTW）。点击债券查看现金流、利率敏感度、条款与信用分析。平台不提供综合评分。"
        meta={[SAMPLE_TAG, '4 只虚构债券，非真实证券', '价格为示例，非可成交报价', DATA_AS_OF, '收益率按半年复利 · 结算 T+2 · 30/360']}
      />

      <div className="tabs" role="tablist" aria-label="按发行人类型筛选">
        {(['all', 'sovereign', 'corporate', 'financial'] as Filter[]).map((f) => (
          <button key={f} type="button" role="tab" aria-selected={filter === f} onClick={() => setFilter(f)}>
            {f === 'all' ? '全部' : ISSUER_TYPE_LABEL[f]}
          </button>
        ))}
      </div>

      {!env && !error && <p role="status" className="btn-row"><span className="spinner" aria-hidden="true" /> 正在载入债券数据…</p>}
      {(error || (env && !env.data)) && (
        <div className="notice error" role="alert">
          <p>债券数据暂不可用：{error ?? env?.note ?? '无数据'}</p>
          <button type="button" className="btn secondary" onClick={() => setAttempt((n) => n + 1)}>重试</button>
        </div>
      )}
      {env?.data && rows.length === 0 && <p className="muted">该类别下暂无债券。</p>}

      {rows.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {COLS.map((c) => (
                  <th
                    key={c.key}
                    className={`${c.numeric ? 'n' : ''}${c.hideSm ? ' hide-sm' : ''}`}
                    aria-sort={sort.key === c.key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}
                  >
                    <button type="button" onClick={() => toggleSort(c.key)}>{c.label}</button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ bond: b, ytm, ytw, duration }) => (
                <tr key={b.id}>
                  <td>
                    <Link to={`/bonds/${b.id}`}>{b.name}</Link>
                    <span className="sub">{ISSUER_TYPE_LABEL[b.issuerType]} · {b.country} · 评级 {b.rating.value}（示例）</span>
                  </td>
                  <td className="n hide-sm">{pct(b.terms.couponRate)}</td>
                  <td className="n hide-sm">{b.terms.maturity || '永续'}</td>
                  <td className="n hide-sm">{num(b.price.clean)}</td>
                  <td className="n hide-sm">{ytm === null ? '—' : pct(ytm)}</td>
                  <td className="n em">
                    {ytw === null ? <span className="sub">暂不支持</span> : pct(ytw)}
                    {b.price.clean < 80 && <span className="risk-flag">深度折价 · 高违约风险</span>}
                  </td>
                  <td className="n hide-sm">{duration === null ? '—' : num(duration)}</td>
                </tr>
              ))}
            </tbody>
            <caption>收益率越高通常意味着风险越高，不代表更好的选择。“—”表示该结构（如永续 AT1）暂不支持计算。点击表头排序。</caption>
          </table>
        </div>
      )}
      {env && (
        <p className="small muted" style={{ marginTop: 12 }}>
          来源：{env.source} · 平台获取 {env.fetchedAt?.slice(0, 16).replace('T', ' ')} UTC
        </p>
      )}
    </>
  );
}
