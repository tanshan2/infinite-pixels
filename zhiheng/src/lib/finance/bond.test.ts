import { describe, expect, it } from 'vitest';
import {
  analyzeBond,
  buildSchedule,
  dirtyPriceFromYield,
  riskMeasures,
  settlementFromPriceDate,
  solveYield,
  stressTest,
  type BondTerms,
} from './bond';
import { addMonths, days30360 } from './dates';

const bullet = (couponRate: number, maturity: string, frequency: 1 | 2 = 2): BondTerms => ({
  couponRate,
  frequency,
  maturity,
  structure: 'fixed-bullet',
});

describe('日期与日计数', () => {
  it('30/360 Bond Basis 处理月末', () => {
    expect(days30360('2026-01-31', '2026-02-28')).toBe(28);
    expect(days30360('2026-01-30', '2026-03-31')).toBe(60);
    expect(days30360('2026-03-15', '2026-09-15')).toBe(180);
  });
  it('倒推付息日按月末截断', () => {
    expect(addMonths('2026-08-31', -6)).toBe('2026-02-28');
    expect(addMonths('2028-08-31', -6)).toBe('2028-02-29');
  });
  it('T+2 结算跳过周末', () => {
    expect(settlementFromPriceDate('2026-10-16')).toBe('2026-10-20'); // 周五 → 下周二
    expect(settlementFromPriceDate('2026-10-19')).toBe('2026-10-21');
  });
});

describe('价格与收益率', () => {
  it('票息等于收益率且在付息日结算时，净价为 100', () => {
    const s = buildSchedule(bullet(0.06, '2036-03-15'), '2026-03-15');
    expect(s.accrued).toBeCloseTo(0, 12);
    expect(dirtyPriceFromYield(s.flows, 0.06, 2)).toBeCloseTo(100, 9);
  });

  it('教科书算例：10 年期 6% 半年付息，收益率 8% → 价格 86.4097', () => {
    // 3 × 年金系数(4%, 20) + 100 / 1.04^20
    const s = buildSchedule(bullet(0.06, '2036-03-15'), '2026-03-15');
    expect(dirtyPriceFromYield(s.flows, 0.08, 2)).toBeCloseTo(86.4097, 4);
  });

  it('付息期中途结算：应计利息按 30/360', () => {
    // 6% 半年付息，上一付息日 3 月 15 日，结算 6 月 15 日 → 90/180 × 3 = 1.5
    const s = buildSchedule(bullet(0.06, '2031-09-15'), '2026-06-15');
    expect(s.previousCoupon).toBe('2026-03-15');
    expect(s.nextCoupon).toBe('2026-09-15');
    expect(s.accrued).toBeCloseTo(1.5, 12);
    expect(s.fractionToNext).toBeCloseTo(0.5, 12);
  });

  it('收益率求解与定价互为逆运算（含非整数期）', () => {
    const s = buildSchedule(bullet(0.0725, '2033-11-30'), '2026-10-22');
    for (const y of [0.01, 0.0575, 0.0725, 0.11, 0.25]) {
      const p = dirtyPriceFromYield(s.flows, y, 2);
      expect(solveYield(s.flows, p, 2)).toBeCloseTo(y, 9);
    }
  });

  it('折价债 YTM > 票息 > 0；溢价债 YTM < 票息', () => {
    const disc = analyzeBond(bullet(0.06, '2034-03-15'), 95, '2026-10-22');
    const prem = analyzeBond(bullet(0.06, '2034-03-15'), 105, '2026-10-22');
    if (!disc.supported || !prem.supported) throw new Error('应支持');
    expect(disc.ytm).toBeGreaterThan(0.06);
    expect(prem.ytm).toBeLessThan(0.06);
    // 当期收益率 = 年票息 / 净价
    expect(disc.currentYield).toBeCloseTo(6 / 95, 12);
  });

  it('价格超出合理区间时返回“不支持”，而不是给出虚假数字', () => {
    const r = analyzeBond(bullet(0.05, '2030-01-15'), 1000, '2026-10-22');
    expect(r.supported).toBe(false);
  });
});

