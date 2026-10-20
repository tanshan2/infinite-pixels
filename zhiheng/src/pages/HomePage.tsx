import { useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EXAMPLE_QUESTIONS } from '../lib/intent';
import { useAppState } from '../state/AppState';
import { computePlan } from '../lib/finance/planning';
import { SAMPLE_BONDS } from '../data/sampleBonds';
import { DEMO_NEWS } from '../data/news';
import { analyzeRecord } from '../lib/bondView';
import { money, num, pct } from '../lib/format';
import { StatusBadge } from '../components/Badges';

const MAX_LEN = 500;

export function HomePage() {
  const navigate = useNavigate();
  const id = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { plan, planIsSample } = useAppState();
  const r = useMemo(() => computePlan(plan), [plan]);
  const watch = useMemo(() => SAMPLE_BONDS.map((b) => ({ b, a: analyzeRecord(b) })), []);
  const news = useMemo(() => [...DEMO_NEWS].sort((x, y) => (x.publishedAt < y.publishedAt ? 1 : -1)), []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = q.trim();
    if (text.length < 4) {
      setError('请用一句完整的话描述问题。');
      inputRef.current?.focus();
      return;
    }
    if (text.length > MAX_LEN) {
      setError(`问题请控制在 ${MAX_LEN} 字以内。`);
      return;
    }
    setError(null);
    navigate(`/analysis?q=${encodeURIComponent(text)}`);
  };

  return (
    <>
      <section className="ws-ask" aria-labelledby="ask-title">
        <h1 id="ask-title">提出问题</h1>
        <p className="small muted" style={{ margin: 0 }}>描述实际情况，平台调用对应的确定性计算，并列出数据来源、公式与假设。</p>
        <form onSubmit={submit} noValidate>
          <label htmlFor={id} className="visually-hidden">你的问题</label>
          <textarea
            id={id}
            ref={inputRef}
            value={q}
            maxLength={MAX_LEN + 50}
            placeholder="例如：我们一家三口明年 3 月赴港，入职后月薪约 4 万港元，需要留多少备用金？"
            aria-invalid={error ? true : undefined}
            aria-describedby={`${id}-help${error ? ` ${id}-err` : ''}`}
            onChange={(e) => {
              setQ(e.target.value);
              if (error) setError(null);
            }}
          />
          <div className="btn-row" style={{ justifyContent: 'space-between', marginTop: 10 }}>
            <ul className="chips" aria-label="示例问题" style={{ margin: 0 }}>
              {EXAMPLE_QUESTIONS.map((ex) => (
                <li key={ex}>
                  <button type="button" onClick={() => { setQ(ex); setError(null); inputRef.current?.focus(); }}>{ex}</button>
                </li>
              ))}
            </ul>
            <button className="btn" type="submit">开始分析</button>
          </div>
          <p id={`${id}-help`} className="small muted" style={{ margin: '8px 0 0' }}>问题只在本地分流，不会发送到外部服务（AI 解读未接入）。</p>
          {error && <p id={`${id}-err`} className="small" role="alert" style={{ color: 'var(--neg)', margin: '6px 0 0' }}>{error}</p>}
        </form>
      </section>

      <div className="ws-grid">
        <div className="ws-side">
          <section className="ws-panel" aria-labelledby="ws-plan">
            <header>
              <h2 id="ws-plan">香港落地资金</h2>
              <StatusBadge status="sample" label={planIsSample ? '示例家庭' : '你的输入'} />
            </header>
            <div className="ws-body">
              <div className="mini-kpis">
                <div><div className="l">规划期需求</div><div className="v">{money(r.totalNeedHKD)}</div></div>
                <div><div className="l">备用金</div><div className="v">{money(r.reserveHKD)}</div></div>
                <div><div className="l">{r.unallocatedHKD >= 0 ? '未分配' : '缺口'}</div><div className="v">{money(Math.abs(r.unallocatedHKD))}</div></div>
              </div>
              <p className="small muted" style={{ margin: '10px 0 12px' }}>{plan.horizonMonths} 个月 · 港元计 · 未分配不等于可投资金额</p>
              <Link className="btn secondary" to="/plan">打开资金规划</Link>
            </div>
          </section>

          <section className="ws-panel" aria-labelledby="ws-expert">
            <header>
              <h2 id="ws-expert">专家咨询</h2>
              <StatusBadge status="unconnected" label="预约未开放" />
            </header>
            <div className="ws-body">
              <p className="small" style={{ marginTop: 0 }}>家庭财务 · 跨境税务 · 保险 · 美元债与信用。可先生成咨询准备单。</p>
              <Link className="btn secondary" to="/experts">整理咨询问题</Link>
            </div>
          </section>
        </div>

        <div className="ws-side">
          <section className="ws-panel" aria-labelledby="ws-watch">
            <header>
              <h2 id="ws-watch">关注列表</h2>
              <span className="muted">账户未连接 · 虚构示例 · 非报价</span>
            </header>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>债券</th><th className="n hide-sm">净价</th><th className="n">YTW</th><th className="n hide-sm">修正久期</th></tr>
                </thead>
                <tbody>
                  {watch.map(({ b, a }) => (
                    <tr key={b.id}>
                      <td><Link to={`/bonds/${b.id}`}>{b.name}</Link></td>
                      <td className="n hide-sm">{num(b.price.clean)}</td>
                      <td className="n em">
                        {a.supported ? pct(a.ytw) : '—'}
                        {b.price.clean < 80 && <span className="risk-flag">高违约风险</span>}
                      </td>
                      <td className="n hide-sm">{a.supported ? num(a.risk.modifiedDuration) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="ws-panel" aria-labelledby="ws-news">
            <header>
              <h2 id="ws-news">信息更新</h2>
              <Link to="/news">全部 →</Link>
            </header>
            <ul className="ws-news">
              {news.map((n) => (
                <li key={n.id}>
                  <time>{n.publishedAt} · 演示条目</time>
                  <Link to={`/news#${n.id}`}>{n.title}</Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
