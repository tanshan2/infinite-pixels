import { PageTitle } from '../components/PageTitle';
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
      <PageTitle
        section="信息与新闻"
        title="信息中心"
        desc="按香港政策、利率与宏观、发行人公告、信用事件分类。事实摘要与平台解读分开呈现；单条新闻很少是价格变动的唯一原因。"
        meta={[<span className="tag" key="t">演示状态</span>, '新闻接口未接入', '演示条目仅涉及虚构发行人', '新闻不等于可成交报价']}
      />

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

      {env?.data && (() => {
        const items = env.data.filter((n) => cat === 'all' || n.category === cat).sort((x, y) => (x.publishedAt < y.publishedAt ? 1 : -1));
        return (
          <>
            {items.length === 0 ? (
              <p className="muted">这一类暂时没有条目。新闻接口未接入，我们不会编造新闻，请先看下面的官方来源。</p>
            ) : (
              items.map((n) => <NewsArticle key={n.id} item={n} />)
            )}
            <section className="calm-block" aria-labelledby="official">
              <h2 id="official">官方来源</h2>
              <div className="acc-group plain" style={{ marginTop: 0 }}>
                {shownCats.map((c) => (
                  <details key={c} className="acc" open={cat !== 'all' || undefined}>
                    <summary>{NEWS_CATEGORY_LABEL[c]}<span className="acc-sub">{OFFICIAL_SOURCES[c].length} 个</span></summary>
                    <div className="acc-body">
                      <ul className="plain-list">
                        {OFFICIAL_SOURCES[c].map((os) => (
                          <li key={os.url}>
                            <a href={os.url} target="_blank" rel="noreferrer noopener">{os.name}<span className="visually-hidden">（在新窗口打开）</span></a>
                            <span className="small muted"> · {os.covers}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </details>
                ))}
              </div>
            </section>
          </>
        );
      })()}
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
        <span>{item.source}</span>
        <span>发布 <span className="num">{item.publishedAt}</span></span>
        <span>获取 <span className="num">{item.fetchedAt}</span></span>
        <span>{item.url ? <a href={item.url} target="_blank" rel="noreferrer noopener">原文</a> : '无原文链接'}</span>
      </div>
      <div className="news-cols">
        <div>
          <h4><Kind kind="fact" />事实摘要</h4>
          <ul>{item.facts.map((f) => <li key={f}>{f}</li>)}</ul>
        </div>
        <div>
          <h4><Kind kind="opinion" />平台解读</h4>
          <p style={{ fontSize: '0.92rem' }}>{item.interpretation}</p>
        </div>
      </div>
      <details className="acc" style={{ borderBottom: 0 }}>
        <summary style={{ padding: '10px 0', fontSize: '0.92rem' }}>影响资产与传导路径</summary>
        <div className="acc-body" style={{ padding: '0 0 8px' }}>
          {item.channels.map((ch) => (
            <p key={ch.asset} className="channel"><b>{ch.asset}：</b>{ch.path}</p>
          ))}
          <p className="small muted" style={{ marginTop: 8 }}>{item.caveat}</p>
        </div>
      </details>
      {item.relatedBondId && <Link className="small" to={`/bonds/${item.relatedBondId}`}>查看相关示例债券 →</Link>}
    </article>
  );
}
