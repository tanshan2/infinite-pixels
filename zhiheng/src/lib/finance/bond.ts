// 固定利率债券的确定性计算。
// 适用范围：固定票息、到期一次还本（bullet），可选的发行人赎回（按赎回日与赎回价计算）。
// 不支持：永续／重置票息、浮动利率、摊还本金、可转债、违约后回收、含权债的期权调整（OAS）。
// 约定：日计数 30/360；收益率按票息频率复利（street convention）；价格以每 100 面值计。

import { addBusinessDays, addMonths, compareISO, days30360, parseISO } from './dates';

export type Frequency = 1 | 2 | 4;

export type BondStructure =
  | 'fixed-bullet'
  | 'fixed-callable'
  | 'perpetual-reset'
  | 'floating'
  | 'amortizing';

export interface CallOption {
  date: string; // 可赎回日（ISO）
  price: number; // 赎回价，每 100 面值
}

export interface BondTerms {
  couponRate: number; // 年票息率，小数形式：0.075 = 7.5%
  frequency: Frequency;
  maturity: string; // 到期日（ISO）；永续债为 null 时不应进入计算
  redemption?: number; // 到期赎回价，默认 100
  structure: BondStructure;
  calls?: CallOption[];
}

export const SUPPORTED_STRUCTURES: BondStructure[] = ['fixed-bullet', 'fixed-callable'];

export const STRUCTURE_LABEL: Record<BondStructure, string> = {
  'fixed-bullet': '固定票息，到期一次还本',
  'fixed-callable': '固定票息，含发行人赎回权',
  'perpetual-reset': '永续债，票息定期重置',
  floating: '浮动利率',
  amortizing: '分期摊还本金',
};

export interface CashFlow {
  date: string;
  /** 距结算日的票息期数（可为小数） */
  periods: number;
  /** 距结算日的年数（30/360） */
  years: number;
  coupon: number;
  principal: number;
  amount: number;
}

export interface Schedule {
  settlement: string;
  previousCoupon: string;
  nextCoupon: string;
  /** 结算日至下一付息日占一个票息期的比例 */
  fractionToNext: number;
  /** 每 100 面值的应计利息 */
  accrued: number;
  flows: CashFlow[];
}

const PERIOD_DAYS = (f: Frequency) => 360 / f;

/** 由到期日倒推生成付息日，返回结算日之前最近的付息日与之后全部付息日（含到期日）。 */
export function couponDates(settlement: string, maturity: string, frequency: Frequency) {
  if (compareISO(settlement, maturity) >= 0) {
    throw new Error('结算日不早于到期日，债券已到期或日期有误');
  }
  const step = 12 / frequency;
  const anchorDay = parseISO(maturity).d;
  const future: string[] = [];
  let k = 0;
  let date = maturity;
  while (compareISO(date, settlement) > 0) {
    future.unshift(date);
    k += 1;
    date = addMonths(maturity, -step * k, anchorDay);
  }
  return { previous: date, future };
}

/**
 * 生成从结算日到某一赎回日（默认到期日）的现金流。
 * 若赎回日不在付息日上，最后一期按 30/360 计算不足一期的利息。
 */
export function buildSchedule(
  terms: BondTerms,
  settlement: string,
  redemptionDate: string = terms.maturity,
  redemptionPrice: number = terms.redemption ?? 100,
): Schedule {
  const f = terms.frequency;
  const periodDays = PERIOD_DAYS(f);
  const couponPerPeriod = (terms.couponRate * 100) / f;
  const { previous, future } = couponDates(settlement, terms.maturity, f);
  const nextCoupon = future[0];
  const fractionToNext = days30360(settlement, nextCoupon) / periodDays;
  const accrued = couponPerPeriod * (days30360(previous, settlement) / periodDays);

  const flows: CashFlow[] = [];
  let lastDate = previous;
  for (let i = 0; i < future.length; i += 1) {
    const date = future[i];
    if (compareISO(date, redemptionDate) > 0) {
      // 赎回日落在两个付息日之间：支付不足一期的利息 + 赎回价
      const stub = days30360(lastDate, redemptionDate) / periodDays;
      const periods = fractionToNext + (i - 1) + stub;
      flows.push(makeFlow(redemptionDate, periods, f, couponPerPeriod * stub, redemptionPrice));
      return { settlement, previousCoupon: previous, nextCoupon, fractionToNext, accrued, flows };
    }
    const isLast = date === redemptionDate;
    const periods = fractionToNext + i;
    flows.push(makeFlow(date, periods, f, couponPerPeriod, isLast ? redemptionPrice : 0));
    if (isLast) break;
    lastDate = date;
  }
  return { settlement, previousCoupon: previous, nextCoupon, fractionToNext, accrued, flows };
}

function makeFlow(date: string, periods: number, f: Frequency, coupon: number, principal: number): CashFlow {
  return { date, periods, years: periods / f, coupon, principal, amount: coupon + principal };
}

/** 给定年化收益率（按票息频率复利），求全价（dirty price）。 */
export function dirtyPriceFromYield(flows: CashFlow[], y: number, f: Frequency): number {
  const base = 1 + y / f;
  return flows.reduce((sum, cf) => sum + cf.amount / Math.pow(base, cf.periods), 0);
}

/** 二分法求解收益率：价格对收益率单调递减，保证收敛且结果可复现。 */
export function solveYield(flows: CashFlow[], targetDirty: number, f: Frequency): number | null {
  let lo = -0.5;
  let hi = 3;
  const pLo = dirtyPriceFromYield(flows, lo, f);
  const pHi = dirtyPriceFromYield(flows, hi, f);
  if (!(targetDirty <= pLo && targetDirty >= pHi)) return null;
  for (let i = 0; i < 200; i += 1) {
    const mid = (lo + hi) / 2;
    const p = dirtyPriceFromYield(flows, mid, f);
    if (p > targetDirty) lo = mid;
    else hi = mid;
    if (hi - lo < 1e-12) break;
  }
  return (lo + hi) / 2;
}

