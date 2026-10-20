import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { findBond, ISSUER_TYPE_LABEL, PRICE_KIND_LABEL } from '../data/sampleBonds';
import { DEMO_NEWS, OFFICIAL_SOURCES } from '../data/news';
import { analyzeBond, settlementFromPriceDate, STRUCTURE_LABEL, stressTest } from '../lib/finance/bond';
import { priceDate, stressCurve } from '../lib/bondView';
import { money, num, pct, signedPct } from '../lib/format';
import { Kind, StatusBadge } from '../components/Badges';
import { NumberField } from '../components/NumberField';
import { CashflowChart, StressChart } from '../components/charts';
import { NotFoundPage } from './NotFoundPage';

const SOVEREIGN_FOCUS = [
  '财政与外汇：财政赤字、外币债务占比、外汇储备可覆盖几个月进口。',
  '外部支持：是否有 IMF 等多边机构计划，计划执行是否顺利。',
  '政治与政策连续性：选举、政府更替对偿债意愿的影响。',
  '违约后的处理：没有破产程序，通常通过重组谈判解决，集体行动条款很关键。',
];
const CORPORATE_FOCUS = [
  '偿债来源：经营现金流、利息覆盖倍数、短期到期债务与现金对比。',
  '债务顺位：高级／次级、有无担保、境外持有人相对境内债权人的位置（结构性次级）。',
  '主权上限：企业评级通常不高于所在国主权评级，主权风险会传导。',
  '条款：赎回、控制权变更、限制性条款（covenants）对持有人的保护程度。',
];

type Tab = 'yield' | 'risk' | 'terms' | 'sources';
const TABS: { id: Tab; label: string }[] = [
  { id: 'yield', label: '能赚多少' },
  { id: 'risk', label: '利率变化的影响' },
  { id: 'terms', label: '条款与信用' },
  { id: 'sources', label: '资料来源' },
];

const RATE_GRID = [-100, 0, 100, 200];
const SPREAD_GRID = [0, 100, 300];

