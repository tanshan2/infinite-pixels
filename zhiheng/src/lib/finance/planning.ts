// 香港落地资金规划：确定性计算，所有金额以港元（HKD）为记账本位。
// 模型只回答“未来一段时间需要准备多少钱、用什么币种”，不回答“剩下多少钱可以投资”。

export type Currency = 'HKD' | 'CNY' | 'USD';
export const CURRENCIES: Currency[] = ['HKD', 'CNY', 'USD'];

export interface OneOffCost {
  id: string;
  label: string;
  amount: number;
  currency: Currency;
}

export interface ExpenseLine {
  id: string;
  label: string;
  monthlyHKD: number;
}

export interface PlanInput {
  holdings: Record<Currency, number>;
  /** 家庭税后月收入（港元） */
  monthlyIncomeHKD: number;
  /** 抵港后第几个月开始有收入；0 表示第一个月即有收入 */
  incomeStartMonth: number;
  expenses: ExpenseLine[];
  oneOffCosts: OneOffCost[];
  /** 备用金覆盖的月数（按全部月支出计，假设收入可能中断） */
  reserveMonths: number;
  /** 规划期（月） */
  horizonMonths: number;
  /** 1 单位外币可兑换多少港元 */
  fx: { CNYHKD: number; USDHKD: number };
  /** 对需要从人民币兑换的金额额外预留的汇率缓冲（小数，0.03 = 3%） */
  fxBufferPct: number;
}

export interface Conversion {
  from: Currency;
  to: Currency;
  amountFrom: number;
  amountHKD: number;
}

export interface PlanResult {
  monthlyExpenseHKD: number;
  monthlyNetHKD: number; // 收入 − 支出；负数为缺口
  oneOffHKD: number;
  noIncomeMonths: number;
  noIncomeCostHKD: number;
  gapMonths: number;
  ongoingGapHKD: number;
  reserveHKD: number;
  needs: Record<Currency, number>; // 各币种需求（原币）
  holdingsHKD: number;
  conversions: Conversion[];
  /** 需从人民币兑出的金额，折合美元，用于提示年度购汇便利化额度 */
  cnyConvertedUSD: number;
  fxBufferHKD: number;
  totalNeedHKD: number;
  /** 正数：尚未指定用途的资金；负数：资金缺口 */
  unallocatedHKD: number;
}

export interface ValidationIssue {
  field: string;
  message: string;
}

export function toHKD(amount: number, currency: Currency, fx: PlanInput['fx']): number {
  if (currency === 'HKD') return amount;
  return amount * (currency === 'CNY' ? fx.CNYHKD : fx.USDHKD);
}

export function fromHKD(amountHKD: number, currency: Currency, fx: PlanInput['fx']): number {
  if (currency === 'HKD') return amountHKD;
  return amountHKD / (currency === 'CNY' ? fx.CNYHKD : fx.USDHKD);
}

const isNonNeg = (n: number) => Number.isFinite(n) && n >= 0;

export function validatePlan(input: PlanInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const c of CURRENCIES) {
    if (!isNonNeg(input.holdings[c])) issues.push({ field: `holdings.${c}`, message: `${c} 可用资金须为不小于 0 的数字` });
  }
  if (!isNonNeg(input.monthlyIncomeHKD)) issues.push({ field: 'monthlyIncomeHKD', message: '月收入须为不小于 0 的数字' });
  for (const e of input.expenses) {
    if (!isNonNeg(e.monthlyHKD)) issues.push({ field: `expense.${e.id}`, message: `“${e.label}”须为不小于 0 的数字` });
  }
  for (const c of input.oneOffCosts) {
    if (!isNonNeg(c.amount)) issues.push({ field: `oneoff.${c.id}`, message: `“${c.label}”须为不小于 0 的数字` });
  }
  if (!Number.isInteger(input.horizonMonths) || input.horizonMonths < 1 || input.horizonMonths > 60) {
    issues.push({ field: 'horizonMonths', message: '规划期须为 1–60 之间的整数月' });
  }
  if (!Number.isInteger(input.reserveMonths) || input.reserveMonths < 0 || input.reserveMonths > 36) {
    issues.push({ field: 'reserveMonths', message: '备用期限须为 0–36 之间的整数月' });
  }
  if (!Number.isInteger(input.incomeStartMonth) || input.incomeStartMonth < 0 || input.incomeStartMonth > input.horizonMonths) {
    issues.push({ field: 'incomeStartMonth', message: '收入开始月份须为 0 到规划期之间的整数' });
  }
  if (!(input.fx.CNYHKD > 0 && input.fx.CNYHKD < 5)) issues.push({ field: 'fx.CNYHKD', message: '人民币兑港元汇率须为合理正数（如 1.08）' });
  if (!(input.fx.USDHKD > 0 && input.fx.USDHKD < 20)) issues.push({ field: 'fx.USDHKD', message: '美元兑港元汇率须为合理正数（如 7.80）' });
  if (!(input.fxBufferPct >= 0 && input.fxBufferPct <= 0.3)) issues.push({ field: 'fxBufferPct', message: '汇率缓冲须在 0%–30% 之间' });
  return issues;
}

