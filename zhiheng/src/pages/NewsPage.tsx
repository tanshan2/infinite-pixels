import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getNews } from '../api/services';
import type { DataEnvelope } from '../api/types';
import { NEWS_CATEGORY_LABEL, OFFICIAL_SOURCES, type NewsCategory, type NewsItem } from '../data/news';
import { Kind, StatusBadge } from '../components/Badges';

const CATS: NewsCategory[] = ['hk-policy', 'macro', 'issuer', 'credit'];

export function NewsPage() {
  const location = useLocation();
  const [env, setEnv] = useState<DataEnvelope<NewsItem[]> | null>(null);
  const [cat, setCat] = useState<NewsCategory | 'all'>('all');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setEnv(null);
    getNews().then((r) => alive && setEnv(r));
    return () => {
      alive = false;
    };
  }, [attempt]);

  useEffect(() => {
    if (env && location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }, [env, location.hash]);

  const shownCats = cat === 'all' ? CATS : [cat];

  return (
    <>
      <header className="page-head">
        <p className="eyebrow">信息与新闻中心</p>
        <h1>发生了什么，可能影响什么</h1>
        <p>每条内容标明来源、原始发布时间和平台获取时间；新闻陈述的事实与平台解读分开展示。一条新闻很少是价格变化的唯一原因。</p>
      </header>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="notice">
          <p><b>实时新闻：未接入。</b>本页条目为围绕虚构发行人的演示内容，用于展示版式；香港政策与利率宏观类请直接查阅官方来源。</p>
        </div>
        <div className="notice info">
          <p><b>新闻 ≠ 报价。</b>即使接入实时新闻，也不代表平台提供可成交的债券报价。债券页面的价格均为示例，不能据此交易。</p>
        </div>
      </div>

      <div className="tabs" role="tablist" aria-label="信息分类">
        <button type="button" role="tab" aria-selected={cat === 'all'} onClick={() => setCat('all')}>全部</button>
        {CATS.map((c) => (
          <button key={c} type="button" role="tab" aria-selected={cat === c} onClick={() => setCat(c)}>{NEWS_CATEGORY_LABEL[c]}</button>
        ))}
      </div>

      {!env && <p role="status" className="btn-row"><span className="spinner" aria-hidden="true" /> 正在载入…</p>}
      {env && !env.data && (
        <div className="notice error" role="alert">
          <p>信息暂不可用：{env.note}</p>
          <button type="button" className="btn secondary" onClick={() => setAttempt((n) => n + 1)}>重试</button>
        </div>
      )}

      {env?.data &&
        shownCats.map((c) => {
          const items = env.data!.filter((n) => n.category === c);
          return (
            <section key={c} className="section" aria-labelledby={`cat-${c}`}>
              <h2 id={`cat-${c}`}>{NEWS_CATEGORY_LABEL[c]}</h2>
              {items.length === 0 ? (
                <p className="btn-row">
                  <StatusBadge status="unconnected" label="演示状态：无条目" />
                  <span className="muted small">新闻接口未接入，不展示也不编造该类别的新闻。</span>
                </p>
              ) : (
                items.map((n) => <NewsArticle key={n.id} item={n} />)
              )}
              <details className="pro">
                <summary>官方来源导航（{OFFICIAL_SOURCES[c].length}）</summary>
                <div>
                  <ul className="rule-list">
                    {OFFICIAL_SOURCES[c].map((s) => (
                      <li key={s.url}>
                        <a href={s.url} target="_blank" rel="noreferrer noopener">{s.name}<span className="visually-hidden">（在新窗口打开）</span></a>
                        <span className="small muted"> · {s.covers}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
            </section>
          );
        })}
      {env && (
        <p className="small muted" style={{ marginTop: 20 }}>
          {env.source} · 平台载入时间 {env.fetchedAt?.slice(0, 16).replace('T', ' ')} UTC
        </p>
      )}
    </>
  );
}

function NewsArticle({ item }: { item: NewsItem }) {
  return (
    <article className="news-item" id={item.id} aria-labelledby={`${item.id}-t`}>
      <h3 id={`${item.id}-t`}>
        {item.isDemo && <StatusBadge status="sample" label="演示条目" />} {item.title}
      </h3>
      <div className="news-meta">
        <span>来源：{item.source}</span>
        <span>原始发布：<span className="num">{item.publishedAt}</span></span>
        <span>平台获取：<span className="num">{item.fetchedAt}</span></span>
        <span>{item.url ? <a href={item.url} target="_blank" rel="noreferrer noopener">原文链接</a> : '原文链接：演示条目无原文'}</span>
      </div>
      <div className="news-cols">
        <div>
          <h4><Kind kind="fact" />新闻陈述的事实</h4>
          <ul>{item.facts.map((f) => <li key={f}>{f}</li>)}</ul>
        </div>
        <div>
          <h4><Kind kind="opinion" />平台解读</h4>
          <p style={{ fontSize: '0.92rem' }}>{item.interpretation}</p>
        </div>
      </div>
      <h4 style={{ marginTop: 10 }}>可能的传导路径</h4>
      {item.channels.map((ch) => (
        <p key={ch.asset} className="channel"><b>{ch.asset}：</b>{ch.path}</p>
      ))}
      <p className="small muted" style={{ marginTop: 8 }}>注意：{item.caveat}</p>
      {item.relatedBondId && <Link className="small" to={`/bonds/${item.relatedBondId}`}>查看相关示例债券 →</Link>}
    </article>
  );
}
