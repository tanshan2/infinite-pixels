import { useId, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EXAMPLE_QUESTIONS } from '../lib/intent';

const MAX_LEN = 500;

const START = [
  { to: '/plan', title: '赴港要准备多少钱', text: '填几个数字，算出备用金、换汇金额和还剩多少。', go: '开始规划' },
  { to: '/bonds', title: '看懂一只美元债', text: '利息、实际收益、利率变化的影响，一次讲清楚。', go: '看示例债券' },
  { to: '/experts', title: '找真人聊一聊', text: '先把问题整理好，再交给合适的专业人士。', go: '整理问题' },
];

export function HomePage() {
  const navigate = useNavigate();
  const id = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = q.trim();
    if (text.length < 4) {
      setError('请用一句完整的话描述你的问题。');
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
      <section className="home-hero" aria-labelledby="ask-title">
        <h1 id="ask-title">你想弄清楚什么？</h1>
        <p className="lede">用自己的话说就好。知衡会算给你看，并告诉你这个数是怎么来的。</p>
        <form onSubmit={submit} noValidate>
          <div className="ask-box">
            <label htmlFor={id} className="visually-hidden">你的问题</label>
            <textarea
              id={id}
              ref={inputRef}
              value={q}
              maxLength={MAX_LEN + 50}
              placeholder="例如：我们一家三口明年赴港，需要留多少备用金？"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${id}-err` : undefined}
              onChange={(e) => {
                setQ(e.target.value);
                if (error) setError(null);
              }}
            />
            <div className="ask-foot">
              <span className="small muted">不会发送到外部服务</span>
              <button className="btn" type="submit">帮我算一算</button>
            </div>
          </div>
          {error && <p id={`${id}-err`} className="small" role="alert" style={{ color: 'var(--neg)', marginTop: 8 }}>{error}</p>}
        </form>
        <ul className="chips" aria-label="示例问题">
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

      <section aria-label="从这里开始" className="start-grid">
        {START.map((s) => (
          <Link key={s.to} className="start-card" to={s.to}>
            <h3>{s.title}</h3>
            <p>{s.text}</p>
            <span className="go">{s.go} →</span>
          </Link>
        ))}
      </section>

      <p className="quiet-links">
        <Link to="/news">最近的政策与信息</Link>
        <span>当前为演示版：债券与价格为虚构示例，账户未连接</span>
      </p>
    </>
  );
}