/** 兑换顺序：优先动用美元盈余（与港元挂钩，汇率波动小），其次港元，最后人民币。 */
const SOURCE_ORDER: Currency[] = ['USD', 'HKD', 'CNY'];

export function computePlan(input: PlanInput): PlanResult {
  const { fx } = input;
  const monthlyExpenseHKD = input.expenses.reduce((s, e) => s + e.monthlyHKD, 0);
  const monthlyNetHKD = input.monthlyIncomeHKD - monthlyExpenseHKD;

  const noIncomeMonths = Math.min(input.incomeStartMonth, input.horizonMonths);
  const noIncomeCostHKD = noIncomeMonths * monthlyExpenseHKD;
  const gapMonths = input.horizonMonths - noIncomeMonths;
  const ongoingGapHKD = Math.max(0, -monthlyNetHKD) * gapMonths;
  const reserveHKD = input.reserveMonths * monthlyExpenseHKD;

  const needs: Record<Currency, number> = { HKD: 0, CNY: 0, USD: 0 };
  let oneOffHKD = 0;
  for (const c of input.oneOffCosts) {
    needs[c.currency] += c.amount;
    oneOffHKD += toHKD(c.amount, c.currency, fx);
  }
  // 在港日常支出、过渡期支出与备用金均以港元计
  needs.HKD += noIncomeCostHKD + ongoingGapHKD + reserveHKD;

  // 按币种匹配：先用同币种持有，不足部分从其他币种盈余兑换
  const surplus: Record<Currency, number> = { HKD: 0, CNY: 0, USD: 0 };
  const shortfall: Record<Currency, number> = { HKD: 0, CNY: 0, USD: 0 };
  for (const c of ['HKD', 'CNY', 'USD'] as Currency[]) {
    const diff = input.holdings[c] - needs[c];
    if (diff >= 0) surplus[c] = diff;
    else shortfall[c] = -diff;
  }

  const conversions: Conversion[] = [];
  for (const to of ['HKD', 'USD', 'CNY'] as Currency[]) {
    let remainingHKD = toHKD(shortfall[to], to, fx);
    for (const from of SOURCE_ORDER) {
      if (from === to || remainingHKD <= 1e-9) continue;
      const availableHKD = toHKD(surplus[from], from, fx);
      const takeHKD = Math.min(availableHKD, remainingHKD);
      if (takeHKD <= 1e-9) continue;
      surplus[from] -= fromHKD(takeHKD, from, fx);
      remainingHKD -= takeHKD;
      conversions.push({ from, to, amountFrom: fromHKD(takeHKD, from, fx), amountHKD: takeHKD });
    }
  }

  const cnyOutHKD = conversions.filter((c) => c.from === 'CNY').reduce((s, c) => s + c.amountHKD, 0);
  const fxBufferHKD = cnyOutHKD * input.fxBufferPct;
  const holdingsHKD = CURRENCIES.reduce((s, c) => s + toHKD(input.holdings[c], c, fx), 0);
  const totalNeedHKD = oneOffHKD + noIncomeCostHKD + ongoingGapHKD + reserveHKD + fxBufferHKD;

  // 未分配 = 持有 − 总需求；与逐币种匹配后的剩余盈余一致（缓冲另扣）
  const unallocatedHKD = holdingsHKD - totalNeedHKD;

  return {
    monthlyExpenseHKD,
    monthlyNetHKD,
    oneOffHKD,
    noIncomeMonths,
    noIncomeCostHKD,
    gapMonths,
    ongoingGapHKD,
    reserveHKD,
    needs,
    holdingsHKD,
    conversions,
    cnyConvertedUSD: cnyOutHKD / fx.USDHKD,
    fxBufferHKD,
    totalNeedHKD,
    unallocatedHKD,
  };
}

/** 个人年度购汇便利化额度（等值美元）。以国家外汇管理局最新规定为准。 */
export const ANNUAL_FX_QUOTA_USD = 50_000;
