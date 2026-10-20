import { useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EXAMPLE_QUESTIONS } from '../lib/intent';
import { useAppState } from '../state/AppState';
import { computePlan } from '../lib/finance/planning';
import { money } from '../lib/format';
import { StatusBadge } from '../components/Badges';
import { SAMPLE_BONDS } from '../data/sampleBonds';
import { analyzeRecord } from '../lib/bondView';
import { pct } from '../lib/format';

const MAX_LEN = 500;

export function HomePage() {
  const navigate = useNavigate();
  const id = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { plan, planIsSample } = useAppState();
  const planResult = useMemo(() => computePlan(plan), [plan]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = q.trim();
    if (text.length < 4) {
      setError('请用一句完整的话描述你的问题（至少 4 个字）。');
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
      <section className="ask" aria-labelledby="ask-title">
        <p className="eyebrow" style={{ color: '#c9b37a' }}>个人工作台</p>
        <h1 id="ask-title">你想弄清楚什么？</h1>
        <p>用自己的话描述真实情况，例如家庭人数、打算何时赴港、手上有哪些资金或债券。知衡会调用对应的计算，并把依据和假设一并列出。</p>
        <form onSubmit={submit} noValidate>
          <label htmlFor={id} className="visually-hidden">你的问题</label>
          <textarea
            id={id}
            ref={inputRef}
            value={q}
            maxLength={MAX_LEN + 50}
            placeholder="例如：我们一家三口明年 3 月赴港，丈夫入职后月薪约 4 万港元，需要留多少备用金？"
            aria-invalid={error ? true : undefined}
            aria-describedby={`${id}-help${error ? ` ${id}-err` : ''}`}
            onChange={(e) => {
              setQ(e.target.value);
              if (error) setError(null);
            }}
          />
          <div className="btn-row" style={{ justifyContent: 'space-between', marginTop: 10 }}>
            <span id={`${id}-help`} className="small" style={{ color: '#b8c8c0' }}>
              {q.length}/{MAX_LEN} 字 · 问题不会发送到外部服务（AI 解读未接入）
            </span>
            <button className="btn" type="submit">开始分析</button>
          </div>
          {error && <p id={`${id}-err`} className="error small" role="alert" style={{ marginTop: 8 }}>{error}</p>}
        </form>
        <p className="small" style={{ margin: '18px 0 0', color: '#b8c8c0' }}>可以从这些问题开始：</p>
        <ul className="examples">
          {EXAMPLE_QUESTIONS.map((ex) => (
            <li key={ex}>
              <button
                type="button"
                onClick={() => {
                  setQ(ex);
                  setError(null);
                  inputRef.current?.focus();
                }}
              >
                {ex}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="section" aria-labelledby="how">
        <h2 id="how">知衡如何回答一个问题</h2>
        <ol className="flow">
          <li><strong>理解问题</strong>识别你要解决的是资金规划、收益还是利率风险</li>
          <li><strong>获取资料</strong>调用债券条款、价格与官方信息；缺什么会直接说明</li>
          <li><strong>确定性计算</strong>关键数字由公开公式的程序计算，可复核</li>
          <li><strong>按需真人复核</strong>把问题和计算整理成准备单，交给相关领域专家</li>
        </ol>
      </section>

      <section className="section" aria-labelledby="entries">
        <h2 id="entries">工具</h2>
        <div className="grid-2">
          <Link className="entry" to="/plan">
            <h3>香港落地资金规划</h3>
            <p>输入资金、收入、支出和搬迁成本，计算收支缺口、备用金和各币种所需金额。</p>
            <span className="go">打开规划 →</span>
          </Link>
          <Link className="entry" to="/bonds">
            <h3>美元债研究与测算</h3>
            <p>区分票息、到期收益率与最差收益率，查看现金流、久期、条款和压力测算。</p>
            <span className="go">查看债券 →</span>
          </Link>
          <Link className="entry" to="/news">
            <h3>信息与新闻中心</h3>
            <p>香港政策、利率宏观、发行人公告与信用事件；事实与平台解读分开呈现。</p>
            <span className="go">查看信息 →</span>
          </Link>
          <Link className="entry" to="/experts">
            <h3>真人一对一</h3>
            <p>按家庭财务、跨境税务、保险、美元债分流；先生成咨询准备单。</p>
            <span className="go">整理咨询问题 →</span>
          </Link>
        </div>
      </section>

      <section className="section" aria-labelledby="mine">
        <h2 id="mine">我的概览</h2>
        <div className="grid-2">
          <div className="panel">
            <div className="btn-row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
              <h3 style={{ margin: 0 }}>落地资金</h3>
              <StatusBadge status="sample" label={planIsSample ? '示例家庭参数' : '你输入的参数（仅本页内存）'} />
            </div>
            <dl className="dl-grid">
              <div><dt>规划期总需求</dt><dd className="num">{money(planResult.totalNeedHKD)}</dd></div>
              <div><dt>其中备用金</dt><dd className="num">{money(planResult.reserveHKD)}</dd></div>
              <div><dt>{planResult.unallocatedHKD >= 0 ? '未分配资金' : '资金缺口'}</dt><dd className="num">{money(planResult.unallocatedHKD)}</dd></div>
            </dl>
            <p className="small muted" style={{ marginTop: 10 }}>未分配资金只表示尚未指定用途，不等于适合投资的金额。</p>
            <Link className="btn secondary" to="/plan">{planIsSample ? '换成我的数字' : '修改参数'}</Link>
          </div>
          <div className="panel">
            <div className="btn-row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
              <h3 style={{ margin: 0 }}>关注的债券</h3>
              <StatusBadge status="unconnected" label="账户未连接" />
            </div>
            <p className="small muted">尚未连接证券账户，以下为虚构示例债券，价格不是报价。</p>
            <ul className="rule-list">
              {SAMPLE_BONDS.slice(0, 3).map((b) => {
                const a = analyzeRecord(b);
                return (
                  <li key={b.id} className="btn-row" style={{ justifyContent: 'space-between' }}>
                    <Link to={`/bonds/${b.id}`}>{b.name}</Link>
                    <span className="num small">{a.supported ? `最差收益率 ${pct(a.ytw)}` : '暂不支持计算'}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
