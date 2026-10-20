import type { ReactNode } from 'react';

/** 页面标题 + 数据口径行：每页都说明数据状态、时间与计算基准。 */
export function PageTitle({ section, title, desc, meta }: { section: string; title: string; desc?: ReactNode; meta: ReactNode[] }) {
  return (
    <header className="page-title">
      <p className="section">{section}</p>
      <h1>{title}</h1>
      {desc && <p className="desc">{desc}</p>}
      <ul className="meta-line" aria-label="数据口径">
        {meta.map((m, i) => <li key={i}>{m}</li>)}
      </ul>
    </header>
  );
}

export const SAMPLE_TAG = <span className="tag">示例数据</span>;
export const DATA_AS_OF = '数据截至 2026-10-16 16:30 HKT';
