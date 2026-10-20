import { useEffect, useRef } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { API_ENABLED } from '../api/client';
import { BrandMark, Icon, type IconName } from './Icon';

const NAV: { to: string; label: string; short: string; icon: IconName; end?: boolean }[] = [
  { to: '/', label: '工作台', short: '工作台', icon: 'home', end: true },
  { to: '/plan', label: '落地资金规划', short: '资金', icon: 'wallet' },
  { to: '/bonds', label: '美元债研究', short: '美元债', icon: 'bond' },
  { to: '/news', label: '信息中心', short: '信息', icon: 'news' },
  { to: '/experts', label: '专家咨询', short: '专家', icon: 'users' },
];

const SECTION: Record<string, string> = {
  '': '工作台',
  plan: '落地资金规划',
  bonds: '美元债研究',
  analysis: '分析结果',
  news: '信息中心',
  experts: '专家咨询',
};

const STATUS = [
  { k: '债券与价格', v: '虚构示例', on: false, sample: true },
  { k: '新闻接口', v: API_ENABLED ? '已配置' : '未接入', on: API_ENABLED },
  { k: 'AI 解读', v: API_ENABLED ? '已配置' : '未接入', on: API_ENABLED },
  { k: '证券账户', v: '未连接', on: false },
  { k: '专家预约', v: '未开放', on: false },
];

export function Layout() {
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);
  const section = SECTION[location.pathname.split('/')[1] ?? ''] ?? '知衡';

  // 路由切换：回到顶部并把焦点移到主内容（首次载入保持默认焦点，便于使用跳转链接）
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo(0, 0);
    mainRef.current?.focus({ preventScroll: true });
  }, [location.pathname]);

  return (
    <div className="app">
      <a className="skip-link" href="#main" onClick={(e) => { e.preventDefault(); mainRef.current?.focus(); }}>
        跳到主要内容
      </a>

      <aside className="sidebar" aria-label="侧边栏">
        <Link to="/" className="side-brand" aria-label="知衡 工作台">
          <BrandMark />
          <span>
            <b>知衡</b>
            <small>家庭财务 · 美元资产</small>
          </span>
        </Link>
        <nav aria-label="主导航">
          <ul className="side-nav">
            {NAV.map((n) => (
              <li key={n.to}>
                <NavLink to={n.to} end={n.end}>
                  <Icon name={n.icon} />
                  {n.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="side-status">
          <p className="side-status-title"><Icon name="info" size={14} />演示环境</p>
          <ul aria-label="服务状态">
            {STATUS.map((s) => (
              <li key={s.k}>
                <span><i className={`dot ${s.on ? 'on' : s.sample ? 'sample' : 'off'}`} aria-hidden="true" />{s.k}</span>
                <span>{s.v}</span>
              </li>
            ))}
          </ul>
          <p className="side-privacy"><Icon name="lock" size={14} />财务数字只在本机计算，不保存、不上传</p>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <Link to="/" className="top-brand" aria-label="知衡 工作台">
            <BrandMark size={26} />
            <b>知衡</b>
          </Link>
          <p className="top-section">{section}</p>
          <div className="top-right">
            <span className="asof-chip"><i className="dot sample" aria-hidden="true" />示例数据 · 截至 2026-10-16 16:30 HKT</span>
            <details className="demo-pill">
              <summary>演示版</summary>
              <div className="demo-panel">
                <strong>服务状态</strong>
                <ul>
                  {STATUS.map((s) => <li key={s.k}><span>{s.k}</span><span>{s.v}</span></li>)}
                </ul>
              </div>
            </details>
            <Link to="/" className="btn small-btn"><Icon name="spark" size={16} />提问</Link>
          </div>
        </header>

        <main id="main" ref={mainRef} tabIndex={-1}>
          <Outlet />
          <footer className="site-footer">
            <p>
              <strong>知衡（演示版）</strong>提供教育性质的信息整理与确定性计算，不构成投资、税务、法律或保险建议，也不提供任何证券或保险产品的买卖服务。
              所有债券均为虚构示例，价格不是报价，不能据此成交。
            </p>
            <p>隐私：你输入的财务数字只在本页面内存中计算，刷新即清除；不写入本地存储，也不发送给第三方。</p>
          </footer>
        </main>
      </div>

      <nav className="tabbar" aria-label="主导航（底部）">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end}>
            <Icon name={n.icon} size={20} />
            <span>{n.short}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
