import { Link } from 'react-router-dom';
import { ResultLayout } from '../ResultLayout';
import { CashflowChart, StressChart } from '../charts';
import { Kpi } from './ReserveResult';
import { analyzeRecord, priceDate, stressCurve } from '../../lib/bondView';
import { stressTest } from '../../lib/finance/bond';
import { PRICE_KIND_LABEL, type BondRecord } from '../../data/sampleBonds';
import { money, num, pct, signedPct } from '../../lib/format';
import { InsufficientResult } from './InsufficientResult';

const bondSources = (b: BondRecord) => [
  { label: '债券条款（票息、到期日、赎回条款）', status: 'sample' as const, statusLabel: '虚构示例', note: '演示代码 ' + b.isin + '，非真实 ISIN' },
  { label: '价格', status: 'sample' as const, statusLabel: PRICE_KIND_LABEL[b.price.kind], asOf: b.price.time, note: '不能据此成交' },
  { label: '基准美国国债收益率', status: 'sample' as const, statusLabel: '示例值', asOf: b.benchmark.asOf, note: b.benchmark.label },
];

export function CouponYieldResult({ bond, question }: { bond: BondRecord; question?: string }) {
  const a = analyzeRecord(bond);
  if (!a.supported) {
    return <InsufficientResult question={question} reason={a.reason} missing={['可计算结构的债券条款，或由专业人士逐条解读该结构。']} />;
  }
  const coupon = bond.terms.couponRate;
  const totalCoupons = a.schedule.flows.reduce((s, f) => s + f.coupon, 0);
  const principal = a.schedule.flows[a.schedule.flows.length - 1].principal;
  const received = totalCoupons + principal;
  const callable = a.yieldsToCall.length > 0;
  const distressed = a.cleanPrice < 80;

  return (
    <ResultLayout
      topicLabel="票息与实际收益"
      question={question}
      answerKind="calc"
      answer={
        <>
          不等于。票息 <span className="num">{pct(coupon)}</span> 按面值计息；以示例净价 <span className="num">{num(a.cleanPrice)}</span> 买入并持有至到期，
          到期收益率（YTM）约 <span className="num">{pct(a.ytm)}</span>
          {a.ytwBasis === 'call' && (
            <>；若于 {a.ytwDate} 被赎回，最差收益率（YTW）约 <span className="num">{pct(a.ytw)}</span></>
          )}
          。{a.cleanPrice > 100 ? '溢价部分会在持有期内抵减票息收益。' : a.cleanPrice < 100 ? '折价部分会在到期时补回，因此收益率高于票息。' : ''}
          {distressed && '该价格隐含较高违约风险，上述收益率仅在全部按时足额偿付时成立。'}
        </>
      }
      highlights={[
        { label: '票息 Coupon', value: pct(coupon), note: '按面值 100 计息' },
        { label: '到期收益率 YTM', value: pct(a.ytm), note: '持有到期的年化收益 · 半年复利', tone: 'emph' },
        a.ytwBasis === 'call'
          ? { label: '最差收益率 YTW', value: pct(a.ytw), note: `${a.ytwDate} 赎回情景` }
          : { label: '净价 Clean Price', value: num(a.cleanPrice), note: '每 100 面值 · 示例价格' },
      ]}
      chart={<CashflowChart flows={a.schedule.flows} />}
      details={
        <>
          <div className="yield-cards">
            <div><div className="small">票息 Coupon</div><div className="value">{pct(coupon)}</div><p>按面值每年支付的利息比例</p></div>
            <div><div className="small">当期收益率</div><div className="value">{pct(a.currentYield)}</div><p>年票息 ÷ 买入价，不算到期的差价</p></div>
            <div><div className="small">到期收益率 YTM</div><div className="value">{pct(a.ytm)}</div><p>持有到期、全部偿付</p></div>
            <div><div className="small">最差收益率 YTW</div><div className="value">{pct(a.ytw)}</div><p>{callable ? '到期与各赎回日中最低' : '不可赎回，等于到期收益率'}</p></div>
          </div>
          <h3 style={{ marginTop: 20, fontSize: '1rem' }}>以 100 美元面值算一笔账</h3>
          <div className="table-wrap">
            <table>
              <tbody>
                <tr><td>买入要付（价格 + 应计利息）</td><td className="n">{num(a.dirtyPrice)}</td></tr>
                <tr><td>持有到期共收到利息</td><td className="n">{num(totalCoupons)}</td></tr>
                <tr><td>到期拿回本金</td><td className="n">{num(principal)}</td></tr>
                <tr className="total"><td>一共拿回 − 买入支付（未折现、未扣费用）</td><td className="n">{num(received - a.dirtyPrice)}</td></tr>
              </tbody>
            </table>
          </div>
          <dl className="dl-grid" style={{ marginTop: 16 }}>
            <div><dt>价格日</dt><dd className="num">{priceDate(bond)}</dd></div>
            <div><dt>结算日（T+2，未计假日）</dt><dd className="num">{a.settlement}</dd></div>
            <div><dt>应计利息（每 100）</dt><dd className="num">{num(a.accrued, 4)}</dd></div>
            <div><dt>剩余付款次数</dt><dd className="num">{a.schedule.flows.length}</dd></div>
          </dl>
          {callable && (
            <div className="table-wrap" style={{ marginTop: 12 }}>
              <table>
                <thead><tr><th>情景</th><th className="n">赎回价</th><th className="n">年化收益率</th></tr></thead>
                <tbody>
                  {a.yieldsToCall.map((c) => (
                    <tr key={c.date}><td>{c.date} 赎回（YTC）</td><td className="n">{num(c.price)}</td><td className="n">{c.yield === null ? '无法求解' : pct(c.yield)}</td></tr>
                  ))}
                  <tr><td>持有到期（YTM）</td><td className="n">{num(bond.terms.redemption ?? 100)}</td><td className="n">{pct(a.ytm)}</td></tr>
                </tbody>
              </table>
            </div>
          )}
        </>
      }
      factors={[
        { kind: 'fact', text: <>买入价格：示例净价 {num(a.cleanPrice)}，{a.cleanPrice >= 100 ? '高于' : '低于'}面值 100。价格越高，同样的票息对应的收益率越低。</> },
        ...(callable
          ? [{ kind: 'fact' as const, text: <>赎回条款：{bond.callTerms}。发行人通常在对自己有利（再融资更便宜）时赎回，对持有人不利。</> }]
          : []),
        { kind: 'estimate' as const, text: '再投资假设：到期收益率隐含“收到的票息能按同一收益率再投资”，实际再投资收益可能更高或更低。' },
        {
          kind: 'opinion' as const,
          text: distressed
            ? '价格远低于面值说明市场担心不能足额偿付。高收益率是对违约风险的补偿，不是确定回报。'
            : '收益率高于同期美国国债的部分，主要是对发行人信用风险和流动性的补偿。',
          pro: `示例基准：${bond.benchmark.label} ${pct(bond.benchmark.yield)}，到期收益率与之相差约 ${num((a.ytm - bond.benchmark.yield) * 10000, 0)} bp（近似 G-spread，期限未精确匹配）。`,
        },
      ]}
      sources={bondSources(bond)}
      formulas={[
        { name: '当期收益率', expr: 'CY = 年票息 ÷ 净价' },
        { name: '到期收益率（求解 y）', expr: '全价 = Σ CFₖ ÷ (1 + y/f)^(w + k − 1)', note: 'f 为每年付息次数，w 为结算日至下一付息日占一期的比例（30/360）。用二分法求解，结果可复现。' },
        { name: '最差收益率', expr: 'YTW = min(YTM, YTC₁, YTC₂, …)', note: '每个赎回日以赎回价作为最后一期本金重新求解。' },
      ]}
      assumptions={['持有至到期（或被赎回），期间全部按时足额支付。', '不含交易佣金、买卖价差、托管费和税费。', '结算日按价格日后 2 个工作日推算，未计公众假期。']}
      missing={['你的实际买入价格与日期（目前使用示例价格）。', '交易与托管费用。', '可成交报价：示例价格不能用于交易。']}
      limits={['仅支持固定票息、到期一次还本的债券（可含赎回权）；永续、浮息、摊还结构暂不支持。', '未计入违约概率与回收率。']}
      actions={
        <>
          <Link className="btn" to={`/bonds/${bond.id}`}>查看债券详情</Link>
          <Link className="btn secondary" to="/experts?domain=usd-bond">请专家复核</Link>
        </>
      }
    />
  );
}

