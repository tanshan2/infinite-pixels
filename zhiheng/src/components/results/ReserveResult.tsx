import { Link } from 'react-router-dom';
import { ResultLayout } from '../ResultLayout';
import { NeedsBar, SERIES } from '../charts';
import { Kind } from '../Badges';
import { ANNUAL_FX_QUOTA_USD, CURRENCIES, computePlan, toHKD, type PlanInput } from '../../lib/finance/planning';
import { money, num } from '../../lib/format';
import { DEFAULT_FX_NOTE } from '../../data/defaultPlan';
import { EMBED } from '../../env';

const CUR_NAME = { HKD: '港元', CNY: '人民币', USD: '美元' } as const;

export function ReserveResult({ plan, isSample, question, onEdit }: { plan: PlanInput; isSample: boolean; question?: string; onEdit?: () => void }) {
  const r = computePlan(plan);
  const E = r.monthlyExpenseHKD;
  const surplus = r.unallocatedHKD >= 0;
  const cnyHoldHKD = toHKD(plan.holdings.CNY, 'CNY', plan.fx);

  const answer = surplus ? (
    <>
      按当前假设，未来 {plan.horizonMonths} 个月资金需求约 <span className="num">{money(r.totalNeedHKD)}</span>（含 {plan.reserveMonths} 个月备用金）。
      现有资金折合 <span className="num">{money(r.holdingsHKD)}</span>，可以覆盖，另有 <span className="num">{money(r.unallocatedHKD)}</span> 未分配。
    </>
  ) : (
    <>
      按当前假设，未来 {plan.horizonMonths} 个月资金需求约 <span className="num">{money(r.totalNeedHKD)}</span>，
      现有资金折合 <span className="num">{money(r.holdingsHKD)}</span>，缺口约 <span className="num">{money(-r.unallocatedHKD)}</span>。建议先调整支出、备用期限或到港时间。
    </>
  );
  const overQuota = r.cnyConvertedUSD > ANNUAL_FX_QUOTA_USD;

  return (
    <ResultLayout
      topicLabel="香港落地资金与备用金"
      question={question}
      answer={answer}
      answerKind="calc"
      highlights={[
        { label: '规划期资金需求', value: money(r.totalNeedHKD), note: `${plan.horizonMonths} 个月 · 含汇率缓冲` },
        { label: '备用金', value: money(r.reserveHKD), note: `${plan.reserveMonths} 个月 × 月支出 ${money(E)}` },
        surplus
          ? { label: '未分配资金', value: money(r.unallocatedHKD), note: '尚未指定用途，不等于可投资金额', tone: 'emph' }
          : { label: '资金缺口', value: money(-r.unallocatedHKD), note: '现有资金不足以覆盖需求', tone: 'warn' },
      ]}
      chart={
        <>
          <NeedsBar
            available={r.holdingsHKD}
            segments={[
              { label: '一次性落地成本', value: r.oneOffHKD, color: SERIES.blue },
              { label: `无收入过渡期（${r.noIncomeMonths} 个月）`, value: r.noIncomeCostHKD, color: SERIES.gold },
              { label: '收入到位后的持续缺口', value: r.ongoingGapHKD, color: SERIES.clay },
              { label: '备用金', value: r.reserveHKD, color: SERIES.green },
              { label: '汇率缓冲', value: r.fxBufferHKD, color: SERIES.neutral, hatched: true },
            ]}
          />
          {overQuota && (
            <p className="notice" style={{ marginTop: 16 }}>
              需要从人民币换出约 <span className="num">{money(r.cnyConvertedUSD, 'USD')}</span>，超过一个人一年 5 万美元的购汇额度，需要分家庭成员或分年度安排。详见“计算明细”。
            </p>
          )}
        </>
      }
      details={
        <>
          <div className="kpis">
            <Kpi label="每月家庭支出" value={money(E)} sub="按你填写的分项合计" />
            <Kpi
              label="每月收支"
              value={`${r.monthlyNetHKD >= 0 ? '+' : ''}${money(r.monthlyNetHKD)}`}
              sub={r.monthlyNetHKD >= 0 ? '收入到位后每月结余' : '收入到位后每月仍不够'}
            />
            <Kpi label="一次性落地成本" value={money(r.oneOffHKD)} sub="外币按假设汇率折算" />
            <Kpi label="汇率缓冲" value={money(r.fxBufferHKD)} sub={`人民币换汇部分 × ${num(plan.fxBufferPct * 100, 1)}%`} />
          </div>
          <h3 style={{ marginTop: 20, fontSize: '1rem' }}>按币种看：需要多少、手上有多少</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>币种</th><th className="n">需要</th><th className="n">手上有</th><th className="n">差额</th></tr>
              </thead>
              <tbody>
                {CURRENCIES.map((c) => {
                  const d = plan.holdings[c] - r.needs[c];
                  return (
                    <tr key={c}>
                      <td>{CUR_NAME[c]}</td>
                      <td className="n">{money(r.needs[c], c)}</td>
                      <td className="n">{money(plan.holdings[c], c)}</td>
                      <td className="n">{d >= 0 ? '多 ' : '少 '}{money(Math.abs(d), c)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <caption>在港的日常开支、头几个月的开支和备用金都按港元计。</caption>
            </table>
          </div>
          {r.conversions.length > 0 && (
            <>
              <h3 style={{ marginTop: 20, fontSize: '1rem' }}>需要换汇的金额</h3>
              <p className="small muted">先用美元，再用港元，最后用人民币。</p>
              <ul>
                {r.conversions.map((c, i) => (
                  <li key={i} className="num">
                    {money(c.amountFrom, c.from)} → {CUR_NAME[c.to]}（约 {money(c.amountHKD)}）
                  </li>
                ))}
              </ul>
              {overQuota && (
                <p className="small">
                  <Kind kind="fact" />境内个人购汇便利化额度为每人每年等值 5 万美元，以国家外汇管理局最新规定为准。
                  <br />
                  <Kind kind="calc" />按当前安排需从人民币换出约 <span className="num">{money(r.cnyConvertedUSD, 'USD')}</span>。
                </p>
              )}
            </>
          )}
        </>
      }
      factors={[
        { kind: 'calc', text: <>收入开始时间：每推迟 1 个月，需多准备约 <span className="num">{money(E)}</span>（一个月的全部支出）。</> },
        { kind: 'calc', text: <>备用期限：每增加 1 个月，备用金增加约 <span className="num">{money(E)}</span>。</> },
        {
          kind: 'estimate',
          text: <>人民币兑港元汇率：每变动 1%，你持有的人民币折合港元约变动 <span className="num">{money(cnyHoldHKD * 0.01)}</span>。</>,
          pro: '港元与美元在 7.75–7.85 的联系汇率区间内浮动，因此美元持有部分的港元价值波动很小；人民币部分不受此约束。',
        },
        { kind: 'opinion', text: '备用金的用途是应对收入中断和突发支出。平台认为它更适合放在可随时动用、本金不波动的地方，而不是计入可投资资金。' },
      ]}
      sources={[
        { label: '家庭资金、收入、支出', status: 'sample', statusLabel: isSample ? '示例参数' : '你的输入', note: isSample ? '示例家庭，仅用于演示' : '仅保存在本页面内存中' },
        { label: '汇率', status: 'sample', statusLabel: '假设值', asOf: '2026-10', note: DEFAULT_FX_NOTE },
        { label: '个人年度购汇便利化额度', status: 'sample', statusLabel: '规则说明', note: '等值 5 万美元／人／年；请以国家外汇管理局最新规定为准' },
      ]}
      formulas={[
        { name: '月支出', expr: 'E = Σ 各项月支出（港元）' },
        { name: '无收入过渡期', expr: `T = E × 收入开始月份 = ${num(E, 0)} × ${r.noIncomeMonths}` },
        { name: '持续缺口', expr: `G = max(0, E − 月收入) × (规划期 − 过渡期) = ${num(Math.max(0, -r.monthlyNetHKD), 0)} × ${r.gapMonths}` },
        { name: '备用金', expr: `R = 备用月数 × E = ${plan.reserveMonths} × ${num(E, 0)}`, note: '按全部月支出而非净缺口计算：假设收入可能中断。' },
        { name: '汇率缓冲', expr: `B = 从人民币兑出的港元金额 × 缓冲比例（${num(plan.fxBufferPct * 100, 1)}%）` },
        { name: '未分配资金', expr: 'U = Σ 各币种持有 × 汇率 − (一次性成本 + T + G + R + B)', note: 'U 为负数时表示资金缺口。' },
      ]}
      assumptions={[
        `规划期 ${plan.horizonMonths} 个月；抵港后第 ${plan.incomeStartMonth + 1} 个月起有税后收入 ${money(plan.monthlyIncomeHKD)}。`,
        `汇率：1 人民币 = ${plan.fx.CNYHKD} 港元，1 美元 = ${plan.fx.USDHKD} 港元。`,
        '在港日常开支、过渡期支出与备用金均以港元计。',
        '月支出在规划期内保持不变，不考虑通胀与加薪。',
      ]}
      missing={[
        '实际租约金额、押金月数和学校收费（目前为估计或示例）。',
        '税后收入是否确定、入职日期是否确定。',
        '内地是否仍有持续收入或支出（如房贷、赡养父母）。',
        '每位家庭成员可使用的购汇额度。',
      ]}
      limits={[
        '未计入薪俸税：香港薪俸税按课税年度评税，通常在次年缴纳，首次税单可能集中出现。',
        '未计入投资收益或损失；未分配资金不等于适合投资的金额。',
        '汇率与支出为假设值，实际结果会随之变化。',
      ]}
      actions={
        <>
          {onEdit ? (
            <button type="button" className="btn" onClick={onEdit}>修改参数</button>
          ) : (
            <Link className="btn" to="/plan">修改参数并重新计算</Link>
          )}
          <Link className="btn secondary" to="/experts?domain=hk-family">请专家复核</Link>
          {!EMBED && <button type="button" className="btn ghost" onClick={() => window.print()}>打印</button>}
        </>
      }
    />
  );
}

function Kpi({ label, value, sub, emph }: { label: string; value: string; sub?: string; emph?: boolean }) {
  return (
    <div className={`kpi${emph ? ' emph' : ''}`}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}

export { Kpi };