export function BondDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const bond = findBond(id);
  const [priceInput, setPriceInput] = useState<number>(bond?.price.clean ?? NaN);
  const [rateBp, setRateBp] = useState(100);
  const [spreadBp, setSpreadBp] = useState(0);
  const [face, setFace] = useState(200_000);
  const [tab, setTab] = useState<Tab>(location.hash === '#stress' ? 'risk' : 'yield');

  useEffect(() => {
    if (location.hash === '#stress') setTab('risk');
  }, [location.hash]);

  const priceError = !Number.isFinite(priceInput) || priceInput <= 0 || priceInput > 200 ? '请输入 0–200 之间的净价（每 100 面值）' : undefined;
  const rateError = !Number.isFinite(rateBp) || Math.abs(rateBp) > 500 ? '请输入 −500 到 500 之间的基点' : undefined;
  const spreadError = !Number.isFinite(spreadBp) || spreadBp < -300 || spreadBp > 1500 ? '请输入 −300 到 1500 之间的基点' : undefined;
  const faceError = !Number.isFinite(face) || face <= 0 ? '请输入大于 0 的面值' : undefined;

  const a = useMemo(() => {
    if (!bond) return null;
    return analyzeBond(bond.terms, priceError ? bond.price.clean : priceInput, settlementFromPriceDate(priceDate(bond)));
  }, [bond, priceInput, priceError]);

  if (!bond || !a) return <NotFoundPage />;

  const usingOverride = !priceError && priceInput !== bond.price.clean;
  const isSov = bond.issuerType === 'sovereign';
  const related = DEMO_NEWS.filter((n) => n.relatedBondId === bond.id);

  const custom = a.supported && !rateError && !spreadError
    ? stressTest(a.schedule.flows, bond.terms.frequency, a.ytm, a.accrued, [{ rateBp, spreadBp }])[0]
    : null;
  const mv = a.supported && !faceError ? (face * a.dirtyPrice) / 100 : 0;

  const up100 = a.supported ? stressTest(a.schedule.flows, bond.terms.frequency, a.ytm, a.accrued, [{ rateBp: 100, spreadBp: 0 }])[0] : null;

  return (
    <>
      <nav aria-label="面包屑" className="small muted" style={{ marginBottom: 12 }}>
        <Link to="/bonds">美元债</Link> / {bond.name}
      </nav>

      <section className="answer-card" aria-labelledby="bond-title">
        <p className="btn-row" style={{ gap: 8, marginBottom: 8 }}>
          <StatusBadge status="sample" label="虚构示例债券" />
          <span className="small muted">{ISSUER_TYPE_LABEL[bond.issuerType]} · {bond.country} · 价格时间 {bond.price.time}</span>
        </p>
        <h1 id="bond-title" style={{ fontSize: 'clamp(1.35rem, 3vw, 1.8rem)' }}>{bond.name}</h1>
        {a.supported && up100 ? (
          <>
            <p className="answer" style={{ fontSize: 'clamp(1.05rem, 2.2vw, 1.25rem)' }}>
              每年按面值付 <span className="num">{pct(bond.terms.couponRate)}</span> 利息。按示例价格 {num(a.cleanPrice)} 买入并拿到期，每年大约赚{' '}
              <span className="num">{pct(a.ytm)}</span>
              {a.ytwBasis === 'call' && <>；如果 {a.ytwDate} 被提前赎回，约 <span className="num">{pct(a.ytw)}</span></>}。
              {a.cleanPrice < 80 && ' 价格远低于面值，说明市场担心它还不上钱。'}
            </p>
            <div className="highlights">
              <div className="hl"><div className="label">每年利息（票息）</div><div className="value">{pct(bond.terms.couponRate)}</div><div className="note">按面值计算</div></div>
              <div className="hl emph"><div className="label">拿到期每年大约赚</div><div className="value">{pct(a.ytm)}</div><div className="note">{a.ytwBasis === 'call' ? `最坏情况 ${pct(a.ytw)}` : '到期收益率 YTM'}</div></div>
              <div className="hl"><div className="label">利率升 1 个百分点</div><div className="value">{signedPct(up100.pctChange, 1)}</div><div className="note">价格的大致变化</div></div>
            </div>
          </>
        ) : (
          <p className="notice" style={{ marginTop: 12 }}>
            <b>这类债券暂不支持计算。</b>{!a.supported && a.reason} 请看“条款与信用”，或请专家逐条解读。
          </p>
        )}
      </section>

      <div className="tabs bond-tabs" role="tablist" aria-label="债券信息">
        {TABS.filter((t) => a.supported || (t.id !== 'yield' && t.id !== 'risk')).map((t) => (
          <button key={t.id} type="button" role="tab" id={`tab-${t.id}`} aria-controls={`panel-${t.id}`} aria-selected={(a.supported ? tab : tab === 'yield' || tab === 'risk' ? 'terms' : tab) === t.id} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {a.supported && tab === 'yield' && (
        <section role="tabpanel" id="panel-yield" aria-labelledby="tab-yield">
          <div style={{ maxWidth: 320 }}>
            <NumberField label="如果用别的价格买（每 100 面值）" value={priceInput} step={0.1} error={priceError} onChange={setPriceInput} hint={usingOverride ? `示例价格为 ${num(bond.price.clean)}，当前用你的假设` : '改一下价格，看看收益率怎么变'} />
          </div>
          <div className="yield-cards">
            <div><div className="small">票息 Coupon</div><div className="value">{pct(bond.terms.couponRate)}</div><p><Kind kind="fact" />条款约定</p></div>
            <div><div className="small">到期收益率 YTM</div><div className="value">{pct(a.ytm)}</div><p><Kind kind="calc" />拿到期、全部还款</p></div>
            <div>
              <div className="small">赎回收益率 YTC</div>
              {a.yieldsToCall.length ? (
                <div className="value">{a.yieldsToCall.map((c) => (c.yield === null ? '—' : pct(c.yield))).join(' / ')}</div>
              ) : (
                <div className="value na">不适用</div>
              )}
              <p>{a.yieldsToCall.length ? <><Kind kind="calc" />{a.yieldsToCall.map((c) => `${c.date} @${c.price}`).join('；')}</> : '不能提前赎回'}</p>
            </div>
            <div><div className="small">最差收益率 YTW</div><div className="value">{pct(a.ytw)}</div><p><Kind kind="calc" />{a.ytwBasis === 'call' ? `假设 ${a.ytwDate} 被赎回` : '等于到期收益率'}</p></div>
          </div>
          <div className="calm-block"><CashflowChart flows={a.schedule.flows} /></div>
          <p className="small muted" style={{ marginTop: 12 }}>
            结算日 {a.settlement}（价格日 T+2，未计假日）· 应计利息 {num(a.accrued, 4)} · 全价 {num(a.dirtyPrice, 4)} · 日计数 30/360
          </p>
        </section>
      )}

      {a.supported && tab === 'risk' && (
        <section role="tabpanel" id="panel-risk" aria-labelledby="tab-risk">
          <p className="muted">美元债的收益率 ≈ 美国国债利率 + 发行人的信用利差。两项都可以自己设定。</p>
          <div className="grid-3" style={{ alignItems: 'start' }}>
            <NumberField label="美国利率变化" suffix="bp" step={25} value={rateBp} error={rateError} onChange={setRateBp} hint="100 bp = 1 个百分点；负数为下降" />
            <NumberField label="信用利差变化" suffix="bp" step={25} value={spreadBp} error={spreadError} onChange={setSpreadBp} hint="正数表示市场更担心这家发行人" />
            <NumberField label="持有面值（示例）" prefix="USD" step={10000} value={face} error={faceError} onChange={setFace} />
          </div>
          {custom && !faceError ? (
            <div className="answer-card" aria-live="polite" style={{ padding: 20 }}>
              <p style={{ margin: 0, fontSize: '1.05rem' }}>
                价格大约变化 <b className="num">{signedPct(custom.pctChange)}</b>，按 {money(face, 'USD')} 面值约{' '}
                <b className="num">{custom.pctChange >= 0 ? '+' : ''}{money(mv * custom.pctChange, 'USD')}</b>。
              </p>
              <p className="small muted" style={{ margin: '6px 0 0' }}>
                <Kind kind="calc" />收益率合计变化 {(rateBp + spreadBp > 0 ? '+' : '') + (rateBp + spreadBp)} bp，至 {pct(custom.newYield)}；净价约 {num(custom.newCleanPrice)}。
              </p>
            </div>
          ) : (
            <p className="notice error" role="alert">请先修正上方输入。</p>
          )}
          <div className="calm-block">
            <StressChart points={stressCurve(a, bond.terms.frequency)} highlightBp={rateError || spreadError ? undefined : Math.round((rateBp + spreadBp) / 10) * 10} />
          </div>
          <div className="acc-group">
            <details className="acc">
              <summary>情景矩阵：利率和利差同时变化</summary>
              <div className="acc-body">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>利率 \ 利差</th>{SPREAD_GRID.map((sp) => <th key={sp} className="n">{sp > 0 ? '+' : ''}{sp} bp</th>)}</tr>
                    </thead>
                    <tbody>
                      {RATE_GRID.map((r) => {
                        const row = stressTest(a.schedule.flows, bond.terms.frequency, a.ytm, a.accrued, SPREAD_GRID.map((sp) => ({ rateBp: r, spreadBp: sp })));
                        return (
                          <tr key={r}>
                            <th scope="row">{r > 0 ? '+' : ''}{r} bp</th>
                            {row.map((pt) => <td key={pt.spreadShiftBp} className="n">{signedPct(pt.pctChange, 1)}</td>)}
                          </tr>
                        );
                      })}
                    </tbody>
                    <caption>即时冲击；未计入持有期利息；未反映赎回权与违约回收。</caption>
                  </table>
                </div>
              </div>
            </details>
            <details className="acc">
              <summary>久期、凸性与 DV01</summary>
              <div className="acc-body">
                <div className="kpis">
                  <div className="kpi"><div className="label">Macaulay 久期</div><div className="value">{num(a.risk.macaulayDuration)} 年</div><div className="sub">平均多久收回现金</div></div>
                  <div className="kpi"><div className="label">修正久期</div><div className="value">{num(a.risk.modifiedDuration)}</div><div className="sub">收益率变 1%，价格约变的 %</div></div>
                  <div className="kpi"><div className="label">凸性</div><div className="value">{num(a.risk.convexity, 1)}</div><div className="sub">价格曲线的弯曲程度</div></div>
                  <div className="kpi"><div className="label">DV01</div><div className="value">{num(a.risk.dv01, 4)}</div><div className="sub">每 100 面值，变 1bp</div></div>
                </div>
                {bond.terms.structure === 'fixed-callable' && (
                  <p className="small muted" style={{ marginTop: 10 }}>按拿到期的现金流计算；可赎回债券利率下降时上涨空间有限，实际敏感度通常更低。</p>
                )}
              </div>
            </details>
          </div>
        </section>
      )}

      {(tab === 'terms' || (!a.supported && tab !== 'sources')) && (
        <section role="tabpanel" id="panel-terms" aria-labelledby="tab-terms">
          <dl className="dl-grid">
            <div><dt>ISIN</dt><dd className="num">{bond.isin} <span className="small muted">（演示代码）</span></dd></div>
            <div><dt>发行人</dt><dd>{bond.issuer}</dd></div>
            <div><dt>国家／地区</dt><dd>{bond.country}</dd></div>
            <div><dt>币种</dt><dd>{bond.currency}</dd></div>
            <div><dt>评级（{bond.rating.agency}）</dt><dd><span className="num">{bond.rating.value}</span>，展望{bond.rating.outlook} <span className="small muted">{bond.rating.asOf}</span></dd></div>
            <div><dt>到期日</dt><dd className="num">{bond.terms.maturity || '无固定到期日'}</dd></div>
            <div><dt>票息</dt><dd className="num">{pct(bond.terms.couponRate)}，每年 {bond.terms.frequency} 次</dd></div>
            <div><dt>净价</dt><dd><span className="num">{num(bond.price.clean)}</span> <span className="small muted">{PRICE_KIND_LABEL[bond.price.kind]}</span></dd></div>
            <div><dt>结构</dt><dd>{STRUCTURE_LABEL[bond.terms.structure]}</dd></div>
            <div><dt>最低认购面值</dt><dd className="num">{money(bond.minDenomination, 'USD')}</dd></div>
            <div><dt>债务顺位</dt><dd>{bond.seniority}</dd></div>
            <div><dt>担保</dt><dd>{bond.guarantee}</dd></div>
            <div><dt>赎回条款</dt><dd>{bond.callTerms}</dd></div>
            <div><dt>适用法律</dt><dd>{bond.governingLaw}</dd></div>
            {a.supported && (
              <div><dt>比同期美债多出的收益（近似）</dt><dd><span className="num">{num((a.ytm - bond.benchmark.yield) * 10000, 0)} bp</span> <span className="small muted">基准为示例值</span></dd></div>
            )}
          </dl>
          <div className="grid-2 calm-block">
            <div>
              <h3>这只债券要留意什么</h3>
              <ul>{bond.keyPoints.map((pt) => <li key={pt}>{pt}</li>)}</ul>
            </div>
            <div>
              <h3>{isSov ? '看主权债' : '看企业／金融债'}，一般关注这几点</h3>
              <ul>{(isSov ? SOVEREIGN_FOCUS : CORPORATE_FOCUS).map((pt) => <li key={pt}>{pt}</li>)}</ul>
            </div>
          </div>
        </section>
      )}

      {tab === 'sources' && (
        <section role="tabpanel" id="panel-sources" aria-labelledby="tab-sources" className="grid-2">
          <div>
            <h3>相关信息（演示条目）</h3>
            {related.length ? (
              <ul className="plain-list">
                {related.map((n) => (
                  <li key={n.id}>
                    <Link to={`/news#${n.id}`}>{n.title}</Link>
                    <div className="small muted">{n.source} · 发布 {n.publishedAt}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">暂无相关条目。</p>
            )}
            <h3 style={{ marginTop: 16 }}>发行文件</h3>
            <ul className="plain-list">
              {bond.sourceLinks.map((sl) => (
                <li key={sl.label}>{sl.label}：<span className="muted small">{sl.url ? <a href={sl.url} target="_blank" rel="noreferrer noopener">原文</a> : '示例债券无原文'} · {sl.note}</span></li>
              ))}
            </ul>
          </div>
          <div>
            <h3>真实债券应查阅的官方来源</h3>
            <ul className="plain-list">
              {[...OFFICIAL_SOURCES.issuer, ...OFFICIAL_SOURCES.credit].map((os) => (
                <li key={os.url}>
                  <a href={os.url} target="_blank" rel="noreferrer noopener">{os.name}<span className="visually-hidden">（在新窗口打开）</span></a>
                  <div className="small muted">{os.covers}</div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <div className="next-steps">
        <Link className="btn" to={`/analysis?topic=coupon-yield&bond=${bond.id}`}>票息等于收益吗？</Link>
        <Link className="btn secondary" to={`/analysis?topic=rate-impact&bond=${bond.id}`}>利率变化会怎样？</Link>
        <Link className="btn ghost" to="/experts?domain=usd-bond">请专家逐条复核</Link>
      </div>
    </>
  );
}
