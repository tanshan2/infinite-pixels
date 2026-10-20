import type { PlanInput } from '../lib/finance/planning';

// 示例家庭：两位成人、一名学龄子女，持有人民币为主。数字仅用于演示。
export const DEFAULT_PLAN: PlanInput = {
  holdings: { HKD: 80_000, CNY: 600_000, USD: 15_000 },
  monthlyIncomeHKD: 35_000,
  incomeStartMonth: 3,
  expenses: [
    { id: 'rent', label: '租金', monthlyHKD: 22_000 },
    { id: 'living', label: '日常生活（餐饮、日用）', monthlyHKD: 12_000 },
    { id: 'edu', label: '子女教育', monthlyHKD: 6_000 },
    { id: 'insurance', label: '保险与医疗', monthlyHKD: 2_500 },
    { id: 'transport', label: '交通与通讯', monthlyHKD: 2_000 },
  ],
  oneOffCosts: [
    { id: 'deposit', label: '租房押金及首月租金', amount: 66_000, currency: 'HKD' },
    { id: 'agent', label: '地产代理佣金', amount: 11_000, currency: 'HKD' },
    { id: 'moving', label: '内地搬家与运输', amount: 25_000, currency: 'CNY' },
    { id: 'furniture', label: '家具家电', amount: 40_000, currency: 'HKD' },
    { id: 'school', label: '学校报名及杂费', amount: 20_000, currency: 'HKD' },
    { id: 'visa', label: '签证与证件', amount: 3_000, currency: 'HKD' },
  ],
  reserveMonths: 6,
  horizonMonths: 12,
  fx: { CNYHKD: 1.09, USDHKD: 7.78 },
  fxBufferPct: 0.03,
};

export const DEFAULT_FX_NOTE = '汇率为示例假设值（2026-10），非实时报价；港元与美元在 7.75–7.85 联系汇率区间内浮动。';