describe('久期与凸性', () => {
  it('零息债的 Macaulay 久期等于剩余年限', () => {
    const s = buildSchedule(bullet(0, '2031-03-15'), '2026-03-15');
    const r = riskMeasures(s.flows, 0.05, 2);
    expect(r.macaulayDuration).toBeCloseTo(5, 10);
    expect(r.modifiedDuration).toBeCloseTo(5 / 1.025, 10);
  });

  it('5 年期 5% 年付平价债：Macaulay 久期 4.5460', () => {
    const s = buildSchedule(bullet(0.05, '2031-03-15', 1), '2026-03-15');
    const r = riskMeasures(s.flows, 0.05, 1);
    expect(r.macaulayDuration).toBeCloseTo(4.546, 3);
  });

  it('修正久期与有限差分一致；DV01 与 1bp 价格变动一致', () => {
    const s = buildSchedule(bullet(0.065, '2035-06-01'), '2026-10-22');
    const y = 0.07;
    const h = 1e-5;
    const p0 = dirtyPriceFromYield(s.flows, y, 2);
    const pUp = dirtyPriceFromYield(s.flows, y + h, 2);
    const pDn = dirtyPriceFromYield(s.flows, y - h, 2);
    const r = riskMeasures(s.flows, y, 2);
    expect(r.modifiedDuration).toBeCloseTo(-(pUp - pDn) / (2 * h * p0), 6);
    expect(r.convexity).toBeCloseTo((pUp + pDn - 2 * p0) / (h * h * p0), 2);
    expect(r.dv01).toBeCloseTo(p0 - dirtyPriceFromYield(s.flows, y + 0.0001, 2), 4);
  });
});

describe('赎回条款与最差收益率', () => {
  const callable: BondTerms = {
    couponRate: 0.075,
    frequency: 2,
    maturity: '2029-06-01',
    structure: 'fixed-callable',
    calls: [
      { date: '2027-06-01', price: 102 },
      { date: '2028-06-01', price: 101 },
    ],
  };

  it('溢价交易的可赎回债：最差收益率取较低的赎回收益率', () => {
    const r = analyzeBond(callable, 104, '2026-10-22');
    if (!r.supported) throw new Error('应支持');
    const minCall = Math.min(...r.yieldsToCall.map((c) => c.yield ?? Infinity));
    expect(minCall).toBeLessThan(r.ytm);
    expect(r.ytw).toBeCloseTo(minCall, 12);
    expect(r.ytwBasis).toBe('call');
  });

  it('折价交易时最差收益率为到期收益率', () => {
    const r = analyzeBond(callable, 92, '2026-10-22');
    if (!r.supported) throw new Error('应支持');
    expect(r.ytwBasis).toBe('maturity');
    expect(r.ytw).toBe(r.ytm);
  });

  it('赎回日的现金流包含赎回价', () => {
    const s = buildSchedule(callable, '2026-10-22', '2027-06-01', 102);
    const last = s.flows[s.flows.length - 1];
    expect(last.date).toBe('2027-06-01');
    expect(last.principal).toBe(102);
    expect(last.coupon).toBeCloseTo(3.75, 12);
  });

  it('赎回日不在付息日上时按不足一期计息', () => {
    const s = buildSchedule(callable, '2026-10-22', '2027-03-01', 100);
    const last = s.flows[s.flows.length - 1];
    // 2026-12-01 → 2027-03-01 = 90 天 = 半期
    expect(last.coupon).toBeCloseTo(3.75 * 0.5, 12);
    expect(last.periods).toBeCloseTo(days30360('2026-10-22', '2027-03-01') / 180, 12);
  });
});

describe('不支持的结构', () => {
  it('永续重置债与浮息债明确标为未支持', () => {
    for (const structure of ['perpetual-reset', 'floating', 'amortizing'] as const) {
      const r = analyzeBond({ couponRate: 0.05, frequency: 2, maturity: '2099-01-01', structure }, 98, '2026-10-22');
      expect(r.supported).toBe(false);
    }
  });
});

describe('压力测算', () => {
  const s = buildSchedule(bullet(0.06, '2034-03-15'), '2026-10-22');
  const pts = stressTest(s.flows, 2, 0.07, s.accrued, [
    { rateBp: 0, spreadBp: 0 },
    { rateBp: 100, spreadBp: 0 },
    { rateBp: 0, spreadBp: 100 },
    { rateBp: -100, spreadBp: 0 },
    { rateBp: 5, spreadBp: 0 },
  ]);

  it('零冲击时价格不变', () => {
    expect(pts[0].pctChange).toBeCloseTo(0, 12);
  });
  it('利率与利差同幅变动的价格影响相同（单一收益率模型）', () => {
    expect(pts[1].pctChange).toBeCloseTo(pts[2].pctChange, 12);
  });
  it('收益率上升价格下跌；凸性使下跌幅度小于上涨幅度', () => {
    expect(pts[1].pctChange).toBeLessThan(0);
    expect(pts[3].pctChange).toBeGreaterThan(0);
    expect(Math.abs(pts[3].pctChange)).toBeGreaterThan(Math.abs(pts[1].pctChange));
  });
  it('小幅变动时久期凸性近似与全价重估一致', () => {
    expect(pts[4].approxPctChange).toBeCloseTo(pts[4].pctChange, 6);
  });
});
