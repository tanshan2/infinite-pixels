import { analyzeBond, settlementFromPriceDate, stressTest, type BondAnalysis } from './finance/bond';
import type { BondRecord } from '../data/sampleBonds';
import type { StressCurvePoint } from '../components/charts';

export function priceDate(b: BondRecord): string {
  return b.price.time.slice(0, 10);
}

export function analyzeRecord(b: BondRecord, cleanOverride?: number): BondAnalysis {
  const clean = cleanOverride ?? b.price.clean;
  return analyzeBond(b.terms, clean, settlementFromPriceDate(priceDate(b)));
}

/** −200bp 到 +300bp，每 10bp 一个点，用于绘制曲线 */
export function stressCurve(a: Extract<BondAnalysis, { supported: true }>, frequency: 1 | 2 | 4): StressCurvePoint[] {
  const shifts = [];
  for (let bp = -200; bp <= 300; bp += 10) shifts.push({ rateBp: bp, spreadBp: 0 });
  return stressTest(a.schedule.flows, frequency, a.ytm, a.accrued, shifts).map((p) => ({
    bp: p.rateShiftBp,
    pct: p.pctChange,
    approx: p.approxPctChange,
  }));
}
