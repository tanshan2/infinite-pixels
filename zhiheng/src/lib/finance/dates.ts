// 日期工具：全部按 UTC 日历日处理，避免本地时区导致的日期偏移。

export interface YMD {
  y: number;
  m: number; // 1-12
  d: number;
}

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseISO(iso: string): YMD {
  const match = ISO_RE.exec(iso);
  if (!match) throw new Error(`日期格式无效：${iso}（应为 YYYY-MM-DD）`);
  const ymd = { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
  if (ymd.m < 1 || ymd.m > 12 || ymd.d < 1 || ymd.d > daysInMonth(ymd.y, ymd.m)) {
    throw new Error(`日期不存在：${iso}`);
  }
  return ymd;
}

export function toISO({ y, m, d }: YMD): string {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function compareISO(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** 加减月份；日期按目标月份最后一天截断（例如 8 月 31 日减 6 个月 → 2 月 28/29 日）。 */
export function addMonths(iso: string, months: number, anchorDay?: number): string {
  const { y, m, d } = parseISO(iso);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const day = Math.min(anchorDay ?? d, daysInMonth(ny, nm));
  return toISO({ y: ny, m: nm, d: day });
}

/** 加工作日：只跳过周六周日，不含任何市场的公众假期。 */
export function addBusinessDays(iso: string, n: number): string {
  const { y, m, d } = parseISO(iso);
  const date = new Date(Date.UTC(y, m - 1, d));
  let added = 0;
  while (added < n) {
    date.setUTCDate(date.getUTCDate() + 1);
    const wd = date.getUTCDay();
    if (wd !== 0 && wd !== 6) added += 1;
  }
  return date.toISOString().slice(0, 10);
}

/**
 * 30/360 天数（Bond Basis / 30/360 ISDA）：
 * D1 = 31 → 30；若调整后 D1 = 30 且 D2 = 31 → D2 = 30。
 */
export function days30360(fromISO: string, toISOStr: string): number {
  const a = parseISO(fromISO);
  const b = parseISO(toISOStr);
  let d1 = a.d;
  let d2 = b.d;
  if (d1 === 31) d1 = 30;
  if (d2 === 31 && d1 === 30) d2 = 30;
  return 360 * (b.y - a.y) + 30 * (b.m - a.m) + (d2 - d1);
}

export function yearFraction30360(fromISO: string, toISOStr: string): number {
  return days30360(fromISO, toISOStr) / 360;
}
