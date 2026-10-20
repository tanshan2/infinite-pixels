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

export interface ResultProps {
  topicLabel: string;
  question?: string;
  answer: ReactNode;
  answerKind: StatementKind;
  insufficient?: boolean;
  figures: ReactNode;
  figuresPro?: ReactNode;
  factors: Factor[];
  sources: SourceRef[];
  formulas: Formula[];
  assumptions: string[];
  missing: string[];
  limits: string[];
  actions: ReactNode;
}

/** 统一的结果呈现顺序：一句话回答 → 关键数字 → 影响因素 → 依据 → 缺失与局限 → 下一步 */
export function ResultLayout(p: ResultProps) {
  const [pro, setPro] = useState(false);
  return (
    <article aria-labelledby="result-title">
      <div className="btn-row" style={{ justifyContent: 'space-between' }}>
        <p className="eyebrow" style={{ margin: 0 }}>分析结果 · {p.topicLabel}</p>
        <div className="view-toggle" role="group" aria-label="解释深度">
          <button type="button" aria-pressed={!pro} onClick={() => setPro(false)}>通俗解释</button>
          <button type="button" aria-pressed={pro} onClick={() => setPro(true)}>专业细节</button>
        </div>
      </div>
      {p.question && (
        <p className="muted small" style={{ marginTop: 12 }}>
          你的问题：<q>{p.question}</q>
        </p>
      )}

      <section className="result-step" aria-labelledby="result-title">
        <span className="no" aria-hidden="true">1</span>
        <div>
          <h2 id="result-title" className="visually-hidden">一句话回答</h2>
          <p className={`answer${p.insufficient ? ' insufficient' : ''}`}>
            <Kind kind={p.answerKind} />
            {p.answer}
          </p>
        </div>
      </section>

      <Step no={2} title="关键数字与图表">
        {p.figures}
        {p.figuresPro && <ProDetail pro={pro} summary="展开：完整计算明细">{p.figuresPro}</ProDetail>}
      </Step>

      <Step no={3} title="影响结果的主要因素">
        <ul className="rule-list">
          {p.factors.map((f, i) => (
            <li key={i}>
              <Kind kind={f.kind} />
              {f.text}
              {f.pro && pro && <p className="small muted" style={{ margin: '6px 0 0' }}>{f.pro}</p>}
            </li>
          ))}
        </ul>
        <KindLegend />
      </Step>

      <Step no={4} title="数据来源、时间、公式和假设">
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
        <h3 style={{ marginTop: 18 }}>主要假设</h3>
        <ul>{p.assumptions.map((a) => <li key={a}>{a}</li>)}</ul>
        <ProDetail pro={pro} summary="公式（确定性程序计算，非语言模型生成）">
          {p.formulas.map((f) => (
            <div key={f.name}>
              <strong className="small">{f.name}</strong>
              <div className="formula">{f.expr}</div>
              {f.note && <p className="small muted">{f.note}</p>}
            </div>
          ))}
        </ProDetail>
      </Step>

      <Step no={5} title="当前缺少的信息与分析局限">
        {p.missing.length > 0 && (
          <>
            <h3>缺少的信息</h3>
            <ul>{p.missing.map((m) => <li key={m}>{m}</li>)}</ul>
          </>
        )}
        <h3>局限</h3>
        <ul>{p.limits.map((m) => <li key={m}>{m}</li>)}</ul>
      </Step>

      <Step no={6} title="下一步">
        <div className="btn-row no-print">{p.actions}</div>
      </Step>
    </article>
  );
}

function Step({ no, title, children }: { no: number; title: string; children: ReactNode }) {
  const id = `step-${no}`;
  return (
    <section className="result-step" aria-labelledby={id}>
      <span className="no" aria-hidden="true">{no}</span>
      <div>
        <h2 id={id}>{title}</h2>
        {children}
      </div>
    </section>
  );
}

function ProDetail({ pro, summary, children }: { pro: boolean; summary: string; children: ReactNode }) {
  // key 随模式变化，切换到“专业细节”时默认展开
  return (
    <details className="pro" key={String(pro)} open={pro}>
      <summary>{summary}</summary>
      <div>{children}</div>
    </details>
  );
}