export function RateImpactResult({ bond, face = 200_000, question }: { bond: BondRecord; face?: number; question?: string }) {
  const a = analyzeRecord(bond);
  if (!a.supported) {
    return <InsufficientResult question={question} reason={a.reason} missing={['可计算结构的债券条款。']} />;
  }
  const f = bond.terms.frequency;
  const scen = stressTest(a.schedule.flows, f, a.ytm, a.accrued, [
    { rateBp: 100, spreadBp: 0 },
    { rateBp: -100, spreadBp: 0 },
    { rateBp: 0, spreadBp: 100 },
    { rateBp: 100, spreadBp: 100 },
    { rateBp: 0, spreadBp: 300 },
  ]);
  const up = scen[0];
  const marketValue = (face * a.dirtyPrice) / 100;
  const callable = a.yieldsToCall.length > 0;

  return (
    <ResultLayout
      topicLabel="利率变化对持仓的影响"
      question={question}
      answerKind="calc"
      answer={
        <>
          若收益率即时上升 100bp（1 个百分点），{bond.name}价格约下跌 <span className="num">{num(Math.abs(up.pctChange) * 100, 1)}%</span>，
          按 {money(face, 'USD')} 面值约 <span className="num">−{money(Math.abs(marketValue * up.pctChange), 'USD')}</span>。
          修正久期 <span className="num">{num(a.risk.modifiedDuration)}</span>；持有至到期且发行人如约偿付时，到期仍按面值兑付。
        </>
      }
      highlights={[
        { label: '收益率 +100bp', value: `${scen[0].pctChange < 0 ? '−' : '+'}${num(Math.abs(scen[0].pctChange) * 100, 1)}%`, note: `价格${scen[0].pctChange < 0 ? '下跌' : '上升'} · 按面值 ${money(marketValue * scen[0].pctChange, 'USD')}`, tone: 'warn' },
        { label: '收益率 −100bp', value: `${scen[1].pctChange < 0 ? '−' : '+'}${num(Math.abs(scen[1].pctChange) * 100, 1)}%`, note: `价格${scen[1].pctChange < 0 ? '下跌' : '上升'} · 按面值 ${scen[1].pctChange < 0 ? '' : '+'}${money(marketValue * scen[1].pctChange, 'USD')}` },
        { label: '修正久期', value: num(a.risk.modifiedDuration), note: '收益率每变动 1%，价格约变动的 %' },
      ]}
      chart={<StressChart points={stressCurve(a, f)} highlightBp={100} />}
      details={
        <>
          <div className="kpis">
            <Kpi label="修正久期" value={num(a.risk.modifiedDuration)} sub="收益率变 1 个百分点，价格约变的 %" />
            <Kpi label="DV01（按持仓面值）" value={money((a.risk.dv01 * face) / 100, 'USD', 0)} sub="收益率变 0.01 个百分点的价格变化" />
          </div>
          <h3 style={{ marginTop: 20, fontSize: '1rem' }}>几种情景</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>情景</th><th className="n">美国利率</th><th className="n">信用利差</th><th className="n">价格变化</th><th className="n">金额</th></tr></thead>
              <tbody>
                {[
                  ['美国利率上升', scen[0]],
                  ['美国利率下降', scen[1]],
                  ['发行人信用利差扩大', scen[2]],
                  ['利率与利差同时上升', scen[3]],
                  ['信用明显恶化', scen[4]],
                ].map(([label, s]) => {
                  const p = s as (typeof scen)[number];
                  return (
                    <tr key={label as string}>
                      <td>{label as string}</td>
                      <td className="n">{p.rateShiftBp > 0 ? '+' : ''}{p.rateShiftBp} bp</td>
                      <td className="n">{p.spreadShiftBp > 0 ? '+' : ''}{p.spreadShiftBp} bp</td>
                      <td className="n">{signedPct(p.pctChange, 1)}</td>
                      <td className="n">{money(marketValue * p.pctChange, 'USD')}</td>
                    </tr>
                  );
                })}
              </tbody>
              <caption>持仓面值 {money(face, 'USD')}（示例，未连接账户），当前市值约 {money(marketValue, 'USD')}。100 bp = 1 个百分点。</caption>
            </table>
          </div>
        </>
      }
      factors={[
        { kind: 'calc', text: <>剩余期限与久期：修正久期 {num(a.risk.modifiedDuration)}，期限越长，对收益率变化越敏感。</> },
        { kind: 'fact', text: '新兴市场美元债的收益率 = 美国国债收益率 + 信用利差；两者都会变，且信用利差的波动往往大于美债利率。' },
        ...(callable
          ? [{ kind: 'estimate' as const, text: '含赎回权：利率下降时发行人更可能赎回，价格上涨空间受限（负凸性），本测算未反映这一点，下降情景结果偏乐观。' }]
          : []),
        { kind: 'opinion', text: '价格波动只在卖出时成为实际损益；若计划持有到期，更需要关注的是发行人能否如约偿付。' },
      ]}
      sources={bondSources(bond)}
      formulas={[
        { name: '全价重估', expr: '新全价 = Σ CFₖ ÷ (1 + (y + Δr + Δs)/f)^(tₖ)', note: 'Δr 为基准利率变动，Δs 为信用利差变动。' },
        { name: '久期近似（用于核对）', expr: 'ΔP/P ≈ −D_mod × Δy + ½ × C × Δy²' },
        { name: 'DV01', expr: 'DV01 = D_mod × 全价 × 0.0001' },
      ]}
      assumptions={['收益率变动即时发生，不考虑持有期间的票息收入。', '同一债券所有期限的收益率平行移动。', `持仓面值 ${money(face, 'USD')} 为示例。`]}
      missing={['你的实际持仓（账户未连接）。', '可成交报价与买卖价差。', '当前真实的美国国债收益率与该发行人信用利差。']}
      limits={['未反映赎回权随利率变化的价值（OAS 模型未实现）。', '未计入违约与回收率；“信用明显恶化”情景只是收益率冲击，不等于违约损失。']}
      actions={
        <>
          <Link className="btn" to={`/bonds/${bond.id}#stress`}>自定义压力情景</Link>
          <Link className="btn secondary" to="/experts?domain=usd-bond">请专家复核</Link>
        </>
      }
    />
  );
}

