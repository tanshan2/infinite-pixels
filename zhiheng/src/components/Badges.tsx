import type { DataStatus } from '../api/types';
import { STATUS_LABEL } from '../api/types';

export function StatusBadge({ status, label }: { status: DataStatus; label?: string }) {
  const mark = status === 'live' ? '●' : status === 'sample' ? '◆' : status === 'delayed' ? '◐' : '○';
  return (
    <span className={`badge ${status}`}>
      <span aria-hidden="true">{mark}</span>
      {label ?? STATUS_LABEL[status]}
    </span>
  );
}

export type StatementKind = 'fact' | 'calc' | 'estimate' | 'opinion';

export const KIND_LABEL: Record<StatementKind, string> = {
  fact: '事实',
  calc: '条件测算',
  estimate: '估计',
  opinion: '观点',
};

export function Kind({ kind }: { kind: StatementKind }) {
  return <span className={`kind ${kind}`}>{KIND_LABEL[kind]}</span>;
}

export function KindLegend() {
  return (
    <p className="small muted" style={{ margin: '8px 0 0' }}>
      <Kind kind="fact" />来自数据或条款的陈述　
      <Kind kind="calc" />在所列假设下计算得出　
      <Kind kind="estimate" />依赖不确定输入　
      <Kind kind="opinion" />平台的解读，可能有不同看法
    </p>
  );
}
