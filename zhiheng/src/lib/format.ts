import type { Currency } from './finance/planning';

const SYMBOL: Record<Currency, string> = { HKD: 'HK$', CNY: '¥', USD: 'US$' };

export function money(n: number, currency: Currency = 'HKD', digits = 0): string {
  const abs = Math.abs(n).toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return `${n < 0 ? '−' : ''}${SYMBOL[currency]}${abs}`;
}

/** 简写：12.3 万 */
export function moneyShort(n: number, currency: Currency = 'HKD'): string {
  const abs = Math.abs(n);
  const body = abs >= 10_000 ? `${(abs / 10_000).toLocaleString('zh-CN', { maximumFractionDigits: 1 })} 万` : abs.toLocaleString('zh-CN');
  return `${n < 0 ? '−' : ''}${SYMBOL[currency]}${body}`;
}

export function pct(x: number, digits = 2): string {
  return `${(x * 100).toFixed(digits)}%`;
}

/** 带符号与文字的百分比变化，不只依赖颜色表达方向 */
export function signedPct(x: number, digits = 2, words: [string, string] = ['上升', '下跌']): string {
  if (Math.abs(x) < 0.5 * Math.pow(10, -digits - 2)) return `0.00%（不变）`;
  const sign = x > 0 ? '+' : '−';
  return `${sign}${Math.abs(x * 100).toFixed(digits)}%（${x > 0 ? words[0] : words[1]}）`;
}

export function bp(n: number): string {
  return `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n)} bp`;
}

export function num(n: number, digits = 2): string {
  return n.toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function trend(x: number): 'up' | 'down' | 'flat' {
  return x > 1e-12 ? 'up' : x < -1e-12 ? 'down' : 'flat';
}
