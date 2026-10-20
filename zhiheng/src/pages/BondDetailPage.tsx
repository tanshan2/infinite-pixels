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

  useEffect(() => {
    if (location.hash === '#stress') document.getElementById('stress')?.scrollIntoView();
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

  return (
    <>
      <nav aria-label="面包屑" className="small muted" style={{ marginBottom: 12 }}>
        <Link to="/bonds">美元债</Link> / {bond.name}
      </nav>
      <header className="page-head" style={{ maxWidth: 'none' }}>
        <p className="btn-row" style={{ gap: 8 }}>
          <StatusBadge status="sample" label="虚构示例债券" />
          <span className="badge unconnected">{ISSUER_TYPE_LABEL[bond.issuerType]}</span>
        </p>
        <h1>{bond.name}</h1>
        <p className="muted">{bond.issuer} · {bond.country}</p>
      </header>

      <dl className="dl-grid">
        <div><dt>ISIN</dt><dd className="num">{bond.isin} <span className="small muted">（演示代码，非真实）</span></dd></div>
        <div><dt>发行人</dt><dd>{bond.issuer}</dd></div>
        <div><dt>国家／地区</dt><dd>{bond.country}</dd></div>
        <div><dt>币种</dt><dd>{bond.currency}</dd></div>
        <div><dt>评级（{bond.rating.agency}）</dt><dd><span className="num">{bond.rating.value}</span>，展望{bond.rating.outlook} <span className="small muted">{bond.rating.asOf}</span></dd></div>
        <div><dt>到期日</dt><dd className="num">{bond.terms.maturity || '无固定到期日'}</dd></div>
        <div><dt>票息</dt><dd className="num">{pct(bond.terms.couponRate)}</dd></div>
        <div><dt>付息频率</dt><dd>每年 {bond.terms.frequency} 次</dd></div>
        <div><dt>净价</dt><dd><span className="num">{num(bond.price.clean)}</span> <StatusBadge status="sample" label={PRICE_KIND_LABEL[bond.price.kind]} /></dd></div>
        <div><dt>价格时间</dt><dd className="num">{bond.price.time}</dd></div>
        <div><dt>结构</dt><dd>{STRUCTURE_LABEL[bond.terms.structure]}</dd></div>
        <div><dt>最低认购面值</dt><dd className="num">{money(bond.minDenomination, 'USD')}</dd></div>
      </dl>

      <section className="section" aria-labelledby="yields">
        <h2 id="yields">收益率：四个不同的数字</h2>
        {!a.supported ? (
          <div className="notice">
            <p><b>暂不支持计算。</b>{a.reason}</p>
            <p className="small">因此本页不显示到期收益率、久期与压力测算。{bond.firstResetDate && `首个票息重置日：${bond.firstResetDate}。`}</p>
          </div>
        ) : (
          <>
            <div className="field" style={{ maxWidth: 320 }}>
              <NumberField label="假设净价（每 100 面值，非报价）" value={priceInput} step={0.1} error={priceError} onChange={setPriceInput} hint={usingOverride ? `示例价格为 ${num(bond.price.clean)}，当前使用你的假设` : '可修改以查看不同买入价下的收益率'} />
            </div>
            <div className="yield-cards">
              <div><div className="small">票息 Coupon</div><div className="value">{pct(bond.terms.couponRate)}</div><p><Kind kind="fact" />条款约定，按面值计息</p></div>
              <div><div className="small">到期收益率 YTM</div><div className="value">{pct(a.ytm)}</div><p><Kind kind="calc" />持有到期、全部偿付</p></div>
              <div>
                <div className="small">赎回收益率 YTC</div>
                {a.yieldsToCall.length ? (
                  <div className="value">{a.yieldsToCall.map((c) => (c.yield === null ? '—' : pct(c.yield))).join(' / ')}</div>
                ) : (
                  <div className="value na">不适用</div>
                )}
                <p>{a.yieldsToCall.length ? <><Kind kind="calc" />{a.yieldsToCall.map((c) => `${c.date} @${c.price}`).join('；')}</> : '该债券不可提前赎回'}</p>
              </div>
              <div><div className="small">最差收益率 YTW</div><div className="value">{pct(a.ytw)}</div><p><Kind kind="calc" />{a.ytwBasis === 'call' ? `假设 ${a.ytwDate} 被赎回` : '等于到期收益率'}</p></div>
            </div>
            {a.cleanPrice < 80 && (
              <p className="notice" style={{ marginTop: 12 }}>
                <Kind kind="opinion" />价格远低于面值，说明市场怀疑能否足额偿付。上面的收益率假设全部按时支付，实际结果主要取决于违约与回收率。
              </p>
            )}
            <p className="small muted" style={{ marginTop: 10 }}>
              结算日 {a.settlement}（价格日 T+2，未计假日）· 应计利息 {num(a.accrued, 4)} · 全价 {num(a.dirtyPrice, 4)} · 日计数 30/360
            </p>
          </>
        )}
      </section>

      {a.supported && (
        <>
          <section className="section" aria-labelledby="cf">
            <h2 id="cf">现金流与利率敏感度</h2>
            <div className="grid-2">
              <CashflowChart flows={a.schedule.flows} />
              <div>
                <div className="kpis">
                  <div className="kpi"><div className="label">Macaulay 久期</div><div className="value">{num(a.risk.macaulayDuration)} 年</div><div className="sub">现金流的加权平均回收时间</div></div>
                  <div className="kpi"><div className="label">修正久期</div><div className="value">{num(a.risk.modifiedDuration)}</div><div className="sub">收益率变动 1%，价格约变动的 %</div></div>
                  <div className="kpi"><div className="label">凸性</div><div className="value">{num(a.risk.convexity, 1)}</div><div className="sub">价格曲线的弯曲程度</div></div>
                  <div className="kpi"><div className="label">DV01</div><div className="value">{num(a.risk.dv01, 4)}</div><div className="sub">每 100 面值，收益率变动 1bp</div></div>
                </div>
                {bond.terms.structure === 'fixed-callable' && (
                  <p className="small muted" style={{ marginTop: 10 }}>久期按持有到期的现金流计算；含赎回权债券的实际利率敏感度通常更低，且利率下降时上涨空间受限。</p>
                )}
              </div>
            </div>
          </section>

          <section className="section" id="stress" aria-labelledby="stress-h">
            <h2 id="stress-h">压力测算：利率与信用利差</h2>
            <p className="muted">美元债收益率 ≈ 美国国债收益率 + 发行人信用利差。两者可以分别设定，合计后对价格进行全价重估。</p>
            <div className="grid-3" style={{ alignItems: 'start' }}>
              <NumberField label="美国利率变动" suffix="bp" step={25} value={rateBp} error={rateError} onChange={setRateBp} hint="100 bp = 1 个百分点；负数为下降" />
              <NumberField label="信用利差变动" suffix="bp" step={25} value={spreadBp} error={spreadError} onChange={setSpreadBp} hint="正数表示市场要求更高的风险补偿" />
              <NumberField label="持仓面值（示例）" prefix="USD" step={10000} value={face} error={faceError} onChange={setFace} />
            </div>
            {custom && !faceError ? (
              <div className="panel" aria-live="polite">
                <p style={{ margin: 0 }}>
                  <Kind kind="calc" />
                  收益率合计变动 <b className="num">{(rateBp + spreadBp > 0 ? '+' : '') + (rateBp + spreadBp)} bp</b>，至 <b className="num">{pct(custom.newYield)}</b>；
                  净价约 <b className="num">{num(custom.newCleanPrice)}</b>，全价变化 <b className="num">{signedPct(custom.pctChange)}</b>，
                  按 {money(face, 'USD')} 面值约 <b className="num">{custom.pctChange >= 0 ? '+' : ''}{money(mv * custom.pctChange, 'USD')}</b>。
                </p>
              </div>
            ) : (
              <p className="notice error" role="alert">请先修正上方输入。</p>
            )}
            <div className="grid-2" style={{ marginTop: 20 }}>
              <StressChart points={stressCurve(a, bond.terms.frequency)} highlightBp={rateError || spreadError ? undefined : Math.round((rateBp + spreadBp) / 10) * 10} />
              <div>
                <h3>情景矩阵（全价变化）</h3>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>利率 \ 利差</th>{SPREAD_GRID.map((s) => <th key={s} className="n">{s > 0 ? '+' : ''}{s} bp</th>)}</tr>
                    </thead>
                    <tbody>
                      {RATE_GRID.map((r) => {
                        const row = stressTest(a.schedule.flows, bond.terms.frequency, a.ytm, a.accrued, SPREAD_GRID.map((s) => ({ rateBp: r, spreadBp: s })));
                        return (
                          <tr key={r}>
                            <th scope="row">{r > 0 ? '+' : ''}{r} bp</th>
                            {row.map((p) => <td key={p.spreadShiftBp} className="n">{signedPct(p.pctChange, 1)}</td>)}
                          </tr>
                        );
                      })}
                    </tbody>
                    <caption>即时冲击；未计入持有期票息；未反映赎回权与违约回收。</caption>
                  </table>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      <section className="section" aria-labelledby="credit">
        <h2 id="credit">信用风险、债务顺位与条款</h2>
        <div className="grid-2">
          <dl className="dl-grid" style={{ gridTemplateColumns: '1fr' }}>
            <div><dt>债务顺位</dt><dd>{bond.seniority}</dd></div>
            <div><dt>担保</dt><dd>{bond.guarantee}</dd></div>
            <div><dt>赎回条款</dt><dd>{bond.callTerms}</dd></div>
            <div><dt>适用法律</dt><dd>{bond.governingLaw}</dd></div>
            {a.supported && (
              <div>
                <dt>相对美国国债的收益差（近似）</dt>
                <dd><span className="num">{num((a.ytm - bond.benchmark.yield) * 10000, 0)} bp</span> <span className="small muted">基准：{bond.benchmark.label} {pct(bond.benchmark.yield)}，期限未精确匹配</span></dd>
              </div>
            )}
          </dl>
          <div>
            <h3>{isSov ? '主权债' : '企业／金融债'}的分析要点</h3>
            <ul>{(isSov ? SOVEREIGN_FOCUS : CORPORATE_FOCUS).map((p) => <li key={p}>{p}</li>)}</ul>
            <h3>这只债券</h3>
            <ul>{bond.keyPoints.map((p) => <li key={p}>{p}</li>)}</ul>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="src">
        <h2 id="src">公告、评级与新闻来源</h2>
        <div className="grid-2">
          <div>
            <h3>相关信息（演示条目）</h3>
            {related.length ? (
              <ul className="rule-list">
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
            <ul className="rule-list">
              {bond.sourceLinks.map((s) => (
                <li key={s.label}>{s.label}：<span className="muted small">{s.url ? <a href={s.url} target="_blank" rel="noreferrer noopener">原文</a> : '示例债券无原文'} · {s.note}</span></li>
              ))}
            </ul>
          </div>
          <div>
            <h3>真实债券应查阅的官方来源</h3>
            <ul className="rule-list">
              {[...OFFICIAL_SOURCES.issuer, ...OFFICIAL_SOURCES.credit].map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noreferrer noopener">{s.name}<span className="visually-hidden">（在新窗口打开）</span></a>
                  <div className="small muted">{s.covers}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <div className="btn-row section">
        <Link className="btn" to={`/analysis?topic=coupon-yield&bond=${bond.id}`}>票息是否等于收益？</Link>
        <Link className="btn secondary" to={`/analysis?topic=rate-impact&bond=${bond.id}`}>利率变化会怎样？</Link>
        <Link className="btn ghost" to="/experts?domain=usd-bond">请美元债专家逐条复核</Link>
      </div>
    </>
  );
}
