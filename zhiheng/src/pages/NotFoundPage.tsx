import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="page-head">
      <h1>页面不存在</h1>
      <p>链接可能有误，或该内容尚未提供。</p>
      <Link className="btn" to="/">返回工作台</Link>
    </div>
  );
}
