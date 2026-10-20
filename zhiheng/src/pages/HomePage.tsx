import { useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EXAMPLE_QUESTIONS } from '../lib/intent';
import { useAppState } from '../state/AppState';
import { ANNUAL_FX_QUOTA_USD, computePlan } from '../lib/finance/planning';
import { SAMPLE_BONDS } from '../data/sampleBonds';
import { DEMO_NEWS, NEWS_CATEGORY_LABEL } from '../data/news';
import { analyzeRecord } from '../lib/bondView';
import { money, num, pct } from '../lib/format';
import { Icon } from '../components/Icon';

const MAX_LEN = 500;

const PRINCIPLES = [
  { icon: 'calc' as const, title: '确定性计算', text: '关键数字由公开公式计算，可复核' },
  { icon: 'source' as const, title: '来源可追溯', text: '每个结论都列出数据、时间与假设' },
  { icon: 'people' as const, title: '真人复核', text: '需要时整理成准备单，交给持牌专家' },
];

export function HomePage() {
  const navigate = useNavigate();
  const id = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { plan, planIsSample } = useAppState();
  const r = useMemo(() => computePlan(plan), [plan]);
  const watch = useMemo(() => SAMPLE_BONDS.map((b) => ({ b, a: analyzeRecord(b) })), []);
  const maxDur = Math.max(...watch.map(({ a }) => (a.supported ? a.risk.modifiedDuration : 0)), 1);
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
    <div className="home">
      <section className="hero" aria-labelledby="ask-title">
        <div className="hero-main">
          <p className="hero-eyebrow">知衡 · 家庭财务工作台</p>
          <h1 id="ask-title">今天想弄清楚什么？</h1>
          <p className="hero-lede">描述你的实际情况。知衡调用对应的计算，给出能核对的答案。</p>
          <form onSubmit={submit} noValidate className="hero-form">
            <div className="ask-field">
              <Icon name="spark" size={20} className="ask-icon" />
              <label htmlFor={id} className="visually-hidden">你的问题</label>
              <textarea
                id={id}
                ref={inputRef}
                rows={2}
                value={q}
                maxLength={MAX_LEN + 50}
                placeholder="例如：我们一家三口明年 3 月赴港，入职后月薪约 4 万港元，需要留多少备用金？"
                aria-invalid={error ? true : undefined}
                aria-describedby={`${id}-help${error ? ` ${id}-err` : ''}`}
                onChange={(e) => {
                  setQ(e.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e);
                }}
              />
              <button className="btn gold" type="submit">开始分析<Icon name="arrow" size={16} /></button>
            </div>
            {error && <p id={`${id}-err`} className="hero-error" role="alert">{error}</p>}
            <p id={`${id}-help`} className="hero-help"><Icon name="lock" size={13} />问题只在本地分流，不会发送到外部服务</p>
          </form>
          <ul className="hero-chips" aria-label="示例问题">
            {EXAMPLE_QUESTIONS.map((ex) => (
              <li key={ex}>
                <button type="button" onClick={() => { setQ(ex); setError(null); inputRef.current?.focus(); }}>{ex}</button>
              </li>
            ))}
          </ul>
        </div>
        <ul className="hero-principles" aria-label="平台原则">
          {PRINCIPLES.map((p) => (
            <li key={p.title}>
              <span className="pr-icon"><Icon name={p.icon} size={18} /></span>
              <span><b>{p.title}</b>{p.text}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="overview" className="block">
        <div className="block-head">
          <h2 id="overview">资金概览</h2>
          <span className="badge sample">◆ {planIsSample ? '示例家庭' : '你的输入'}</span>
          <Link to="/plan" className="block-link">打开规划 <Icon name="arrow" size={14} /></Link>
        </div>
        <div className="metric-row">
          <article className="metric">
            <p className="m-label"><Icon name="wallet" size={15} />规划期资金需求</p>
            <p className="m-value">{money(r.totalNeedHKD)}</p>
            <p className="m-sub">{plan.horizonMonths} 个月 · 含汇率缓冲</p>
          </article>
          <article className="metric">
            <p className="m-label"><Icon name="shield" size={15} />备用金</p>
            <p className="m-value">{money(r.reserveHKD)}</p>
            <p className="m-sub">{plan.reserveMonths} 个月家庭支出</p>
          </article>
          <article className="metric accent">
            <p className="m-label"><Icon name="calc" size={15} />{r.unallocatedHKD >= 0 ? '未分配资金' : '资金缺口'}</p>
            <p className="m-value">{money(Math.abs(r.unallocatedHKD))}</p>
            <p className="m-sub">尚未指定用途，不等于可投资金额</p>
          </article>
          <article className="metric">
            <p className="m-label"><Icon name="exchange" size={15} />人民币换汇需求</p>
            <p className="m-value">{money(r.cnyConvertedUSD, 'USD')}</p>
            <p className={`m-sub${r.cnyConvertedUSD > ANNUAL_FX_QUOTA_USD ? ' warn' : ''}`}>
              {r.cnyConvertedUSD > ANNUAL_FX_QUOTA_USD ? '▲ 超过单人年度购汇额度' : '在单人年度额度内'}
            </p>
          </article>
        </div>
      </section>

      <div className="home-grid">
        <section className="card" aria-labelledby="ws-watch">
          <div className="card-head">
            <h2 id="ws-watch">关注列表</h2>
            <span className="muted small">账户未连接 · 虚构示例 · 非报价</span>
          </div>
          <div className="table-wrap flush">
            <table className="data-table">
              <thead>
                <tr><th>债券</th><th className="n hide-sm">净价</th><th className="n">YTW</th><th className="hide-sm">利率敏感度（修正久期）</th></tr>
              </thead>
              <tbody>
                {watch.map(({ b, a }) => (
                  <tr key={b.id}>
                    <td>
                      <Link to={`/bonds/${b.id}`}>{b.name}</Link>
                      <span className="sub">{b.rating.value}（示例） · {b.terms.maturity || '永续'}</span>
                    </td>
                    <td className="n hide-sm">{num(b.price.clean)}</td>
                    <td className="n em">
                      {a.supported ? pct(a.ytw) : '—'}
                      {b.price.clean < 80 && <span className="risk-flag">高违约风险</span>}
                    </td>
                    <td className="hide-sm">
                      {a.supported ? (
                        <span className="dur">
                          <span className="dur-bar"><span style={{ width: `${(a.risk.modifiedDuration / maxDur) * 100}%` }} /></span>
                          <span className="num">{num(a.risk.modifiedDuration)}</span>
                        </span>
                      ) : <span className="sub">结构暂不支持</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card" aria-labelledby="ws-news">
          <div className="card-head">
            <h2 id="ws-news">信息更新</h2>
            <Link to="/news" className="block-link">全部 <Icon name="arrow" size={14} /></Link>
          </div>
          <ol className="timeline">
            {news.map((n) => (
              <li key={n.id}>
                <span className={`tl-dot ${n.category}`} aria-hidden="true" />
                <p className="tl-meta"><span>{NEWS_CATEGORY_LABEL[n.category]}</span><time>{n.publishedAt}</time></p>
                <Link to={`/news#${n.id}`}>{n.title}</Link>
              </li>
            ))}
          </ol>
          <p className="card-foot muted small">演示条目，仅涉及虚构发行人；实时新闻接口未接入。</p>
        </section>
      </div>

      <section className="cta-band" aria-labelledby="ws-expert">
        <span className="cta-icon"><Icon name="users" size={22} /></span>
        <div>
          <h2 id="ws-expert">需要真人复核？</h2>
          <p>家庭财务、跨境税务、保险、美元债与信用分析。先把问题和计算整理成准备单，再交给持牌专家。</p>
        </div>
        <Link className="btn secondary" to="/experts">整理咨询问题</Link>
      </section>
    </div>
  );
}
