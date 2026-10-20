import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { API_ENABLED } from '../api/client';

const NAV = [
  { to: '/', label: '工作台', end: true },
  { to: '/plan', label: '落地资金' },
  { to: '/bonds', label: '美元债' },
  { to: '/news', label: '信息中心' },
  { to: '/experts', label: '真人一对一' },
];

export function Layout() {
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const [navOpen, setNavOpen] = useState(false);
  const firstRender = useRef(true);

  // 路由切换：回到顶部并把焦点移到主内容，方便键盘与读屏用户（首次载入保持默认焦点，便于使用跳转链接）
  useEffect(() => {
    setNavOpen(false);
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo(0, 0);
    mainRef.current?.focus({ preventScroll: true });
  }, [location.pathname]);

  return (
    <>
      <a className="skip-link" href="#main" onClick={(e) => { e.preventDefault(); mainRef.current?.focus(); }}>
        跳到主要内容
      </a>
      <header className="site-header">
        <div className="container bar">
          <NavLink to="/" className="brand" aria-label="知衡 首页">
            知衡<small>家庭财务 · 美元资产</small>
          </NavLink>
          <button
            type="button"
            className="nav-toggle"
            aria-expanded={navOpen}
            aria-controls="main-nav"
            onClick={() => setNavOpen((v) => !v)}
          >
            {navOpen ? '关闭' : '菜单'}
          </button>
          <nav id="main-nav" className={`main-nav${navOpen ? ' open' : ''}`} aria-label="主导航">
            <ul>
              {NAV.map((n) => (
                <li key={n.to}>
                  <NavLink to={n.to} end={n.end}>
                    {n.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="status-strip">
          <div className="container">
            <ul aria-label="服务状态">
              <li><span className="dot sample" aria-hidden="true" />数据：示例（虚构债券，非报价）</li>
              <li><span className={`dot ${API_ENABLED ? 'on' : 'off'}`} aria-hidden="true" />新闻接口：{API_ENABLED ? '已配置' : '未接入'}</li>
              <li><span className={`dot ${API_ENABLED ? 'on' : 'off'}`} aria-hidden="true" />AI 解读：{API_ENABLED ? '已配置' : '未接入（规则分流）'}</li>
              <li><span className="dot off" aria-hidden="true" />账户：未连接</li>
              <li><span className="dot off" aria-hidden="true" />专家预约：未开放</li>
            </ul>
          </div>
        </div>
      </header>
      <main id="main" ref={mainRef} tabIndex={-1}>
        <div className="container">
          <Outlet />
        </div>
      </main>
      <footer className="site-footer">
        <div className="container">
          <p>
            <strong>知衡（演示版）</strong>提供教育性质的信息整理与确定性计算，不构成投资、税务、法律或保险建议，也不提供任何证券或保险产品的买卖服务。
            所有债券均为虚构示例，价格不是报价，不能据此成交。
          </p>
          <p>
            隐私：你输入的财务数字只在本页面内存中计算，刷新即清除；不会写入本地存储，也不会发送给第三方。
          </p>
        </div>
      </footer>
    </>
  );
}