export interface RiskMeasures {
  macaulayDuration: number; // 年
  modifiedDuration: number;
  convexity: number;
  /** 收益率变动 1bp，每 100 面值全价的变化（正数表示下跌金额） */
  dv01: number;
}

export function riskMeasures(flows: CashFlow[], y: number, f: Frequency): RiskMeasures {
  const base = 1 + y / f;
  let pv = 0;
  let weighted = 0;
  let convexSum = 0;
  for (const cf of flows) {
    const disc = cf.amount / Math.pow(base, cf.periods);
    pv += disc;
    weighted += disc * cf.years;
    convexSum += disc * cf.periods * (cf.periods + 1);
  }
  const macaulayDuration = weighted / pv;
  const modifiedDuration = macaulayDuration / base;
  const convexity = convexSum / (pv * f * f * base * base);
  return { macaulayDuration, modifiedDuration, convexity, dv01: modifiedDuration * pv * 0.0001 };
}

export interface YieldToCall {
  date: string;
  price: number;
  yield: number | null;
}

export type BondAnalysis =
  | { supported: false; reason: string }
  | {
      supported: true;
      settlement: string;
      cleanPrice: number;
      dirtyPrice: number;
      accrued: number;
      currentYield: number;
      ytm: number;
      yieldsToCall: YieldToCall[];
      ytw: number;
      ytwBasis: 'maturity' | 'call';
      ytwDate: string;
      risk: RiskMeasures;
      schedule: Schedule;
    };

/** 价格日按 T+2（仅跳过周末）推算结算日。 */
export function settlementFromPriceDate(priceDate: string, lag = 2): string {
  return addBusinessDays(priceDate, lag);
}

export function analyzeBond(terms: BondTerms, cleanPrice: number, settlement: string): BondAnalysis {
  if (!SUPPORTED_STRUCTURES.includes(terms.structure)) {
    return {
      supported: false,
      reason: `${STRUCTURE_LABEL[terms.structure]}：现金流取决于未来重置利率或发行人选择，平台暂不支持对此结构计算收益率与久期。`,
    };
  }
  if (!Number.isFinite(cleanPrice) || cleanPrice <= 0) {
    return { supported: false, reason: '缺少有效价格，无法计算收益率。' };
  }
  if (compareISO(settlement, terms.maturity) >= 0) {
    return { supported: false, reason: '结算日已不早于到期日。' };
  }

  const f = terms.frequency;
  const schedule = buildSchedule(terms, settlement);
  const dirtyPrice = cleanPrice + schedule.accrued;
  const ytm = solveYield(schedule.flows, dirtyPrice, f);
  if (ytm === null) return { supported: false, reason: '在合理区间内找不到与该价格对应的收益率，请核对价格与条款。' };

  const yieldsToCall: YieldToCall[] = (terms.structure === 'fixed-callable' ? terms.calls ?? [] : [])
    .filter((c) => compareISO(c.date, settlement) > 0 && compareISO(c.date, terms.maturity) < 0)
    .map((c) => {
      const s = buildSchedule(terms, settlement, c.date, c.price);
      return { date: c.date, price: c.price, yield: solveYield(s.flows, dirtyPrice, f) };
    });

  let ytw = ytm;
  let ytwBasis: 'maturity' | 'call' = 'maturity';
  let ytwDate = terms.maturity;
  for (const c of yieldsToCall) {
    if (c.yield !== null && c.yield < ytw) {
      ytw = c.yield;
      ytwBasis = 'call';
      ytwDate = c.date;
    }
  }

  return {
    supported: true,
    settlement,
    cleanPrice,
    dirtyPrice,
    accrued: schedule.accrued,
    currentYield: (terms.couponRate * 100) / cleanPrice,
    ytm,
    yieldsToCall,
    ytw,
    ytwBasis,
    ytwDate,
    risk: riskMeasures(schedule.flows, ytm, f),
    schedule,
  };
}

export interface StressPoint {
  rateShiftBp: number;
  spreadShiftBp: number;
  newYield: number;
  /** 全价重估得到的新净价 */
  newCleanPrice: number;
  /** 价格变化百分比（全价口径，含应计利息基数） */
  pctChange: number;
  /** 用久期 + 凸性近似的百分比变化，用于核对 */
  approxPctChange: number;
}

/**
 * 压力测算：假设收益率变动 = 基准利率变动 + 信用利差变动，并立即发生（持有期为零）。
 * 采用到期现金流全价重估；对含赎回权债券不反映赎回概率随利率变化（负凸性），结果偏乐观。
 */
export function stressTest(
  flows: CashFlow[],
  f: Frequency,
  baseYield: number,
  accrued: number,
  shifts: { rateBp: number; spreadBp: number }[],
): StressPoint[] {
  const baseDirty = dirtyPriceFromYield(flows, baseYield, f);
  const { modifiedDuration, convexity } = riskMeasures(flows, baseYield, f);
  return shifts.map(({ rateBp, spreadBp }) => {
    const dy = (rateBp + spreadBp) / 10000;
    const newYield = baseYield + dy;
    const newDirty = dirtyPriceFromYield(flows, newYield, f);
    return {
      rateShiftBp: rateBp,
      spreadShiftBp: spreadBp,
      newYield,
      newCleanPrice: newDirty - accrued,
      pctChange: (newDirty - baseDirty) / baseDirty,
      approxPctChange: -modifiedDuration * dy + 0.5 * convexity * dy * dy,
    };
  });
}
