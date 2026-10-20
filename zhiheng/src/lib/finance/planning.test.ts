import { describe, expect, it } from 'vitest';
import { computePlan, validatePlan, type PlanInput } from './planning';

const base = (): PlanInput => ({
  holdings: { HKD: 100_000, CNY: 500_000, USD: 20_000 },
  monthlyIncomeHKD: 30_000,
  incomeStartMonth: 3,
  expenses: [
    { id: 'rent', label: '租金', monthlyHKD: 25_000 },
    { id: 'living', label: '生活', monthlyHKD: 15_000 },
  ],
  oneOffCosts: [
    { id: 'deposit', label: '押金', amount: 50_000, currency: 'HKD' },
    { id: 'moving', label: '搬家', amount: 20_000, currency: 'CNY' },
  ],
  reserveMonths: 6,
  horizonMonths: 12,
  fx: { CNYHKD: 1.1, USDHKD: 7.8 },
  fxBufferPct: 0.03,
});

describe('落地资金规划', () => {
  it('各分项按公式计算', () => {
    const r = computePlan(base());
    expect(r.monthlyExpenseHKD).toBe(40_000);
    expect(r.monthlyNetHKD).toBe(-10_000);
    expect(r.noIncomeCostHKD).toBe(3 * 40_000);
    expect(r.ongoingGapHKD).toBe(9 * 10_000);
    expect(r.reserveHKD).toBe(6 * 40_000);
    expect(r.oneOffHKD).toBeCloseTo(50_000 + 20_000 * 1.1, 9);
    expect(r.holdingsHKD).toBeCloseTo(100_000 + 550_000 + 156_000, 9);
  });

  it('币种匹配：港元不足先用美元，再用人民币，缓冲只加在人民币兑出部分', () => {
    const r = computePlan(base());
    // 港元需求 = 50k + 120k + 90k + 240k = 500k；持有 100k → 缺 400k
    expect(r.needs.HKD).toBe(500_000);
    const fromUSD = r.conversions.find((c) => c.from === 'USD' && c.to === 'HKD')!;
    const fromCNY = r.conversions.find((c) => c.from === 'CNY' && c.to === 'HKD')!;
    expect(fromUSD.amountHKD).toBeCloseTo(156_000, 9);
    expect(fromCNY.amountHKD).toBeCloseTo(244_000, 9);
    expect(fromCNY.amountFrom).toBeCloseTo(244_000 / 1.1, 9);
    expect(r.fxBufferHKD).toBeCloseTo(244_000 * 0.03, 9);
    expect(r.cnyConvertedUSD).toBeCloseTo(244_000 / 7.8, 9);
  });

  it('未分配资金 = 持有总额 − 总需求（含缓冲）', () => {
    const r = computePlan(base());
    expect(r.totalNeedHKD).toBeCloseTo(r.oneOffHKD + r.noIncomeCostHKD + r.ongoingGapHKD + r.reserveHKD + r.fxBufferHKD, 9);
    expect(r.unallocatedHKD).toBeCloseTo(r.holdingsHKD - r.totalNeedHKD, 9);
  });

  it('收入覆盖支出时没有持续缺口', () => {
    const r = computePlan({ ...base(), monthlyIncomeHKD: 60_000 });
    expect(r.ongoingGapHKD).toBe(0);
    expect(r.monthlyNetHKD).toBe(20_000);
  });

  it('资金不足时未分配为负数', () => {
    const r = computePlan({ ...base(), holdings: { HKD: 10_000, CNY: 0, USD: 0 } });
    expect(r.unallocatedHKD).toBeLessThan(0);
  });

  it('输入校验', () => {
    expect(validatePlan(base())).toEqual([]);
    const bad = { ...base(), reserveMonths: -1, fx: { CNYHKD: 0, USDHKD: 7.8 }, holdings: { HKD: NaN, CNY: 0, USD: 0 } };
    const fields = validatePlan(bad).map((i) => i.field);
    expect(fields).toEqual(expect.arrayContaining(['reserveMonths', 'fx.CNYHKD', 'holdings.HKD']));
    expect(validatePlan({ ...base(), incomeStartMonth: 13 }).map((i) => i.field)).toContain('incomeStartMonth');
  });
});
