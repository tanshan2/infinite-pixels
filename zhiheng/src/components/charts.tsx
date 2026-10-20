import { useEffect, useRef, useState, type ReactNode } from 'react';
import { moneyShort, money, num, signedPct } from '../lib/format';

// 分类配色（已用色觉差异校验脚本检查：明度带、色度、CVD 相邻色差均通过；金色对比度偏低，故全部图表直接标注数值并附数据表）
export const SERIES = {
  green: '#00806a',
  gold: '#c48a1a',
  blue: '#4a74b8',
  clay: '#b5603a',
  neutral: '#8f8a80',
  ink: '#173b33',
};

function useWidth<T extends HTMLElement>(fallback = 640) {
  const ref = useRef<T>(null);
  const [w, setW] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setW(Math.max(280, Math.floor(entries[0].contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

interface Tip {
  x: number;
  y: number;
  text: string;
}

function ChartFrame({ title, meta, legend, children, table }: { title: string; meta: string; legend?: ReactNode; children: ReactNode; table: ReactNode }) {
  return (
    <figure className="chart" style={{ margin: 0 }}>
      <div className="chart-head">
        <figcaption className="chart-title">{title}</figcaption>
        <span className="chart-meta">{meta}</span>
      </div>
      {legend}
      {children}
      <details className="pro">
        <summary>查看数据表</summary>
        <div>{table}</div>
      </details>
    </figure>
  );
}

function niceStep(max: number, ticks = 4) {
  const raw = max / ticks;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * pow;
}

/* ---------------- 资金需求 vs 现有资金 ---------------- */

export interface Segment {
  label: string;
  value: number;
  color: string;
  hatched?: boolean;
}

export function NeedsBar({ segments, available }: { segments: Segment[]; available: number }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [tip, setTip] = useState<Tip | null>(null);
  const total = segments.reduce((s, x) => s + x.value, 0);
  const max = Math.max(total, available) || 1;
  const step = niceStep(max);
  const axisMax = Math.ceil(max / step) * step;
  const labelW = width < 480 ? 64 : 84;
  const plotW = width - labelW - 12;
  const x = (v: number) => labelW + (v / axisMax) * plotW;
  const barH = 26;
  const rows = [{ y: 18, label: '资金需求' }, { y: 18 + barH + 22, label: '现有资金' }];
  const height = rows[1].y + barH + 30;
  const diff = available - total;

  let acc = 0;
  return (
    <ChartFrame
      title="资金需求与现有资金对比"
      meta="单位：港元（HKD）· 规划期合计 · 外币按假设汇率折算"
      legend={
        <ul className="legend">
          {segments.map((s) => (
            <li key={s.label}>
              <span className="swatch" style={{ background: s.hatched ? `repeating-linear-gradient(45deg, ${s.color} 0 2px, #fff 2px 4px)` : s.color }} />
              {s.label}
            </li>
          ))}
          <li><span className="swatch" style={{ background: SERIES.ink }} />现有资金（各币种折港元）</li>
        </ul>
      }
      table={
        <table>
          <thead><tr><th>项目</th><th className="n">金额（HKD）</th></tr></thead>
          <tbody>
            {segments.map((s) => <tr key={s.label}><td>{s.label}</td><td className="n">{money(s.value)}</td></tr>)}
            <tr className="total"><td>资金需求合计</td><td className="n">{money(total)}</td></tr>
            <tr><td>现有资金</td><td className="n">{money(available)}</td></tr>
            <tr><td>{diff >= 0 ? '未分配（尚未指定用途）' : '资金缺口'}</td><td className="n">{money(diff)}</td></tr>
          </tbody>
        </table>
      }
    >
      <div className="chart-box" ref={ref}>
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`资金需求合计 ${money(total)}，现有资金 ${money(available)}，${diff >= 0 ? '未分配' : '缺口'} ${money(Math.abs(diff))}`}>
          <defs>
            <pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="5" height="5" fill="#fff" />
              <rect width="2" height="5" fill={SERIES.neutral} />
            </pattern>
          </defs>
          {Array.from({ length: Math.round(axisMax / step) + 1 }, (_, i) => i * step).map((t) => (
            <g key={t}>
              <line x1={x(t)} x2={x(t)} y1={10} y2={height - 22} stroke="#e6e1d7" />
              <text x={x(t)} y={height - 6} fontSize="11" textAnchor="middle" fill="#6a736d" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {t === 0 ? '0' : `${num(t / 10_000, 0)}万`}
              </text>
            </g>
          ))}
          {rows.map((r) => (
            <text key={r.label} x={0} y={r.y + barH / 2 + 4} fontSize="12.5" fill="#1c2420">{r.label}</text>
          ))}
          {segments.map((s) => {
            const x0 = x(acc);
            acc += s.value;
            const w = Math.max(0, x(acc) - x0 - (s.value > 0 ? 2 : 0));
            if (s.value <= 0) return null;
            const show = () => setTip({ x: x0 + w / 2, y: rows[0].y, text: `${s.label}：${money(s.value)}` });
            return (
              <rect
                key={s.label}
                x={x0}
                y={rows[0].y}
                width={w}
                height={barH}
                rx={2}
                fill={s.hatched ? 'url(#hatch)' : s.color}
                tabIndex={0}
                aria-label={`${s.label} ${money(s.value)}`}
                onMouseEnter={show}
                onFocus={show}
                onMouseLeave={() => setTip(null)}
                onBlur={() => setTip(null)}
              />
            );
          })}
          <rect x={labelW} y={rows[1].y} width={Math.max(0, x(available) - labelW)} height={barH} rx={2} fill={SERIES.ink} />
          <text x={x(total) + 4 > width - 90 ? x(total) - 4 : x(total) + 4} y={rows[0].y + barH / 2 + 4} fontSize="12" fill="#1c2420" textAnchor={x(total) + 4 > width - 90 ? 'end' : 'start'} style={{ fontVariantNumeric: 'tabular-nums' }}>
            {x(total) + 4 > width - 90 ? '' : moneyShort(total)}
          </text>
          <text x={x(available) + 4 > width - 90 ? x(available) - 6 : x(available) + 4} y={rows[1].y + barH / 2 + 4} fontSize="12" fill={x(available) + 4 > width - 90 ? '#fff' : '#1c2420'} textAnchor={x(available) + 4 > width - 90 ? 'end' : 'start'} style={{ fontVariantNumeric: 'tabular-nums' }}>
            {moneyShort(available)}
          </text>
          {/* 差额标记 */}
          <line x1={x(total)} x2={x(total)} y1={rows[0].y - 4} y2={rows[1].y + barH + 4} stroke="#1c2420" strokeDasharray="3 3" />
        </svg>
        {tip && <div className="chart-tip" style={{ left: tip.x, top: tip.y }}>{tip.text}</div>}
      </div>
    </ChartFrame>
  );
}

/* ---------------- 现金流 ---------------- */

export interface FlowBar {
  date: string;
  coupon: number;
  principal: number;
}

export function CashflowChart({ flows, perFace = 100, unit = '每 100 美元面值' }: { flows: FlowBar[]; perFace?: number; unit?: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [tip, setTip] = useState<Tip | null>(null);
  const scale = perFace / 100;
  const height = 210;
  const top = 34;
  const bottom = height - 28;
  const left = 44;
  const plotW = width - left - 8;
  const maxCoupon = Math.max(...flows.map((f) => f.coupon), 0.01) * scale;
  const step = niceStep(maxCoupon * 1.3, 3);
  const axisMax = Math.ceil((maxCoupon * 1.3) / step) * step;
  const y = (v: number) => bottom - (v / axisMax) * (bottom - top);
  const slot = plotW / flows.length;
  const bw = Math.max(3, Math.min(22, slot - 4));
  const labelEvery = Math.ceil(flows.length / Math.max(2, Math.floor(plotW / 70)));

  return (
    <ChartFrame
      title="未来现金流（假设持有至到期、全部按时支付）"
      meta={`单位：美元（USD）· ${unit} · 按付息日`}
      legend={
        <ul className="legend">
          <li><span className="swatch" style={{ background: SERIES.green }} />票息</li>
          <li><span className="swatch" style={{ background: SERIES.ink }} />本金（到期一次偿还，柱高截断）</li>
        </ul>
      }
      table={
        <table>
          <thead><tr><th>付息日</th><th className="n">票息</th><th className="n">本金</th><th className="n">合计</th></tr></thead>
          <tbody>
            {flows.map((f) => (
              <tr key={f.date}>
                <td className="num">{f.date}</td>
                <td className="n">{num(f.coupon * scale)}</td>
                <td className="n">{num(f.principal * scale)}</td>
                <td className="n">{num((f.coupon + f.principal) * scale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <div className="chart-box" ref={ref}>
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`共 ${flows.length} 次付款，最后一期包含本金`}>
          {Array.from({ length: Math.round(axisMax / step) + 1 }, (_, i) => i * step).map((t) => (
            <g key={t}>
              <line x1={left} x2={width - 8} y1={y(t)} y2={y(t)} stroke="#e6e1d7" />
              <text x={left - 6} y={y(t) + 4} fontSize="11" textAnchor="end" fill="#6a736d">{num(t, step < 1 ? 1 : 0)}</text>
            </g>
          ))}
          {flows.map((f, i) => {
            const cx = left + slot * i + slot / 2;
            const c = f.coupon * scale;
            const show = () => setTip({ x: cx, y: top, text: `${f.date}：票息 ${num(c)}${f.principal ? ` + 本金 ${num(f.principal * scale)}` : ''}` });
            const handlers = { onMouseEnter: show, onFocus: show, onMouseLeave: () => setTip(null), onBlur: () => setTip(null), tabIndex: 0 };
            return (
              <g key={f.date}>
                {f.principal > 0 && (
                  <>
                    <rect x={cx - bw / 2} y={top - 12} width={bw} height={y(c) - (top - 12) - 2} rx={2} fill={SERIES.ink} aria-label={`${f.date} 本金 ${num(f.principal * scale)}`} {...handlers} />
                    <path d={`M${cx - bw / 2 - 2} ${top + 6} l${bw / 2 + 2} -5 l${bw / 2 + 2} 5`} stroke="#fff" strokeWidth="2.5" fill="none" />
                    <text x={cx} y={top - 16} fontSize="11" textAnchor={i > flows.length - 3 ? 'end' : 'middle'} fill="#1c2420">本金 {num(f.principal * scale, 0)}</text>
                  </>
                )}
                <rect x={cx - bw / 2} y={y(c)} width={bw} height={Math.max(1, bottom - y(c))} rx={2} fill={SERIES.green} aria-label={`${f.date} 票息 ${num(c)}`} {...handlers} />
                {i % labelEvery === 0 && (
                  <text x={cx} y={height - 8} fontSize="10.5" textAnchor="middle" fill="#6a736d">{f.date.slice(0, 7)}</text>
                )}
              </g>
            );
          })}
          <line x1={left} x2={width - 8} y1={bottom} y2={bottom} stroke="#a9a193" />
        </svg>
        {tip && <div className="chart-tip" style={{ left: tip.x, top: tip.y }}>{tip.text}</div>}
      </div>
    </ChartFrame>
  );
}

/* ---------------- 压力测算曲线 ---------------- */

export interface StressCurvePoint {
  bp: number;
  pct: number;
  approx: number;
}

export function StressChart({ points, highlightBp }: { points: StressCurvePoint[]; highlightBp?: number }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<StressCurvePoint | null>(null);
  const height = 240;
  const left = 52;
  const right = width - 12;
  const top = 14;
  const bottom = height - 34;
  const minBp = points[0].bp;
  const maxBp = points[points.length - 1].bp;
  const vals = points.flatMap((p) => [p.pct, p.approx]);
  const yMax = Math.max(...vals, 0.01);
  const yMin = Math.min(...vals, -0.01);
  const step = niceStep((yMax - yMin) * 100, 4) / 100;
  const lo = Math.floor(yMin / step) * step;
  const hi = Math.ceil(yMax / step) * step;
  const x = (bp: number) => left + ((bp - minBp) / (maxBp - minBp)) * (right - left);
  const y = (v: number) => bottom - ((v - lo) / (hi - lo)) * (bottom - top);
  const path = (key: 'pct' | 'approx') => points.map((p, i) => `${i ? 'L' : 'M'}${x(p.bp).toFixed(1)} ${y(p[key]).toFixed(1)}`).join(' ');
  const ticksY: number[] = [];
  for (let v = lo; v <= hi + 1e-9; v += step) ticksY.push(+v.toFixed(6));
  const ticksX = points.filter((p) => p.bp % 100 === 0).map((p) => p.bp);
  const hl = points.find((p) => p.bp === highlightBp);

  const onMove = (clientX: number) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((clientX - rect.left) / rect.width) * width;
    let best = points[0];
    for (const p of points) if (Math.abs(x(p.bp) - px) < Math.abs(x(best.bp) - px)) best = p;
    setHover(best);
  };

  return (
    <ChartFrame
      title="收益率变动对价格的影响"
      meta="横轴：收益率变动（基点，100 bp = 1 个百分点）· 纵轴：全价变化（%）· 即时冲击"
      legend={
        <ul className="legend">
          <li><span className="swatch" style={{ background: SERIES.green }} />全价重估</li>
          <li><span className="swatch" style={{ background: `repeating-linear-gradient(90deg, ${SERIES.clay} 0 4px, transparent 4px 7px)` }} />仅用久期＋凸性近似</li>
        </ul>
      }
      table={
        <table>
          <thead><tr><th className="n">收益率变动</th><th className="n">全价重估</th><th className="n">久期凸性近似</th></tr></thead>
          <tbody>
            {points.filter((p) => p.bp % 50 === 0).map((p) => (
              <tr key={p.bp}><td className="n">{p.bp > 0 ? '+' : ''}{p.bp} bp</td><td className="n">{signedPct(p.pct)}</td><td className="n">{signedPct(p.approx)}</td></tr>
            ))}
          </tbody>
        </table>
      }
    >
      <div
        className="chart-box"
        ref={ref}
        onMouseMove={(e) => onMove(e.clientX)}
        onMouseLeave={() => setHover(null)}
      >
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="收益率上升时价格下跌、收益率下降时价格上涨的曲线，详见数据表">
          {ticksY.map((t) => (
            <g key={t}>
              <line x1={left} x2={right} y1={y(t)} y2={y(t)} stroke={Math.abs(t) < 1e-9 ? '#a9a193' : '#e6e1d7'} />
              <text x={left - 6} y={y(t) + 4} fontSize="11" textAnchor="end" fill="#6a736d">{t > 0 ? '+' : t < 0 ? '−' : ''}{Math.abs(t * 100).toFixed(0)}%</text>
            </g>
          ))}
          {ticksX.map((t) => (
            <g key={t}>
              <line x1={x(t)} x2={x(t)} y1={bottom} y2={bottom + 4} stroke="#a9a193" />
              <text x={x(t)} y={bottom + 18} fontSize="11" textAnchor="middle" fill="#6a736d">{t > 0 ? '+' : t < 0 ? '−' : ''}{Math.abs(t)}</text>
            </g>
          ))}
          <line x1={x(0)} x2={x(0)} y1={top} y2={bottom} stroke="#a9a193" />
          <path d={path('approx')} fill="none" stroke={SERIES.clay} strokeWidth={2} strokeDasharray="5 4" />
          <path d={path('pct')} fill="none" stroke={SERIES.green} strokeWidth={2} />
          {hl && (
            <g>
              <circle cx={x(hl.bp)} cy={y(hl.pct)} r={5} fill={SERIES.green} stroke="#fff" strokeWidth={2} />
              <text x={x(hl.bp) + (hl.bp > (minBp + maxBp) / 2 ? -8 : 8)} y={y(hl.pct) - 10} fontSize="12" fill="#1c2420" textAnchor={hl.bp > (minBp + maxBp) / 2 ? 'end' : 'start'}>
                当前情景 {signedPct(hl.pct, 1)}
              </text>
            </g>
          )}
          {hover && (
            <g pointerEvents="none">
              <line x1={x(hover.bp)} x2={x(hover.bp)} y1={top} y2={bottom} stroke="#1c2420" strokeDasharray="2 3" />
              <circle cx={x(hover.bp)} cy={y(hover.pct)} r={4} fill={SERIES.green} stroke="#fff" strokeWidth={2} />
            </g>
          )}
        </svg>
        {hover && (
          <div className="chart-tip" style={{ left: `${(x(hover.bp) / width) * 100}%`, top: y(hover.pct) }}>
            {hover.bp > 0 ? '+' : ''}{hover.bp} bp：{signedPct(hover.pct)}
          </div>
        )}
      </div>
    </ChartFrame>
  );
}
