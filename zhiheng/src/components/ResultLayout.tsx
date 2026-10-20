import { useState, type ReactNode } from 'react';
import { Kind, KindLegend, StatusBadge, type StatementKind } from './Badges';
import type { DataStatus } from '../api/types';

export interface Factor {
  kind: StatementKind;
  text: ReactNode;
  pro?: ReactNode;
}

export interface SourceRef {
  label: string;
  status: DataStatus;
  statusLabel?: string;
  asOf?: string;
  note?: string;
}

export interface Formula {
  name: string;
  expr: string;
  note?: string;
}

export interface Highlight {
  label: string;
  value: string;
  note?: string;
  tone?: 'emph' | 'warn';
}

export interface ResultProps {
  topicLabel: string;
  question?: string;
  answer: ReactNode;
  answerKind: StatementKind;
  insufficient?: boolean;
  /** 最多 3 个关键数字，放在回答下方 */
  highlights: Highlight[];
  /** 一张主图 */
  chart?: ReactNode;
  /** 计算明细：默认收起 */
  details?: ReactNode;
  factors: Factor[];
  sources: SourceRef[];
  formulas: Formula[];
  assumptions: string[];
  missing: string[];
  limits: string[];
  actions: ReactNode;
}

/**
 * 统一的结果呈现顺序：一句话回答 → 关键数字与图表 → 影响因素 → 来源／公式／假设 → 缺失与局限 → 下一步。
 * 默认只展开前两项；其余收起，需要时再看。“显示专业细节”会展开全部并补充专业说明。
 */
export function ResultLayout(p: ResultProps) {
  const [pro, setPro] = useState(false);
  return (
    <article aria-labelledby="result-answer">
      <div className="btn-row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <span className="small muted">{p.topicLabel}</span>
        <label className="pro-switch">
          <input type="checkbox" checked={pro} onChange={(e) => setPro(e.target.checked)} />
          显示专业细节
        </label>
      </div>

      <section className="answer-card" aria-labelledby="result-answer">
        {p.question && <p className="q">你的问题：<q>{p.question}</q></p>}
        <h2 id="result-answer" className="visually-hidden">一句话回答</h2>
        <p className={`answer${p.insufficient ? ' insufficient' : ''}`}>{p.answer}</p>
        <Kind kind={p.answerKind} />
        {p.highlights.length > 0 && (
          <div className="highlights" role="list" aria-label="关键数字">
            {p.highlights.slice(0, 3).map((h) => (
              <div key={h.label} className={`hl${h.tone ? ` ${h.tone}` : ''}`} role="listitem">
                <div className="label">{h.label}</div>
                <div className="value">{h.value}</div>
                {h.note && <div className="note">{h.note}</div>}
              </div>
            ))}
          </div>
        )}
      </section>

      {p.chart && <section className="calm-block" aria-label="图表">{p.chart}</section>}

      <div className="acc-group" key={String(pro)}>
        {p.details && (
          <Acc title="查看计算明细" open={pro}>
            {p.details}
          </Acc>
        )}
        {p.factors.length > 0 && (
          <Acc title="哪些因素会改变结果" sub={`${p.factors.length} 项`} open={pro}>
            <ul className="plain-list">
              {p.factors.map((f, i) => (
                <li key={i}>
                  <Kind kind={f.kind} />
                  {f.text}
                  {f.pro && pro && <p className="small muted" style={{ margin: '6px 0 0' }}>{f.pro}</p>}
                </li>
              ))}
            </ul>
            <KindLegend />
          </Acc>
        )}
        <Acc title="依据：数据来源、公式与假设" open={pro}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>数据</th><th>状态</th><th>时间</th><th>说明</th></tr>
              </thead>
              <tbody>
                {p.sources.map((s) => (
                  <tr key={s.label}>
                    <td>{s.label}</td>
                    <td><StatusBadge status={s.status} label={s.statusLabel} /></td>
                    <td className="num">{s.asOf ?? '—'}</td>
                    <td className="small">{s.note ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3 style={{ marginTop: 18, fontSize: '1rem' }}>主要假设</h3>
          <ul>{p.assumptions.map((a) => <li key={a}>{a}</li>)}</ul>
          {p.formulas.length > 0 && (
            <>
              <h3 style={{ marginTop: 18, fontSize: '1rem' }}>公式</h3>
              <p className="small muted">由确定性程序计算，不由语言模型生成。</p>
              {p.formulas.map((f) => (
                <div key={f.name}>
                  <strong className="small">{f.name}</strong>
                  <div className="formula">{f.expr}</div>
                  {f.note && <p className="small muted">{f.note}</p>}
                </div>
              ))}
            </>
          )}
        </Acc>
        <Acc title="还缺什么信息、有哪些局限" open={pro}>
          {p.missing.length > 0 && (
            <>
              <h3 style={{ fontSize: '1rem' }}>缺少的信息</h3>
              <ul>{p.missing.map((m) => <li key={m}>{m}</li>)}</ul>
            </>
          )}
          <h3 style={{ fontSize: '1rem' }}>局限</h3>
          <ul>{p.limits.map((m) => <li key={m}>{m}</li>)}</ul>
        </Acc>
      </div>

      <nav className="next-steps no-print" aria-label="下一步">{p.actions}</nav>
    </article>
  );
}

function Acc({ title, sub, open, children }: { title: string; sub?: string; open: boolean; children: ReactNode }) {
  return (
    <details className="acc" open={open}>
      <summary>
        {title}
        {sub && <span className="acc-sub">{sub}</span>}
      </summary>
      <div className="acc-body">{children}</div>
    </details>
  );
}
